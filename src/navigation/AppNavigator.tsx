import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Colors} from '../theme/colors';
import {navigationRef} from './navigationRef';

import LoginScreen from '../screens/auth/LoginScreen';
import EsqueceuSenhaScreen from '../screens/auth/EsqueceuSenhaScreen';
import CadastroEntregadorScreen from '../screens/auth/CadastroEntregadorScreen';
import EntregadorNavigator from './EntregadorNavigator';

export type RootStackParamList = {
  Login: undefined;
  CadastroEntregador: undefined;
  EsqueceuSenha: undefined;
  Entregador: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        id="root"
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          contentStyle: {backgroundColor: Colors.matriz},
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="Login"       component={LoginScreen} />
        <Stack.Screen name="EsqueceuSenha" component={EsqueceuSenhaScreen} />
        <Stack.Screen name="CadastroEntregador" component={CadastroEntregadorScreen} />
        <Stack.Screen name="Entregador" component={EntregadorNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
