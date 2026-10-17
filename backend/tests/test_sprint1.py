import os
import sys
import unittest
import tempfile
import shutil
import time

# Ensure backend directory is in sys.path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import app
from core.rag_pipeline import fetch_public
from core.terminal_engine import TerminalEngine


class TestSafePath(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="devhunt_test_workspace_")
        self.old_workspace = app.WORKSPACE_DIR
        app.WORKSPACE_DIR = self.test_dir

    def tearDown(self):
        app.WORKSPACE_DIR = self.old_workspace
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_valid_special_character_paths(self):
        valid_paths = [
            "src/index.js",
            "notes#1.md",
            "[id].jsx",
            "a+b.txt",
            "résumé.md",
            "my folder/it's test.py"
        ]
        for p in valid_paths:
            resolved = app.safe_path(p)
            self.assertTrue(resolved.startswith(os.path.realpath(self.test_dir)))

    def test_directory_traversal_blocked(self):
        traversals = [
            "../outside.txt",
            "../../etc/passwd",
            "..\\..\\windows\\system32\\calc.exe",
            "sub/../../outside.txt"
        ]
        for p in traversals:
            with self.assertRaises((PermissionError, ValueError)):
                app.safe_path(p)

    def test_reserved_windows_names_blocked(self):
        reserved = ["CON", "prn.txt", "aux", "NUL.log", "com1", "lpt9.dat"]
        for p in reserved:
            with self.assertRaises(PermissionError):
                app.safe_path(p)

    def test_trailing_dots_and_spaces_blocked(self):
        invalid = ["file. ", "folder./file", "test.txt..."]
        for p in invalid:
            with self.assertRaises(PermissionError):
                app.safe_path(p)

    def test_workspace_root_restriction(self):
        with self.assertRaises(PermissionError):
            app.safe_path(".", allow_root=False)
        
        root_path = app.safe_path(".", allow_root=True)
        self.assertEqual(root_path, os.path.realpath(self.test_dir))


class TestAtomicWrite(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="devhunt_test_atomic_")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_atomic_write_and_eol(self):
        file_path = os.path.join(self.test_dir, "test.txt")
        app.write_text_atomic(file_path, "line1\nline2\n", eol="\r\n")
        
        with open(file_path, "rb") as f:
            content = f.read()
        self.assertEqual(content, b"line1\r\nline2\r\n")

    def test_conflict_detection_mtime(self):
        file_path = os.path.join(self.test_dir, "conflict.txt")
        app.write_text_atomic(file_path, "initial content\n")
        
        initial_mtime = os.stat(file_path).st_mtime_ns
        
        # Another process updates file
        time.sleep(0.01)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("external modification\n")
            
        new_mtime = os.stat(file_path).st_mtime_ns
        self.assertNotEqual(initial_mtime, new_mtime)

        # Attempting to save with old expected mtime must raise FileChangedError
        with self.assertRaises(app.FileChangedError):
            app.write_text_atomic(file_path, "my edit\n", expected_mtime_ns=initial_mtime)


class TestSSRFProtection(unittest.TestCase):
    def test_block_private_and_loopback_ips(self):
        private_urls = [
            "http://127.0.0.1:8000/secret",
            "http://localhost:5000/admin",
            "http://10.0.0.1/metadata",
            "http://192.168.1.1/router",
            "http://169.254.169.254/latest/meta-data/"
        ]
        for url in private_urls:
            with self.assertRaises(ValueError):
                fetch_public(url)

    def test_block_non_http_schemes(self):
        invalid_schemes = [
            "file:///etc/passwd",
            "gopher://example.com",
            "ftp://example.com"
        ]
        for url in invalid_schemes:
            with self.assertRaises(ValueError):
                fetch_public(url)


class TestTerminalEngineSecurity(unittest.TestCase):
    def setUp(self):
        self.engine = TerminalEngine()

    def test_calc_safe_evaluation(self):
        result, _ = self.engine.cmd_calc(["2", "+", "2", "*", "3"], "/dummy")
        self.assertIn("8", result)

        result, _ = self.engine.cmd_calc(["(100 - 20) / 4"], "/dummy")
        self.assertIn("20", result)

    def test_calc_blocks_sandbox_escape(self):
        dangerous_expressions = [
            "__import__('os').system('calc')",
            "open('test.txt')",
            "exec('1+1')",
            "eval('1+1')",
            "().__class__.__base__.__subclasses__()"
        ]
        for expr in dangerous_expressions:
            result, _ = self.engine.cmd_calc([expr], "/dummy")
            self.assertTrue("Error" in result or "Unsupported" in result)

    def test_git_blocks_dangerous_flags(self):
        dangerous_git_commands = [
            ["-c", "core.pager=calc", "status"],
            ["--config=core.pager=calc", "status"],
            ["--exec-path=C:\\malicious", "version"]
        ]
        for cmd_args in dangerous_git_commands:
            result, _ = self.engine.cmd_git(cmd_args, "/dummy")
            self.assertIn("Security policy forbids", result)


class TestWorkspaceValidation(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="devhunt_test_ws_val_")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_validate_workspace_path_valid(self):
        err, code = app._validate_workspace_path(self.test_dir)
        self.assertIsNone(err)
        self.assertEqual(code, 200)

    def test_validate_workspace_path_invalid_drive(self):
        err, code = app._validate_workspace_path("relative/path/not/abs")
        self.assertIsNotNone(err)
        self.assertEqual(code, 400)

    def test_validate_workspace_path_non_existent(self):
        non_existent = os.path.join(self.test_dir, "does_not_exist_xyz123")
        err, code = app._validate_workspace_path(non_existent)
        self.assertEqual(err, "Directory does not exist")
        self.assertEqual(code, 400)

    def test_get_project_tree_safe(self):
        with open(os.path.join(self.test_dir, "sample.txt"), "w") as f:
            f.write("hello")
        old_ws = app.WORKSPACE_DIR
        app.WORKSPACE_DIR = self.test_dir
        try:
            tree = app.get_project_tree(self.test_dir)
            self.assertEqual(len(tree), 1)
            self.assertEqual(tree[0]["name"], "sample.txt")
        finally:
            app.WORKSPACE_DIR = old_ws

    def test_select_folder_endpoint_cancelled(self):
        with app.app.test_client() as client:
            orig = app._open_native_folder_dialog
            app._open_native_folder_dialog = lambda: (None, True)
            try:
                res = client.post('/api/ide/select-folder', headers={"X-DevHunt-Token": app.API_TOKEN})
                data = res.get_json()
                self.assertTrue(data.get("success"))
                self.assertTrue(data.get("cancelled"))
            finally:
                app._open_native_folder_dialog = orig

    def test_select_folder_endpoint_success(self):
        with app.app.test_client() as client:
            orig = app._open_native_folder_dialog
            app._open_native_folder_dialog = lambda: (self.test_dir, False)
            try:
                res = client.post('/api/ide/select-folder', headers={"X-DevHunt-Token": app.API_TOKEN})
                data = res.get_json()
                self.assertTrue(data.get("success"))
                self.assertEqual(data.get("path"), os.path.realpath(self.test_dir))
                self.assertFalse(data.get("cancelled"))
            finally:
                app._open_native_folder_dialog = orig


if __name__ == "__main__":
    unittest.main()
