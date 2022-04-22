package com.pusherwebsocketreactnative

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.gson.Gson
import com.pusher.client.Authorizer
import com.pusher.client.Pusher
import com.pusher.client.PusherOptions
import com.pusher.client.channel.*
import com.pusher.client.connection.ConnectionEventListener
import com.pusher.client.connection.ConnectionState
import com.pusher.client.connection.ConnectionStateChange
import com.pusher.client.util.HttpAuthorizer
import java.net.InetSocketAddress
import java.net.Proxy
import java.util.concurrent.Semaphore

class PusherWebsocketReactNativeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext),
  ConnectionEventListener, ChannelEventListener, SubscriptionEventListener,
  PrivateChannelEventListener, PrivateEncryptedChannelEventListener, PresenceChannelEventListener,
  Authorizer {

    private var pusher: Pusher? = null
    private val TAG = "PusherReactNative"

    override fun getName(): String {
        return "PusherReactNative"
    }

    private fun callback(eventName: String, params: Any?) {
      this.reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
    }

    // Example method
    // See https://reactnative.dev/docs/native-modules-android
    @ReactMethod
    fun multiply(a: Int, b: Int, promise: Promise) {

      promise.resolve(a * b)

    }

    @ReactMethod
    fun init(
      arguments: ReadableMap,
      promise: Promise
    ) {
    try {
      if (pusher == null) {
        val options = PusherOptions()
        if (arguments.hasKey("cluster")) options.setCluster(arguments.getString("cluster"))
        if (arguments.hasKey("useTLS")) options.isUseTLS =
          arguments.getBoolean("useTLS")!!
        if (arguments.hasKey("activityTimeout")) options.activityTimeout =
          arguments.getInt("activityTimeout")!! as Long
        if (arguments.hasKey("pongTimeout")) options.pongTimeout =
          arguments.getInt("pongTimeout")!! as Long
        if (arguments.hasKey("maxReconnectionAttempts")) options.maxReconnectionAttempts =
          arguments.getInt("maxReconnectionAttempts")!!
        if (arguments.hasKey("maxReconnectGapInSeconds")) options.maxReconnectGapInSeconds =
          arguments.getInt("maxReconnectGapInSeconds")!!
        if (arguments.hasKey("authEndpoint")) options.authorizer =
          HttpAuthorizer(arguments.getString("authEndpoint"))
        if (arguments.hasKey("authorizer")) options.authorizer = this
        if (arguments.hasKey("proxy")) {
          val (host, port) = arguments.getString("proxy")!!.split(':')
          options.proxy = Proxy(Proxy.Type.HTTP, InetSocketAddress(host, port.toInt()))
        }
        pusher = Pusher(arguments.getString("apiKey"), options)
      } else {
        throw Exception("Pusher Channels already initialized.")
      }
      Log.i(TAG, "Start $pusher")
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject(TAG, e.message, null)
    }
  }

  @ReactMethod
  fun connect(promise: Promise) {
    pusher!!.connect(this, ConnectionState.ALL)
    promise.resolve(null)
  }

  @ReactMethod
  fun disconnect(promise: Promise) {
    pusher!!.disconnect()
    promise.resolve(null)
  }

  @ReactMethod
  fun subscribe(channelName: String, promise: Promise) {
    val channel = when {
      channelName.startsWith("private-") -> pusher!!.subscribePrivate(channelName, this)
      channelName.startsWith("private-encrypted-") -> pusher!!.subscribePrivateEncrypted(
        channelName, this
      )
      channelName.startsWith("presence-") -> pusher!!.subscribePresence(
        channelName, this
      )
      else -> pusher!!.subscribe(channelName, this)
    }
    channel.bindGlobal(this)
    promise.resolve(null)
  }

  @ReactMethod
  fun unsubscribe(channelName: String, promise: Promise) {
    pusher!!.unsubscribe(channelName)
    promise.resolve(null)
  }

  @ReactMethod
  fun trigger(channelName: String, eventName: String, data: String, promise: Promise) {
    when {
      channelName.startsWith("private-") -> pusher!!.getPrivateChannel(channelName)
        .trigger(eventName, data)
      channelName.startsWith("private-encrypted-") -> throw Exception("It's not currently possible to send a message using private encrypted channels.")
      channelName.startsWith("presence-") -> pusher!!.getPresenceChannel(channelName)
        .trigger(eventName, data)
      else -> throw Exception("Messages can only be sent to private and presence channels.")
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun getSocketId(promise: Promise) {
    val socketId = pusher!!.connection.socketId
    promise.resolve(socketId)
  }

  override fun authorize(channelName: String?, socketId: String?): String? {
    var result: String? = null
    val mutex = Semaphore(0)
    callback("onAuthorizer", mapOf(
      "channelName" to channelName,
      "socketId" to socketId
    ))
    mutex.acquire()



    activity!!.runOnUiThread {
      methodChannel.invokeMethod("onAuthorizer", mapOf(
        "channelName" to channelName,
        "socketId" to socketId
      ), object : Result {
        override fun success(o: Any?) {
          if (o != null) {
            val gson = Gson()
            result = gson.toJson(o)
          }
          mutex.release()
        }

        override fun error(s: String, s1: String?, o: Any?) {
          mutex.release()
        }

        override fun notImplemented() {
          mutex.release()
        }
      })
    }
    mutex.acquire()
    return result
  }

  // Event handlers
  override fun onConnectionStateChange(change: ConnectionStateChange) {
    callback(
      "onConnectionStateChange", mapOf(
        "previousState" to change.previousState.toString(),
        "currentState" to change.currentState.toString()
      )
    )
  }

  override fun onSubscriptionSucceeded(channelName: String) {
    // For presence channels we wait for the onUsersInformationReceived event.
    if (!channelName.startsWith("presence-")) {
      callback(
        "onEvent", mapOf(
          "channelName" to channelName,
          "eventName" to "pusher_internal:subscription_succeeded",
          "data" to emptyMap<String,String>()
        )
      )
    }
  }

  override fun onEvent(event: PusherEvent) {
    // Log.i(TAG, "Received event with data: $event")
    callback(
      "onEvent", mapOf(
        "channelName" to event.channelName,
        "eventName" to event.eventName,
        "userId" to event.userId,
        "data" to event.data
      )
    )
  }

  override fun onAuthenticationFailure(message: String, e: Exception) {
    // Log.e(TAG, "Authentication failure due to $message, exception was $e")
    callback(
      "onSubscriptionError", mapOf(
        "message" to message,
        "error" to e.toString()
      )
    )
  } // Other ChannelEventListener methods

  override fun onUsersInformationReceived(channelName: String?, users: MutableSet<User>?) {
    // Log.i(TAG, "Users received: $users")
    val gson = Gson()
    val channel = pusher!!.getPresenceChannel(channelName)
    val hash = mutableMapOf<String, Any?>()
    // convert users back to original structure.
    for (user in users!!) {
      hash[user.id] = gson.fromJson(user.info, Map::class.java)
    }
    val data = mapOf(
      "presence" to mapOf(
        "count" to users.size,
        "ids" to users.map { it.id },
        "hash" to hash
      )
    )
    callback(
      "onEvent", mapOf(
        "channelName" to channelName,
        "eventName" to "pusher_internal:subscription_succeeded",
        "userId" to channel.me.id,
        "data" to data
      )
    )
  }

  override fun onDecryptionFailure(event: String?, reason: String?) {
    // Log.e(TAG, "Decryption failure due to $event, exception was $reason")
    callback(
      "onDecryptionFailure", mapOf(
        "event" to event,
        "reason" to reason
      )
    )
  }

  override fun userSubscribed(channelName: String, user: User) {
    // Log.i(TAG, "A new user joined channel [$channelName]: ${user.id}, ${user.info}")
    callback(
      "onMemberAdded", mapOf(
        "channelName" to channelName,
        "user" to mapOf(
          "userId" to user.id,
          "userInfo" to user.info
        )
      )
    )
  }

  override fun userUnsubscribed(channelName: String, user: User) {
    // Log.i(TAG, "A user left channel [$channelName]: ${user.id}, ${user.info}")
    callback(
      "onMemberRemoved", mapOf(
        "channelName" to channelName,
        "user" to mapOf(
          "userId" to user.id,
          "userInfo" to user.info
        )
      )
    )
  } // Other ChannelEventListener methods

  override fun onError(message: String, code: String?, e: Exception?) {
    callback(
      "onError", mapOf(
        "message" to message,
        "code" to code,
        "error" to e.toString()
      )
    )
  }

  override fun onError(message: String, e: Exception) {
    onError(message, "", e)
  }
}
