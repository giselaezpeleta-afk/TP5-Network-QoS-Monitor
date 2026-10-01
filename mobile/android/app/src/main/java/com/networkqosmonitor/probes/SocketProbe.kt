package com.networkqosmonitor.probes

import java.io.Closeable
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.net.SocketTimeoutException
import java.util.UUID

/** Cierre seguro también si se cancela antes de que el socket termine de crearse. */
class ProbeControl {
  @Volatile var cancelled = false
    private set
  @Volatile var sent = false
  private var resource: Closeable? = null

  @Synchronized fun attach(value: Closeable) {
    if (cancelled) {
      value.close()
      throw InterruptedException("Sonda cancelada")
    }
    resource = value
  }

  @Synchronized fun cancel() {
    cancelled = true
    try { resource?.close() } catch (_: Exception) { }
  }
}

object SocketProbe {
  /** nanoTime es monotónico: cambiar la hora del equipo no altera el RTT. */
  fun tcp(address: InetAddress, port: Int, timeoutMs: Int, control: ProbeControl,
          bind: (Socket) -> Unit = {}): Double = Socket().use { socket ->
    control.attach(socket)
    bind(socket)
    val start = System.nanoTime()
    socket.connect(InetSocketAddress(address, port), timeoutMs)
    // Tiempo del establecimiento TCP, no ICMP ni descarga ni TLS. DNS queda fuera.
    (System.nanoTime() - start) / 1_000_000.0
  }

  fun udp(address: InetAddress, port: Int, timeoutMs: Int, control: ProbeControl,
          bind: (DatagramSocket) -> Unit = {}): Double = DatagramSocket(null).use { socket ->
    control.attach(socket)
    bind(socket)
    socket.bind(InetSocketAddress(0))
    socket.connect(address, port)
    // Identificador impredecible: respuestas viejas o ajenas no cuentan como eco.
    val payload = ("NQ1:" + UUID.randomUUID()).toByteArray(Charsets.US_ASCII)
    val response = DatagramPacket(ByteArray(256), 256)
    val start = System.nanoTime()
    val deadline = start + timeoutMs * 1_000_000L
    socket.send(DatagramPacket(payload, payload.size))
    control.sent = true
    while (true) {
      val remaining = deadline - System.nanoTime()
      if (remaining <= 0) throw SocketTimeoutException()
      socket.soTimeout = ((remaining + 999_999) / 1_000_000).toInt().coerceAtLeast(1)
      response.length = response.data.size
      socket.receive(response)
      if (response.length == payload.size &&
          response.data.copyOfRange(response.offset, response.offset + response.length).contentEquals(payload)) {
        return@use (System.nanoTime() - start) / 1_000_000.0
      }
      // Descartar datos inválidos no reinicia el plazo original de recepción.
    }
    @Suppress("UNREACHABLE_CODE")
    0.0
  }
}
