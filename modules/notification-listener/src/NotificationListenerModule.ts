import { NativeModule, requireNativeModule } from 'expo';
import { RawNotification, NotificationListenerEvents } from './NotificationListener.types';

declare class NotificationListenerNativeModule extends NativeModule<NotificationListenerEvents> {
  isPermissionGranted(): boolean;
  requestPermission(): boolean;
  getCachedNotifications(): RawNotification[];
  clearCachedNotifications(): boolean;
}

export default requireNativeModule<NotificationListenerNativeModule>('NotificationListener');
export * from './NotificationListener.types';
