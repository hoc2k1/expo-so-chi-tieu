package expo.modules.notificationlistener

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationListenerModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("NotificationListener")

    Events("onNotificationReceived")

    OnCreate {
      NotificationService.listenerModule = this@NotificationListenerModule
    }

    OnDestroy {
      if (NotificationService.listenerModule == this@NotificationListenerModule) {
        NotificationService.listenerModule = null
      }
    }

    Function("isPermissionGranted") {
      val context = appContext.reactContext ?: return@Function false
      val packageName = context.packageName
      val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
      return@Function enabledPackages.contains(packageName)
    }

    Function("requestPermission") {
      val context = appContext.currentActivity ?: appContext.reactContext ?: return@Function false
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      return@Function true
    }

    Function("getCachedNotifications") {
      val context = appContext.reactContext ?: return@Function emptyList<Map<String, Any>>()
      return@Function NotificationService.getCachedNotifications(context)
    }

    Function("clearCachedNotifications") {
      val context = appContext.reactContext ?: return@Function false
      NotificationService.clearCachedNotifications(context)
      return@Function true
    }
  }

  fun sendNotificationEvent(data: Map<String, Any>) {
    sendEvent("onNotificationReceived", data)
  }
}
