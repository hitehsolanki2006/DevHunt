@echo off
if exist "%~dp0backend\venv\Scripts\python.exe" (
    "%~dp0backend\venv\Scripts\python.exe" "%~dp0backend\hunter_cli.py" %*
) else (
    python "%~dp0backend\hunter_cli.py" %*
)
