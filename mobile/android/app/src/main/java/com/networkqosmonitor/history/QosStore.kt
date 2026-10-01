package com.networkqosmonitor.history

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.os.SystemClock
import org.json.JSONArray
import org.json.JSONObject

/** SQLite guarda cada muestra de inmediato; un cierre de la UI no borra la sesión. */
class QosStore(context: Context) : SQLiteOpenHelper(context, "qos.db", null, 1) {
  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL("CREATE TABLE samples (id INTEGER PRIMARY KEY, session TEXT NOT NULL, kind TEXT NOT NULL, timestamp INTEGER NOT NULL, network TEXT NOT NULL, latitude REAL, longitude REAL, payload TEXT NOT NULL)")
    db.execSQL("CREATE INDEX sample_time ON samples(timestamp)")
    db.execSQL("CREATE INDEX sample_session ON samples(session)")
  }
  override fun onUpgrade(db: SQLiteDatabase, old: Int, new: Int) { error("Migración pendiente: $old a $new") }

  fun record(context: Context, session: String, kind: String, timestamp: Long, data: JSONObject) {
    val location = QosLocation.snapshot(context)
    val cm = context.getSystemService(ConnectivityManager::class.java)
    val capabilities = cm.getNetworkCapabilities(cm.activeNetwork)
    val network = when {
      capabilities == null -> "none"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
      else -> "other"
    }
    data.put("location", location)
    // Se identifica la red en el momento del registro, además del networkId
    // capturado por la sonda. Una posición ausente nunca se sustituye por 0,0.
    val values = ContentValues().apply {
      put("session", session); put("kind", kind); put("timestamp", timestamp); put("network", network)
      if (location.has("latitude")) {
        put("latitude", location.getDouble("latitude")); put("longitude", location.getDouble("longitude"))
      }
      put("payload", data.toString())
    }
    writableDatabase.insertOrThrow("samples", null, values)
  }

  fun query(filters: JSONObject, limit: Int? = 2000): JSONObject {
    val clauses = mutableListOf<String>()
    val args = mutableListOf<String>()
    fun add(column: String, operator: String, value: String) { clauses.add("$column $operator ?"); args.add(value) }
    if (filters.optString("network").isNotEmpty()) add("network", "=", filters.getString("network"))
    if (filters.has("from")) add("timestamp", ">=", filters.getLong("from").toString())
    if (filters.has("to")) add("timestamp", "<=", filters.getLong("to").toString())
    if (filters.has("south")) {
      val south = filters.getDouble("south"); val north = filters.getDouble("north")
      val west = filters.getDouble("west"); val east = filters.getDouble("east")
      require(south in -90.0..90.0 && north in south..90.0 && west in -180.0..180.0 && east in west..180.0)
      add("latitude", ">=", south.toString()); add("latitude", "<=", north.toString())
      add("longitude", ">=", west.toString()); add("longitude", "<=", east.toString())
    }
    val where = if (clauses.isEmpty()) null else clauses.joinToString(" AND ")
    val count = readableDatabase.rawQuery("SELECT COUNT(*) FROM samples" + if (where == null) "" else " WHERE $where", args.toTypedArray()).use { it.moveToFirst(); it.getLong(0) }
    require(limit != null || count <= 50000) { "La exportación supera 50000 muestras. Acotá las fechas para exportar en partes." }
    val rows = JSONArray()
    readableDatabase.query("samples", null, where, args.toTypedArray(), null, null, "timestamp DESC, id DESC", limit?.toString()).use { cursor ->
      while (cursor.moveToNext()) {
        val row = JSONObject()
        for (name in listOf("id", "timestamp")) row.put(name, cursor.getLong(cursor.getColumnIndexOrThrow(name)))
        for (name in listOf("session", "kind", "network")) row.put(name, cursor.getString(cursor.getColumnIndexOrThrow(name)))
        row.put("data", JSONObject(cursor.getString(cursor.getColumnIndexOrThrow("payload"))))
        rows.put(row)
      }
    }
    return JSONObject().put("rows", rows).put("total", count)
  }
}

object QosLocation {
  private var listener: LocationListener? = null
  private var owner: String? = null
  @Volatile private var last: Location? = null

  fun allowed(context: Context) = context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
    context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

  // Llamar desde el hilo principal. El servicio mantiene la suscripción cuando
  // la UI pasa a segundo plano; no pide ubicación en background por separado.
  fun start(context: Context, requester: String): String {
    if (!allowed(context)) return "permissionRequired"
    val manager = context.getSystemService(LocationManager::class.java)
    val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER).filter { manager.isProviderEnabled(it) }
    if (providers.isEmpty()) return "disabled"
    if (listener != null) { if (requester == "service") owner = requester; return "listening" }
    val callback = object : LocationListener {
      override fun onLocationChanged(location: Location) { last = location }
      @Deprecated("API antigua") override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) { }
    }
    listener = callback; owner = requester
    try {
      for (provider in providers) {
        manager.getLastKnownLocation(provider)?.let { if (last == null || it.elapsedRealtimeNanos > last!!.elapsedRealtimeNanos) last = it }
        manager.requestLocationUpdates(provider, 5000L, 0f, callback, android.os.Looper.getMainLooper())
      }
    } catch (e: Exception) { stop(context, requester); throw e }
    return "listening"
  }
  fun stop(context: Context, requester: String) {
    if (owner == "service" && requester != "service") return
    listener?.let { context.getSystemService(LocationManager::class.java).removeUpdates(it) }
    listener = null; owner = null
  }
  fun snapshot(context: Context): JSONObject {
    if (!allowed(context)) return JSONObject().put("status", "permissionRequired")
    val manager = context.getSystemService(LocationManager::class.java)
    if (!manager.isProviderEnabled(LocationManager.GPS_PROVIDER) && !manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) return JSONObject().put("status", "disabled")
    val location = last ?: return JSONObject().put("status", "waiting")
    val age = (SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos) / 1_000_000
    if (age !in 0..60000) return JSONObject().put("status", "stale").put("ageMs", age)
    return JSONObject().put("status", "ok").put("latitude", location.latitude).put("longitude", location.longitude)
      .put("accuracyM", location.accuracy.toDouble()).put("timestamp", location.time).put("ageMs", age)
  }
}
