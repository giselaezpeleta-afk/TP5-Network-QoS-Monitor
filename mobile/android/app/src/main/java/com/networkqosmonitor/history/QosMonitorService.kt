package com.networkqosmonitor.history

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.networkqosmonitor.MainActivity
import com.networkqosmonitor.probes.ProbeControl
import com.networkqosmonitor.probes.SocketProbe
import org.json.JSONObject
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.abs

/** Servicio iniciado por el usuario, visible y detenible desde la notificación. */
class QosMonitorService : Service() {
  companion object {
    @Volatile var status = "Detenido"
    fun validate(settings: JSONObject) {
      require(settings.getInt("intervalSeconds") in 60..3600) { "Intervalo: 60 a 3600 segundos" }
      require(settings.getDouble("rttThreshold") in 1.0..10000.0) { "Umbral RTT: 1 a 10000 ms" }
      require(settings.getDouble("jitterThreshold") in 1.0..10000.0) { "Umbral jitter: 1 a 10000 ms" }
      require(settings.getDouble("failureThreshold") in 1.0..100.0) { "Umbral fallos: 1 a 100 %" }
      val targets = settings.getJSONArray("targets")
      require(targets.length() in 3..10) { "Configurá de 3 a 10 destinos" }
      val hosts = mutableSetOf<String>()
      for (i in 0 until targets.length()) {
        val target = targets.getJSONObject(i); val host = target.getString("host").trim()
        require(host.isNotEmpty() && host.length <= 253 && !host.any { it.isWhitespace() || it == '/' }) { "Host inválido" }
        require(target.getInt("port") in 1..65535 && target.getString("transport") in listOf("tcp", "udp"))
        hosts.add(host.lowercase())
      }
      require(hosts.size >= 3) { "Usá al menos tres hosts distintos" }
    }
  }
  private val executor = Executors.newSingleThreadScheduledExecutor()
  private val resolver = Executors.newSingleThreadExecutor()
  private lateinit var store: QosStore
  @Volatile private var stopped = false
  @Volatile private var probe: ProbeControl? = null
  private var started = false
  private var lastAlert = -300000L
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onCreate() { super.onCreate(); store = QosStore(this) }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == "STOP") { stopSelf(); return START_NOT_STICKY }
    if (started) return START_NOT_STICKY
    try {
      val settings = JSONObject(intent?.getStringExtra("settings") ?: error("Sin configuración"))
      validate(settings)
      val manager = getSystemService(NotificationManager::class.java)
      if (Build.VERSION.SDK_INT >= 26) {
        manager.createNotificationChannel(NotificationChannel("monitor", "Monitoreo activo", NotificationManager.IMPORTANCE_LOW))
        manager.createNotificationChannel(NotificationChannel("alerts", "Degradación de red", NotificationManager.IMPORTANCE_DEFAULT))
      }
      val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      val stop = PendingIntent.getService(this, 1, Intent(this, QosMonitorService::class.java).setAction("STOP"), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      val notification = NotificationCompat.Builder(this, "monitor").setSmallIcon(android.R.drawable.ic_menu_mylocation)
        .setContentTitle("Network QoS · monitoreo activo").setContentText("Sondas periódicas y ubicación. Tocá Detener para finalizar.")
        .setContentIntent(open).setOngoing(true).addAction(0, "Detener", stop).build()
      if (Build.VERSION.SDK_INT >= 29) startForeground(100, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION or ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
      else startForeground(100, notification)
      check(QosLocation.start(this, "service") == "listening") { "Activá ubicación y concedé su permiso" }
      started = true; status = "Activo"; stopped = false
      executor.scheduleWithFixedDelay({ cycle(settings) }, 0, settings.getLong("intervalSeconds"), TimeUnit.SECONDS)
    } catch (e: Exception) { status = "Detenido: ${e.message}"; stopSelf() }
    return START_NOT_STICKY
  }

  private fun cycle(settings: JSONObject) {
    val lock = getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "networkqos:sample")
    // Solo durante el lote; Android puede diferir el intervalo durante Doze.
    lock.acquire(240000L)
    try {
      val cm = getSystemService(ConnectivityManager::class.java)
      val session = "background-${UUID.randomUUID()}"
      val network = cm.activeNetwork
      val targets = settings.getJSONArray("targets")
      var severe = false
      for (i in 0 until targets.length()) {
        if (stopped) break
        val target = targets.getJSONObject(i)
        var sum = 0.0; var received = 0; var differences = 0.0; var pairs = 0
        var previous: Double? = null; var missing = 0; var sent = 0; var invalidUdp = false; var attempted = 0
        val address = if (network == null) null else {
          val dns = resolver.submit<java.net.InetAddress> { network.getAllByName(target.getString("host")).first() }
          try { dns.get(2, TimeUnit.SECONDS) } catch (_: Exception) { dns.cancel(true); null }
        }
        for (sequence in 1..10) {
          if (stopped || network != cm.activeNetwork) break
          val control = ProbeControl(); probe = control
          val data = JSONObject().put("target", target).put("sequence", sequence).put("source", "background")
          var state = "ok"; var rtt: Double? = null
          try {
            if (network == null) state = "offline"
            else if (address == null) state = "dnsError"
            else rtt = if (target.getString("transport") == "udp") SocketProbe.udp(address, target.getInt("port"), 2000, control) { network.bindSocket(it) }
              else SocketProbe.tcp(address, target.getInt("port"), 2000, control) { network.bindSocket(it) }
          } catch (_: SocketTimeoutException) { state = "timeout" }
            catch (_: ConnectException) { state = "refused" }
            catch (_: Exception) { state = "error" }
          if (stopped || network != cm.activeNetwork) break
          attempted++
          if (rtt != null) { sum += rtt; received++; previous?.let { differences += abs(rtt - it); pairs++ }; previous = rtt }
          else previous = null
          if (control.sent) sent++
          if (state == "timeout" && control.sent) missing++
          if (state !in listOf("ok", "timeout")) invalidUdp = true
          data.put("status", state).put("rttMs", rtt ?: JSONObject.NULL).put("sent", control.sent)
            .put("networkId", network?.toString() ?: JSONObject.NULL)
          store.record(this, session, "latency", System.currentTimeMillis(), data)
          if (sequence < 10) Thread.sleep(250)
        }
        if (attempted == 10) {
          val failure = if (target.getString("transport") == "udp") {
            if (!invalidUdp && sent > 0) missing * 100.0 / sent else null
          } else (attempted - received) * 100.0 / attempted
          severe = severe || (received > 0 && sum / received >= settings.getDouble("rttThreshold")) ||
            (pairs > 0 && differences / pairs >= settings.getDouble("jitterThreshold")) ||
            (failure != null && failure >= settings.getDouble("failureThreshold"))
        }
      }
      if (severe && !stopped && android.os.SystemClock.elapsedRealtime() - lastAlert >= 300000L) {
        getSystemService(NotificationManager::class.java).notify(101, NotificationCompat.Builder(this, "alerts")
          .setSmallIcon(android.R.drawable.ic_dialog_alert).setContentTitle("Posible degradación de conexión")
          .setContentText("Un destino superó tus umbrales de RTT, jitter, fallos TCP o ecos UDP ausentes. Revisá el historial.")
          .setStyle(NotificationCompat.BigTextStyle().bigText("Un destino superó tus umbrales. TCP indica fallos de conexión; UDP indica ecos ausentes dentro del plazo, no su causa."))
          .setAutoCancel(true).build())
        lastAlert = android.os.SystemClock.elapsedRealtime()
      }
    } catch (_: InterruptedException) { Thread.currentThread().interrupt() }
      catch (e: Exception) { status = "Detenido: ${e.message}"; android.os.Handler(mainLooper).post { stopSelf() } }
    finally { probe = null; if (lock.isHeld) lock.release() }
  }
  override fun onTimeout(startId: Int, fgsType: Int) { status = "Detenido por límite de tiempo de Android"; stopSelf() }
  override fun onDestroy() {
    stopped = true; probe?.cancel(); executor.shutdownNow(); resolver.shutdownNow()
    QosLocation.stop(this, "service")
    // El worker podría estar terminando un insert: cerramos SQLite después de él.
    Thread { executor.awaitTermination(5, TimeUnit.SECONDS); store.close() }.start()
    if (status == "Activo") status = "Detenido"
    super.onDestroy()
  }
}
