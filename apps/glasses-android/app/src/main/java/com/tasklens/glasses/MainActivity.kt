package com.tasklens.glasses

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import java.io.File
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * P0-6 companion flow: "Fix this" -> capture -> POST /api/glasses/upload
 * (user's Supabase JWT, never a shared secret) -> speak the summary on the
 * phone speaker -> open the quote deep link.
 *
 * Mock mode uses the bundled SAMPLE photo and says so on screen.
 */
class MainActivity : ComponentActivity() {
    private lateinit var settings: SettingsStore
    private lateinit var device: GlassesDevice
    private var tts: TextToSpeech? = null

    private val log = mutableStateListOf<String>()
    private var busy = mutableStateOf(false)
    private var recordingUi = mutableStateOf(false)
    private var lastBookUrl = mutableStateOf<String?>(null)
    private var audioFile: File? = null
    private var recorder: MediaRecorder? = null
    private var pendingCameraFile: File? = null

    private val takePicture = registerForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
        val file = pendingCameraFile
        if (ok && file != null) {
            log.add("phone photo: ${file.name} (${file.length() / 1024} KB)")
            upload(file)
        } else {
            log.add("camera cancelled")
        }
    }

    private val requestMic = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            if (toggleRecording()) recordingUi.value = true
        } else log.add("mic permission denied")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        settings = SettingsStore(this)
        device = if (DeviceProvider.USE_WEARABLES) WearablesDeviceKit() else MockDeviceKit(this)
        tts = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) tts?.language = Locale("es", "ES")
        }
        log.add("ready — source: ${device.label()}")

        setContent {
            MaterialTheme {
                var baseUrl by remember { mutableStateOf(settings.baseUrl) }
                var token by remember { mutableStateOf(settings.authToken) }
                var transcript by remember { mutableStateOf("") }
                Column(
                    modifier = Modifier.fillMaxSize().padding(20.dp).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text("TaskLens Glasses", style = MaterialTheme.typography.headlineSmall)
                    Text("source: ${device.label()}", style = MaterialTheme.typography.labelMedium)
                    TextField(
                        value = baseUrl, onValueChange = { baseUrl = it; settings.baseUrl = it },
                        label = { Text("Server base URL") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                    )
                    TextField(
                        value = token, onValueChange = { token = it; settings.authToken = it },
                        label = { Text("Auth token (your web session JWT)") },
                        modifier = Modifier.fillMaxWidth(), singleLine = true,
                    )
                    TextField(
                        value = transcript, onValueChange = { transcript = it },
                        label = { Text("Describe the problem (ES/EN)") }, modifier = Modifier.fillMaxWidth(),
                    )
                    Button(
                        onClick = { fixThis(transcript) },
                        enabled = !busy.value, modifier = Modifier.fillMaxWidth(),
                    ) { Text(if (busy.value) "Working…" else "Fix this") }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(onClick = ::usePhoneCamera, enabled = !busy.value) { Text("Phone camera") }
                        OutlinedButton(
                            onClick = {
                                if (recordingUi.value) {
                                    if (toggleRecording()) recordingUi.value = false
                                } else if (hasMic()) {
                                    if (toggleRecording()) recordingUi.value = true
                                } else requestMic.launch(Manifest.permission.RECORD_AUDIO)
                            },
                            enabled = !busy.value,
                        ) { Text(if (recordingUi.value) "Stop note" else "Voice note") }
                    }
                    lastBookUrl.value?.let { url ->
                        Button(onClick = { openUrl(url) }, modifier = Modifier.fillMaxWidth()) { Text("Open quote") }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    log.forEach { Text(it, style = MaterialTheme.typography.bodySmall) }
                }
            }
        }
    }

    private fun hasMic(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED

    /** "Fix this": capture (mock sample or toolkit frame) then upload + speak. */
    private fun fixThis(transcript: String) {
        if (busy.value) return
        busy.value = true
        log.add("capturing via ${device.label()}…")
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val bytes = device.capturePhoto()
                val file = File(cacheDir, "captures").apply { mkdirs() }
                    .resolve("fix-${System.currentTimeMillis()}.jpg")
                    .apply { writeBytes(bytes) }
                withContext(Dispatchers.Main) {
                    log.add("captured ${bytes.size / 1024} KB (${device.label()})")
                    upload(file, transcript)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    log.add("capture failed: ${e.message}")
                    busy.value = false
                }
            }
        }
    }

    private fun usePhoneCamera() {
        val file = File(File(cacheDir, "captures").apply { mkdirs() }, "cam-${System.currentTimeMillis()}.jpg")
        val uri: Uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
        pendingCameraFile = file
        takePicture.launch(uri)
    }

    /** Starts or stops the phone-mic note. Returns true when the state changed. */
    private fun toggleRecording(): Boolean {
        val active = recorder
        if (active != null) {
            runCatching { active.stop() }
            active.release()
            recorder = null
            log.add("voice note saved (${audioFile?.length()?.div(1024)} KB)")
            return true
        }
        val out = File(cacheDir, "voice-${System.currentTimeMillis()}.m4a")
        return try {
            val freshRecorder = if (Build.VERSION.SDK_INT >= 31) MediaRecorder(this) else MediaRecorder()
            freshRecorder.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setOutputFile(out.absolutePath)
                prepare()
                start()
            }
            recorder = freshRecorder
            audioFile = out
            log.add("recording voice note…")
            true
        } catch (e: Exception) {
            log.add("mic failed: ${e.message}")
            false
        }
    }

    private fun upload(photo: File, transcript: String = "") {
        busy.value = true
        log.add("uploading to ${settings.baseUrl}…")
        val deviceHeader = if (DeviceProvider.USE_WEARABLES) "glasses-wearables" else "glasses-mock"
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val uploader = GlassesUploader(settings.baseUrl, settings.authToken, device = deviceHeader)
                val res = uploader.uploadScan(photo, transcript, "es", audioFile)
                withContext(Dispatchers.Main) {
                    busy.value = false
                    val summary = "${res.title}. ${res.category}. " +
                        "Estimate ${res.quoteLow} to ${res.quoteHigh} dollars."
                    log.add("quote: $summary")
                    speak(summary)
                    if (res.bookPath.isNotBlank()) {
                        lastBookUrl.value = settings.baseUrl + res.bookPath
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    busy.value = false
                    log.add("upload failed: ${e.message}")
                }
            }
        }
    }

    private fun speak(text: String) {
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "tasklens-quote")
    }

    private fun openUrl(url: String) {
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
    }

    override fun onDestroy() {
        tts?.shutdown()
        recorder?.release()
        super.onDestroy()
    }
}
