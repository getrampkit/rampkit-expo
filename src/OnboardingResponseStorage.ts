/**
 * OnboardingResponseStorage
 * Manages persistent storage of onboarding state variables
 */

import { getStoredValue, setStoredValue } from "./RampKitNative";
import { STORAGE_KEYS } from "./constants";

/**
 * Represents the stored onboarding state
 */
export interface OnboardingState {
  /** The state variables as key-value pairs */
  variables: Record<string, any>;
  /** ISO 8601 timestamp when the state was last updated */
  updatedAt: string;
}

/**
 * Manages persistent storage of onboarding state variables
 */
export const OnboardingResponseStorage = {
  /**
   * Initialize the state with initial values from onboarding config
   * This should be called when onboarding starts
   */
  async initializeState(initialVariables: Record<string, any>): Promise<void> {
    try {
      const state: OnboardingState = {
        variables: { ...initialVariables },
        updatedAt: new Date().toISOString(),
      };

      await setStoredValue(
        STORAGE_KEYS.ONBOARDING_RESPONSES,
        JSON.stringify(state)
      );

      if (__DEV__) {
        console.log("[RampKit] Initialized onboarding state:", initialVariables);
      }
    } catch (error) {
      console.warn("[RampKit] Failed to initialize onboarding state:", error);
    }
  },

  /**
   * Update state with new variable values (merges with existing)
   */
  async updateState(newVariables: Record<string, any>): Promise<void> {
    try {
      const currentState = await this.retrieveState();

      const updatedState: OnboardingState = {
        variables: {
          ...currentState.variables,
          ...newVariables,
        },
        updatedAt: new Date().toISOString(),
      };

      await setStoredValue(
        STORAGE_KEYS.ONBOARDING_RESPONSES,
        JSON.stringify(updatedState)
      );

      if (__DEV__) {
        console.log("[RampKit] Updated onboarding state:", newVariables);
      }
    } catch (error) {
      console.warn("[RampKit] Failed to update onboarding state:", error);
    }
  },

  /**
   * Retrieve the stored state
   * @returns OnboardingState object with variables and timestamp
   */
  async retrieveState(): Promise<OnboardingState> {
    try {
      const jsonString = await getStoredValue(STORAGE_KEYS.ONBOARDING_RESPONSES);
      if (!jsonString) {
        return { variables: {}, updatedAt: "" };
      }
      return JSON.parse(jsonString) as OnboardingState;
    } catch (error) {
      console.warn("[RampKit] Failed to retrieve onboarding state:", error);
      return { variables: {}, updatedAt: "" };
    }
  },

  /**
   * Retrieve just the variables (convenience method)
   * @returns Record of variable name to value
   */
  async retrieveVariables(): Promise<Record<string, any>> {
    const state = await this.retrieveState();
    return state.variables;
  },

  /**
   * Clear all stored state
   */
  async clearState(): Promise<void> {
    try {
      await setStoredValue(STORAGE_KEYS.ONBOARDING_RESPONSES, "");
      if (__DEV__) {
        console.log("[RampKit] Cleared onboarding state");
      }
    } catch (error) {
      console.warn("[RampKit] Failed to clear onboarding state:", error);
    }
  },

  // Legacy aliases for backwards compatibility
  async clearResponses(): Promise<void> {
    return this.clearState();
  },
};
