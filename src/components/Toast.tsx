import React, {useState, useCallback, useRef, useEffect} from 'react';
import {Text, StyleSheet, View} from 'react-native';
import {Colors} from '../theme/colors';

type ToastType = 'success' | 'error' | 'info';
let showToastGlobal: (msg: string, type?: ToastType) => void = () => {};

export function useToast(): {showToast: (msg: string, type?: ToastType) => void} {
  return {showToast: showToastGlobal};
}

export default function Toast() {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<ToastType>('success');
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string, t: ToastType = 'success') => {
    setMsg(m); setType(t); setVisible(true);
    if (timeout.current !== null) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setVisible(false), 2800);
  }, []);

  useEffect(() => { showToastGlobal = show; }, [show]);

  const colors = {success: Colors.pulso, error: '#EF4444', info: '#60A5FA'};
  const icons = {success: '✓', error: '✕', info: 'ℹ'};

  if (!visible) return null;

  return (
    <View style={[s.container, {backgroundColor: colors[type] + '20', borderColor: colors[type]}]} pointerEvents="none">
      <Text style={[s.icon, {color: colors[type]}]}>{icons[type]}</Text>
      <Text style={[s.text, {color: colors[type]}]}>{msg}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {position: 'absolute', top: '75%', left: 24, right: 24, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, zIndex: 9999},
  icon: {fontSize: 18, fontWeight: '800'},
  text: {fontSize: 14, fontWeight: '600', flex: 1},
});
