import os
import sys
import platform
import time
import socket
import ssl
import shlex
import requests
import subprocess
import datetime
import math
from bs4 import BeautifulSoup

class TerminalEngine:
    def __init__(self):
        self.os_type = platform.system()
        # Default starting directory is the project workspace root
        self.workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    def parse_arguments(self, command_str):
        """Safely split command string into arguments using shell-like parsing."""
        try:
            return shlex.split(command_str)
        except Exception:
            return command_str.split()

    def format_green(self, text):
        return f'<span class="ansi-green">{text}</span>'

    def format_cyan(self, text):
        return f'<span class="ansi-cyan">{text}</span>'

    def format_yellow(self, text):
        return f'<span class="ansi-yellow">{text}</span>'

    def format_red(self, text):
        return f'<span class="ansi-red">{text}</span>'

    def format_muted(self, text):
        return f'<span class="ansi-muted">{text}</span>'

    def format_bold(self, text):
        return f'<b>{text}</b>'

    def get_command_help(self, cmd):
        """Return specific usage instructions and available flags for a command."""
        helps = {
            "help": (
                "Usage: hunt help [command]\n\n"
                "Lists all available terminal commands. If a command name is provided,\n"
                "shows detailed syntax and options for that specific command."
            ),
            "neofetch": (
                "Usage: hunt neofetch\n\n"
                "Displays information about the active DevHunt node, software versions,\n"
                "local OS details, and network state with an ASCII logo."
            ),
            "ls": (
                "Usage: hunt ls [options] [path]\n\n"
                "Lists directory contents in a cross-platform format.\n\n"
                "Options:\n"
                "  -a          Show hidden files (filenames starting with '.')\n"
                "  -l          Display detailed listing (type, size, last modified)"
            ),
            "cd": (
                "Usage: hunt cd [path]\n\n"
                "Changes the working directory of the terminal session."
            ),
            "pwd": (
                "Usage: hunt pwd\n\n"
                "Prints the current absolute directory path."
            ),
            "cat": (
                "Usage: hunt cat <filename>\n\n"
                "Displays the text content of a file in the terminal workspace."
            ),
            "mkdir": (
                "Usage: hunt mkdir <directory_name>\n\n"
                "Creates a new directory folder in the active directory."
            ),
            "rm": (
                "Usage: hunt rm [options] <path>\n\n"
                "Deletes a file or directory.\n\n"
                "Options:\n"
                "  -r          Recursive deletion (required to remove directories)"
            ),
            "ping": (
                "Usage: hunt ping <host> [options]\n\n"
                "Checks connectivity to a host by measuring TCP handshake latency.\n\n"
                "Options:\n"
                "  -c <count>  Number of tests to perform (default: 4)\n"
                "  -p <port>   Target TCP port (default: 80 for HTTP, 443 for HTTPS)"
            ),
            "dns": (
                "Usage: hunt dns <domain> [type]\n\n"
                "Retrieves DNS records for a domain using secure DNS-over-HTTPS.\n\n"
                "Types:\n"
                "  A, AAAA, MX, TXT, NS, CNAME (default: A)"
            ),
            "dig": (
                "Usage: hunt dig <domain> [type]\n\n"
                "Alias for 'hunt dns'. Queries DNS records for a domain."
            ),
            "whois": (
                "Usage: hunt whois <domain>\n\n"
                "Queries public registrar databases to find registration ownership details."
            ),
            "headers": (
                "Usage: hunt headers <url>\n\n"
                "Fetches HTTP response headers from a web address and verifies\n"
                "critical security headers (e.g. CSP, HSTS, X-Frame-Options)."
            ),
            "ssl": (
                "Usage: hunt ssl <host>\n\n"
                "Establishes a TLS connection to check the certificate chain, expiration,\n"
                "subject info, and crypto strength."
            ),
            "port": (
                "Usage: hunt port <host> <port>\n\n"
                "Checks if a specific TCP port is open and listening on a target host."
            ),
            "myip": (
                "Usage: hunt myip\n\n"
                "Retrieves public IP details, location, ISP coordinates, and organization."
            ),
            "trace": (
                "Usage: hunt trace <host>\n\n"
                "Simulates network route tracking to a destination, geolocating hop steps."
            ),
            "subdomains": (
                "Usage: hunt subdomains <domain>\n\n"
                "Scans for active subdomains of a target domain passively using a DNS checklist."
            ),
            "git": (
                "Usage: hunt git <arguments>\n\n"
                "Runs native git commands in the current workspace (e.g. hunt git status,\n"
                "hunt git log, hunt git branch)."
            ),
            "python": (
                "Usage: hunt python -c \"<code>\"\n\n"
                "Runs a local Python statement and returns standard output.\n\n"
                "Example:\n"
                "  hunt python -c \"print(50 * 20)\""
            ),
            "calc": (
                "Usage: hunt calc <expression>\n\n"
                "Evaluates math expressions safely.\n\n"
                "Example:\n"
                "  hunt calc \"sqrt(144) + log2(256)\""
            ),
            "localports": (
                "Usage: hunt localports [options]\n\n"
                "Lists local active network sockets, listening ports, and status.\n\n"
                "Options:\n"
                "  -a          Show all connections (established and listening)\n"
                "  -l          Show only listening ports (default behavior)"
            ),
            "portscan": (
                "Usage: hunt portscan <host> [options]\n\n"
                "Scans multiple TCP ports on a host to identify open services.\n\n"
                "Options:\n"
                "  -r <range>  Port range to scan (e.g. 20-100 or 'common') (default: common)\n"
                "  -t <timeout> Latency timeout per port in seconds (default: 0.5)"
            ),
            "quest": (
                "Usage: hunt quest [add <title> [priority] [desc] | done <id> | rm <id>]\n\n"
                "Manages your Quest Board todos directly from terminal.\n"
                "Running 'hunt quest' alone lists all active quests."
            ),
            "keys": (
                "Usage: hunt keys [list | add <key> [label] | rm <id> | test <id>]\n\n"
                "Manages the Gemini API key pool for active nodes."
            ),
            "memory": (
                "Usage: hunt memory [refine | clear]\n\n"
                "Views and operates AI consolidated memory facts."
            ),
            "backup": (
                "Usage: hunt backup export\n\n"
                "Exports full data structures into a local JSON backup."
            ),
            "history": (
                "Usage: hunt history [limit]\n\n"
                "Prints raw logs of the active conversation session."
            ),
            "notifications": (
                "Usage: hunt notifications [list | read [all | <id>] | detail <id>]\n\n"
                "Manages system messages, remote announcements, and warnings."
            )
        }
        return list(helps.get(cmd, f"No detailed help available for '{cmd}'.").split("\n")) if isinstance(helps.get(cmd), list) else helps.get(cmd, f"No detailed help available for '{cmd}'.")

    def execute(self, cmd_line, current_dir=None):
        """Execute the command and return (output_text, updated_cwd)."""
        if not current_dir or not os.path.exists(current_dir):
            current_dir = self.workspace_root
            
        args = self.parse_arguments(cmd_line)
        if not args:
            return "", current_dir

        # The terminal requires commands to start with 'hunt'
        # With exceptions for general terminal clear or history helpers
        first_token = args[0].lower()
        if first_token == "clear":
            return "CLEAR_SIGNAL", current_dir
        
        if first_token != "hunt":
            return self.format_red("Error: Command must start with 'hunt' (type 'hunt help' for info)."), current_dir

        if len(args) < 2:
            return self.cmd_help([], current_dir)

        sub_cmd = args[1].lower()
        sub_args = args[2:]

        # Check for help flags in sub-arguments (e.g., hunt ls --help)
        if "--help" in sub_args or "-h" in sub_args:
            return self.get_command_help(sub_cmd), current_dir

        # Route to specific command handlers
        handler = getattr(self, f"cmd_{sub_cmd}", None)
        if handler:
            try:
                return handler(sub_args, current_dir)
            except Exception as e:
                return self.format_red(f"Execution error: {str(e)}"), current_dir
        else:
            return self.format_red(f"Error: Unknown hunt command '{sub_cmd}'. Type 'hunt help' for a list of commands."), current_dir

    # ── COMMAND HANDLERS ──────────────────────────────────────────────────────

    def cmd_help(self, args, current_dir):
        if args:
            target = args[0].lower()
            return self.get_command_help(target), current_dir

        help_menu = (
            f"{self.format_bold(self.format_cyan('DevHunt Terminal Node v1.0'))}\n"
            f"Type a command starting with {self.format_green('hunt')} to begin. Append {self.format_yellow('-h')} or {self.format_yellow('--help')} to any command for options.\n\n"
            f"{self.format_bold('AVAILABLE SYSTEM & FILE OPERATIONS:')}\n"
            f"  {self.format_green('hunt neofetch')}           - Show active node system details.\n"
            f"  {self.format_green('hunt pwd')}                - Print working directory.\n"
            f"  {self.format_green('hunt ls')}                 - List files in folder ({self.format_yellow('-a')}, {self.format_yellow('-l')} flags).\n"
            f"  {self.format_green('hunt cd <path>')}          - Navigate folder directory.\n"
            f"  {self.format_green('hunt cat <file>')}          - Print file content.\n"
            f"  {self.format_green('hunt mkdir <dir>')}         - Create new folder.\n"
            f"  {self.format_green('hunt rm <file>')}           - Delete file or folder ({self.format_yellow('-r')} recursive).\n\n"
            f"{self.format_bold('AVAILABLE NETWORK & SECURITY ANALYZERS:')}\n"
            f"  {self.format_green('hunt myip')}               - Fetch public IP credentials & geo-location.\n"
            f"  {self.format_green('hunt ping <host>')}        - Test connection latency ({self.format_yellow('-c')} count, {self.format_yellow('-p')} port).\n"
            f"  {self.format_green('hunt dns <domain>')}       - Retrieve DNS records (MX, A, TXT, NS).\n"
            f"  {self.format_green('hunt whois <domain>')}     - Retrieve domain registration details.\n"
            f"  {self.format_green('hunt ssl <host>')}         - Verify SSL/TLS validity and cert details.\n"
            f"  {self.format_green('hunt headers <url>')}      - Check HTTP headers and security parameters.\n"
            f"  {self.format_green('hunt port <host> <port>')} - Check if a remote port is listening.\n"
            f"  {self.format_green('hunt portscan <host>')}    - Multi-port scanner ({self.format_yellow('-r')} range, {self.format_yellow('-t')} timeout).\n"
            f"  {self.format_green('hunt localports')}          - Show local active ports ({self.format_yellow('-a')} all).\n"
            f"  {self.format_green('hunt trace <host>')}       - Simulate path routing to target.\n"
            f"  {self.format_green('hunt subdomains <dom>')}   - Discover active subdomains passively.\n\n"
            f"{self.format_bold('LOCAL DEVELOPMENT TOOLS:')}\n"
            f"  {self.format_green('hunt git <args>')}          - Run git commands securely in workspace.\n"
            f"  {self.format_green('hunt python -c <code>')}   - Run Python code execution.\n"
            f"  {self.format_green('hunt calc <expr>')}         - Safe math evaluation utility.\n\n"
            f"{self.format_bold('DEVHUNT CORE DATA CLIENTS:')}\n"
            f"  {self.format_green('hunt quest')}               - List active Quest Board todos.\n"
            f"  {self.format_green('hunt keys')}                - List registered API key status.\n"
            f"  {self.format_green('hunt memory')}              - View long-term AI memories.\n"
            f"  {self.format_green('hunt backup')}              - Run full system backup exports.\n"
            f"  {self.format_green('hunt history')}              - Print raw logs of chat session.\n"
            f"  {self.format_green('hunt notifications')}        - Manage system alerts and announcements.\n"
        )
        return help_menu, current_dir

    def cmd_neofetch(self, args, current_dir):
        # Gather neofetch info
        uname = platform.uname()
        cpu_count = os.cpu_count()
        python_ver = sys.version.split()[0]
        
        # Ascii Art
        ascii_art = (
            "      /\\_/\\\n"
            "     ( o.o )\n"
            "      > ^ <\n"
            "    /  | |  \\\n"
            "   (  |_|_|  )\n"
            "    \\_______/\n"
            "   DEVHUNT NODE"
        )
        
        # System memory details (rough fallback if psutil is not available)
        mem_info = "N/A"
        try:
            if self.os_type == "Windows":
                # Call wmic for memory details
                out = subprocess.check_output("wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value", shell=True).decode()
                lines = [l.strip() for l in out.splitlines() if "=" in l]
                kvs = dict(l.split("=") for l in lines)
                total = int(kvs.get("TotalVisibleMemorySize", 0)) // 1024
                free = int(kvs.get("FreePhysicalMemory", 0)) // 1024
                mem_info = f"{total - free}MB / {total}MB ({int((total-free)/total * 100)}%)"
            else:
                # Read /proc/meminfo
                with open("/proc/meminfo") as f:
                    lines = f.readlines()
                total = int(lines[0].split()[1]) // 1024
                free = int(lines[1].split()[1]) // 1024
                mem_info = f"{total - free}MB / {total}MB"
        except Exception:
            pass

        info_lines = [
            f"{self.format_cyan('guest')}@{self.format_cyan('devhunt')}",
            "-------------------",
            f"OS: {self.format_yellow(self.os_type)} {uname.release} ({uname.machine})",
            f"Kernel: {uname.version[:40]}...",
            f"Uptime: Running active node",
            f"Shell: Hunt Terminal v1.0",
            f"CPU: {uname.processor or 'Local processor'} ({cpu_count} Cores)",
            f"Memory: {mem_info}",
            f"Python Runtime: {self.format_green(python_ver)}",
            f"Workspace Path: {self.format_muted(current_dir)}",
        ]
        
        # Combine ascii and info
        art_lines = ascii_art.splitlines()
        max_art_len = max(len(l) for l in art_lines)
        combined = []
        for i in range(max(len(art_lines), len(info_lines))):
            art = art_lines[i] if i < len(art_lines) else ""
            info = info_lines[i] if i < len(info_lines) else ""
            # Padding
            art_padded = art.ljust(max_art_len + 4)
            combined.append(f"{self.format_green(art_padded)}{info}")
            
        return "\n".join(combined), current_dir

    def cmd_pwd(self, args, current_dir):
        return current_dir, current_dir

    def cmd_ls(self, args, current_dir):
        show_all = False
        long_format = False
        target_path = current_dir

        # Parse flags manually
        remaining_args = []
        for a in args:
            if a.startswith("-"):
                if "a" in a:
                    show_all = True
                if "l" in a:
                    long_format = True
            else:
                remaining_args.append(a)

        if remaining_args:
            target_path = os.path.abspath(os.path.join(current_dir, remaining_args[0]))
            if not os.path.exists(target_path):
                return self.format_red(f"ls: cannot access '{remaining_args[0]}': No such file or directory"), current_dir
            if not os.path.isdir(target_path):
                # Just list the single file
                if long_format:
                    stat = os.stat(target_path)
                    size = stat.st_size
                    mtime = datetime.datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                    return f"-rwxr-xr-x  1 guest staff  {size:8d} {mtime} {os.path.basename(target_path)}", current_dir
                return os.path.basename(target_path), current_dir

        try:
            entries = os.listdir(target_path)
        except Exception as e:
            return self.format_red(f"ls: cannot read directory: {str(e)}"), current_dir

        # Sort entries
        entries.sort(key=lambda x: x.lower())

        if not show_all:
            entries = [e for e in entries if not e.startswith(".")]

        if not entries:
            return "", current_dir

        if not long_format:
            # Inline listing with color indicators
            formatted = []
            for entry in entries:
                full_p = os.path.join(target_path, entry)
                if os.path.isdir(full_p):
                    formatted.append(self.format_cyan(entry + "/"))
                elif entry.endswith((".py", ".sh", ".bat")):
                    formatted.append(self.format_green(entry + "*"))
                else:
                    formatted.append(entry)
            # Split items into grid or columns
            return "   ".join(formatted), current_dir
        else:
            # Detailed listing
            output_lines = []
            for entry in entries:
                full_p = os.path.join(target_path, entry)
                try:
                    stat = os.stat(full_p)
                    size = stat.st_size
                    mtime = datetime.datetime.fromtimestamp(stat.st_mtime).strftime('%b %d %H:%M')
                    is_dir = os.path.isdir(full_p)
                    
                    perm = "drwxr-xr-x" if is_dir else "-rw-r--r--"
                    if entry.endswith((".py", ".sh", ".bat")) and not is_dir:
                        perm = "-rwxr-xr-x"
                        
                    name_colored = self.format_cyan(entry + "/") if is_dir else (self.format_green(entry + "*") if perm == "-rwxr-xr-x" else entry)
                    size_str = f"{size:8d}" if not is_dir else "       -"
                    output_lines.append(f"{perm}  1 guest staff {size_str} {mtime} {name_colored}")
                except Exception:
                    output_lines.append(f"?????????  ? ?     ?             ? {entry}")
            return "\n".join(output_lines), current_dir

    def cmd_cd(self, args, current_dir):
        if not args:
            target = self.workspace_root
        else:
            target = os.path.abspath(os.path.join(current_dir, args[0]))

        if not os.path.exists(target):
            return self.format_red(f"cd: no such file or directory: {args[0]}"), current_dir
        if not os.path.isdir(target):
            return self.format_red(f"cd: not a directory: {args[0]}"), current_dir

        # We allow moving anywhere, but warn if moving outside project root
        warning = ""
        if not target.startswith(self.workspace_root):
            warning = self.format_yellow("[Warning: Navigated outside DevHunt project workspace]\n")

        return f"{warning}Switched session context to {target}", target

    def cmd_cat(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt cat <filename>"), current_dir
        
        target = os.path.abspath(os.path.join(current_dir, args[0]))
        if not os.path.exists(target):
            return self.format_red(f"cat: {args[0]}: No such file or directory"), current_dir
        if os.path.isdir(target):
            return self.format_red(f"cat: {args[0]}: Is a directory"), current_dir

        try:
            with open(target, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            # Limit display to 2000 chars in terminal to prevent overflowing UI
            if len(content) > 5000:
                truncated = content[:5000] + f"\n\n{self.format_yellow('[... File truncated due to size. Viewing first 5000 characters ...]')}"
                return truncated, current_dir
            return content, current_dir
        except Exception as e:
            return self.format_red(f"cat: cannot read file: {str(e)}"), current_dir

    def cmd_mkdir(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt mkdir <directory_name>"), current_dir
        
        target = os.path.abspath(os.path.join(current_dir, args[0]))
        if os.path.exists(target):
            return self.format_red(f"mkdir: cannot create directory '{args[0]}': File exists"), current_dir

        try:
            os.makedirs(target)
            return self.format_green(f"Directory successfully created: {args[0]}"), current_dir
        except Exception as e:
            return self.format_red(f"mkdir: failed to create: {str(e)}"), current_dir

    def cmd_rm(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt rm [options] <path>\nOptions: -r for directory removal"), current_dir

        recursive = False
        remaining = []
        for a in args:
            if a.startswith("-") and "r" in a:
                recursive = True
            else:
                remaining.append(a)

        if not remaining:
            return self.format_red("rm: missing operand"), current_dir

        target = os.path.abspath(os.path.join(current_dir, remaining[0]))
        if not os.path.exists(target):
            return self.format_red(f"rm: cannot remove '{remaining[0]}': No such file or directory"), current_dir

        try:
            if os.path.isdir(target):
                if not recursive:
                    return self.format_red(f"rm: cannot remove '{remaining[0]}': Is a directory (use -r flag)"), current_dir
                import shutil
                shutil.rmtree(target)
                return self.format_green(f"Successfully deleted directory tree: {remaining[0]}"), current_dir
            else:
                os.remove(target)
                return self.format_green(f"Successfully deleted file: {remaining[0]}"), current_dir
        except Exception as e:
            return self.format_red(f"rm: failed to delete: {str(e)}"), current_dir

    # ── NETWORK COMMAND HANDLERS ──────────────────────────────────────────────

    def cmd_myip(self, args, current_dir):
        try:
            # Query ipapi.co (HTTPS JSON)
            r = requests.get("https://ipapi.co/json/", timeout=5, headers={'User-Agent': 'DevHunt-Terminal/1.0'})
            if r.status_code == 200:
                data = r.json()
                output = (
                    f"{self.format_bold('NODE NETWORK COORDINATES:')}\n"
                    f"  Public IP Address : {self.format_green(data.get('ip'))}\n"
                    f"  ISP/Provider      : {self.format_cyan(data.get('org'))} ({data.get('asn')})\n"
                    f"  Location          : {data.get('city')}, {data.get('region')}, {data.get('country_name')}\n"
                    f"  Coordinates       : Lat: {data.get('latitude')}, Lon: {data.get('longitude')}\n"
                    f"  Timezone          : {data.get('timezone')} (Offset: {data.get('utc_offset')})\n"
                    f"  Currency          : {data.get('currency')} ({data.get('currency_name')})"
                )
                return output, current_dir
        except Exception as e:
            pass
        
        # Fallback to ip-api.com
        try:
            r = requests.get("http://ip-api.com/json", timeout=5)
            if r.status_code == 200:
                data = r.json()
                if data.get("status") == "success":
                    output = (
                        f"{self.format_bold('NODE NETWORK COORDINATES:')}\n"
                        f"  Public IP Address : {self.format_green(data.get('query'))}\n"
                        f"  ISP/Provider      : {self.format_cyan(data.get('isp'))} ({data.get('as')})\n"
                        f"  Location          : {data.get('city')}, {data.get('regionName')}, {data.get('country')}\n"
                        f"  Coordinates       : Lat: {data.get('lat')}, Lon: {data.get('lon')}"
                    )
                    return output, current_dir
        except Exception:
            pass

        return self.format_red("Error: Could not retrieve external IP coordinates. Check connection state."), current_dir

    def cmd_ping(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt ping <host> [-c count] [-p port]"), current_dir

        host = args[0]
        count = 4
        port = None

        # Parse options
        i = 1
        while i < len(args):
            if args[i] == "-c" and i + 1 < len(args):
                try:
                    count = int(args[i+1])
                except ValueError:
                    pass
                i += 2
            elif args[i] == "-p" and i + 1 < len(args):
                try:
                    port = int(args[i+1])
                except ValueError:
                    pass
                i += 2
            else:
                i += 1

        # Resolve IP address
        try:
            ip_addr = socket.gethostbyname(host)
        except Exception as e:
            return self.format_red(f"ping: Unknown host '{host}': {str(e)}"), current_dir

        # If port is specified, perform TCP ping. Otherwise, use system ping if possible, or fall back to TCP ping on port 80/443.
        # ICMP sockets require raw privileges which aren't typically available without root,
        # so a TCP Handshake Latency check is extremely reliable and cross-platform.
        port_to_check = port if port else 80
        port_label = f"port {port_to_check}/TCP" if port else "default port 80/TCP"

        output_lines = [
            f"HUNT PING {host} ({ip_addr}) using {port_label}:",
            f"Testing {count} handshakes..."
        ]

        latencies = []
        for seq in range(1, count + 1):
            t0 = time.time()
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(2.0)
                s.connect((ip_addr, port_to_check))
                s.close()
                elapsed = (time.time() - t0) * 1000
                latencies.append(elapsed)
                output_lines.append(
                    f"  Connection from {ip_addr}: seq={seq} time={elapsed:.2f} ms status=CONNECTED"
                )
            except Exception as e:
                latencies.append(None)
                output_lines.append(
                    f"  Connection from {ip_addr}: seq={seq} status=FAILED ({type(e).__name__})"
                )
            time.sleep(0.2)

        # Calculate stats
        successful = [l for l in latencies if l is not None]
        sent = len(latencies)
        recv = len(successful)
        lost = sent - recv
        loss_pct = (lost / sent) * 100

        output_lines.append(f"\n--- {host} ping statistics ---")
        output_lines.append(f"  {sent} packets transmitted, {recv} received, {loss_pct:.1f}% packet loss")
        
        if successful:
            avg = sum(successful) / len(successful)
            min_l = min(successful)
            max_l = max(successful)
            output_lines.append(f"  rtt min/avg/max = {min_l:.2f}/{avg:.2f}/{max_l:.2f} ms")

        return "\n".join(output_lines), current_dir

    def cmd_dns(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt dns <domain> [record_type]"), current_dir

        domain = args[0]
        qtype = args[1].upper() if len(args) > 1 else "A"
        
        # Check support record types
        supported = ["A", "AAAA", "MX", "TXT", "NS", "CNAME"]
        if qtype not in supported:
            return self.format_red(f"Error: Unsupported record type '{qtype}'. Supported: {', '.join(supported)}"), current_dir

        output_lines = [
            f"DNS lookup for {self.format_cyan(domain)} (Record Type: {self.format_yellow(qtype)})",
            "Resolving via secure DNS-over-HTTPS..."
        ]

        try:
            # Query Google DNS Over HTTPS API
            url = f"https://dns.google/resolve?name={domain}&type={qtype}"
            r = requests.get(url, timeout=5)
            if r.status_code != 200:
                return self.format_red(f"DNS query failed with status code {r.status_code}"), current_dir

            data = r.json()
            status = data.get("Status", 0)
            if status != 0:
                # 3 is NXDOMAIN
                err_msg = "NXDOMAIN (Non-Existent Domain)" if status == 3 else f"Error code {status}"
                return self.format_red(f"DNS lookup failed: {err_msg}"), current_dir

            answers = data.get("Answer", [])
            if not answers:
                output_lines.append(self.format_yellow(f"No records of type {qtype} found for this domain."))
            else:
                output_lines.append(f"{'TYPE':<6} {'TTL':<8} {'DATA':<30}")
                output_lines.append("-" * 50)
                for ans in answers:
                    t_val = ans.get("type", 1)
                    # map numeric types to names
                    type_map = {1: "A", 28: "AAAA", 15: "MX", 16: "TXT", 2: "NS", 5: "CNAME"}
                    t_name = type_map.get(t_val, str(t_val))
                    ttl = ans.get("TTL", 300)
                    rdata = ans.get("data", "")
                    output_lines.append(f"{t_name:<6} {ttl:<8} {self.format_green(rdata):<30}")
            
            return "\n".join(output_lines), current_dir
        except Exception as e:
            return self.format_red(f"DNS resolution failure: {str(e)}"), current_dir

    def cmd_dig(self, args, current_dir):
        return self.cmd_dns(args, current_dir)

    def cmd_whois(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt whois <domain>"), current_dir

        domain = args[0].strip().lower()
        
        # Clean domain (remove https://, http://, www.)
        if domain.startswith("http://"):
            domain = domain[7:]
        if domain.startswith("https://"):
            domain = domain[8:]
        if domain.startswith("www."):
            domain = domain[4:]
        domain = domain.split("/")[0]

        output_lines = [
            f"WHOIS Query for '{self.format_cyan(domain)}' via port 43 socket connection:",
            "Connecting to whois.iana.org..."
        ]

        def query_whois_server(server, query):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(5.0)
                s.connect((server, 43))
                s.send((query + "\r\n").encode())
                response = b""
                while True:
                    chunk = s.recv(4096)
                    if not chunk:
                        break
                    response += chunk
                s.close()
                return response.decode('utf-8', errors='ignore')
            except Exception as e:
                return f"Error connecting to {server}: {str(e)}"

        # Phase 1: Query IANA to get registrar database server
        iana_res = query_whois_server("whois.iana.org", domain)
        if iana_res.startswith("Error"):
            return self.format_red(iana_res), current_dir

        # Try to parse referring whois database server
        refer_server = None
        for line in iana_res.splitlines():
            if line.strip().lower().startswith("refer:") or line.strip().lower().startswith("whois:"):
                refer_server = line.split(":", 1)[1].strip()
                break

        if not refer_server:
            # Fallback to standard top level domain whois resolvers
            tld = domain.split(".")[-1]
            refer_server = f"whois.nic.{tld}"
            if tld == "com":
                refer_server = "whois.verisign-grs.com"
            elif tld == "org":
                refer_server = "whois.pir.org"
            elif tld == "net":
                refer_server = "whois.verisign-grs.com"

        output_lines.append(f"Redirecting query to registry server: '{refer_server}'...")
        
        # Phase 2: Query registrar server for full record
        full_record = query_whois_server(refer_server, domain)
        if full_record.startswith("Error"):
            output_lines.append(self.format_yellow(f"Warning: Registry query failed. Showing IANA fallback response."))
            output_lines.append(iana_res)
        else:
            # Parse key details to display cleanly first
            registrar = "Unknown"
            created = "Unknown"
            expiry = "Unknown"
            ns = []
            
            for line in full_record.splitlines():
                line_lower = line.strip().lower()
                if "registrar:" in line_lower:
                    registrar = line.split(":", 1)[1].strip()
                elif "creation date:" in line_lower or "created:" in line_lower:
                    created = line.split(":", 1)[1].strip()
                elif "registry expiry date:" in line_lower or "expiration date:" in line_lower or "expires:" in line_lower:
                    expiry = line.split(":", 1)[1].strip()
                elif "name server:" in line_lower or "nserver:" in line_lower:
                    srv = line.split(":", 1)[1].strip().split()[0]
                    ns.append(srv)

            summary = (
                f"\n{self.format_bold('DOMAIN SUMMARY:')}\n"
                f"  Domain Name       : {self.format_green(domain)}\n"
                f"  Registrar         : {self.format_cyan(registrar)}\n"
                f"  Created On        : {created}\n"
                f"  Expires On        : {self.format_yellow(expiry)}\n"
                f"  Name Servers      : {', '.join(ns[:4])}\n"
            )
            output_lines.append(summary)
            
            # Append raw logs but truncated
            truncated_raw = "\n".join(full_record.splitlines()[:50])
            output_lines.append(f"{self.format_bold('RAW WHOIS (First 50 lines):')}\n{truncated_raw}")
            if len(full_record.splitlines()) > 50:
                output_lines.append(self.format_muted("\n[... Raw logs truncated. Query directly for complete records ...]"))

        return "\n".join(output_lines), current_dir

    def cmd_headers(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt headers <url>"), current_dir

        url = args[0]
        if not url.startswith("http://") and not url.startswith("https://"):
            url = "https://" + url

        output_lines = [
            f"Checking headers for {self.format_cyan(url)}...",
        ]

        try:
            t0 = time.time()
            r = requests.get(url, timeout=6, headers={'User-Agent': 'DevHunt-Headers/1.0'})
            elapsed = (time.time() - t0) * 1000
            
            output_lines.append(f"Response received in {elapsed:.2f} ms with Status Code: {self.format_green(str(r.status_code))}\n")
            output_lines.append(f"{self.format_bold('HTTP RESPONSE HEADERS:')}")
            for k, v in r.headers.items():
                output_lines.append(f"  {k}: {self.format_cyan(v)}")

            # Security Headers Verification
            sec_headers = {
                "Content-Security-Policy": "Mitigates XSS and injection attacks.",
                "Strict-Transport-Security": "Forces SSL/TLS encrypted connections (HSTS).",
                "X-Frame-Options": "Prevents clickjacking overlays.",
                "X-Content-Type-Options": "Blocks MIME type sniffing.",
                "Referrer-Policy": "Controls metadata sent in Referer header."
            }

            output_lines.append(f"\n{self.format_bold('SECURITY HEADER COMPLIANCE CHECKS:')}")
            for sh, desc in sec_headers.items():
                val = r.headers.get(sh)
                if val:
                    output_lines.append(f"  [✓] {self.format_green(sh)}: {self.format_bold('ENABLED')}\n      {self.format_muted(val)}")
                else:
                    output_lines.append(f"  [✗] {self.format_red(sh)}: {self.format_bold('MISSING')} - {desc}")
            
            return "\n".join(output_lines), current_dir
        except Exception as e:
            return self.format_red(f"HTTP Connection failed: {str(e)}"), current_dir

    def cmd_ssl(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt ssl <host>"), current_dir

        host = args[0].strip().lower()
        if host.startswith("https://"):
            host = host[8:]
        if host.startswith("http://"):
            host = host[7:]
        host = host.split("/")[0]

        output_lines = [
            f"Establishing SSL/TLS secure connection to {self.format_cyan(host)}:443...",
        ]

        context = ssl.create_default_context()
        try:
            with socket.create_connection((host, 443), timeout=5) as sock:
                with context.wrap_socket(sock, server_hostname=host) as ssock:
                    cert = ssock.getpeercert()
                    cipher = ssock.cipher()
                    ssl_version = ssock.version()
                    
                    output_lines.append(f"Negotiated version: {self.format_green(ssl_version)}")
                    output_lines.append(f"Cipher Suite: {self.format_green(cipher[0])} (Strength: {cipher[2]} bits)\n")
                    
                    # Extract fields
                    subject = dict(x[0] for x in cert.get('subject', []))
                    issuer = dict(x[0] for x in cert.get('issuer', []))
                    
                    sub_name = subject.get('commonName', 'Unknown')
                    iss_name = issuer.get('commonName', 'Unknown')
                    
                    # Parse dates
                    # e.g., 'May  9 23:59:59 2026 GMT'
                    not_after_str = cert.get('notAfter')
                    not_before_str = cert.get('notBefore')
                    
                    output_lines.append(f"{self.format_bold('CERTIFICATE SPECIFICATIONS:')}")
                    output_lines.append(f"  Common Name (CN)   : {self.format_cyan(sub_name)}")
                    output_lines.append(f"  Issuer Authority   : {self.format_cyan(iss_name)}")
                    output_lines.append(f"  Serial Number      : {cert.get('serialNumber', 'Unknown')}")
                    output_lines.append(f"  Activation Date    : {not_before_str}")
                    output_lines.append(f"  Expiration Date    : {self.format_yellow(not_after_str)}")
                    
                    try:
                        expire_dt = datetime.datetime.strptime(not_after_str, '%b %d %H:%M:%S %Y %Z')
                        delta = expire_dt - datetime.datetime.utcnow()
                        days_left = delta.days
                        
                        if days_left < 0:
                            output_lines.append(f"  Certificate Status : {self.format_red('EXPIRED')} ({abs(days_left)} days ago)")
                        elif days_left < 30:
                            output_lines.append(f"  Certificate Status : {self.format_yellow('WARNING - EXPIRING SOON')} ({days_left} days left)")
                        else:
                            output_lines.append(f"  Certificate Status : {self.format_green('VALID')} ({days_left} days remaining)")
                    except Exception:
                        pass
                    
            return "\n".join(output_lines), current_dir
        except Exception as e:
            return self.format_red(f"SSL handshake connection failed: {str(e)}"), current_dir

    def cmd_port(self, args, current_dir):
        if len(args) < 2:
            return self.format_red("Usage: hunt port <host> <port>"), current_dir

        host = args[0]
        try:
            port = int(args[1])
        except ValueError:
            return self.format_red(f"Error: Invalid port number '{args[1]}'"), current_dir

        try:
            ip_addr = socket.gethostbyname(host)
        except Exception as e:
            return self.format_red(f"Error: Cannot resolve hostname '{host}': {str(e)}"), current_dir

        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2.5)
            t0 = time.time()
            res = s.connect_ex((ip_addr, port))
            elapsed = (time.time() - t0) * 1000
            s.close()

            if res == 0:
                # Port is open
                service = "Unknown"
                try:
                    service = socket.getservbyport(port)
                except Exception:
                    pass
                return (
                    f"Port scan check on {self.format_cyan(host)} ({ip_addr}):\n"
                    f"  Port: {self.format_bold(str(port))}\n"
                    f"  Status: {self.format_green('OPEN / LISTENING')}\n"
                    f"  Service: {self.format_yellow(service)}\n"
                    f"  Response latency: {elapsed:.2f} ms"
                ), current_dir
            else:
                return (
                    f"Port scan check on {self.format_cyan(host)} ({ip_addr}):\n"
                    f"  Port: {port}\n"
                    f"  Status: {self.format_red('CLOSED / FILTERED')} (Code: {res})"
                ), current_dir
        except Exception as e:
            return self.format_red(f"Port scan failure: {str(e)}"), current_dir

    def cmd_trace(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt trace <host>"), current_dir

        host = args[0]
        try:
            ip_addr = socket.gethostbyname(host)
        except Exception:
            return self.format_red(f"trace: Unknown host '{host}'"), current_dir

        output_lines = [
            f"Simulating network trace path to {self.format_cyan(host)} ({ip_addr}):",
            "Max hops: 12. Packet size: 56 bytes.",
            ""
        ]

        # Simulate hops based on standard structures, ending with target
        # For fun, we generate geolocated hop simulation that matches real network behavior
        hops = [
            ("192.168.1.1", "Local Router", 1.2),
            ("10.0.0.1", "ISP Gateway", 3.5),
            ("172.16.4.22", "Edge Node", 8.1),
            ("64.233.174.12", "Regional Hub", 15.4),
        ]
        
        # Add target
        hops.append((ip_addr, host, 28.6))

        output_lines.append(f"{'HOP':<4} {'IP ADDRESS':<16} {'RESOLVED HOST':<30} {'TIME (ms)':<10}")
        output_lines.append("-" * 70)
        
        for idx, (ip, name, latency) in enumerate(hops, 1):
            var_lat = latency + (idx * 0.4) # Add variation
            output_lines.append(
                f"{idx:<4} {ip:<16} {self.format_green(name[:28]):<30} {var_lat:.2f} ms"
            )

        return "\n".join(output_lines), current_dir

    def cmd_subdomains(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt subdomains <domain>"), current_dir

        domain = args[0].strip().lower()
        if domain.startswith("www."):
            domain = domain[4:]

        output_lines = [
            f"Passive subdomain query scan for '{self.format_cyan(domain)}':",
            "Checking certificate logs and common structures...",
            ""
        ]

        # Check crt.sh passive SSL/TLS cert logs API for real records
        try:
            url = f"https://crt.sh/?q=%25.{domain}&output=json"
            r = requests.get(url, timeout=6)
            if r.status_code == 200:
                data = r.json()
                found = set()
                for item in data:
                    name_value = item.get("name_value", "")
                    for sub in name_value.split("\n"):
                        sub = sub.strip().lower()
                        if sub.endswith(domain) and sub != domain and "*" not in sub:
                            found.add(sub)
                
                sorted_subs = sorted(list(found))
                if sorted_subs:
                    output_lines.append(f"Identified {len(sorted_subs)} public subdomains in certificate transparency logs:")
                    for s in sorted_subs[:30]: # Limit output to 30 items
                        output_lines.append(f"  - {self.format_green(s)}")
                    if len(sorted_subs) > 30:
                        output_lines.append(self.format_muted(f"\n[... and {len(sorted_subs) - 30} more. Truncated output ...]"))
                    return "\n".join(output_lines), current_dir
        except Exception:
            pass

        # Fallback to local DNS checks of standard subdomains (mock/light lookup)
        common = ["www", "api", "mail", "dev", "stage", "blog", "admin", "shop", "git"]
        found_subs = []
        for sub in common:
            sub_d = f"{sub}.{domain}"
            try:
                socket.gethostbyname(sub_d)
                found_subs.append(sub_d)
            except socket.gaierror:
                pass

        if found_subs:
            output_lines.append(f"Identified {len(found_subs)} active subdomains via passive query checklist:")
            for s in found_subs:
                output_lines.append(f"  - {self.format_green(s)}")
        else:
            output_lines.append(self.format_yellow("No subdomains resolved passively in checklist. Target may not have public subnodes."))

        return "\n".join(output_lines), current_dir

    # ── DEVELOPMENT & UTILITIES HANDLERS ──────────────────────────────────────

    def cmd_git(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt git <command> [args]"), current_dir

        # Safe execution of git - no shell=True, only within workspace directory
        command_to_run = ["git"] + args
        try:
            # We enforce running it inside the active current directory (or workspace_root)
            res = subprocess.run(
                command_to_run,
                cwd=current_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=5.0
            )
            stdout = res.stdout.decode('utf-8', errors='ignore').strip()
            stderr = res.stderr.decode('utf-8', errors='ignore').strip()

            output = ""
            if stdout:
                output += stdout
            if stderr:
                if output:
                    output += "\n"
                output += self.format_yellow(stderr)

            if not output:
                output = self.format_muted("[Git completed command with no terminal output]")

            return output, current_dir
        except FileNotFoundError:
            return self.format_red("Error: 'git' executable not found on host machine environment."), current_dir
        except Exception as e:
            return self.format_red(f"Git execution failed: {str(e)}"), current_dir

    def cmd_python(self, args, current_dir):
        if len(args) < 2 or args[0] != "-c":
            return self.format_red("Usage: hunt python -c \"<code>\""), current_dir

        code = args[1]
        
        # Safe execute: we run it in a subprocess separate Python execution
        # to ensure it does not corrupt or hijack the main Flask server process threads.
        try:
            res = subprocess.run(
                [sys.executable, "-c", code],
                cwd=current_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=4.0
            )
            stdout = res.stdout.decode('utf-8', errors='ignore')
            stderr = res.stderr.decode('utf-8', errors='ignore')

            if stderr:
                return self.format_red(stderr.strip()), current_dir
            return stdout.strip() if stdout else self.format_muted("[Execution successful with empty output]"), current_dir
        except Exception as e:
            return self.format_red(f"Python execution failed: {str(e)}"), current_dir

    def cmd_calc(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt calc <math_expression>"), current_dir

        expr = " ".join(args)
        
        # Safe math evaluation using basic python scope mapping (prevent dunder execution)
        allowed_names = {
            'abs': abs, 'round': round, 'pow': pow,
            'sin': math.sin, 'cos': math.cos, 'tan': math.tan,
            'sqrt': math.sqrt, 'log': math.log, 'log10': math.log10, 'log2': math.log2,
            'pi': math.pi, 'e': math.e
        }
        
        # Sanitize against underscores/dunder access
        if "__" in expr or "import" in expr or "eval" in expr or "exec" in expr:
            return self.format_red("Security Error: Forbidden expression syntax."), current_dir

        try:
            # Evaluate code with empty builtins to prevent exploit vectors
            res = eval(expr, {"__builtins__": None}, allowed_names)
            return f"{self.format_bold('Expression:')} {expr}\n{self.format_bold('Result:')} {self.format_green(str(res))}", current_dir
        except Exception as e:
            return self.format_red(f"Math Error: {str(e)}"), current_dir

    def cmd_localports(self, args, current_dir):
        show_all = False
        for a in args:
            if a == "-a":
                show_all = True

        output_lines = [
            f"{self.format_bold('ACTIVE LOCAL NETWORK PORTS & SOCKETS:')}"
        ]

        try:
            # We fetch local ports cleanly based on platform.
            # Using netstat command via safe subprocess.
            if self.os_type == "Windows":
                # netstat -ano
                res = subprocess.run(["netstat", "-ano"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=4.0)
                raw = res.stdout.decode('utf-8', errors='ignore')
                lines = raw.splitlines()
                header_found = False
                
                output_lines.append(f"{'Proto':<6} {'Local Address':<24} {'Foreign Address':<24} {'State':<15} {'PID':<8}")
                output_lines.append("-" * 80)
                
                count = 0
                for line in lines:
                    line = line.strip()
                    if not line or line.startswith("Active") or line.startswith("Proto"):
                        continue
                    parts = line.split()
                    if len(parts) >= 4:
                        proto = parts[0]
                        local = parts[1]
                        foreign = parts[2]
                        state = parts[3] if proto == "TCP" else "UDP_STATE"
                        pid = parts[4] if (proto == "TCP" and len(parts) >= 5) or (proto == "UDP" and len(parts) >= 4) else "-"
                        if pid == "-":
                            pid = parts[-1]
                            
                        # Filtering: by default show only LISTENING/Established unless -a
                        if not show_all and state != "LISTENING":
                            continue
                            
                        # Color coding
                        state_colored = self.format_green(state) if state == "LISTENING" else (self.format_cyan(state) if state == "ESTABLISHED" else state)
                        local_colored = self.format_yellow(local) if ":5000" in local or ":80" in local or ":443" in local else local
                        
                        output_lines.append(f"{proto:<6} {local_colored:<24} {foreign:<24} {state_colored:<15} {pid:<8}")
                        count += 1
                        if count >= 60: # Limit output lines
                            output_lines.append(self.format_muted("[... Output truncated. Use specific PID lookups or netstat filters ...]"))
                            break
            else:
                # Linux/Unix - ss or netstat
                cmd = ["ss", "-tulpn"] if not show_all else ["ss", "-taupn"]
                try:
                    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=4.0)
                    raw = res.stdout.decode('utf-8', errors='ignore')
                except FileNotFoundError:
                    # Fallback to netstat
                    cmd = ["netstat", "-tuln"] if not show_all else ["netstat", "-an"]
                    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=4.0)
                    raw = res.stdout.decode('utf-8', errors='ignore')

                lines = raw.splitlines()
                output_lines.append(lines[0]) # Header
                output_lines.append("-" * 80)
                count = 0
                for line in lines[1:]:
                    if not line.strip():
                        continue
                    output_lines.append(line)
                    count += 1
                    if count >= 60:
                        output_lines.append(self.format_muted("[... Output truncated ...]"))
                        break
            
            return "\n".join(output_lines), current_dir
        except Exception as e:
            return self.format_red(f"Failed to query local sockets: {str(e)}"), current_dir

    def cmd_portscan(self, args, current_dir):
        if not args:
            return self.format_red("Usage: hunt portscan <host> [-r range] [-t timeout]"), current_dir

        host = args[0]
        port_range = "common"
        timeout = 0.5

        # Parse args
        i = 1
        while i < len(args):
            if args[i] == "-r" and i + 1 < len(args):
                port_range = args[i+1]
                i += 2
            elif args[i] == "-t" and i + 1 < len(args):
                try:
                    timeout = float(args[i+1])
                except ValueError:
                    pass
                i += 2
            else:
                i += 1

        try:
            ip_addr = socket.gethostbyname(host)
        except Exception as e:
            return self.format_red(f"portscan: Unknown host '{host}': {str(e)}"), current_dir

        # Determine ports list
        ports = []
        if port_range == "common":
            # Scan standard devops and web ports
            ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 1433, 1521, 3306, 3389, 5000, 5432, 6379, 8000, 8080, 9000, 27017]
        elif "-" in port_range:
            try:
                start, end = map(int, port_range.split("-"))
                if start < 1 or end > 65535 or start > end:
                    raise ValueError
                # Cap manual scans to 150 ports to avoid resource exhaustion/lockups
                if end - start > 150:
                    return self.format_red("Security limits: Maximum manual scan range is 150 ports."), current_dir
                ports = list(range(start, end + 1))
            except ValueError:
                return self.format_red("Error: Invalid port range. Format: 20-80"), current_dir
        else:
            try:
                ports = [int(port_range)]
            except ValueError:
                return self.format_red("Error: Invalid port descriptor. Use 'common' or range e.g. 80-443"), current_dir

        output_lines = [
            f"HUNT PORTSCAN target: {self.format_cyan(host)} ({ip_addr})",
            f"Scanning {len(ports)} ports with {timeout}s connection timeouts...",
            ""
        ]

        output_lines.append(f"{'PORT':<8} {'SERVICE':<12} {'STATUS':<15} {'LATENCY':<10}")
        output_lines.append("-" * 50)

        open_ports_count = 0
        for port in ports:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(timeout)
                t0 = time.time()
                res = s.connect_ex((ip_addr, port))
                elapsed = (time.time() - t0) * 1000
                s.close()

                if res == 0:
                    open_ports_count += 1
                    service = "unknown"
                    try:
                        service = socket.getservbyport(port)
                    except Exception:
                        pass
                    output_lines.append(
                        f"{self.format_green(str(port)):<18} {service:<12} {self.format_green('OPEN'):<24} {elapsed:.1f} ms"
                    )
            except Exception:
                pass

        output_lines.append("\n--- Port scan complete ---")
        output_lines.append(f"Scan finished. Identified {open_ports_count} active listening ports.")

        return "\n".join(output_lines), current_dir

    def cmd_quest(self, args, current_dir):
        from core.todo_manager import TodoManager
        
        if not args:
            # List all pending todos
            todos = TodoManager.get_todos(status_filter="pending")
            if not todos:
                return self.format_muted("// No active quests found on the Quest Board."), current_dir
            
            output = [self.format_bold("--- QUEST BOARD ACTIVE ---")]
            for t in todos:
                color = self.format_red if t['priority'] == 'high' else (self.format_yellow if t['priority'] == 'medium' else self.format_cyan)
                output.append(f"  [{t['id']}] {t['title']} (Priority: {color(t['priority'].upper())})")
                if t['description']:
                    output.append(f"      {self.format_muted(t['description'])}")
            return "\n".join(output), current_dir

        sub_cmd = args[0].lower()
        if sub_cmd == "done" and len(args) > 1:
            try:
                TodoManager.complete_todo(int(args[1]))
                return self.format_green(f"Quest {args[1]} marked completed!"), current_dir
            except Exception as e:
                return self.format_red(f"Error: {e}"), current_dir
        
        elif sub_cmd == "rm" and len(args) > 1:
            try:
                TodoManager.delete_todo(int(args[1]))
                return self.format_green(f"Quest {args[1]} deleted from board."), current_dir
            except Exception as e:
                return self.format_red(f"Error: {e}"), current_dir
        
        elif sub_cmd == "add" and len(args) > 1:
            title = args[1]
            prio = args[2].lower() if len(args) > 2 else "medium"
            desc = args[3] if len(args) > 3 else "Added via Terminal CLI."
            if prio not in ["high", "medium", "low"]:
                prio = "medium"
            try:
                todo = TodoManager.create_todo(title=title, priority=prio, description=desc, source="manual")
                return self.format_green(f"Quest added! ID: {todo['id']}"), current_dir
            except Exception as e:
                return self.format_red(f"Error: {e}"), current_dir
            
        return self.format_red("Usage: hunt quest [add <title> [prio] [desc] | done <id> | rm <id>]"), current_dir

    def cmd_keys(self, args, current_dir):
        from core.key_manager import KeyManager
        km = KeyManager()
        
        if not args or args[0].lower() == "list":
            keys = km.get_keys_list()
            if not keys:
                return self.format_muted("// No API keys registered in key pool."), current_dir
            
            output = [self.format_bold("--- REGISTERED API KEYS ---")]
            for k in keys:
                status_color = self.format_green if k['status'] == 'Active' else self.format_yellow
                output.append(f"  Label: {self.format_cyan(k['label'])} | ID: {k['id'][:8]}... | Status: {status_color(k['status'])}")
            return "\n".join(output), current_dir

        sub_cmd = args[0].lower()
        if sub_cmd == "add" and len(args) > 1:
            raw_key = args[1]
            label = args[2] if len(args) > 2 else "unnamed"
            try:
                res = km.add_key(raw_key, label)
                if res.get("success"):
                    return self.format_green(f"Key successfully registered with label '{label}'!"), current_dir
                return self.format_red(f"Error: {res.get('error')}"), current_dir
            except Exception as e:
                return self.format_red(f"Error: {e}"), current_dir

        elif sub_cmd == "rm" and len(args) > 1:
            key_id = args[1]
            try:
                success = km.remove_key(key_id)
                if success:
                    return self.format_green(f"Key '{key_id}' removed from pool."), current_dir
                return self.format_red(f"Error: Key '{key_id}' not found."), current_dir
            except Exception as e:
                return self.format_red(f"Error: {e}"), current_dir

        elif sub_cmd == "test" and len(args) > 1:
            key_id = args[1]
            import time as _t
            from google import genai
            try:
                raw_key = None
                key_label = key_id
                for k in km.keys:
                    if k['id'] == key_id or k['id'].startswith(key_id):
                        raw_key = km._decrypt(k['key_encrypted'])
                        key_label = k['label']
                        break
                if not raw_key:
                    return self.format_red(f"Key '{key_id}' not found."), current_dir
                t0 = _t.time()
                client = genai.Client(api_key=raw_key)
                resp = client.models.generate_content(model="gemini-2.5-flash", contents="Reply: OK")
                ms = int((_t.time() - t0) * 1000)
                return self.format_green(f"Key test PASSED: {key_label} ({ms}ms) -> reply: \"{resp.text.strip()[:30]}\""), current_dir
            except Exception as e:
                return self.format_red(f"Key test FAILED: {e}"), current_dir

        return self.format_red("Usage: hunt keys [list | add <key> [label] | rm <id> | test <id>]"), current_dir

    def cmd_memory(self, args, current_dir):
        from core.db import get_db_connection
        import json
        
        if not args or args[0].lower() == "list":
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT consolidated_facts FROM user_memories WHERE session_id = ?", ("default_session",))
            row = cursor.fetchone()
            conn.close()
            
            memories = json.loads(row['consolidated_facts']) if (row and row['consolidated_facts']) else []
            if not memories:
                return self.format_muted("AI has no consolidated long-term memories yet."), current_dir
                
            output = [self.format_bold("--- DISTILLED AI MEMORY ---")]
            for idx, fact in enumerate(memories, 1):
                output.append(f"  {idx}. {fact}")
            return "\n".join(output), current_dir
            
        sub_cmd = args[0].lower()
        if sub_cmd == "refine":
            from core.key_manager import KeyManager
            from core.memory_manager import MemoryManager
            mm = MemoryManager(KeyManager())
            res = mm.refine_memories("default_session")
            if res.get("success"):
                return self.format_green("Memory consolidation complete! Type 'hunt memory' to view."), current_dir
            return self.format_red(f"Refinement error: {res.get('error')}"), current_dir

        elif sub_cmd == "clear":
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM user_memories WHERE session_id = ?", ("default_session",))
            conn.commit()
            conn.close()
            return self.format_green("Core memories successfully wiped."), current_dir

        return self.format_red("Usage: hunt memory [list | refine | clear]"), current_dir

    def cmd_backup(self, args, current_dir):
        if not args or args[0].lower() != "export":
            return self.format_red("Usage: hunt backup export"), current_dir

        from core.db import get_db_connection
        from config import KEYS_PATH, LEARNING_PATH_JSON
        from core.profile_manager import ProfileManager
        import json
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM messages ORDER BY timestamp ASC")
            messages = [dict(r) for r in cursor.fetchall()]
            cursor.execute("SELECT id, name, type, path, status, chunk_count, created_at FROM knowledge_sources")
            knowledge_sources = [dict(r) for r in cursor.fetchall()]
            conn.close()

            keys_data = json.load(open(KEYS_PATH)) if os.path.exists(KEYS_PATH) else []
            lp_data = json.load(open(LEARNING_PATH_JSON)) if os.path.exists(LEARNING_PATH_JSON) else {}

            backup = {
                "backup_version": "1.0",
                "exported_at": datetime.datetime.now().isoformat(),
                "chat_history": messages,
                "knowledge_sources": knowledge_sources,
                "keys": keys_data,
                "profile": ProfileManager.get_profile(),
                "settings": ProfileManager.get_settings(),
                "learning_path": lp_data,
            }
            
            fname = f"devhunt_backup_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            bpath = os.path.join(self.workspace_root, fname)
            with open(bpath, 'w') as f:
                json.dump(backup, f, indent=2)

            return self.format_green(f"Full system backup successfully exported:\n  {bpath}"), current_dir
        except Exception as e:
            return self.format_red(f"Backup failed: {str(e)}"), current_dir

    def cmd_history(self, args, current_dir):
        limit = 20
        if args:
            try:
                limit = int(args[0])
            except ValueError:
                pass
                
        from core.db import get_db_connection
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """SELECT role, content, timestamp FROM messages 
                   WHERE session_id = ? 
                   ORDER BY timestamp DESC LIMIT ?""",
                ("default_session", limit)
            )
            rows = cursor.fetchall()
            conn.close()

            if not rows:
                return self.format_muted("// No chat messages in active session."), current_dir

            output = [self.format_bold(f"--- RECENT CHAT HISTORY (Last {limit}) ---")]
            for r in reversed(rows):
                role_label = self.format_cyan("You") if r['role'] == "user" else self.format_green("AI")
                ts = r['timestamp'].split(".")[0] if r['timestamp'] else ""
                output.append(f"[{ts}] {role_label}: {r['content']}")
            return "\n".join(output), current_dir
        except Exception as e:
            return self.format_red(f"Error: {e}"), current_dir

    def cmd_notifications(self, args, current_dir):
        from core.db import get_db_connection
        from core.profile_manager import ProfileManager
        from core.logger import get_logs
        from core.update_manager import UpdateManager
        import json
        import requests
        import datetime
        
        settings = ProfileManager.get_settings()
        read_notifications = settings.get("read_notifications", [])
        notifications = []
        
        # 1. Remote announcements
        try:
            res = requests.get(
                "https://raw.githubusercontent.com/hitehsolanki2006/DevHunt/main/notifications.json",
                timeout=1.5
            )
            if res.status_code == 200:
                remote_data = res.json()
                if isinstance(remote_data, list):
                    for item in remote_data:
                        notifications.append({
                            "id": item.get("id"),
                            "title": item.get("title", "Announcement"),
                            "message": item.get("message", ""),
                            "type": item.get("type", "release"),
                            "timestamp": item.get("timestamp", "")
                        })
        except Exception:
            pass
            
        # Fallback announcement
        if not any(n["type"] in ["release", "news"] for n in notifications):
            notifications.append({
                "id": "announcement-welcome",
                "title": "Welcome to DevHunt!",
                "message": "Welcome to your premium developer dashboard. System Messages consolidates software updates, remote release announcements, and local warnings.",
                "type": "info",
                "timestamp": "2026-06-11 12:00:00"
            })
            
        # 2. Git update
        try:
            update_status = UpdateManager.check_for_updates()
            if update_status.get("success") and update_status.get("update_available"):
                latest_commit = update_status.get("latest_commit")
                commit_msg_list = [c["message"] for c in update_status.get("commits", [])]
                commit_msgs = "; ".join(commit_msg_list) if commit_msg_list else "New changes available."
                notifications.append({
                    "id": f"git-update-{latest_commit}",
                    "title": "⚡ Software Update Available",
                    "message": f"New commit: {latest_commit}. Changes: {commit_msgs}",
                    "type": "update",
                    "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })
        except Exception:
            pass
            
        # 3. Logs
        try:
            system_errors = get_logs(limit=100, level="ERROR")
            system_warnings = get_logs(limit=100, level="WARN")
            merged_logs = system_errors + system_warnings
            merged_logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            for log_entry in merged_logs[:100]:
                notifications.append({
                    "id": f"log-{log_entry['id']}",
                    "title": f"⚠️ System Log: {log_entry['category'].upper()} ({log_entry['level']})",
                    "message": log_entry["message"],
                    "type": "log_error" if log_entry["level"] == "ERROR" else "log_warn",
                    "timestamp": log_entry.get("timestamp", ""),
                    "metadata": log_entry.get("metadata", {})
                })
        except Exception:
            pass
            
        # Sort by timestamp descending
        def get_notification_time(n):
            t = n.get("timestamp", "")
            return t if t else "1970-01-01 00:00:00"
        notifications.sort(key=get_notification_time, reverse=True)
        
        # Sub-command routing
        if not args or args[0].lower() == "list":
            output = [self.format_bold("--- SYSTEM MESSAGES & NOTIFICATIONS ---")]
            for n in notifications:
                is_unread = n["id"] not in read_notifications
                unread_marker = self.format_red(" [UNREAD] ") if is_unread else " "
                
                # Format level badge
                if n["type"] in ["release", "news", "info"]:
                    type_label = self.format_green(f"[{n['type'].upper()}]")
                elif n["type"] == "update":
                    type_label = self.format_yellow("[UPDATE]")
                elif n["type"] == "log_error":
                    type_label = self.format_red("[ERROR]")
                else:
                    type_label = self.format_yellow("[WARNING]")
                    
                output.append(f"{type_label}{unread_marker}{self.format_cyan(n['id'])} - {n['title']}")
                output.append(f"  {self.format_muted(n['timestamp'])} - {n['message'][:80]}...")
                output.append("")
            return "\n".join(output), current_dir
            
        sub_cmd = args[0].lower()
        if sub_cmd == "read":
            if len(args) < 2:
                return self.format_red("Usage: hunt notifications read [all | <id>]"), current_dir
            target_id = args[1]
            if target_id.lower() == "all":
                all_ids = [n["id"] for n in notifications]
                merged = list(set(read_notifications + all_ids))
                ProfileManager.update_settings({"read_notifications": merged})
                return self.format_green("All notifications marked as read."), current_dir
            else:
                # Find matching notification
                matched = False
                for n in notifications:
                    if n["id"] == target_id:
                        matched = True
                        break
                if not matched:
                    return self.format_red(f"Error: Notification with ID '{target_id}' not found."), current_dir
                merged = list(set(read_notifications + [target_id]))
                ProfileManager.update_settings({"read_notifications": merged})
                return self.format_green(f"Notification '{target_id}' marked as read."), current_dir
                
        elif sub_cmd == "detail":
            if len(args) < 2:
                return self.format_red("Usage: hunt notifications detail <id>"), current_dir
            target_id = args[1]
            # Find matching notification
            target_notif = None
            for n in notifications:
                if n["id"] == target_id:
                    target_notif = n
                    break
            if not target_notif:
                return self.format_red(f"Error: Notification with ID '{target_id}' not found."), current_dir
                
            # Mark it read
            if target_id not in read_notifications:
                merged = list(set(read_notifications + [target_id]))
                ProfileManager.update_settings({"read_notifications": merged})
                
            output = [
                self.format_bold("=== NOTIFICATION DETAIL ==="),
                f"{self.format_bold('ID:')}        {target_notif['id']}",
                f"{self.format_bold('Type:')}      {target_notif['type']}",
                f"{self.format_bold('Time:')}      {target_notif['timestamp']}",
                f"{self.format_bold('Title:')}     {target_notif['title']}",
                f"{self.format_bold('Content:')}",
                f"  {target_notif['message']}"
            ]
            
            # Print metadata if exists
            metadata = target_notif.get("metadata")
            if metadata:
                output.append(f"{self.format_bold('Metadata:')}")
                output.append(f"  {json.dumps(metadata, indent=4)}")
                
            return "\n".join(output), current_dir
            
        return self.format_red("Usage: hunt notifications [list | read [all | <id>] | detail <id>]"), current_dir

