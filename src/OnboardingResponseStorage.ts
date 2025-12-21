/**
 * OnboardingResponseStorage
 * Manages persistent storage of onboarding responses
 */

import { getStoredValue, setStoredValue } from "./RampKitNative";
import { OnboardingResponse } from "./types";
import { STORAGE_KEYS } from "./constants";

/**
 * Manages persistent storage of onboarding responses
 */
export const OnboardingResponseStorage = {
  /**
   * Save a new response, merging with existing responses
   * If a response with the same questionId exists, it will be updated
   */
  async saveResponse(response: OnboardingResponse): Promise<void> {
    try {
      const responses = await this.retrieveResponses();

      // Update existing response for same questionId or append new
      const existingIndex = responses.findIndex(
        (r) => r.questionId === response.questionId
      );

      if (existingIndex >= 0) {
        responses[existingIndex] = response;
      } else {
        responses.push(response);
      }

      // Serialize and save
      await setStoredValue(
        STORAGE_KEYS.ONBOARDING_RESPONSES,
        JSON.stringify(responses)
      );

      if (__DEV__) {
        console.log(
          `[RampKit] Saved response for question: ${response.questionId}`
        );
      }
    } catch (error) {
      console.warn("[RampKit] Failed to save onboarding response:", error);
    }
  },

  /**
   * Retrieve all stored responses
   * @returns Array of OnboardingResponse objects, empty array if none found
   */
  async retrieveResponses(): Promise<OnboardingResponse[]> {
    try {
      const jsonString = await getStoredValue(STORAGE_KEYS.ONBOARDING_RESPONSES);
      if (!jsonString) {
        return [];
      }
      return JSON.parse(jsonString) as OnboardingResponse[];
    } catch (error) {
      console.warn("[RampKit] Failed to retrieve onboarding responses:", error);
      return [];
    }
  },

  /**
   * Clear all stored responses
   */
  async clearResponses(): Promise<void> {
    try {
      await setStoredValue(STORAGE_KEYS.ONBOARDING_RESPONSES, "");
      if (__DEV__) {
        console.log("[RampKit] Cleared all onboarding responses");
      }
    } catch (error) {
      console.warn("[RampKit] Failed to clear onboarding responses:", error);
    }
  },
};
