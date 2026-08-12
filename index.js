/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

if (Platform.OS === 'android') {
  const messaging = require('@react-native-firebase/messaging').default;
  const notifee = require('@notifee/react-native').default;
  const { AndroidImportance } = require('@notifee/react-native');

  // Cria canal de notificação
  notifee.createChannel({
    id: 'default',
    name: 'Notificações',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
  });

  // Exibe notificação local quando recebe push em foreground
  messaging().onMessage(async (remoteMessage) => {
    await notifee.displayNotification({
      title: remoteMessage.notification?.title || 'Unik Logística',
      body: remoteMessage.notification?.body || '',
      android: {
        channelId: 'default',
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    });
  });

  // Handler para background (sistema já exibe automaticamente)
  messaging().setBackgroundMessageHandler(async () => {});
}

AppRegistry.registerComponent(appName, () => App);
