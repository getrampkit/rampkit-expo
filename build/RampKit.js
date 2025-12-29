"use strict";
/**
 * RampKit Core SDK
 * Main SDK class for RampKit Expo integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RampKitCore = void 0;
const RampkitOverlay_1 = require("./RampkitOverlay");
const userId_1 = require("./userId");
const DeviceInfoCollector_1 = require("./DeviceInfoCollector");
const EventManager_1 = require("./EventManager");
const RampKitNative_1 = require("./RampKitNative");
const TargetingContext_1 = require("./TargetingContext");
const TargetingEngine_1 = require("./TargetingEngine");
const constants_1 = require("./constants");
const OnboardingResponseStorage_1 = require("./OnboardingResponseStorage");
const Logger_1 = require("./Logger");
class RampKitCore {
    constructor() {
        this.config = null;
        this.onboardingData = null;
        this.userId = null;
        this.appId = null;
        this.deviceInfo = null;
        this.initialized = false;
        /** Custom App User ID provided by the developer (alias for their user system) */
        this.appUserID = null;
        /** Result of target evaluation (for analytics/debugging) */
        this.targetingResult = null;
    }
    static get instance() {
        if (!this._instance)
            this._instance = new RampKitCore();
        return this._instance;
    }
    /**
     * Configure the RampKit SDK
     * @param config Configuration options including appId, callbacks, and optional appUserID
     */
    async configure(config) {
        // Initialize verbose logging if enabled
        if (config.verboseLogging) {
            (0, Logger_1.setVerboseLogging)(true);
        }
        this.config = config;
        this.appId = config.appId;
        this.onOnboardingFinished = config.onOnboardingFinished;
        this.onShowPaywall = config.onShowPaywall || config.showPaywall;
        // Store custom App User ID if provided (this is an alias, not the RampKit user ID)
        if (config.appUserID) {
            this.appUserID = config.appUserID;
            Logger_1.Logger.verbose("appUserID set to", this.appUserID);
        }
        try {
            // Step 1: Collect device info (includes user ID generation)
            Logger_1.Logger.verbose("Collecting device info...");
            const baseDeviceInfo = await (0, DeviceInfoCollector_1.collectDeviceInfo)();
            // Add the custom appUserID to device info
            this.deviceInfo = {
                ...baseDeviceInfo,
                appUserID: this.appUserID,
            };
            this.userId = this.deviceInfo.appUserId;
            Logger_1.Logger.verbose("userId:", this.userId);
            // Step 2: Send device info to /app-users endpoint
            Logger_1.Logger.verbose("Sending user data to backend...");
            await this.sendUserDataToBackend(this.deviceInfo);
            // Step 3: Initialize event manager
            Logger_1.Logger.verbose("Initializing event manager...");
            EventManager_1.eventManager.initialize(config.appId, this.deviceInfo);
            // Step 4: Track app session started
            EventManager_1.eventManager.trackAppSessionStarted(this.deviceInfo.isFirstLaunch, this.deviceInfo.launchCount);
            // Step 5: Start transaction observer for automatic purchase tracking
            Logger_1.Logger.verbose("Starting transaction observer...");
            try {
                await RampKitNative_1.TransactionObserver.start(config.appId);
                Logger_1.Logger.verbose("Transaction observer setup complete");
            }
            catch (txError) {
                Logger_1.Logger.error("Transaction observer failed:", txError);
            }
            this.initialized = true;
        }
        catch (e) {
            Logger_1.Logger.warn("Failed to initialize device info:", e);
            // Fallback to just getting user ID
            try {
                this.userId = await (0, userId_1.getRampKitUserId)();
            }
            catch (e2) {
                Logger_1.Logger.warn("Failed to resolve user id:", e2);
            }
        }
        // Load onboarding data with targeting
        Logger_1.Logger.verbose("Loading onboarding data...");
        try {
            const manifestUrl = `${constants_1.MANIFEST_BASE_URL}/${config.appId}/manifest.json`;
            Logger_1.Logger.verbose("Fetching manifest from", manifestUrl);
            const manifestResponse = await globalThis.fetch(manifestUrl);
            const manifest = await manifestResponse.json();
            // Build targeting context from device info
            const targetingContext = (0, TargetingContext_1.buildTargetingContext)(this.deviceInfo);
            Logger_1.Logger.verbose("Targeting context built:", JSON.stringify(targetingContext, null, 2));
            // Evaluate targets to find matching onboarding
            if (!manifest.targets || manifest.targets.length === 0) {
                throw new Error("No targets found in manifest");
            }
            const result = (0, TargetingEngine_1.evaluateTargets)(manifest.targets, targetingContext, this.userId || "anonymous");
            if (!result) {
                throw new Error("No matching target found in manifest");
            }
            this.targetingResult = result;
            Logger_1.Logger.verbose("Target matched:", `"${result.targetName}" -> onboarding ${result.onboarding.id} (bucket ${result.bucket})`);
            // Track target_matched event (also sets targeting context for all future events)
            EventManager_1.eventManager.trackTargetMatched(result.targetId, result.targetName, result.onboarding.id, result.bucket);
            // Update deviceInfo with targeting data
            if (this.deviceInfo) {
                this.deviceInfo = {
                    ...this.deviceInfo,
                    matchedTargetId: result.targetId,
                    matchedTargetName: result.targetName,
                    matchedOnboardingId: result.onboarding.id,
                    abTestBucket: result.bucket,
                };
                // Sync updated targeting info to backend
                this.sendUserDataToBackend(this.deviceInfo).catch((e) => {
                    Logger_1.Logger.warn("Failed to sync targeting info to backend:", e);
                });
            }
            // Fetch the selected onboarding data
            const onboardingResponse = await globalThis.fetch(result.onboarding.url);
            const json = await onboardingResponse.json();
            this.onboardingData = json;
            Logger_1.Logger.verbose("Onboarding loaded, id:", json === null || json === void 0 ? void 0 : json.onboardingId);
        }
        catch (error) {
            Logger_1.Logger.verbose("Onboarding load failed:", error);
            this.onboardingData = null;
            this.targetingResult = null;
        }
        // Log SDK configured (always shown - single summary line)
        Logger_1.Logger.info(`Configured - appId: ${config.appId}, userId: ${this.userId || "pending"}`);
        // Optionally auto-show onboarding overlay
        try {
            if (this.onboardingData && config.autoShowOnboarding) {
                Logger_1.Logger.verbose("Auto-showing onboarding");
                this.showOnboarding();
            }
        }
        catch (_) { }
    }
    /**
     * @deprecated Use `configure()` instead. This method will be removed in a future version.
     */
    async init(config) {
        Logger_1.Logger.warn("init() is deprecated. Use configure() instead.");
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
    async setAppUserID(appUserID) {
        this.appUserID = appUserID;
        Logger_1.Logger.verbose("setAppUserID:", appUserID);
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
                    Logger_1.Logger.verbose("setAppUserID: Synced to backend");
                }
                catch (e) {
                    Logger_1.Logger.warn("setAppUserID: Failed to sync to backend", e);
                }
            }
        }
    }
    /**
     * Get the custom App User ID if one has been set.
     * @returns The custom App User ID or null if not set
     */
    getAppUserID() {
        return this.appUserID;
    }
    /**
     * Send user/device data to the /app-users endpoint
     */
    async sendUserDataToBackend(deviceInfo) {
        try {
            const url = `${constants_1.ENDPOINTS.BASE_URL}${constants_1.ENDPOINTS.APP_USERS}?appId=${this.appId}`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: constants_1.SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${constants_1.SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify(deviceInfo),
            });
            if (!response.ok) {
                // Try to get error details from response body
                let errorDetails = "";
                try {
                    const errorBody = await response.text();
                    errorDetails = errorBody ? ` - ${errorBody}` : "";
                }
                catch (_a) {
                    // Ignore if we can't read the body
                }
                Logger_1.Logger.warn(`Failed to send user data: ${response.status} ${response.statusText}${errorDetails}`);
            }
            else {
                Logger_1.Logger.verbose("User data sent successfully");
            }
        }
        catch (error) {
            Logger_1.Logger.warn(`Network error sending user data: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get the onboarding data
     */
    getOnboardingData() {
        return this.onboardingData;
    }
    /**
     * Get the user ID
     */
    getUserId() {
        return this.userId;
    }
    /**
     * Get the device info
     */
    getDeviceInfo() {
        return this.deviceInfo;
    }
    /**
     * Get the targeting result (which target matched and which onboarding was selected)
     */
    getTargetingResult() {
        return this.targetingResult;
    }
    /**
     * Check if SDK is initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Get all user answers from onboarding
     */
    async getAnswers() {
        return OnboardingResponseStorage_1.OnboardingResponseStorage.getVariables();
    }
    /**
     * Get a single answer by key
     */
    async getAnswer(key) {
        const answers = await OnboardingResponseStorage_1.OnboardingResponseStorage.getVariables();
        return answers[key];
    }
    /**
     * Show the onboarding overlay
     */
    showOnboarding(opts) {
        const data = this.onboardingData;
        if (!data || !Array.isArray(data.screens) || data.screens.length === 0) {
            Logger_1.Logger.verbose("showOnboarding: No onboarding data available");
            return;
        }
        try {
            const variables = (() => {
                try {
                    const stateArr = (data.variables && data.variables.state) || [];
                    const mapped = {};
                    stateArr.forEach((v) => {
                        if (v && v.name)
                            mapped[v.name] = v.initialValue;
                    });
                    return mapped;
                }
                catch (_) {
                    return {};
                }
            })();
            // Initialize storage with initial values
            OnboardingResponseStorage_1.OnboardingResponseStorage.initializeVariables(variables);
            const screens = data.screens.map((s) => ({
                id: s.id,
                html: s.html ||
                    `<div style="padding:24px"><h1>${s.label || s.id}</h1><button onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage('rampkit:tap')">Continue</button></div>`,
                css: s.css,
                js: s.js,
            }));
            const requiredScripts = Array.isArray(data.requiredScripts)
                ? data.requiredScripts
                : [];
            // Build device/user context for template resolution
            const rampkitContext = this.deviceInfo
                ? (0, DeviceInfoCollector_1.buildRampKitContext)(this.deviceInfo)
                : undefined;
            // Extract navigation data for spatial layout-based navigation
            const navigation = data.navigation
                ? {
                    mainFlow: data.navigation.mainFlow || [],
                    screenPositions: data.navigation.screenPositions,
                }
                : undefined;
            // Track onboarding started event
            const onboardingId = data.onboardingId || data.id || "unknown";
            EventManager_1.eventManager.trackOnboardingStarted(onboardingId, screens.length);
            // Optional warm-up
            try {
                (0, RampkitOverlay_1.preloadRampkitOverlay)({
                    onboardingId,
                    screens,
                    variables,
                    requiredScripts,
                    rampkitContext,
                });
            }
            catch (_) { }
            (0, RampkitOverlay_1.showRampkitOverlay)({
                onboardingId,
                screens,
                variables,
                requiredScripts,
                rampkitContext,
                navigation,
                onOnboardingFinished: (payload) => {
                    var _a;
                    // Track onboarding completed - trigger: finished
                    EventManager_1.eventManager.trackOnboardingCompleted("finished", screens.length, screens.length, onboardingId);
                    // Auto-recheck transactions after onboarding finishes (catches purchases made during onboarding)
                    RampKitNative_1.TransactionObserver.recheck().catch(() => { });
                    try {
                        (_a = this.onOnboardingFinished) === null || _a === void 0 ? void 0 : _a.call(this, payload);
                    }
                    catch (_) { }
                },
                onShowPaywall: (payload) => {
                    // Track onboarding completed - trigger: paywall_shown
                    EventManager_1.eventManager.trackOnboardingCompleted("paywall_shown", screens.length, // We don't know exact step, use total
                    screens.length, onboardingId);
                    // Auto-recheck transactions after paywall shown (catches purchases made during onboarding)
                    RampKitNative_1.TransactionObserver.recheck().catch(() => { });
                    // Call the original callback
                    const paywallCallback = (opts === null || opts === void 0 ? void 0 : opts.onShowPaywall) || (opts === null || opts === void 0 ? void 0 : opts.showPaywall) || this.onShowPaywall;
                    try {
                        paywallCallback === null || paywallCallback === void 0 ? void 0 : paywallCallback(payload);
                    }
                    catch (_) { }
                },
                onOnboardingAbandoned: (reason, lastScreenIndex, lastScreenId) => {
                    // Track onboarding abandoned
                    EventManager_1.eventManager.trackOnboardingAbandoned(reason, lastScreenId, onboardingId);
                },
                onNotificationPermissionResult: (granted) => {
                    EventManager_1.eventManager.trackNotificationsResponse(granted ? "granted" : "denied");
                },
                onCloseAction: (screenIndex, _screenId) => {
                    // Track onboarding completed - trigger: closed
                    EventManager_1.eventManager.trackOnboardingCompleted("closed", screenIndex + 1, screens.length, onboardingId);
                    // Auto-recheck transactions after onboarding closes (catches purchases made before closing)
                    RampKitNative_1.TransactionObserver.recheck().catch(() => { });
                },
            });
        }
        catch (e) {
            Logger_1.Logger.warn("showOnboarding: Failed to show overlay", e);
        }
    }
    /**
     * Close the onboarding overlay
     */
    closeOnboarding() {
        (0, RampkitOverlay_1.closeRampkitOverlay)();
    }
    // ============================================================================
    // Public Event Tracking API
    // ============================================================================
    /**
     * Track a custom event
     */
    trackEvent(eventName, properties = {}, context) {
        EventManager_1.eventManager.track(eventName, properties, context);
    }
    // Note: Purchase and paywall events are automatically tracked by the native
    // StoreKit 2 (iOS) and Google Play Billing (Android) transaction observers.
    // No manual tracking is needed.
    /**
     * Reset the SDK state and re-initialize
     * Call this when a user logs out or when you need to clear all cached state
     */
    async reset() {
        if (!this.config) {
            Logger_1.Logger.warn("Reset: No config found, cannot re-initialize");
            return;
        }
        Logger_1.Logger.verbose("Resetting SDK state...");
        // Stop transaction observer
        await RampKitNative_1.TransactionObserver.stop();
        // Reset event manager state
        EventManager_1.eventManager.reset();
        // Reset session
        (0, DeviceInfoCollector_1.resetSession)();
        // Clear local state
        this.userId = null;
        this.deviceInfo = null;
        this.onboardingData = null;
        this.targetingResult = null;
        this.initialized = false;
        this.appUserID = null;
        // Clear stored onboarding variables
        await OnboardingResponseStorage_1.OnboardingResponseStorage.clearVariables();
        Logger_1.Logger.verbose("Re-initializing SDK...");
        // Re-initialize with stored config
        await this.configure(this.config);
    }
}
exports.RampKitCore = RampKitCore;
