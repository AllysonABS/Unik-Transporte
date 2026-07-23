import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Modal, Pressable, Switch} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import Toast, {useToast} from '../../components/Toast';
import {useAuth} from '../../context/AuthContext';
import {buscarEmpresa, atualizarEmpresa} from '../../services/api';
import {useAlert} from '../../components/CustomAlert';
import {buscarCep as fetchCep} from '../../utils/cep';
import Icon from '../../components/Icon';
import {hapticSuccess} from '../../utils/haptics';

type DiaHorario = {dia: string; aberto: boolean; abre: string; fecha: string};

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const HORARIOS_DISPONIVEIS: string[] = (() => {
  const lista: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      lista.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return lista;
})();

function diasPadrao(): DiaHorario[] {
  return DIAS_SEMANA.map(dia => ({
    dia,
    aberto: dia !== 'Dom',
    abre: '08:00',
    fecha: dia === 'Sáb' ? '12:00' : '18:00',
  }));
}

function formatarHorarios(dias: DiaHorario[]): string {
  if (dias.every(d => !d.aberto)) return 'Fechado todos os dias';
  const partes: string[] = [];
  let i = 0;
  while (i < dias.length) {
    const atual = dias[i];
    let j = i;
    while (j + 1 < dias.length && dias[j + 1].aberto === atual.aberto && dias[j + 1].abre === atual.abre && dias[j + 1].fecha === atual.fecha) {
      j++;
    }
    const rotulo = i === j ? dias[i].dia : `${dias[i].dia}-${dias[j].dia}`;
    partes.push(atual.aberto ? `${rotulo}: ${atual.abre}-${atual.fecha}` : `${rotulo}: Fechado`);
    i = j + 1;
  }
  return partes.join(' | ');
}

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

export default function ConfiguracoesScreen() {
  const navigation = useNavigation();
  const {showToast} = useToast();
  const {empresa, setEmpresa} = useAuth();
  const {show} = useAlert();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');
  const [horario, setHorario] = useState('');
  const [horarioModal, setHorarioModal] = useState(false);
  const [dias, setDias] = useState<DiaHorario[]>(diasPadrao());
  const [diasBackup, setDiasBackup] = useState<DiaHorario[]>(diasPadrao());
  const [expandido, setExpandido] = useState<{index: number; campo: 'abre' | 'fecha'} | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    if (!empresa?.id) { setLoading(false); return; }
    setLoading(true);
    const res = await buscarEmpresa(empresa.id);
    if (res.success && res.empresa) {
      const e = res.empresa;
      setNomeEmpresa(e.nome_empresa || '');
      setCnpj(e.cnpj || '');
      setNomeResponsavel(e.nome_responsavel || '');
      setTelefone(e.telefone || '');
      setEmail(e.email || '');
      setEndereco(e.endereco || '');
      setNumero(e.numero || '');
      setBairro(e.bairro || '');
      setCidade(e.cidade || '');
      setEstado(e.estado || '');
      setCep(e.cep || '');
      setHorario(e.horario_funcionamento || '');
    }
    setLoading(false);
  };

  const abrirHorarioModal = () => {
    setDiasBackup(dias);
    setExpandido(null);
    setHorarioModal(true);
  };

  const cancelarHorarioModal = () => {
    setDias(diasBackup);
    setExpandido(null);
    setHorarioModal(false);
  };

  const confirmarHorarioModal = () => {
    setHorario(formatarHorarios(dias));
    setExpandido(null);
    setHorarioModal(false);
  };

  const toggleDiaAberto = (index: number) => {
    setDias(prev => prev.map((d, i) => (i === index ? {...d, aberto: !d.aberto} : d)));
  };

  const selecionarHorarioDia = (index: number, campo: 'abre' | 'fecha', hora: string) => {
    setDias(prev => prev.map((d, i) => (i === index ? {...d, [campo]: hora} : d)));
  };

  const salvar = async () => {
    if (!nomeEmpresa) { show({title: 'Atenção', message: 'Preencha o nome da empresa', type: 'warning'}); return; }
    if (!empresa?.id) return;

    setSalvando(true);
    const res = await atualizarEmpresa(empresa.id, {
      nome_empresa: nomeEmpresa, telefone, email, endereco, numero, bairro, cidade, estado, cep, horario_funcionamento: horario,
    });
    setSalvando(false);

    if (res.success) {
      hapticSuccess();
      setEmpresa({...empresa, nome_empresa: nomeEmpresa, telefone, email, endereco, numero, bairro, cidade, estado, cep, horario_funcionamento: horario});
      showToast('Configurações salvas!', 'success');
    } else {
      show({title: 'Erro', message: res.error || 'Não foi possível salvar.', type: 'error'});
    }
  };

  if (loading) {
    return (
      <View style={[s.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={Colors.pulso} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Toast />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12}} accessibilityRole="button" accessibilityLabel="Voltar">
          <Icon name="arrow-left" size={18} color={Colors.pulso} />
          <Text style={s.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.title} accessibilityRole="header">Configurações</Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Dados da Empresa</Text>
          <Text style={s.label}>Nome / Razão Social *</Text>
          <TextInput style={s.input} value={nomeEmpresa} onChangeText={setNomeEmpresa} placeholderTextColor={Colors.gray} />
          <Text style={s.label}>CNPJ</Text>
          <TextInput style={[s.input, s.inputDisabled]} value={maskCnpj(cnpj)} editable={false} />
          <Text style={s.label}>Responsável</Text>
          <TextInput style={[s.input, s.inputDisabled]} value={nomeResponsavel} editable={false} />
          <Text style={s.label}>Telefone</Text>
          <TextInput style={s.input} value={telefone} onChangeText={v => setTelefone(maskTelefone(v))} placeholderTextColor={Colors.gray} keyboardType="phone-pad" />
          <Text style={s.label}>E-mail</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholderTextColor={Colors.gray} keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Endereço</Text>
          <Text style={s.label}>CEP</Text>
          <TextInput style={s.input} value={cep} onChangeText={async v => { const masked = maskCep(v); setCep(masked); const d = await fetchCep(masked); if (d) { setEndereco(d.logradouro); setBairro(d.bairro); setCidade(d.cidade); setEstado(d.estado); } }} placeholderTextColor={Colors.gray} keyboardType="numeric" placeholder="00000-000" />
          <Text style={s.label}>Endereço</Text>
          <TextInput style={s.input} value={endereco} onChangeText={setEndereco} placeholderTextColor={Colors.gray} placeholder="Rua / Avenida" />
          <View style={s.row}>
            <View style={{flex: 1}}>
              <Text style={s.label}>Número</Text>
              <TextInput style={s.input} value={numero} onChangeText={setNumero} placeholderTextColor={Colors.gray} keyboardType="number-pad" />
            </View>
            <View style={{flex: 2, marginLeft: 12}}>
              <Text style={s.label}>Bairro</Text>
              <TextInput style={s.input} value={bairro} onChangeText={setBairro} placeholderTextColor={Colors.gray} />
            </View>
          </View>
          <View style={s.row}>
            <View style={{flex: 2}}>
              <Text style={s.label}>Cidade</Text>
              <TextInput style={s.input} value={cidade} onChangeText={setCidade} placeholderTextColor={Colors.gray} />
            </View>
            <View style={{flex: 1, marginLeft: 12}}>
              <Text style={s.label}>UF</Text>
              <TextInput style={s.input} value={estado} onChangeText={setEstado} placeholderTextColor={Colors.gray} maxLength={2} autoCapitalize="characters" />
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Funcionamento</Text>
          <Text style={s.label}>Horário de Funcionamento</Text>
          <TouchableOpacity style={s.horarioBtn} onPress={abrirHorarioModal} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Configurar horário de funcionamento">
            <Text style={horario ? s.horarioValue : s.horarioPlaceholder} numberOfLines={2}>
              {horario || 'Toque para configurar os horários'}
            </Text>
            <Icon name="clock" size={18} color={Colors.gray} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={salvar} disabled={salvando}>
          {salvando ? (
            <ActivityIndicator color={Colors.matriz} />
          ) : (
            <Text style={s.saveBtnText}>Salvar Alterações</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={horarioModal} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={cancelarHorarioModal}>
          <Pressable style={s.horarioSheet} onPress={() => {}}>
            <View style={s.handle} />
            <View style={s.sheetHeaderRow}>
              <Text style={s.sheetTitle}>Horário de Funcionamento</Text>
              <TouchableOpacity onPress={cancelarHorarioModal} style={s.closeX} accessibilityRole="button" accessibilityLabel="Fechar">
                <Icon name="x" size={17} color={Colors.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={s.diasScroll}>
              {dias.map((d, index) => (
                <View key={d.dia} style={s.diaBlock}>
                  <View style={s.diaRow}>
                    <Text style={s.diaNome}>{d.dia}</Text>
                    <Switch
                      value={d.aberto}
                      onValueChange={() => toggleDiaAberto(index)}
                      trackColor={{false: '#1E3448', true: Colors.pulso + '55'}}
                      thumbColor={d.aberto ? Colors.pulso : '#5C6B7A'}
                    />
                  </View>

                  {d.aberto ? (
                    <View style={s.horaChipsRow}>
                      <TouchableOpacity
                        style={[s.horaChip, expandido?.index === index && expandido.campo === 'abre' && s.horaChipActive]}
                        onPress={() => setExpandido(prev => (prev?.index === index && prev.campo === 'abre' ? null : {index, campo: 'abre'}))}
                        activeOpacity={0.7}>
                        <Text style={s.horaChipLabel}>Abre</Text>
                        <Text style={s.horaChipValue}>{d.abre}</Text>
                      </TouchableOpacity>
                      <Text style={s.horaSeparador}>até</Text>
                      <TouchableOpacity
                        style={[s.horaChip, expandido?.index === index && expandido.campo === 'fecha' && s.horaChipActive]}
                        onPress={() => setExpandido(prev => (prev?.index === index && prev.campo === 'fecha' ? null : {index, campo: 'fecha'}))}
                        activeOpacity={0.7}>
                        <Text style={s.horaChipLabel}>Fecha</Text>
                        <Text style={s.horaChipValue}>{d.fecha}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={s.diaFechadoText}>Fechado</Text>
                  )}

                  {expandido?.index === index && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.timeScroll} contentContainerStyle={s.timeScrollContent}>
                      {HORARIOS_DISPONIVEIS.map(hora => {
                        const ativo = d[expandido.campo] === hora;
                        return (
                          <TouchableOpacity
                            key={hora}
                            style={[s.timeChip, ativo && s.timeChipActive]}
                            onPress={() => { selecionarHorarioDia(index, expandido.campo, hora); setExpandido(null); }}
                            activeOpacity={0.7}>
                            <Text style={[s.timeChipText, ativo && s.timeChipTextActive]}>{hora}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={s.saveBtn} onPress={confirmarHorarioModal}>
              <Text style={s.saveBtnText}>Aplicar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:    {flex: 1, backgroundColor: Colors.matriz},
  content:      {padding: 24, paddingTop: 56, paddingBottom: 100},
  title:        {fontSize: 18, fontWeight: '700', color: Colors.clareza, marginBottom: 24},
  backText:     {color: Colors.pulso, fontSize: 14, fontWeight: '600', marginBottom: 12},
  section:      {backgroundColor: '#162433', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#1E3448', marginBottom: 20},
  sectionTitle: {fontSize: 15, fontWeight: '700', color: Colors.pulso, marginBottom: 8},
  label:        {fontSize: 13, fontWeight: '600', color: Colors.gray, marginBottom: 6, marginTop: 14},
  input:        {height: 48, backgroundColor: '#0F1F2E', borderRadius: 8, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 14, color: Colors.clareza, fontSize: 15},
  inputDisabled:{opacity: 0.5},
  row:          {flexDirection: 'row'},
  saveBtn:      {height: 52, backgroundColor: Colors.pulso, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  saveBtnText:  {color: Colors.matriz, fontWeight: '700', fontSize: 16},

  horarioBtn:      {minHeight: 48, backgroundColor: '#0F1F2E', borderRadius: 8, borderWidth: 1, borderColor: '#1E3448', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  horarioValue:    {flex: 1, color: Colors.clareza, fontSize: 14, fontWeight: '600'},
  horarioPlaceholder:{flex: 1, color: Colors.gray, fontSize: 14},

  overlay:      {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end'},
  horarioSheet: {backgroundColor: '#131F2D', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32, maxHeight: '85%'},
  handle:       {width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(234,235,235,0.15)', alignSelf: 'center', marginBottom: 16},
  sheetHeaderRow:{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  sheetTitle:   {fontSize: 19, fontWeight: '700', color: Colors.clareza, letterSpacing: -0.3},
  closeX:       {width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(234,235,235,0.06)', alignItems: 'center', justifyContent: 'center'},

  diasScroll:   {maxHeight: 420, marginBottom: 16},
  diaBlock:     {paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(234,235,235,0.06)'},
  diaRow:       {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  diaNome:      {fontSize: 15, fontWeight: '700', color: Colors.clareza},
  diaFechadoText:{fontSize: 13, color: Colors.gray, marginTop: 8},
  horaChipsRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10},
  horaChip:     {flex: 1, backgroundColor: 'rgba(234,235,235,0.06)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: 'transparent'},
  horaChipActive:{borderColor: Colors.pulso, backgroundColor: Colors.pulso + '15'},
  horaChipLabel:{fontSize: 10, color: Colors.gray, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5},
  horaChipValue:{fontSize: 15, color: Colors.clareza, fontWeight: '700', marginTop: 2},
  horaSeparador:{fontSize: 12, color: Colors.gray},
  timeScroll:   {marginTop: 12},
  timeScrollContent:{gap: 8, paddingRight: 8},
  timeChip:     {backgroundColor: 'rgba(234,235,235,0.06)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14},
  timeChipActive:{backgroundColor: Colors.pulso},
  timeChipText: {fontSize: 13, color: Colors.clareza, fontWeight: '600'},
  timeChipTextActive:{color: Colors.matriz},
});
