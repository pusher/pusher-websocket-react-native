# Changelog

## 1.3.1

* [CHANGED] Update Pusher Swift SDK to 10.1.5

## 1.3.0

* [ADDED] Add `reset` function to `Pusher` instance to reset all handlers and subscriptions (#110)
* [FIXED] Multiple listeners are registered whenever `init function is called

## 1.2.3

* [FIXED] Handle exceptions properly while subscribing to a channel on Android (#104)

## 1.2.2

* [FIXED] Crash when a user subscribes to a channel twice on Android
* [FIXED] Wait for unsubscription before deleting the local channel (#88)

## 1.2.1

* [FIXED] Fixed event name conflicts with other libs using RCTDeviceEventEmitter

## 1.2.0

* [CHANGED] Remove mutex locks in favor of storing callbacks so onAuthorizer does no longer freeze the app on iOS

## 1.1.1

* [CHANGED] Allow re-init of the Pusher singleton.
* [CHANGED] Update dependencies

## 1.1.0

* [CHANGED] Add support for the new subscription_count event
* [CHANGED] Using latest pusher-websocket-java and pusher-websocket-swift

## 1.0.2

* [CHANGED] Use latest pusher websocket java sdk.
* [ADDED] Example to use a custom authorizer.

## 1.0.1

* [ADDED] Add onAuthorizer support to iOS

## 1.0.0

* [CHANGED] Removed unsupported functions from README
* [FIXED] Fixed build error on Example app
* [FIXED] Fixed CHANGELOG error on release workflow

## 1.0.0-beta1

* [FIXED] Fixed required dependencies on README
* [ADDED] Add Lint support for Pull Requests
* [CHANGED] Executed Lint on Example app

## 0.0.1-beta1

* [ADDED] First beta release 🥳
