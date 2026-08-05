import React, {useState, useCallback, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import {useAuth} from '../../context/AuthContext';
import {
  listarEmpresasEntregador,
  desvincularEmpresa,
  atualizarEntregador,
  EmpresaVinculada,
} from '../../services/api';
import {useAlert} from '../../components/CustomAlert';
import {useLogout} from '../../hooks/useLogout';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import {SkeletonCard} from '../../components/Skeleton';
import {hapticLight, hapticSuccess, hapticError} from '../../utils/haptics';

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export default function PerfilScreen() {
  const {entregador, setEntregador} = useAuth();
  const {show} = useAlert();
  const logout = useLogout();

  const [empresas, setEmpresas] = useState<EmpresaVinculada[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [desvinculandoId, setDesvinculandoId] = useState<string | null>(null);

  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(entregador?.nome ?? '');
  const [telefone, setTelefone] = useState(entregador?.telefone ?? '');
  const [salvando, setSalvando] = useState(false);

  const jaCarregou = useRef(false);

  const carregar = useCallback(async () => {
    if (!entregador?.id) return;
    const res = await listarEmpresasEntregador(entregador.id);
    if (res.success && res.empresas) setEmpresas(res.empresas);
  }, [entregador?.id]);

  useFocusEffect(useCallback(() => {
    if (!jaCarregou.current) {
      setLoading(true);
      carregar().finally(() => { setLoading(false); jaCarregou.current = true; });
    } else {
      carregar();
    }
  }, [carregar]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregar().finally(() => setRefreshing(false));
  }, [carregar]);

  const cancelarEdicao = () => {
    setNome(entregador?.nome ?? '');
    setTelefone(entregador?.telefone ?? '');
    setEditando(false);
  };

  const salvarPerfil = async () => {
    if (!entregador?.id) return;
    if (!nome.trim()) {
      show({title: 'Atenção', message: 'O nome não pode ficar em branco.', type: 'warning'});
      return;
    }
    setSalvando(true);
    const res = await atualizarEntregador(entregador.id, {nome: nome.trim(), telefone: telefone.trim() || undefined});
    setSalvando(false);
    if (res.success) {
      hapticSuccess();
      setEntregador({...entregador, nome: nome.trim(), telefone: telefone.trim()});
      setEditando(false);
    } else {
      hapticError();
      show({title: 'Erro', message: res.error || 'Não foi possível salvar.', type: 'error'});
    }
  };

  const confirmarDesvincular = (emp: EmpresaVinculada) => {
    hapticLight();
    show({
      title: 'Desvincular empresa',
      message: `Você vai parar de atender pedidos de ${emp.nome_empresa}. Essa ação não afeta entregas já feitas. Tem certeza?`,
      type: 'confirm',
      buttons: [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Desvincular', style: 'destructive', onPress: () => executarDesvincular(emp)},
      ],
    });
  };

  const executarDesvincular = async (emp: EmpresaVinculada) => {
    if (!entregador?.id) return;
    setDesvinculandoId(emp.id);
    const res = await desvincularEmpresa(entregador.id, emp.id);
    setDesvinculandoId(null);
    if (res.success) {
      hapticSuccess();
      setEmpresas(prev => prev.filter(e => e.id !== emp.id));
    } else {
      hapticError();
      show({title: 'Não foi possível desvincular', message: res.error || 'Tente novamente.', type: 'error'});
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title} accessibilityRole="header">Perfil</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{padding: 24, paddingTop: 0, gap: 10}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pulso} />}
      >
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardTitle}>Meus dados</Text>
            {!editando && (
              <TouchableOpacity
                onPress={() => setEditando(true)}
                accessibilityRole="button"
                accessibilityLabel="Editar meus dados"
                style={s.editBtn}>
                <Icon name="edit-2" size={13} color={Colors.pulso} />
                <Text style={s.editBtnText}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          {editando ? (
            <>
              <View style={s.inputWrapper}>
                <Text style={s.label}>Nome</Text>
                <TextInput style={s.input} value={nome} onChangeText={setNome} placeholderTextColor={Colors.gray} accessibilityLabel="Nome" />
              </View>
              <View style={s.inputWrapper}>
                <Text style={s.label}>Telefone</Text>
                <TextInput style={s.input} value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" placeholderTextColor={Colors.gray} accessibilityLabel="Telefone" />
              </View>
              <View style={s.editActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={cancelarEdicao} disabled={salvando} accessibilityRole="button" accessibilityLabel="Cancelar edição">
                  <Text style={s.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={salvarPerfil} disabled={salvando} accessibilityRole="button" accessibilityLabel="Salvar alterações">
                  {salvando ? <ActivityIndicator color={Colors.clareza} size="small" /> : <Text style={s.saveBtnText}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={s.dadoRow}>
                <Text style={s.dadoLabel}>Nome</Text>
                <Text style={s.dadoValue}>{entregador?.nome}</Text>
              </View>
              <View style={s.dadoRow}>
                <Text style={s.dadoLabel}>CPF</Text>
                <Text style={s.dadoValue}>{entregador?.cpf ? maskCpf(entregador.cpf) : '—'}</Text>
              </View>
              <View style={[s.dadoRow, {borderBottomWidth: 0}]}>
                <Text style={s.dadoLabel}>Telefone</Text>
                <Text style={s.dadoValue}>{entregador?.telefone || '—'}</Text>
              </View>
            </>
          )}
        </View>

        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Empresas que você atende</Text>
          <View style={s.badge}><Text style={s.badgeText}>{empresas.length}</Text></View>
        </View>

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : empresas.length === 0 ? (
          <EmptyState icon="briefcase" title="Nenhuma empresa vinculada" subtitle="Peça pro responsável da loja buscar seu CPF no painel dela para te vincular" />
        ) : empresas.map(emp => (
          <View key={emp.id} style={s.empCard} accessibilityLabel={`${emp.nome_empresa}, ${emp.ativo ? 'ativo' : 'inativo'}`}>
            <View style={s.empInfo}>
              <View style={s.empTopRow}>
                <Text style={s.empNome} numberOfLines={1}>{emp.nome_empresa}</Text>
                <View style={[s.statusPill, emp.ativo ? s.statusAtivo : s.statusInativo]}>
                  <Text style={[s.statusPillText, emp.ativo ? s.statusAtivoText : s.statusInativoText]}>
                    {emp.ativo ? 'Ativo' : 'Desativado pela empresa'}
                  </Text>
                </View>
              </View>
              {(emp.cidade || emp.estado) && (
                <View style={s.localRow}>
                  <Icon name="map-pin" size={11} color={Colors.gray} />
                  <Text style={s.empLocal}>{[emp.cidade, emp.estado].filter(Boolean).join(' - ')}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={s.desvincularBtn}
              onPress={() => confirmarDesvincular(emp)}
              disabled={desvinculandoId === emp.id}
              accessibilityRole="button"
              accessibilityLabel={`Desvincular de ${emp.nome_empresa}`}>
              {desvinculandoId === emp.id ? (
                <ActivityIndicator size="small" color="#F87171" />
              ) : (
                <Icon name="user-x" size={16} color="#F87171" />
              )}
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={s.logoutBtn} onPress={logout} accessibilityRole="button" accessibilityLabel="Sair da conta">
          <Icon name="log-out" size={16} color="#F87171" />
          <Text style={s.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:   {flex: 1, backgroundColor: Colors.matriz},
  header:      {padding: 24, paddingTop: 56, paddingBottom: 12},
  title:       {fontSize: 20, fontWeight: '700', color: Colors.clareza},
  card:        {backgroundColor: '#081544', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#0B1E5A', marginBottom: 20},
  cardHeaderRow:{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  cardTitle:   {fontSize: 14, fontWeight: '700', color: Colors.clareza},
  editBtn:     {flexDirection: 'row', alignItems: 'center', gap: 4},
  editBtnText: {fontSize: 12, fontWeight: '700', color: Colors.pulso},
  dadoRow:     {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0B1E5A'},
  dadoLabel:   {fontSize: 13, color: Colors.gray},
  dadoValue:   {fontSize: 13, fontWeight: '600', color: Colors.clareza},
  inputWrapper:{marginTop: 10},
  label:       {fontSize: 12, fontWeight: '600', color: Colors.gray, marginBottom: 6},
  input:       {height: 44, borderWidth: 1, borderColor: '#0B1E5A', borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: Colors.clareza, backgroundColor: '#081544'},
  editActions: {flexDirection: 'row', gap: 10, marginTop: 16},
  cancelBtn:   {flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#0B1E5A', alignItems: 'center', justifyContent: 'center'},
  cancelBtnText:{color: Colors.gray, fontWeight: '700', fontSize: 13},
  saveBtn:     {flex: 1, height: 44, borderRadius: 8, backgroundColor: Colors.pulso, alignItems: 'center', justifyContent: 'center'},
  saveBtnText: {color: Colors.clareza, fontWeight: '700', fontSize: 13},
  sectionHeaderRow:{flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10},
  sectionTitle:{fontSize: 14, fontWeight: '700', color: Colors.clareza},
  badge:       {backgroundColor: Colors.pulso, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 2},
  badgeText:   {color: Colors.clareza, fontWeight: '800', fontSize: 12},
  empCard:     {backgroundColor: '#081544', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#0B1E5A'},
  empInfo:     {flex: 1},
  empTopRow:   {flexDirection: 'row', alignItems: 'center', gap: 8},
  empNome:     {flex: 1, fontSize: 14, fontWeight: '700', color: Colors.clareza},
  statusPill:  {borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3},
  statusAtivo: {backgroundColor: Colors.pulso + '20'},
  statusInativo:{backgroundColor: '#F8717120'},
  statusPillText:{fontSize: 10, fontWeight: '700'},
  statusAtivoText:{color: Colors.pulso},
  statusInativoText:{color: '#F87171'},
  localRow:    {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4},
  empLocal:    {fontSize: 12, color: Colors.gray},
  desvincularBtn:{width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#F8717150', alignItems: 'center', justifyContent: 'center'},
  logoutBtn:   {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#F8717150'},
  logoutText:  {color: '#F87171', fontWeight: '700', fontSize: 13},
});
