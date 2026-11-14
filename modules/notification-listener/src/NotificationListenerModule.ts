import { NativeModule, requireNativeModule } from 'expo';
import { RawNotification, NotificationListenerEvents } from './NotificationListener.types';

declare class NotificationListenerNativeModule extends NativeModule<NotificationListenerEvents> {
  isPermissionGranted(): boolean;
  requestPermission(): boolean;
  ensureServiceConnected(): boolean;
  forceScanStatusBar(): boolean;
  setEnabledPackages(packagesJson: string): boolean;
  getCachedNotificationsJson(): string;
  removeCachedNotificationsByIds(idsJson: string): boolean;
  clearCachedNotifications(): boolean;
  setBadgeCount(count: number): boolean;
  isBatteryOptimizationIgnored(): boolean;
  requestIgnoreBatteryOptimization(): boolean;
}

const nativeModule = requireNativeModule<NotificationListenerNativeModule>('NotificationListener');

export default {
  isPermissionGranted(): boolean {
    try {
      return nativeModule.isPermissionGranted();
    } catch {
      return false;
    }
  },
  requestPermission(): boolean {
    try {
      return nativeModule.requestPermission();
    } catch {
      return false;
    }
  },
  ensureServiceConnected(): boolean {
    try {
      return nativeModule.ensureServiceConnected();
    } catch {
      return false;
    }
  },
  forceScanStatusBar(): boolean {
    try {
      if (typeof nativeModule.forceScanStatusBar === 'function') {
        return nativeModule.forceScanStatusBar();
      }
      return nativeModule.ensureServiceConnected();
    } catch {
      return false;
    }
  },
  setEnabledPackages(packages: string[]): boolean {
    try {
      if (typeof nativeModule.setEnabledPackages === 'function') {
        return nativeModule.setEnabledPackages(JSON.stringify(packages || []));
      }
      return false;
    } catch {
      return false;
    }
  },
  getCachedNotifications(): RawNotification[] {
    try {
      const jsonStr = nativeModule.getCachedNotificationsJson();
      if (!jsonStr) return [];
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse cached notifications JSON:', e);
      return [];
    }
  },
  removeCachedNotificationsByIds(ids: string[]): boolean {
    try {
      if (!ids || ids.length === 0) return true;
      if (typeof nativeModule.removeCachedNotificationsByIds === 'function') {
        return nativeModule.removeCachedNotificationsByIds(JSON.stringify(ids));
      }
      // Fallback for older native builds that don't have removeCachedNotificationsByIds yet
      return nativeModule.clearCachedNotifications();
    } catch {
      return false;
    }
  },
  clearCachedNotifications(): boolean {
    try {
      return nativeModule.clearCachedNotifications();
    } catch {
      return false;
    }
  },
  setBadgeCount(count: number): boolean {
    try {
      if (typeof nativeModule.setBadgeCount === 'function') {
        return nativeModule.setBadgeCount(Math.max(0, Math.floor(count)));
      }
      return false;
    } catch {
      return false;
    }
  },
  isBatteryOptimizationIgnored(): boolean {
    try {
      if (typeof nativeModule.isBatteryOptimizationIgnored === 'function') {
        return nativeModule.isBatteryOptimizationIgnored();
      }
      return true;
    } catch {
      return true;
    }
  },
  requestIgnoreBatteryOptimization(): boolean {
    try {
      if (typeof nativeModule.requestIgnoreBatteryOptimization === 'function') {
        return nativeModule.requestIgnoreBatteryOptimization();
      }
      return false;
    } catch {
      return false;
    }
  },
  addListener(
    eventName: 'onNotificationReceived',
    listener: (notification: RawNotification) => void
  ) {
    return nativeModule.addListener(eventName, listener);
  },
};

export * from './NotificationListener.types';
