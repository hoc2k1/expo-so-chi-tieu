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
  getCachedNotifications(): RawNotification[] {
    return [];
  },
  clearCachedNotifications(): boolean {
    return true;
  },
  addListener(
    _eventName: 'onNotificationReceived',
    _listener: (notification: RawNotification) => void
  ) {
    return { remove: () => {} };
  },
};

export * from './NotificationListener.types';
