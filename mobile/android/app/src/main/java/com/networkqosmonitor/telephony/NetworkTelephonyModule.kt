package com.networkqosmonitor.telephony

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.SystemClock
import android.telephony.*
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import java.util.concurrent.Executors

@ReactModule(name = NetworkTelephonyModule.NAME)
class NetworkTelephonyModule(private val context: ReactApplicationContext) :
  NativeNetworkTelephonySpec(context) {

  companion object { const val NAME = "NetworkTelephony" }
  private val worker = Executors.newSingleThreadExecutor()
  override fun getName() = NAME

  override fun getSnapshot(promise: Promise) {
    // Las llamadas al servicio de telefonía no se ejecutan en el hilo de la UI/JS.
    worker.execute {
      try {
        promise.resolve(readSnapshot())
      } catch (_: SecurityException) {
        // Puede cambiar el permiso entre la comprobación y la llamada al sistema.
        val status = if (hasPermission()) "restricted" else "permissionRequired"
        promise.resolve(emptySnapshot(status))
      } catch (_: UnsupportedOperationException) {
        promise.resolve(emptySnapshot("unsupported"))
      } catch (error: Exception) {
        promise.reject("TELEPHONY_UNAVAILABLE", "No se pudo consultar la telefonía.", error)
      }
    }
  }

  override fun invalidate() {
    worker.shutdownNow()
    super.invalidate()
  }

  private fun hasPermission() = context.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) ==
    PackageManager.PERMISSION_GRANTED

  private fun emptySnapshot(status: String): WritableMap = Arguments.createMap().apply {
    putString("status", status)
    putNull("carrier")
    putNull("technology")
    putArray("signals", Arguments.createArray())
    putBoolean("signalSupported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
    putNull("signalAgeMs")
    putDouble("queriedAt", System.currentTimeMillis().toDouble())
  }

  @SuppressLint("MissingPermission") // Comprobación explícita antes de consultar.
  private fun readSnapshot(): WritableMap {
    if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)) {
      return emptySnapshot("unsupported")
    }
    if (!hasPermission()) return emptySnapshot("permissionRequired")

    // Se selecciona la SIM de datos cada vez, para contemplar cambios en equipos dual SIM.
    val subscriptionId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      SubscriptionManager.getActiveDataSubscriptionId()
    } else {
      SubscriptionManager.getDefaultDataSubscriptionId()
    }
    if (!SubscriptionManager.isValidSubscriptionId(subscriptionId)) {
      return emptySnapshot("noSubscription")
    }
    val base = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
      ?: return emptySnapshot("unsupported")
    val manager = base.createForSubscriptionId(subscriptionId)
    val result = emptySnapshot("ready")
    result.putString("carrier", manager.networkOperatorName?.trim()?.takeIf { it.isNotEmpty() })
    result.putString("technology", TelephonyValues.technology(manager.dataNetworkType))

    // getCellSignalStrengths existe desde Android 10. En versiones previas no inventamos señal.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val signal = manager.signalStrength
      val readings = Arguments.createArray()
      signal?.cellSignalStrengths?.forEach { strength ->
        val reading = signalReading(strength)
        if (reading != null) readings.pushMap(reading)
      }
      result.putArray("signals", readings)
      if (signal != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val age = SystemClock.elapsedRealtime() - signal.timestampMillis
        if (age >= 0) result.putDouble("signalAgeMs", age.toDouble())
      }
    }
    return result
  }

  @androidx.annotation.RequiresApi(Build.VERSION_CODES.Q)
  private fun signalReading(signal: CellSignalStrength): WritableMap? {
    val technology: String
    val metric: String
    val power: Int
    var rssi: Int? = null
    when (signal) {
      is CellSignalStrengthLte -> {
        technology = "LTE"; metric = "RSRP"; power = signal.rsrp
        rssi = TelephonyValues.dbmOrNull(signal.rssi)
      }
      is CellSignalStrengthNr -> {
        technology = "NR"; metric = "SS-RSRP"; power = signal.ssRsrp
      }
      is CellSignalStrengthGsm -> {
        technology = "GSM"; metric = "RSSI"; power = signal.dbm
        rssi = TelephonyValues.dbmOrNull(power)
      }
      is CellSignalStrengthWcdma -> {
        technology = "WCDMA"; metric = "RSCP"; power = signal.dbm
      }
      is CellSignalStrengthTdscdma -> {
        technology = "TD-SCDMA"; metric = "RSCP"; power = signal.dbm
      }
      is CellSignalStrengthCdma -> {
        technology = "CDMA/EVDO"; metric = "Potencia"; power = signal.dbm
      }
      else -> return null
    }
    val dbm = TelephonyValues.dbmOrNull(power)
    if (dbm == null && rssi == null) return null
    return Arguments.createMap().apply {
      putString("technology", technology)
      putString("metric", metric)
      if (dbm == null) putNull("dbm") else putInt("dbm", dbm)
      if (rssi == null) putNull("rssi") else putInt("rssi", rssi)
    }
  }
}
