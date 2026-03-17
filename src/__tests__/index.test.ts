// jest.mock is hoisted above all imports and variable declarations, so mock
// functions must be defined inside the factory. Access them afterwards via
// jest.requireMock().

jest.mock('react-native', () => {
  const fn = jest.fn;
  const nativeModule = {
    initialize: fn(),
    connect: fn(),
    disconnect: fn(),
    subscribe: fn(),
    unsubscribe: fn(),
    trigger: fn().mockResolvedValue(undefined),
    getSocketId: fn(),
    onAuthorizer: fn(),
  };
  const eventEmitter = {
    addListener: fn(),
    removeAllListeners: fn(),
  };
  return {
    NativeModules: {
      PusherWebsocketReactNative: nativeModule,
    },
    NativeEventEmitter: fn().mockImplementation(() => eventEmitter),
    Platform: {
      select: fn(({ default: def }: any) => def),
      OS: 'ios',
    },
    __nativeModule: nativeModule,
    __eventEmitter: eventEmitter,
  };
});

import { PusherChannel, PusherEvent, Pusher } from '../index';

const RN = jest.requireMock('react-native');
const mockNativeModule = RN.__nativeModule;
const mockEventEmitter = RN.__eventEmitter;

beforeEach(() => {
  (Pusher as any).instance = undefined;
  mockNativeModule.trigger.mockClear();
  mockEventEmitter.removeAllListeners.mockClear();
  mockEventEmitter.addListener.mockClear();
});

// ─────────────────────────────────────────────
// PusherChannel.trigger()
// ─────────────────────────────────────────────

describe('PusherChannel.trigger()', () => {
  it('throws when channelName is provided but does not match the channel', async () => {
    const channel = new PusherChannel({ channelName: 'private-my-channel' });
    const event = new PusherEvent({
      channelName: 'private-other-channel',
      eventName: 'client-event',
      data: '{}',
    });
    await expect(channel.trigger(event)).rejects.toBe(
      'Event is not for this channel'
    );
  });

  it('passes when channelName is provided and matches the channel', async () => {
    const channel = new PusherChannel({ channelName: 'private-my-channel' });
    const event = new PusherEvent({
      channelName: 'private-my-channel',
      eventName: 'client-event',
      data: '{}',
    });
    await expect(channel.trigger(event)).resolves.not.toThrow();
    expect(mockNativeModule.trigger).toHaveBeenCalled();
  });

  it('defaults channelName to the channel name when omitted', async () => {
    const channel = new PusherChannel({ channelName: 'private-my-channel' });
    // Omit channelName as the README documents
    const event = { eventName: 'client-event', data: '{}' } as PusherEvent;
    await expect(channel.trigger(event)).resolves.not.toThrow();
    expect(mockNativeModule.trigger).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// Pusher.removeAllListeners() via reset() and init()
// ─────────────────────────────────────────────

describe('Pusher.removeAllListeners()', () => {
  const expectedEventNames = [
    'PusherReactNative:onAuthorizer',
    'PusherReactNative:onError',
    'PusherReactNative:onEvent',
    'PusherReactNative:onMemberAdded',
    'PusherReactNative:onMemberRemoved',
    'PusherReactNative:onConnectionStateChange',
    'PusherReactNative:onSubscriptionError',
  ];

  it('removes all 7 event listeners when reset() is called', async () => {
    await Pusher.getInstance().reset();
    const removedEvents = mockEventEmitter.removeAllListeners.mock.calls.map(
      (call: any[]) => call[0]
    );
    expectedEventNames.forEach((eventName) => {
      expect(removedEvents).toContain(eventName);
    });
  });

  it('removes all 7 event listeners when init() is called', () => {
    Pusher.getInstance().init({ apiKey: 'test-key', cluster: 'mt1' });
    const removedEvents = mockEventEmitter.removeAllListeners.mock.calls.map(
      (call: any[]) => call[0]
    );
    expectedEventNames.forEach((eventName) => {
      expect(removedEvents).toContain(eventName);
    });
  });
});
