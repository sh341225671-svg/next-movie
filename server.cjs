/**
 * Next 后端服务器
 * 
 * 部署在海外服务器上，统一代理所有被墙的请求。
 * 用户的浏览器只需连接本服务器，无需任何代理/VPN。
 */

const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')
const path = require('path')
const fs = require('fs')

// 尝试从 .env 加载环境变量（开发模式）
try {
  const envPath = path.join(__dirname, '.env')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([^#\s=]+)\s*=\s*(.+?)\s*$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    }
  }
} catch {}

const TMDB_KEY = process.env.VITE_TMDB_API_KEY || '42dace73a1c2b8df4438c9fb198bc7f2'
const AI_KEY = process.env.VITE_AI_API_KEY || ''

const app = express()
const PORT = process.env.PORT || 3001

// ═══ 健康检查 ═══
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// ═══ TMDB API 代理 ═══
app.use('/api/tmdb', createProxyMiddleware({
  target: 'https://api.tmdb.org/3',
  changeOrigin: true,
  pathRewrite: { '^/api/tmdb': '' },
  on: {
    proxyReq: (proxyReq) => {
      if (!proxyReq.path.includes('api_key=')) {
        const sep = proxyReq.path.includes('?') ? '&' : '?'
        proxyReq.path += `${sep}api_key=${TMDB_KEY}`
      }
    }
  }
}))

// ═══ TMDB 图片代理（用 weserv 免费 CDN，国内可访问） ═══
app.use('/api/tmdb-img', async (req, res) => {
  const imgPath = req.originalUrl.replace('/api/tmdb-img', '')
  // weserv 是免费图片代理服务，稳定支持全球 CDN
  const directUrl = `https://image.tmdb.org${imgPath}`
  const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(directUrl)}&af=`
  try {
    const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) })
    if (!resp.ok) { res.status(resp.status).json({ error: 'Image proxy failed' }); return }
    const buffer = Buffer.from(await resp.arrayBuffer())
    res.set('Content-Type', resp.headers.get('content-type') || 'image/jpeg')
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(buffer)
  } catch (e) {
    res.status(502).json({ error: 'Image proxy error', message: e.message })
  }
})
// ═══ AI 推荐代理 ═══
// DeepSeek 官方 API
// /api/ai/chat/completions → https://api.deepseek.com/v1/chat/completions
if (AI_KEY) {
  app.use('/api/ai', createProxyMiddleware({
    target: 'https://api.deepseek.com',
    changeOrigin: true,
    pathRewrite: { '^/api/ai': '/v1' },
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader('Authorization', `Bearer ${AI_KEY}`)
        proxyReq.setHeader('Content-Type', 'application/json')
      }
    }
  }))
  console.log('  🤖 AI 推荐: 已配置 (DeepSeek)')
} else {
  console.log('  🤖 AI 推荐: 未配置（使用算法降级）')
}

// ═══ 静态文件 ═══
app.use(express.static(path.join(__dirname, 'dist')))

// ═══ SPA 路由回退 ═══
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
    return
  }
  next()
})

// ═══ 启动 ═══
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🎬 Next 服务器已启动`)
  console.log(`  🌐 地址: http://localhost:${PORT}`)
  console.log(`  📡 TMDB 代理: /api/tmdb/*`)
  console.log(`  🖼️  图片代理: /api/tmdb-img/*`)
  console.log(`  🔐 API Key: ${TMDB_KEY.slice(0,8)}...`)
  console.log(``)
})
