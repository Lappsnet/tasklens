package com.tasklens.glasses

import java.io.DataOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

/**
 * Uploads one capture to POST {baseUrl}/api/glasses/upload — the same scan
 * pipeline as the phone flow. Auth is the USER's Supabase JWT in the
 * Authorization header (validated server-side by requireRole); the uploader
 * never uses a shared secret.
 *
 * Stdlib only (HttpURLConnection + org.json, both on-device) to keep the
 * companion thin.
 */
class GlassesUploader(
    private val baseUrl: String,
    private val authToken: String,
    private val device: String = "glasses-mock",
) {
    data class UploadResult(
        val scanId: String,
        val title: String,
        val category: String,
        val quoteLow: Int,
        val quoteHigh: Int,
        val bookPath: String,
    )

    fun uploadScan(
        photo: File,
        transcript: String = "",
        lang: String = "es",
        audio: File? = null,
    ): UploadResult {
        val boundary = "tasklens-${System.currentTimeMillis()}"
        val conn = (URL("$baseUrl/api/glasses/upload").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            connectTimeout = 15_000
            readTimeout = 60_000
            setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            setRequestProperty("x-device", device)
            // Demo servers (no Supabase linked) accept the demo cookie role;
            // production requires the user's real Supabase JWT.
            if (authToken.startsWith("demo:")) {
                setRequestProperty("Cookie", "tasklens_demo=${authToken.removePrefix("demo:")}")
            } else if (authToken.isNotBlank()) {
                setRequestProperty("Authorization", "Bearer $authToken")
            }
        }
        DataOutputStream(conn.outputStream).use { out ->
            fun field(name: String, value: String) {
                out.writeBytes("--$boundary\r\nContent-Disposition: form-data; name=\"$name\"\r\n\r\n$value\r\n")
            }
            fun filePart(name: String, file: File, mime: String) {
                out.writeBytes(
                    "--$boundary\r\nContent-Disposition: form-data; name=\"$name\"; " +
                        "filename=\"${file.name}\"\r\nContent-Type: $mime\r\n\r\n",
                )
                file.inputStream().use { it.copyTo(out) }
                out.writeBytes("\r\n")
            }
            field("transcript", transcript)
            field("lang", lang)
            filePart("photo", photo, "image/jpeg")
            if (audio != null && audio.exists()) filePart("audio", audio, "audio/mp4")
            out.writeBytes("--$boundary--\r\n")
            out.flush()
        }
        val code = conn.responseCode
        val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
            ?.bufferedReader()?.readText().orEmpty()
        check(code in 200..299) { "upload failed ($code): ${body.take(200)}" }
        val json = JSONObject(body)
        val spec = json.optJSONObject("spec") ?: JSONObject()
        val range = spec.optJSONArray("price_range_usd")
        return UploadResult(
            scanId = json.optString("scanId"),
            title = spec.optString("title"),
            category = spec.optString("category"),
            quoteLow = range?.optInt(0, 0) ?: 0,
            quoteHigh = range?.optInt(1, 0) ?: 0,
            bookPath = json.optString("next", ""),
        )
    }
}
