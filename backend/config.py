import os
import sys

# Base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Check if running inside a packaged PyInstaller executable (frozen)
IS_PACKAGED = getattr(sys, 'frozen', False)

if IS_PACKAGED:
    # Use standard AppData folder for user data to avoid write permission issues in Program Files
    app_data_root = os.environ.get('LOCALAPPDATA') or os.environ.get('APPDATA') or os.path.expanduser('~')
    BASE_DATA_DIR = os.path.join(app_data_root, 'DevHunt')
else:
    BASE_DATA_DIR = BASE_DIR

# Data directory
DATA_DIR = os.path.join(BASE_DATA_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# Redirect stdout and stderr to a file in packaged mode for debugging
if IS_PACKAGED:
    log_file_path = os.path.join(DATA_DIR, 'devhunt_backend_debug.log')
    try:
        sys.stdout = open(log_file_path, 'a', encoding='utf-8', buffering=1)
        sys.stderr = sys.stdout
        import datetime
        print(f"\n--- Backend started at {datetime.datetime.now()} with args {sys.argv} ---")
    except Exception as e:
        pass

# Uploads directory
UPLOADS_DIR = os.path.join(BASE_DATA_DIR, 'uploads')
os.makedirs(UPLOADS_DIR, exist_ok=True)

# File paths
DB_PATH = os.path.join(DATA_DIR, 'devhunt.db')
KEYS_PATH = os.path.join(DATA_DIR, 'keys.json')
PROFILE_PATH = os.path.join(DATA_DIR, 'profile.json')
SETTINGS_PATH = os.path.join(DATA_DIR, 'settings.json')
LEARNING_PATH_JSON = os.path.join(DATA_DIR, 'learning_path.json')

# Key Manager settings
COOLING_DOWN_PERIOD = 60  # seconds

# Encryption key (used to secure stored API keys locally)
ENCRYPTION_KEY_FILE = os.path.join(DATA_DIR, '.secret')
if not os.path.exists(ENCRYPTION_KEY_FILE):
    from cryptography.fernet import Fernet
    secret = Fernet.generate_key()
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
    mode = 0o600
    with os.fdopen(os.open(ENCRYPTION_KEY_FILE, flags, mode), 'wb') as f:
        f.write(secret)
else:
    with open(ENCRYPTION_KEY_FILE, 'rb') as f:
        secret = f.read()

ENCRYPTION_SECRET = secret
