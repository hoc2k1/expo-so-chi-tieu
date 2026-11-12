import { NativeModule, requireNativeModule } from 'expo';
import { RawNotification, NotificationListenerEvents } from './NotificationListener.types';

declare class NotificationListenerNativeModule extends NativeModule<NotificationListenerEvents> {
  isPermissionGranted(): boolean;
  requestPermission(): boolean;
  ensureServiceConnected(): boolean;
  getCachedNotificationsJson(): string;
  clearCachedNotifications(): boolean;
}

const nativeModule = requireNativeModule<NotificationListenerNativeModule>('NotificationListener');

export default {
  isPermissionGranted(): boolean {
    return nativeModule.isPermissionGranted();
  },
  requestPermission(): boolean {
    return nativeModule.requestPermission();
  },
  ensureServiceConnected(): boolean {
    return nativeModule.ensureServiceConnected();
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
  clearCachedNotifications(): boolean {
    return nativeModule.clearCachedNotifications();
  },
  addListener(
    eventName: 'onNotificationReceived',
    listener: (notification: RawNotification) => void
  ) {
    return nativeModule.addListener(eventName, listener);
  },
};

export * from './NotificationListener.types';
