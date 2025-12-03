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
} from "./DeviceInfoCollector";
import { eventManager } from "./EventManager";
import { DeviceInfo, RampKitConfig, EventContext } from "./types";
import { ENDPOINTS, SUPABASE_ANON_KEY, MANIFEST_BASE_URL } from "./constants";

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

  static get instance() {
    if (!this._instance) this._instance = new RampKitCore();
    return this._instance;
  }

  /**
   * Initialize the RampKit SDK
   */
  async init(config: RampKitConfig): Promise<void> {
    this.config = config;
    this.appId = config.appId;
    this.onOnboardingFinished = config.onOnboardingFinished;
    this.onShowPaywall = config.onShowPaywall || config.showPaywall;

    try {
      // Step 1: Collect device info (includes user ID generation)
      console.log("[RampKit] Init: Collecting device info...");
      this.deviceInfo = await collectDeviceInfo();
      this.userId = this.deviceInfo.appUserId;
      console.log("[RampKit] Init: userId", this.userId);

      // Step 2: Send device info to /app-users endpoint
      console.log("[RampKit] Init: Sending user data to backend...");
      await this.sendUserDataToBackend(this.deviceInfo);

      // Step 3: Initialize event manager
      console.log("[RampKit] Init: Initializing event manager...");
      eventManager.initialize(config.appId, this.deviceInfo);

      // Step 4: Track app session started
      eventManager.trackAppSessionStarted(
        this.deviceInfo.isFirstLaunch,
        this.deviceInfo.launchCount
      );

      // Step 5: Setup app state listener for background/foreground tracking
      this.setupAppStateListener();

      this.initialized = true;
    } catch (e) {
      console.log("[RampKit] Init: Failed to initialize device info", e);
      // Fallback to just getting user ID
      try {
        this.userId = await getRampKitUserId();
      } catch (e2) {
        console.log("[RampKit] Init: Failed to resolve user id", e2);
      }
    }

    // Load onboarding data
    console.log("[RampKit] Init: Starting onboarding load...");
    try {
      const manifestUrl = `${MANIFEST_BASE_URL}/${config.appId}/manifest.json`;
      console.log("[RampKit] Init: Fetching manifest from", manifestUrl);
      const manifestResponse = await (globalThis as any).fetch(manifestUrl);
      const manifest = await manifestResponse.json();

      if (!manifest.onboardings || manifest.onboardings.length === 0) {
        throw new Error("No onboardings found in manifest");
      }

      // Use the first onboarding
      const firstOnboarding = manifest.onboardings[0];
      console.log(
        "[RampKit] Init: Using onboarding",
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
        "[RampKit] Init: onboardingId",
        json && json.onboardingId
      );
      console.log("[RampKit] Init: Onboarding loaded");
    } catch (error) {
      console.log("[RampKit] Init: Onboarding load failed", error);
      this.onboardingData = null;
    }

    console.log("[RampKit] Init: Finished", config);

    // Optionally auto-show onboarding overlay
    try {
      if (this.onboardingData && config.autoShowOnboarding) {
        console.log("[RampKit] Init: Auto-show onboarding");
        this.showOnboarding();
      }
    } catch (_) {}
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
        console.warn(
          "[RampKit] Init: Failed to send user data:",
          response.status
        );
      } else {
        console.log("[RampKit] Init: User data sent successfully");
      }
    } catch (error) {
      console.warn("[RampKit] Init: Error sending user data:", error);
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
        });
      } catch (_) {}

      showRampkitOverlay({
        onboardingId,
        screens,
        variables,
        requiredScripts,
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

  /**
   * Track paywall shown
   */
  trackPaywallShown(
    paywallId: string,
    placement?: string,
    products?: Array<{ productId: string; price?: number; currency?: string }>
  ): void {
    eventManager.trackPaywallShown(paywallId, placement, products);
  }

  /**
   * Track paywall primary action tap
   */
  trackPaywallPrimaryActionTap(paywallId: string, productId?: string): void {
    eventManager.trackPaywallPrimaryActionTap(paywallId, productId);
  }

  /**
   * Track paywall closed
   */
  trackPaywallClosed(
    paywallId: string,
    reason: "dismissed" | "purchased" | "backgrounded"
  ): void {
    eventManager.trackPaywallClosed(paywallId, reason);
  }

  /**
   * Track purchase started
   */
  trackPurchaseStarted(
    productId: string,
    amount?: number,
    currency?: string
  ): void {
    eventManager.trackPurchaseStarted(productId, amount, currency);
  }

  /**
   * Track purchase completed
   */
  trackPurchaseCompleted(properties: {
    productId: string;
    amount: number;
    currency: string;
    transactionId: string;
    originalTransactionId?: string;
    purchaseDate?: string;
  }): void {
    eventManager.trackPurchaseCompleted(properties);
  }

  /**
   * Track purchase failed
   */
  trackPurchaseFailed(
    productId: string,
    errorCode: string,
    errorMessage: string
  ): void {
    eventManager.trackPurchaseFailed(productId, errorCode, errorMessage);
  }

  /**
   * Cleanup SDK resources
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    eventManager.reset();
    resetSession();
    this.initialized = false;
  }
}
