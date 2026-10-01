package com.networkqosmonitor.telephony

import org.junit.Assert.*
import org.junit.Test

class TelephonyValuesTest {
  @Test fun unavailableValuesAreNotMeasurements() {
    assertNull(TelephonyValues.dbmOrNull(Int.MAX_VALUE))
    assertNull(TelephonyValues.dbmOrNull(0))
    assertNull(TelephonyValues.dbmOrNull(Int.MIN_VALUE))
    assertEquals(-113, TelephonyValues.dbmOrNull(-113))
  }

  @Test fun lteAndUnknownAreNotInferredAs5g() {
    assertEquals("4G / LTE", TelephonyValues.technology(13))
    assertEquals("5G NR", TelephonyValues.technology(20))
    assertNull(TelephonyValues.technology(0))
    assertNull(TelephonyValues.technology(999))
  }
}
