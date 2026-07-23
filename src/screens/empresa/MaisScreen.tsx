import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import Icon from '../../components/Icon';
import {useLogout} from '../../hooks/useLogout';

const itens = [
  {label: 'Despachantes', subtitle: 'Gerencie sua equipe de entrega', icon: 'truck', color: '#60A5FA', route: 'Despachantes'},
  {label: 'Excursões', subtitle: 'Rotas e viagens cadastradas', icon: 'map', color: '#F59E0B', route: 'Excursões'},
  {label: 'Relatórios', subtitle: 'Análises e desempenho', icon: 'bar-chart-2', color: Colors.pulso, route: 'Relatórios'},
  {label: 'Configurações', subtitle: 'Preferências e conta', icon: 'settings', color: '#C084FC', route: 'Configurações'},
];

export default function MaisScreen() {
  const navigation = useNavigation<any>();
  const logout = useLogout();

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title} accessibilityRole="header">Mais</Text>
        <Text style={s.subtitle}>Gerencie sua operação</Text>
      </View>

      <View style={s.listShadow}>
        <View style={s.list}>
          {itens.map((item, index) => (
            <TouchableOpacity
              key={item.route}
              style={[s.row, index < itens.length - 1 && s.rowDivider]}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.65}
              accessibilityRole="button"
              accessibilityLabel={`Ir para ${item.label}`}>
              <View style={[s.iconWrap, {backgroundColor: item.color + '1F', borderColor: item.color + '38'}]}>
                <Icon name={item.icon} size={21} color={item.color} />
              </View>
              <View style={s.rowText}>
                <Text style={s.label}>{item.label}</Text>
                <Text style={s.rowSubtitle}>{item.subtitle}</Text>
              </View>
              <Icon name="chevron-right" size={21} color="rgba(234,235,235,0.22)" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={s.exitBtn}
        onPress={logout}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Sair da conta">
        <View style={s.exitIconWrap}>
          <Icon name="log-out" size={21} color="#EF4444" />
        </View>
        <Text style={s.exitText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:   {flex: 1, backgroundColor: Colors.matriz, padding: 24, paddingTop: 56},
  header:      {marginBottom: 28},
  title:       {fontSize: 26, fontWeight: '800', color: Colors.clareza, letterSpacing: -0.5},
  subtitle:    {fontSize: 13, color: Colors.gray, marginTop: 4, fontWeight: '500'},
  listShadow:  {borderRadius: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6},
  list:        {backgroundColor: '#131F2D', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(234,235,235,0.07)', overflow: 'hidden'},
  row:         {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14},
  rowDivider:  {borderBottomWidth: 1, borderBottomColor: 'rgba(234,235,235,0.06)'},
  iconWrap:    {width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1},
  rowText:     {flex: 1},
  label:       {fontSize: 15, fontWeight: '700', color: Colors.clareza},
  rowSubtitle: {fontSize: 12, color: Colors.gray, marginTop: 2, fontWeight: '500'},
  exitBtn:     {flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24, paddingHorizontal: 18, paddingVertical: 16, backgroundColor: '#131F2D', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4},
  exitIconWrap:{width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.28)'},
  exitText:    {fontSize: 15, fontWeight: '700', color: '#EF4444'},
});
