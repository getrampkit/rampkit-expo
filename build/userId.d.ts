/**
 * RampKit User ID
 * Uses native module for secure storage
 */
export declare const RAMPKIT_USER_ID_KEY = "rk_user_id";
/**
 * Get or create a unique RampKit user ID
 * Uses native Keychain (iOS) / SharedPreferences (Android) for storage
 */
export declare function getRampKitUserId(): Promise<string>;
