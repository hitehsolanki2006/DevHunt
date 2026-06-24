# Contributing to DevHunt 🌌

Thank you for your interest in contributing to **DevHunt**! We welcome all contributions—from bug fixes and feature implementations to documentation updates, retro canvas games, and theme designs.

By contributing to this project, you help build a premium, local-first workspace that puts developer privacy first.

---

## 🛠️ Local Development Setup

DevHunt is built using a hybrid stack:
*   **Frontend**: React (Vite) + Tailwind CSS (when requested, otherwise Vanilla CSS variables) + Tauri v2
*   **Backend sidecar**: Python Flask + SQLite + Gemini Generative AI SDK
*   **Desktop wrapper**: Rust (Tauri core shell)

Here is how to set up the developer environment on your machine.

### Prerequisites
*   **Python**: `3.10` or higher
*   **Node.js**: `18.x` or higher (with `npm`)
*   **Rust**: Stable toolchain (if compiling the desktop shell installer)

---

### Step 1: Fork and Clone the Repository
1.  Fork the repository on GitHub: [hitehsolanki2006/DevHunt](https://github.com/hitehsolanki2006/DevHunt)
2.  Clone your fork locally:
    ```bash
    git clone https://github.com/YOUR_USERNAME/DevHunt.git
    cd DevHunt
    ```

---

### Step 2: Setup the Python Backend
The backend serves the database, SQLite memory consolidation, RAG document pipelines, and native terminal execution.

1.  Navigate to the `backend/` folder:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    ```
3.  Activate the virtual environment:
    *   **Windows**: `.\venv\Scripts\activate`
    *   **macOS/Linux**: `source venv/bin/activate`
4.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5.  Start the Flask server (default port `1225` with a security bypass token):
    ```bash
    python app.py --port 1225 --token dev_token
    ```

---

### Step 3: Setup the React Frontend
The frontend runs as a Vite web application proxying backend endpoints during development.

1.  Open a new terminal window and navigate to `frontend-src/`:
    ```bash
    cd frontend-src
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the Vite development server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:5173` in your browser. All requests to `/api/*` are automatically proxied to your Python Flask server running on port `1225`!

---

### Step 4: Setup the Tauri Desktop Shell (Optional)
If you want to compile or debug the Tauri native window shell:

1.  Ensure you have the Rust compiler installed ([rustup.rs](https://rustup.rs/)).
2.  Under `frontend-src/`, start Tauri in developer mode:
    ```bash
    npm run tauri dev
    ```
    This opens a native window pointing directly to your hot-reloaded Vite React instance.

---

## 🤝 How to Submit a Pull Request (PR)

1.  **Find an Issue**: Browse our [Good First Issues](https://github.com/hitehsolanki2006/DevHunt/issues) list or create an issue explaining a bug/feature you'd like to work on.
2.  **Create a Branch**: Create a branch off `main` with a descriptive name:
    ```bash
    git checkout -b feature/your-awesome-feature
    # OR
    git checkout -b bugfix/fix-some-broken-bug
    ```
3.  **Implement & Test**: Write clean, modular React components or robust Python endpoints. Make sure your changes compile and don't break existing panels.
4.  **Commit**: Keep commit messages short, descriptive, and prefix them appropriately (e.g., `feat(frontend): add copy button for RAG responses`, `fix(backend): patch regex match on windows terminal paths`).
5.  **Submit PR**: Push your branch to your fork and submit a Pull Request to DevHunt's `main` branch. Provide a clear description of your changes and link the relevant issue.

---

## 🎨 Styling & Design Guidelines

*   **Premium Theme Aesthetics**: DevHunt uses a customized theme system supporting Slate, Neon, Light, and Devil styles. Avoid using default visual assets (like raw red or blue borders). Utilize the harmonized HSL variables defined in `src/index.css`.
*   **Typography**: Stick to the Google Fonts integrated into settings.
*   **No Placeholders**: Always write production-ready code with complete logic.

If you have questions, feel free to open a discussion or contact the maintainers. Let's make DevHunt the ultimate local developer workspace! 🌌
