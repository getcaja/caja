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
// setTitle() and window-state restoration reset traffic light position.
// We re-apply via objc on every relevant window event.

#[cfg(target_os = "macos")]
const TRAFFIC_LIGHT_X: f64 = 13.0;
#[cfg(target_os = "macos")]
const TRAFFIC_LIGHT_Y: f64 = 24.0;

#[cfg(target_os = "macos")]
fn position_traffic_lights(ns_window: cocoa::base::id) {
    use cocoa::appkit::{NSView, NSWindow, NSWindowButton};
    use cocoa::foundation::NSRect;

    unsafe {
        let close = ns_window.standardWindowButton_(NSWindowButton::NSWindowCloseButton);
        let miniaturize = ns_window.standardWindowButton_(NSWindowButton::NSWindowMiniaturizeButton);
        let zoom = ns_window.standardWindowButton_(NSWindowButton::NSWindowZoomButton);

        let title_bar_container = close.superview().superview();

        let close_rect: NSRect = msg_send![close, frame];
        let button_height = close_rect.size.height;

        let title_bar_height = button_height + TRAFFIC_LIGHT_Y;
        let mut title_bar_rect = NSView::frame(title_bar_container);
        title_bar_rect.size.height = title_bar_height;
        title_bar_rect.origin.y = NSView::frame(ns_window).size.height - title_bar_height;
        let _: () = msg_send![title_bar_container, setFrame: title_bar_rect];

        let buttons = vec![close, miniaturize, zoom];
        let space_between = NSView::frame(miniaturize).origin.x - NSView::frame(close).origin.x;
        let button_y = (title_bar_height - button_height) / 2.0;

        for (i, button) in buttons.into_iter().enumerate() {
            let mut rect: NSRect = NSView::frame(button);
            rect.origin.x = TRAFFIC_LIGHT_X + (i as f64 * space_between);
            rect.origin.y = button_y;
            button.setFrameOrigin(rect.origin);
        }
    }
}

// Tauri command: set window title + reposition traffic lights (setTitle resets them)
#[tauri::command]
fn set_window_title(app: AppHandle, title: String) {
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::NSWindow;
        use cocoa::base::nil;
        use cocoa::foundation::NSString;

        if let Some(window) = app.get_webview_window("main") {
            let ns_window = window.ns_window().unwrap() as cocoa::base::id;
            unsafe {
                let ns_title = cocoa::foundation::NSString::alloc(nil).init_str(&title);
                NSWindow::setTitle_(ns_window, ns_title);
                position_traffic_lights(ns_window);
            }
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.set_title(&title);
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
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![mcp_respond, set_menu_check, set_window_title])
        .setup(|app| {
            // ── Native Menu ──
            let icon = Image::from_bytes(include_bytes!("../icons/128x128@2x.png"))
                .expect("failed to load app icon");
            let about = AboutMetadata {
                icon: Some(icon),
                ..Default::default()
            };
            let app_menu = SubmenuBuilder::new(app, "Caja")
                .about(Some(about))
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

            let spacing_overlays_item = CheckMenuItemBuilder::with_id("toggle-spacing-overlays", "Spacing Overlays")
                .accelerator("CmdOrCtrl+Shift+O")
                .build(app)?;
            let overlay_values_item = CheckMenuItemBuilder::with_id("toggle-overlay-values", "Overlay Values")
                .accelerator("CmdOrCtrl+Shift+V")
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
                .item(&spacing_overlays_item)
                .item(&overlay_values_item)
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

            // Position traffic lights after window-state restoration
            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                let ns_win = window.ns_window().unwrap() as cocoa::base::id;
                position_traffic_lights(ns_win);
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
                tauri::WindowEvent::Resized(..) | tauri::WindowEvent::ThemeChanged(..) => {
                    #[cfg(target_os = "macos")]
                    {
                        let ns_win = window.ns_window().unwrap() as cocoa::base::id;
                        position_traffic_lights(ns_win);
                    }
                }
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
                "toggle-spacing-overlays" | "toggle-overlay-values" | "toggle-advanced-mode" => {
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
