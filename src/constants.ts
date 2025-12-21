/**
 * RampKit SDK Constants
 */

export const SDK_VERSION = "1.0.0";

export const ENDPOINTS = {
  BASE_URL: "https://uustlzuvjmochxkxatfx.supabase.co/functions/v1",
  APP_USERS: "/app-users",
  APP_USER_EVENTS: "/app-user-events",
} as const;

export const MANIFEST_BASE_URL = "https://dh1psiwzzzkgr.cloudfront.net";

export const STORAGE_KEYS = {
  // SecureStore (sensitive)
  APP_USER_ID: "rk_user_id",
  // AsyncStorage (persisted)
  INSTALL_DATE: "rk_install_date",
  LAUNCH_COUNT: "rk_launch_count",
  LAST_LAUNCH: "rk_last_launch",
  // Onboarding responses (persisted)
  ONBOARDING_RESPONSES: "rk_onboarding_responses",
} as const;

export const CAPABILITIES = [
  "onboarding",
  "paywall_event_receiver",
  "haptic_feedback",
  "push_notifications",
] as const;

// Supabase anon key for API calls
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c3RsenV2am1vY2h4a3hhdGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDM2NTUsImV4cCI6MjA3NzY3OTY1NX0.d5XsIMGnia4n9Pou0IidipyyEfSlwpXFoeDBufMOEwE";

