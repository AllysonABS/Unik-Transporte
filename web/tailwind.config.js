/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Escala de marca Unik (tema claro): matriz(#F7FAF9) -> transição
        // (#FFFFFF) -> iluminado(#D7E2DF) -> bordaProfunda(#0B1F1B). Nomes
        // mantidos por compatibilidade (usados em dezenas de arquivos) —
        // era escala escura, agora é clara, mas o PAPEL de cada um
        // (fundo de página, superfície elevada, borda/destaque, contraste
        // máximo) é o mesmo de antes.
        matriz: '#F7FAF9', // fundo de página
        transicao: '#FFFFFF', // superfícies elevadas (cards, inputs)
        iluminado: '#D7E2DF', // bordas/destaques claros
        bordaProfunda: '#0B1F1B', // quase preto — contraste máximo
        pulso: '#00695A', // verde de marca — antes era o azul de destaque
        clareza: '#0B1F1B', // texto principal (era texto claro p/ fundo escuro; agora é o inverso)
        gray: '#5B6B67', // texto secundário — escurecido em relação ao tema escuro pra manter contraste em fundo branco
        grayLight: '#F5F5F5',
        grayBorder: '#E5E7EB',
        danger: '#DC2626',
        success: '#059669',
        warning: '#B45309',
        info: '#0E7490',
        purple: '#7C3AED',
        indigo: '#4F46E5',
        status: {
          aguardandoBg: '#FEF3C7',
          emTransitoBg: '#DBEAFE',
          entregueBg: '#D1FAE5',
          canceladoBg: '#FEE2E2',
          cancelado: '#B91C1C',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
