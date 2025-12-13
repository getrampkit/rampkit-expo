"use strict";
/**
 * RampKit Event Manager
 * Handles event tracking for the /app-user-events endpoint
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManager = exports.eventManager = void 0;
const constants_1 = require("./constants");
/**
 * Generate a UUID v4 using Math.random
 * This is sufficient for event IDs - no crypto dependency needed
 */
function generateEventId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
class EventManager {
    constructor() {
        this.appId = null;
        this.appUserId = null;
        this.sessionId = null;
        this.device = null;
        this.baseContext = {};
        // Current context tracking
        this.currentScreenName = null;
        this.currentFlowId = null;
        this.currentVariantId = null;
        this.currentPaywallId = null;
        this.currentPlacement = null;
        // Onboarding tracking
        this.onboardingStartTime = null;
        this.currentOnboardingId = null;
        // Initialization state
        this.initialized = false;
    }
    static get instance() {
        if (!this._instance) {
            this._instance = new EventManager();
        }
        return this._instance;
    }
    /**
     * Initialize the event manager with device info
     */
    initialize(appId, deviceInfo) {
        this.appId = appId;
        this.appUserId = deviceInfo.appUserId;
        this.sessionId = deviceInfo.appSessionId;
        this.device = {
            platform: deviceInfo.platform,
            platformVersion: deviceInfo.platformVersion,
            deviceModel: deviceInfo.deviceModel,
            sdkVersion: deviceInfo.sdkVersion,
            appVersion: deviceInfo.appVersion,
            buildNumber: deviceInfo.buildNumber,
        };
        this.baseContext = {
            locale: deviceInfo.deviceLocale,
            regionCode: deviceInfo.regionCode,
        };
        this.initialized = true;
        console.log("[RampKit] EventManager: Initialized");
    }
    /**
     * Check if the event manager is initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Set current screen context
     */
    setCurrentScreen(screenName) {
        this.currentScreenName = screenName;
    }
    /**
     * Set current flow context (e.g., onboarding flow ID)
     */
    setCurrentFlow(flowId, variantId) {
        this.currentFlowId = flowId;
        if (variantId !== undefined) {
            this.currentVariantId = variantId;
        }
    }
    /**
     * Set current paywall context
     */
    setCurrentPaywall(paywallId, placement) {
        this.currentPaywallId = paywallId;
        if (placement !== undefined) {
            this.currentPlacement = placement;
        }
    }
    /**
     * Start onboarding tracking
     */
    startOnboardingTracking(onboardingId) {
        this.currentOnboardingId = onboardingId;
        this.onboardingStartTime = new Date();
        this.currentFlowId = onboardingId;
    }
    /**
     * Get onboarding duration in seconds
     */
    getOnboardingDurationSeconds() {
        if (!this.onboardingStartTime)
            return 0;
        return Math.floor((Date.now() - this.onboardingStartTime.getTime()) / 1000);
    }
    /**
     * End onboarding tracking
     */
    endOnboardingTracking() {
        this.currentOnboardingId = null;
        this.onboardingStartTime = null;
        this.currentFlowId = null;
    }
    /**
     * Get current onboarding ID
     */
    getCurrentOnboardingId() {
        return this.currentOnboardingId;
    }
    /**
     * Track an event
     */
    async track(eventName, properties = {}, contextOverrides) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (!this.initialized || !this.appId || !this.appUserId || !this.sessionId || !this.device) {
            console.warn("[RampKit] EventManager: Not initialized, skipping event:", eventName);
            return;
        }
        const eventId = generateEventId();
        const occurredAt = new Date().toISOString();
        const context = {
            screenName: (_a = contextOverrides === null || contextOverrides === void 0 ? void 0 : contextOverrides.screenName) !== null && _a !== void 0 ? _a : this.currentScreenName,
            flowId: (_b = contextOverrides === null || contextOverrides === void 0 ? void 0 : contextOverrides.flowId) !== null && _b !== void 0 ? _b : this.currentFlowId,
            variantId: (_c = contextOverrides === null || contextOverrides === void 0 ? void 0 : contextOverrides.variantId) !== null && _c !== void 0 ? _c : this.currentVariantId,
            paywallId: (_d = contextOverrides === null || contextOverrides === void 0 ? void 0 : contextOverrides.paywallId) !== null && _d !== void 0 ? _d : this.currentPaywallId,
            locale: (_f = (_e = contextOverrides === null || contextOverrides === void 0 ? void 0 : contextOverrides.locale) !== null && _e !== void 0 ? _e : this.baseContext.locale) !== null && _f !== void 0 ? _f : null,
            regionCode: (_h = (_g = contextOverrides === null || contextOverrides === void 0 ? void 0 : contextOverrides.regionCode) !== null && _g !== void 0 ? _g : this.baseContext.regionCode) !== null && _h !== void 0 ? _h : null,
            placement: (_j = contextOverrides === null || contextOverrides === void 0 ? void 0 : contextOverrides.placement) !== null && _j !== void 0 ? _j : this.currentPlacement,
        };
        const event = {
            appId: this.appId,
            appUserId: this.appUserId,
            eventId,
            eventName,
            sessionId: this.sessionId,
            occurredAt,
            device: this.device,
            context,
            properties,
        };
        // Fire and forget - don't await
        this.sendEvent(event);
    }
    /**
     * Send event to backend (fire and forget)
     */
    async sendEvent(event) {
        try {
            const url = `${constants_1.ENDPOINTS.BASE_URL}${constants_1.ENDPOINTS.APP_USER_EVENTS}`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: constants_1.SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${constants_1.SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify(event),
            });
            if (!response.ok) {
                console.warn("[RampKit] EventManager: Failed to send event:", event.eventName, response.status);
            }
            else {
                console.log("[RampKit] EventManager: Event sent:", event.eventName);
            }
        }
        catch (error) {
            console.warn("[RampKit] EventManager: Error sending event:", event.eventName, error);
        }
    }
    // ============================================================================
    // Convenience methods for specific event types
    // ============================================================================
    /**
     * Track app session started
     */
    trackAppSessionStarted(isFirstLaunch, launchCount) {
        this.track("app_session_started", { isFirstLaunch, launchCount });
    }
    /**
     * Track app backgrounded
     */
    trackAppBackgrounded(sessionDurationSeconds) {
        this.track("app_backgrounded", { sessionDurationSeconds });
    }
    /**
     * Track app foregrounded
     */
    trackAppForegrounded() {
        this.track("app_foregrounded", {});
    }
    /**
     * Track screen view
     */
    trackScreenView(screenName, referrer) {
        this.setCurrentScreen(screenName);
        this.track("screen_view", { screenName, referrer });
    }
    /**
     * Track CTA tap
     */
    trackCtaTap(buttonId, buttonText) {
        this.track("cta_tap", { buttonId, buttonText });
    }
    /**
     * Track onboarding started
     */
    trackOnboardingStarted(onboardingId, totalSteps) {
        this.startOnboardingTracking(onboardingId);
        this.track("onboarding_started", { onboardingId, totalSteps });
    }
    /**
     * Track onboarding screen viewed
     */
    trackOnboardingScreenViewed(screenName, screenIndex, totalScreens, onboardingId) {
        this.setCurrentScreen(screenName);
        this.track("onboarding_screen_viewed", {
            onboardingId: onboardingId || this.currentOnboardingId,
            screenName,
            screenIndex,
            totalScreens,
        });
    }
    /**
     * Track onboarding question answered
     */
    trackOnboardingQuestionAnswered(questionId, answer, questionText, onboardingId) {
        this.track("onboarding_question_answered", {
            onboardingId: onboardingId || this.currentOnboardingId,
            questionId,
            answer,
            questionText,
        });
    }
    /**
     * Track onboarding completed
     */
    trackOnboardingCompleted(completedSteps, totalSteps, onboardingId) {
        const timeToCompleteSeconds = this.getOnboardingDurationSeconds();
        this.track("onboarding_completed", {
            onboardingId: onboardingId || this.currentOnboardingId,
            timeToCompleteSeconds,
            completedSteps,
            totalSteps,
        });
        this.endOnboardingTracking();
    }
    /**
     * Track onboarding abandoned
     */
    trackOnboardingAbandoned(reason, lastScreenName, onboardingId) {
        const timeSpentSeconds = this.getOnboardingDurationSeconds();
        this.track("onboarding_abandoned", {
            onboardingId: onboardingId || this.currentOnboardingId,
            reason,
            lastScreenName,
            timeSpentSeconds,
        });
        this.endOnboardingTracking();
    }
    /**
     * Track notification prompt shown
     */
    trackNotificationsPromptShown() {
        this.track("notifications_prompt_shown", {});
    }
    /**
     * Track notification response
     */
    trackNotificationsResponse(status) {
        this.track("notifications_response", { status });
    }
    /**
     * Track paywall shown
     */
    trackPaywallShown(paywallId, placement, products) {
        this.setCurrentPaywall(paywallId, placement);
        this.track("paywall_shown", { paywallId, placement, products }, { paywallId, placement });
    }
    /**
     * Track paywall primary action tap
     */
    trackPaywallPrimaryActionTap(paywallId, productId) {
        this.track("paywall_primary_action_tap", { paywallId, productId }, { paywallId });
    }
    /**
     * Track paywall closed
     */
    trackPaywallClosed(paywallId, reason) {
        this.track("paywall_closed", { paywallId, reason }, { paywallId });
        this.setCurrentPaywall(null);
    }
    /**
     * Track purchase started
     */
    trackPurchaseStarted(productId, amount, currency) {
        this.track("purchase_started", { productId, amount, currency });
    }
    /**
     * Track purchase completed
     */
    trackPurchaseCompleted(properties) {
        this.track("purchase_completed", properties);
    }
    /**
     * Track purchase failed
     */
    trackPurchaseFailed(productId, errorCode, errorMessage) {
        this.track("purchase_failed", { productId, errorCode, errorMessage });
    }
    /**
     * Reset the event manager (e.g., on logout)
     */
    reset() {
        this.appId = null;
        this.appUserId = null;
        this.sessionId = null;
        this.device = null;
        this.baseContext = {};
        this.currentScreenName = null;
        this.currentFlowId = null;
        this.currentVariantId = null;
        this.currentPaywallId = null;
        this.currentPlacement = null;
        this.onboardingStartTime = null;
        this.currentOnboardingId = null;
        this.initialized = false;
    }
}
exports.EventManager = EventManager;
exports.eventManager = EventManager.instance;
