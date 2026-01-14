import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    base: './', // [FIX] 상대 경로 사용 (배포 시 필수)
    plugins: [
        react(),
        // VitePWA({...}) 
    ],
    server: {
        host: true, // [NEW] 외부 접속 허용 (LAN 공유)
        allowedHosts: true, // [FIX] 터널링 도메인 접속 허용 (Block Host 해결)
        proxy: {
            // 프론트엔드에서 /api 로 요청하면 -> 백엔드(3000번)로 전달
            '/api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
                secure: false,
            }
        }
    },
    build: {
        minify: false
    }
})
