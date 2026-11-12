package expo.modules.notificationlistener

import android.app.Notification
import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject

class NotificationService : NotificationListenerService() {

    companion object {
        private const val PREFS_NAME = "SoChiTieuNotifications"
        private const val KEY_NOTIFICATIONS = "cached_notifications"
        private const val KEY_PROCESSED_IDS = "processed_notification_ids"
        private const val MAX_CACHED = 100
        private const val MAX_PROCESSED_IDS = 300

        @Volatile
        var listenerModule: NotificationListenerModule? = null

        @Volatile
        var activeService: NotificationService? = null

        @Synchronized
        fun getCachedNotificationsJson(context: Context): String {
            activeService?.scanActiveStatusBarNotifications()
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_NOTIFICATIONS, "[]") ?: "[]"
        }

        @Synchronized
        fun clearCachedNotifications(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_NOTIFICATIONS, "[]").commit()
        }

        @Synchronized
        private fun isAlreadyProcessed(context: Context, uniqueKey: String): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(KEY_PROCESSED_IDS, "[]") ?: "[]"
            try {
                val arr = JSONArray(jsonStr)
                for (i in 0 until arr.length()) {
                    if (arr.optString(i) == uniqueKey) {
                        return true
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            return false
        }

        @Synchronized
        private fun markProcessed(context: Context, uniqueKey: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(KEY_PROCESSED_IDS, "[]") ?: "[]"
            try {
                val arr = JSONArray(jsonStr)
                val newArr = JSONArray()
                newArr.put(uniqueKey)
                val limit = minOf(arr.length(), MAX_PROCESSED_IDS - 1)
                for (i in 0 until limit) {
                    newArr.put(arr.get(i))
                }
                prefs.edit().putString(KEY_PROCESSED_IDS, newArr.toString()).commit()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @Synchronized
        fun saveAndDispatchNotification(
            context: Context,
            uniqueId: String,
            packageName: String,
            title: String,
            text: String,
            subText: String,
            timestamp: Long
        ) {
            // Avoid processing exact same status bar notification event twice
            if (isAlreadyProcessed(context, uniqueId)) {
                return
            }
            markProcessed(context, uniqueId)

            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(KEY_NOTIFICATIONS, "[]") ?: "[]"
            try {
                val array = JSONArray(jsonStr)
                val newObj = JSONObject().apply {
                    put("id", uniqueId)
                    put("packageName", packageName)
                    put("title", title)
                    put("text", text)
                    put("subText", subText)
                    put("timestamp", timestamp)
                }

                val newArray = JSONArray()
                newArray.put(newObj)
                val limit = minOf(array.length(), MAX_CACHED - 1)
                for (i in 0 until limit) {
                    newArray.put(array.get(i))
                }
                // Use commit() so background writes persist immediately before process suspension
                prefs.edit().putString(KEY_NOTIFICATIONS, newArray.toString()).commit()
            } catch (e: Exception) {
                e.printStackTrace()
            }

            // Also emit live event to JS if module is attached
            try {
                val bundle = Bundle().apply {
                    putString("id", uniqueId)
                    putString("packageName", packageName)
                    putString("title", title)
                    putString("text", text)
                    putString("subText", subText)
                    putDouble("timestamp", timestamp.toDouble())
                }
                listenerModule?.sendNotificationEvent(bundle)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        activeService = this
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        activeService = this
        return Service.START_STICKY
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        activeService = this
        scanActiveStatusBarNotifications()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        if (activeService === this) {
            activeService = null
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                requestRebind(ComponentName(applicationContext, NotificationService::class.java))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    override fun onDestroy() {
        if (activeService === this) {
            activeService = null
        }
        super.onDestroy()
    }

    fun scanActiveStatusBarNotifications() {
        try {
            val activeList = activeNotifications ?: return
            for (sbn in activeList) {
                processStatusBarNotification(sbn)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun processStatusBarNotification(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return
        // Ignore system UI or our own app
        if (packageName == "android" || packageName == "com.android.systemui" || packageName == applicationContext.packageName) {
            return
        }

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = (extras.getCharSequence(Notification.EXTRA_TITLE)
            ?: extras.getCharSequence(Notification.EXTRA_TITLE_BIG))?.toString()?.trim() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()?.trim() ?: ""
        val tickerText = notification.tickerText?.toString()?.trim() ?: ""

        // Check EXTRA_TEXT_LINES if inbox style
        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        val joinedLines = textLines?.joinToString("\n") { it.toString() }?.trim() ?: ""

        val fullContent = when {
            bigText.isNotEmpty() && bigText.length >= text.length -> bigText
            joinedLines.isNotEmpty() && joinedLines.length > text.length -> joinedLines
            text.isNotEmpty() -> text
            tickerText.isNotEmpty() -> tickerText
            else -> ""
        }

        if (title.isEmpty() && fullContent.isEmpty()) return

        val postTime = if (sbn.postTime > 0) sbn.postTime else System.currentTimeMillis()
        val uniqueId = "${packageName}_${sbn.id}_${postTime}_${fullContent.hashCode()}"

        saveAndDispatchNotification(
            applicationContext,
            uniqueId,
            packageName,
            title,
            fullContent,
            subText,
            postTime
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        processStatusBarNotification(sbn)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}
