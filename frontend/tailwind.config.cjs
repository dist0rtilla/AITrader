module.exports = {
    content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
    theme: {
        extend: {
            colors: {
                neutral: {
                    900: '#000000',
                    800: '#0f0f0f',
                    700: '#1f1f1f',
                    600: '#2f2f2f',
                    500: '#444444',
                    400: '#666666',
                    300: '#8a8a8a',
                    200: '#bfbfbf',
                    100: '#e6e6e6'
                },
                accent: {
                    teal: '#5aa7a7',
                    amber: '#caa15a',
                    mauve: '#a58fae'
                }
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto']
            },
            boxShadow: {
                'elevation-1': '0 1px 2px rgba(0,0,0,0.35)',
                'elevation-2': '0 4px 8px rgba(0,0,0,0.35)',
                'elevation-3': '0 8px 16px rgba(0,0,0,0.4)'
            }
        }
    },
    plugins: [],
}
