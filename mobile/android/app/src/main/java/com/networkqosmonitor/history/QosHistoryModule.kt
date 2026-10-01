package com.networkqosmonitor.history

import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.networkqosmonitor.telephony.NativeQosHistorySpec
import org.json.JSONObject
import java.io.File
import java.util.concurrent.Executors

class QosHistoryModule(private val context: ReactApplicationContext) : NativeQosHistorySpec(context) {
  companion object { const val NAME = "QosHistory" }
  override fun getName() = NAME
  private val worker = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())
  private val store = QosStore(context)
  private val preferences = context.getSharedPreferences("qos-settings", 0)
  private fun run(promise: Promise, task: () -> Any?) { worker.execute {
    try { promise.resolve(task()) } catch (e: Exception) { promise.reject("history", e.message, e) }
  } }
  override fun setLocationEnabled(enabled: Boolean, promise: Promise) { main.post {
    try {
      promise.resolve(if (enabled) QosLocation.start(context, "ui") else { QosLocation.stop(context, "ui"); "stopped" })
    } catch (e: Exception) { promise.reject("location", e.message) }
  } }
  override fun record(session: String, kind: String, timestamp: Double, payload: String, promise: Promise) = run(promise) {
    require(session.length in 1..200 && kind in listOf("latency", "throughput"))
    store.record(context, session, kind, timestamp.toLong(), JSONObject(payload)); null
  }
  override fun query(filters: String, promise: Promise) = run(promise) { store.query(JSONObject(filters)).toString() }
  override fun getSettings(promise: Promise) = run(promise) { preferences.getString("settings", "{}") }
  override fun saveSettings(settings: String, promise: Promise) = run(promise) {
    JSONObject(settings); check(preferences.edit().putString("settings", settings).commit()); null
  }
  override fun exportFile(filters: String, format: String, promise: Promise) { worker.execute { try {
    require(format in listOf("csv", "json"))
    val result = store.query(JSONObject(filters), null)
    val rows = result.getJSONArray("rows")
    val directory = File(context.cacheDir, "exports").apply { mkdirs() }
    val file = File(directory, "qos-${System.currentTimeMillis()}.$format")
    // No se añaden datos a la nube: Android ofrece las apps locales para compartir.
    file.bufferedWriter(Charsets.UTF_8).use { output ->
      if (format == "json") output.write(result.toString(2)) else {
        output.write("id,session,timestamp_ms,network,kind,latitude,longitude,accuracy_m,location_status,host,port,transport,status,rtt_ms,direction,mbps,bytes,duration_ms,data_json\r\n")
        for (i in 0 until rows.length()) {
          val row = rows.getJSONObject(i); val data = row.getJSONObject("data"); val location = data.getJSONObject("location")
          val fields = listOf(row.get("id"), row.get("session"), row.get("timestamp"), row.get("network"), row.get("kind"),
            location.opt("latitude") ?: "", location.opt("longitude") ?: "", location.opt("accuracyM") ?: "", location.get("status"),
            data.optJSONObject("target")?.opt("host") ?: "", data.optJSONObject("target")?.opt("port") ?: "", data.optJSONObject("target")?.opt("transport") ?: "",
            data.opt("status") ?: "", data.opt("rttMs") ?: "", data.opt("direction") ?: "", data.opt("mbps") ?: "", data.opt("bytes") ?: "", data.opt("durationMs") ?: "", data.toString())
          output.write(fields.joinToString(",") { if (it is Number) it.toString() else csv(if (it == JSONObject.NULL) "" else it.toString()) } + "\r\n")
        }
      }
    }
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.exports", file)
    val intent = Intent(Intent.ACTION_SEND).setType(if (format == "json") "application/json" else "text/csv")
      .putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    main.post { try {
      context.startActivity(Intent.createChooser(intent, "Exportar mediciones").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      promise.resolve(null)
    } catch (e: Exception) { promise.reject("export", "No se pudo abrir el selector para compartir", e) } }
  } catch (e: Exception) { promise.reject("export", e.message, e) } } }
  private fun csv(value: String): String {
    // Evita interpretar celdas importadas como fórmulas de una planilla.
    val safe = if (value.trimStart().firstOrNull() in listOf('=', '+', '-', '@')) "'$value" else value
    return "\"${safe.replace("\"", "\"\"")}\""
  }
  override fun startMonitoring(settings: String, promise: Promise) { main.post {
    try {
      require(QosLocation.allowed(context)) { "Habilitá ubicación antes de iniciar el monitoreo" }
      QosMonitorService.validate(JSONObject(settings))
      QosMonitorService.status = "Iniciando…"
      val intent = Intent(context, QosMonitorService::class.java).putExtra("settings", settings)
      if (android.os.Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
      promise.resolve(null)
    } catch (e: Exception) { QosMonitorService.status = "Detenido: ${e.message}"; promise.reject("monitor", e.message) }
  } }
  override fun stopMonitoring(promise: Promise) { context.stopService(Intent(context, QosMonitorService::class.java)); promise.resolve(null) }
  override fun monitoringStatus(promise: Promise) { promise.resolve(QosMonitorService.status) }
  override fun invalidate() {
    main.post { QosLocation.stop(context, "ui") }
    worker.execute { store.close() }; worker.shutdown(); super.invalidate()
  }
}
