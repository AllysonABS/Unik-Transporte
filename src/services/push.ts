import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid} from 'react-native';
import {salvarFcmToken, removerFcmToken} from './api';
import {navegarParaEntregador} from '../navigation/navigationRef';

// Android 13+ (SDK 33+) exige permissão em runtime pra mostrar notificação,
// além da permissão do próprio FCM/Firebase. iOS pede via
// messaging().requestPermission() mesmo.
async function solicitarPermissao(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

// Pede permissão, pega o token FCM do aparelho e salva no backend. Chamado
// sempre que o entregador entra no app autenticado (login novo ou sessão
// salva) — se o token já estiver salvo, o backend só atualiza o
// `atualizado_em` (ON CONFLICT), sem duplicar.
export async function registrarPushToken(entregadorId: string): Promise<void> {
  try {
    const permitido = await solicitarPermissao();
    if (!permitido) return;
    const token = await messaging().getToken();
    if (token) await salvarFcmToken(entregadorId, token);
  } catch (err) {
    console.warn('Erro ao registrar token de push:', err);
  }
}

// O Firebase pode rotacionar o token a qualquer momento (reinstalação,
// limpeza de dados, etc.) — sem isso o token antigo salvo no banco vira
// lixo e o entregador para de receber push sem avisar ninguém.
export function ouvirRenovacaoToken(entregadorId: string): () => void {
  return messaging().onTokenRefresh(async novoToken => {
    await salvarFcmToken(entregadorId, novoToken).catch(() => {});
  });
}

// Chamado no logout — evita continuar mandando push pra um aparelho onde o
// entregador já saiu da conta.
export async function desregistrarPushToken(entregadorId: string): Promise<void> {
  try {
    const token = await messaging().getToken();
    if (token) await removerFcmToken(entregadorId, token);
  } catch (err) {
    console.warn('Erro ao remover token de push:', err);
  }
}

// Ao tocar numa notificação (app em background ou fechado), leva o
// entregador direto pra tela principal. Retorna uma função de cleanup.
export function ouvirToqueNotificacao(): () => void {
  const unsubscribe = messaging().onNotificationOpenedApp(() => {
    navegarParaEntregador();
  });

  // App aberto a partir de uma notificação com o app totalmente fechado
  // (cold start) — precisa ser checado manualmente, o listener acima só
  // cobre background.
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) navegarParaEntregador();
    });

  return unsubscribe;
}
