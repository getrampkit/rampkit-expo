"use strict";
/**
 * RampKit Expo SDK
 * Main entry point for the SDK
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPABILITIES = exports.SDK_VERSION = exports.TransactionObserver = exports.Notifications = exports.StoreReview = exports.Haptics = exports.RampKitNative = exports.buildRampKitContext = exports.getSessionStartTime = exports.getSessionDurationSeconds = exports.collectDeviceInfo = exports.eventManager = exports.getRampKitUserId = exports.RampKit = void 0;
const RampKit_1 = require("./RampKit");
// Main SDK singleton instance
exports.RampKit = RampKit_1.RampKitCore.instance;
// Export user ID utility
var userId_1 = require("./userId");
Object.defineProperty(exports, "getRampKitUserId", { enumerable: true, get: function () { return userId_1.getRampKitUserId; } });
// Export event manager for direct access
var EventManager_1 = require("./EventManager");
Object.defineProperty(exports, "eventManager", { enumerable: true, get: function () { return EventManager_1.eventManager; } });
// Export device info collector utilities
var DeviceInfoCollector_1 = require("./DeviceInfoCollector");
Object.defineProperty(exports, "collectDeviceInfo", { enumerable: true, get: function () { return DeviceInfoCollector_1.collectDeviceInfo; } });
Object.defineProperty(exports, "getSessionDurationSeconds", { enumerable: true, get: function () { return DeviceInfoCollector_1.getSessionDurationSeconds; } });
Object.defineProperty(exports, "getSessionStartTime", { enumerable: true, get: function () { return DeviceInfoCollector_1.getSessionStartTime; } });
Object.defineProperty(exports, "buildRampKitContext", { enumerable: true, get: function () { return DeviceInfoCollector_1.buildRampKitContext; } });
// Export native module for direct access
var RampKitNative_1 = require("./RampKitNative");
Object.defineProperty(exports, "RampKitNative", { enumerable: true, get: function () { return __importDefault(RampKitNative_1).default; } });
// Export native APIs (replacing expo-haptics, expo-store-review, expo-notifications)
var RampKitNative_2 = require("./RampKitNative");
Object.defineProperty(exports, "Haptics", { enumerable: true, get: function () { return RampKitNative_2.Haptics; } });
Object.defineProperty(exports, "StoreReview", { enumerable: true, get: function () { return RampKitNative_2.StoreReview; } });
Object.defineProperty(exports, "Notifications", { enumerable: true, get: function () { return RampKitNative_2.Notifications; } });
Object.defineProperty(exports, "TransactionObserver", { enumerable: true, get: function () { return RampKitNative_2.TransactionObserver; } });
// Export constants
var constants_1 = require("./constants");
Object.defineProperty(exports, "SDK_VERSION", { enumerable: true, get: function () { return constants_1.SDK_VERSION; } });
Object.defineProperty(exports, "CAPABILITIES", { enumerable: true, get: function () { return constants_1.CAPABILITIES; } });
