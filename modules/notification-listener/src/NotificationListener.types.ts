export interface RawNotification {
  id: string;
  packageName: string;
  title: string;
  text: string;
  subText?: string;
  timestamp: number;
}

export interface NativeDebugLog {
  id: string;
  timestamp: number;
  packageName: string;
  status: string;
  reason: string;
  preview: string;
}

export type NotificationListenerEvents = {
  [eventName: string]: (...args: any[]) => void;
  onNotificationReceived: (notification: RawNotification) => void;
};
