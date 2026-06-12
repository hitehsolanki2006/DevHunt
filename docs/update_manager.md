# Module: core.update_manager (UpdateManager)

The `UpdateManager` class manages git update operations. It checks if the local repository is behind the remote tracking branch, fetches remote changes, and pulls updates while preserving local configurations.

---

## Methods

### `_run_git`
* **Signature**: `_run_git(args: list[str], timeout: int = 15) -> str`
* **Description**: Executes a raw git command using a subprocess runner from the project root directory. Captures stdout/stderr, and raises exceptions on timeouts or non-zero exit statuses.
* **Parameters**:
  - `args` (`list[str]`): List of arguments to pass to the git executable.
  - `timeout` (`int`): Timeout limits in seconds.
* **Returns**:
  - `str`: Stripped stdout string of the command.

---

### `check_for_updates`
* **Signature**: `check_for_updates() -> dict`
* **Description**: Verifies if the local directory is inside a worktree. Fetches upstream origin commits. Compares local commit hash (`HEAD`) with tracking branch hash. If behind, queries remote-only logs and returns details of available commits.
* **Returns**:
  - `dict`: Update status containing `success`, `update_available` (`bool`), `current_commit`, `latest_commit`, `commits` list, and `current_branch`.

---

### `apply_update`
* **Signature**: `apply_update() -> dict`
* **Description**: Pulls updates from remote. If modified files exist locally, it runs a git stash sequence to preserve modifications before running the git pull command, pops the stash afterward, resolves conflicts, and logs events to `system_logs`.
* **Returns**:
  - `dict`: Success status and `conflict` flag.
