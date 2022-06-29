import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TextInput,
  Button,
  Image,
  ScrollView,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Pusher,
  PusherMember,
  PusherChannel,
  PusherEvent
} from 'pusher-websocket-react-native';

export default function App() {
  let logLines: string[] = [];
  const pusher = Pusher.getInstance();

  const [apiKey, onChangeApiKey] = React.useState('');
  const [cluster, onChangeCluster] = React.useState('');
  const [channelName, onChangeChannelName] = React.useState('');
  const [eventName, onChangeEventName] = React.useState('');
  const [eventData, onChangeEventData] = React.useState('');
  const [members, onChangeMembers] = React.useState(new Array<PusherMember>());
  const [logText, setLog] = React.useState('');

  const log = async (line: string) => {
    logLines.push(line);
    setLog(logLines.join('\n'));
  };

  React.useEffect(() => {
    const getFromStorage = async () => {
      onChangeApiKey((await AsyncStorage.getItem('APIKEY')) || '');
      onChangeCluster((await AsyncStorage.getItem('CLUSTER')) || '');
      onChangeChannelName((await AsyncStorage.getItem('CHANNEL')) || '');
      onChangeEventName((await AsyncStorage.getItem('EVENT')) || '');
      onChangeEventData((await AsyncStorage.getItem('DATA')) || '');
    };
    getFromStorage().catch((e) => log('ERROR: ' + e));
  }, []);

  const connect = async () => {
    try {
      await AsyncStorage.multiSet([
        ['APIKEY', apiKey],
        ['CLUSTER', cluster],
        ['CHANNEL', channelName],
      ]);

      await pusher.init({
        apiKey,
        cluster,
        authEndpoint: '<YOUR ENDPOINT URI>',
        onConnectionStateChange,
        onError,
        onEvent,
        onSubscriptionSucceeded,
        onSubscriptionError,
        onDecryptionFailure,
        onMemberAdded,
        onMemberRemoved,
        // onAuthorizer,
      });

      await pusher.connect();
      await pusher.subscribe({ channelName });
    } catch (e) {
      log('ERROR: ' + e);
    }
  };

  const onConnectionStateChange = (
    currentState: string,
    previousState: string
  ) => {
    log(`onConnectionStateChange. previousState=${previousState} newState=${currentState}`);
  };

  const onError = (message: string, code: Number, error: any) => {
    log(`onError: ${message} code: ${code} exception: ${error}`);
  };

  const onEvent = (event: any) => {
    log(`onEvent: ${event}`);
  };

  const onSubscriptionSucceeded = (channelName: string, data: any) => {
    log(
      `onSubscriptionSucceeded: ${channelName} data: ${JSON.stringify(data)}`
    );
    const channel: PusherChannel = pusher.getChannel(channelName);
    const me = channel.me;
    onChangeMembers([...channel.members.values()]);
    log(`Me: ${me}`);
  };

  const onSubscriptionError = (channelName: string, message: string, e: any) => {
    log(`onSubscriptionError: ${message}, channelName: ${channelName} e: ${e}`);
  };

  const onDecryptionFailure = (eventName: string, reason: string) => {
    log(`onDecryptionFailure: ${eventName} reason: ${reason}`);
  };

  const onMemberAdded = (channelName: string, member: PusherMember) => {
    log(`onMemberAdded: ${channelName} user: ${member}`);
    const channel: PusherChannel = pusher.getChannel(channelName);
    onChangeMembers([...channel.members.values()]);
  };

  const onMemberRemoved = (channelName: string, member: PusherMember) => {
    log(`onMemberRemoved: ${channelName} user: ${member}`);
    const channel: PusherChannel = pusher.getChannel(channelName);
    onChangeMembers([...channel.members.values()]);
  };

  const trigger = async () => {
    try {
      await AsyncStorage.multiSet([
        ['EVENT', eventName],
        ['DATA', eventData],
      ]);

      await pusher.trigger(
        new PusherEvent({ channelName, eventName, data: eventData })
      );
    } catch (e) {
      log('ERROR: ' + e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image style={styles.image} source={require('./pusher.png')} />
      <View>
        <Text>
          {pusher.connectionState === 'DISCONNECTED'
            ? 'Pusher Channels React Native Example'
            : channelName}
        </Text>
      </View>
      {pusher.connectionState !== 'CONNECTED' ? (
        <>
          <TextInput
            style={styles.input}
            onChangeText={onChangeApiKey}
            placeholder="API Key"
            autoCapitalize="none"
            value={apiKey}
          />
          <TextInput
            style={styles.input}
            onChangeText={onChangeCluster}
            value={cluster}
            placeholder="Cluster"
            autoCapitalize="none"
            keyboardType="default"
          />
          <TextInput
            style={styles.input}
            onChangeText={onChangeChannelName}
            value={channelName}
            placeholder="Channel"
            autoCapitalize="none"
            keyboardType="default"
          />
          <Button
            title="Connect"
            onPress={connect}
            disabled={!Boolean(apiKey && cluster && channelName)}
          />
        </>
      ) : (
        <>
          <FlatList
            style={styles.list}
            data={members}
            renderItem={({ item }) => (
              <Text style={styles.listItem}>
                {JSON.stringify(item.userInfo)} {item.userId}
              </Text>
            )}
          />
          <TextInput
            style={styles.input}
            onChangeText={onChangeEventName}
            value={eventName}
            placeholder="Event"
            autoCapitalize="none"
            keyboardType="default"
          />
          <TextInput
            style={styles.input}
            onChangeText={onChangeEventData}
            value={eventData}
            placeholder="Data"
            autoCapitalize="none"
            keyboardType="default"
          />
          <Button
            title="Trigger Event"
            onPress={trigger}
            disabled={!Boolean(eventName)}
          />
        </>
      )}
      <ScrollView>
        <Text>{logText}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 10,
  },
  image: {},
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
  input: {
    height: 40,
    marginVertical: 12,
    borderWidth: 1,
    padding: 10,
  },
  list: {
    height: 100,
    borderWidth: 1,
    flexGrow: 0,
  },
  listItem: {
    borderWidth: 1,
  },
});
