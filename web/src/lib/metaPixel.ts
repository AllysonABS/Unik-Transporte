// Helper pro Pixel do Meta Ads (instalado no index.html). Como o app é uma
// SPA, o `fbq('track', 'PageView')` do index.html só dispara uma vez, no
// carregamento inicial — trocar de rota no React Router não recarrega a
// página, então nada mais era capturado depois disso. As funções daqui
// disparam eventos manualmente nos pontos que importam (troca de rota,
// conversões).

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackPixelPageView(): void {
  window.fbq?.('track', 'PageView');
}

export function trackPixelEvent(evento: string, params?: Record<string, unknown>): void {
  window.fbq?.('track', evento, params);
}
