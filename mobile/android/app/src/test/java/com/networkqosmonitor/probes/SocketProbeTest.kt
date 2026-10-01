package com.networkqosmonitor.probes

import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.ServerSocket
import java.net.SocketTimeoutException
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import org.junit.Assert.*
import org.junit.Test

class SocketProbeTest {
  private val loopback = InetAddress.getByName("127.0.0.1")

  @Test fun tcpConnectsAndClosesTheSocket() {
    ServerSocket(0, 1, loopback).use { server ->
      server.soTimeout = 2000
      val rtt = SocketProbe.tcp(loopback, server.localPort, 1000, ProbeControl())
      assertTrue(rtt >= 0)
      server.accept().use { peer ->
        peer.soTimeout = 1000
        assertEquals(-1, peer.getInputStream().read())
      }
    }
  }

  @Test fun udpIgnoresAnInvalidReplyAndAcceptsTheMatchingEcho() {
    DatagramSocket(0, loopback).use { server ->
      server.soTimeout = 2000
      val worker = Executors.newSingleThreadExecutor()
      try {
        val echo = worker.submit {
          val packet = DatagramPacket(ByteArray(256), 256)
          server.receive(packet)
          val wrong = "NQ1:incorrecto".toByteArray()
          server.send(DatagramPacket(wrong, wrong.size, packet.address, packet.port))
          server.send(packet)
        }
        val control = ProbeControl()
        assertTrue(SocketProbe.udp(loopback, server.localPort, 1500, control) >= 0)
        assertTrue(control.sent)
        echo.get(2, TimeUnit.SECONDS)
      } finally { worker.shutdownNow() }
    }
  }

  @Test fun udpWithoutEchoExpiresInsteadOfInventingAnRtt() {
    DatagramSocket(0, loopback).use { server ->
      val control = ProbeControl()
      try {
        SocketProbe.udp(loopback, server.localPort, 100, control)
        fail("Debía agotar el plazo")
      } catch (_: SocketTimeoutException) {
        assertTrue(control.sent)
      }
    }
  }

  @Test fun cancellingBeforeSocketCreationPreventsNetworkTraffic() {
    val control = ProbeControl()
    control.cancel()
    try {
      SocketProbe.tcp(loopback, 1, 100, control)
      fail("Debía cancelar")
    } catch (_: InterruptedException) {
      assertTrue(control.cancelled)
      assertFalse(control.sent)
    }
  }
}
