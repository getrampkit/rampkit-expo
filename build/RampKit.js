"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RampKitCore = void 0;
class RampKitCore {
    constructor() {
        this.config = {};
    }
    static get instance() {
        if (!this._instance)
            this._instance = new RampKitCore();
        return this._instance;
    }
    init(config) {
        this.config = config;
        console.log("[RampKit] Initialized", config);
    }
    showOnboarding() {
        console.log("[RampKit] Show onboarding placeholder");
    }
}
exports.RampKitCore = RampKitCore;
