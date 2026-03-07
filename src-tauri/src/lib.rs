#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

use axum::{extract::State, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::image::Image;
use tauri::menu::{AboutMetadata, CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, Submenu, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::{oneshot, Mutex};

// Managed state to hold the "Open Recent" submenu handle for dynamic rebuilds
struct RecentMenuState(std::sync::Mutex<Option<Submenu<tauri::Wry>>>);

// ── MCP Bridge Types ──

#[derive(Clone)]
struct BridgeState {
    app: AppHandle,
    pending: Arc<Mutex<HashMap<String, oneshot::Sender<String>>>>,
    next_id: Arc<Mutex<u64>>,
    auth_token: String,
}

#[derive(Deserialize)]
struct ToolCallRequest {
    name: String,
    params: serde_json::Value,
}

#[derive(Serialize)]
struct ToolCallResponse {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Deserialize)]
struct ResourceQuery {
    uri: String,
}

// Event payload sent to frontend
#[derive(Clone, Serialize)]
struct ToolCallEvent {
    id: String,
    name: String,
    params: serde_json::Value,
}

#[derive(Clone, Serialize)]
struct ResourceReadEvent {
    id: String,
    uri: String,
}

// ── Auth helper ──

fn check_auth(headers: &axum::http::HeaderMap, token: &str) -> Result<(), Json<ToolCallResponse>> {
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());
    match auth {
        Some(v) if v == format!("Bearer {}", token) => Ok(()),
        _ => Err(Json(ToolCallResponse {
            success: false,
            data: None,
            error: Some("Unauthorized".into()),
        })),
    }
}

// ── HTTP Handlers ──

async fn handle_tool_call(
    State(state): State<BridgeState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<ToolCallRequest>,
) -> Json<ToolCallResponse> {
    if let Err(resp) = check_auth(&headers, &state.auth_token) {
        return resp;
    }
    let id = {
        let mut counter = state.next_id.lock().await;
        *counter += 1;
        format!("mcp-{}", *counter)
    };

    let (tx, rx) = oneshot::channel();
    state.pending.lock().await.insert(id.clone(), tx);

    let event = ToolCallEvent {
        id: id.clone(),
        name: req.name,
        params: req.params,
    };

    if let Err(e) = state.app.emit("mcp-tool-call", &event) {
        state.pending.lock().await.remove(&id);
        return Json(ToolCallResponse {
            success: false,
            data: None,
            error: Some(format!("Failed to emit event: {}", e)),
        });
    }

    // Wait for frontend to respond (30s timeout — screenshots may take longer)
    match tokio::time::timeout(std::time::Duration::from_secs(30), rx).await {
        Ok(Ok(result)) => {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&result) {
                let success = val.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
                let data = val.get("data").cloned();
                let error = val.get("error").and_then(|v| v.as_str()).map(|s| s.to_string());
                Json(ToolCallResponse { success, data, error })
            } else {
                Json(ToolCallResponse {
                    success: false,
                    data: None,
                    error: Some("Invalid response from frontend".into()),
                })
            }
        }
        Ok(Err(_)) => Json(ToolCallResponse {
            success: false,
            data: None,
            error: Some("Frontend dropped the response channel".into()),
        }),
        Err(_) => {
            state.pending.lock().await.remove(&id);
            Json(ToolCallResponse {
                success: false,
                data: None,
                error: Some("Timeout waiting for frontend".into()),
            })
        }
    }
}

async fn handle_resource(
    State(state): State<BridgeState>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<ResourceQuery>,
) -> Json<serde_json::Value> {
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());
    match auth {
        Some(v) if v == format!("Bearer {}", state.auth_token) => {}
        _ => return Json(serde_json::json!({"error": "Unauthorized"})),
    }
    let id = {
        let mut counter = state.next_id.lock().await;
        *counter += 1;
        format!("mcp-{}", *counter)
    };

    let (tx, rx) = oneshot::channel();
    state.pending.lock().await.insert(id.clone(), tx);

    let event = ResourceReadEvent {
        id: id.clone(),
        uri: query.uri,
    };

    if let Err(e) = state.app.emit("mcp-resource-read", &event) {
        state.pending.lock().await.remove(&id);
        eprintln!("MCP bridge: failed to emit resource event: {}", e);
        return Json(serde_json::json!({"error": format!("Failed to emit event: {}", e)}));
    }

    match tokio::time::timeout(std::time::Duration::from_secs(10), rx).await {
        Ok(Ok(result)) => {
            serde_json::from_str(&result).unwrap_or(serde_json::json!({"error": "Invalid JSON"}))
        }
        _ => {
            state.pending.lock().await.remove(&id);
            serde_json::json!({"error": "Timeout"})
        }
    }
    .into()
}

async fn handle_health() -> &'static str {
    "ok"
}

// ── Tauri Command (frontend sends results back) ──

#[tauri::command]
async fn mcp_respond(
    id: String,
    result: String,
    state: tauri::State<'_, BridgeState>,
) -> Result<(), String> {
    if let Some(tx) = state.pending.lock().await.remove(&id) {
        let _ = tx.send(result);
    }
    Ok(())
}

// ── Menu sync command ──

#[tauri::command]
fn set_menu_check(app: AppHandle, id: String, checked: bool) -> Result<(), String> {
    use tauri::menu::MenuItemKind;
    fn find_and_set(items: Vec<MenuItemKind<tauri::Wry>>, id: &str, checked: bool) -> bool {
        for item in items {
            match item {
                MenuItemKind::Check(check) => {
                    if check.id().0 == id {
                        let _ = check.set_checked(checked);
                        return true;
                    }
                }
                MenuItemKind::Submenu(sub) => {
                    if find_and_set(sub.items().unwrap_or_default(), id, checked) {
                        return true;
                    }
                }
                _ => {}
            }
        }
        false
    }
    if let Some(menu) = app.menu() {
        find_and_set(menu.items().unwrap_or_default(), &id, checked);
    }
    Ok(())
}

// ── macOS Traffic Light Positioning ──
// Tauri's trafficLightPosition in tauri.conf.json handles startup + resize natively.
// But setTitle() resets position (tauri-apps/tauri#13044), so we re-apply via objc.
// Values must match trafficLightPosition { x: 13, y: 16 } in tauri.conf.json.

#[cfg(target_os = "macos")]
fn reposition_traffic_lights(ns_window: cocoa::base::id) {
    // Nudge window size by 1pt and back to trigger TAO's native repositioning
    // of traffic light buttons to the trafficLightPosition from tauri.conf.json.
    unsafe {
        let frame: cocoa::foundation::NSRect = msg_send![ns_window, frame];
        let mut nudged = frame;
        nudged.size.height += 1.0;
        let _: () = msg_send![ns_window, setFrame: nudged display: false];
        let _: () = msg_send![ns_window, setFrame: frame display: false];
    }
}

// ── MCP Install Command ──

fn resolve_server_path() -> Result<String, String> {
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let dev_path = cwd.join("../src/mcp/server.mjs");
    if let Ok(canonical) = dev_path.canonicalize() {
        return Ok(canonical.to_string_lossy().to_string());
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let path = dir.join("../Resources/src/mcp/server.mjs");
            if let Ok(canonical) = path.canonicalize() {
                return Ok(canonical.to_string_lossy().to_string());
            }
        }
    }
    Err("Could not locate server.mjs".into())
}

/// Merge caja entry into a JSON config file.
/// `servers_key` is the top-level key ("mcpServers" or "servers").
fn install_json_config(config_path: &std::path::Path, servers_key: &str, server_path: &str) -> Result<String, String> {
    // Ensure parent directory exists
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let mut config: serde_json::Value = if config_path.exists() {
        let raw = std::fs::read_to_string(config_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).unwrap_or_else(|e| {
            eprintln!("Warning: failed to parse config {}: {}", config_path.display(), e);
            serde_json::json!({})
        })
    } else {
        serde_json::json!({})
    };

    if config.get(servers_key).and_then(|s| s.get("caja")).is_some() {
        return Ok("already".into());
    }

    let servers = config.as_object_mut().unwrap()
        .entry(servers_key)
        .or_insert(serde_json::json!({}));
    servers.as_object_mut().unwrap().insert(
        "caja".into(),
        serde_json::json!({
            "command": "node",
            "args": [server_path]
        }),
    );

    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(config_path, json).map_err(|e| e.to_string())?;
    Ok("installed".into())
}

/// Append caja entry to Codex TOML config.
fn install_codex_toml(config_path: &std::path::Path, server_path: &str) -> Result<String, String> {
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let content = if config_path.exists() {
        std::fs::read_to_string(config_path).map_err(|e| e.to_string())?
    } else {
        String::new()
    };

    if content.contains("[mcp_servers.caja]") {
        return Ok("already".into());
    }

    let block = format!(
        "\n[mcp_servers.caja]\ncommand = \"node\"\nargs = [\"{}\"]\n",
        server_path.replace('\\', "\\\\").replace('"', "\\\"")
    );

    let mut new_content = content;
    if !new_content.is_empty() && !new_content.ends_with('\n') {
        new_content.push('\n');
    }
    new_content.push_str(&block);

    std::fs::write(config_path, new_content).map_err(|e| e.to_string())?;
    Ok("installed".into())
}

#[tauri::command]
fn resolve_mcp_server_path() -> Result<String, String> {
    resolve_server_path()
}

#[tauri::command]
fn install_mcp(client: String) -> Result<String, String> {
    let server_path = resolve_server_path()?;
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    let home = std::path::PathBuf::from(&home);

    match client.as_str() {
        "claude-code" => {
            install_json_config(&home.join(".claude.json"), "mcpServers", &server_path)
        }
        "claude-desktop" => {
            install_json_config(
                &home.join("Library/Application Support/Claude/claude_desktop_config.json"),
                "mcpServers",
                &server_path,
            )
        }
        "cursor" => {
            install_json_config(&home.join(".cursor/mcp.json"), "mcpServers", &server_path)
        }
        "vscode" => {
            install_json_config(
                &home.join("Library/Application Support/Code/User/mcp.json"),
                "servers",
                &server_path,
            )
        }
        "codex" => {
            install_codex_toml(&home.join(".codex/config.toml"), &server_path)
        }
        _ => Err(format!("Unknown client: {}", client)),
    }
}

// Tauri command: set window title + reposition traffic lights (setTitle resets them)
#[tauri::command]
fn set_window_title(app: AppHandle, title: String) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_title(&title);
        #[cfg(target_os = "macos")]
        {
            let ns_window = window.ns_window().unwrap() as cocoa::base::id;
            reposition_traffic_lights(ns_window);
        }
    }
}

// Tauri command: fix traffic light position (call after HMR or any event that resets them)
#[tauri::command]
fn fix_traffic_lights(app: AppHandle) {
    #[cfg(target_os = "macos")]
    if let Some(window) = app.get_webview_window("main") {
        let ns_window = window.ns_window().unwrap() as cocoa::base::id;
        reposition_traffic_lights(ns_window);
    }
}

// ── First Launch Flag ──

fn has_launched_path() -> std::path::PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
    std::path::Path::new(&home).join(".caja").join("has-launched")
}

#[tauri::command]
fn check_has_launched() -> bool {
    has_launched_path().exists()
}

#[tauri::command]
fn mark_has_launched() {
    let path = has_launched_path();
    let _ = std::fs::create_dir_all(path.parent().unwrap());
    let _ = std::fs::write(&path, "1");
}

// ── Recent Files ──

fn recent_files_path() -> std::path::PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
    std::path::Path::new(&home).join(".caja").join("recent-files.json")
}

fn load_recent_files() -> Vec<String> {
    let path = recent_files_path();
    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return vec![],
    };
    let files: Vec<String> = serde_json::from_str(&content).unwrap_or_default();
    files.into_iter().filter(|f| std::path::Path::new(f).exists()).collect()
}

fn save_recent_files(files: &[String]) {
    let path = recent_files_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(&files) {
        let _ = std::fs::write(&path, json);
    }
}

fn add_to_recent(file_path: &str) {
    let mut files = load_recent_files();
    files.retain(|f| f != file_path);
    files.insert(0, file_path.to_string());
    files.truncate(10);
    save_recent_files(&files);
}

#[tauri::command]
fn get_recent_files() -> Vec<String> {
    load_recent_files()
}

#[tauri::command]
fn add_recent_file(app: AppHandle, path: String) {
    add_to_recent(&path);
    rebuild_recent_menu_inner(&app);
}

#[tauri::command]
fn clear_recent_files(app: AppHandle) {
    save_recent_files(&[]);
    rebuild_recent_menu_inner(&app);
}

fn rebuild_recent_menu_inner(app: &AppHandle) {
    let state = match app.try_state::<RecentMenuState>() {
        Some(s) => s,
        None => return,
    };
    let guard = match state.0.lock() {
        Ok(g) => g,
        Err(_) => return,
    };
    let submenu = match guard.as_ref() {
        Some(s) => s,
        None => return,
    };

    // Remove all existing items
    if let Ok(items) = submenu.items() {
        for _ in 0..items.len() {
            let _ = submenu.remove_at(0);
        }
    }

    // Rebuild from disk
    let files = load_recent_files();
    if files.is_empty() {
        if let Ok(item) = MenuItemBuilder::with_id("no-recent", "No Recent Files")
            .enabled(false)
            .build(app)
        {
            let _ = submenu.append(&item);
        }
    } else {
        for (i, path) in files.iter().enumerate() {
            let label = std::path::Path::new(path)
                .file_name()
                .map(|f| f.to_string_lossy().to_string())
                .unwrap_or_else(|| path.clone());
            if let Ok(item) = MenuItemBuilder::with_id(format!("recent-{}", i), &label).build(app) {
                let _ = submenu.append(&item);
            }
        }
        if let Ok(sep) = tauri::menu::PredefinedMenuItem::separator(app) {
            let _ = submenu.append(&sep);
        }
        if let Ok(clear) = MenuItemBuilder::with_id("clear-recent", "Clear Recent").build(app) {
            let _ = submenu.append(&clear);
        }
    }
}

// ── Clipboard Image (macOS) ──

#[derive(Serialize)]
struct ClipboardImageResult {
    data: String, // base64-encoded image (empty if url is set)
    mime: String,
    url: String,  // image source URL from clipboard (for downloading original format)
}

#[tauri::command]
fn read_clipboard_image() -> Option<ClipboardImageResult> {
    #[cfg(target_os = "macos")]
    {
        use cocoa::base::{id, nil};
        unsafe {
            let pasteboard: id = msg_send![class!(NSPasteboard), generalPasteboard];

            // Create NSString UTIs via msg_send to avoid trait resolution issues
            fn nsstring(s: &str) -> id {
                unsafe {
                    let ns: id = msg_send![class!(NSString), alloc];
                    let ns: id = msg_send![ns, initWithBytes: s.as_ptr()
                        length: s.len()
                        encoding: 4u64]; // NSUTF8StringEncoding
                    ns
                }
            }

            // Try animated formats first so GIFs/animated WebPs survive intact,
            // then lossless/lossy stills, with TIFF as last resort.
            let candidates: &[(&str, &str)] = &[
                ("com.compuserve.gif", "image/gif"),
                ("org.webmproject.webp", "image/webp"),
                ("public.png", "image/png"),
                ("public.jpeg", "image/jpeg"),
                ("public.tiff", "image/tiff"),
            ];

            // Read URL from clipboard (Safari puts image source URL here)
            let mut clipboard_url = String::new();
            let url_uti = nsstring("public.url");
            let url_data: id = msg_send![pasteboard, dataForType: url_uti];
            if url_data != nil {
                let len: usize = msg_send![url_data, length];
                if len > 0 {
                    let ptr: *const u8 = msg_send![url_data, bytes];
                    let slice = std::slice::from_raw_parts(ptr, len);
                    if let Ok(s) = std::str::from_utf8(slice) {
                        clipboard_url = s.to_string();
                    }
                }
            }

            let mut image_data: id = nil;
            let mut mime_str: &str = "";
            for (uti, mime) in candidates {
                let ns_uti = nsstring(uti);
                let d: id = msg_send![pasteboard, dataForType: ns_uti];
                if d != nil {
                    image_data = d;
                    mime_str = mime;
                    break;
                }
            }

            // If we have a URL but the image data is a lossy render (TIFF/PNG from
            // a GIF/WebP source), return URL so the frontend can download the original.
            let url_has_animated_ext = clipboard_url.ends_with(".gif")
                || clipboard_url.ends_with(".webp")
                || clipboard_url.contains(".gif?")
                || clipboard_url.contains(".webp?");
            let data_is_static = mime_str == "image/tiff" || mime_str == "image/png" || mime_str == "image/jpeg";
            if url_has_animated_ext && data_is_static && !clipboard_url.is_empty() {
                return Some(ClipboardImageResult {
                    data: String::new(),
                    mime: String::new(),
                    url: clipboard_url,
                });
            }

            if image_data == nil {
                return None;
            }

            let length: usize = msg_send![image_data, length];
            if length == 0 {
                return None;
            }

            let bytes_ptr: *const u8 = msg_send![image_data, bytes];
            let bytes = std::slice::from_raw_parts(bytes_ptr, length);

            // base64 encode (no external dep needed)
            const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            let mut b64 = String::with_capacity((bytes.len() + 2) / 3 * 4);
            for chunk in bytes.chunks(3) {
                let b0 = chunk[0] as u32;
                let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
                let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
                let triple = (b0 << 16) | (b1 << 8) | b2;
                b64.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
                b64.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);
                if chunk.len() > 1 { b64.push(CHARS[((triple >> 6) & 0x3F) as usize] as char); } else { b64.push('='); }
                if chunk.len() > 2 { b64.push(CHARS[(triple & 0x3F) as usize] as char); } else { b64.push('='); }
            }

            Some(ClipboardImageResult {
                data: b64,
                mime: mime_str.to_string(),
                url: clipboard_url,
            })
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        None
    }
}

// ── App Setup ──

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(RecentMenuState(std::sync::Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![mcp_respond, set_menu_check, set_window_title, fix_traffic_lights, install_mcp, resolve_mcp_server_path, get_recent_files, add_recent_file, clear_recent_files, check_has_launched, mark_has_launched, read_clipboard_image])
        .setup(|app| {
            // ── Native Menu ──
            let icon = Image::from_bytes(include_bytes!("../icons/128x128@2x.png"))
                .expect("failed to load app icon");
            let about = AboutMetadata {
                icon: Some(icon),
                copyright: Some("© 2026 Miguel Estupiñán".into()),
                ..Default::default()
            };
            let check_updates_item = MenuItemBuilder::with_id("check-for-updates", "Check for Updates…")
                .build(app)?;

            let quit_item = MenuItemBuilder::with_id("quit", "Quit Caja")
                .accelerator("CmdOrCtrl+Q")
                .build(app)?;

            let app_menu = SubmenuBuilder::new(app, "Caja")
                .about(Some(about))
                .item(&check_updates_item)
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .item(&quit_item)
                .build()?;

            let new_item = MenuItemBuilder::with_id("new", "New")
                .accelerator("CmdOrCtrl+N")
                .build(app)?;
            let open_item = MenuItemBuilder::with_id("open", "Open…")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let save_item = MenuItemBuilder::with_id("save", "Save")
                .accelerator("CmdOrCtrl+S")
                .build(app)?;
            let save_as_item = MenuItemBuilder::with_id("save-as", "Save As…")
                .accelerator("CmdOrCtrl+Shift+S")
                .build(app)?;
            let export_item = MenuItemBuilder::with_id("export", "Export…")
                .accelerator("CmdOrCtrl+E")
                .build(app)?;
            // Build "Open Recent" submenu
            let recent_files = load_recent_files();
            let mut recent_menu = SubmenuBuilder::new(app, "Open Recent");
            if recent_files.is_empty() {
                let no_recent = MenuItemBuilder::with_id("no-recent", "No Recent Files")
                    .enabled(false)
                    .build(app)?;
                recent_menu = recent_menu.item(&no_recent);
            } else {
                // Store items in a Vec to keep them alive for the builder
                let mut recent_items = Vec::new();
                for (i, path) in recent_files.iter().enumerate() {
                    let label = std::path::Path::new(path)
                        .file_name()
                        .map(|f| f.to_string_lossy().to_string())
                        .unwrap_or_else(|| path.clone());
                    let item = MenuItemBuilder::with_id(format!("recent-{}", i), &label)
                        .build(app)?;
                    recent_items.push(item);
                }
                for item in &recent_items {
                    recent_menu = recent_menu.item(item);
                }
                let clear_item = MenuItemBuilder::with_id("clear-recent", "Clear Recent")
                    .build(app)?;
                recent_menu = recent_menu.separator().item(&clear_item);
            }
            let recent_submenu = recent_menu.build()?;

            // Store handle for dynamic rebuilds
            if let Some(state) = app.try_state::<RecentMenuState>() {
                if let Ok(mut guard) = state.0.lock() {
                    *guard = Some(recent_submenu.clone());
                }
            }

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_item)
                .item(&open_item)
                .item(&recent_submenu)
                .separator()
                .item(&save_item)
                .item(&save_as_item)
                .separator()
                .item(&export_item)
                .separator()
                .close_window()
                .build()?;

            // Custom Edit menu items — fire on_menu_event so both menu clicks AND
            // keyboard shortcuts reach the frontend. The frontend checks activeElement
            // to route to document.execCommand() (text inputs) or app logic (canvas).
            // Undo/Redo: custom items with accelerators — execCommand('undo'/'redo')
            // works for text inputs (no clipboard security issues), app logic for canvas.
            // Accelerators intercept ⌘Z/⌘⇧Z and fire on_menu_event reliably.
            let edit_undo = MenuItemBuilder::with_id("edit-undo", "Undo")
                .accelerator("CmdOrCtrl+Z")
                .build(app)?;
            let edit_redo = MenuItemBuilder::with_id("edit-redo", "Redo")
                .accelerator("CmdOrCtrl+Shift+Z")
                .build(app)?;

            // Cut/Copy/Paste/Select All: PREDEFINED items — required for the macOS
            // NSResponder chain so ⌘C/V/X work natively in text inputs/WebView.
            // Custom items break the responder chain (tauri-apps/tauri#2397).
            // Canvas operations are handled via DOM copy/paste/cut event listeners.
            let edit_duplicate = MenuItemBuilder::with_id("edit-duplicate", "Duplicate")
                .build(app)?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .item(&edit_undo)
                .item(&edit_redo)
                .separator()
                .cut()
                .copy()
                .paste()
                .item(&edit_duplicate)
                .separator()
                .select_all()
                .build()?;

            let toggle_left_panel = CheckMenuItemBuilder::with_id("toggle-left-panel", "Left Panel")
                .checked(true)
                .accelerator("CmdOrCtrl+1")
                .build(app)?;
            let toggle_right_panel = CheckMenuItemBuilder::with_id("toggle-right-panel", "Right Panel")
                .checked(true)
                .accelerator("CmdOrCtrl+2")
                .build(app)?;

            let theme_system = CheckMenuItemBuilder::with_id("theme-system", "System")
                .checked(true)
                .build(app)?;
            let theme_dark = CheckMenuItemBuilder::with_id("theme-default-dark", "Dark")
                .build(app)?;
            let theme_light = CheckMenuItemBuilder::with_id("theme-default-light", "Light")
                .build(app)?;

            let themes_submenu = SubmenuBuilder::new(app, "Theme")
                .item(&theme_system)
                .item(&theme_dark)
                .item(&theme_light)
                .build()?;

            let spacing_grid_off = CheckMenuItemBuilder::with_id("spacing-grid-off", "Off")
                .build(app)?;
            let spacing_grid_4px = CheckMenuItemBuilder::with_id("spacing-grid-4px", "4px")
                .checked(true)
                .build(app)?;
            let spacing_grid_8px = CheckMenuItemBuilder::with_id("spacing-grid-8px", "8px")
                .build(app)?;

            let spacing_grid_submenu = SubmenuBuilder::new(app, "Spacing Grid")
                .item(&spacing_grid_off)
                .item(&spacing_grid_4px)
                .item(&spacing_grid_8px)
                .build()?;

            let style_new_frames = CheckMenuItemBuilder::with_id("style-new-frames", "Auto-Style New Frames")
                .checked(true)
                .build(app)?;

            let collapse_all = MenuItemBuilder::with_id("collapse-all", "Collapse All Layers")
                .build(app)?;
            let expand_all = MenuItemBuilder::with_id("expand-all", "Expand All Layers")
                .build(app)?;
            let reset_workspace = MenuItemBuilder::with_id("reset-workspace", "Reset Workspace")
                .accelerator("CmdOrCtrl+Shift+R")
                .build(app)?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&toggle_left_panel)
                .item(&toggle_right_panel)
                .separator()
                .item(&spacing_grid_submenu)
                .item(&style_new_frames)
                .separator()
                .item(&collapse_all)
                .item(&expand_all)
                .build()?;

            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .separator()
                .item(&reset_workspace)
                .separator()
                .close_window()
                .build()?;

            let shortcuts_item = MenuItemBuilder::with_id("keyboard-shortcuts", "Keyboard Shortcuts")
                .build(app)?;
            let docs_item = MenuItemBuilder::with_id("open-docs", "Documentation")
                .build(app)?;

            let help_menu = SubmenuBuilder::new(app, "Help")
                .item(&docs_item)
                .separator()
                .item(&shortcuts_item)
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&window_menu)
                .item(&help_menu)
                .build()?;

            app.set_menu(menu)?;

            // Vibrancy is now handled by windowEffects in tauri.conf.json
            // (underWindowBackground + fullScreenUI effects).
            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                // Self-healing traffic light positioning via NSWindow notification observer.
                // Covers ALL cases: resize, fullscreen, Stage Manager, display change, setTitle, HMR.
                // Replaces the fragile ad-hoc frontend calls.
                let ns_window = window.ns_window().unwrap() as cocoa::base::id;
                unsafe {
                    use cocoa::base::{id, nil};
                    use cocoa::foundation::NSString;
                    use std::sync::atomic::{AtomicBool, Ordering};

                    let center: id = msg_send![class!(NSNotificationCenter), defaultCenter];

                    // Re-entrancy guard: reposition_traffic_lights nudges size which fires
                    // NSWindowDidResize again. The guard prevents infinite recursion.
                    static REPOSITIONING: AtomicBool = AtomicBool::new(false);

                    let block = block::ConcreteBlock::new(move |_notif: id| {
                        if REPOSITIONING.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_ok() {
                            reposition_traffic_lights(ns_window);
                            REPOSITIONING.store(false, Ordering::SeqCst);
                        }
                    });
                    let block = block.copy();

                    let traffic_light_notifications = [
                        "NSWindowDidResizeNotification",
                        "NSWindowDidExitFullScreenNotification",
                        "NSWindowDidChangeScreenNotification",
                        "NSWindowDidBecomeKeyNotification",
                        "NSWindowDidMoveNotification",
                    ];

                    for name in &traffic_light_notifications {
                        let name_ns = NSString::alloc(nil).init_str(name);
                        let _: id = msg_send![center,
                            addObserverForName: name_ns
                            object: ns_window
                            queue: nil
                            usingBlock: &*block
                        ];
                    }

                    // Fullscreen: make the native titlebar opaque so it isn't a
                    // transparent strip when the user hovers the menu bar.
                    // titlebarAppearsTransparent is a simple BOOL property — safe
                    // to toggle (unlike styleMask which conflicts with TAO).
                    let app_for_fs = app.handle().clone();
                    let fs_enter_block = block::ConcreteBlock::new(move |_notif: id| {
                        let _ = app_for_fs.emit("fullscreen-change", true);
                        let _: () = msg_send![ns_window, setTitlebarAppearsTransparent: false];
                    });
                    let fs_enter_block = fs_enter_block.copy();
                    let enter_name = NSString::alloc(nil).init_str("NSWindowDidEnterFullScreenNotification");
                    let _: id = msg_send![center,
                        addObserverForName: enter_name
                        object: ns_window
                        queue: nil
                        usingBlock: &*fs_enter_block
                    ];

                    let app_for_fs2 = app.handle().clone();
                    let fs_exit_block = block::ConcreteBlock::new(move |_notif: id| {
                        let _ = app_for_fs2.emit("fullscreen-change", false);
                        let _: () = msg_send![ns_window, setTitlebarAppearsTransparent: true];
                    });
                    let fs_exit_block = fs_exit_block.copy();
                    let exit_name = NSString::alloc(nil).init_str("NSWindowDidExitFullScreenNotification");
                    let _: id = msg_send![center,
                        addObserverForName: exit_name
                        object: ns_window
                        queue: nil
                        usingBlock: &*fs_exit_block
                    ];
                }

                // Initial nudge after window-state plugin restores geometry.
                // Two passes: early (100ms) catches most cases, late (500ms) catches
                // slow window-state restores between builds.
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    for delay_ms in [100, 500] {
                        std::thread::sleep(std::time::Duration::from_millis(delay_ms));
                        let h = app_handle.clone();
                        let _ = app_handle.run_on_main_thread(move || {
                            if let Some(w) = h.get_webview_window("main") {
                                let ns = w.ns_window().unwrap() as cocoa::base::id;
                                reposition_traffic_lights(ns);
                            }
                        });
                    }
                });
            }

            // ── MCP HTTP Bridge ──
            // Reuse existing token so server.mjs stays connected across app restarts
            let auth_token = if let Some(home) = std::env::var_os("HOME") {
                let caja_dir = std::path::Path::new(&home).join(".caja");
                let token_path = caja_dir.join("mcp-token");
                let _ = std::fs::create_dir_all(&caja_dir);
                match std::fs::read_to_string(&token_path) {
                    Ok(t) if !t.trim().is_empty() => t.trim().to_string(),
                    _ => {
                        let t = uuid::Uuid::new_v4().to_string();
                        let _ = std::fs::write(&token_path, &t);
                        t
                    }
                }
            } else {
                uuid::Uuid::new_v4().to_string()
            };

            let bridge_state = BridgeState {
                app: app.handle().clone(),
                pending: Arc::new(Mutex::new(HashMap::new())),
                next_id: Arc::new(Mutex::new(0)),
                auth_token,
            };

            // Store bridge state in Tauri's managed state
            app.manage(bridge_state.clone());

            // Spawn HTTP server on port 3334
            tauri::async_runtime::spawn(async move {
                let router = Router::new()
                    .route("/api/tool", post(handle_tool_call))
                    .route("/api/resource", get(handle_resource))
                    .route("/api/health", get(handle_health))
                    .with_state(bridge_state);

                let listener = match tokio::net::TcpListener::bind("127.0.0.1:3334").await {
                    Ok(l) => l,
                    Err(e) => {
                        eprintln!("MCP bridge: failed to bind port 3334: {}", e);
                        return;
                    }
                };

                eprintln!("MCP bridge: listening on http://127.0.0.1:3334");

                if let Err(e) = axum::serve(listener, router).await {
                    eprintln!("MCP bridge: server error: {}", e);
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { .. } => {
                    use tauri_plugin_window_state::AppHandleExt;
                    let _ = window.app_handle().save_window_state(tauri_plugin_window_state::StateFlags::all());
                }
                tauri::WindowEvent::Resized(..)
                | tauri::WindowEvent::ThemeChanged(..)
                | tauri::WindowEvent::Focused(true) => {}
                _ => {}
            }
        })
        .on_menu_event(|app, event| {
            let id = event.id().0.as_str();

            // Theme radio items — uncheck siblings, emit theme-change
            let theme_ids = ["theme-system", "theme-default-dark", "theme-default-light"];
            if theme_ids.contains(&id) {
                use tauri::menu::MenuItemKind;
                // Walk: menu > View submenu > Theme submenu > check items
                if let Some(menu) = app.menu() {
                    for top_item in menu.items().unwrap_or_default() {
                        if let MenuItemKind::Submenu(view_sub) = top_item {
                            for view_item in view_sub.items().unwrap_or_default() {
                                if let MenuItemKind::Submenu(theme_sub) = view_item {
                                    for theme_item in theme_sub.items().unwrap_or_default() {
                                        if let MenuItemKind::Check(check) = theme_item {
                                            let _ = check.set_checked(check.id().0 == id);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                let _ = app.emit("menu-event", id);
                return;
            }

            // Spacing grid radio items — uncheck siblings, emit event
            let spacing_grid_ids = ["spacing-grid-off", "spacing-grid-4px", "spacing-grid-8px"];
            if spacing_grid_ids.contains(&id) {
                use tauri::menu::MenuItemKind;
                if let Some(menu) = app.menu() {
                    for top_item in menu.items().unwrap_or_default() {
                        if let MenuItemKind::Submenu(view_sub) = top_item {
                            for view_item in view_sub.items().unwrap_or_default() {
                                if let MenuItemKind::Submenu(grid_sub) = view_item {
                                    for grid_item in grid_sub.items().unwrap_or_default() {
                                        if let MenuItemKind::Check(check) = grid_item {
                                            let _ = check.set_checked(check.id().0 == id);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                let _ = app.emit("menu-event", id);
                return;
            }

            // For check menu items, emit their new checked state
            match id {
                "toggle-left-panel" | "toggle-right-panel" | "style-new-frames" => {
                    use tauri::menu::MenuItemKind;
                    if let Some(menu) = app.menu() {
                        for item in menu.items().unwrap_or_default() {
                            if let MenuItemKind::Submenu(sub) = item {
                                for sub_item in sub.items().unwrap_or_default() {
                                    if let MenuItemKind::Check(check) = sub_item {
                                        if check.id().0 == id {
                                            let checked = check.is_checked().unwrap_or(false);
                                            let _ = app.emit("menu-check-event", (id, checked));
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
            // Recent file items and clear-recent
            if id.starts_with("recent-") || id == "clear-recent" {
                if id == "clear-recent" {
                    save_recent_files(&[]);
                }
                let _ = app.emit("menu-event", id);
                return;
            }
            let _ = app.emit("menu-event", id);
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
