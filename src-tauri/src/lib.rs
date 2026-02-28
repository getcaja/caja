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

// ── HTTP Handlers ──

async fn handle_tool_call(
    State(state): State<BridgeState>,
    Json(req): Json<ToolCallRequest>,
) -> Json<ToolCallResponse> {
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
    axum::extract::Query(query): axum::extract::Query<ResourceQuery>,
) -> Json<serde_json::Value> {
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

// Tauri command: install Caja MCP config into ~/.claude.json
#[tauri::command]
fn install_mcp_claude_code() -> Result<String, String> {
    // 1. Resolve server.mjs path
    let server_path = {
        let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
        let dev_path = cwd.join("../src/mcp/server.mjs");
        if let Ok(canonical) = dev_path.canonicalize() {
            canonical.to_string_lossy().to_string()
        } else if let Ok(exe) = std::env::current_exe() {
            if let Some(dir) = exe.parent() {
                let path = dir.join("../Resources/src/mcp/server.mjs");
                path.canonicalize()
                    .map(|p| p.to_string_lossy().to_string())
                    .map_err(|_| "Could not locate server.mjs".to_string())?
            } else {
                return Err("Could not locate server.mjs".into());
            }
        } else {
            return Err("Could not locate server.mjs".into());
        }
    };

    // 2. Read or create ~/.claude.json
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    let config_path = std::path::PathBuf::from(&home).join(".claude.json");

    let mut config: serde_json::Value = if config_path.exists() {
        let raw = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    // 3. Check if already configured
    if config.get("mcpServers")
        .and_then(|s| s.get("caja"))
        .is_some()
    {
        return Ok("already".into());
    }

    // 4. Merge caja server config
    let servers = config.as_object_mut().unwrap()
        .entry("mcpServers")
        .or_insert(serde_json::json!({}));
    servers.as_object_mut().unwrap().insert(
        "caja".into(),
        serde_json::json!({
            "command": "node",
            "args": [server_path]
        }),
    );

    // 5. Write back
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(&config_path, json).map_err(|e| e.to_string())?;

    Ok("installed".into())
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
        .invoke_handler(tauri::generate_handler![mcp_respond, set_menu_check, set_window_title, install_mcp_claude_code])
        .setup(|app| {
            // ── Native Menu ──
            let icon = Image::from_bytes(include_bytes!("../icons/128x128@2x.png"))
                .expect("failed to load app icon");
            let about = AboutMetadata {
                icon: Some(icon),
                ..Default::default()
            };
            let check_updates_item = MenuItemBuilder::with_id("check-for-updates", "Check for Updates…")
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
                .quit()
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
            let save_library_item = MenuItemBuilder::with_id("save-library", "Save Library")
                .build(app)?;
            let export_library_item = MenuItemBuilder::with_id("export-library", "Export Library…")
                .build(app)?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_item)
                .item(&open_item)
                .separator()
                .item(&save_item)
                .item(&save_as_item)
                .separator()
                .item(&export_item)
                .separator()
                .item(&save_library_item)
                .item(&export_library_item)
                .separator()
                .close_window()
                .build()?;

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
                .accelerator("CmdOrCtrl+\\")
                .build(app)?;
            let toggle_right_panel = CheckMenuItemBuilder::with_id("toggle-right-panel", "Right Panel")
                .checked(true)
                .accelerator("CmdOrCtrl+Shift+\\")
                .build(app)?;

            let advanced_mode_item = CheckMenuItemBuilder::with_id("toggle-advanced-mode", "Advanced Mode")
                .accelerator("CmdOrCtrl+Shift+A")
                .build(app)?;

            let theme_default = CheckMenuItemBuilder::with_id("theme-default-dark", "Default Dark")
                .checked(true)
                .build(app)?;
            let theme_dracula = CheckMenuItemBuilder::with_id("theme-dracula", "Dracula")
                .build(app)?;
            let theme_catppuccin = CheckMenuItemBuilder::with_id("theme-catppuccin-mocha", "Catppuccin Mocha")
                .build(app)?;

            let themes_submenu = SubmenuBuilder::new(app, "Theme")
                .item(&theme_default)
                .item(&theme_dracula)
                .item(&theme_catppuccin)
                .build()?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&toggle_left_panel)
                .item(&toggle_right_panel)
                .separator()
                .item(&advanced_mode_item)
                .separator()
                .item(&themes_submenu)
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
                let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, Some(NSVisualEffectState::Active), None);

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
            let bridge_state = BridgeState {
                app: app.handle().clone(),
                pending: Arc::new(Mutex::new(HashMap::new())),
                next_id: Arc::new(Mutex::new(0)),
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
            let theme_ids = ["theme-default-dark", "theme-dracula", "theme-catppuccin-mocha"];
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
                "toggle-left-panel" | "toggle-right-panel" | "toggle-advanced-mode" => {
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
            let _ = app.emit("menu-event", id);
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
