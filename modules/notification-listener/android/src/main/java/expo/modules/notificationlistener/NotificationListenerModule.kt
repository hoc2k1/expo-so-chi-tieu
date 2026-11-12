package expo.modules.notificationlistener

import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.service.notification.NotificationListenerService
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationListenerModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("NotificationListener")

    Events("onNotificationReceived")

    OnCreate {
      NotificationService.listenerModule = this@NotificationListenerModule
      ensureRebind()
    }

    OnDestroy {
      if (NotificationService.listenerModule === this@NotificationListenerModule) {
        NotificationService.listenerModule = null
      }
    }

    Function("isPermissionGranted") {
      val context = appContext.reactContext ?: return@Function false
      val packageName = context.packageName
      val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
      val granted = enabledPackages.contains(packageName)
      if (granted) {
        ensureRebind()
      }
      return@Function granted
    }

    Function("requestPermission") {
      val context = appContext.currentActivity ?: appContext.reactContext ?: return@Function false
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      return@Function true
    }

    Function("ensureServiceConnected") {
      return@Function ensureRebind()
    }

    Function("getCachedNotificationsJson") {
      val context = appContext.reactContext ?: return@Function "[]"
      ensureRebind()
      return@Function NotificationService.getCachedNotificationsJson(context)
    }

    Function("clearCachedNotifications") {
      val context = appContext.reactContext ?: return@Function false
      NotificationService.clearCachedNotifications(context)
      return@Function true
    }
  }

  private fun ensureRebind(): Boolean {
    val context = appContext.reactContext ?: return false
    try {
      val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
      if (!enabledPackages.contains(context.packageName)) {
        return false
      }

      val componentName = ComponentName(context, NotificationService::class.java)

      // If service is not currently active, toggle component state to force Android OS to rebind it
      if (NotificationService.activeService == null) {
        val pm = context.packageManager
        pm.setComponentEnabledSetting(
          componentName,
          PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
          PackageManager.DONT_KILL_APP
        )
        pm.setComponentEnabledSetting(
          componentName,
          PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
          PackageManager.DONT_KILL_APP
        )
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        NotificationListenerService.requestRebind(componentName)
      }
      return true
    } catch (e: Exception) {
      e.printStackTrace()
      return false
    }
  }

  fun sendNotificationEvent(bundle: Bundle) {
    try {
      sendEvent("onNotificationReceived", bundle)
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }
}
