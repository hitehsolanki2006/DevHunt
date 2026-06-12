import os
import sys
import re

# Insert backend folder into sys.path to allow importing from core
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from core import logger
except Exception:
    logger = None

from importlib.metadata import version, PackageNotFoundError

def parse_version(v_str):
    digits = re.findall(r'\d+', v_str)
    return tuple(int(x) for x in digits)

def compare_versions(installed, required, op):
    inst_tup = parse_version(installed)
    req_tup = parse_version(required)
    if op == '==':
        return inst_tup == req_tup
    elif op == '>=':
        return inst_tup >= req_tup
    elif op == '<=':
        return inst_tup <= req_tup
    elif op == '>':
        return inst_tup > req_tup
    elif op == '<':
        return inst_tup < req_tup
    elif op == '!=':
        return inst_tup != req_tup
    return True

def main():
    if logger:
        logger.info("system", "Startup: Verifying dependencies...")
        
    script_dir = os.path.dirname(os.path.abspath(__file__))
    req_file = os.path.join(script_dir, 'requirements.txt')
    
    if not os.path.exists(req_file):
        if logger:
            logger.error("system", "Startup: requirements.txt not found!")
        return 1
        
    try:
        with open(req_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading requirements.txt: {e}")
        if logger:
            logger.error("system", f"Startup: Error reading requirements.txt: {e}")
        return 1

    missing_or_mismatched = False
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
            
        match = re.match(r'^([a-zA-Z0-9_\-]+)\s*(==|>=|<=|>|<|!=)\s*([a-zA-Z0-9\.\-_]+)', line)
        if match:
            pkg_name = match.group(1)
            op = match.group(2)
            req_ver = match.group(3)
        else:
            pkg_name = re.match(r'^([a-zA-Z0-9_\-]+)', line)
            if pkg_name:
                pkg_name = pkg_name.group(1)
                op = None
                req_ver = None
            else:
                continue
                
        inst_ver = None
        for name in (pkg_name, pkg_name.replace('-', '_'), pkg_name.replace('_', '-')):
            try:
                inst_ver = version(name)
                break
            except PackageNotFoundError:
                continue
                
        if inst_ver is None:
            print(f"[CHECK] Package '{pkg_name}' is not installed.")
            missing_or_mismatched = True
            break
            
        if op and req_ver:
            if not compare_versions(inst_ver, req_ver, op):
                print(f"[CHECK] Version mismatch for '{pkg_name}': installed {inst_ver}, required {op}{req_ver}")
                missing_or_mismatched = True
                break

    if missing_or_mismatched:
        if logger:
            logger.warn("system", "Startup: Dependencies are missing or outdated. Triggering installation.")
        return 1
        
    if logger:
        logger.success("system", "Startup: All dependencies are verified.")
    return 0

if __name__ == '__main__':
    sys.exit(main())
