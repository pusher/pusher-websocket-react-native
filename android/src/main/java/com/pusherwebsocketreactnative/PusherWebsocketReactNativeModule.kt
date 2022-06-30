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


class PusherWebsocketReactNativeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext),
  ConnectionEventListener, ChannelEventListener, SubscriptionEventListener,
  PrivateChannelEventListener, PrivateEncryptedChannelEventListener, PresenceChannelEventListener,
  Authorizer {

  private var pusher: Pusher? = null
  private val TAG = "PusherReactNative"
  private val authorizerMutex = mutableMapOf<String, Semaphore>()
  private val authorizerResult = mutableMapOf<String, ReadableMap>()

  override fun getName(): String {
    return "PusherWebsocketReactNative"
  }

  private fun emitEvent(eventName: String, params: Any?) {
    val jsModule = this.reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
    if (params is Map<*, *>) {
      jsModule.emit(eventName, Arguments.makeNativeMap(params as Map<String, Any>))
    }

    if (params is String) {
      jsModule.emit(eventName, params)
    }
  }

  @ReactMethod
  fun addListener(eventName: String?) {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  @ReactMethod
  fun removeListeners(count: Int?) {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  @ReactMethod
  fun initialize(
    arguments: ReadableMap,
    promise: Promise
  ) {
    try {
      if (pusher == null) {
        val options = PusherOptions()
        if (arguments.hasKey("cluster")) options.setCluster(arguments.getString("cluster"))
        if (arguments.hasKey("useTLS")) options.isUseTLS =
          arguments.getBoolean("useTLS")
        if (arguments.hasKey("activityTimeout")) options.activityTimeout =
          arguments.getInt("activityTimeout") as Long
        if (arguments.hasKey("pongTimeout")) options.pongTimeout =
          arguments.getInt("pongTimeout") as Long
        if (arguments.hasKey("maxReconnectionAttempts")) options.maxReconnectionAttempts =
          arguments.getInt("maxReconnectionAttempts")
        if (arguments.hasKey("maxReconnectGapInSeconds")) options.maxReconnectGapInSeconds =
          arguments.getInt("maxReconnectGapInSeconds")
        if (arguments.hasKey("authEndpoint")) options.authorizer =
          HttpAuthorizer(arguments.getString("authEndpoint"))
        if (arguments.hasKey("authorizer") && arguments.getBoolean("authorizer")) options.authorizer = this
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
      channelName.startsWith("private-encrypted-") -> pusher!!.subscribePrivateEncrypted(
        channelName, this
      )
      channelName.startsWith("private-") -> pusher!!.subscribePrivate(channelName, this)
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
    try {
      when {
        channelName.startsWith("private-encrypted-") -> throw Exception("It's not currently possible to send a message using private encrypted channels.")
        channelName.startsWith("private-") -> pusher!!.getPrivateChannel(channelName).trigger(eventName, data)
        channelName.startsWith("presence-") -> pusher!!.getPresenceChannel(channelName)
          .trigger(eventName, data)
        else -> throw Exception("Messages can only be sent to private and presence channels.")
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  @ReactMethod
  fun getSocketId(promise: Promise) {
    val socketId = pusher!!.connection.socketId
    promise.resolve(socketId)
  }

  override fun authorize(channelName: String, socketId: String): String? {
    emitEvent(
      "onAuthorizer", mapOf(
        "channelName" to channelName,
        "socketId" to socketId
      )
    )
    val key = channelName + socketId
    authorizerMutex[key] = Semaphore(0)
    authorizerMutex[key]!!.acquire()
    val authParams = authorizerResult.remove(key)!!
    val gson = Gson()
    val json = gson.toJson(authParams.toHashMap())
    return json
  }

  @ReactMethod
  fun onAuthorizer(channelName: String, socketId: String, data: ReadableMap, promise: Promise) {
    val key = channelName + socketId
    authorizerResult[key] = data
    authorizerMutex[key]!!.release()
    authorizerMutex.remove(key)
    promise.resolve(null)
  }

  // Event handlers
  override fun onConnectionStateChange(change: ConnectionStateChange) {
    emitEvent(
      "onConnectionStateChange", mapOf(
        "previousState" to change.previousState.toString(),
        "currentState" to change.currentState.toString()
      )
    )
  }

  override fun onSubscriptionSucceeded(channelName: String) {
    // For presence channels we wait for the onUsersInformationReceived event.
    if (!channelName.startsWith("presence-")) {
      emitEvent(
        "onEvent", mapOf(
          "channelName" to channelName,
          "eventName" to "pusher_internal:subscription_succeeded",
          "data" to emptyMap<String, String>()
        )
      )
    }
  }

  override fun onEvent(event: PusherEvent) {
    // Log.i(TAG, "Received event with data: $event")
    emitEvent(
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
    emitEvent(
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
    emitEvent(
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
    emitEvent(
      "onDecryptionFailure", mapOf(
        "event" to event,
        "reason" to reason
      )
    )
  }

  override fun userSubscribed(channelName: String, user: User) {
    // Log.i(TAG, "A new user joined channel [$channelName]: ${user.id}, ${user.info}")
    val gson = Gson()
    emitEvent(
      "onMemberAdded", mapOf(
        "channelName" to channelName,
        "user" to mapOf(
          "userId" to user.id,
          "userInfo" to gson.fromJson(user.info, Map::class.java)
        )
      )
    )
  }

  override fun userUnsubscribed(channelName: String, user: User) {
    // Log.i(TAG, "A user left channel [$channelName]: ${user.id}, ${user.info}")
    val gson = Gson()
    emitEvent(
      "onMemberRemoved", mapOf(
        "channelName" to channelName,
        "user" to mapOf(
          "userId" to user.id,
          "userInfo" to gson.fromJson(user.info, Map::class.java)
        )
      )
    )
  } // Other ChannelEventListener methods

  override fun onError(message: String, code: String?, e: Exception?) {
    emitEvent(
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
