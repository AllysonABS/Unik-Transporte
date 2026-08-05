import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@offline_queue';
const CACHE_KEY = '@pedidos_cache';

export type OfflineAction = {
  id: string;
  type: 'concluir_etapa' | 'upload_foto' | 'atualizar_status' | 'salvar_observacao';
  payload: any;
  createdAt: number;
};

// === FILA DE OPERAÇÕES ===

export async function getQueue(): Promise<OfflineAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addToQueue(action: Omit<OfflineAction, 'id' | 'createdAt'>): Promise<void> {
  const queue = await getQueue();
  queue.push({...action, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), createdAt: Date.now()});
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter(a => a.id !== id)));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

// === CACHE DE PEDIDOS ===

export async function cachePedidos(entregadorId: string, pedidos: any[]): Promise<void> {
  await AsyncStorage.setItem(`${CACHE_KEY}_${entregadorId}`, JSON.stringify(pedidos));
}

export async function getCachedPedidos(entregadorId: string): Promise<any[] | null> {
  const raw = await AsyncStorage.getItem(`${CACHE_KEY}_${entregadorId}`);
  return raw ? JSON.parse(raw) : null;
}
