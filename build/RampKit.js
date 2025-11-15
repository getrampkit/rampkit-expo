"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RampKitCore = void 0;
const RampkitOverlay_1 = require("./RampkitOverlay");
const userId_1 = require("./userId");
class RampKitCore {
    constructor() {
        this.config = {};
        this.onboardingData = null;
        this.userId = null;
    }
    static get instance() {
        if (!this._instance)
            this._instance = new RampKitCore();
        return this._instance;
    }
    async init(config) {
        this.config = config;
        this.onOnboardingFinished = config.onOnboardingFinished;
        this.onShowPaywall = config.onShowPaywall || config.showPaywall;
        try {
            // Ensure a stable, encrypted user id exists on first init
            this.userId = await (0, userId_1.getRampKitUserId)();
            console.log("[RampKit] Init: userId", this.userId);
        }
        catch (e) {
            console.log("[RampKit] Init: failed to resolve user id", e);
        }
        console.log("[RampKit] Init: starting onboarding load");
        try {
            const response = await globalThis.fetch(RampKitCore.ONBOARDING_URL);
            const json = await response.json();
            this.onboardingData = json;
            try {
                console.log("[RampKit] Init: onboardingId", json && json.onboardingId);
            }
            catch (_) { }
            console.log("[RampKit] Init: onboarding loaded");
        }
        catch (error) {
            console.log("[RampKit] Init: onboarding load failed", error);
            this.onboardingData = null;
        }
        console.log("[RampKit] Init: finished", config);
        // Optionally auto-show onboarding overlay
        try {
            if (this.onboardingData && config.autoShowOnboarding) {
                console.log("[RampKit] Init: auto-show onboarding");
                this.showOnboarding();
            }
        }
        catch (_) { }
    }
    getOnboardingData() {
        return this.onboardingData;
    }
    getUserId() {
        return this.userId;
    }
    showOnboarding(opts) {
        const data = this.onboardingData;
        if (!data || !Array.isArray(data.screens) || data.screens.length === 0) {
            console.log("[RampKit] ShowOnboarding: no onboarding data available");
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
                    `<div style=\"padding:24px\"><h1>${s.label || s.id}</h1><button onclick=\"window.ReactNativeWebView && window.ReactNativeWebView.postMessage('rampkit:tap')\">Continue</button></div>`,
                css: s.css,
                js: s.js,
            }));
            const requiredScripts = Array.isArray(data.requiredScripts)
                ? data.requiredScripts
                : [];
            // Optional warm-up
            try {
                (0, RampkitOverlay_1.preloadRampkitOverlay)({
                    onboardingId: data.onboardingId,
                    screens,
                    variables,
                    requiredScripts,
                });
            }
            catch (_) { }
            (0, RampkitOverlay_1.showRampkitOverlay)({
                onboardingId: data.onboardingId,
                screens,
                variables,
                requiredScripts,
                onOnboardingFinished: (payload) => {
                    var _a;
                    try {
                        (_a = this.onOnboardingFinished) === null || _a === void 0 ? void 0 : _a.call(this, payload);
                    }
                    catch (_) { }
                },
                onShowPaywall: (opts === null || opts === void 0 ? void 0 : opts.onShowPaywall) || (opts === null || opts === void 0 ? void 0 : opts.showPaywall) || this.onShowPaywall,
            });
        }
        catch (e) {
            console.log("[RampKit] ShowOnboarding: failed to show overlay", e);
        }
    }
    closeOnboarding() {
        (0, RampkitOverlay_1.closeRampkitOverlay)();
    }
}
exports.RampKitCore = RampKitCore;
RampKitCore.ONBOARDING_URL = "https://dqplcvw3fzili.cloudfront.net/labelaiOnboarding.json";
