package com.networkqosmonitor.telephony

/** Reglas sin dependencias de Android, para poder probar valores inválidos. */
internal object TelephonyValues {
  // Android usa Int.MAX_VALUE para UNAVAILABLE. Cero tampoco es señal válida aquí.
  fun dbmOrNull(value: Int): Int? = value.takeIf { it in -200..-1 }

  // Constantes públicas de TelephonyManager. No deducimos 5G por el modelo del equipo.
  fun technology(type: Int): String? = when (type) {
    1, 2, 4, 7, 11, 16 -> "2G"
    3, 5, 6, 8, 9, 10, 12, 14, 15, 17 -> "3G"
    13 -> "4G / LTE"
    18 -> "IWLAN"
    20 -> "5G NR"
    else -> null
  }
}
