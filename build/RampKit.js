"use strict";
/**
 * RampKit Core SDK
 * Main SDK class for RampKit Expo integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RampKitCore = void 0;
const react_native_1 = require("react-native");
const RampkitOverlay_1 = require("./RampkitOverlay");
const userId_1 = require("./userId");
const DeviceInfoCollector_1 = require("./DeviceInfoCollector");
const EventManager_1 = require("./EventManager");
const constants_1 = require("./constants");
class RampKitCore {
    constructor() {
        this.config = null;
        this.onboardingData = null;
        this.userId = null;
        this.appId = null;
        this.deviceInfo = null;
        this.appStateSubscription = null;
        this.lastAppState = "active";
        this.initialized = false;
    }
    static get instance() {
        if (!this._instance)
            this._instance = new RampKitCore();
        return this._instance;
    }
    /**
     * Initialize the RampKit SDK
     */
    async init(config) {
        this.config = config;
        this.appId = config.appId;
        this.onOnboardingFinished = config.onOnboardingFinished;
        this.onShowPaywall = config.onShowPaywall || config.showPaywall;
        try {
            // Step 1: Collect device info (includes user ID generation)
            console.log("[RampKit] Init: Collecting device info...");
            this.deviceInfo = await (0, DeviceInfoCollector_1.collectDeviceInfo)();
            this.userId = this.deviceInfo.appUserId;
            console.log("[RampKit] Init: userId", this.userId);
            // Step 2: Send device info to /app-users endpoint
            console.log("[RampKit] Init: Sending user data to backend...");
            await this.sendUserDataToBackend(this.deviceInfo);
            // Step 3: Initialize event manager
            console.log("[RampKit] Init: Initializing event manager...");
            EventManager_1.eventManager.initialize(config.appId, this.deviceInfo);
            // Step 4: Track app session started
            EventManager_1.eventManager.trackAppSessionStarted(this.deviceInfo.isFirstLaunch, this.deviceInfo.launchCount);
            // Step 5: Setup app state listener for background/foreground tracking
            this.setupAppStateListener();
            this.initialized = true;
        }
        catch (e) {
            console.log("[RampKit] Init: Failed to initialize device info", e);
            // Fallback to just getting user ID
            try {
                this.userId = await (0, userId_1.getRampKitUserId)();
            }
            catch (e2) {
                console.log("[RampKit] Init: Failed to resolve user id", e2);
            }
        }
        // Load onboarding data
        console.log("[RampKit] Init: Starting onboarding load...");
        try {
            const manifestUrl = `${constants_1.MANIFEST_BASE_URL}/${config.appId}/manifest.json`;
            console.log("[RampKit] Init: Fetching manifest from", manifestUrl);
            const manifestResponse = await globalThis.fetch(manifestUrl);
            const manifest = await manifestResponse.json();
            if (!manifest.onboardings || manifest.onboardings.length === 0) {
                throw new Error("No onboardings found in manifest");
            }
            // Use the first onboarding
            const firstOnboarding = manifest.onboardings[0];
            console.log("[RampKit] Init: Using onboarding", firstOnboarding.name, firstOnboarding.id);
            // Fetch the actual onboarding data
            const onboardingResponse = await globalThis.fetch(firstOnboarding.url);
            const json = await onboardingResponse.json();
            this.onboardingData = json;
            console.log("[RampKit] Init: onboardingId", json && json.onboardingId);
            console.log("[RampKit] Init: Onboarding loaded");
        }
        catch (error) {
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
        }
        catch (_) { }
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
                console.warn("[RampKit] Init: Failed to send user data:", response.status);
            }
            else {
                console.log("[RampKit] Init: User data sent successfully");
            }
        }
        catch (error) {
            console.warn("[RampKit] Init: Error sending user data:", error);
        }
    }
    /**
     * Setup app state listener for background/foreground tracking
     */
    setupAppStateListener() {
        this.appStateSubscription = react_native_1.AppState.addEventListener("change", (nextAppState) => {
            if (this.lastAppState === "active" &&
                (nextAppState === "background" || nextAppState === "inactive")) {
                // App went to background
                const sessionDuration = (0, DeviceInfoCollector_1.getSessionDurationSeconds)();
                EventManager_1.eventManager.trackAppBackgrounded(sessionDuration);
            }
            else if ((this.lastAppState === "background" ||
                this.lastAppState === "inactive") &&
                nextAppState === "active") {
                // App came to foreground
                EventManager_1.eventManager.trackAppForegrounded();
            }
            this.lastAppState = nextAppState;
        });
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
     * Check if SDK is initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Show the onboarding overlay
     */
    showOnboarding(opts) {
        const data = this.onboardingData;
        if (!data || !Array.isArray(data.screens) || data.screens.length === 0) {
            console.log("[RampKit] ShowOnboarding: No onboarding data available");
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
                });
            }
            catch (_) { }
            (0, RampkitOverlay_1.showRampkitOverlay)({
                onboardingId,
                screens,
                variables,
                requiredScripts,
                onOnboardingFinished: (payload) => {
                    var _a;
                    // Track onboarding completed
                    EventManager_1.eventManager.trackOnboardingCompleted(screens.length, screens.length, onboardingId);
                    try {
                        (_a = this.onOnboardingFinished) === null || _a === void 0 ? void 0 : _a.call(this, payload);
                    }
                    catch (_) { }
                },
                onShowPaywall: (opts === null || opts === void 0 ? void 0 : opts.onShowPaywall) || (opts === null || opts === void 0 ? void 0 : opts.showPaywall) || this.onShowPaywall,
                onScreenChange: (screenIndex, screenId) => {
                    // Track screen view within onboarding
                    EventManager_1.eventManager.trackOnboardingScreenViewed(screenId, screenIndex, screens.length, onboardingId);
                },
                onOnboardingAbandoned: (reason, lastScreenIndex, lastScreenId) => {
                    // Track onboarding abandoned
                    EventManager_1.eventManager.trackOnboardingAbandoned(reason, lastScreenId, onboardingId);
                },
                onNotificationPermissionRequested: () => {
                    EventManager_1.eventManager.trackNotificationsPromptShown();
                },
                onNotificationPermissionResult: (granted) => {
                    EventManager_1.eventManager.trackNotificationsResponse(granted ? "granted" : "denied");
                },
            });
        }
        catch (e) {
            console.log("[RampKit] ShowOnboarding: Failed to show overlay", e);
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
    /**
     * Track a screen view
     */
    trackScreenView(screenName, referrer) {
        EventManager_1.eventManager.trackScreenView(screenName, referrer);
    }
    /**
     * Track a CTA tap
     */
    trackCtaTap(buttonId, buttonText) {
        EventManager_1.eventManager.trackCtaTap(buttonId, buttonText);
    }
    /**
     * Track paywall shown
     */
    trackPaywallShown(paywallId, placement, products) {
        EventManager_1.eventManager.trackPaywallShown(paywallId, placement, products);
    }
    /**
     * Track paywall primary action tap
     */
    trackPaywallPrimaryActionTap(paywallId, productId) {
        EventManager_1.eventManager.trackPaywallPrimaryActionTap(paywallId, productId);
    }
    /**
     * Track paywall closed
     */
    trackPaywallClosed(paywallId, reason) {
        EventManager_1.eventManager.trackPaywallClosed(paywallId, reason);
    }
    /**
     * Track purchase started
     */
    trackPurchaseStarted(productId, amount, currency) {
        EventManager_1.eventManager.trackPurchaseStarted(productId, amount, currency);
    }
    /**
     * Track purchase completed
     */
    trackPurchaseCompleted(properties) {
        EventManager_1.eventManager.trackPurchaseCompleted(properties);
    }
    /**
     * Track purchase failed
     */
    trackPurchaseFailed(productId, errorCode, errorMessage) {
        EventManager_1.eventManager.trackPurchaseFailed(productId, errorCode, errorMessage);
    }
    /**
     * Cleanup SDK resources
     */
    cleanup() {
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = null;
        }
        EventManager_1.eventManager.reset();
        (0, DeviceInfoCollector_1.resetSession)();
        this.initialized = false;
    }
}
exports.RampKitCore = RampKitCore;
