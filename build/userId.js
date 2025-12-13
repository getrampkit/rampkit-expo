"use strict";
/**
 * RampKit User ID
 * Uses native module for secure storage
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAMPKIT_USER_ID_KEY = void 0;
exports.getRampKitUserId = getRampKitUserId;
const RampKitNative_1 = __importDefault(require("./RampKitNative"));
exports.RAMPKIT_USER_ID_KEY = "rk_user_id";
/**
 * Get or create a unique RampKit user ID
 * Uses native Keychain (iOS) / SharedPreferences (Android) for storage
 */
async function getRampKitUserId() {
    try {
        const userId = await RampKitNative_1.default.getUserId();
        return userId;
    }
    catch (error) {
        console.warn("[RampKit] UserId: Failed to get from native module", error);
        // Fallback to generating a new UUID
        return generateFallbackUuid();
    }
}
/**
 * Generate a fallback UUID when native module is not available
 */
function generateFallbackUuid() {
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
    return "rk_" + uuid;
}
