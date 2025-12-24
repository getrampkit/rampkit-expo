"use strict";
/**
 * OnboardingResponseStorage
 * Manages persistent storage of onboarding state variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingResponseStorage = void 0;
const RampKitNative_1 = require("./RampKitNative");
const constants_1 = require("./constants");
/**
 * Manages persistent storage of onboarding state variables
 */
exports.OnboardingResponseStorage = {
    /**
     * Initialize the state with initial values from onboarding config
     * This should be called when onboarding starts
     */
    async initializeState(initialVariables) {
        try {
            const state = {
                variables: { ...initialVariables },
                updatedAt: new Date().toISOString(),
            };
            await (0, RampKitNative_1.setStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_RESPONSES, JSON.stringify(state));
            if (__DEV__) {
                console.log("[RampKit] Initialized onboarding state:", initialVariables);
            }
        }
        catch (error) {
            console.warn("[RampKit] Failed to initialize onboarding state:", error);
        }
    },
    /**
     * Update state with new variable values (merges with existing)
     */
    async updateState(newVariables) {
        try {
            const currentState = await this.retrieveState();
            const updatedState = {
                variables: {
                    ...currentState.variables,
                    ...newVariables,
                },
                updatedAt: new Date().toISOString(),
            };
            await (0, RampKitNative_1.setStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_RESPONSES, JSON.stringify(updatedState));
            if (__DEV__) {
                console.log("[RampKit] Updated onboarding state:", newVariables);
            }
        }
        catch (error) {
            console.warn("[RampKit] Failed to update onboarding state:", error);
        }
    },
    /**
     * Retrieve the stored state
     * @returns OnboardingState object with variables and timestamp
     */
    async retrieveState() {
        try {
            const jsonString = await (0, RampKitNative_1.getStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_RESPONSES);
            if (!jsonString) {
                return { variables: {}, updatedAt: "" };
            }
            return JSON.parse(jsonString);
        }
        catch (error) {
            console.warn("[RampKit] Failed to retrieve onboarding state:", error);
            return { variables: {}, updatedAt: "" };
        }
    },
    /**
     * Retrieve just the variables (convenience method)
     * @returns Record of variable name to value
     */
    async retrieveVariables() {
        const state = await this.retrieveState();
        return state.variables;
    },
    /**
     * Clear all stored state
     */
    async clearState() {
        try {
            await (0, RampKitNative_1.setStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_RESPONSES, "");
            if (__DEV__) {
                console.log("[RampKit] Cleared onboarding state");
            }
        }
        catch (error) {
            console.warn("[RampKit] Failed to clear onboarding state:", error);
        }
    },
    // Legacy aliases for backwards compatibility
    async clearResponses() {
        return this.clearState();
    },
};
