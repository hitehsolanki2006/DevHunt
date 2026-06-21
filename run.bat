@echo off
title DevHunt — AI Assistant Launcher
echo.
echo  ========================================
echo    DevHunt ^| AI Assistant Starting...
echo  ========================================
echo  Created by  : Hitesh Solanki
echo  Website     : https://hiteshsolanki.in
echo  Email       : solankihiteshpankajbhai7@gmail.com
echo  Mobile      : +91 9327810431
echo  ----------------------------------------
echo.

:: 1. Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo.
    echo -------------------------------------------------------------
    echo Troubleshooting:
    echo 1. Download Python 3.10 or higher from the official website:
    echo    https://www.python.org/downloads/
    echo 2. Run the installer and check the box: "Add Python to PATH"
    echo    This is crucial for the command line to find Python.
    echo 3. Restart your terminal or command prompt and run this script again.
    echo -------------------------------------------------------------
    pause
    exit /b 1
)

:: 2. Check Python version (requires >= 3.10)
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Incompatible Python version detected.
    echo.
    echo -------------------------------------------------------------
    echo Troubleshooting:
    echo DevHunt requires Python 3.10 or higher.
    echo Your current Python version is:
    python --version
    echo Please install a compatible Python version from:
    echo    https://www.python.org/downloads/
    echo -------------------------------------------------------------
    pause
    exit /b 1
)

:: 3. Check if virtual environment exists and is working
set VENV_OK=0
if exist "backend\venv\Scripts\python.exe" (
    backend\venv\Scripts\python.exe -c "import sys" >nul 2>&1
    if %errorlevel% == 0 (
        set VENV_OK=1
    ) else (
        echo [WARN] Existing virtual environment is broken or Python path has changed.
        echo [INFO] Deleting the broken virtual environment and recreating it...
        rd /s /q "backend\venv" >nul 2>&1
    )
)

set IS_FRESH=0
if %VENV_OK% neq 1 (
    echo [INFO] Creating Python virtual environment...
    python -m venv backend\venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        echo.
        echo -------------------------------------------------------------
        echo Troubleshooting:
        echo 1. Verify you have write permissions for the directory:
        echo    %cd%
        echo 2. Try running this script as Administrator.
        echo 3. Check if your Python installation is complete. If needed,
        echo    reinstall Python from https://www.python.org/downloads/
        echo -------------------------------------------------------------
        pause
        exit /b 1
    )
    set IS_FRESH=1
)

:: 4. Manage dependencies (check if old, directly install if fresh)
if %IS_FRESH% == 1 (
    echo [INFO] Fresh environment detected. Installing required libraries...
    goto :install_reqs
) else (
    echo [INFO] Verifying existing library installations...
    backend\venv\Scripts\python.exe backend\check_requirements.py >nul 2>&1
    if %errorlevel% == 0 (
        echo [INFO] All dependencies are already satisfied.
        goto :run_server
    ) else (
        echo [INFO] Some dependencies are missing or outdated. Installing updates...
        goto :install_reqs
    )
)

:install_reqs
backend\venv\Scripts\pip install -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [WARN] Dependency installation failed. Trying to upgrade pip...
    backend\venv\Scripts\python.exe -m pip install --upgrade pip >nul 2>&1
    echo [INFO] Retrying dependency installation...
    backend\venv\Scripts\pip install -r backend\requirements.txt
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Dependency installation failed.
        echo.
        echo -------------------------------------------------------------
        echo Troubleshooting:
        echo 1. Check your internet connection.
        echo 2. Verify that there are no conflicting packages.
        echo 3. Try running: backend\venv\Scripts\pip install -r backend\requirements.txt
        echo    manually to see full error logs.
        echo -------------------------------------------------------------
        pause
        exit /b 1
    )
)

:run_server
:: Initialize default values
set PORT=1225
set UI_CHOICE=2

:: Parse command line arguments
:parse_args
if "%~1"=="" goto after_args
if "%~1"=="--port" (
    set PORT=%~2
    shift
    shift
    goto parse_args
)
shift
goto parse_args
:after_args

:: Prompt for frontend UI mode
echo.
echo Select Frontend UI Mode:
echo   [1] Legacy HTML/CSS
echo   [2] Modern Vite React (Recommended)
echo.
set /p UI_CHOICE="Enter selection (1 or 2, default 2): "

if "%UI_CHOICE%"=="1" (
    set DEVHUNT_FRONTEND_MODE=legacy
    echo [INFO] Legacy HTML/CSS mode selected.
) else (
    set DEVHUNT_FRONTEND_MODE=react
    echo [INFO] Modern Vite React mode selected.
)

:: Generate secure token using python
for /f "tokens=*" %%i in ('backend\venv\Scripts\python.exe -c "import secrets; print(secrets.token_hex(16))"') do set SECURE_TOKEN=%%i

:: Set environment variables
set X_DEVHUNT_TOKEN=%SECURE_TOKEN%

:: Move to backend directory
cd /d "%~dp0backend"

:: Start Flask in background
echo [1/2] Starting Flask server on http://localhost:%PORT% ...
start "" /B venv\Scripts\python.exe app.py --port %PORT% --token %SECURE_TOKEN%

:: Wait for server to boot
echo [2/2] Waiting for server to start...
timeout /t 3 /nobreak >nul

:: Detect and open browser
echo [3/3] Opening browser...
set URL=http://localhost:%PORT%/?token=%SECURE_TOKEN%

:: Try browsers in order of preference
where chrome >nul 2>&1 && (
    start "" "chrome" "%URL%" & goto :done
)
where msedge >nul 2>&1 && (
    start "" "msedge" "%URL%" & goto :done
)
where firefox >nul 2>&1 && (
    start "" "firefox" "%URL%" & goto :done
)

:: Fallback — let Windows pick the default browser
start "" "%URL%"

:done
echo.
echo  Server running at: http://localhost:%PORT%
echo.
echo  ==================================================================
echo   To connect a host command line terminal to the DevHunt server:
echo     Open a new terminal window and run: hunter.bat -dt
echo  ==================================================================
echo.
echo  Press Ctrl+C in server window to stop.
echo.
pause
