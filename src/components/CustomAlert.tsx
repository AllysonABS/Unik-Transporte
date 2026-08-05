import React, {useState, useCallback, useRef, createContext, useContext} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Modal} from 'react-native';
import {Colors} from '../theme/colors';

type AlertButton = {text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void};
type AlertType = 'info' | 'success' | 'error' | 'warning' | 'confirm';

type AlertConfig = {
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
};

type AlertContextType = {
  show: (config: AlertConfig) => void;
};

const AlertContext = createContext<AlertContextType>({show: () => {}});

export function useAlert() {
  return useContext(AlertContext);
}

const icons: Record<AlertType, string> = {
  info: 'ℹ️',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  confirm: '❓',
};

const iconBg: Record<AlertType, string> = {
  info: '#60A5FA20',
  success: Colors.pulso + '20',
  error: '#EF444420',
  warning: '#F59E0B20',
  confirm: '#60A5FA20',
};

export function AlertProvider({children}: {children: React.ReactNode}) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({title: ''});

  const show = useCallback((c: AlertConfig) => {
    setConfig(c);
    setVisible(true);
  }, []);

  const close = (onPress?: () => void) => {
    setVisible(false);
    setTimeout(() => { if (onPress) onPress(); }, 200);
  };

  const type = config.type || 'info';
  const buttons = config.buttons || [{text: 'OK', style: 'default'}];

  return (
    <AlertContext.Provider value={{show}}>
      {children}
      <Modal visible={visible} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.card}>
            <View style={[s.iconWrap, {backgroundColor: iconBg[type]}]}>
              <Text style={s.icon}>{icons[type]}</Text>
            </View>
            <Text style={s.title}>{config.title}</Text>
            {config.message ? <Text style={s.message}>{config.message}</Text> : null}
            <View style={[s.btns, buttons.length === 1 && {justifyContent: 'center'}]}>
              {buttons.map((btn, i) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      s.btn,
                      buttons.length > 1 && {flex: 1},
                      isDestructive && s.btnDanger,
                      isCancel && s.btnCancel,
                      !isDestructive && !isCancel && s.btnPrimary,
                    ]}
                    onPress={() => close(btn.onPress)}>
                    <Text style={[
                      s.btnText,
                      isDestructive && s.btnDangerText,
                      isCancel && s.btnCancelText,
                      !isDestructive && !isCancel && s.btnPrimaryText,
                    ]}>{btn.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const s = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center'},
  card: {backgroundColor: '#081544', borderRadius: 20, padding: 28, marginHorizontal: 32, alignItems: 'center', width: '85%', maxWidth: 340},
  iconWrap: {width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16},
  icon: {fontSize: 28},
  title: {fontSize: 20, fontWeight: '700', color: Colors.clareza, marginBottom: 8, textAlign: 'center'},
  message: {fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 20, marginBottom: 24},
  btns: {flexDirection: 'row', gap: 12, width: '100%'},
  btn: {height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minWidth: 100},
  btnPrimary: {backgroundColor: Colors.pulso},
  btnPrimaryText: {color: Colors.clareza, fontWeight: '700', fontSize: 15},
  btnCancel: {backgroundColor: '#081544', borderWidth: 1, borderColor: '#0B1E5A'},
  btnCancelText: {color: Colors.clareza, fontWeight: '600', fontSize: 15},
  btnDanger: {backgroundColor: '#EF4444'},
  btnDangerText: {color: '#FFF', fontWeight: '700', fontSize: 15},
  btnText: {fontWeight: '600', fontSize: 15},
});
