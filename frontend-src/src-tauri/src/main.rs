// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::thread;
use std::time::Duration;

fn main() {
    // Launch the Python Flask backend as a sidecar process
    let exe_dir = std::env::current_exe()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf();

    // 1. Resolve potential backend executable paths
    let mut detected_path = None;
    let possible_paths = vec![
        // Installed Tauri v2 resource path (directly in root, no resources folder)
        if cfg!(target_os = "windows") {
            exe_dir.join("_up_/_up_/backend/dist/devhunt_backend/devhunt_backend.exe")
        } else {
            exe_dir.join("_up_/_up_/backend/dist/devhunt_backend/devhunt_backend")
        },
        // Tauri v2 nested resource folder (during development/cargo release)
        if cfg!(target_os = "windows") {
            exe_dir.join("resources/_up_/_up_/backend/dist/devhunt_backend/devhunt_backend.exe")
        } else {
            exe_dir.join("resources/_up_/_up_/backend/dist/devhunt_backend/devhunt_backend")
        },
        // Flat resource folder
        if cfg!(target_os = "windows") {
            exe_dir.join("resources/devhunt_backend/devhunt_backend.exe")
        } else {
            exe_dir.join("resources/devhunt_backend/devhunt_backend")
        },
        // Direct subfolder next to main executable
        if cfg!(target_os = "windows") {
            exe_dir.join("devhunt_backend/devhunt_backend.exe")
        } else {
            exe_dir.join("devhunt_backend/devhunt_backend")
        },
    ];

    for path in possible_paths {
        if path.exists() {
            detected_path = Some(path);
            break;
        }
    }

    let backend_path = detected_path.unwrap_or_else(|| {
        if cfg!(target_os = "windows") {
            exe_dir.join("devhunt_backend/devhunt_backend.exe")
        } else {
            exe_dir.join("devhunt_backend/devhunt_backend")
        }
    });

    // Spawn the Python backend process
    let mut token_opt = None;
    let _backend = if backend_path.exists() {
        let backend_dir = backend_path.parent().unwrap();
        // Generate a session token using system time (no rand dependency needed)
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .subsec_nanos();
        let pid = std::process::id();
        let token = format!("{:08x}{:08x}{:08x}{:08x}", nanos, pid, nanos ^ pid, nanos.wrapping_mul(pid));
        token_opt = Some(token.clone());
        let child = Command::new(&backend_path)
            .current_dir(backend_dir)
            .arg("--port")
            .arg("1225")
            .arg("--token")
            .arg(&token)
            .env("X_DEVHUNT_TOKEN", &token)
            .spawn()
            .expect("Failed to start DevHunt backend");
        Some(child)
    } else {
        // Dev mode: backend is run separately with `python app.py`
        eprintln!("Backend binary not found at {:?}, assuming dev mode", backend_path);
        None
    };

    // Wait a moment for Flask to boot before opening window
    if _backend.is_some() {
        thread::sleep(Duration::from_millis(3500));
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            if let Some(token) = token_opt {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    let target_url = format!("http://localhost:1225/?token={}", token);
                    if let Ok(url) = tauri::Url::parse(&target_url) {
                        let _ = window.navigate(url);
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
