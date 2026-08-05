import React from 'react';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../theme/colors';
import Icon from '../components/Icon';
import EmpresaDashboard from '../screens/empresa/EmpresaDashboard';
import PedidosScreen from '../screens/empresa/PedidosScreen';
import ClientesScreen from '../screens/empresa/ClientesScreen';
import MaisScreen from '../screens/empresa/MaisScreen';
import DespachantesScreen from '../screens/empresa/DespachantesScreen';
import ExcursoesScreen from '../screens/empresa/ExcursoesScreen';
import RelatoriosScreen from '../screens/empresa/RelatoriosScreen';
import ConfiguracoesScreen from '../screens/empresa/ConfiguracoesScreen';
import NotificacoesScreen from '../screens/empresa/NotificacoesScreen';

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

const iconMap: Record<string, string> = {
  Dashboard: 'home',
  Pedidos: 'package',
  Clientes: 'users',
  Mais: 'menu',
};

function EmpresaTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      id="empresaTab"
      tabBarPosition="bottom"
      screenOptions={({route}) => ({
        tabBarIcon: ({focused}) => (
          <Icon name={iconMap[route.name]} size={20} color={focused ? Colors.pulso : '#4B6070'} />
        ),
        tabBarShowIcon: true,
        tabBarActiveTintColor: Colors.pulso,
        tabBarInactiveTintColor: '#4B6070',
        tabBarStyle: {
          backgroundColor: '#02081F',
          borderTopColor: '#1E3A6B',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
        },
        tabBarLabelStyle: {fontSize: 11, fontWeight: '600', textTransform: 'none'},
        tabBarIndicatorStyle: {backgroundColor: Colors.pulso, top: 0, height: 3, borderRadius: 2},
        tabBarPressColor: 'transparent',
        swipeEnabled: true,
        animationEnabled: true,
      })}>
      <Tab.Screen name="Dashboard" component={EmpresaDashboard} />
      <Tab.Screen name="Pedidos" component={PedidosScreen} />
      <Tab.Screen name="Clientes" component={ClientesScreen} />
      <Tab.Screen name="Mais" component={MaisScreen} />
    </Tab.Navigator>
  );
}

export default function EmpresaNavigator() {
  return (
    <Stack.Navigator
      id="empresaStack"
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: Colors.matriz},
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="EmpresaTabs" component={EmpresaTabs} />
      <Stack.Screen name="Despachantes" component={DespachantesScreen} />
      <Stack.Screen name="Excursões" component={ExcursoesScreen} />
      <Stack.Screen name="Relatórios" component={RelatoriosScreen} />
      <Stack.Screen name="Configurações" component={ConfiguracoesScreen} />
      <Stack.Screen name="Notificações" component={NotificacoesScreen} />
    </Stack.Navigator>
  );
}
