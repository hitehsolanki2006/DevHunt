# 🗺️ DevHunt Development Roadmap: Voice, Agents, & MCP

This document details the architectural design and implementation plans for extending DevHunt into an interactive, voice-controlled, agentic local assistant using custom Python tools and the **Model Context Protocol (MCP)**.

---

## 🎙️ Phase 1: Multilingual Voice Control

Enable hands-free typing and natural voice inputs in English, Hindi, Gujarati, and Marathi directly from the dashboard.

### Core Architecture
We will use the browser-native **Web Speech API** (`SpeechRecognition`). It provides:
1.  **Zero Server Load**: All audio-to-text processing is handled by the client browser engine.
2.  **Instant Transcription**: Live previews of words as they are spoken.
3.  **Broad Language Support**: Uses exact region-specific language locales:
    *   **English (India)**: `en-IN`
    *   **Hindi (India)**: `hi-IN`
    *   **Gujarati (India)**: `gu-IN`
    *   **Marathi (India)**: `mr-IN`

### UI/UX Integration
*   Add a **🎙️ Microphone button** inside the chat input bar.
*   Pulsing animation when the microphone is active (listening mode).
*   Add a **Language dropdown** allowing users to switch the spoken language instantly.

---

## 🤖 Phase 2: Agentic Tool Core (Local System Commands)

Allow the DevHunt backend to perform physical, local actions on your machine in response to user requests (either typed or spoken).

### Target Operations
1.  **Application Launchers** ("open Chrome", "open Spotify"):
    *   Use Python's `webbrowser` and `subprocess` to launch default system applications or open web addresses.
2.  **Audio & Sentiment Feedback** ("play music", "I feel sad"):
    *   Use local sound triggers (such as `pygame.mixer` or HTML5 audio playback) to trigger favorite playlists or sounds.
    *   Local developer joke repository for quick humor replies.
3.  **Local Email Automation** ("draft an email", "read my mail"):
    *   Configure secure SMTP (sending) and IMAP (receiving) credential storage in DevHunt's settings.
    *   Build tools to query unread emails, generate context-aware draft files, and send emails directly.

### Integration Pipeline
We will expose these custom Python functions to the Gemini API using **Function Calling (Tools)**. The LLM will automatically output a JSON payload calling these tools if it determines the user has a system command intent (e.g. *“Open Chrome browser”*).

---

## 🔌 Phase 3: Model Context Protocol (MCP) Integration

Integrate standard **Model Context Protocol (MCP)** configurations to support connecting third-party tool ecosystems.

```
+------------------+         JSON-RPC         +-------------------+
|  DevHunt Client  | <----------------------> |    MCP Server     |
| (Flask Backend)  |     (Standard Protocol)  | (Git, Filesystem) |
+------------------+                          +-------------------+
```

### Protocol Advantages
*   **Decoupled Services**: Instead of coding every tool into the DevHunt core, developers can spin up external, sandboxed MCP servers.
*   **Shared Standard**: Dynamically link official MCP servers (such as Filesystem tools, Postgres query executors, or Github issue managers) using a unified `mcp_config.json` configuration file.
