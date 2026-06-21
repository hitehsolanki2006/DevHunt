import os
import json
import time
import uuid
from cryptography.fernet import Fernet
from config import KEYS_PATH, ENCRYPTION_SECRET, COOLING_DOWN_PERIOD

class KeyManager:
    def __init__(self):
        self.fernet = Fernet(ENCRYPTION_SECRET)
        self._current_key_index = 0  # round-robin pointer
        self._load_keys()

    def _load_keys(self):
        if not os.path.exists(KEYS_PATH):
            self.keys = []
            self._save_keys()
        else:
            try:
                with open(KEYS_PATH, 'r') as f:
                    self.keys = json.load(f)
            except Exception:
                self.keys = []

        # Migrate existing encrypted keys to OS keyring if any
        migrated = False
        import keyring
        for k in self.keys:
            if 'key_encrypted' in k:
                try:
                    decrypted = self._decrypt(k['key_encrypted'])
                    keyring.set_password("DevHunt", k['id'], decrypted)
                    del k['key_encrypted']
                    migrated = True
                except Exception as e:
                    print(f"Failed to migrate key {k.get('id')} to keyring: {e}")
        if migrated:
            self._save_keys()

    def _save_keys(self):
        with open(KEYS_PATH, 'w') as f:
            json.dump(self.keys, f, indent=4)

    def _encrypt(self, raw_key: str) -> str:
        return self.fernet.encrypt(raw_key.encode()).decode()

    def _decrypt(self, encrypted_key: str) -> str:
        return self.fernet.decrypt(encrypted_key.encode()).decode()

    def add_key(self, raw_key: str, label: str = None) -> dict:
        import keyring
        # Check if already exists
        for k in self.keys:
            try:
                decrypted = keyring.get_password("DevHunt", k['id'])
                if decrypted == raw_key:
                    return {"success": False, "message": "API Key already exists."}
            except Exception:
                pass

        if not label:
            label = f"Key_{str(uuid.uuid4())[:8]}"

        key_id = str(uuid.uuid4())
        try:
            keyring.set_password("DevHunt", key_id, raw_key)
        except Exception as e:
            return {"success": False, "message": f"Failed to store key in OS vault: {str(e)}"}

        new_key = {
            "id": key_id,
            "label": label,
            "status": "Active", # "Active", "Cooling Down", "Error", "Disabled"
            "cooldown_until": 0,
            "request_count": 0,
            "error_count": 0
        }
        self.keys.append(new_key)
        self._save_keys()
        return {"success": True, "key": self._mask_key(new_key)}

    def remove_key(self, key_id: str) -> bool:
        import keyring
        initial_len = len(self.keys)
        self.keys = [k for k in self.keys if k['id'] != key_id]
        if len(self.keys) != initial_len:
            self._save_keys()
            try:
                keyring.delete_password("DevHunt", key_id)
            except Exception:
                pass
            return True
        return False

    def update_key_status(self, key_id: str, status: str) -> bool:
        # status must be in ["Active", "Disabled"]
        for k in self.keys:
            if k['id'] == key_id:
                if status in ["Active", "Disabled"]:
                    k['status'] = status
                    if status == "Active":
                        k['cooldown_until'] = 0
                    self._save_keys()
                    return True
        return False

    def get_keys_list(self) -> list:
        # Clean up expired cooldowns before returning
        self._refresh_cooldowns()
        return [self._mask_key(k) for k in self.keys]

    def _mask_key(self, key_dict: dict) -> dict:
        import keyring
        try:
            decrypted = keyring.get_password("DevHunt", key_dict['id'])
            if decrypted:
                masked = decrypted[:6] + "..." + decrypted[-4:] if len(decrypted) > 10 else "..."
            else:
                masked = "not_found_in_vault"
        except Exception:
            masked = "error_reading_vault"
        
        return {
            "id": key_dict['id'],
            "label": key_dict['label'],
            "status": key_dict['status'],
            "masked_key": masked,
            "cooldown_until": key_dict['cooldown_until'],
            "request_count": key_dict['request_count'],
            "error_count": key_dict['error_count']
        }

    def _refresh_cooldowns(self):
        now = time.time()
        changed = False
        for k in self.keys:
            if k['status'] == "Cooling Down" and k['cooldown_until'] <= now:
                k['status'] = "Active"
                k['cooldown_until'] = 0
                changed = True
        if changed:
            self._save_keys()

    def get_active_key_string(self) -> tuple:
        """
        Round-robin selection across Active keys.
        Cycles through all keys so load is spread evenly.
        Falls back to any Active key if the current index is not Active.
        Returns (key_string, key_id) or (None, None).
        """
        import keyring
        self._refresh_cooldowns()
        active_keys = [k for k in self.keys if k['status'] == "Active"]
        if not active_keys:
            return None, None

        # Try to find a working key, up to len(active_keys) attempts
        for _ in range(len(active_keys)):
            self._current_key_index = self._current_key_index % len(active_keys)
            k = active_keys[self._current_key_index]
            self._current_key_index = (self._current_key_index + 1) % len(active_keys)

            try:
                decrypted_key = keyring.get_password("DevHunt", k['id'])
                if decrypted_key:
                    return decrypted_key, k['id']
                else:
                    raise Exception("Key not found in vault")
            except Exception as e:
                print("Key retrieval from vault failed in get_active_key_string:", e)
                k['status'] = "Error"
                self._save_keys()
                # Re-evaluate active keys list since we disabled one
                active_keys = [key for key in self.keys if key['status'] == "Active"]
                if not active_keys:
                    break

        return None, None

    def on_rate_limit_error(self, key_id: str):
        """
        Puts key on cooldown for 60 seconds.
        """
        for k in self.keys:
            if k['id'] == key_id:
                k['status'] = "Cooling Down"
                k['cooldown_until'] = time.time() + COOLING_DOWN_PERIOD
                k['error_count'] += 1
                self._save_keys()
                break

    def on_other_error(self, key_id: str):
        """
        Handles general errors. Only marks the key as Error if it's
        definitively invalid (bad key format, permission denied).
        Transient errors (network, server-side) just increment error_count
        and put the key on a short cooldown instead of killing it permanently.
        """
        for k in self.keys:
            if k['id'] == key_id:
                k['error_count'] += 1
                # Only permanently disable if error count is very high (likely truly broken)
                # For transient errors, use a short cooldown instead
                if k['error_count'] >= 5:
                    k['status'] = "Error"
                else:
                    # Short 30s cooldown for transient errors
                    k['status'] = "Cooling Down"
                    k['cooldown_until'] = time.time() + 30
                self._save_keys()
                break

    def on_success(self, key_id: str):
        """
        Increments request count for the key.
        """
        for k in self.keys:
            if k['id'] == key_id:
                k['request_count'] += 1
                self._save_keys()
                break
