import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'com.uniktransporte';

export async function saveCredentials(username: string, password: string): Promise<void> {
  await Keychain.setGenericPassword(username, password, {service: SERVICE_NAME});
}

export async function getCredentials(): Promise<{username: string; password: string} | null> {
  const result = await Keychain.getGenericPassword({service: SERVICE_NAME});
  if (result) return {username: result.username, password: result.password};
  return null;
}

export async function clearCredentials(): Promise<void> {
  await Keychain.resetGenericPassword({service: SERVICE_NAME});
}
