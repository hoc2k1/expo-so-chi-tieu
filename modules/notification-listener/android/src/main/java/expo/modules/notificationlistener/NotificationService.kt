package expo.modules.notificationlistener

import android.app.Notification
import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Parcelable
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

class NotificationService : NotificationListenerService() {

    companion object {
        private const val PREFS_NAME = "SoChiTieuNotifications"
        private const val KEY_NOTIFICATIONS = "cached_notifications"
        private const val KEY_PROCESSED_IDS = "processed_notification_ids"
        private const val KEY_ENABLED_PACKAGES = "enabled_packages"
        private const val MAX_CACHED = 500
        private const val MAX_PROCESSED_IDS = 1200
        private const val TOGGLE_COOLDOWN_MS = 20_000L
        private const val REBIND_COOLDOWN_MS = 5_000L

        private val SYSTEM_IGNORED_PACKAGES = setOf(
            "android",
            "com.android.systemui",
            "com.android.providers.downloads",
            "com.google.android.gms",
            "com.android.vending",
            "com.sec.android.app.launcher",
            "com.miui.home",
            "com.huawei.android.launcher",
            "com.oppo.launcher"
        )

        private val FINANCIAL_AND_MSG_KEYWORDS = listOf(
            "vcb", "vietcombank", "mbmobile", "mbbank", "techcombank", "tcb",
            "bidv", "vietinbank", "ipay", "acb", "tpb", "tpbank", "vpbank",
            "sacombank", "agribank", "msb", "timo", "vtpay", "viettel",
            "momo", "zalopay", "vnpay", "airpay", "shopeepay", "vib",
            "cake", "tnex", "hdbank", "shb", "ocb", "seabank", "lpbank",
            "lienviet", "eximbank", "namabank", "pvcombank", "kbank", "uob",
            "hsbc", "shinhan", "woori", "scb", "bacabank", "abbank", "bvbank",
            "VietCapital", "banviet", "ncb", "kienlong", "pgbank", "saigonbank",
            "vietbank", "vietabank", "baoviet", "gpbank", "oceanbank", "cbway",
            "pay", "wallet", "bank", "finance",
            "com.google.android.gm", "outlook", "messaging", "mms", "sms", "zalo"
        )

        @Volatile
        var listenerModule: NotificationListenerModule? = null

        @Volatile
        var activeService: NotificationService? = null

        @Volatile
        private var lastToggleAttemptMs: Long = 0L

        @Volatile
        private var lastRebindAttemptMs: Long = 0L

        @Synchronized
        fun setEnabledPackages(context: Context, packagesJson: String) {
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                prefs.edit().putString(KEY_ENABLED_PACKAGES, packagesJson).commit()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @Synchronized
        private fun isPackageCandidateAllowed(context: Context, packageName: String): Boolean {
            val pkgLower = packageName.lowercase().trim()
            if (pkgLower.isEmpty()) return false
            if (pkgLower == context.packageName.lowercase() || SYSTEM_IGNORED_PACKAGES.contains(pkgLower)) {
                return false
            }

            // 1. Check user-configured enabledPackages in SharedPreferences
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val enabledJson = prefs.getString(KEY_ENABLED_PACKAGES, null)
                if (!enabledJson.isNullOrEmpty()) {
                    val arr = JSONArray(enabledJson)
                    for (i in 0 until arr.length()) {
                        if (arr.optString(i).lowercase().trim() == pkgLower) {
                            return true
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

            // 2. Also allow known financial/bank/wallet/SMS/email packages so status bar rescan works anytime
            for (kw in FINANCIAL_AND_MSG_KEYWORDS) {
                if (pkgLower.contains(kw.lowercase())) {
                    return true
                }
            }

            return false
        }

        fun ensureServiceBound(context: Context, forceToggle: Boolean = false): Boolean {
            try {
                val appCtx = context.applicationContext
                val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(appCtx)
                if (!enabledPackages.contains(appCtx.packageName)) {
                    return false
                }

                // If service is already connected and alive, no need to disrupt it
                if (activeService != null && !forceToggle) {
                    return true
                }

                val now = System.currentTimeMillis()
                val componentName = ComponentName(appCtx, NotificationService::class.java)

                // Only toggle component state if service is null and cooldown has elapsed
                if (activeService == null && (forceToggle || now - lastToggleAttemptMs > TOGGLE_COOLDOWN_MS)) {
                    lastToggleAttemptMs = now
                    val pm = appCtx.packageManager
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
                    if (forceToggle || now - lastRebindAttemptMs > REBIND_COOLDOWN_MS) {
                        lastRebindAttemptMs = now
                        requestRebind(componentName)
                    }
                }
                return true
            } catch (e: Exception) {
                e.printStackTrace()
                return false
            }
        }

        @Synchronized
        fun getCachedNotificationsJson(context: Context): String {
            activeService?.scanActiveStatusBarNotifications(ignoreProcessedCache = false)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_NOTIFICATIONS, "[]") ?: "[]"
        }

        @Synchronized
        fun forceScanStatusBar(context: Context): Boolean {
            val service = activeService
            if (service != null) {
                service.scanActiveStatusBarNotifications(ignoreProcessedCache = true)
                return true
            } else {
                ensureServiceBound(context, forceToggle = true)
                return false
            }
        }

        @Synchronized
        fun removeCachedNotificationsByIds(context: Context, idsJson: String) {
            try {
                val idsArray = JSONArray(idsJson)
                if (idsArray.length() == 0) return
                val idsToRemove = HashSet<String>(idsArray.length())
                for (i in 0 until idsArray.length()) {
                    val id = idsArray.optString(i)
                    if (id.isNotEmpty()) idsToRemove.add(id)
                }
                if (idsToRemove.isEmpty()) return

                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val jsonStr = prefs.getString(KEY_NOTIFICATIONS, "[]") ?: "[]"
                val currentArray = JSONArray(jsonStr)
                val remainingArray = JSONArray()

                for (i in 0 until currentArray.length()) {
                    val item = currentArray.optJSONObject(i) ?: continue
                    val itemId = item.optString("id", "")
                    if (!idsToRemove.contains(itemId)) {
                        remainingArray.put(item)
                    }
                }

                prefs.edit().putString(KEY_NOTIFICATIONS, remainingArray.toString()).commit()
            } catch (e: Exception) {
                e.printStackTrace()
            }
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
        private fun isAlreadyInCache(context: Context, uniqueKey: String): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(KEY_NOTIFICATIONS, "[]") ?: "[]"
            try {
                val arr = JSONArray(jsonStr)
                for (i in 0 until arr.length()) {
                    val obj = arr.optJSONObject(i) ?: continue
                    if (obj.optString("id") == uniqueKey) {
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
                    val existing = arr.optString(i)
                    if (existing.isNotEmpty() && existing != uniqueKey) {
                        newArr.put(existing)
                    }
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
            timestamp: Long,
            ignoreProcessedCache: Boolean = false
        ) {
            if (!ignoreProcessedCache && isAlreadyProcessed(context, uniqueId)) {
                return
            }
            if (isAlreadyInCache(context, uniqueId)) {
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

            // Emit live event to JS if module is attached
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
        scanActiveStatusBarNotifications(ignoreProcessedCache = false)
        // Notify JS in case JS opened while service was still binding asynchronously
        try {
            val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val cachedStr = prefs.getString(KEY_NOTIFICATIONS, "[]") ?: "[]"
            if (cachedStr != "[]" && cachedStr.length > 2) {
                val wakeupBundle = Bundle().apply {
                    putString("id", "service_connected_sync")
                    putString("packageName", applicationContext.packageName)
                    putString("title", "")
                    putString("text", "")
                    putString("subText", "")
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                }
                listenerModule?.sendNotificationEvent(wakeupBundle)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
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

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
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

    fun scanActiveStatusBarNotifications(ignoreProcessedCache: Boolean = false) {
        try {
            val activeList = activeNotifications ?: return
            for (sbn in activeList) {
                processStatusBarNotification(sbn, ignoreProcessedCache)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun extractMessagesFromBundles(parcelables: Array<Parcelable>?): List<Pair<String, Long>> {
        if (parcelables == null || parcelables.isEmpty()) return emptyList()
        val result = mutableListOf<Pair<String, Long>>()
        for (p in parcelables) {
            if (p is Bundle) {
                val msgText = p.getCharSequence("text")?.toString()?.trim() ?: ""
                val sender = p.getCharSequence("sender")?.toString()?.trim() ?: ""
                val msgTime = p.getLong("time", 0L)
                if (msgText.isNotEmpty()) {
                    val combined = if (sender.isNotEmpty() && !msgText.startsWith(sender)) {
                        "$sender: $msgText"
                    } else {
                        msgText
                    }
                    result.add(Pair(combined, msgTime))
                }
            }
        }
        return result
    }

    private fun processStatusBarNotification(
        sbn: StatusBarNotification?,
        ignoreProcessedCache: Boolean = false
    ) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return
        val notification = sbn.notification ?: return

        // 1. Ignore ongoing / foreground service / progress notifications (music, downloads, maps, calls)
        val flags = notification.flags
        if ((flags and Notification.FLAG_ONGOING_EVENT) != 0 ||
            (flags and Notification.FLAG_FOREGROUND_SERVICE) != 0
        ) {
            return
        }

        val category = notification.category
        if (category == Notification.CATEGORY_PROGRESS ||
            category == Notification.CATEGORY_TRANSPORT ||
            category == Notification.CATEGORY_SERVICE ||
            category == Notification.CATEGORY_CALL ||
            category == Notification.CATEGORY_ALARM ||
            category == Notification.CATEGORY_SYSTEM
        ) {
            return
        }

        // 2. Only cache candidate financial / messaging / email / user-enabled packages
        if (!isPackageCandidateAllowed(applicationContext, packageName)) {
            return
        }

        val extras = notification.extras ?: return

        val rawTitle = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val bigTitle = extras.getCharSequence(Notification.EXTRA_TITLE_BIG)?.toString()?.trim() ?: ""
        val title = when {
            rawTitle.isNotEmpty() && bigTitle.isNotEmpty() && !bigTitle.contains(rawTitle, ignoreCase = true) && !rawTitle.contains(bigTitle, ignoreCase = true) ->
                "$rawTitle - $bigTitle"
            bigTitle.length > rawTitle.length -> bigTitle
            else -> rawTitle
        }

        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()?.trim() ?: ""
        val summaryText = extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString()?.trim() ?: ""
        val infoText = extras.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString()?.trim() ?: ""
        val tickerText = notification.tickerText?.toString()?.trim() ?: ""

        val combinedSubText = listOf(subText, summaryText, infoText)
            .filter { it.isNotEmpty() }
            .distinct()
            .joinToString(" | ")

        // Combine text and bigText without losing text if bigText is a separate detail string
        val primaryContent = when {
            bigText.isNotEmpty() && text.isNotEmpty() -> {
                if (bigText.contains(text, ignoreCase = true)) {
                    bigText
                } else if (text.contains(bigText, ignoreCase = true)) {
                    text
                } else {
                    "$text\n$bigText"
                }
            }
            bigText.isNotEmpty() -> bigText
            text.isNotEmpty() -> text
            tickerText.isNotEmpty() -> tickerText
            else -> ""
        }

        val postTime = if (sbn.postTime > 0) sbn.postTime else System.currentTimeMillis()
        val isGroupSummary = (flags and Notification.FLAG_GROUP_SUMMARY) != 0

        // 3. Check MessagingStyle messages (EXTRA_MESSAGES / EXTRA_HISTORIC_MESSAGES)
        @Suppress("DEPRECATION")
        val msgParcelables = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
        val extractedMessages = extractMessagesFromBundles(msgParcelables)

        // 4. Check InboxStyle lines (EXTRA_TEXT_LINES)
        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
            ?.map { it.toString().trim() }
            ?.filter { it.isNotEmpty() }
            ?: emptyList()

        // Dispatch individual MessagingStyle messages if multiple exist
        if (extractedMessages.isNotEmpty()) {
            for ((idx, pair) in extractedMessages.withIndex()) {
                val (msgContent, msgTime) = pair
                val ts = if (msgTime > 0) msgTime else (postTime + idx)
                val msgUniqueId = "${packageName}_msg_${msgContent.hashCode()}_${ts / 60000}"
                saveAndDispatchNotification(
                    applicationContext,
                    msgUniqueId,
                    packageName,
                    title,
                    msgContent,
                    combinedSubText,
                    ts,
                    ignoreProcessedCache
                )
            }
        }

        // Dispatch individual InboxStyle lines so an old OTP or old transaction line never poisons a new transaction line
        if (textLines.isNotEmpty()) {
            for ((idx, line) in textLines.withIndex()) {
                if (line != primaryContent) {
                    val lineUniqueId = "${packageName}_${sbn.id}_line_${line.hashCode()}"
                    saveAndDispatchNotification(
                        applicationContext,
                        lineUniqueId,
                        packageName,
                        title,
                        line,
                        combinedSubText,
                        postTime + idx,
                        ignoreProcessedCache
                    )
                }
            }
        }

        // Dispatch primary notification content (skip if it's purely a Group Summary with textLines already dispatched)
        if (primaryContent.isNotEmpty() || title.isNotEmpty()) {
            if (isGroupSummary && textLines.isNotEmpty() && bigText.isEmpty()) {
                return
            }
            val uniqueId = "${packageName}_${sbn.id}_${postTime}_${primaryContent.hashCode()}"
            saveAndDispatchNotification(
                applicationContext,
                uniqueId,
                packageName,
                title,
                primaryContent,
                combinedSubText,
                postTime,
                ignoreProcessedCache
            )
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        activeService = this
        processStatusBarNotification(sbn, ignoreProcessedCache = false)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}
