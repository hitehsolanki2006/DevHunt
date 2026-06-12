# Module: core.terminal_engine (TerminalEngine)

The `TerminalEngine` class operates the Hunt Terminal CLI. It processes command strings starting with `hunt`, handles argument tokenization, parses and formats outputs with custom ANSI style helpers, and executes specific command handlers.

---

## Core Execution Pipeline

### `parse_arguments`
* **Signature**: `parse_arguments(command_str: str) -> list[str]`
* **Description**: Safely splits raw terminal command strings into arguments using shlex shell-like tokenization to parse quotes and escape sequences correctly.
* **Parameters**:
  - `command_str` (`str`): The raw input command line.
* **Returns**:
  - `list[str]`: A list of command tokens.

---

### `execute`
* **Signature**: `execute(cmd_line: str, current_dir: str = None) -> tuple[str, str]`
* **Description**: Evaluates command tokens. Ensures commands start with `hunt` (with basic exceptions like `clear`). Checks for help flags (`-h` or `--help`) and dynamically routes the command to its corresponding handler (e.g. `cmd_ls`). Returns formatted output text and the updated current working directory.
* **Parameters**:
  - `cmd_line` (`str`): The raw terminal input command.
  - `current_dir` (`str`, optional): Working directory context of the active terminal tab.
* **Returns**:
  - `tuple[str, str]`: Formatted response HTML text and the new/updated working directory context.

---

### `get_command_help`
* **Signature**: `get_command_help(cmd: str) -> str`
* **Description**: Retrieves syntax, descriptions, flags, and usage examples for any command (e.g. returns help details for `ls` when a user executes `hunt ls -h`).
* **Parameters**:
  - `cmd` (`str`): The command name.
* **Returns**:
  - `str`: Help description.

---

## Formatting Helpers
The engine formats terminal output inside HTML spans with specific CSS styles:
- `format_green(text)`: Renders text in green (`ansi-green`).
- `format_cyan(text)`: Renders text in cyan (`ansi-cyan`).
- `format_yellow(text)`: Renders text in yellow (`ansi-yellow`).
- `format_red(text)`: Renders text in red (`ansi-red`).
- `format_muted(text)`: Renders text in gray (`ansi-muted`).
- `format_bold(text)`: Wraps text in `<b>` tags.

---

## Command Handlers
Every command has a corresponding method named `cmd_<sub_command>` with signature `cmd_xxx(args: list[str], current_dir: str) -> tuple[str, str]`:

1. **`cmd_help`**: Displays the main CLI help menu or specific help for a target subcommand.
2. **`cmd_neofetch`**: Displays system state, hardware specifications, active folder path, memory statistics, and the ASCII logo.
3. **`cmd_pwd`**: Prints the current absolute working directory.
4. **`cmd_ls`**: Cross-platform list directory parser supporting long listings (`-l`) and hidden files (`-a`).
5. **`cmd_cd`**: Navigates the active session's folder context (warns if moving outside workspace).
6. **`cmd_cat`**: Displays text file content (safely truncates large files over 5000 characters).
7. **`cmd_mkdir`**: Creates a new directory path.
8. **`cmd_rm`**: Deletes a file or directory tree (requires `-r` recursive flag for folders).
9. **`cmd_myip`**: Fetches external network IP, location coordinates, ISP, and timezone data via remote geolocation APIs.
10. **`cmd_ping`**: Measures TCP latency handshake latency to a target host on port 80/443 (simulates ping over TCP).
11. **`cmd_dns`** / **`cmd_dig`**: Securely queries remote DNS records (`A`, `MX`, `TXT`, `AAAA`, `NS`, `CNAME`).
12. **`cmd_whois`**: Performs WHOIS socket queries against registrar databases via port 43.
13. **`cmd_headers`**: Evaluates HTTP response headers and audits security status.
14. **`cmd_ssl`**: Validates certificate chain details, expiration dates, and cipher strength.
15. **`cmd_port`**: Audits whether a remote port is listening.
16. **`cmd_portscan`**: Performs parallel scans on common port lists or ranges.
17. **`cmd_localports`**: Audits active TCP sockets on the host.
18. **`cmd_trace`**: Simulates geolocation hop routing to a remote server.
19. **`cmd_subdomains`**: Performs subdomain scans passively.
20. **`cmd_git`**: Executes local system git commands in the workspace safely.
21. **`cmd_python`**: Runs standalone local Python expressions inside the venv context.
22. **`cmd_calc`**: Evaluates math equations securely.
23. **`cmd_quest`**: Lists, updates, completes, or deletes tasks from the Quest Board.
24. **`cmd_keys`**: Views, adds, deletes, or tests Gemini API key configurations.
25. **`cmd_memory`**: Views, refines, or clears AI long-term consolidated memories.
26. **`cmd_backup`**: Performs full backup exports.
27. **`cmd_history`**: Displays chat logs for debugging.
28. **`cmd_notifications`**: Displays announcements and warning logs.
