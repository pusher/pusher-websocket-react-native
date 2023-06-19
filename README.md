# Pusher React Native Websocket Client

[![Twitter](https://img.shields.io/badge/twitter-@Pusher-blue.svg?style=flat)](http://twitter.com/Pusher)
[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg)](https://raw.githubusercontent.com/pusher/pusher-websocket-react-native/master/LICENSE)
[![npm version](https://badge.fury.io/js/@pusher%2Fpusher-websocket-react-native.svg)](https://badge.fury.io/js/@pusher%2Fpusher-websocket-react-native)

This is the [Pusher Channels](https://pusher.com/channels) React Native client.

For tutorials and more in-depth information about Pusher Channels, visit our [official docs](https://pusher.com/docs/channels).

## Supported Mobile platforms

- Android through [pusher-websocket-java](https://github.com/pusher/pusher-websocket-java)
- iOS through [pusher-websocket-swift](https://github.com/pusher/pusher-websocket-swift)

### Deployment targets

- iOS 13.0 and above
- Android 7 and above. Android 6 will require [desugaring](https://developer.android.com/studio/write/java8-support#library-desugaring).

## Example Application

By cloning this repository you can check the React Native example application,
a minimal application to connect to a channel and send events.

- https://github.com/pusher/pusher-websocket-react-native/tree/master/example

## Table of Contents

- [Pusher React Native Websocket Client](#pusher-react-native-websocket-client)
  - [Supported Mobile platforms](#supported-mobile-platforms)
    - [Deployment targets](#deployment-targets)
  - [Example Application](#example-application)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
    - [iOS specific installation](#ios-specific-installation)
    - [Android specific installation](#android-specific-installation)
  - [Initialization](#initialization)
  - [Configuration](#configuration)
      - [`activityTimeout (double)`](#activitytimeout-double)
      - [`apiKey (string)`](#apikey-string)
      - [`authEndpoint (string)`](#authendpoint-string)
      - [`cluster (string)`](#cluster-string)
      - [`host (string)`](#host-string)
      - [`useTLS (bool)`](#usetls-bool)
  - [Event Callback parameters](#event-callback-parameters)
      - [`onEvent`](#onevent)
      - [`onSubscriptionSucceeded`](#onsubscriptionsucceeded)
      - [`onSubscriptionError`](#onsubscriptionerror)
      - [`onDecryptionFailure`](#ondecryptionfailure)
      - [`onSubscriptionCount`](#onsubscriptioncount)
      - [`onMemberAdded`](#onmemberadded)
      - [`onMemberRemoved`](#onmemberremoved)
      - [`onAuthorizer`](#onauthorizer)
      - [`onConnectionStateChange`](#onconnectionstatechange)
      - [`onError`](#onerror)
  - [Connection handling](#connection-handling)
    - [Connecting](#connecting)
    - [Disconnecting](#disconnecting)
    - [Reconnection](#reconnection)
  - [Subscribing](#subscribing)
    - [Public channels](#public-channels)
    - [Private channels](#private-channels)
    - [Private encrypted channels](#private-encrypted-channels)
      - [Limitations](#limitations)
    - [Presence channels](#presence-channels)
    - [Unsubscribing](#unsubscribing)
  - [Binding to events](#binding-to-events)
    - [Per-channel events](#per-channel-events)
    - [Global events](#global-events)
    - [PusherEvent](#pusherevent)
      - [Parsing event data](#parsing-event-data)
    - [Receiving errors](#receiving-errors)
  - [Triggering events](#triggering-events)
  - [Get a channel by name](#get-a-channel-by-name)
  - [Socket information](#socket-information)
  - [Communication](#communication)
  - [Credits](#credits)
  - [License](#license)

## Installation

To integrate the plugin in your React Native App, you need
to add the plugin to your `package.json`:

```bash
npm install @pusher/pusher-websocket-react-native
```
or
```bash
yarn add @pusher/pusher-websocket-react-native
```

### iOS specific installation

The Pusher Channels React Native plugin adds the
pusher-websocket-swift cocoapod to your project.
You probably need to run a

```bash
$ pod install
```

in the ios directory.

### Android specific installation

Gradle should automatically include the
pusher-websocket-java dependency.

## Initialization

The Pusher class is a singleton that
can be instantiated with `getInstance()`. Then you need to initialize the client with several configuration options. Here is a quick example with several callbacks options:

```typescript
import {
  Pusher,
  PusherMember,
  PusherChannel,
  PusherEvent,
} from '@pusher/pusher-websocket-react-native';

const pusher = Pusher.getInstance();

try {
  await pusher.init({
    apiKey: APP_KEY,
    cluster: APP_CLUSTER,
    // authEndpoint: '<YOUR ENDPOINT URI>',
    onConnectionStateChange,
    onError,
    onEvent,
    onSubscriptionSucceeded,
    onSubscriptionError,
    onDecryptionFailure,
    onMemberAdded,
    onMemberRemoved,
    onSubscriptionCount,
  });

  await pusher.subscribe({ channelName });
  await pusher.connect();
} catch (e) {
  console.log(`ERROR: ${e}`);
}
```

After calling `init(...)` you can connect to the Pusher servers.
You can subscribe to channels before calling `connect()`.

## Configuration

There are a few configuration parameters which can be set for the Pusher client. The following table
describes available parameters for each platform:

| parameter                  | Android | iOS |
| -------------------------- | ------- | --- |
| activityTimeout            | ✅      | ✅  |
| apiKey                     | ✅      | ✅  |
| authEndpoint               | ✅      | ✅  |
| cluster                    | ✅      | ✅  |
| maxReconnectGapInSeconds   | ✅      | ✅  |
| maxReconnectionAttempts    | ✅      | ✅  |
| pongTimeout                | ✅      | ✅  |
| host                       | ✅      | ✅  |
| proxy                      | ✅      | ⬜️ |
| useTLS                     | ✅      | ✅  |
| authorizerTimeoutInSeconds | ⬜️     | ✅  |

#### `activityTimeout (double)`

If no messages are received after this time period (in seconds),  the ping message is sent to check if the connection is still working. The server supplies the default value, low values result in unnecessary traffic.

#### `apiKey (string)`

You can get your `APP_KEY` and `APP_CLUSTER` from the the App page on the App Keys section in your [Pusher Channels Dashboard](https://dashboard.pusher.com/)

#### `authEndpoint (string)`

The authEndpoint provides a URL that the
Pusher client will call to authorize users
for a presence channel. Learn [how to implement
an authorization service](https://pusher.com/docs/channels/server_api/authenticating-users/)

#### `cluster (string)`

Specifies the cluster that pusher-js should connect to. Here's the full list of [Pusher clusters](https://pusher.com/docs/clusters). If you do not specify a cluster, `mt1` will be used by default.

#### `host (string)`

Specifies the host that pusher-js should connect to. If you do not specify a host, pusher.com will be used by default.

#### `useTLS (bool)`

Whether or not you would like to use TLS encrypted transport or not, default is `true`.

#### `authorizerTimeoutInSeconds (double)`

If onAuthorizer callback is not called in Javascript before this time period (in seconds), the authorization for the channel will timeout on the native side. Default value: 10 seconds. iOS only.


## Event Callback parameters

The following functions are callbacks that can be passed to the `init()` method. All are optional.

#### `onEvent`

```typescript
function onEvent(PusherEvent event) {
  console.log(`onEvent: ${event}`);
}
```

Called when an event is received by the client.
The global event handler will trigger events from any channel.

#### `onSubscriptionSucceeded`

```typescript
function onSubscriptionSucceeded(channelName:string, data:any) {
  console.log(`onSubscriptionSucceeded: ${channelName} data: ${data}`);
}
```

Use this if you want to be informed when a channel has successfully been subscribed to. This is useful if you want to perform actions that are only relevant after a subscription has succeeded. For example, querying the members for presence channel.

#### `onSubscriptionError`

```typescript
function onSubscriptionError(channelName: string, message:string, e:any) {
  console.log(`onSubscriptionError: ${message} channelName: ${channelName} Exception: ${e}`);
}
```

Use this if you want to be informed of a failed subscription attempt. You can use this to re-attempt the subscription or make a call to a service you use to track errors.

#### `onDecryptionFailure`

```typescript
function onDecryptionFailure(event:string, string reason:string) {
  console.log(`onDecryptionFailure: ${event} reason: ${reason}`);
}
```
Used with private channels only. Use this if you want to be notified if any messages fail to decrypt.

#### `onSubscriptionCount`

```typescript
function onSubscriptionCount(subscriptionCount:number) {
  console.log(`onSubscriptionSucceeded: ${subscriptionCount}`);
}
```

is an event that can be manually enabled on the server to count the number of connections that are currently subscribed to a particular channel. They work with all channel types, except presence channels.
See [Counting live users at scale with subscription_count events](https://blog.pusher.com/counting-live-users-at-scale-with-subscription-count-events/) for more information.

#### `onMemberAdded`

```typescript
function onMemberAdded(channelName:string, member:PusherMember) {
  console.log(`onMemberAdded: ${channelName} member: ${member}`);
}
```

Called when a member is added to the presence channel.

#### `onMemberRemoved`

```typescript
function onMemberRemoved(channelName:string, member:PusherMember) {
  console.log(`onMemberRemoved: ${channelName} member: ${member}`);
}
```

Called when a member is removed from the presence channel.

#### `onAuthorizer`

When passing the `onAuthorizer()` callback to the `init()` method, this callback is called to request auth information. Learn how
to [generate the correct auth signatures](https://pusher.com/docs/channels/library_auth_reference/auth-signatures/)

```typescript
async function onAuthorizer(channelName:string, socketId:string):Promise<PusherAuthorizerResult> {
  return {
    auth: "foo:bar",
    channel_data: '{"user_id": 1}',
    shared_secret: "foobar"
  };
}
```

#### `onConnectionStateChange`

```typescript
function onConnectionStateChange(currentState:string, previousState:string) {
  console.log(`Connection: ${currentState}`);
}
```

Use this if you want to use connection state changes to perform different actions/UI updates.
The connection can have different states, as follows:

- `CONNECTING` - Currently attempting to establish a connection
- `CONNECTED` - Connection successfully established
- `DISCONNECTING` - Connection is about to be disconnected.
- `DISCONNECTED` - Connection has been disconnected with no attempts to automatically reconnect.
- `RECONNECTING` - Atempting to re-establish the connection.

#### `onError`

```typescript
function onError(message:string, code:int, e:any) {
  console.log(`onError: $message code: ${code} exception: ${e}`);
}
```

Use this if you want to be informed about errors received from Pusher Channels. For example, `Application is over connection quota`. For more details, refer to [Pusher error codes](https://pusher.com/docs/channels/library_auth_reference/pusher-websockets-protocol#error-codes).

## Connection handling

### Connecting

To connect to the Pusher network, call the `connect()` method.

```typescript
await pusher.connect();
```

### Disconnecting

To disconnect from the Pusher network, just call the `disconnect()` method.

```typescript
await pusher.disconnect();
```

### Reconnection

There are three main ways why a connection could be disconnected:

- The client explicitly calls disconnect and a close frame is sent over the websocket connection.
- The client experiences some form of network degradation which leads to a heartbeat (ping/pong) message being missed and thus the client disconnects.
- The Pusher server closes the websocket connection; typically this will only occur during a restart of the Pusher socket servers and almost immediatelly it will reconnect.

In the case of the first type of disconnection, the library will (as you would hope) not attempt to reconnect.

## Subscribing

### Public channels

The default method for subscribing to a channel involves invoking the `subscribe` method of your client object:

```typescript
const myChannel = await pusher.subscribe({channelName: "my-channel"});
```

### Private channels

Private channels are created in exactly the same way as public channels, except that they reside in the 'private-' namespace. This means prefixing the channel name:

```typescript
const myPrivateChannel = await pusher.subscribe({channelName: "private-my-channel"})
```

To subscribe to a private channel, the client needs to be authenticated. Refer to the [Configuration](#configuration) section for the authenticated channel example.

### Private encrypted channels

Similar to Private channels, you can also subscribe to a [private encrypted channel](https://pusher.com/docs/channels/using_channels/encrypted-channels). This library now fully supports end-to-end encryption. This means that only you and your connected clients will be able to read your messages. Pusher cannot decrypt them.

Like with private channels, you must provide an authentication endpoint. That endpoint must be using a [server client that supports end-to-end encryption](https://pusher.com/docs/channels/using_channels/encrypted-channels#server). There is a [demonstration endpoint to look at using nodejs](https://github.com/pusher/pusher-channels-auth-example#using-e2e-encryption).

The shared secret used to decrypt events is loaded from the same auth endpoint request that is used to authorize your subscription. There is also a mechanism for reloading the shared secret if your encryption master key changes. If an event is encountered that cannot be decrypted, a request is made to your auth endpoint to attempt to load the new shared secret. If that request fails or if the returned secret still cannot decrypt the event then that event will be skipped, the `onDecryptionFailure` callback function will be called, and the next received event will be processed.

#### Limitations

- Client events are not supported on encrypted channels

```typescript
const privateEncryptedChannel = await pusher.subscribe({channelName: "private-encrypted-my-channel"})
```

There is also an optional callback in the connection delegate when you can listen for
any failed decryption events:

```typescript
void onDecryptionFailure(event:string, reason:string)
```

### Presence channels

Presence channels are channels whose names are prefixed by `presence-`.

The resulting channel object has a member: `members` that contains the active members of the channel.

```typescript
const myPresenceChannel = await pusher.subscribe({channelName: "presence-my-channel"})
```

You can also provide functions that will be called when members are either added to or removed from the channel. These are available as parameters to `init()` globally, or to `subscribe()` per channel.

```typescript
void onMemberAdded(channelName:string, member:PusherMember) {
  console.log(`onMemberAdded: ${channelName} user: ${member}`);
}
```

```typescript
void onMemberRemoved(channelName:string, member:PusherMember) {
  console.log(`onMemberRemoved: ${channelName} user: ${member}`);
}
```

**Note**: The `members` property of `PusherChannel` objects will only be set once subscription to the channel has succeeded.

The easiest way to find out when a channel has been successfully subscribed to is to bind to the callback named `onSubscriptionSucceeded` on the channel you're interested in. It would look something like this:

```typescript
const pusher = Pusher.getInstance();
const channels = {};
await pusher.init({
  apiKey: API_KEY,
  cluster: API_CLUSTER,
  authEndPoint: "https://your-server.com/pusher/auth"
});
const myChannel = await pusher.subscribe(
  channelName:'presence-my-channel',
  onSubscriptionSucceeded: (channelName, data) => {
    console.log(`Subscribed to ${channelName}`);
    console.log(`I can now access me: ${myChannel.me}`)
    console.log(`And here are the channel members: ${myChannel.members}`)
  },
  onMemberAdded: (member) => {
    console.log(`Member added: ${member}`);
  },
  onMemberRemoved: (member) => {
    console.log(`Member removed: ${member}`);
  },
  onEvent: (event) => {
    console.log(`Event received: ${event}`);
  },
);
```

Note that both private and presence channels require the user to be authenticated to subscribe to the channel. This authentication can either happen inside the library if you configured your Pusher object with your app's secret, or an authentication request is made to an authentication endpoint that you provide, again when initializing your Pusher object.

We recommend that you use an authentication endpoint over including your app's secret in your app in the vast majority of use cases. If you are completely certain that there's no risk to you including your app's secret in your app. For example, if your app is just for internal use at your company, then it can make things easier than setting up an authentication endpoint.

### Unsubscribing

To unsubscribe from a channel, call the `unsubscribe()` method:

```typescript
await pusher.unsubscribe({channelName:"my-channel"});
```

## Binding to events

Events can be bound to at two levels; globally and per channel. There is an example of this below.

### Per-channel events

These are bound to a specific channel. You can reuse event names in different parts of your client application.

```typescript
const pusher = Pusher.getInstance();
await pusher.init({
  apiKey: API_KEY,
  cluster: API_CLUSTER
});
const myChannel = await pusher.subscribe({
  channelName: "my-channel",
  onEvent: (event) => {
    console.log(`Got channel event: ${event}`);
  }
});
await pusher.connect();
```

### Global events

You can attach behavior to these events regardless of the channel the event is broadcast to.

```typescript
const pusher = Pusher.getInstance();
await pusher.init({
  apiKey: API_KEY,
  cluster: API_CLUSTER,
  onEvent: (event) {
    console.log(`Got event: ${event}`);
  }
});
const myChannel = await pusher.subscribe({
  channelName: "my-channel"
});
```

### PusherEvent

The callbacks you bind receive a `PusherEvent`:

```typescript
class PusherEvent {
  channelName:string; // Name of the channel.
  eventName:string; // Name of the event.
  data:any; // Data, usually JSON string. See [parsing event data](#parsing-event-data).
  userId:string; // UserId of the sending event, only for client events on presence channels.
}
```

#### Parsing event data

The `data` property of [`PusherEvent`](#pusherevent) contains the string representation of the data that you passed when you triggered the event. If you passed an object then that object will have been serialized to JSON. You can parse that JSON as appropriate.

### Receiving errors

Errors received from Pusher Channels can be accessed via the `onError` callback.

```typescript
void onError(message:string, code:int, e:any) {
  console.log(`onError: ${message} code: ${code} exception: ${e}`);
}
```

## Triggering events

Once a [private](https://pusher.com/docs/channels/using_channels/private-channels) or [presence](https://pusher.com/docs/channels/using_channels/presence-channels) subscription has been authorized (see [authenticating users](https://pusher.com/docs/channels/server_api/authenticating-users)) and the subscription has succeeded, it is possible to trigger events on those channels. You can do this per channel, or
on the global `Pusher` instance.

```typescript
await myChannel.trigger({eventName: "client-my-event", data: {"myName": "Bob"}});
```

Or on the global pusher instance:

```typescript
await pusher.trigger({channelName: "my-channel", eventName: "client-my-event", data: {"myName": "Bob"}});
```

Events triggered by clients are called [client events](https://pusher.com/docs/channels/using_channels/events#triggering-client-events). Because they are being triggered from a client which may not be trusted, there are a number of enforced rules when using them. Some of these rules include:

- Event names must have a `client-` prefix
- Rate limits
- You can only trigger an event when the subscription has succeeded

For more details, refer to [client events](https://pusher.com/docs/channels/using_channels/events#triggering-client-events).

## Get a channel by name

To get the `PusherChannel` instance from the `Pusher` instance you can use the `getChannel(<channelName>)` method:

```typescript
const channel = pusher.getChannel("presence-channel");
```

## Socket information

To get information from the current socket call the `getSocketId()` method:

```typescript
const socketId = await pusher.getSocketId();
```

## Communication

- If you have found a bug, please open an issue.
- If you have a feature request, open an issue.
- If you want to contribute, submit a pull request.

## Credits

Pusher is owned and maintained by [Pusher](https://pusher.com).

## License

Pusher is released under the MIT license. Refer to [LICENSE](https://github.com/pusher/pusher-websocket-react-native/blob/master/LICENSE) for more details.
