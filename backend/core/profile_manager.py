import os
import json
from datetime import datetime, timedelta
from config import PROFILE_PATH, SETTINGS_PATH

class ProfileManager:
    @staticmethod
    def get_profile() -> dict:
        if not os.path.exists(PROFILE_PATH):
            default_profile = {
                "name": "",
                "goal": "Learn and grow",
                "current_skills": [],
                "target_skills": [],
                "daily_study_time": 60, # in minutes
                "start_date": datetime.today().strftime('%Y-%m-%d'),
                "streak_counter": 0,
                "last_activity_date": None
            }
            ProfileManager.save_profile(default_profile)
            return default_profile
        
        try:
            with open(PROFILE_PATH, 'r') as f:
                return json.load(f)
        except Exception:
            # return fallback
            return {}

    @staticmethod
    def save_profile(profile_data: dict):
        with open(PROFILE_PATH, 'w') as f:
            json.dump(profile_data, f, indent=4)

    @staticmethod
    def update_profile(updates: dict) -> dict:
        profile = ProfileManager.get_profile()
        for k, v in updates.items():
            if k in ['name', 'goal', 'current_skills', 'target_skills', 'daily_study_time', 'start_date', 'streak_counter', 'last_activity_date']:
                profile[k] = v
        ProfileManager.save_profile(profile)
        return profile

    @staticmethod
    def increment_streak() -> dict:
        profile = ProfileManager.get_profile()
        today_str = datetime.today().strftime('%Y-%m-%d')
        last_active_str = profile.get("last_activity_date")
        
        if not last_active_str:
            profile["streak_counter"] = 1
        else:
            try:
                last_active = datetime.strptime(last_active_str, '%Y-%m-%d').date()
                today = datetime.today().date()
                delta = today - last_active
                
                if delta == timedelta(days=1):
                    profile["streak_counter"] += 1
                elif delta > timedelta(days=1):
                    profile["streak_counter"] = 1
                # If delta == 0 (already active today), streak stays the same
            except Exception:
                profile["streak_counter"] = 1
                
        profile["last_activity_date"] = today_str
        ProfileManager.save_profile(profile)
        return profile

    @staticmethod
    def get_settings() -> dict:
        if not os.path.exists(SETTINGS_PATH):
            default_settings = {
                "english_correction": False,
                "selected_model": "auto", # "auto", "gemini-2.0-flash", "gemini-1.5-pro"
                "dismissed_update": None,
                "read_notifications": [],
                "theme": "slate",
                "icon_theme": "emoji",
                "terminal_username": "guest",
                "terminal_hostname": "devhunt",
                "terminal_prompt_symbol": "$",
                "terminal_sound": True,
                "font_size_editor": 14,
                "font_size_terminal": 13,
                "font_family_editor": "JetBrains Mono",
                "font_family_terminal": "JetBrains Mono",
                "font_family_system": "Inter",
                "canvas_particles": True,
                "sound_effects": True,
                "temperature": 0.7,
                "max_tokens": 2048,
                "system_prompt": (
                    "You are the DevHunt AI Core Copilot, a high-performance, gamified cyber-hunting developer assistant.\n"
                    "Your mission is to help the user hunt down bugs, optimize code, master new engineering concepts, and complete quests.\n"
                    "- Tone: Crisp, technically precise, and sleek. Use occasional subtle cyberpunk/command-line references.\n"
                    "- Output Format: Use clean, structured Markdown, with bold headings, lists, and code blocks.\n"
                    "- Action tags: Trigger Quest Board actions ([TODO_ADD], [TODO_COMPLETE]) ONLY when explicitly instructed by the user.\n"
                    "Keep it pro, stylish, and direct."
                ),
                "read_notifications": [],
                "dismissed_notifications": [],
                "shortcuts": {
                    "toggleSidebar": "Ctrl+B",
                    "saveFile": "Ctrl+S",
                    "focusChat": "Ctrl+K",
                    "newFile": "Ctrl+N",
                    "openTerminal": "Ctrl+Shift+P",
                    "clearEditor": "Ctrl+Alt+C",
                    "refreshExplorer": "Ctrl+Alt+R"
                },
                "feature_toggles": {
                    "music": True,
                    "path": True,
                    "quests": True,
                    "vault": True,
                    "doc-analysis": True,
                    "arcade": True,
                    "linkedin": True,
                    "search": True,
                    "stats": True,
                    "terminal": True,
                    "notifications": True
                }
            }
            ProfileManager.save_settings(default_settings)
            return default_settings
            
        try:
            with open(SETTINGS_PATH, 'r') as f:
                data = json.load(f)
                if "read_notifications" not in data:
                    data["read_notifications"] = []
                if "dismissed_notifications" not in data:
                    data["dismissed_notifications"] = []
                if "theme" not in data:
                    data["theme"] = "slate"
                if "icon_theme" not in data:
                    data["icon_theme"] = "emoji"
                if "terminal_username" not in data:
                    data["terminal_username"] = "guest"
                if "terminal_hostname" not in data:
                    data["terminal_hostname"] = "devhunt"
                if "terminal_prompt_symbol" not in data:
                    data["terminal_prompt_symbol"] = "$"
                if "terminal_sound" not in data:
                    data["terminal_sound"] = True
                if "font_size_editor" not in data:
                    data["font_size_editor"] = 14
                if "font_size_terminal" not in data:
                    data["font_size_terminal"] = 13
                if "font_family_editor" not in data:
                    data["font_family_editor"] = "JetBrains Mono"
                if "font_family_terminal" not in data:
                    data["font_family_terminal"] = "JetBrains Mono"
                if "font_family_system" not in data:
                    data["font_family_system"] = "Inter"
                if "canvas_particles" not in data:
                    data["canvas_particles"] = True
                if "sound_effects" not in data:
                    data["sound_effects"] = True
                if "temperature" not in data:
                    data["temperature"] = 0.7
                if "max_tokens" not in data:
                    data["max_tokens"] = 2048
                if "system_prompt" not in data or not data["system_prompt"]:
                    data["system_prompt"] = (
                        "You are the DevHunt AI Core Copilot, a high-performance, gamified cyber-hunting developer assistant.\n"
                        "Your mission is to help the user hunt down bugs, optimize code, master new engineering concepts, and complete quests.\n"
                        "- Tone: Crisp, technically precise, and sleek. Use occasional subtle cyberpunk/command-line references.\n"
                        "- Output Format: Use clean, structured Markdown, with bold headings, lists, and code blocks.\n"
                        "- Action tags: Trigger Quest Board actions ([TODO_ADD], [TODO_COMPLETE]) ONLY when explicitly instructed by the user.\n"
                        "Keep it pro, stylish, and direct."
                    )
                if "shortcuts" not in data:
                    data["shortcuts"] = {
                        "toggleSidebar": "Ctrl+B",
                        "saveFile": "Ctrl+S",
                        "focusChat": "Ctrl+K",
                        "newFile": "Ctrl+N",
                        "openTerminal": "Ctrl+Shift+P",
                        "clearEditor": "Ctrl+Alt+C",
                        "refreshExplorer": "Ctrl+Alt+R"
                    }
                if "feature_toggles" not in data:
                    data["feature_toggles"] = {
                        "music": True,
                        "path": True,
                        "quests": True,
                        "vault": True,
                        "doc-analysis": True,
                        "arcade": True,
                        "linkedin": True,
                        "search": True,
                        "stats": True,
                        "terminal": True,
                        "notifications": True
                    }
                else:
                    for k in ["music", "path", "quests", "vault", "doc-analysis", "arcade", "linkedin", "search", "stats", "terminal", "notifications"]:
                        if k not in data["feature_toggles"]:
                            data["feature_toggles"][k] = True
                return data
        except Exception:
            return {}

    @staticmethod
    def save_settings(settings_data: dict):
        with open(SETTINGS_PATH, 'w') as f:
            json.dump(settings_data, f, indent=4)

    @staticmethod
    def update_settings(updates: dict) -> dict:
        settings = ProfileManager.get_settings()
        allowed = [
            'english_correction', 'selected_model', 'dismissed_update',
            'read_notifications', 'dismissed_notifications', 'feature_toggles', 'theme',
            'terminal_username', 'terminal_hostname', 'terminal_prompt_symbol',
            'terminal_sound', 'font_size_editor', 'font_size_terminal',
            'font_family_editor', 'font_family_terminal', 'font_family_system', 'canvas_particles',
            'sound_effects', 'temperature', 'max_tokens', 'system_prompt',
            'shortcuts', 'icon_theme'
        ]
        for k, v in updates.items():
            if k in allowed:
                settings[k] = v
        ProfileManager.save_settings(settings)
        return settings
