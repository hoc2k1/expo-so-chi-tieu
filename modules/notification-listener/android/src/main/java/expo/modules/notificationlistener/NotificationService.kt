package expo.modules.notificationlistener

import android.app.Notification
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject

class NotificationService : NotificationListenerService() {

    companion object {
        private const val PREFS_NAME = "SoChiTieuNotifications"
        private const val KEY_NOTIFICATIONS = "cached_notifications"
        private const val MAX_CACHED = 50

        var listenerModule: NotificationListenerModule? = null

        fun getCachedNotifications(context: Context): List<Map<String, Any>> {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(KEY_NOTIFICATIONS, "[]") ?: "[]"
            val result = mutableListOf<Map<String, Any>>()
            try {
                val array = JSONArray(jsonStr)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val map = mutableMapOf<String, Any>()
                    val keys = obj.keys()
                    while (keys.hasNext()) {
                        val key = keys.next()
                        map[key] = obj.get(key)
                    }
                    result.add(map)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            return result
        }

        fun clearCachedNotifications(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_NOTIFICATIONS, "[]").apply()
        }

        fun saveNotification(context: Context, notifMap: Map<String, Any>) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(KEY_NOTIFICATIONS, "[]") ?: "[]"
            try {
                val array = JSONArray(jsonStr)
                val newObj = JSONObject(notifMap)
                
                // Add to start
                val newArray = JSONArray()
                newArray.put(newObj)
                val limit = minOf(array.length(), MAX_CACHED - 1)
                for (i in 0 until limit) {
                    newArray.put(array.get(i))
                }
                prefs.edit().putString(KEY_NOTIFICATIONS, newArray.toString()).apply()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName ?: return
        val extras = sbn.notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""
        val fullContent = if (bigText.isNotEmpty() && bigText.length > text.length) bigText else text

        if (title.isEmpty() && fullContent.isEmpty()) return

        val notifMap = mapOf(
            "id" to "${sbn.id}_${sbn.postTime}",
            "packageName" to packageName,
            "title" to title,
            "text" to fullContent,
            "subText" to subText,
            "timestamp" to sbn.postTime
        )

        // Save to cache so JS can pull when opened
        saveNotification(applicationContext, notifMap)

        // If JS module is live, send event immediately
        listenerModule?.sendNotificationEvent(notifMap)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}

