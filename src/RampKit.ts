/**
 * RampKit Core SDK
 * Main SDK class for RampKit Expo integration
 */

import { AppState } from "react-native";
import {
  preloadRampkitOverlay,
  showRampkitOverlay,
  closeRampkitOverlay,
} from "./RampkitOverlay";
import { getRampKitUserId } from "./userId";
import {
  collectDeviceInfo,
  getSessionDurationSeconds,
  resetSession,
  buildRampKitContext,
} from "./DeviceInfoCollector";
import { eventManager } from "./EventManager";
import { TransactionObserver } from "./RampKitNative";
import { DeviceInfo, RampKitConfig, EventContext, RampKitContext, NavigationData, OnboardingResponse } from "./types";
import { ENDPOINTS, SUPABASE_ANON_KEY, MANIFEST_BASE_URL } from "./constants";
import { OnboardingResponseStorage } from "./OnboardingResponseStorage";

export class RampKitCore {
  private static _instance: RampKitCore;
  private config: RampKitConfig | null = null;
  private onboardingData: any = null;
  private userId: string | null = null;
  private appId: string | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private onOnboardingFinished?: (payload?: any) => void;
  private onShowPaywall?: (payload?: any) => void;
  private appStateSubscription: any = null;
  private lastAppState: string = "active";
  private initialized: boolean = false;
  /** Custom App User ID provided by the developer (alias for their user system) */
  private appUserID: string | null = null;

  static get instance() {
    if (!this._instance) this._instance = new RampKitCore();
    return this._instance;
  }

  /**
   * Configure the RampKit SDK
   * @param config Configuration options including appId, callbacks, and optional appUserID
   */
  async configure(config: RampKitConfig): Promise<void> {
    this.config = config;
    this.appId = config.appId;
    this.onOnboardingFinished = config.onOnboardingFinished;
    this.onShowPaywall = config.onShowPaywall || config.showPaywall;

    // Store custom App User ID if provided (this is an alias, not the RampKit user ID)
    if (config.appUserID) {
      this.appUserID = config.appUserID;
      console.log("[RampKit] Configure: appUserID set to", this.appUserID);
    }

    try {
      // Step 1: Collect device info (includes user ID generation)
      console.log("[RampKit] Configure: Collecting device info...");
      const baseDeviceInfo = await collectDeviceInfo();
      // Add the custom appUserID to device info
      this.deviceInfo = {
        ...baseDeviceInfo,
        appUserID: this.appUserID,
      };
      this.userId = this.deviceInfo.appUserId;
      console.log("[RampKit] Configure: userId", this.userId);

      // Step 2: Send device info to /app-users endpoint
      console.log("[RampKit] Configure: Sending user data to backend...");
      await this.sendUserDataToBackend(this.deviceInfo);

      // Step 3: Initialize event manager
      console.log("[RampKit] Configure: Initializing event manager...");
      eventManager.initialize(config.appId, this.deviceInfo);

      // Step 4: Track app session started
      eventManager.trackAppSessionStarted(
        this.deviceInfo.isFirstLaunch,
        this.deviceInfo.launchCount
      );

      // Step 5: Setup app state listener for background/foreground tracking
      this.setupAppStateListener();

      // Step 6: Start transaction observer for automatic purchase tracking
      console.log("[RampKit] Configure: Starting transaction observer...");
      await TransactionObserver.start(config.appId);

      this.initialized = true;
    } catch (e) {
      console.log("[RampKit] Configure: Failed to initialize device info", e);
      // Fallback to just getting user ID
      try {
        this.userId = await getRampKitUserId();
      } catch (e2) {
        console.log("[RampKit] Configure: Failed to resolve user id", e2);
      }
    }

    // Load onboarding data
    console.log("[RampKit] Configure: Starting onboarding load...");
    try {
      const manifestUrl = `${MANIFEST_BASE_URL}/${config.appId}/manifest.json`;
      console.log("[RampKit] Configure: Fetching manifest from", manifestUrl);
      const manifestResponse = await (globalThis as any).fetch(manifestUrl);
      const manifest = await manifestResponse.json();

      if (!manifest.onboardings || manifest.onboardings.length === 0) {
        throw new Error("No onboardings found in manifest");
      }

      // Use the first onboarding
      const firstOnboarding = manifest.onboardings[0];
      console.log(
        "[RampKit] Configure: Using onboarding",
        firstOnboarding.name,
        firstOnboarding.id
      );

      // Fetch the actual onboarding data
      const onboardingResponse = await (globalThis as any).fetch(
        firstOnboarding.url
      );
      const json = await onboardingResponse.json();
      this.onboardingData = json;
      console.log(
        "[RampKit] Configure: onboardingId",
        json && json.onboardingId
      );
      console.log("[RampKit] Configure: Onboarding loaded");
    } catch (error) {
      console.log("[RampKit] Configure: Onboarding load failed", error);
      this.onboardingData = null;
    }

    console.log("[RampKit] Configure: Finished", config);

    // Optionally auto-show onboarding overlay
    try {
      if (this.onboardingData && config.autoShowOnboarding) {
        console.log("[RampKit] Configure: Auto-show onboarding");
        this.showOnboarding();
      }
    } catch (_) {}
  }

  /**
   * @deprecated Use `configure()` instead. This method will be removed in a future version.
   */
  async init(config: RampKitConfig): Promise<void> {
    console.warn("[RampKit] init() is deprecated. Use configure() instead.");
    return this.configure(config);
  }

  /**
   * Set a custom App User ID to associate with this user.
   * This is an alias for your own user identification system.
   *
   * Note: This does NOT replace the RampKit-generated user ID (appUserId).
   * RampKit will continue to use its own stable UUID for internal tracking.
   * This custom ID is sent to the backend for you to correlate with your own user database.
   *
   * @param appUserID Your custom user identifier
   */
  async setAppUserID(appUserID: string): Promise<void> {
    this.appUserID = appUserID;
    console.log("[RampKit] setAppUserID:", appUserID);

    // Update device info with the new appUserID
    if (this.deviceInfo) {
      this.deviceInfo = {
        ...this.deviceInfo,
        appUserID: appUserID,
      };

      // Sync updated info to backend
      if (this.initialized) {
        try {
          await this.sendUserDataToBackend(this.deviceInfo);
          console.log("[RampKit] setAppUserID: Synced to backend");
        } catch (e) {
          console.warn("[RampKit] setAppUserID: Failed to sync to backend", e);
        }
      }
    }
  }

  /**
   * Get the custom App User ID if one has been set.
   * @returns The custom App User ID or null if not set
   */
  getAppUserID(): string | null {
    return this.appUserID;
  }

  /**
   * Send user/device data to the /app-users endpoint
   */
  private async sendUserDataToBackend(deviceInfo: DeviceInfo): Promise<void> {
    try {
      const url = `${ENDPOINTS.BASE_URL}${ENDPOINTS.APP_USERS}?appId=${this.appId}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(deviceInfo),
      });

      if (!response.ok) {
        // Try to get error details from response body
        let errorDetails = "";
        try {
          const errorBody = await response.text();
          errorDetails = errorBody ? ` - ${errorBody}` : "";
        } catch {
          // Ignore if we can't read the body
        }

        console.warn(
          `[RampKit] Configure: Failed to send user data`,
          `\n  Status: ${response.status} ${response.statusText}`,
          `\n  URL: ${url}`,
          `\n  AppId: ${this.appId}`,
          `\n  UserId: ${deviceInfo.appUserId}`,
          errorDetails ? `\n  Error: ${errorDetails}` : ""
        );
      } else {
        console.log("[RampKit] Configure: User data sent successfully");
      }
    } catch (error) {
      console.warn(
        `[RampKit] Configure: Network error sending user data`,
        `\n  Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Setup app state listener for background/foreground tracking
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: string) => {
        if (
          this.lastAppState === "active" &&
          (nextAppState === "background" || nextAppState === "inactive")
        ) {
          // App went to background
          const sessionDuration = getSessionDurationSeconds();
          eventManager.trackAppBackgrounded(sessionDuration);
        } else if (
          (this.lastAppState === "background" ||
            this.lastAppState === "inactive") &&
          nextAppState === "active"
        ) {
          // App came to foreground
          eventManager.trackAppForegrounded();
        }
        this.lastAppState = nextAppState;
      }
    );
  }

  /**
   * Get the onboarding data
   */
  getOnboardingData(): any {
    return this.onboardingData;
  }

  /**
   * Get the user ID
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Get the device info
   */
  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get all stored onboarding responses
   * @returns Promise resolving to array of OnboardingResponse objects
   */
  async getOnboardingResponses(): Promise<OnboardingResponse[]> {
    return OnboardingResponseStorage.retrieveResponses();
  }

  /**
   * Show the onboarding overlay
   */
  showOnboarding(opts?: {
    onShowPaywall?: (payload?: any) => void;
    showPaywall?: (payload?: any) => void;
  }): void {
    const data = this.onboardingData;
    if (!data || !Array.isArray(data.screens) || data.screens.length === 0) {
      console.log("[RampKit] ShowOnboarding: No onboarding data available");
      return;
    }

    try {
      const variables = (() => {
        try {
          const stateArr = (data.variables && data.variables.state) || [];
          const mapped: Record<string, any> = {};
          stateArr.forEach((v: any) => {
            if (v && v.name) mapped[v.name] = v.initialValue;
          });
          return mapped;
        } catch (_) {
          return {} as Record<string, any>;
        }
      })();

      const screens = data.screens.map((s: any) => ({
        id: s.id,
        html:
          s.html ||
          `<div style="padding:24px"><h1>${
            s.label || s.id
          }</h1><button onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage('rampkit:tap')">Continue</button></div>`,
        css: s.css,
        js: s.js,
      }));

      const requiredScripts: string[] = Array.isArray(data.requiredScripts)
        ? data.requiredScripts
        : [];

      // Build device/user context for template resolution
      const rampkitContext: RampKitContext | undefined = this.deviceInfo
        ? buildRampKitContext(this.deviceInfo)
        : undefined;

      // Extract navigation data for spatial layout-based navigation
      const navigation: NavigationData | undefined = data.navigation
        ? {
            mainFlow: data.navigation.mainFlow || [],
            screenPositions: data.navigation.screenPositions,
          }
        : undefined;

      // Track onboarding started event
      const onboardingId = data.onboardingId || data.id || "unknown";
      eventManager.trackOnboardingStarted(onboardingId, screens.length);

      // Optional warm-up
      try {
        preloadRampkitOverlay({
          onboardingId,
          screens,
          variables,
          requiredScripts,
          rampkitContext,
        });
      } catch (_) {}

      showRampkitOverlay({
        onboardingId,
        screens,
        variables,
        requiredScripts,
        rampkitContext,
        navigation,
        onOnboardingFinished: (payload?: any) => {
          // Track onboarding completed
          eventManager.trackOnboardingCompleted(
            screens.length,
            screens.length,
            onboardingId
          );
          try {
            this.onOnboardingFinished?.(payload);
          } catch (_) {}
        },
        onShowPaywall:
          opts?.onShowPaywall || opts?.showPaywall || this.onShowPaywall,
        onScreenChange: (screenIndex: number, screenId: string) => {
          // Track screen view within onboarding
          eventManager.trackOnboardingScreenViewed(
            screenId,
            screenIndex,
            screens.length,
            onboardingId
          );
        },
        onOnboardingAbandoned: (
          reason: string,
          lastScreenIndex: number,
          lastScreenId: string
        ) => {
          // Track onboarding abandoned
          eventManager.trackOnboardingAbandoned(
            reason,
            lastScreenId,
            onboardingId
          );
        },
        onNotificationPermissionRequested: () => {
          eventManager.trackNotificationsPromptShown();
        },
        onNotificationPermissionResult: (granted: boolean) => {
          eventManager.trackNotificationsResponse(
            granted ? "granted" : "denied"
          );
        },
      });
    } catch (e) {
      console.log("[RampKit] ShowOnboarding: Failed to show overlay", e);
    }
  }

  /**
   * Close the onboarding overlay
   */
  closeOnboarding(): void {
    closeRampkitOverlay();
  }

  // ============================================================================
  // Public Event Tracking API
  // ============================================================================

  /**
   * Track a custom event
   */
  trackEvent(
    eventName: string,
    properties: Record<string, any> = {},
    context?: Partial<EventContext>
  ): void {
    eventManager.track(eventName, properties, context);
  }

  /**
   * Track a screen view
   */
  trackScreenView(screenName: string, referrer?: string): void {
    eventManager.trackScreenView(screenName, referrer);
  }

  /**
   * Track a CTA tap
   */
  trackCtaTap(buttonId: string, buttonText?: string): void {
    eventManager.trackCtaTap(buttonId, buttonText);
  }

  // Note: Purchase and paywall events are automatically tracked by the native
  // StoreKit 2 (iOS) and Google Play Billing (Android) transaction observers.
  // No manual tracking is needed.

  /**
   * Reset the SDK state and re-initialize
   * Call this when a user logs out or when you need to clear all cached state
   */
  async reset(): Promise<void> {
    if (!this.config) {
      console.warn("[RampKit] Reset: No config found, cannot re-initialize");
      return;
    }

    console.log("[RampKit] Reset: Clearing SDK state...");

    // Stop transaction observer
    await TransactionObserver.stop();

    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Reset event manager state
    eventManager.reset();

    // Reset session
    resetSession();

    // Clear local state
    this.userId = null;
    this.deviceInfo = null;
    this.onboardingData = null;
    this.initialized = false;
    this.appUserID = null;

    // Clear stored onboarding responses
    await OnboardingResponseStorage.clearResponses();

    console.log("[RampKit] Reset: Re-initializing SDK...");

    // Re-initialize with stored config
    await this.configure(this.config);
  }
}
