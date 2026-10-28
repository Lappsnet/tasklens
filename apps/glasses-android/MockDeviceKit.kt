package com.tasklens.glasses

/**
 * Day 1 Mock Device Kit — stands in for the Meta Wearables Device Access Toolkit.
 * Real glasses integration lands Day 3; until then capture/upload/speak are mocked
 * with the same interface so web API work is unblocked.
 */
interface GlassesDevice {
    suspend fun capturePhoto(): ByteArray
    suspend fun recordVoice(seconds: Int): ByteArray
    suspend fun upload(bytes: ByteArray, endpoint: String): String
    suspend fun speak(text: String)
}

class MockDeviceKit : GlassesDevice {
    override suspend fun capturePhoto(): ByteArray = ByteArray(0)
    override suspend fun recordVoice(seconds: Int): ByteArray = ByteArray(0)
    override suspend fun upload(bytes: ByteArray, endpoint: String): String = "mock://upload/${bytes.size}"
    override suspend fun speak(text: String) { println("TTS> $text") }
}
