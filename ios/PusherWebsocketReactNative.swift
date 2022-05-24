import PusherSwift
import Foundation

@objc(PusherWebsocketReactNative)
class PusherWebsocketReactNative: RCTEventEmitter, PusherDelegate, Authorizer {
    private var pusher: Pusher!
    
    @objc(multiply:withB:withResolver:withRejecter:)
    func multiply(a: Float, b: Float, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
        resolve(a*b)
    }
    
    override func supportedEvents() -> [String]! {
        return ["onIncrement"]
    }
    
    func callback(name:String, body:Any) -> Void {
        self.sendEvent(withName:name, body:body)
    }
  
    func initialize(args:[String: Any], resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) {
        if (pusher == nil) {
            var authMethod:AuthMethod = .noMethod
            if args["authEndpoint"] is String {
                authMethod = .endpoint(authEndpoint: args["authEndpoint"] as! String)
            } else if args["authorizer"] is Bool {
                authMethod = .authorizer(authorizer: self)
            }
            var host:PusherHost = .defaultHost
            if args["host"] is String {
                host = .host(args["host"] as! String)
            } else if args["cluster"] != nil {
                host = .cluster(args["cluster"] as! String)
            }
            var useTLS:Bool = true
            if args["useTLS"] is Bool {
                useTLS = args["useTLS"] as! Bool
            }
            var port:Int
            if useTLS {
                port = 443
                if args["wssPort"] is Int {
                    port = args["wssPort"] as! Int
                }
            } else {
                port = 80
                if args["wsPort"] is Int {
                    port = args["wsPort"] as! Int
                }
            }
            var activityTimeout:TimeInterval? = nil
            if args["activityTimeout"] is TimeInterval {
                activityTimeout = args["activityTimeout"] as! Double / 1000.0
            }
            var path:String? = nil
            if args["path"] is String {
                path = (args["path"] as! String)
            }
            let options = PusherClientOptions(
                authMethod: authMethod,
                host: host,
                port: port,
                path: path,
                useTLS: useTLS,
                activityTimeout: activityTimeout
            )
            pusher = Pusher(key: args["apiKey"] as! String, options: options)
            if args["maxReconnectionAttempts"] is Int {
                pusher.connection.reconnectAttemptsMax = (args["maxReconnectionAttempts"] as! Int)
            }
            if args["maxReconnectGapInSeconds"] is TimeInterval {
                pusher.connection.maxReconnectGapInSeconds = (args["maxReconnectGapInSeconds"] as! TimeInterval)
            }
            if args["pongTimeout"] is Int {
                pusher.connection.pongResponseTimeoutInterval = args["pongTimeout"] as! TimeInterval / 1000.0
            }
            pusher.connection.delegate = self
            pusher.bind(eventCallback: onEvent)
            resolve(nil)
        }
    }
    
    @objc override static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    public func fetchAuthValue(socketID: String, channelName: String, completionHandler: @escaping (PusherAuth?) -> Void) {
        self.callback(name:"onAuthorizer", body: [
            "socketId": socketID,
            "channelName": channelName
        ])
        /* { authData in
         if authData != nil {
         let authDataCast = authData as! [String:String]
         completionHandler(
         PusherAuth(
         auth: authDataCast["auth"]!,
         channelData: authDataCast["channel_data"],
         sharedSecret: authDataCast["shared_secret"]));
         } else {
         completionHandler(nil)
         }
         } */
    }
    
    public func changedConnectionState(from old: ConnectionState, to new: ConnectionState) {
        self.callback(name:"onConnectionStateChange", body:[
            "previousState": old.stringValue(),
            "currentState": new.stringValue()
        ])
    }
    
    public func debugLog(message: String) {
        //print("DEBUG:", message)
    }
    
    public func subscribedToChannel(name: String) {
        // Handled by global handler
    }
    
    public func failedToSubscribeToChannel(name: String, response: URLResponse?, data: String?, error: NSError?) {
        self.callback(name:"onSubscriptionError", body:[
            "message": (error != nil) ? error!.localizedDescription : "",
            "error": error.debugDescription
        ]
        )
    }
    
    public func receivedError(error: PusherError) {
        self.callback(
            name:"onError", body:[
                "message": error.message,
                "code": error.code ?? -1,
                "error": error.debugDescription
            ]
        )
    }
    
    public func failedToDecryptEvent(eventName: String, channelName: String, data: String?) {
        self.callback(
            name:"onDecryptionFailure", body:[
                "eventName": eventName,
                "reason": data
            ]
        )
    }
    
    func connect(resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) {
        pusher.connect()
        resolve(nil)
    }
    
    func disconnect(resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) {
        pusher.disconnect()
        resolve(nil)
    }
    
    func getSocketId() -> String? {
        return pusher.connection.socketId
    }
    
    func onEvent(event:PusherEvent) {
        var userId:String? = nil
        var mappedEventName:String? = nil
        if event.eventName == "pusher:subscription_succeeded" {
            if let channel = pusher.connection.channels.findPresence(name: event.channelName!) {
                userId = channel.myId
            }
            mappedEventName = "pusher_internal:subscription_succeeded"
        }
        self.callback(
            name:"onEvent",body:[
                "channelName": event.channelName,
                "eventName": mappedEventName ?? event.eventName,
                "userId": event.userId ?? userId,
                "data": event.data
            ]
        )
    }
    
    func subscribe(channelName:String, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) {
        if channelName.hasPrefix("presence-") {
            let onMemberAdded:(PusherPresenceChannelMember) -> () = { user in
                self.callback(name:"onMemberAdded", body: [
                    "channelName": channelName,
                    "user": ["userId": user.userId, "userInfo": user.userInfo ]
                ])
            }
            let onMemberRemoved:(PusherPresenceChannelMember) -> () = { user in
                self.callback(name:"onMemberRemoved", body: [
                    "channelName": channelName,
                    "user": ["userId": user.userId, "userInfo": user.userInfo ]
                ])
            }
            pusher.subscribeToPresenceChannel(
                channelName: channelName,
                onMemberAdded: onMemberAdded,
                onMemberRemoved: onMemberRemoved
            )
        } else {
            pusher.subscribe(channelName: channelName)
        }
        resolve(nil)
    }
    
    func unsubscribe(channelName:String, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) {
        pusher.unsubscribe(channelName)
        resolve(nil)
    }
    
    func trigger(channelName:String, eventName:String, data:Any, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) {
        if let channel = pusher.connection.channels.find(name: channelName) {
            channel.trigger(eventName: eventName, data: data)
        }
        resolve(nil)
    }
}
