/**
 * RampKit SDK Constants
 * Note: SDK_VERSION is updated by sync-versions.sh from package.json
 */
export declare const SDK_VERSION = "0.0.102";
export declare const ENDPOINTS: {
    readonly BASE_URL: "https://uustlzuvjmochxkxatfx.supabase.co/functions/v1";
    readonly APP_USERS: "/app-users";
    readonly APP_USER_EVENTS: "/app-user-events";
};
export declare const MANIFEST_BASE_URL = "https://dh1psiwzzzkgr.cloudfront.net";
export declare const STORAGE_KEYS: {
    readonly APP_USER_ID: "rk_user_id";
    readonly INSTALL_DATE: "rk_install_date";
    readonly LAUNCH_COUNT: "rk_launch_count";
    readonly LAST_LAUNCH: "rk_last_launch";
    readonly ONBOARDING_RESPONSES: "rk_onboarding_responses";
};
export declare const CAPABILITIES: readonly ["onboarding", "paywall_event_receiver", "haptic_feedback", "push_notifications"];
export declare const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c3RsenV2am1vY2h4a3hhdGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDM2NTUsImV4cCI6MjA3NzY3OTY1NX0.d5XsIMGnia4n9Pou0IidipyyEfSlwpXFoeDBufMOEwE";
