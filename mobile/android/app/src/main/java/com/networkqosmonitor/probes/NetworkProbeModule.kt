package com.networkqosmonitor.probes

import android.content.Context
import android.net.ConnectivityManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.networkqosmonitor.telephony.NativeNetworkProbeSpec
import java.net.ConnectException
import java.net.PortUnreachableException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import java.util.concurrent.ExecutionException
import java.util.concurrent.ConcurrentHashMap

@ReactModule(name = NetworkProbeModule.NAME)
class NetworkProbeModule(private val context: ReactApplicationContext) : NativeNetworkProbeSpec(context) {
  companion object { const val NAME = "NetworkProbe" }
  // Un único ensayo activo evita ráfagas de tráfico y trabajo simultáneo en la UI.
  private val worker = Executors.newSingleThreadExecutor()
  private val resolver = Executors.newSingleThreadExecutor()
  private val pending = ConcurrentHashMap<String, ProbeControl>()
  override fun getName() = NAME

  override fun probe(requestId: String, host: String, port: Double, transport: String,
                     timeoutMs: Double, promise: Promise) {
    if (host.isBlank() || host.length > 253 || host.any { it.isWhitespace() } ||
        port % 1.0 != 0.0 || port !in 1.0..65535.0 ||
        timeoutMs % 1.0 != 0.0 || timeoutMs !in 250.0..10000.0 ||
        transport !in listOf("tcp", "udp")) {
      promise.reject("INVALID_PROBE", "Configuración de sonda inválida")
      return
    }
    val control = ProbeControl()
    synchronized(pending) {
      if (pending.isNotEmpty()) {
        promise.reject("PROBE_BUSY", "Ya hay una sonda en curso")
        return
      }
      pending[requestId] = control
    }
    try {
      worker.execute {
        var status = "error"
        var rtt: Double? = null
        var resolvedAddress: String? = null
        val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivity.activeNetwork
        try {
          if (control.cancelled) throw InterruptedException()
          if (network == null) {
            status = "offline"
          } else {
            // Resolver con plazo propio, fuera del cronómetro TCP/UDP y de la UI.
            val lookup = resolver.submit<java.net.InetAddress> { network.getAllByName(host).first() }
            val address = try { lookup.get(timeoutMs.toLong(), TimeUnit.MILLISECONDS) }
              finally { lookup.cancel(true) }
            resolvedAddress = address.hostAddress
            if (control.cancelled) throw InterruptedException()
            rtt = if (transport == "tcp") {
              SocketProbe.tcp(address, port.toInt(), timeoutMs.toInt(), control) { network.bindSocket(it) }
            } else {
              SocketProbe.udp(address, port.toInt(), timeoutMs.toInt(), control) { network.bindSocket(it) }
            }
            status = "ok"
          }
        } catch (_: SocketTimeoutException) { status = "timeout"
        } catch (_: TimeoutException) { status = "dnsTimeout"
        } catch (_: UnknownHostException) { status = "dnsError"
        } catch (error: ExecutionException) {
          status = if (error.cause is UnknownHostException) "dnsError" else "error"
        } catch (_: ConnectException) { status = "refused"
        } catch (_: PortUnreachableException) { status = "refused"
        } catch (_: Exception) { status = "error" }
        if (control.cancelled) status = "cancelled"
        else if (network != null && connectivity.activeNetwork != network) status = "networkChanged"
        val result = Arguments.createMap().apply {
          putString("status", status)
          if (status == "ok" && rtt != null) putDouble("rttMs", rtt!!) else putNull("rttMs")
          putString("address", resolvedAddress)
          putBoolean("sent", control.sent)
          putString("networkId", network?.networkHandle?.toString())
        }
        pending.remove(requestId)
        promise.resolve(result)
      }
    } catch (error: Exception) {
      pending.remove(requestId)
      promise.reject("PROBE_UNAVAILABLE", "Motor de medición no disponible", error)
    }
  }

  override fun cancel(requestId: String) { pending[requestId]?.cancel() }

  override fun invalidate() {
    pending.values.forEach { it.cancel() }
    worker.shutdownNow()
    resolver.shutdownNow()
    super.invalidate()
  }
}
