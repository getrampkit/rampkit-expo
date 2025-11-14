"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRampKitUserId = exports.RampKit = void 0;
const RampKit_1 = require("./RampKit");
exports.RampKit = RampKit_1.RampKitCore.instance;
var userId_1 = require("./userId");
Object.defineProperty(exports, "getRampKitUserId", { enumerable: true, get: function () { return userId_1.getRampKitUserId; } });
