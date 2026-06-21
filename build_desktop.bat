@echo off
title DevHunt — Desktop Build
echo.
echo  ===================================================
echo    DevHunt Desktop Application Build Script
echo    Step 1: React Frontend
echo    Step 2: Python Backend (PyInstaller)
echo    Step 3: Tauri Desktop Shell + Installer
echo  ===================================================
echo.

:: ── PATH setup ──────────────────────────────────────────────────────────────
set "PATH=%PATH%;%USERPROFILE%\.cargo\bin;%APPDATA%\Python\Python313\Scripts;%APPDATA%\Python\Python312\Scripts;%LOCALAPPDATA%\Programs\Python\Python313\Scripts;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;%ProgramFiles%\Git\cmd"

:: Use dedicated Cargo target directory (avoids path-lock conflicts)
set CARGO_TARGET_DIR=e:\git-projects\devhunt_cargo_target
echo [INFO] Cargo target folder: %CARGO_TARGET_DIR%
echo.

:: ── Step 1: Rust MSVC Toolchain ─────────────────────────────────────────────
echo [1/5] Configuring Rust MSVC Toolchain...
call rustup default stable-x86_64-pc-windows-msvc
if errorlevel 1 (
    echo [ERROR] Could not switch to MSVC Rust toolchain.
    pause
    exit /b 1
)
echo [OK] Rust toolchain ready.
echo.

:: ── Step 2: Build React frontend ────────────────────────────────────────────
echo [2/5] Building React Frontend (Vite)...
cd /d "%~dp0frontend-src"
call npm install --prefer-offline
if errorlevel 1 (
    echo [WARN] npm install had issues - retrying with --legacy-peer-deps...
    call npm install --legacy-peer-deps
)
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed.
    pause & exit /b %ERRORLEVEL%
)
echo [OK] Frontend built - dist/ is ready.
cd /d "%~dp0"
echo.

:: ── Step 3: Build Python backend ────────────────────────────────────────────
echo [3/5] Building Python Backend (PyInstaller)...
cd /d "%~dp0backend"
call .\venv\Scripts\python.exe -m pip install --quiet pyinstaller
call .\venv\Scripts\python.exe -m PyInstaller devhunt_backend.spec --noconfirm --clean
cd /d "%~dp0"
if not exist "backend\dist\devhunt_backend\devhunt_backend.exe" (
    echo [ERROR] PyInstaller did not produce backend\dist\devhunt_backend\devhunt_backend.exe
    echo         Please check the output above for errors.
    pause
    exit /b 1
)
echo [OK] Backend binary built.
echo.

:: ── Step 4: Build Tauri shell ────────────────────────────────────────────────
echo [4/5] Compiling Tauri Desktop Shell + NSIS Installer...
cd /d "%~dp0frontend-src"
call npm run tauri:build
cd /d "%~dp0"

:: Try common installer paths
set INSTALLER_FOUND=0
if exist "%CARGO_TARGET_DIR%\release\bundle\nsis\DevHunt_1.0.0_x64-setup.exe" set INSTALLER_FOUND=1
if exist "%CARGO_TARGET_DIR%\x86_64-pc-windows-msvc\release\bundle\nsis\DevHunt_1.0.0_x64-setup.exe" set INSTALLER_FOUND=1
if %INSTALLER_FOUND% neq 1 (
    echo [ERROR] Tauri build did not produce an installer.
    echo         Check %CARGO_TARGET_DIR%\release\bundle\ for output.
    pause
    exit /b 1
)
echo [OK] Installer generated.
echo.

:: ── Step 5: Copy to dist_desktop ────────────────────────────────────────────
echo [5/5] Copying installers to dist_desktop\...
if not exist dist_desktop mkdir dist_desktop
xcopy /Y /S /E "%CARGO_TARGET_DIR%\release\bundle\*.*" "dist_desktop\" >nul 2>&1
xcopy /Y /S /E "%CARGO_TARGET_DIR%\x86_64-pc-windows-msvc\release\bundle\*.*" "dist_desktop\" >nul 2>&1

echo.
echo  ===================================================
echo    BUILD SUCCESSFUL!
echo  ===================================================
echo.
echo    Installers are in:  dist_desktop\
echo.
echo    Files:
dir /b /s dist_desktop\*.exe dist_desktop\*.msi 2>nul
echo  ===================================================
echo.
pause
