import { RawNotification } from './NotificationListener.types';

export default {
  isPermissionGranted(): boolean {
    return false;
  },
  requestPermission(): boolean {
    return false;
  },
  getCachedNotifications(): RawNotification[] {
    return [];
  },
  clearCachedNotifications(): boolean {
    return true;
  },
  addListener() {
    return { remove: () => {} };
  },
  removeListeners() {},
};

export * from './NotificationListener.types';
