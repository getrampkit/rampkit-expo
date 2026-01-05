/**
 * RampKit Targeting Context
 * Builds targeting context from DeviceInfo for rule evaluation
 */

import { DeviceInfo, TargetingContext } from "./types";
import { SDK_VERSION } from "./constants";

/**
 * Calculate days since install from install date string
 */
function calculateDaysSinceInstall(installDateString: string): number {
  try {
    const installDate = new Date(installDateString);
    const now = new Date();
    const diffMs = now.getTime() - installDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}

/**
 * Build targeting context from DeviceInfo
 * Maps SDK device info to the attribute structure used by targeting rules
 */
export function buildTargetingContext(deviceInfo: DeviceInfo | null): TargetingContext {
  if (!deviceInfo) {
    // Return default context with null values for optional fields
    return {
      user: {
        isNewUser: true,
        daysSinceInstall: 0,
        subscriptionStatus: null,
        hasAppleSearchAdsAttribution: false,
      },
      device: {
        platform: "iOS",
        model: "unknown",
        osVersion: "0",
        interfaceStyle: "light",
        country: "US",
        language: "en",
        locale: "en_US",
        currencyCode: "USD",
      },
      app: {
        version: "1.0.0",
        buildNumber: "1",
        sdkVersion: SDK_VERSION,
      },
      asa: {
        keyword: null,
        campaignId: null,
      },
      cpp: {
        pageId: null,
      },
    };
  }

  // Extract country from regionCode or locale
  const country = deviceInfo.regionCode ||
    deviceInfo.deviceLocale?.split("_")[1] ||
    "US";

  // Extract language from deviceLanguageCode or locale
  const language = deviceInfo.deviceLanguageCode ||
    deviceInfo.deviceLocale?.split("_")[0] ||
    "en";

  return {
    user: {
      isNewUser: deviceInfo.isFirstLaunch,
      daysSinceInstall: calculateDaysSinceInstall(deviceInfo.installDate),
      subscriptionStatus: null, // Not yet collected - will be null
      hasAppleSearchAdsAttribution: deviceInfo.isAppleSearchAdsAttribution,
    },
    device: {
      platform: deviceInfo.platform,
      model: deviceInfo.deviceModel,
      osVersion: deviceInfo.platformVersion,
      interfaceStyle: deviceInfo.interfaceStyle,
      country,
      language,
      locale: deviceInfo.deviceLocale,
      currencyCode: deviceInfo.deviceCurrencyCode || "USD",
    },
    app: {
      version: deviceInfo.appVersion || "1.0.0",
      buildNumber: deviceInfo.buildNumber || "1",
      sdkVersion: deviceInfo.sdkVersion,
    },
    asa: {
      keyword: null, // Not yet collected
      campaignId: null, // Not yet collected
    },
    cpp: {
      pageId: null, // Not yet collected
    },
  };
}
