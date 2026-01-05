"use strict";
/**
 * OnboardingResponseStorage
 * Manages persistent storage of onboarding variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingResponseStorage = void 0;
const RampKitNative_1 = require("./RampKitNative");
const constants_1 = require("./constants");
const Logger_1 = require("./Logger");
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
            Logger_1.Logger.verbose("Initialized onboarding variables");
        }
        catch (error) {
            Logger_1.Logger.warn("Failed to initialize onboarding variables:", error);
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
            Logger_1.Logger.verbose("Updated onboarding variables");
        }
        catch (error) {
            Logger_1.Logger.warn("Failed to update onboarding variables:", error);
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
            Logger_1.Logger.warn("Failed to retrieve onboarding variables:", error);
            return {};
        }
    },
    /**
     * Clear all stored variables
     */
    async clearVariables() {
        try {
            await (0, RampKitNative_1.setStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_RESPONSES, "");
            Logger_1.Logger.verbose("Cleared onboarding variables");
        }
        catch (error) {
            Logger_1.Logger.warn("Failed to clear onboarding variables:", error);
        }
    },
};
