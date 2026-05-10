import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'sans': ['-apple-system', 'BlinkMacSystemFont', 'San Francisco', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
			},
			colors: {
				/* ====== CORE SYSTEM COLORS ====== */
				border: 'hsl(var(--border))',
				'border-strong': 'hsl(var(--border-strong))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				'foreground-secondary': 'hsl(var(--foreground-secondary))',
				'foreground-muted': 'hsl(var(--foreground-muted))',

				/* ====== BRAND COLORS ====== */
				brand: {
					primary: 'hsl(var(--brand-primary))',
					'primary-dark': 'hsl(var(--brand-primary-dark))',
					'primary-light': 'hsl(var(--brand-primary-light))',
					secondary: 'hsl(var(--brand-secondary))',
					accent: 'hsl(var(--brand-accent))',
					warning: 'hsl(var(--brand-warning))',
					error: 'hsl(var(--brand-error))',
					success: 'hsl(var(--brand-success))',
				},

				/* ====== NEUTRAL PALETTE ====== */
				neutral: {
					50: 'hsl(var(--neutral-50))',
					100: 'hsl(var(--neutral-100))',
					200: 'hsl(var(--neutral-200))',
					300: 'hsl(var(--neutral-300))',
					400: 'hsl(var(--neutral-400))',
					500: 'hsl(var(--neutral-500))',
					600: 'hsl(var(--neutral-600))',
					700: 'hsl(var(--neutral-700))',
					800: 'hsl(var(--neutral-800))',
					900: 'hsl(var(--neutral-900))',
					950: 'hsl(var(--neutral-950))',
				},

				/* ====== SURFACE COLORS ====== */
				surface: {
					DEFAULT: 'hsl(var(--surface))',
					secondary: 'hsl(var(--surface-secondary))',
					tertiary: 'hsl(var(--surface-tertiary))',
				},

				/* ====== INTERACTIVE ELEMENTS ====== */
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},

				/* ====== LAYOUT COMPONENTS ====== */
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				header: {
					DEFAULT: 'hsl(var(--header-background))',
					foreground: 'hsl(var(--header-foreground))',
					border: 'hsl(var(--header-border))',
				},
			},

			/* ====== GRADIENTS ====== */
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-accent': 'var(--gradient-accent)',
				'gradient-background': 'var(--gradient-background)',
				'gradient-surface': 'var(--gradient-surface)',
			},

			/* ====== SHADOWS ====== */
			boxShadow: {
				'sm': 'var(--shadow-sm)',
				'md': 'var(--shadow-md)',
				'lg': 'var(--shadow-lg)',
				'xl': 'var(--shadow-xl)',
				'2xl': 'var(--shadow-2xl)',
				'glow': 'var(--shadow-glow)',
				'brand': 'var(--shadow-brand)',
			},

			/* ====== SPACING SCALE ====== */
			spacing: {
				'0': 'var(--space-0)',
				'1': 'var(--space-1)',
				'2': 'var(--space-2)',
				'3': 'var(--space-3)',
				'4': 'var(--space-4)',
				'5': 'var(--space-5)',
				'6': 'var(--space-6)',
				'8': 'var(--space-8)',
				'10': 'var(--space-10)',
				'12': 'var(--space-12)',
				'16': 'var(--space-16)',
				'20': 'var(--space-20)',
				'24': 'var(--space-24)',
				'safe': 'env(safe-area-inset-bottom)',
				'safe-top': 'env(safe-area-inset-top)',
			},

			/* ====== FONT SIZES ====== */
			fontSize: {
				'xs': 'var(--font-size-xs)',
				'sm': 'var(--font-size-sm)',
				'base': 'var(--font-size-base)',
				'lg': 'var(--font-size-lg)',
				'xl': 'var(--font-size-xl)',
				'2xl': 'var(--font-size-2xl)',
				'3xl': 'var(--font-size-3xl)',
				'4xl': 'var(--font-size-4xl)',
				'5xl': 'var(--font-size-5xl)',
			},

			/* ====== LINE HEIGHTS ====== */
			lineHeight: {
				'tight': 'var(--line-height-tight)',
				'normal': 'var(--line-height-normal)',
				'relaxed': 'var(--line-height-relaxed)',
			},

			/* ====== TRANSITIONS ====== */
			transitionDuration: {
				'fast': '150ms',
				'normal': '250ms',
				'slow': '350ms',
				'ultra-fast': '100ms',
				'extra-slow': '500ms',
			},
			transitionTimingFunction: {
				'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
				'smooth-in': 'cubic-bezier(0.4, 0, 1, 1)',
				'smooth-out': 'cubic-bezier(0, 0, 0.2, 1)',
				'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'elastic': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
				'gentle': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				'snappy': 'cubic-bezier(0.23, 1, 0.320, 1)',
			},

			/* ====== Z-INDEX SCALE ====== */
			zIndex: {
				'dropdown': '1000',
				'sticky': '1020',
				'fixed': '1030',
				'modal-backdrop': '1040',
				'modal': '1050',
				'popover': '1060',
				'tooltip': '1070',
				'toast': '1080',
			},
			/* ====== BORDER RADIUS ====== */
			borderRadius: {
				'none': 'var(--radius-none)',
				'sm': 'var(--radius-sm)',
				'md': 'var(--radius-md)',
				'lg': 'var(--radius-lg)',
				'xl': 'var(--radius-xl)',
				'2xl': 'var(--radius-2xl)',
				'full': 'var(--radius-full)',
				DEFAULT: 'var(--radius)',
			},

			/* ====== KEYFRAMES & ANIMATIONS ====== */
			keyframes: {
				/* ====== ACCORDION ANIMATIONS ====== */
				'accordion-down': {
					from: { height: '0', opacity: '0' },
					to: { height: 'var(--radix-accordion-content-height)', opacity: '1' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
					to: { height: '0', opacity: '0' }
				},

				/* ====== ENHANCED FADE ANIMATIONS ====== */
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(8px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-out': {
					'0%': { opacity: '1', transform: 'translateY(0)' },
					'100%': { opacity: '0', transform: 'translateY(-8px)' }
				},
				'fade-in-up': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-in-down': {
					'0%': { opacity: '0', transform: 'translateY(-20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},

				/* ====== ENHANCED SCALE ANIMATIONS ====== */
				'scale-in': {
					'0%': { transform: 'scale(0.9)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'scale-out': {
					'0%': { transform: 'scale(1)', opacity: '1' },
					'100%': { transform: 'scale(0.9)', opacity: '0' }
				},
				'scale-in-bounce': {
					'0%': { transform: 'scale(0.3)', opacity: '0' },
					'50%': { transform: 'scale(1.05)' },
					'70%': { transform: 'scale(0.95)' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},

				/* ====== SMOOTH SLIDE ANIMATIONS ====== */
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				'slide-out-right': {
					'0%': { transform: 'translateX(0)', opacity: '1' },
					'100%': { transform: 'translateX(100%)', opacity: '0' }
				},
				'slide-in-left': {
					'0%': { transform: 'translateX(-100%)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				'slide-out-left': {
					'0%': { transform: 'translateX(0)', opacity: '1' },
					'100%': { transform: 'translateX(-100%)', opacity: '0' }
				},
				'slide-in-up': {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'slide-out-down': {
					'0%': { transform: 'translateY(0)', opacity: '1' },
					'100%': { transform: 'translateY(100%)', opacity: '0' }
				},

				/* ====== ENHANCED BOUNCE ANIMATIONS ====== */
				'bounce-in': {
					'0%': { transform: 'scale(0.3)', opacity: '0' },
					'50%': { transform: 'scale(1.05)' },
					'70%': { transform: 'scale(0.9)' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'bounce-subtle': {
					'0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
					'40%, 43%': { transform: 'translate3d(0, -8px, 0)' },
					'70%': { transform: 'translate3d(0, -4px, 0)' },
					'90%': { transform: 'translate3d(0, -2px, 0)' }
				},

				/* ====== ENHANCED PULSE ANIMATIONS ====== */
				'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 8px hsl(var(--primary) / 0.3)' },
					'50%': { boxShadow: '0 0 25px hsl(var(--primary) / 0.6), 0 0 35px hsl(var(--primary) / 0.4)' }
				},
				'pulse-gentle': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.6' }
				},
				'pulse-subtle': {
					'0%, 100%': { opacity: '1', transform: 'scale(1)' },
					'50%': { opacity: '0.95', transform: 'scale(1.02)' }
				},
				'pulse-scale': {
					'0%, 100%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.05)' }
				},

				/* ====== ENHANCED LOADING ANIMATIONS ====== */
				'spin-smooth': {
					'from': { transform: 'rotate(0deg)' },
					'to': { transform: 'rotate(360deg)' }
				},
				'spin-slow': {
					'from': { transform: 'rotate(0deg)' },
					'to': { transform: 'rotate(360deg)' }
				},
				'spin-reverse': {
					'from': { transform: 'rotate(360deg)' },
					'to': { transform: 'rotate(0deg)' }
				},

				/* ====== MICRO INTERACTIONS ====== */
				'press': {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(0.95)' },
					'100%': { transform: 'scale(1)' }
				},
				'wiggle': {
					'0%, 100%': { transform: 'rotate(0deg)' },
					'25%': { transform: 'rotate(-3deg)' },
					'75%': { transform: 'rotate(3deg)' }
				},
				'glow-pulse': {
					'0%, 100%': { 
						boxShadow: '0 0 5px hsl(var(--primary) / 0.5), 0 0 10px hsl(var(--primary) / 0.3), 0 0 15px hsl(var(--primary) / 0.1)' 
					},
					'50%': { 
						boxShadow: '0 0 10px hsl(var(--primary) / 0.8), 0 0 20px hsl(var(--primary) / 0.6), 0 0 30px hsl(var(--primary) / 0.4)' 
					}
				},

				/* ====== STAGGER ANIMATIONS ====== */
				'stagger-fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},

				/* ====== MORPHING ANIMATIONS ====== */
				'morph-circle': {
					'0%': { borderRadius: '0%' },
					'100%': { borderRadius: '50%' }
				},
				'morph-square': {
					'0%': { borderRadius: '50%' },
					'100%': { borderRadius: '0%' }
				},

				/* ====== FLOATING ANIMATIONS ====== */
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-6px)' }
				},
				'float-subtle': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-2px)' }
				},

				/* ====== TYPING ANIMATIONS ====== */
				'typing-dots': {
					'0%, 60%, 100%': { transform: 'translateY(0)' },
					'30%': { transform: 'translateY(-10px)' }
				},
			},

			animation: {
				/* ====== ENHANCED BASIC ANIMATIONS ====== */
				'accordion-down': 'accordion-down 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'accordion-up': 'accordion-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'fade-in': 'fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
				'fade-out': 'fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
				'fade-in-down': 'fade-in-down 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
				'scale-in': 'scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
				'scale-out': 'scale-out 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
				'scale-in-bounce': 'scale-in-bounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',

				/* ====== ENHANCED SLIDE ANIMATIONS ====== */
				'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
				'slide-out-right': 'slide-out-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'slide-in-left': 'slide-in-left 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
				'slide-out-left': 'slide-out-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'slide-in-up': 'slide-in-up 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
				'slide-out-down': 'slide-out-down 0.3s cubic-bezier(0.4, 0, 0.2, 1)',

				/* ====== ENHANCED BOUNCE ANIMATIONS ====== */
				'bounce-in': 'bounce-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
				'bounce-subtle': 'bounce-subtle 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)',

				/* ====== ENHANCED PULSE ANIMATIONS ====== */
				'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
				'pulse-gentle': 'pulse-gentle 2s ease-in-out infinite',
				'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
				'pulse-scale': 'pulse-scale 2s ease-in-out infinite',

				/* ====== ENHANCED LOADING ANIMATIONS ====== */
				'spin-smooth': 'spin-smooth 1s linear infinite',
				'spin-slow': 'spin-slow 3s linear infinite',
				'spin-reverse': 'spin-reverse 2s linear infinite',

				/* ====== MICRO INTERACTIONS ====== */
				'press': 'press 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
				'wiggle': 'wiggle 0.5s ease-in-out',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',

				/* ====== STAGGER ANIMATIONS ====== */
				'stagger-1': 'stagger-fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both',
				'stagger-2': 'stagger-fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both',
				'stagger-3': 'stagger-fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both',
				'stagger-4': 'stagger-fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both',

				/* ====== MORPHING ANIMATIONS ====== */
				'morph-circle': 'morph-circle 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'morph-square': 'morph-square 0.3s cubic-bezier(0.4, 0, 0.2, 1)',

				/* ====== FLOATING ANIMATIONS ====== */
				'float': 'float 3s ease-in-out infinite',
				'float-subtle': 'float-subtle 4s ease-in-out infinite',

				/* ====== TYPING ANIMATIONS ====== */
				'typing-dots-1': 'typing-dots 1.4s ease-in-out infinite',
				'typing-dots-2': 'typing-dots 1.4s ease-in-out 0.2s infinite',
				'typing-dots-3': 'typing-dots 1.4s ease-in-out 0.4s infinite',

				/* ====== COMBINED ANIMATIONS ====== */
				'enter-smooth': 'fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1), scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
				'exit-smooth': 'fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1), scale-out 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
