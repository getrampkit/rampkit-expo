"use strict";
/**
 * OnboardingResponseStorage
 * Manages persistent storage of onboarding responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingResponseStorage = void 0;
const RampKitNative_1 = require("./RampKitNative");
const constants_1 = require("./constants");
/**
 * Manages persistent storage of onboarding responses
 */
exports.OnboardingResponseStorage = {
    /**
     * Save a new response, merging with existing responses
     * If a response with the same questionId exists, it will be updated
     */
    async saveResponse(response) {
        try {
            const responses = await this.retrieveResponses();
            // Update existing response for same questionId or append new
            const existingIndex = responses.findIndex((r) => r.questionId === response.questionId);
            if (existingIndex >= 0) {
                responses[existingIndex] = response;
            }
            else {
                responses.push(response);
            }
            // Serialize and save
            await (0, RampKitNative_1.setStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_RESPONSES, JSON.stringify(responses));
            if (__DEV__) {
                console.log(`[RampKit] Saved response for question: ${response.questionId}`);
            }
        }
        catch (error) {
            console.warn("[RampKit] Failed to save onboarding response:", error);
        }
    },
    /**
     * Retrieve all stored responses
     * @returns Array of OnboardingResponse objects, empty array if none found
     */
    async retrieveResponses() {
        try {
            const jsonString = await (0, RampKitNative_1.getStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_RESPONSES);
            if (!jsonString) {
                return [];
            }
            return JSON.parse(jsonString);
        }
        catch (error) {
            console.warn("[RampKit] Failed to retrieve onboarding responses:", error);
            return [];
        }
    },
    /**
     * Clear all stored responses
     */
    async clearResponses() {
        try {
            await (0, RampKitNative_1.setStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_RESPONSES, "");
            if (__DEV__) {
                console.log("[RampKit] Cleared all onboarding responses");
            }
        }
        catch (error) {
            console.warn("[RampKit] Failed to clear onboarding responses:", error);
        }
    },
};
