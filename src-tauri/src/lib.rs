#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

use axum::{extract::State, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::image::Image;
use tauri::menu::{AboutMetadata, CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::{oneshot, Mutex};

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

    if let Err(_) = state.app.emit("mcp-resource-read", &event) {
        state.pending.lock().await.remove(&id);
        return Json(serde_json::json!({"error": "Failed to emit event"}));
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
fn reposition_traffic_lights_after_title(ns_window: cocoa::base::id) {
    // Same nudge trick: resize by 1pt and back to trigger TAO's native repositioning.
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
        serde_json::from_str(&raw).unwrap_or(serde_json::json!({}))
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
            reposition_traffic_lights_after_title(ns_window);
        }
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
fn add_recent_file(path: String) {
    add_to_recent(&path);
}

#[tauri::command]
fn clear_recent_files() {
    save_recent_files(&[]);
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
        .invoke_handler(tauri::generate_handler![mcp_respond, set_menu_check, set_window_title, install_mcp, resolve_mcp_server_path, get_recent_files, add_recent_file, clear_recent_files, check_has_launched, mark_has_launched])
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

            // Use native Edit menu — undo/redo/cut/copy/paste/select-all are handled
            // by the WebView natively. Custom items would intercept Cmd+C/V/Z etc.
            // and break text editing in inputs, dev tools, etc.
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
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

            let collapse_all = MenuItemBuilder::with_id("collapse-all", "Collapse All Layers")
                .build(app)?;
            let expand_all = MenuItemBuilder::with_id("expand-all", "Expand All Layers")
                .build(app)?;
            let reset_layout = MenuItemBuilder::with_id("reset-layout", "Reset to Default")
                .build(app)?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&toggle_left_panel)
                .item(&toggle_right_panel)
                .separator()
                .item(&collapse_all)
                .item(&expand_all)
                .separator()
                .item(&reset_layout)
                .build()?;

            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .separator()
                .close_window()
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&window_menu)
                .build()?;

            app.set_menu(menu)?;

            // Apply vibrancy (traffic light positioning handled by trafficLightPosition in tauri.conf.json)
            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};
                let _ = apply_vibrancy(&window, NSVisualEffectMaterial::UnderWindowBackground, Some(NSVisualEffectState::Active), None);

                // window-state plugin restores geometry after setup, resetting traffic lights.
                // Nudge the window size after a delay to trigger Tauri/TAO's native repositioning.
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(200));
                    let h = app_handle.clone();
                    let _ = app_handle.run_on_main_thread(move || {
                        if let Some(w) = h.get_webview_window("main") {
                            let ns = w.ns_window().unwrap() as cocoa::base::id;
                            unsafe {
                                let frame: cocoa::foundation::NSRect = msg_send![ns, frame];
                                let mut nudged = frame;
                                nudged.size.height += 1.0;
                                let _: () = msg_send![ns, setFrame: nudged display: false];
                                let _: () = msg_send![ns, setFrame: frame display: false];
                            }
                        }
                    });
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

            // For check menu items, emit their new checked state
            match id {
                "toggle-left-panel" | "toggle-right-panel" => {
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
