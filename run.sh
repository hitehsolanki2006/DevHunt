#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
URL="http://localhost:5000"

echo ""
echo "  ========================================"
echo "    DevHunt | AI Assistant Starting..."
echo "  ========================================"
echo "  Created by : Hitesh Solanki"
echo "  Website    : https://hiteshsolanki.in"
echo "  Email      : solankihiteshpankajbhai7@gmail.com"
echo "  Mobile     : +91 9327810431"
echo "  ----------------------------------------"
echo ""

# 1. Check Python installation
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "[ERROR] Python is not installed or not in PATH."
    echo ""
    echo "-------------------------------------------------------------"
    echo "Troubleshooting:"
    echo "1. Download and install Python 3.10+ from the official site:"
    echo "   https://www.python.org/downloads/"
    echo "2. Or use your system's package manager, e.g.:"
    echo "   - macOS: brew install python"
    echo "   - Ubuntu/Debian: sudo apt update && sudo apt install python3 python3-pip python3-venv"
    echo "3. Ensure Python is added to your environment PATH."
    echo "-------------------------------------------------------------"
    exit 1
fi

PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

# 2. Check Python version (requires >= 3.10)
if ! "$PYTHON_CMD" -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" &> /dev/null; then
    echo "[ERROR] Incompatible Python version detected."
    echo ""
    echo "-------------------------------------------------------------"
    echo "Troubleshooting:"
    echo "DevHunt requires Python 3.10 or higher."
    echo "Your current Python version is:"
    "$PYTHON_CMD" --version
    echo "Please upgrade Python at: https://www.python.org/downloads/"
    echo "-------------------------------------------------------------"
    exit 1
fi

# 3. Check if virtual environment exists and is working
VENV_OK=0
if [ -f "$BACKEND_DIR/venv/bin/python" ]; then
    if "$BACKEND_DIR/venv/bin/python" -c "import sys" &> /dev/null; then
        VENV_OK=1
    else
        echo "[WARN] Existing virtual environment is broken or Python path has changed."
        echo "[INFO] Deleting the broken virtual environment and recreating..."
        rm -rf "$BACKEND_DIR/venv"
    fi
fi

IS_FRESH=0
if [ $VENV_OK -ne 1 ]; then
    echo "[INFO] Creating Python virtual environment..."
    "$PYTHON_CMD" -m venv "$BACKEND_DIR/venv"
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment."
        echo ""
        echo "-------------------------------------------------------------"
        echo "Troubleshooting:"
        echo "1. Make sure you have write permissions for:"
        echo "   $BACKEND_DIR"
        echo "2. On Ubuntu/Debian, you may need to install the venv module:"
        echo "   sudo apt install python3-venv"
        echo "-------------------------------------------------------------"
        exit 1
    fi
    IS_FRESH=1
fi

# 4. Manage dependencies
if [ $IS_FRESH -eq 1 ]; then
    echo "[INFO] Fresh environment detected. Installing required libraries..."
    INSTALL_DEPS=1
else
    echo "[INFO] Verifying existing library installations..."
    if "$BACKEND_DIR/venv/bin/python" "$BACKEND_DIR/check_requirements.py" &> /dev/null; then
        echo "[INFO] All dependencies are already satisfied."
        INSTALL_DEPS=0
    else
        echo "[INFO] Some dependencies are missing or outdated. Installing updates..."
        INSTALL_DEPS=1
    fi
fi

if [ $INSTALL_DEPS -eq 1 ]; then
    if ! "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"; then
        echo ""
        echo "[WARN] Dependency installation failed. Trying to upgrade pip..."
        "$BACKEND_DIR/venv/bin/python" -m pip install --upgrade pip &> /dev/null
        echo "[INFO] Retrying dependency installation..."
        if ! "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"; then
            echo ""
            echo "[ERROR] Dependency installation failed again."
            echo ""
            echo "-------------------------------------------------------------"
            echo "Troubleshooting:"
            echo "1. Check your internet connection."
            echo "2. Ensure pip has permissions to install. You may need to run:"
            echo "   $BACKEND_DIR/venv/bin/pip install -r $BACKEND_DIR/requirements.txt"
            echo "   manually to inspect full log outputs."
            echo "-------------------------------------------------------------"
            exit 1
        fi
    fi
fi

cd "$BACKEND_DIR"

# Start Flask in background
echo "[1/3] Starting Flask server on $URL ..."
nohup venv/bin/python app.py > /tmp/devhunt.log 2>&1 &
SERVER_PID=$!
echo "      Server PID: $SERVER_PID"

# Wait for server
echo "[2/3] Waiting for server to start..."
sleep 3

# Check server is up
if ! curl -s --max-time 2 "$URL" > /dev/null; then
    echo "[WARN] Server may still be starting..."
fi

# Detect and open browser
echo "[3/3] Opening browser..."

open_browser() {
    local url="$1"
    # macOS
    if command -v open &>/dev/null; then
        open "$url"; return
    fi
    # Linux — try common browsers
    for browser in google-chrome chromium-browser chromium firefox xdg-open; do
        if command -v "$browser" &>/dev/null; then
            "$browser" "$url" &>/dev/null & return
        fi
    done
    echo "[INFO] Could not detect browser. Open manually: $url"
}

open_browser "$URL"

echo ""
echo "  Server running at: $URL"
echo "  Logs page:         $URL/logs"
echo "  Server log:        /tmp/devhunt.log"
echo "  To stop:           kill $SERVER_PID"
echo ""
