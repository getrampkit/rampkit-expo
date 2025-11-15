import {
  preloadRampkitOverlay,
  showRampkitOverlay,
  closeRampkitOverlay,
} from "./RampkitOverlay";
import { getRampKitUserId } from "./userId";

export class RampKitCore {
  private static _instance: RampKitCore;
  private config: any = {};
  private onboardingData: any = null;
  private userId: string | null = null;
  private onOnboardingFinished?: (payload?: any) => void;
  private onShowPaywall?: (payload?: any) => void;

  private static readonly ONBOARDING_URL =
    "https://dqplcvw3fzili.cloudfront.net/labelaiOnboarding.json";

  static get instance() {
    if (!this._instance) this._instance = new RampKitCore();
    return this._instance;
  }

  async init(config: {
    apiKey: string;
    environment?: string;
    autoShowOnboarding?: boolean;
    onOnboardingFinished?: (payload?: any) => void;
    onShowPaywall?: (payload?: any) => void;
    showPaywall?: (payload?: any) => void;
  }) {
    this.config = config;
    this.onOnboardingFinished = config.onOnboardingFinished;
    this.onShowPaywall = config.onShowPaywall || config.showPaywall;
    try {
      // Ensure a stable, encrypted user id exists on first init
      this.userId = await getRampKitUserId();
      console.log("[RampKit] Init: userId", this.userId);
    } catch (e) {
      console.log("[RampKit] Init: failed to resolve user id", e);
    }
    console.log("[RampKit] Init: starting onboarding load");
    try {
      const response = await (globalThis as any).fetch(
        RampKitCore.ONBOARDING_URL
      );
      const json = await response.json();
      this.onboardingData = json;
      try {
        console.log("[RampKit] Init: onboardingId", json && json.onboardingId);
      } catch (_) {}
      console.log("[RampKit] Init: onboarding loaded");
    } catch (error) {
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
    } catch (_) {}
  }

  getOnboardingData() {
    return this.onboardingData;
  }

  getUserId() {
    return this.userId;
  }

  showOnboarding(opts?: {
    onShowPaywall?: (payload?: any) => void;
    showPaywall?: (payload?: any) => void;
  }) {
    const data = this.onboardingData;
    if (!data || !Array.isArray(data.screens) || data.screens.length === 0) {
      console.log("[RampKit] ShowOnboarding: no onboarding data available");
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
          `<div style=\"padding:24px\"><h1>${
            s.label || s.id
          }</h1><button onclick=\"window.ReactNativeWebView && window.ReactNativeWebView.postMessage('rampkit:tap')\">Continue</button></div>`,
        css: s.css,
        js: s.js,
      }));

      const requiredScripts: string[] = Array.isArray(data.requiredScripts)
        ? data.requiredScripts
        : [];

      // Optional warm-up
      try {
        preloadRampkitOverlay({
          onboardingId: data.onboardingId,
          screens,
          variables,
          requiredScripts,
        });
      } catch (_) {}

      showRampkitOverlay({
        onboardingId: data.onboardingId,
        screens,
        variables,
        requiredScripts,
        onOnboardingFinished: (payload?: any) => {
          try {
            this.onOnboardingFinished?.(payload);
          } catch (_) {}
        },
        onShowPaywall:
          opts?.onShowPaywall || opts?.showPaywall || this.onShowPaywall,
      });
    } catch (e) {
      console.log("[RampKit] ShowOnboarding: failed to show overlay", e);
    }
  }

  closeOnboarding() {
    closeRampkitOverlay();
  }
}
