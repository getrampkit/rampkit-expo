"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAMPKIT_USER_ID_KEY = void 0;
exports.getRampKitUserId = getRampKitUserId;
const SecureStore = __importStar(require("expo-secure-store"));
const Crypto = __importStar(require("expo-crypto"));
exports.RAMPKIT_USER_ID_KEY = "rk_user_id";
async function getRampKitUserId() {
    const existing = await SecureStore.getItemAsync(exports.RAMPKIT_USER_ID_KEY);
    if (existing && typeof existing === "string" && existing.length > 0) {
        return existing;
    }
    const newId = await generateUuidV4();
    try {
        console.log("[RampKit] UserId: created", newId);
    }
    catch (_a) { }
    await SecureStore.setItemAsync(exports.RAMPKIT_USER_ID_KEY, newId);
    return newId;
}
async function generateUuidV4() {
    try {
        const bytes = (await Crypto.getRandomBytesAsync(16));
        // Set version (0100) and variant (10)
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0"));
        return (hex[0] + hex[1] + hex[2] + hex[3] + "-" +
            hex[4] + hex[5] + "-" +
            hex[6] + hex[7] + "-" +
            hex[8] + hex[9] + "-" +
            hex[10] + hex[11] + hex[12] + hex[13] + hex[14] + hex[15]);
    }
    catch (_a) {
        // Last-resort fallback using Math.random. Not cryptographically strong, but avoids crashes.
        const randByte = () => Math.floor(Math.random() * 256);
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++)
            bytes[i] = randByte();
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0"));
        return (hex[0] + hex[1] + hex[2] + hex[3] + "-" +
            hex[4] + hex[5] + "-" +
            hex[6] + hex[7] + "-" +
            hex[8] + hex[9] + "-" +
            hex[10] + hex[11] + hex[12] + hex[13] + hex[14] + hex[15]);
    }
}
