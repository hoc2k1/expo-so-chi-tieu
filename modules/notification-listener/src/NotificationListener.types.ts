export interface RawNotification {
  id: string;
  packageName: string;
  title: string;
  text: string;
  subText?: string;
  timestamp: number;
}

export type NotificationListenerEvents = {
  [eventName: string]: (...args: any[]) => void;
  onNotificationReceived: (notification: RawNotification) => void;
};
