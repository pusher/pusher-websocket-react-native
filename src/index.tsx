import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'pusher-websocket-react-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

const PusherWebsocketReactNative = NativeModules.PusherWebsocketReactNative
  ? NativeModules.PusherWebsocketReactNative
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

enum PusherEventName {
  ON_AUTHORIZER = 'PusherReactNative:onAuthorizer',
  ON_CONNECTION_STATE_CHANGE = 'PusherReactNative:onConnectionStateChange',
  ON_SUBSCRIPTION_ERROR = 'PusherReactNative:onSubscriptionError',
  ON_EVENT = 'PusherReactNative:onEvent',
  ON_ERROR = 'PusherReactNative:onError',
  ON_MEMBER_ADDED = 'PusherReactNative:onMemberAdded',
  ON_MEMBER_REMOVED = 'PusherReactNative:onMemberRemoved',
}

export interface PusherAuthorizerResult {
  /** required for private channels */
  auth?: string;
  /** required for encrypted channels */
  shared_secret?: string;
  /** required for presence channels, should be stringified JSON */
  channel_data?: string;
}

export class PusherEvent {
  channelName: string;
  eventName: string;
  data: any;
  userId?: string;
  constructor(args: {
    channelName: string;
    eventName: string;
    data: any;
    userId?: string;
  }) {
    this.channelName = args.channelName;
    this.eventName = args.eventName;
    this.data = args.data;
    this.userId = args.userId;
  }
  toString() {
    return `{ channelName: ${this.channelName}, eventName: ${this.eventName}, data: ${this.data}, userId: ${this.userId} }`;
  }
}

export class PusherMember {
  userId: string;
  userInfo: any;
  constructor(userId: string, userInfo: any) {
    this.userId = userId;
    this.userInfo = userInfo;
  }

  toString() {
    return `{ userId: ${this.userId}, userInfo: ${JSON.stringify(
      this.userInfo
    )} }`;
  }
}

export class PusherChannel {
  channelName: string;
  members = new Map<String, PusherMember>();
  me?: PusherMember;
  subscriptionCount?: Number;
  onSubscriptionSucceeded?: (data: any) => void;
  onSubscriptionCount?: (subscriptionCount: Number) => void;
  onEvent?: (event: any) => void;
  onMemberAdded?: (member: PusherMember) => void;
  onMemberRemoved?: (member: PusherMember) => void;
  constructor(args: {
    channelName: string;
    onSubscriptionSucceeded?: (data: any) => void;
    onSubscriptionCount?: (subscriptionCount: Number) => void;
    onEvent?: (member: PusherEvent) => void;
    onMemberAdded?: (member: PusherMember) => void;
    onMemberRemoved?: (member: PusherMember) => void;
    me?: PusherMember;
  }) {
    this.channelName = args.channelName;
    this.onSubscriptionSucceeded = args.onSubscriptionSucceeded;
    this.onEvent = args.onEvent;
    this.onMemberAdded = args.onMemberAdded;
    this.onMemberRemoved = args.onMemberRemoved;
    this.onSubscriptionCount = args.onSubscriptionCount;
    this.me = args.me;
  }

  async unsubscribe() {
    return Pusher.getInstance().unsubscribe({
      channelName: this.channelName,
    });
  }

  async trigger(event: PusherEvent) {
    if (event.channelName !== this.channelName) {
      throw 'Event is not for this channel';
    }
    return Pusher.getInstance().trigger(event);
  }
}

export class Pusher {
  private static instance: Pusher;
  private pusherEventEmitter = new NativeEventEmitter(
    PusherWebsocketReactNative
  );

  public channels = new Map<String, PusherChannel>();
  public connectionState = 'DISCONNECTED';

  private constructor() {}

  static getInstance(): Pusher {
    if (!Pusher.instance) {
      Pusher.instance = new Pusher();
    }
    return Pusher.instance;
  }

  private addListener(
    pusherEventName: PusherEventName,
    callback: (event: any) => void
  ) {
    return this.pusherEventEmitter.addListener(pusherEventName, callback);
  }

  public init(args: {
    apiKey: string;
    cluster: string;
    authEndpoint?: string;
    useTLS?: boolean;
    activityTimeout?: Number;
    pongTimeout?: Number;
    maxReconnectionAttempts?: Number;
    maxReconnectGapInSeconds?: Number;
    authorizerTimeoutInSeconds?: Number;
    proxy?: string;
    onConnectionStateChange?: (
      currentState: string,
      previousState: string
    ) => void;
    onAuthorizer?: (
      channelName: string,
      socketId: string
    ) => Promise<PusherAuthorizerResult>;
    onError?: (message: string, code: Number, e: any) => void;
    onEvent?: (event: PusherEvent) => void;
    onSubscriptionSucceeded?: (channelName: string, data: any) => void;
    onSubscriptionError?: (
      channelName: string,
      message: string,
      e: any
    ) => void;
    onSubscriptionCount?: (
      channelName: string,
      subscriptionCount: Number
    ) => void;
    onDecryptionFailure?: (eventName: string, reason: string) => void;
    onMemberAdded?: (channelName: string, member: PusherMember) => void;
    onMemberRemoved?: (channelName: string, member: PusherMember) => void;
  }) {
    this.removeAllListeners();

    this.addListener(
      PusherEventName.ON_CONNECTION_STATE_CHANGE,
      (event: any) => {
        this.connectionState = event.currentState.toUpperCase();
        args.onConnectionStateChange?.(
          event.currentState.toUpperCase(),
          event.previousState.toUpperCase()
        );
      }
    );

    this.addListener(PusherEventName.ON_ERROR, (event: any) =>
      args.onError?.(event.message, event.code, event.error)
    );

    this.addListener(PusherEventName.ON_EVENT, (event: any) => {
      const channelName = event.channelName;
      const eventName = event.eventName;
      const data = event.data;
      const userId = event.userId;
      const channel = this.channels.get(channelName);

      switch (eventName) {
        case 'pusher_internal:subscription_succeeded':
          // Depending on the platform implementation we get json or a Map.
          var decodedData = data instanceof Object ? data : JSON.parse(data);
          for (const _userId in decodedData?.presence?.hash) {
            const userInfo = decodedData?.presence?.hash[_userId];
            var member = new PusherMember(_userId, userInfo);
            channel?.members.set(member.userId, member);
            if (_userId === userId && channel) {
              channel.me = member;
            }
          }
          args.onSubscriptionSucceeded?.(channelName, decodedData);
          channel?.onSubscriptionSucceeded?.(decodedData);
          break;
        case 'pusher_internal:subscription_count':
          // Depending on the platform implementation we get json or a Map.
          var decodedData = data instanceof Object ? data : JSON.parse(data);
          if (channel) {
            channel.subscriptionCount = decodedData.subscription_count;
          }
          args.onSubscriptionCount?.(
            channelName,
            decodedData.subscription_count
          );
          channel?.onSubscriptionCount?.(decodedData.subscription_count);
          break;
        default:
          const pusherEvent = new PusherEvent(event);
          args.onEvent?.(pusherEvent);
          channel?.onEvent?.(pusherEvent);
          break;
      }
    });

    this.addListener(PusherEventName.ON_MEMBER_ADDED, (event) => {
      const user = event.user;
      const channelName = event.channelName;
      var member = new PusherMember(user.userId, user.userInfo);
      const channel = this.channels.get(channelName);
      channel?.members.set(member.userId, member);
      args.onMemberAdded?.(channelName, member);
      channel?.onMemberAdded?.(member);
    });

    this.addListener(PusherEventName.ON_MEMBER_REMOVED, (event) => {
      const user = event.user;
      const channelName = event.channelName;
      var member = new PusherMember(user.userId, user.userInfo);
      const channel = this.channels.get(channelName);
      channel?.members.delete(member.userId);
      args.onMemberRemoved?.(channelName, member);
      channel?.onMemberRemoved?.(member);
    });

    this.addListener(
      PusherEventName.ON_AUTHORIZER,
      async ({ channelName, socketId }) => {
        const data = await args.onAuthorizer?.(channelName, socketId);
        if (data) {
          await PusherWebsocketReactNative.onAuthorizer(
            channelName,
            socketId,
            data
          );
        }
      }
    );

    this.addListener(
      PusherEventName.ON_SUBSCRIPTION_ERROR,
      async ({ channelName, message, type }) => {
        args.onSubscriptionError?.(channelName, message, type);
      }
    );

    return PusherWebsocketReactNative.initialize({
      apiKey: args.apiKey,
      cluster: args.cluster,
      authEndpoint: args.authEndpoint,
      useTLS: args.useTLS,
      activityTimeout: args.activityTimeout,
      pongTimeout: args.pongTimeout,
      maxReconnectionAttempts: args.maxReconnectionAttempts,
      maxReconnectGapInSeconds: args.maxReconnectGapInSeconds,
      authorizerTimeoutInSeconds: args.authorizerTimeoutInSeconds,
      authorizer: args.onAuthorizer ? true : false,
      proxy: args.proxy,
    });
  }

  public async connect() {
    return await PusherWebsocketReactNative.connect();
  }

  public async disconnect() {
    return await PusherWebsocketReactNative.disconnect();
  }

  private unsubscribeAllChannels() {
    const channelsCopy = new Map(this.channels);
    channelsCopy.forEach((channel) => {
      this.unsubscribe({ channelName: channel.channelName });
    });
  }

  private removeAllListeners() {
    this.pusherEventEmitter.removeAllListeners(PusherEventName.ON_AUTHORIZER);
    this.pusherEventEmitter.removeAllListeners(PusherEventName.ON_ERROR);
    this.pusherEventEmitter.removeAllListeners(PusherEventName.ON_EVENT);
    this.pusherEventEmitter.removeAllListeners(PusherEventName.ON_MEMBER_ADDED);
    this.pusherEventEmitter.removeAllListeners(
      PusherEventName.ON_MEMBER_REMOVED
    );
  }

  public async reset() {
    this.removeAllListeners();
    this.unsubscribeAllChannels();
  }

  async subscribe(args: {
    channelName: string;
    onSubscriptionSucceeded?: (data: any) => void;
    onSubscriptionError?: (
      channelName: string,
      message: string,
      e: any
    ) => void;
    onMemberAdded?: (member: PusherMember) => void;
    onMemberRemoved?: (member: PusherMember) => void;
    onEvent?: (event: PusherEvent) => void;
  }) {
    const channel = this.channels.get(args.channelName);
    if (channel) {
      return channel;
    }

    const newChannel = new PusherChannel(args);
    await PusherWebsocketReactNative.subscribe(args.channelName);
    this.channels.set(args.channelName, newChannel);
    return newChannel;
  }

  public async unsubscribe({ channelName }: { channelName: string }) {
    await PusherWebsocketReactNative.unsubscribe(channelName);
    this.channels.delete(channelName);
  }

  public async trigger(event: PusherEvent) {
    if (
      event.channelName.startsWith('private-') ||
      event.channelName.startsWith('presence-')
    ) {
      const data = Platform.OS === 'android' ? JSON.stringify(event.data ?? {}) : event.data
      await PusherWebsocketReactNative.trigger(
        event.channelName,
        event.eventName,
        data
      );
    } else {
      throw 'Trigger event is only for private/presence channels';
    }
  }

  public async getSocketId() {
    return await PusherWebsocketReactNative.getSocketId();
  }

  public getChannel(channelName: string): PusherChannel | undefined {
    return this.channels.get(channelName);
  }
}
