# Module: core.todo_manager (TodoManager)

The `TodoManager` class handles all CRUD (Create, Read, Update, Delete) transactions for the Quest Board (Kanban tasks) against the local SQLite database. It is also integrated with the system logger to log activity events under the `"todo"` category.

---

## Methods

### `get_todos`
* **Signature**: `get_todos(status_filter: str = None, priority_filter: str = None, source_filter: str = None) -> list[dict]`
* **Description**: Queries the `todos` table and returns a list of task records matching the provided filters. Deserializes task tags from JSON format.
* **Parameters**:
  - `status_filter` (`str`, optional): Filter by task status (`pending`, `in_progress`, `done`).
  - `priority_filter` (`str`, optional): Filter by priority (`high`, `medium`, `low`).
  - `source_filter` (`str`, optional): Filter by source (`manual`, `ai_detected`).
* **Returns**:
  - `list[dict]`: List of dictionary objects containing task details.

---

### `create_todo`
* **Signature**: `create_todo(title: str, description: str = "", priority: str = "medium", status: str = "pending", due_date: str = None, tags: list = None, source: str = "manual") -> dict`
* **Description**: Inserts a new task record into the database, registers a success log entry under the `"todo"` category in `system_logs`, and returns the newly created task dictionary.
* **Parameters**:
  - `title` (`str`): The title of the task.
  - `description` (`str`): Optional detail text.
  - `priority` (`str`): Task priority.
  - `status` (`str`): Task status.
  - `due_date` (`str`): Optional due date string.
  - `tags` (`list`): Optional tags list.
  - `source` (`str`): Origin of the task.
* **Returns**:
  - `dict`: The created task dictionary including its auto-incremented database `id`.

---

### `update_todo`
* **Signature**: `update_todo(todo_id: int, updates: dict) -> bool`
* **Description**: Dynamically updates specific fields of a task record in the database. Logs updates under the `"todo"` category (creates a success log for completion if status changes to `"done"`, or info log otherwise).
* **Parameters**:
  - `todo_id` (`int`): The database ID of the target task.
  - `updates` (`dict`): Key-value pairs of fields to modify.
* **Returns**:
  - `bool`: `True` if the update affected one or more rows, `False` otherwise.

---

### `delete_todo`
* **Signature**: `delete_todo(todo_id: int) -> bool`
* **Description**: Deletes a task record from the database and logs a warning message under the `"todo"` category in `system_logs`.
* **Parameters**:
  - `todo_id` (`int`): The database ID of the task to delete.
* **Returns**:
  - `bool`: `True` if deletion affected rows, `False` otherwise.

---

### `complete_todo`
* **Signature**: `complete_todo(todo_id: int) -> bool`
* **Description**: Syntactic wrapper around `update_todo` to mark a specific task's status as `"done"`.
* **Parameters**:
  - `todo_id` (`int`): The database ID of the target task.
* **Returns**:
  - `bool`: `True` if successfully marked complete, `False` otherwise.
