import { RawNotification } from './NotificationListener.types';

export default {
  isPermissionGranted(): boolean {
    return false;
  },
  requestPermission(): boolean {
    return false;
  },
  ensureServiceConnected(): boolean {
    return false;
  },
  forceScanStatusBar(): boolean {
    return false;
  },
  setEnabledPackages(_packages: string[]): boolean {
    return true;
  },
  getCachedNotifications(): RawNotification[] {
    return [];
  },
  removeCachedNotificationsByIds(_ids: string[]): boolean {
    return true;
  },
  clearCachedNotifications(): boolean {
    return true;
  },
  setBadgeCount(_count: number): boolean {
    return false;
  },
  isBatteryOptimizationIgnored(): boolean {
    return true;
  },
  requestIgnoreBatteryOptimization(): boolean {
    return false;
  },
  addListener(
    _eventName: 'onNotificationReceived',
    _listener: (notification: RawNotification) => void
  ) {
    return { remove: () => {} };
  },
};

export * from './NotificationListener.types';
