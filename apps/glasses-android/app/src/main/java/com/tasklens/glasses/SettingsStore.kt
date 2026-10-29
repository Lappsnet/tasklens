package com.tasklens.glasses

import android.content.Context
import android.content.SharedPreferences

/** Base URL + user auth token, kept in private SharedPreferences. */
class SettingsStore(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("tasklens-glasses", Context.MODE_PRIVATE)

    var baseUrl: String
        get() = prefs.getString(KEY_BASE, "https://tasklens.app") ?: "https://tasklens.app"
        set(value) = prefs.edit().putString(KEY_BASE, value.trim().trimEnd('/')).apply()

    /**
     * The USER's session credential, never a shared secret:
     * - demo server: "demo:customer" (or demo:pro / demo:admin);
     * - production: the user's Supabase JWT from the web session.
     */
    var authToken: String
        get() = prefs.getString(KEY_TOKEN, "") ?: ""
        set(value) = prefs.edit().putString(KEY_TOKEN, value.trim()).apply()

    companion object {
        private const val KEY_BASE = "base_url"
        private const val KEY_TOKEN = "auth_token"
    }
}
