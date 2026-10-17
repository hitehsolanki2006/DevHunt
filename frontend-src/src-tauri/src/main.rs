// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpListener;
use std::process::Command;
use std::thread;
use std::time::Duration;

#[cfg(target_os = "windows")]
fn generate_secure_token() -> String {
    extern "system" {
        fn BCryptGenRandom(
            h_alg: *mut std::ffi::c_void,
            pb_buf: *mut u8,
            cb_buf: u32,
            dw_flags: u32,
        ) -> i32;
    }
    let mut buf = [0u8; 32];
    let ok = unsafe {
        BCryptGenRandom(
            std::ptr::null_mut(),
            buf.as_mut_ptr(),
            buf.len() as u32,
            0x00000002, // BCRYPT_USE_SYSTEM_PREFERRED_RNG
        ) == 0
    };
    if ok {
        buf.iter().map(|b| format!("{:02x}", b)).collect()
    } else {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let pid = std::process::id();
        format!("{:032x}{:032x}", nanos, (nanos ^ (pid as u128)).wrapping_mul(6364136223846793005))
    }
}

#[cfg(not(target_os = "windows"))]
fn generate_secure_token() -> String {
    use std::io::Read;
    let mut buf = [0u8; 32];
    if let Ok(mut f) = std::fs::File::open("/dev/urandom") {
        if f.read_exact(&mut buf).is_ok() {
            return buf.iter().map(|b| format!("{:02x}", b)).collect();
        }
    }
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let pid = std::process::id();
    format!("{:032x}{:032x}", nanos, (nanos ^ (pid as u128)).wrapping_mul(6364136223846793005))
}

fn find_free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .unwrap_or(1225)
}

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
    let mut session_info: Option<(String, u16)> = None;
    let mut backend_child = if backend_path.exists() {
        let backend_dir = backend_path.parent().unwrap();
        let port = find_free_port();
        let token = generate_secure_token();
        session_info = Some((token.clone(), port));
        let child = Command::new(&backend_path)
            .current_dir(backend_dir)
            .arg("--port")
            .arg(port.to_string())
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
    if backend_child.is_some() {
        thread::sleep(Duration::from_millis(3500));
    }

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            if let Some((token, port)) = session_info {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    let target_url = format!("http://127.0.0.1:{}?token={}", port, token);
                    if let Ok(url) = tauri::Url::parse(&target_url) {
                        let _ = window.navigate(url);
                    }
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(move |_app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            if let Some(mut child) = backend_child.take() {
                #[cfg(target_os = "windows")]
                {
                    let pid = child.id();
                    let _ = Command::new("taskkill")
                        .args(&["/F", "/T", "/PID", &pid.to_string()])
                        .output();
                }
                #[cfg(not(target_os = "windows"))]
                {
                    let _ = child.kill();
                }
            }
        }
    });
}
