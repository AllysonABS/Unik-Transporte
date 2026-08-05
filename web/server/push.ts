// Push notifications pro app do entregador (Firebase Cloud Messaging).
//
// Só dispara quando um pedido novo é atribuído a um entregador — ele passa
// boa parte do tempo fora do escritório dirigindo, então depender só do
// polling de 15s no app (que só funciona com o app aberto) não é
// suficiente pra avisar de verdade.
//
// Cada entregador pode ter mais de um token salvo (mais de um aparelho, ou
// reinstalou o app) — manda pra todos e limpa do banco qualquer token que o
// Firebase reportar como não registrado mais (desinstalou o app, etc.).

import { Pool } from 'pg';
import admin from 'firebase-admin';

export function pushConfigurado(): boolean {
  return admin.apps.length > 0;
}

export async function salvarTokenEntregador(pool: Pool, entregadorId: string, token: string): Promise<void> {
  await pool.query(
    `INSERT INTO entregador_fcm_tokens (entregador_id, token) VALUES ($1, $2)
     ON CONFLICT (entregador_id, token) DO UPDATE SET atualizado_em = NOW()`,
    [entregadorId, token]
  );
}

export async function removerTokenEntregador(pool: Pool, entregadorId: string, token: string): Promise<void> {
  await pool.query('DELETE FROM entregador_fcm_tokens WHERE entregador_id=$1 AND token=$2', [entregadorId, token]);
}

export async function enviarPushEntregador(
  pool: Pool,
  entregadorId: string,
  titulo: string,
  corpo: string,
  dados: Record<string, string> = {}
): Promise<void> {
  if (!pushConfigurado()) return;

  const tokensRes = await pool.query('SELECT token FROM entregador_fcm_tokens WHERE entregador_id=$1', [entregadorId]);
  const tokens: string[] = tokensRes.rows.map(r => r.token);
  if (tokens.length === 0) return;

  try {
    const resposta = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: titulo, body: corpo },
      data: dados,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    const tokensInvalidos: string[] = [];
    resposta.responses.forEach((r, i) => {
      if (r.success) return;
      const codigo = r.error?.code;
      // "not-registered"/"invalid-registration-token" são o caso normal
      // (desinstalou o app, token expirou); "invalid-argument" é um token
      // malformado que nunca vai funcionar — mesmo destino, limpa do banco.
      if (
        codigo === 'messaging/registration-token-not-registered' ||
        codigo === 'messaging/invalid-registration-token' ||
        codigo === 'messaging/invalid-argument'
      ) {
        tokensInvalidos.push(tokens[i]);
      } else {
        console.error(`Erro ao enviar push pro entregador ${entregadorId} (${codigo}):`, r.error?.message);
      }
    });
    if (tokensInvalidos.length > 0) {
      await pool.query('DELETE FROM entregador_fcm_tokens WHERE entregador_id=$1 AND token = ANY($2)', [entregadorId, tokensInvalidos]);
    }
  } catch (err: any) {
    // Push é um "extra" — nunca deve derrubar a criação do pedido em si.
    console.error(`Erro ao enviar push multicast pro entregador ${entregadorId}:`, err.message);
  }
}
