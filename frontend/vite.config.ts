import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            // Proxy API and websocket calls to the backend. When running inside
            // the project's Docker compose (DOCKER env var set), forward to
            // the internal `backend:8000` service. For local dev point to the
            // backend running on localhost:8010 (the test server we started).
            '/api': {
                target: process.env.NODE_ENV === 'development' && process.env.DOCKER
                    ? 'http://backend:8000'
                    : 'http://127.0.0.1:8010',
                changeOrigin: true,
                ws: true,
            },
        },
    },
})
