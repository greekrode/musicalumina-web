/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '3rem',
      },
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      /* ------------------------------------------------------------------
         COLORS — brand primitives (preserved from original config) plus
         the full Musical Lumina tonal system. Legacy names stay so existing
         call sites (bg-offWhite, text-burgundy, etc.) do not break.
         ------------------------------------------------------------------ */
      colors: {
        /* Legacy — preserved. */
        offWhite: '#FFFBEF',
        marigold: {
          DEFAULT: '#E2A225',
          50: '#fdf5e3',
          100: '#f9e5b8',
          200: '#f3cf84',
          300: '#ecb857',
          400: '#e8ac3b',
          500: '#e2a225',
          600: '#c48716',
          700: '#9b6a0f',
          800: '#72500c',
        },
        burgundy: {
          DEFAULT: '#491822',
          50: '#f7eeef',
          100: '#e7c9ce',
          200: '#c9878f',
          300: '#a84f5b',
          400: '#7a2e3a',
          500: '#491822',
          600: '#3a131b',
          700: '#2e040e',
          800: '#1f0309',
        },
        charcoal: '#2D2D2D',

        /* Surface system — tonal layering. */
        surface: {
          canvas: 'var(--surface-canvas)',
          'canvas-warm': 'var(--surface-canvas-warm)',
          'canvas-mist': 'var(--surface-canvas-mist)',
          elevated: 'var(--surface-elevated)',
          inverse: 'var(--surface-inverse)',
          overlay: 'var(--surface-overlay)',
        },

        /* Ink system — semantic text colors. */
        ink: {
          primary: 'var(--ink-primary)',
          body: 'var(--ink-body)',
          muted: 'var(--ink-muted)',
          subtle: 'var(--ink-subtle)',
          inverse: 'var(--ink-inverse)',
          accent: 'var(--ink-accent)',
        },

        /* Rule system — borders and dividers. */
        rule: {
          hairline: 'var(--rule-hairline)',
          subtle: 'var(--rule-subtle)',
          strong: 'var(--rule-strong)',
          marigold: 'var(--rule-marigold)',
        },

        /* Status — for badges, pills, registration state. */
        status: {
          'open-fg': 'var(--status-open)',
          'open-bg': 'var(--status-open-bg)',
          'closed-fg': 'var(--status-closed)',
          'closed-bg': 'var(--status-closed-bg)',
          'upcoming-fg': 'var(--status-upcoming)',
          'upcoming-bg': 'var(--status-upcoming-bg)',
          'ended-fg': 'var(--status-ended)',
          'ended-bg': 'var(--status-ended-bg)',
          'error-fg': 'var(--status-error)',
          'error-bg': 'var(--status-error-bg)',
        },

        /* Shadcn compatibility layer — mapped to brand via CSS vars. */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
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
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },

      /* ------------------------------------------------------------------
         TYPOGRAPHY
         ------------------------------------------------------------------ */
      fontFamily: {
        serif: ['Noto Serif', 'Cormorant Garamond', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Manrope', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        /* Legacy aliases — kept so existing `font-playfair` / `font-open-sans`
           references still resolve to the new system without a find-replace sweep. */
        playfair: ['Noto Serif', 'Georgia', 'serif'],
        'open-sans': ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'display-xl': ['var(--text-display-xl)', { lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)', fontWeight: '500' }],
        'display-lg': ['var(--text-display-lg)', { lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)', fontWeight: '500' }],
        'display-md': ['var(--text-display-md)', { lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)', fontWeight: '500' }],
        'headline-lg': ['var(--text-headline-lg)', { lineHeight: 'var(--leading-headline)', letterSpacing: 'var(--tracking-headline)', fontWeight: '500' }],
        'headline-md': ['var(--text-headline-md)', { lineHeight: 'var(--leading-headline)', letterSpacing: 'var(--tracking-headline)', fontWeight: '500' }],
        'headline-sm': ['var(--text-headline-sm)', { lineHeight: 'var(--leading-headline)', fontWeight: '500' }],
        'title-lg': ['var(--text-title-lg)', { lineHeight: 'var(--leading-title)', fontWeight: '600' }],
        'title-md': ['var(--text-title-md)', { lineHeight: 'var(--leading-title)', fontWeight: '600' }],
        'body-lg': ['var(--text-body-lg)', { lineHeight: 'var(--leading-body)' }],
        'body-md': ['var(--text-body-md)', { lineHeight: 'var(--leading-body)' }],
        'body-sm': ['var(--text-body-sm)', { lineHeight: 'var(--leading-body)' }],
        caption: ['var(--text-caption)', { lineHeight: 'var(--leading-title)' }],
        label: ['var(--text-label)', { lineHeight: 'var(--leading-label)', letterSpacing: 'var(--tracking-label)' }],
      },

      /* ------------------------------------------------------------------
         SPACING — adds the editorial "Pause" rhythm (96, 120, 160).
         ------------------------------------------------------------------ */
      spacing: {
        30: '7.5rem',   /* 120 — "The Pause" */
        34: '8.5rem',
        40: '10rem',    /* 160 */
      },

      maxWidth: {
        prose: '68ch',
        container: '1280px',
      },

      /* ------------------------------------------------------------------
         RADII — sharper by default.
         ------------------------------------------------------------------ */
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      /* ------------------------------------------------------------------
         MOTION
         ------------------------------------------------------------------ */
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
      },
      transitionDuration: {
        instant: '100ms',
        fast: '180ms',
        base: '240ms',
        slow: '400ms',
        slower: '700ms',
      },

      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },

      animation: {
        'slide-in': 'slide-in 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        'accordion-down': 'accordion-down 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
        'accordion-up': 'accordion-up 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
        'fade-up': 'fade-up 0.7s cubic-bezier(0.19, 1, 0.22, 1)',
        'fade-in': 'fade-in 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}
