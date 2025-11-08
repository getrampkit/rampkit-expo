import { preloadRampkitOverlay, showRampkitOverlay } from "./RampkitOverlay";

export class RampKitCore {
  private static _instance: RampKitCore;
  private config: any = {};
  private onboardingData: any = null;

  private static readonly ONBOARDING_URL =
    "https://labelaiimages.s3.us-east-2.amazonaws.com/labelaiOnboarding.json";

  static get instance() {
    if (!this._instance) this._instance = new RampKitCore();
    return this._instance;
  }

  async init(config: {
    apiKey: string;
    environment?: string;
    autoShowOnboarding?: boolean;
  }) {
    this.config = config;
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

  showOnboarding() {
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
      });
    } catch (e) {
      console.log("[RampKit] ShowOnboarding: failed to show overlay", e);
    }
  }
}
