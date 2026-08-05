import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, SafeAreaView} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {Colors} from '../../theme/colors';
import Icon from '../../components/Icon';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoleSelect'>;
};

const roles = [
  {
    key: 'Empresa',
    label: 'Empresa',
    description: 'Gestão completa de clientes, despachantes e excursões',
    icon: 'briefcase',
  },
  {
    key: 'Cliente',
    label: 'Cliente',
    description: 'Acompanhamento de pedidos em tempo real',
    icon: 'package',
  },
  {
    key: 'Despachante',
    label: 'Despachante',
    description: 'Expedição e entrega de mercadorias',
    icon: 'truck',
  },
] as const;

export default function RoleSelectScreen({navigation}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.title}>Selecionar Perfil</Text>
          <Text style={styles.subtitle}>Modo de desenvolvimento</Text>
        </View>

        <View style={styles.list}>
          {roles.map(role => (
            <TouchableOpacity
              key={role.key}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation.replace(role.key as any)}>
              <Icon name={role.icon} size={24} color={Colors.pulso} />
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{role.label}</Text>
                <Text style={styles.cardDesc}>{role.description}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.matriz},
  inner: {flex: 1, paddingHorizontal: 24, paddingTop: 40},
  header: {marginBottom: 40},
  title: {fontSize: 26, fontWeight: '700', color: Colors.clareza},
  subtitle: {
    fontSize: 13,
    color: Colors.pulso,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  list: {gap: 14},
  card: {
    backgroundColor: '#102255',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#1E3A6B',
  },
  icon: {fontSize: 28},
  cardText: {flex: 1},
  cardLabel: {fontSize: 17, fontWeight: '700', color: Colors.clareza},
  cardDesc: {fontSize: 13, color: Colors.gray, marginTop: 3},
  arrow: {fontSize: 24, color: Colors.pulso, fontWeight: '300'},
});
