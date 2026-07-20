import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const TMDB_KEY = '42dace73a1c2b8df4438c9fb198bc7f2'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 8651,
    host: true,
    proxy: {
      // TMDB API 代理
      '/api/tmdb': {
        target: 'https://api.tmdb.org/3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tmdb/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (!proxyReq.path.includes('api_key=')) {
              const sep = proxyReq.path.includes('?') ? '&' : '?'
              proxyReq.path += `${sep}api_key=${TMDB_KEY}`
            }
          })
        }
      },
      // TMDB 图片代理
      '/api/tmdb-img': {
        target: 'https://image.tmdb.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tmdb-img/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (!proxyReq.path.includes('api_key=')) {
              const sep = proxyReq.path.includes('?') ? '&' : '?'
              proxyReq.path += `${sep}api_key=${TMDB_KEY}`
            }
          })
        }
      },
      // AI 推荐代理（DeepSeek 官方 API）
      '/api/ai': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/v1'),
        configure: (proxy) => {
          const aiKey = process.env.VITE_AI_API_KEY || ''
          if (aiKey) {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${aiKey}`)
              proxyReq.setHeader('Content-Type', 'application/json')
            })
          }
        }
      }
    }
  }
})
