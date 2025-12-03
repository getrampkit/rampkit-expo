/**
 * RampKit Native Module Bridge
 * TypeScript interface to the native iOS/Android module
 */
interface RampKitNativeModule {
    getDeviceInfo(): Promise<NativeDeviceInfo>;
    getUserId(): Promise<string>;
    getStoredValue(key: string): Promise<string | null>;
    setStoredValue(key: string, value: string): Promise<void>;
    getLaunchTrackingData(): Promise<NativeLaunchData>;
    impactAsync(style: string): Promise<void>;
    notificationAsync(type: string): Promise<void>;
    selectionAsync(): Promise<void>;
    requestReview(): Promise<boolean | void>;
    isReviewAvailable(): Promise<boolean>;
    getStoreUrl(): Promise<string | null>;
    requestNotificationPermissions(options?: NotificationOptions): Promise<NotificationPermissionResult>;
    getNotificationPermissions(): Promise<NotificationPermissionResult>;
}
export interface NativeDeviceInfo {
    appUserId: string;
    vendorId: string | null;
    appSessionId: string;
    installDate: string;
    isFirstLaunch: boolean;
    launchCount: number;
    lastLaunchAt: string | null;
    bundleId: string | null;
    appName: string | null;
    appVersion: string | null;
    buildNumber: string | null;
    platform: string;
    platformVersion: string;
    deviceModel: string;
    deviceName: string;
    isSimulator: boolean;
    deviceLanguageCode: string | null;
    deviceLocale: string;
    regionCode: string | null;
    preferredLanguage: string | null;
    preferredLanguages: string[];
    deviceCurrencyCode: string | null;
    deviceCurrencySymbol: string | null;
    timezoneIdentifier: string;
    timezoneOffsetSeconds: number;
    interfaceStyle: string;
    screenWidth: number;
    screenHeight: number;
    screenScale: number;
    isLowPowerMode: boolean;
    totalMemoryBytes: number;
    collectedAt: string;
}
export interface NativeLaunchData {
    installDate: string;
    isFirstLaunch: boolean;
    launchCount: number;
    lastLaunchAt: string | null;
}
export interface NotificationOptions {
    ios?: {
        allowAlert?: boolean;
        allowBadge?: boolean;
        allowSound?: boolean;
    };
    android?: {
        channelId?: string;
        name?: string;
        importance?: "MAX" | "HIGH" | "DEFAULT" | "LOW" | "MIN";
    };
}
export interface NotificationPermissionResult {
    granted: boolean;
    status: "undetermined" | "denied" | "granted" | "provisional" | "ephemeral";
    canAskAgain: boolean;
    ios?: {
        alertSetting?: string;
        badgeSetting?: string;
        soundSetting?: string;
        lockScreenSetting?: string;
        notificationCenterSetting?: string;
    };
    error?: string;
}
export type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
export type NotificationType = "success" | "warning" | "error";
declare let RampKitNativeModule: RampKitNativeModule;
export default RampKitNativeModule;
export declare function getDeviceInfo(): Promise<NativeDeviceInfo>;
export declare function getUserId(): Promise<string>;
export declare function getStoredValue(key: string): Promise<string | null>;
export declare function setStoredValue(key: string, value: string): Promise<void>;
export declare function getLaunchTrackingData(): Promise<NativeLaunchData>;
export declare const Haptics: {
    /**
     * Trigger an impact haptic feedback
     */
    impactAsync(style?: ImpactStyle): Promise<void>;
    /**
     * Trigger a notification haptic feedback
     */
    notificationAsync(type?: NotificationType): Promise<void>;
    /**
     * Trigger a selection haptic feedback
     */
    selectionAsync(): Promise<void>;
};
export declare const StoreReview: {
    /**
     * Request an in-app review
     */
    requestReview(): Promise<void>;
    /**
     * Check if in-app review is available
     */
    isAvailableAsync(): Promise<boolean>;
    /**
     * Check if the review action is available
     */
    hasAction(): Promise<boolean>;
    /**
     * Get the store URL for the app
     */
    storeUrl(): string | null;
};
export declare const Notifications: {
    /**
     * Request notification permissions
     */
    requestPermissionsAsync(options?: NotificationOptions): Promise<NotificationPermissionResult>;
    /**
     * Get current notification permissions
     */
    getPermissionsAsync(): Promise<NotificationPermissionResult>;
    /**
     * Set notification handler (no-op in native implementation)
     * The app should handle this separately if needed
     */
    setNotificationHandler(_handler: any): void;
    /**
     * Android notification channel creation is handled in requestPermissionsAsync
     */
    setNotificationChannelAsync(_channelId: string, _options: any): Promise<void>;
    AndroidImportance: {
        MAX: number;
        HIGH: number;
        DEFAULT: number;
        LOW: number;
        MIN: number;
    };
};
