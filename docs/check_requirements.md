# Module: check_requirements.py

The `check_requirements.py` script is a standalone verification script run during launcher startup using the virtual environment's Python executable. It checks whether the currently installed packages meet the constraints defined in `backend/requirements.txt`.

---

## Functions

### `parse_version`
* **Signature**: `parse_version(v_str: str) -> tuple[int, ...]`
* **Description**: Extracts all integer sequences from a package version string (e.g. `"3.0.0"` -> `(3, 0, 0)`) to enable clean numerical comparisons and ignore text suffixes (like `"post1"` or `"rc1"`).
* **Parameters**:
  - `v_str` (`str`): The version string to parse.
* **Returns**:
  - `tuple[int, ...]`: A tuple of integers representing the parsed version components.

---

### `compare_versions`
* **Signature**: `compare_versions(installed: str, required: str, op: str) -> bool`
* **Description**: Compares the installed version string against the required version string using the parsed integer tuples and a specific comparison operator.
* **Parameters**:
  - `installed` (`str`): The version currently installed in the environment.
  - `required` (`str`): The version threshold defined in requirements.
  - `op` (`str`): The comparison operator (`==`, `>=`, `<=`, `>`, `<`, `!=`).
* **Returns**:
  - `bool`: `True` if the installed version satisfies the operator constraint, `False` otherwise.

---

### `main`
* **Signature**: `main() -> int`
* **Description**: The main controller logic. It inserts the `backend` folder into `sys.path` to import `core.logger`. It reads `backend/requirements.txt`, parses constraints, validates package distribution versions (including dash/underscore normalization), logs startup metrics to `system_logs` via SQLite, and returns exit codes.
* **Returns**:
  - `int`: `0` if all dependencies are verified and satisfied, `1` if any are missing/mismatched or if errors occurred.
