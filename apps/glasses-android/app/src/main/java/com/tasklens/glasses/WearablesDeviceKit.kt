package com.tasklens.glasses

/**
 * P0-6: seam for the Meta Wearables Device Access Toolkit.
 *
 * The toolkit has no public artifact in the developer docs, so there is no
 * compile-time dependency here on purpose. To wire real glasses:
 *  1. Get toolkit access via the Meta Wearables Developer Center.
 *  2. Pair through the Meta AI app (the toolkit's documented flow).
 *  3. Implement [capturePhoto] with the toolkit's photo-capture call,
 *     Bluetooth-mic audio for voice notes, and keep TTS on the phone speaker
 *     route (already handled by [MainActivity]).
 *  4. Flip [DeviceProvider.USE_WEARABLES] to true.
 *
 * Until then this class throws instead of faking a capture — mock mode is the
 * only honest path and it says so on screen.
 */
class WearablesDeviceKit : GlassesDevice {
    override suspend fun capturePhoto(): ByteArray {
        throw UnsupportedOperationException(
            "Real glasses not wired: pair via the Meta AI app with toolkit access first (see README).",
        )
    }

    override fun label(): String = "glasses"
}

/** Flip to true only after [WearablesDeviceKit] is wired to real hardware. */
object DeviceProvider {
    const val USE_WEARABLES = false
}
