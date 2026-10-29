package com.tasklens.glasses

import android.content.Context

/**
 * Mock Device Kit: honest stand-in for the glasses. [capturePhoto] returns the
 * bundled synthetic sample photo — real JPEG bytes, but always labeled
 * "sample (mock)" in the UI so it is never mistaken for a live capture.
 */
class MockDeviceKit(private val context: Context) : GlassesDevice {
    override suspend fun capturePhoto(): ByteArray =
        context.resources.openRawResource(R.raw.sample_leak).use { it.readBytes() }

    override fun label(): String = "sample (mock)"
}
