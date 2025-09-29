module.exports = {
    content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
    theme: {
        extend: {
            colors: {
                // Dynamic glass color palette with CSS variables
                glass: {
                    // Dynamic colors (use CSS variables)
                    bg: 'var(--glass-bg)',
                    surface: 'var(--glass-surface)',
                    card: 'var(--glass-card)',
                    nav: 'var(--glass-nav)',
                    button: 'var(--glass-button)',
                    input: 'var(--glass-input)',
                    border: 'var(--glass-border)',
                    'border-bright': 'var(--glass-border-bright)',
                    text: 'var(--glass-text)',
                    'text-muted': 'var(--glass-text-muted)',
                    'text-bright': 'var(--glass-text-bright)',

                    // Dark mode specific colors
                    dark: {
                        bg: '#0a0a0f',
                        surface: 'rgba(15, 15, 25, 0.4)',
                        card: 'rgba(20, 25, 40, 0.3)',
                        nav: 'rgba(10, 15, 30, 0.8)',
                        button: 'rgba(30, 35, 50, 0.6)',
                        input: 'rgba(20, 25, 40, 0.4)',
                        border: 'rgba(255, 255, 255, 0.1)',
                        'border-bright': 'rgba(255, 255, 255, 0.2)',
                        text: 'rgba(228, 231, 236, 0.9)',
                        'text-muted': 'rgba(228, 231, 236, 0.6)',
                        'text-bright': '#ffffff'
                    },

                    // Light mode specific colors - text hierarchy system
                    light: {
                        bg: '#f1f5f9',
                        surface: 'rgba(255, 255, 255, 0.85)',
                        card: 'rgba(255, 255, 255, 0.9)',
                        nav: 'rgba(255, 255, 255, 0.95)',
                        button: 'rgba(248, 250, 252, 0.9)',
                        input: 'rgba(255, 255, 255, 0.8)',
                        border: 'rgba(71, 85, 105, 0.3)',
                        'border-bright': 'rgba(71, 85, 105, 0.5)',
                        text: '#0f172a',        // Crisp black for body text
                        'text-muted': '#64748b', // Off-white for muted text
                        'text-bright': '#64748b' // Off-white for large headings
                    }
                },
                neutral: {
                    950: '#0a0a0f',
                    900: '#0f0f19',
                    850: '#141420',
                    800: '#1a1a2e',
                    750: '#20253a',
                    700: '#252a40',
                    600: '#2f3548',
                    500: '#3d4358',
                    400: '#555b70',
                    300: '#8a8f9f',
                    200: '#bfc2d0',
                    100: '#e4e7ec',
                    50: '#f8f9fc'
                },
                accent: {
                    primary: '#6366f1',
                    'primary-light': '#818cf8',
                    'primary-dark': '#4f46e5',
                    teal: '#14b8a6',
                    'teal-light': '#5eead4',
                    'teal-dark': '#0f766e',
                    amber: '#f59e0b',
                    'amber-light': '#fbbf24',
                    'amber-dark': '#d97706',
                    rose: '#f43f5e',
                    'rose-light': '#fb7185',
                    'rose-dark': '#e11d48',
                    emerald: '#10b981',
                    'emerald-light': '#34d399',
                    'emerald-dark': '#059669'
                },
                status: {
                    // Dynamic status colors that work in both themes
                    ok: '#22c55e',
                    'ok-bg': 'rgba(34, 197, 94, 0.2)',
                    'ok-border': 'rgba(34, 197, 94, 0.3)',
                    warn: '#f59e0b',
                    'warn-bg': 'rgba(245, 158, 11, 0.2)',
                    'warn-border': 'rgba(245, 158, 11, 0.3)',
                    error: '#ef4444',
                    'error-bg': 'rgba(239, 68, 68, 0.2)',
                    'error-border': 'rgba(239, 68, 68, 0.3)',

                    // Light mode variations with better contrast
                    'ok-light': '#16a34a',
                    'ok-bg-light': 'rgba(34, 197, 94, 0.15)',
                    'ok-border-light': 'rgba(34, 197, 94, 0.4)',
                    'warn-light': '#d97706',
                    'warn-bg-light': 'rgba(245, 158, 11, 0.15)',
                    'warn-border-light': 'rgba(245, 158, 11, 0.4)',
                    'error-light': '#dc2626',
                    'error-bg-light': 'rgba(239, 68, 68, 0.15)',
                    'error-border-light': 'rgba(239, 68, 68, 0.4)'
                }
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace']
            },
            backdropBlur: {
                'glass': '20px',
                'nav': '25px',
                'card': '15px',
                'button': '10px'
            },
            boxShadow: {
                // Dynamic shadows (use CSS variables)
                'glass': 'var(--glass-shadow)',
                'glass-card': 'var(--glass-card-shadow)',
                'glass-hover': 'var(--glass-hover-shadow)',
                'glass-nav': 'var(--glass-nav-shadow)',
                'glass-lift': 'var(--glass-lift-shadow)',

                // Dark mode shadows
                'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                'glass-card-dark': '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                'glass-hover-dark': '0 8px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                'glass-nav-dark': '0 2px 20px rgba(0, 0, 0, 0.3)',
                'glass-lift-dark': '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',

                // Light mode shadows
                'glass-light': '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                'glass-card-light': '0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
                'glass-hover-light': '0 8px 25px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
                'glass-nav-light': '0 2px 20px rgba(0, 0, 0, 0.08)',
                'glass-lift-light': '0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.95)',

                // Common shadows
                'elevation-1': '0 1px 2px rgba(0,0,0,0.35)',
                'elevation-2': '0 4px 8px rgba(0,0,0,0.35)',
                'elevation-3': '0 8px 16px rgba(0,0,0,0.4)',
                'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
                'glow-sm': '0 0 10px rgba(99, 102, 241, 0.2)'
            },
            borderRadius: {
                'glass': '16px',
                'glass-card': '12px',
                'glass-button': '8px'
            },
            animation: {
                'gradient-shift': 'gradient-shift 8s ease infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite'
            },
            keyframes: {
                'gradient-shift': {
                    '0%, 100%': { 'background-position': '0% 50%' },
                    '50%': { 'background-position': '100% 50%' }
                },
                'pulse-glow': {
                    '0%, 100%': {
                        opacity: '1',
                        'box-shadow': '0 0 20px rgba(99, 102, 241, 0.3)'
                    },
                    '50%': {
                        opacity: '0.8',
                        'box-shadow': '0 0 30px rgba(99, 102, 241, 0.5)'
                    }
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' }
                },
                'shimmer': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' }
                }
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
                '128': '32rem'
            },
            zIndex: {
                '60': '60',
                '70': '70',
                '80': '80',
                '90': '90',
                '100': '100'
            }
        }
    },
    plugins: []
}
