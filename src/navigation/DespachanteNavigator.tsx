import React, {useEffect} from 'react';
import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';
import {NavigatorScreenParams} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createMaterialTopTabNavigator, MaterialTopTabBarProps} from '@react-navigation/material-top-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../theme/colors';
import Icon from '../components/Icon';
import FilaScreen from '../screens/despachante/FilaScreen';
import EmAndamentoScreen from '../screens/despachante/EmAndamentoScreen';
import HistoricoScreen from '../screens/despachante/HistoricoScreen';
import ChecklistScreen from '../screens/despachante/ChecklistScreen';
import {startSyncListener, stopSyncListener} from '../services/syncManager';
import {useLogout} from '../hooks/useLogout';

export type DespachanteTabParamList = {
  Fila: undefined;
  'Em Andamento': undefined;
  Histórico: undefined;
};

export type DespachanteStackParamList = {
  Tabs: NavigatorScreenParams<DespachanteTabParamList> | undefined;
  Checklist: {pedidoId: string; etapa: 'coleta' | 'entrega'; volumes?: number};
};

const Stack = createNativeStackNavigator<DespachanteStackParamList>();
const Tab = createMaterialTopTabNavigator<DespachanteTabParamList>();

const iconMap: Record<string, string> = {
  Fila: 'clipboard',
  'Em Andamento': 'navigation',
  Histórico: 'check-circle',
};

function DespaTabBar({state, descriptors, navigation}: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const logout = useLogout();

  return (
    <View style={[tb.bar, {height: 60 + insets.bottom, paddingBottom: insets.bottom + 4}]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true});
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <TouchableOpacity key={route.key} style={tb.tab} onPress={onPress} activeOpacity={0.7}>
            {isFocused && <View style={tb.indicator} />}
            <Icon name={iconMap[route.name]} size={20} color={isFocused ? Colors.pulso : '#4B6070'} />
            <Text style={[tb.label, {color: isFocused ? Colors.pulso : '#4B6070'}]}>{route.name}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={tb.tab} onPress={logout} activeOpacity={0.7}>
        <Icon name="log-out" size={20} color="#4B6070" />
        <Text style={[tb.label, {color: '#4B6070'}]}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const tb = StyleSheet.create({
  bar:       {flexDirection: 'row', backgroundColor: '#0A1820', borderTopWidth: 1, borderTopColor: '#1E3448'},
  tab:       {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative'},
  indicator: {position: 'absolute', top: 0, left: 8, right: 8, height: 3, backgroundColor: Colors.pulso, borderRadius: 2},
  label:     {fontSize: 11, fontWeight: '600'},
});

function Tabs() {
  return (
    <Tab.Navigator
      id="despachanteTab"
      tabBar={(props) => <DespaTabBar {...props} />}
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
      }}>
      <Tab.Screen name="Fila" component={FilaScreen} />
      <Tab.Screen name="Em Andamento" component={EmAndamentoScreen} />
      <Tab.Screen name="Histórico" component={HistoricoScreen} />
    </Tab.Navigator>
  );
}

export default function DespachanteNavigator() {
  useEffect(() => {
    startSyncListener();
    return () => stopSyncListener();
  }, []);

  return (
    <Stack.Navigator id="despachanteStack" screenOptions={{headerShown: false}}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen
        name="Checklist"
        component={ChecklistScreen}
        options={{presentation: 'modal'}}
      />
    </Stack.Navigator>
  );
}
