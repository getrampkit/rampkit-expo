export class RampKitCore {
  private static _instance: RampKitCore;
  private config: any = {};

  static get instance() {
    if (!this._instance) this._instance = new RampKitCore();
    return this._instance;
  }

  init(config: { apiKey: string; environment?: string }) {
    this.config = config;
    console.log("[RampKit] Initialized", config);
  }

  showOnboarding() {
    console.log("[RampKit] Show onboarding placeholder");
  }
}
