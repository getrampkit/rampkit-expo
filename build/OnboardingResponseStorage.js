"use strict";
/**
 * OnboardingResponseStorage
 * Manages persistent storage of onboarding variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingResponseStorage = void 0;
const RampKitNative_1 = require("./RampKitNative");
const constants_1 = require("./constants");
/**
 * Manages persistent storage of onboarding variables
 */
exports.OnboardingResponseStorage = {
    /**
     * Initialize with initial values from onboarding config
     */
    async initializeVariables(initialVariables) {
        try {
            await (0, RampKitNative_1.setStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_RESPONSES, JSON.stringify(initialVariables));
            if (__DEV__) {
                console.log("[RampKit] Initialized onboarding variables:", initialVariables);
            }
        }
        catch (error) {
            console.warn("[RampKit] Failed to initialize onboarding variables:", error);
        }
    },
    /**
     * Update variables (merges with existing)
     */
    async updateVariables(newVariables) {
        try {
            const current = await this.getVariables();
            const merged = { ...current, ...newVariables };
            await (0, RampKitNative_1.setStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_RESPONSES, JSON.stringify(merged));
            if (__DEV__) {
                console.log("[RampKit] Updated onboarding variables:", newVariables);
            }
        }
        catch (error) {
            console.warn("[RampKit] Failed to update onboarding variables:", error);
        }
    },
    /**
     * Get stored variables
     */
    async getVariables() {
        try {
            const jsonString = await (0, RampKitNative_1.getStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_RESPONSES);
            if (!jsonString) {
                return {};
            }
            return JSON.parse(jsonString);
        }
        catch (error) {
            console.warn("[RampKit] Failed to retrieve onboarding variables:", error);
            return {};
        }
    },
    /**
     * Clear all stored variables
     */
    async clearVariables() {
        try {
            await (0, RampKitNative_1.setStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_RESPONSES, "");
            if (__DEV__) {
                console.log("[RampKit] Cleared onboarding variables");
            }
        }
        catch (error) {
            console.warn("[RampKit] Failed to clear onboarding variables:", error);
        }
    },
};
