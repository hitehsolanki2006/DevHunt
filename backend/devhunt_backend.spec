# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for DevHunt Flask backend
# Run from e:\git-projects\DevHunt\backend\
# Command: pyinstaller devhunt_backend.spec

import os

block_cipher = None

# Collect all data files the backend needs
added_files = [
    # React build output (the SPA)
    ('../frontend-src/dist', 'frontend-src/dist'),
    # Backend data directory (DB, config)
    ('data', 'data'),
    # Core modules
    ('core', 'core'),
    # Config
    ('config.py', '.'),
    # Local announcements
    ('../notifications.json', '.'),
]

a = Analysis(
    ['app.py'],
    pathex=[os.path.abspath('.')],
    binaries=[],
    datas=added_files,
    hiddenimports=[
        # Flask + ecosystem
        'flask', 'flask_cors', 'werkzeug', 'werkzeug.routing', 'werkzeug.exceptions',
        'werkzeug.middleware.proxy_fix', 'jinja2', 'markupsafe', 'itsdangerous', 'click',
        # Google AI
        'google.generativeai', 'google.genai', 'google.auth', 'google.auth.transport',
        'google.protobuf',
        # PDF / doc processing
        'PyPDF2', 'fitz', 'pymupdf', 'pdfminer',
        # Web scraping
        'bs4', 'requests', 'urllib3', 'certifi', 'charset_normalizer',
        # Data
        'pandas', 'openpyxl', 'PIL', 'PIL.Image',
        # CV and OCR (headless)
        'cv2',
        # Crypto
        'cryptography', 'cryptography.hazmat', 'cryptography.fernet',
        # Misc
        'schedule', 'dotenv', 'sqlite3', 'json', 'uuid', 'keyring',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'torch', 'tensorflow', 'transformers', 'scipy', 'sklearn', 
        'nvidia', 'triton', 'mkl', 'googleapiclient', 'tkinter', 
        'test', 'unittest', 'jupyter', 'ipython'
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='devhunt_backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,   # no console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='devhunt_backend',
)
