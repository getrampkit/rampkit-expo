/**
 * OnboardingResponseStorage
 * Manages persistent storage of onboarding variables
 */

import { getStoredValue, setStoredValue } from "./RampKitNative";
import { STORAGE_KEYS } from "./constants";

/**
 * Manages persistent storage of onboarding variables
 */
export const OnboardingResponseStorage = {
  /**
   * Initialize with initial values from onboarding config
   */
  async initializeVariables(initialVariables: Record<string, any>): Promise<void> {
    try {
      await setStoredValue(
        STORAGE_KEYS.ONBOARDING_RESPONSES,
        JSON.stringify(initialVariables)
      );

      if (__DEV__) {
        console.log("[RampKit] Initialized onboarding variables:", initialVariables);
      }
    } catch (error) {
      console.warn("[RampKit] Failed to initialize onboarding variables:", error);
    }
  },

  /**
   * Update variables (merges with existing)
   */
  async updateVariables(newVariables: Record<string, any>): Promise<void> {
    try {
      const current = await this.getVariables();
      const merged = { ...current, ...newVariables };

      await setStoredValue(
        STORAGE_KEYS.ONBOARDING_RESPONSES,
        JSON.stringify(merged)
      );

      if (__DEV__) {
        console.log("[RampKit] Updated onboarding variables:", newVariables);
      }
    } catch (error) {
      console.warn("[RampKit] Failed to update onboarding variables:", error);
    }
  },

  /**
   * Get stored variables
   */
  async getVariables(): Promise<Record<string, any>> {
    try {
      const jsonString = await getStoredValue(STORAGE_KEYS.ONBOARDING_RESPONSES);
      if (!jsonString) {
        return {};
      }
      return JSON.parse(jsonString) as Record<string, any>;
    } catch (error) {
      console.warn("[RampKit] Failed to retrieve onboarding variables:", error);
      return {};
    }
  },

  /**
   * Clear all stored variables
   */
  async clearVariables(): Promise<void> {
    try {
      await setStoredValue(STORAGE_KEYS.ONBOARDING_RESPONSES, "");
      if (__DEV__) {
        console.log("[RampKit] Cleared onboarding variables");
      }
    } catch (error) {
      console.warn("[RampKit] Failed to clear onboarding variables:", error);
    }
  },
};
