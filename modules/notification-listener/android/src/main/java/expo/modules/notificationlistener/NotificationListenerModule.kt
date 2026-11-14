package expo.modules.notificationlistener

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
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
      val context = appContext.reactContext
      if (context != null) {
        NotificationService.ensureServiceBound(context, forceToggle = false)
      }
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
      if (granted && NotificationService.activeService == null) {
        NotificationService.ensureServiceBound(context, forceToggle = false)
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
      val context = appContext.reactContext ?: return@Function false
      return@Function NotificationService.ensureServiceBound(context, forceToggle = false)
    }

    Function("forceScanStatusBar") {
      val context = appContext.reactContext ?: return@Function false
      return@Function NotificationService.forceScanStatusBar(context)
    }

    Function("setEnabledPackages") { packagesJson: String ->
      val context = appContext.reactContext ?: return@Function false
      NotificationService.setEnabledPackages(context, packagesJson)
      return@Function true
    }

    Function("getCachedNotificationsJson") {
      val context = appContext.reactContext ?: return@Function "[]"
      if (NotificationService.activeService == null) {
        NotificationService.ensureServiceBound(context, forceToggle = false)
      }
      return@Function NotificationService.getCachedNotificationsJson(context)
    }

    Function("removeCachedNotificationsByIds") { idsJson: String ->
      val context = appContext.reactContext ?: return@Function false
      NotificationService.removeCachedNotificationsByIds(context, idsJson)
      return@Function true
    }

    Function("clearCachedNotifications") {
      val context = appContext.reactContext ?: return@Function false
      NotificationService.clearCachedNotifications(context)
      return@Function true
    }

    Function("setBadgeCount") { count: Int ->
      val context = appContext.reactContext ?: return@Function false
      NotificationService.updateAppBadge(context, count)
      return@Function true
    }

    Function("isBatteryOptimizationIgnored") {
      val context = appContext.reactContext ?: return@Function true
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        return@Function pm?.isIgnoringBatteryOptimizations(context.packageName) ?: true
      }
      return@Function true
    }

    Function("requestIgnoreBatteryOptimization") {
      val context = appContext.currentActivity ?: appContext.reactContext ?: return@Function false
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        try {
          val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:${context.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
          context.startActivity(intent)
          return@Function true
        } catch (e: Exception) {
          try {
            val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
              addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(fallbackIntent)
            return@Function true
          } catch (ex: Exception) {
            ex.printStackTrace()
          }
        }
      }
      return@Function false
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
