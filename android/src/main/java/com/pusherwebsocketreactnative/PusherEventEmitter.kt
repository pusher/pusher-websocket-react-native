package com.pusherwebsocketreactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class PusherEventEmitter(private val context: ReactApplicationContext) {
  companion object {
    private const val EVENT_PREFIX = "PusherReactNative"
  }

  fun emit(eventName: String, params: Any?) {
    val jsModule = this.context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
    val pusherEventName = "${EVENT_PREFIX}:${eventName}"

    if (params is Map<*, *>) {
      jsModule.emit(pusherEventName, Arguments.makeNativeMap(params as Map<String, Any>))
    }

    if (params is String) {
      jsModule.emit(pusherEventName, params)
    }
  }
}
