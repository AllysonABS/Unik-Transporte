import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Modal, Image, Dimensions, Platform, PermissionsAndroid} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {Colors} from '../theme/colors';
import {useAlert} from './CustomAlert';

const {width, height} = Dimensions.get('window');

type Props = {
  visible: boolean;
  url: string;
  onClose: () => void;
};

export default function ImageViewer({visible, url, onClose}: Props) {
  const [saving, setSaving] = useState(false);
  const {show} = useAlert();

  // Valida que a URL é do nosso domínio R2
  const isValidUrl = url && (url.startsWith('https://') && (url.includes('.r2.dev') || url.includes('norum')));

  const download = async () => {
    if (!isValidUrl) {
      show({title: 'Erro', message: 'URL de imagem inv\u00e1lida.', type: 'error'});
      return;
    }
    try {
      setSaving(true);

      if (Platform.OS === 'android' && Platform.Version < 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setSaving(false);
          show({title: 'Permissão negada', message: 'Ative a permissão de armazenamento.', type: 'warning'});
          return;
        }
      }

      const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `uniktransporte_${Date.now()}.${ext}`;
      const dirs = ReactNativeBlobUtil.fs.dirs;
      const filePath = `${dirs.PictureDir}/${fileName}`;

      const res = await ReactNativeBlobUtil.config({
        fileCache: false,
        path: filePath,
      }).fetch('GET', url);

      // Registra na galeria do Android
      if (Platform.OS === 'android') {
        await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
          {name: fileName, parentFolder: '', mimeType: `image/${ext}`},
          'Image',
          res.path(),
        );
      }

      setSaving(false);
      show({title: 'Salvo!', message: 'Imagem salva na galeria.', type: 'success'});
    } catch (err) {
      setSaving(false);
      show({title: 'Erro', message: 'Não foi possível salvar a imagem.', type: 'error'});
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.container}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={download} style={s.downloadBtn} disabled={saving}>
            <Text style={s.downloadText}>{saving ? 'Salvando...' : '⬇️ Salvar'}</Text>
          </TouchableOpacity>
        </View>
        <Image source={{uri: url}} style={s.image} resizeMode="contain" />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center'},
  topBar: {position: 'absolute', top: Platform.OS === 'ios' ? 56 : 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10},
  closeBtn: {width: 40, height: 40, borderRadius: 20, backgroundColor: '#102255', alignItems: 'center', justifyContent: 'center'},
  closeText: {color: Colors.clareza, fontSize: 18, fontWeight: '700'},
  downloadBtn: {backgroundColor: Colors.pulso, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10},
  downloadText: {color: Colors.matriz, fontWeight: '700', fontSize: 14},
  image: {width: width - 32, height: height * 0.7, borderRadius: 10},
});
