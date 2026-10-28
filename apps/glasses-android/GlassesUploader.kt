package com.tasklens.glasses

import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Day 3: uploads a glasses photo frame (+ optional voice note) to the web API.
 * Stdlib only (HttpURLConnection, no new dependencies) so the thin companion
 * stays thin. The API runs the same scan pipeline as the phone flow and
 * returns scanId + spec + a /book deep link the app can speak back via TTS.
 *
 * POST {baseUrl}/api/glasses/upload  (multipart: photo, [audio], transcript, lang)
 * Headers: x-device: glasses-<model>
 */
class GlassesUploader(private val baseUrl: String, private val device: String = "glasses-mock") {

    data class UploadResult(val scanId: String, val category: String, val quoteLow: Int, val quoteHigh: Int)

    fun uploadScan(photo: File, transcript: String = "", lang: String = "en", audio: File? = null): UploadResult {
        val boundary = "tasklens-${System.currentTimeMillis()}"
        val url = URL("$baseUrl/api/glasses/upload")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            setRequestProperty("x-device", device)
            connectTimeout = 15_000
            readTimeout = 30_000
        }
        conn.outputStream.bufferedWriter(Charsets.UTF_8).use { w ->
            fun field(name: String, value: String) {
                w.write("--$boundary\r\nContent-Disposition: form-data; name=\"$name\"\r\n\r\n$value\r\n")
            }
            fun filePart(name: String, f: File, mime: String) {
                w.write("--$boundary\r\nContent-Disposition: form-data; name=\"$name\"; filename=\"${f.name}\"\r\nContent-Type: $mime\r\n\r\n")
                w.flush()
                conn.outputStream.write(f.readBytes())
                conn.outputStream.flush()
                w.write("\r\n")
            }
            field("transcript", transcript)
            field("lang", lang)
            filePart("photo", photo, "image/jpeg")
            if (audio != null) filePart("audio", audio, "audio/webm")
            w.write("--$boundary--\r\n")
        }
        val code = conn.responseCode
        val body = (if (code in 200..299) conn.inputStream else conn.errorStream).bufferedReader().readText()
        check(code in 200..299) { "glasses upload failed ($code): ${body.take(200)}" }
        // Minimal JSON parse without dependencies: extract scanId + spec fields.
        fun pick(key: String): String =
            Regex("\"$key\"\\s*:\\s*\"?([^\",}]+)\"?").find(body)?.groupValues?.get(1) ?: ""
        val low = Regex("\"price_range_usd\"\\s*:\\s*\\[(\\d+)").find(body)?.groupValues?.get(1)?.toInt() ?: 0
        val high = Regex("\"price_range_usd\"\\s*:\\s*\\[\\d+\\s*,\\s*(\\d+)").find(body)?.groupValues?.get(1)?.toInt() ?: 0
        return UploadResult(
            scanId = pick("scanId"),
            category = pick("category"),
            quoteLow = low,
            quoteHigh = high,
        )
    }
}
