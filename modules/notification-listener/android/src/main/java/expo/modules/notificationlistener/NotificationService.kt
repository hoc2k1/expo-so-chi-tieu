package expo.modules.notificationlistener

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
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
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

class NotificationService : NotificationListenerService() {

    companion object {
        private const val PREFS_NAME = "SoChiTieuNotifications"
        private const val KEY_NOTIFICATIONS = "cached_notifications"
        private const val KEY_PROCESSED_IDS = "processed_notification_ids"
        private const val KEY_ENABLED_PACKAGES = "enabled_packages"
        private const val KEY_PENDING_COUNT = "persisted_pending_count"
        private const val KEY_NATIVE_LOGS = "native_debug_logs"
        private const val MAX_CACHED = 500
        private const val MAX_PROCESSED_IDS = 1200
        private const val MAX_NATIVE_LOGS = 120
        private const val TOGGLE_COOLDOWN_MS = 20_000L
        private const val REBIND_COOLDOWN_MS = 5_000L
        private const val BADGE_CHANNEL_ID = "so_chi_tieu_pending_badge"
        private const val BADGE_NOTIFICATION_ID = 88881

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
            "pay", "wallet", "bank", "finance", "credit", "card", "money",
            "com.google.android.gm", "outlook", "mail", "messaging", "message", "mms", "sms", "zalo", "conversations"
        )

        @Volatile
        var listenerModule: NotificationListenerModule? = null

        @Volatile
        var activeService: NotificationService? = null

        @Volatile
        private var lastToggleAttemptMs: Long = 0L

        @Volatile
        private var lastRebindAttemptMs: Long = 0L

        @Volatile
        private var pendingForceRescan: Boolean = false

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

        @Synchronized
        fun appendNativeLog(
            context: Context,
            packageName: String,
            status: String,
            reason: String,
            preview: String = ""
        ) {
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val jsonStr = prefs.getString(KEY_NATIVE_LOGS, "[]") ?: "[]"
                val arr = JSONArray(jsonStr)
                val entry = JSONObject().apply {
                    put("id", "nlog_${System.currentTimeMillis()}_${(Math.random() * 10000).toInt()}")
                    put("timestamp", System.currentTimeMillis())
                    put("packageName", packageName)
                    put("status", status)
                    put("reason", reason)
                    put("preview", preview.take(160))
                }
                val newArr = JSONArray()
                newArr.put(entry)
                val limit = minOf(arr.length(), MAX_NATIVE_LOGS - 1)
                for (i in 0 until limit) {
                    newArr.put(arr.get(i))
                }
                prefs.edit().putString(KEY_NATIVE_LOGS, newArr.toString()).apply()
            } catch (_: Exception) {}
        }

        @Synchronized
        fun getNativeLogsJson(context: Context): String {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_NATIVE_LOGS, "[]") ?: "[]"
        }

        @Synchronized
        fun clearNativeLogs(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_NATIVE_LOGS, "[]").apply()
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

                // Toggle component state when service is disconnected (with cooldown) or explicitly forced
                val shouldToggle = if (activeService == null) {
                    forceToggle || (now - lastToggleAttemptMs > TOGGLE_COOLDOWN_MS)
                } else {
                    forceToggle && (now - lastToggleAttemptMs > TOGGLE_COOLDOWN_MS)
                }
                if (shouldToggle) {
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
                pendingForceRescan = false
                service.scanActiveStatusBarNotifications(ignoreProcessedCache = true)
                return true
            } else {
                pendingForceRescan = true
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
                val persistedPending = prefs.getInt(KEY_PENDING_COUNT, 0)
                updateAppBadge(context, persistedPending + remainingArray.length(), persistAsPending = false)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @Synchronized
        fun clearCachedNotifications(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_NOTIFICATIONS, "[]").commit()
            val persistedPending = prefs.getInt(KEY_PENDING_COUNT, 0)
            updateAppBadge(context, persistedPending, persistAsPending = false)
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
                val persistedPending = prefs.getInt(KEY_PENDING_COUNT, 0)
                updateAppBadge(context, persistedPending + newArray.length(), persistAsPending = false)
                appendNativeLog(
                    context,
                    packageName,
                    "captured",
                    "Đã lưu vào bộ đệm native",
                    "$title $text".trim()
                )
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

        @Synchronized
        fun updateAppBadge(context: Context, count: Int, persistAsPending: Boolean = true) {
            try {
                val safeCount = maxOf(0, count)
                if (persistAsPending) {
                    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    prefs.edit().putInt(KEY_PENDING_COUNT, safeCount).apply()
                }

                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

                if (safeCount <= 0) {
                    notificationManager.cancel(BADGE_NOTIFICATION_ID)
                    sendLauncherBadgeBroadcast(context, 0)
                    return
                }

                // Check POST_NOTIFICATIONS runtime permission on Android 13+ (API 33+)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    val permCheck = context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                    if (permCheck != PackageManager.PERMISSION_GRANTED) {
                        // Still attempt OEM launcher broadcast as best-effort fallback
                        sendLauncherBadgeBroadcast(context, safeCount)
                        return
                    }
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val channel = NotificationChannel(
                        BADGE_CHANNEL_ID,
                        "Giao dịch chờ duyệt",
                        NotificationManager.IMPORTANCE_LOW
                    ).apply {
                        setShowBadge(true)
                        enableLights(false)
                        enableVibration(false)
                        setSound(null, null)
                        description = "Hiển thị số lượng giao dịch chờ duyệt trên biểu tượng ứng dụng"
                    }
                    notificationManager.createNotificationChannel(channel)
                }

                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val pendingIntent = if (launchIntent != null) {
                    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    } else {
                        PendingIntent.FLAG_UPDATE_CURRENT
                    }
                    PendingIntent.getActivity(context, 0, launchIntent, flags)
                } else null

                val displayCountText = if (safeCount > 99) "99+" else safeCount.toString()
                val badgeNumber = minOf(safeCount, 99)
                val iconRes = context.applicationInfo.icon
                val notification = NotificationCompat.Builder(context, BADGE_CHANNEL_ID)
                    .setSmallIcon(if (iconRes != 0) iconRes else android.R.drawable.ic_dialog_info)
                    .setContentTitle("Sổ Chi Tiêu")
                    .setContentText("Có $displayCountText giao dịch đang chờ phân loại")
                    .setNumber(badgeNumber)
                    .setBadgeIconType(NotificationCompat.BADGE_ICON_SMALL)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setSilent(true)
                    .setOngoing(true)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(false)
                    .build()

                notificationManager.notify(BADGE_NOTIFICATION_ID, notification)
                sendLauncherBadgeBroadcast(context, safeCount)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        private fun sendLauncherBadgeBroadcast(context: Context, count: Int) {
            val badgeNumber = minOf(maxOf(0, count), 99)
            val displayBadgeText = when {
                count <= 0 -> ""
                count > 99 -> "99+"
                else -> count.toString()
            }
            val launchClassName = context.packageManager.getLaunchIntentForPackage(context.packageName)?.component?.className ?: ""

            try {
                // Samsung / Standard OEM badge intent
                val intent = Intent("android.intent.action.BADGE_COUNT_UPDATE").apply {
                    putExtra("badge_count", badgeNumber)
                    putExtra("badge_count_package_name", context.packageName)
                    putExtra("badge_count_class_name", launchClassName)
                }
                context.sendBroadcast(intent)
            } catch (_: Exception) {}

            try {
                // Xiaomi MIUI message badge intent
                val miuiIntent = Intent("android.intent.action.APPLICATION_MESSAGE_UPDATE").apply {
                    putExtra("android.intent.extra.update_application_component_name", "${context.packageName}/$launchClassName")
                    putExtra("android.intent.extra.update_application_message_text", displayBadgeText)
                }
                context.sendBroadcast(miuiIntent)
            } catch (_: Exception) {}
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
        val shouldIgnoreProcessed = pendingForceRescan
        pendingForceRescan = false
        scanActiveStatusBarNotifications(ignoreProcessedCache = shouldIgnoreProcessed)
        // Notify JS in case JS opened while service was still binding asynchronously
        try {
            val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val cachedStr = prefs.getString(KEY_NOTIFICATIONS, "[]") ?: "[]"
            if (shouldIgnoreProcessed || (cachedStr != "[]" && cachedStr.length > 2)) {
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
                    val lineUniqueId = "${packageName}_${sbn.id}_line_${line.hashCode()}_${postTime / 60000}"
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
