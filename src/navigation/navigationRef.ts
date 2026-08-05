import {createNavigationContainerRef} from '@react-navigation/native';
import {RootStackParamList} from './AppNavigator';

// Ref global de navegação — permite navegar (ex.: ao tocar numa notificação
// push) de fora da árvore de componentes, onde não dá pra usar o hook
// useNavigation().
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navegarParaEntregador() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Entregador');
  }
}
