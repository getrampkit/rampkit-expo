"use strict";
/**
 * RampKit Event Manager
 * Handles event tracking for the /app-user-events endpoint
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManager = exports.eventManager = void 0;
const constants_1 = require("./constants");
const RampKitNative_1 = require("./RampKitNative");
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
                // Try to get error details from response body
                let errorDetails = "";
                try {
                    const errorBody = await response.text();
                    errorDetails = errorBody ? ` - ${errorBody}` : "";
                }
                catch (_a) {
                    // Ignore if we can't read the body
                }
                console.warn(`[RampKit] EventManager: Failed to send event: ${event.eventName}`, `\n  Status: ${response.status} ${response.statusText}`, `\n  URL: ${url}`, `\n  AppId: ${event.appId}`, `\n  UserId: ${event.appUserId}`, errorDetails ? `\n  Error: ${errorDetails}` : "");
            }
            else {
                console.log("[RampKit] EventManager: Event sent:", event.eventName);
            }
        }
        catch (error) {
            console.warn(`[RampKit] EventManager: Network error sending event: ${event.eventName}`, `\n  Error: ${error instanceof Error ? error.message : String(error)}`);
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
     * Track onboarding started
     */
    trackOnboardingStarted(onboardingId, totalSteps) {
        this.startOnboardingTracking(onboardingId);
        this.track("onboarding_started", { onboardingId, totalSteps });
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
    // ============================================================================
    // Onboarding Completion (Once Per User)
    // ============================================================================
    /**
     * Check if onboarding has already been marked as completed
     */
    async hasOnboardingBeenCompleted() {
        try {
            const value = await (0, RampKitNative_1.getStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_COMPLETED);
            return value === "true";
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Mark onboarding as completed in persistent storage
     */
    async markOnboardingAsCompleted() {
        try {
            await (0, RampKitNative_1.setStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_COMPLETED, "true");
            console.log("[RampKit] EventManager: onboarding marked as completed (persisted)");
        }
        catch (error) {
            console.warn("[RampKit] EventManager: failed to persist onboarding completion:", error);
        }
    }
    /**
     * Reset onboarding completion status (useful for testing or user reset)
     */
    async resetOnboardingCompletionStatus() {
        try {
            await (0, RampKitNative_1.setStoredValue)(constants_1.STORAGE_KEYS.ONBOARDING_COMPLETED, "");
            console.log("[RampKit] EventManager: onboarding completion status reset");
        }
        catch (error) {
            console.warn("[RampKit] EventManager: failed to reset onboarding completion:", error);
        }
    }
    /**
     * Track onboarding completed event - fires ONCE per user
     * Called when:
     * 1. User completes the onboarding flow (onboarding-finished action)
     * 2. User closes the onboarding (close action)
     * 3. A paywall is shown (show-paywall action)
     *
     * @param trigger - The reason for completion ("finished", "closed", "paywall_shown")
     * @param completedSteps - Number of steps the user completed
     * @param totalSteps - Total number of steps in the onboarding
     * @param onboardingId - The onboarding ID
     */
    async trackOnboardingCompletedOnce(trigger, completedSteps, totalSteps, onboardingId) {
        // Check if already completed - skip if so
        const alreadyCompleted = await this.hasOnboardingBeenCompleted();
        if (alreadyCompleted) {
            console.log(`[RampKit] EventManager: onboarding_completed already sent, skipping (trigger: ${trigger})`);
            return;
        }
        // Mark as completed BEFORE sending to prevent race conditions
        await this.markOnboardingAsCompleted();
        const timeToCompleteSeconds = this.getOnboardingDurationSeconds();
        this.track("onboarding_completed", {
            onboardingId: onboardingId || this.currentOnboardingId,
            timeToCompleteSeconds,
            completedSteps,
            totalSteps,
            trigger,
        });
        this.endOnboardingTracking();
        console.log(`[RampKit] EventManager: 📊 onboarding_completed sent (trigger: ${trigger})`);
    }
    /**
     * Track notification response
     */
    trackNotificationsResponse(status) {
        this.track("notifications_response", { status });
    }
    /**
     * Track option selected (interaction event)
     */
    trackOptionSelected(optionId, optionValue, questionId) {
        this.track("option_selected", { optionId, optionValue, questionId });
    }
    /**
     * Track paywall shown
     */
    trackPaywallShown(paywallId, placement, products) {
        this.setCurrentPaywall(paywallId, placement);
        this.track("paywall_shown", { paywallId, placement, products }, { paywallId, placement });
    }
    /**
     * Track purchase started
     * Call this when user initiates a purchase from a paywall
     */
    trackPurchaseStarted(properties) {
        // Context (paywallId, placement) is automatically included from current state
        // which was set when trackPaywallShown was called
        console.log(`[RampKit] EventManager: 🛒 purchase_started`, `\n  productId: ${properties.productId}`, properties.amount ? `\n  amount: ${properties.amount} ${properties.currency || ""}` : "");
        this.track("purchase_started", properties);
    }
    /**
     * Track purchase completed
     * CRITICAL: originalTransactionId is required for attribution
     * Context (paywallId, screenName, flowId) is automatically included
     */
    trackPurchaseCompleted(properties) {
        // Context is automatically included from current state (paywallId, placement, etc.)
        console.log(`[RampKit] EventManager: ✅ purchase_completed`, `\n  productId: ${properties.productId}`, `\n  transactionId: ${properties.transactionId}`, `\n  originalTransactionId: ${properties.originalTransactionId}`, properties.isTrial ? `\n  isTrial: true` : "", properties.environment ? `\n  environment: ${properties.environment}` : "");
        this.track("purchase_completed", properties);
    }
    /**
     * Track purchase failed
     */
    trackPurchaseFailed(productId, errorCode, errorMessage) {
        console.log(`[RampKit] EventManager: ❌ purchase_failed`, `\n  productId: ${productId}`, `\n  errorCode: ${errorCode}`, `\n  errorMessage: ${errorMessage}`);
        this.track("purchase_failed", { productId, errorCode, errorMessage });
    }
    /**
     * Track purchase restored
     */
    trackPurchaseRestored(properties) {
        console.log(`[RampKit] EventManager: 🔄 purchase_restored`, `\n  productId: ${properties.productId}`, properties.transactionId ? `\n  transactionId: ${properties.transactionId}` : "", properties.originalTransactionId ? `\n  originalTransactionId: ${properties.originalTransactionId}` : "");
        this.track("purchase_restored", properties);
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
        // Reset onboarding completion status so it can fire again for new user
        this.resetOnboardingCompletionStatus();
    }
}
exports.EventManager = EventManager;
exports.eventManager = EventManager.instance;
