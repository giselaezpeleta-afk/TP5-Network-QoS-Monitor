package com.networkqosmonitor.probes

import android.net.ConnectivityManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.networkqosmonitor.telephony.NativeThroughputSpec
import java.net.HttpURLConnection
import java.net.URI
import java.security.SecureRandom
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/** Transferencias secuenciales sobre la red capturada al iniciar la prueba. */
class ThroughputModule(private val context: ReactApplicationContext) : NativeThroughputSpec(context) {
  companion object { const val NAME = "Throughput" }
  override fun getName() = NAME
  private val worker = Executors.newSingleThreadExecutor()
  private val timer = Executors.newSingleThreadScheduledExecutor()
  private class Transfer(val id: String) {
    val cancelled = AtomicBoolean(false)
    @Volatile var connection: HttpURLConnection? = null
    fun close() { cancelled.set(true); connection?.disconnect() }
  }
  @Volatile private var active: Transfer? = null

  @Synchronized override fun measure(id: String, baseUrl: String, bytes: Double, direction: String, promise: Promise) {
    if (active != null) { promise.reject("busy", "Ya hay una transferencia activa"); return }
    val size = bytes.toInt()
    if (bytes != size.toDouble() || size !in listOf(1048576, 5242880, 10485760) || direction !in listOf("download", "upload")) {
      promise.reject("invalid", "Tamaño o dirección inválidos"); return
    }
    val base = try { validateUrl(baseUrl) } catch (e: Exception) {
      promise.reject("invalid", e.message); return
    }
    val transfer = Transfer(id)
    active = transfer
    worker.execute {
      val timeout = timer.schedule({ transfer.close() }, 30, TimeUnit.SECONDS)
      try {
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val network = cm.activeNetwork ?: error("No hay red activa")
        // Generación aleatoria fuera del intervalo medido; la subida se comprueba
        // byte a byte mediante el eco, pero su descarga no suma al tiempo de subida.
        val payload = if (direction == "upload") ByteArray(size).also { SecureRandom().nextBytes(it) } else null
        val url = URI("$base/$direction" + if (direction == "download") "?bytes=$size" else "").toURL()
        val connection = network.openConnection(url) as HttpURLConnection
        transfer.connection = connection
        check(!transfer.cancelled.get()) { "Transferencia cancelada o fuera de plazo" }
        connection.connectTimeout = 10000
        connection.readTimeout = 10000
        connection.instanceFollowRedirects = false
        connection.useCaches = false
        connection.setRequestProperty("Accept-Encoding", "identity")
        connection.setRequestProperty("Cache-Control", "no-cache")
        connection.setRequestProperty("User-Agent", "NetworkQoSMonitor/1.0")
        val timestamp = System.currentTimeMillis()
        val started = System.nanoTime()
        if (payload != null) {
          connection.requestMethod = "POST"
          connection.doOutput = true
          connection.setRequestProperty("Content-Type", "application/octet-stream")
          connection.setFixedLengthStreamingMode(size)
          connection.outputStream.use { output ->
            var offset = 0
            while (offset < size) {
              check(!transfer.cancelled.get()) { "Transferencia cancelada o fuera de plazo" }
              val count = minOf(65536, size - offset)
              output.write(payload, offset, count)
              offset += count
            }
          }
        }
        check(connection.responseCode == 200) { "El servidor respondió HTTP ${connection.responseCode}" }
        val acknowledged = System.nanoTime()
        check(connection.contentEncoding == null || connection.contentEncoding == "identity") { "El servidor comprimió los datos" }
        check(connection.contentLengthLong == size.toLong()) { "Tamaño de respuesta inesperado" }
        if (payload != null) check(connection.getHeaderField("X-Received-Bytes") == size.toString()) { "Falta confirmación de subida" }
        var received = 0
        connection.inputStream.use { input ->
          val buffer = ByteArray(65536)
          while (true) {
            check(!transfer.cancelled.get()) { "Transferencia cancelada o fuera de plazo" }
            val count = input.read(buffer)
            if (count < 0) break
            check(received + count <= size) { "La respuesta excedió el tamaño esperado" }
            if (payload != null) for (i in 0 until count) check(buffer[i] == payload[received + i]) { "El eco no coincide" }
            received += count
          }
        }
        check(received == size) { "Transferencia incompleta" }
        check(!transfer.cancelled.get()) { "Transferencia cancelada o fuera de plazo" }
        check(cm.activeNetwork == network) { "La red cambió durante la medición" }
        val ended = if (payload == null) System.nanoTime() else acknowledged
        val duration = (ended - started) / 1_000_000.0
        promise.resolve(Arguments.createMap().apply {
          putString("direction", direction); putDouble("bytes", size.toDouble())
          putDouble("durationMs", duration); putDouble("mbps", size * 8.0 / duration / 1000)
          putDouble("timestamp", timestamp.toDouble()); putString("networkId", network.toString())
        })
      } catch (e: Exception) {
        promise.reject("transfer", if (transfer.cancelled.get()) "Transferencia cancelada o fuera de plazo" else e.message)
      } finally {
        timeout.cancel(false)
        transfer.connection?.disconnect()
        synchronized(this) { if (active === transfer) active = null }
      }
    }
  }

  override fun cancel(id: String) { active?.takeIf { it.id == id }?.close() }
  override fun invalidate() { active?.close(); worker.shutdownNow(); timer.shutdownNow(); super.invalidate() }

  private fun validateUrl(value: String): String {
    val uri = URI(value.trim().trimEnd('/'))
    require(uri.scheme in listOf("http", "https") && uri.host != null && uri.userInfo == null && uri.query == null && uri.fragment == null) {
      "Ingresá una URL HTTP local o HTTPS sin usuario, consulta ni fragmento"
    }
    // Android permite HTTP por necesitar una IP LAN editable. Acotamos aquí el
    // tráfico sin TLS a direcciones IPv4 privadas literales; HTTPS valida normal.
    if (uri.scheme == "http") {
      val parts = uri.host.split('.').map { it.toIntOrNull() }
      val valid = parts.size == 4 && parts.all { it != null && it in 0..255 }
      require(valid && (parts[0] == 10 || parts[0] == 127 ||
        (parts[0] == 192 && parts[1] == 168) || (parts[0] == 172 && parts[1]!! in 16..31))) {
        "HTTP solo admite una IP privada de la PC; para Internet usá HTTPS"
      }
    }
    return uri.toString()
  }
}
