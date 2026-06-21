import sys
import os
import requests
import json
import re

API_URL = "http://localhost:1225/api/terminal/run"

def strip_html_tags(text):
    """Strip HTML tags from output to make it clean for a standard host terminal."""
    # Convert some common HTML tags or classes to text if needed
    clean = re.sub(r'<span class="ansi-red">([\s\S]*?)</span>', r'\033[91m\1\033[0m', text)
    clean = re.sub(r'<span class="ansi-green">([\s\S]*?)</span>', r'\033[92m\1\033[0m', clean)
    clean = re.sub(r'<span class="ansi-cyan">([\s\S]*?)</span>', r'\033[96m\1\033[0m', clean)
    clean = re.sub(r'<span class="ansi-yellow">([\s\S]*?)</span>', r'\033[93m\1\033[0m', clean)
    clean = re.sub(r'<span class="ansi-muted">([\s\S]*?)</span>', r'\033[90m\1\033[0m', clean)
    clean = re.sub(r'<b>([\s\S]*?)</b>', r'\033[1m\1\033[22m', clean)
    
    # Strip any other remaining tags
    clean = re.sub(r'<[^>]+>', '', clean)
    # Unescape HTML characters
    import html
    return html.unescape(clean)

def main():
    args = sys.argv[1:]
    if not args or args[0] != '-dt':
        print("DevHunt CLI Tool")
        print("Usage:")
        print("  hunter -dt [starting_dir]   - Open a DevHunt developer terminal session.")
        return
        
    start_dir = ""
    if len(args) > 1:
        start_dir = os.path.abspath(args[1])
        
    print("==========================================================")
    print(" DevHunt DevTerminal — by Hunter Group")
    print(" Connected to http://localhost:1225")
    print(" Type 'exit' or 'quit' to terminate session.")
    print("==========================================================")
    
    cwd = start_dir
    
    # Run a dummy neofetch command to fetch current server cwd if none provided
    if not cwd:
        try:
            r = requests.post(API_URL, json={"command": "hunt pwd", "cwd": ""}, timeout=5)
            if r.status_code == 200:
                data = r.json()
                if data.get("success"):
                    cwd = data.get("cwd")
        except Exception:
            pass
            
    while True:
        try:
            prompt = f"devhunt-dt:{cwd or '~'} $ "
            cmd = input(prompt).strip()
            if not cmd:
                continue
            if cmd.lower() in ['exit', 'quit']:
                print("Exiting DevTerminal session.")
                break
                
            r = requests.post(API_URL, json={
                "command": cmd,
                "cwd": cwd
            }, timeout=20)
            
            if r.status_code == 200:
                data = r.json()
                if data.get("success"):
                    output = data.get("output", "")
                    print(strip_html_tags(output))
                    if data.get("cwd"):
                        cwd = data.get("cwd")
                else:
                    print(f"\033[91mError: {data.get('error')}\033[0m")
            else:
                print(f"\033[91mError: Server returned status code {r.status_code}\033[0m")
                
        except KeyboardInterrupt:
            print("\nUse 'exit' to quit.")
        except requests.exceptions.ConnectionError:
            print("\033[91mConnection error: Could not reach the DevHunt server. Make sure the app is running.\033[0m")
        except Exception as e:
            print(f"\033[91mUnexpected error: {str(e)}\033[0m")

if __name__ == '__main__':
    main()
