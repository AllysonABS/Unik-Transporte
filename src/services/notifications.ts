import {Platform, PermissionsAndroid} from 'react-native';
import {getAuthToken} from './api';

const API_URL = 'https://transporte.unikcrm.com';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }
  const messaging = require('@react-native-firebase/messaging').default;
  const authStatus = await messaging().requestPermission();
  return authStatus === 1 || authStatus === 2;
}

export async function getFCMToken(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    return await messaging().getToken();
  } catch {
    return null;
  }
}

export async function registrarTokenEmpresa(empresaId: string, token: string): Promise<void> {
  try {
    const authToken = getAuthToken();
    await fetch(`${API_URL}/api/empresa/${empresaId}/fcm-token`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? {'Authorization': `Bearer ${authToken}`} : {}),
      },
      body: JSON.stringify({token}),
    });
  } catch {}
}

export async function registrarTokenCliente(clienteId: string, token: string): Promise<void> {
  try {
    const authToken = getAuthToken();
    await fetch(`${API_URL}/api/cliente/${clienteId}/fcm-token`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? {'Authorization': `Bearer ${authToken}`} : {}),
      },
      body: JSON.stringify({token}),
    });
  } catch {}
}

export function onForegroundMessage(callback: (msg: any) => void) {
  if (Platform.OS !== 'android') return () => {};
  const messaging = require('@react-native-firebase/messaging').default;
  return messaging().onMessage(callback);
}
