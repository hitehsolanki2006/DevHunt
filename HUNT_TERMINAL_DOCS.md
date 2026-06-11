# DevHunt Terminal Documentation Guide

Welcome to the **Hunt Node Terminal** documentation. The Hunt Terminal is a terminal emulator integrated directly into the DevHunt system dashboard that allows developers and administrators to perform network diagnostics, security inspections, local repository workspace tasks, and directory file operations.

To ensure safety and compatibility, all commands are securely routed through Python standard libraries and executed dynamically inside a safe execution sandbox.

---

## ⚡ Interactive Controls

- **Pre-fixed execution**: Every command must start with `hunt` (e.g., `hunt pwd`, `hunt neofetch`), with the exception of the standard `clear` helper.
- **Tab Autocompletion**: Press `Tab` at any point to view matched commands. Pressing `Tab` on an empty line displays a catalog of all possible commands.
- **Command History**: Press the `Up Arrow` and `Down Arrow` keys to navigate through previously executed commands in the current session.
- **Contextual Help**: Add `-h` or `--help` after any command (e.g., `hunt ls --help` or `hunt ping -h`) to view specific flags and usage examples. Alternatively, run `hunt help <command>`.

---

## 🖥️ Cross-Platform Unified Execution

All commands behave **identically** on both Windows and Linux hosts:
- **Filesystem separation**: Paths are dynamically resolved relative to the terminal session state.
- **Cross-Platform Ping**: Instead of raw ICMP ping calls (which vary between platforms and require system administrator/root permissions), `hunt ping` uses connection handshakes via standard TCP sockets. It checks connectivity and measures latency without raising privileges.
- **Subprocess Security**: Subprocess execution for utilities like `git` and `python` uses explicit parameter arrays (`shlex.split`) without activating shell execution environments (`shell=False`), preventing command injection vulnerabilities.

---

## 📖 Command Directory Reference

### 1. Workspace & Filesystem Operations

#### `hunt pwd`
- **Description**: Prints the current absolute directory context.
- **Usage**: `hunt pwd`

#### `hunt ls`
- **Description**: Lists files and folders in the current path. Directories are colored cyan, script nodes are green.
- **Usage**: `hunt ls [options] [path]`
- **Flags**:
  - `-a` : Shows hidden nodes (files starting with `.`).
  - `-l` : Shows long format details including file permissions, sizes in bytes, and last modified times.
- **Example**: `hunt ls -la ./backend`

#### `hunt cd`
- **Description**: Navigates the working folder context.
- **Usage**: `hunt cd [path]`
- **Example**: `hunt cd ../frontend`

#### `hunt cat`
- **Description**: Prints the contents of a text file inside the terminal window. Large files are safely truncated to prevent UI overflow.
- **Usage**: `hunt cat <filename>`
- **Example**: `hunt cat requirements.txt`

#### `hunt mkdir`
- **Description**: Creates a directory.
- **Usage**: `hunt mkdir <directory_name>`
- **Example**: `hunt mkdir test_module`

#### `hunt rm`
- **Description**: Deletes a file or directory.
- **Usage**: `hunt rm [options] <path>`
- **Flags**:
  - `-r` : Recursive directory removal (required for folders).
- **Example**: `hunt rm -r test_module`

---

### 2. Network & Security Analyzers

#### `hunt myip`
- **Description**: Performs lookup of public network coordinates, including geo-location, ISP carrier, organization, and coordinates.
- **Usage**: `hunt myip`

#### `hunt ping`
- **Description**: Evaluates connectivity latency by establishing TCP handshakes.
- **Usage**: `hunt ping <host> [options]`
- **Flags**:
  - `-c <count>` : Number of tests to transmit (default: 4).
  - `-p <port>`  : Target port to measure (default: 80).
- **Example**: `hunt ping google.com -c 3 -p 443`

#### `hunt dns` (or `hunt dig`)
- **Description**: Resolves DNS records using secure DNS-over-HTTPS.
- **Usage**: `hunt dns <domain> [type]`
- **Record Types**: `A`, `AAAA`, `MX`, `TXT`, `NS`, `CNAME`
- **Example**: `hunt dns github.com MX`

#### `hunt whois`
- **Description**: Performs a socket lookup on port 43 to retrieve public domain registration and expiration details.
- **Usage**: `hunt whois <domain>`
- **Example**: `hunt whois verisign.com`

#### `hunt ssl`
- **Description**: Establishes a TLS connection to check certificates, validation status, key strength, and days remaining until expiration.
- **Usage**: `hunt ssl <host>`
- **Example**: `hunt ssl google.com`

#### `hunt headers`
- **Description**: Fetches website HTTP headers and evaluates security configuration parameters (CSP, HSTS, etc.).
- **Usage**: `hunt headers <url>`
- **Example**: `hunt headers https://github.com`

#### `hunt port`
- **Description**: Scans a specific TCP port to see if it is open and listening.
- **Usage**: `hunt port <host> <port>`
- **Example**: `hunt port localhost 5000`

#### `hunt portscan`
- **Description**: Scans multiple TCP ports on a host to identify active listening services.
- **Usage**: `hunt portscan <host> [options]`
- **Flags**:
  - `-r <range>`: Scan range of ports (e.g. `80-443` or `common` for standard web/devops ports).
  - `-t <timeout>`: Latency connection timeout in seconds per port (default: `0.5`).
- **Example**: `hunt portscan google.com -r 80-443`

#### `hunt localports`
- **Description**: Lists active network sockets, listening ports, and status on the host computer running the DevHunt node.
- **Usage**: `hunt localports [options]`
- **Flags**:
  - `-a`: Show all active connection sockets (including established and closed waiting).
- **Example**: `hunt localports -a`

#### `hunt trace`
- **Description**: Simulates the hops taken by a packet to reach its target destination.
- **Usage**: `hunt trace <host>`

#### `hunt subdomains`
- **Description**: Queries public certificate transparency logs to find subdomains.
- **Usage**: `hunt subdomains <domain>`

---

### 3. Developer Utilities

#### `hunt git`
- **Description**: Executes git commands inside the local workspace repository.
- **Usage**: `hunt git <arguments>`
- **Example**: `hunt git status` or `hunt git log -n 5`

#### `hunt python`
- **Description**: Executes local Python statements and returns standard output.
- **Usage**: `hunt python -c "<code>"`
- **Example**: `hunt python -c "import sys; print(sys.version)"`

#### `hunt calc`
- **Description**: Safely evaluates mathematical equations using Python's math library. Supported math operations: `sin`, `cos`, `tan`, `sqrt`, `log`, `pow`, etc.
- **Usage**: `hunt calc <expression>`
- **Example**: `hunt calc "sqrt(64) + pow(2, 8)"`

#### `hunt neofetch`
- **Description**: Renders system configurations alongside a DevHunt ASCII logo.
- **Usage**: `hunt neofetch`
