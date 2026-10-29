package com.tasklens.glasses

/**
 * P0-6: capture abstraction. The Mock Device Kit returns the bundled SAMPLE
 * photo (`res/raw/sample_leak.jpg`, generated — see web/scripts/). The real
 * Meta Wearables Device Access Toolkit plugs in here once access is granted;
 * until then [WearablesDeviceKit] throws with setup instructions instead of
 * pretending to work.
 */
interface GlassesDevice {
    /** JPEG bytes of one captured frame. */
    suspend fun capturePhoto(): ByteArray

    /** Human-readable source label shown in the UI ("sample (mock)" vs "glasses"). */
    fun label(): String
}
