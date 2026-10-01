package com.networkqosmonitor.telephony

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.networkqosmonitor.probes.NetworkProbeModule

class NetworkTelephonyPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    when (name) {
      NetworkTelephonyModule.NAME -> NetworkTelephonyModule(reactContext)
      NetworkProbeModule.NAME -> NetworkProbeModule(reactContext)
      else -> null
    }

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(NetworkTelephonyModule.NAME to ReactModuleInfo(
      NetworkTelephonyModule.NAME, NetworkTelephonyModule.NAME,
      false, false, false, true
    ), NetworkProbeModule.NAME to ReactModuleInfo(
      NetworkProbeModule.NAME, NetworkProbeModule.NAME,
      false, false, false, true
    ))
  }
}
