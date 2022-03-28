import { NativeModules, Platform } from 'react-native';

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

export function multiply(a: number, b: number): Promise<number> {
  return PusherWebsocketReactNative.multiply(a, b);
}
