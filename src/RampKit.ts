/**
 * RampKit Core SDK
 * Main SDK class for RampKit Expo integration
 */

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
import { DeviceInfo, RampKitConfig, EventContext, RampKitContext, NavigationData, Manifest } from "./types";
import { buildTargetingContext } from "./TargetingContext";
import { evaluateTargets, TargetEvaluationResult } from "./TargetingEngine";
import { ENDPOINTS, SUPABASE_ANON_KEY, MANIFEST_BASE_URL } from "./constants";
import { OnboardingResponseStorage } from "./OnboardingResponseStorage";
import { Logger, setVerboseLogging } from "./Logger";

export class RampKitCore {
  private static _instance: RampKitCore;
  private config: RampKitConfig | null = null;
  private onboardingData: any = null;
  private userId: string | null = null;
  private appId: string | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private onOnboardingFinished?: (payload?: any) => void;
  private onShowPaywall?: (payload?: any) => void;
  private initialized: boolean = false;
  /** Custom App User ID provided by the developer (alias for their user system) */
  private appUserID: string | null = null;
  /** Result of target evaluation (for analytics/debugging) */
  private targetingResult: TargetEvaluationResult | null = null;

  static get instance() {
    if (!this._instance) this._instance = new RampKitCore();
    return this._instance;
  }

  /**
   * Configure the RampKit SDK
   * @param config Configuration options including appId, callbacks, and optional appUserID
   */
  async configure(config: RampKitConfig): Promise<void> {
    // Initialize verbose logging if enabled
    if (config.verboseLogging) {
      setVerboseLogging(true);
    }

    this.config = config;
    this.appId = config.appId;
    this.onOnboardingFinished = config.onOnboardingFinished;
    this.onShowPaywall = config.onShowPaywall || config.showPaywall;

    // Store custom App User ID if provided (this is an alias, not the RampKit user ID)
    if (config.appUserID) {
      this.appUserID = config.appUserID;
      Logger.verbose("appUserID set to", this.appUserID);
    }

    try {
      // Step 1: Collect device info (includes user ID generation)
      Logger.verbose("Collecting device info...");
      const baseDeviceInfo = await collectDeviceInfo();
      // Add the custom appUserID to device info
      this.deviceInfo = {
        ...baseDeviceInfo,
        appUserID: this.appUserID,
      };
      this.userId = this.deviceInfo.appUserId;
      Logger.verbose("userId:", this.userId);

      // Step 2: Send device info to /app-users endpoint
      Logger.verbose("Sending user data to backend...");
      await this.sendUserDataToBackend(this.deviceInfo);

      // Step 3: Initialize event manager
      Logger.verbose("Initializing event manager...");
      eventManager.initialize(config.appId, this.deviceInfo);

      // Step 4: Track app session started
      eventManager.trackAppSessionStarted(
        this.deviceInfo.isFirstLaunch,
        this.deviceInfo.launchCount
      );

      // Step 5: Start transaction observer for automatic purchase tracking
      Logger.verbose("Starting transaction observer...");
      try {
        await TransactionObserver.start(config.appId);
        Logger.verbose("Transaction observer setup complete");
      } catch (txError) {
        Logger.error("Transaction observer failed:", txError);
      }

      this.initialized = true;
    } catch (e) {
      Logger.warn("Failed to initialize device info:", e);
      // Fallback to just getting user ID
      try {
        this.userId = await getRampKitUserId();
      } catch (e2) {
        Logger.warn("Failed to resolve user id:", e2);
      }
    }

    // Load onboarding data with targeting
    Logger.verbose("Loading onboarding data...");
    try {
      const manifestUrl = `${MANIFEST_BASE_URL}/${config.appId}/manifest.json`;
      Logger.verbose("Fetching manifest from", manifestUrl);
      const manifestResponse = await (globalThis as any).fetch(manifestUrl);
      const manifest: Manifest = await manifestResponse.json();

      // Build targeting context from device info
      const targetingContext = buildTargetingContext(this.deviceInfo);
      Logger.verbose("Targeting context built:", JSON.stringify(targetingContext, null, 2));

      // Evaluate targets to find matching onboarding
      if (!manifest.targets || manifest.targets.length === 0) {
        throw new Error("No targets found in manifest");
      }

      const result = evaluateTargets(
        manifest.targets,
        targetingContext,
        this.userId || "anonymous"
      );

      if (!result) {
        throw new Error("No matching target found in manifest");
      }

      this.targetingResult = result;
      Logger.verbose(
        "Target matched:",
        `"${result.targetName}" -> onboarding ${result.onboarding.id} (bucket ${result.bucket})`
      );

      // Track target_matched event (also sets targeting context for all future events)
      eventManager.trackTargetMatched(
        result.targetId,
        result.targetName,
        result.onboarding.id,
        result.bucket,
        result.versionId
      );

      // Update deviceInfo with targeting data
      if (this.deviceInfo) {
        this.deviceInfo = {
          ...this.deviceInfo,
          matchedTargetId: result.targetId,
          matchedTargetName: result.targetName,
          matchedOnboardingId: result.onboarding.id,
          matchedOnboardingVersionId: result.versionId,
          abTestBucket: result.bucket,
        };

        // Sync updated targeting info to backend
        this.sendUserDataToBackend(this.deviceInfo).catch((e) => {
          Logger.warn("Failed to sync targeting info to backend:", e);
        });
      }

      // Fetch the selected onboarding data
      const onboardingResponse = await (globalThis as any).fetch(result.onboarding.url);
      const json = await onboardingResponse.json();
      this.onboardingData = json;
      Logger.verbose("Onboarding loaded, id:", json?.onboardingId);
    } catch (error) {
      Logger.verbose("Onboarding load failed:", error);
      this.onboardingData = null;
      this.targetingResult = null;
    }

    // Log SDK configured (always shown - single summary line)
    Logger.info(`Configured - appId: ${config.appId}, userId: ${this.userId || "pending"}`);

    // Optionally auto-show onboarding overlay
    try {
      if (this.onboardingData && config.autoShowOnboarding) {
        Logger.verbose("Auto-showing onboarding");
        this.showOnboarding();
      }
    } catch (_) {}
  }

  /**
   * @deprecated Use `configure()` instead. This method will be removed in a future version.
   */
  async init(config: RampKitConfig): Promise<void> {
    Logger.warn("init() is deprecated. Use configure() instead.");
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
    Logger.verbose("setAppUserID:", appUserID);

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
          Logger.verbose("setAppUserID: Synced to backend");
        } catch (e) {
          Logger.warn("setAppUserID: Failed to sync to backend", e);
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

        Logger.warn(
          `Failed to send user data: ${response.status} ${response.statusText}${errorDetails}`
        );
      } else {
        Logger.verbose("User data sent successfully");
      }
    } catch (error) {
      Logger.warn(
        `Network error sending user data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
   * Get the targeting result (which target matched and which onboarding was selected)
   */
  getTargetingResult(): TargetEvaluationResult | null {
    return this.targetingResult;
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get all user answers from onboarding
   */
  async getAnswers(): Promise<Record<string, any>> {
    return OnboardingResponseStorage.getVariables();
  }

  /**
   * Get a single answer by key
   */
  async getAnswer(key: string): Promise<any> {
    const answers = await OnboardingResponseStorage.getVariables();
    return answers[key];
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
      Logger.verbose("showOnboarding: No onboarding data available");
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

      // Initialize storage with initial values
      OnboardingResponseStorage.initializeVariables(variables);

      const screens = data.screens.map((s: any) => {
        Logger.verbose(`Screen mapping - id: ${s.id}, label: ${s.label}`);
        return {
          id: s.id,
          label: s.label,
          html:
            s.html ||
            `<div style="padding:24px"><h1>${
              s.label || s.id
            }</h1><button onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage('rampkit:tap')">Continue</button></div>`,
          css: s.css,
          js: s.js,
        };
      });

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
          // Track onboarding completed - trigger: finished
          eventManager.trackOnboardingCompleted(
            "finished",
            screens.length,
            screens.length,
            onboardingId
          );
          // Auto-recheck transactions after onboarding finishes (catches purchases made during onboarding)
          TransactionObserver.recheck().catch(() => {});
          try {
            this.onOnboardingFinished?.(payload);
          } catch (_) {}
        },
        onShowPaywall: (payload?: any) => {
          // Track onboarding completed - trigger: paywall_shown
          eventManager.trackOnboardingCompleted(
            "paywall_shown",
            screens.length, // We don't know exact step, use total
            screens.length,
            onboardingId
          );
          // Auto-recheck transactions after paywall shown (catches purchases made during onboarding)
          TransactionObserver.recheck().catch(() => {});
          // Call the original callback
          const paywallCallback = opts?.onShowPaywall || opts?.showPaywall || this.onShowPaywall;
          try {
            paywallCallback?.(payload);
          } catch (_) {}
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
        onNotificationPermissionResult: (granted: boolean) => {
          eventManager.trackNotificationsResponse(
            granted ? "granted" : "denied"
          );
        },
        onCloseAction: (screenIndex: number, _screenId: string) => {
          // Track onboarding completed - trigger: closed
          eventManager.trackOnboardingCompleted(
            "closed",
            screenIndex + 1,
            screens.length,
            onboardingId
          );
          // Auto-recheck transactions after onboarding closes (catches purchases made before closing)
          TransactionObserver.recheck().catch(() => {});
        },
      });
    } catch (e) {
      Logger.warn("showOnboarding: Failed to show overlay", e);
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

  // Note: Purchase and paywall events are automatically tracked by the native
  // StoreKit 2 (iOS) and Google Play Billing (Android) transaction observers.
  // No manual tracking is needed.

  /**
   * Reset the SDK state and re-initialize
   * Call this when a user logs out or when you need to clear all cached state
   */
  async reset(): Promise<void> {
    if (!this.config) {
      Logger.warn("Reset: No config found, cannot re-initialize");
      return;
    }

    Logger.verbose("Resetting SDK state...");

    // Stop transaction observer
    await TransactionObserver.stop();

    // Reset event manager state
    eventManager.reset();

    // Reset session
    resetSession();

    // Clear local state
    this.userId = null;
    this.deviceInfo = null;
    this.onboardingData = null;
    this.targetingResult = null;
    this.initialized = false;
    this.appUserID = null;

    // Clear stored onboarding variables
    await OnboardingResponseStorage.clearVariables();

    Logger.verbose("Re-initializing SDK...");

    // Re-initialize with stored config
    await this.configure(this.config);
  }
}
