"use strict";
/**
 * RampKit Event Manager
 * Handles event tracking for the /app-user-events endpoint
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManager = exports.eventManager = void 0;
const constants_1 = require("./constants");
const Logger_1 = require("./Logger");
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
        // Targeting tracking (persists for all events after target match)
        this.currentTargetId = null;
        this.currentTargetName = null;
        this.currentBucket = null;
        // Onboarding tracking
        this.onboardingStartTime = null;
        this.currentOnboardingId = null;
        this.onboardingCompletedForSession = false;
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
        Logger_1.Logger.verbose("EventManager initialized");
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
     * Set targeting context (called after target evaluation)
     * This persists for all subsequent events
     */
    setTargetingContext(targetId, targetName, onboardingId, bucket) {
        this.currentTargetId = targetId;
        this.currentTargetName = targetName;
        this.currentOnboardingId = onboardingId;
        this.currentBucket = bucket;
        this.currentFlowId = onboardingId;
        Logger_1.Logger.verbose("EventManager: Targeting context set", { targetId, targetName, bucket });
    }
    /**
     * Get current targeting info (for user profile updates)
     */
    getTargetingInfo() {
        return {
            targetId: this.currentTargetId,
            targetName: this.currentTargetName,
            bucket: this.currentBucket,
        };
    }
    /**
     * Start onboarding tracking
     */
    startOnboardingTracking(onboardingId) {
        this.currentOnboardingId = onboardingId;
        this.onboardingStartTime = new Date();
        this.currentFlowId = onboardingId;
        this.onboardingCompletedForSession = false;
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
            Logger_1.Logger.warn("EventManager: Not initialized, skipping event:", eventName);
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
        // Include targeting info in all events if available
        const enrichedProperties = {
            ...properties,
        };
        if (this.currentTargetId) {
            enrichedProperties.targetId = this.currentTargetId;
        }
        if (this.currentBucket !== null) {
            enrichedProperties.bucket = this.currentBucket;
        }
        const event = {
            appId: this.appId,
            appUserId: this.appUserId,
            eventId,
            eventName,
            sessionId: this.sessionId,
            occurredAt,
            device: this.device,
            context,
            properties: enrichedProperties,
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
                Logger_1.Logger.warn(`Failed to send event ${event.eventName}: ${response.status}${errorDetails}`);
            }
            else {
                Logger_1.Logger.verbose("Event sent:", event.eventName);
            }
        }
        catch (error) {
            Logger_1.Logger.warn(`Network error sending event ${event.eventName}: ${error instanceof Error ? error.message : String(error)}`);
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
     * Track target matched event
     * Called when targeting evaluation completes and a target is selected
     */
    trackTargetMatched(targetId, targetName, onboardingId, bucket) {
        // Set targeting context for all future events
        this.setTargetingContext(targetId, targetName, onboardingId, bucket);
        // Track the target_matched event
        this.track("target_matched", {
            targetId,
            targetName,
            onboardingId,
            bucket,
        });
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
        // Skip if onboarding was already completed this session
        if (this.onboardingCompletedForSession) {
            Logger_1.Logger.verbose("onboarding_abandoned skipped (already completed)");
            return;
        }
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
    // Onboarding Completion
    // ============================================================================
    /**
     * Track onboarding completed event
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
    trackOnboardingCompleted(trigger, completedSteps, totalSteps, onboardingId) {
        const timeToCompleteSeconds = this.getOnboardingDurationSeconds();
        Logger_1.Logger.verbose(`onboarding_completed: trigger=${trigger}, time=${timeToCompleteSeconds}s`);
        this.track("onboarding_completed", {
            onboardingId: onboardingId || this.currentOnboardingId,
            timeToCompleteSeconds,
            completedSteps,
            totalSteps,
            trigger,
        });
        // Mark as completed so abandoned won't fire for this session
        this.onboardingCompletedForSession = true;
        this.endOnboardingTracking();
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
        Logger_1.Logger.verbose(`purchase_started: ${properties.productId}`);
        this.track("purchase_started", properties);
    }
    /**
     * Track purchase completed
     * CRITICAL: originalTransactionId is required for attribution
     * Context (paywallId, screenName, flowId) is automatically included
     */
    trackPurchaseCompleted(properties) {
        // Context is automatically included from current state (paywallId, placement, etc.)
        Logger_1.Logger.verbose(`purchase_completed: ${properties.productId}`);
        this.track("purchase_completed", properties);
    }
    /**
     * Track purchase failed
     */
    trackPurchaseFailed(productId, errorCode, errorMessage) {
        Logger_1.Logger.verbose(`purchase_failed: ${productId} (${errorCode})`);
        this.track("purchase_failed", { productId, errorCode, errorMessage });
    }
    /**
     * Track purchase restored
     */
    trackPurchaseRestored(properties) {
        Logger_1.Logger.verbose(`purchase_restored: ${properties.productId}`);
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
        this.currentTargetId = null;
        this.currentTargetName = null;
        this.currentBucket = null;
        this.onboardingStartTime = null;
        this.currentOnboardingId = null;
        this.onboardingCompletedForSession = false;
        this.initialized = false;
    }
}
exports.EventManager = EventManager;
exports.eventManager = EventManager.instance;
