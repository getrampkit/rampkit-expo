/**
 * RampKit User ID
 * Uses native module for secure storage
 */

import RampKitNative from "./RampKitNative";

export const RAMPKIT_USER_ID_KEY = "rk_user_id";

/**
 * Get or create a unique RampKit user ID
 * Uses native Keychain (iOS) / SharedPreferences (Android) for storage
 */
export async function getRampKitUserId(): Promise<string> {
  try {
    const userId = await RampKitNative.getUserId();
    return userId;
  } catch (error) {
    console.warn("[RampKit] UserId: Failed to get from native module", error);
    // Fallback to generating a new UUID
    return generateFallbackUuid();
  }
}

/**
 * Generate a fallback UUID when native module is not available
 */
function generateFallbackUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
