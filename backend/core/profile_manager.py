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
                "feature_toggles": {
                    "music": True,
                    "path": True,
                    "quests": True,
                    "vault": True,
                    "doc-analysis": True,
                    "arcade": True
                }
            }
            ProfileManager.save_settings(default_settings)
            return default_settings
            
        try:
            with open(SETTINGS_PATH, 'r') as f:
                # Add default key if missing in existing file
                data = json.load(f)
                if "read_notifications" not in data:
                    data["read_notifications"] = []
                if "feature_toggles" not in data:
                    data["feature_toggles"] = {
                        "music": True,
                        "path": True,
                        "quests": True,
                        "vault": True,
                        "doc-analysis": True,
                        "arcade": True
                    }
                else:
                    if "arcade" not in data["feature_toggles"]:
                        data["feature_toggles"]["arcade"] = True
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
        for k, v in updates.items():
            if k in ['english_correction', 'selected_model', 'dismissed_update', 'read_notifications', 'feature_toggles']:
                settings[k] = v
        ProfileManager.save_settings(settings)
        return settings
