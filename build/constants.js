"use strict";
/**
 * RampKit SDK Constants
 * Note: SDK_VERSION is updated by sync-versions.sh from package.json
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPABASE_ANON_KEY = exports.CAPABILITIES = exports.STORAGE_KEYS = exports.MANIFEST_BASE_URL = exports.ENDPOINTS = exports.SDK_VERSION = void 0;
exports.SDK_VERSION = "0.0.100";
exports.ENDPOINTS = {
    BASE_URL: "https://uustlzuvjmochxkxatfx.supabase.co/functions/v1",
    APP_USERS: "/app-users",
    APP_USER_EVENTS: "/app-user-events",
};
exports.MANIFEST_BASE_URL = "https://dh1psiwzzzkgr.cloudfront.net";
exports.STORAGE_KEYS = {
    // SecureStore (sensitive)
    APP_USER_ID: "rk_user_id",
    // AsyncStorage (persisted)
    INSTALL_DATE: "rk_install_date",
    LAUNCH_COUNT: "rk_launch_count",
    LAST_LAUNCH: "rk_last_launch",
    // Onboarding responses (persisted)
    ONBOARDING_RESPONSES: "rk_onboarding_responses",
};
exports.CAPABILITIES = [
    "onboarding",
    "paywall_event_receiver",
    "haptic_feedback",
    "push_notifications",
];
// Supabase anon key for API calls
exports.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c3RsenV2am1vY2h4a3hhdGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDM2NTUsImV4cCI6MjA3NzY3OTY1NX0.d5XsIMGnia4n9Pou0IidipyyEfSlwpXFoeDBufMOEwE";
