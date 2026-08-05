import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPixelPageView } from '@/lib/metaPixel';

// O PageView do carregamento inicial já é disparado pelo script fixo no
// index.html — aqui só cobrimos as trocas de rota DEPOIS disso, que são
// navegação client-side (sem reload) e por isso invisíveis pro pixel sem
// esse disparo manual.
export default function MetaPixelRouteTracker() {
  const location = useLocation();
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    trackPixelPageView();
  }, [location.pathname]);

  return null;
}
