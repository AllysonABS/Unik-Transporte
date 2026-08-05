import {useAlert} from '../components/CustomAlert';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useAuth} from '../context/AuthContext';
import {hapticWarning} from '../utils/haptics';
import {desregistrarPushToken} from '../services/push';

export function useLogout() {
  const {show} = useAlert();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {entregador, logout} = useAuth();

  const doLogout = () => {
    hapticWarning();
    show({
      title: 'Sair da conta',
      message: 'Tem certeza que deseja sair? Você precisará fazer login novamente.',
      type: 'confirm',
      buttons: [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            // Tira o token do banco antes de limpar a sessão local — senão
            // o entregador continua recebendo push nesse aparelho mesmo
            // deslogado.
            if (entregador?.id) await desregistrarPushToken(entregador.id);
            await logout();
            navigation.replace('Login');
          },
        },
      ],
    });
  };

  return doLogout;
}
