// Cloudflare Pages Function — 统一 API 代理
// 处理所有 /api/tmdb/*, /api/tmdb-img/*, /api/ai/* 请求

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname

  try {
    // ═══ TMDB API ═══
    if (path.startsWith('/api/tmdb/') || path === '/api/tmdb') {
      const apiPath = path.replace('/api/tmdb', '')
      const target = new URL(`https://api.tmdb.org/3${apiPath}`)
      target.searchParams.set('api_key', env.VITE_TMDB_API_KEY || '42dace73a1c2b8df4438c9fb198bc7f2')
      url.searchParams.forEach((v, k) => { if (k !== 'api_key') target.searchParams.set(k, v) })
      const resp = await fetch(target.toString(), { headers: { 'Accept': 'application/json' } })
      return new Response(resp.body, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' }
      })
    }

    // ═══ TMDB 图片 ═══
    if (path.startsWith('/api/tmdb-img/')) {
      const imgPath = path.replace('/api/tmdb-img', '')
      const target = `https://image.tmdb.org${imgPath}?api_key=${env.VITE_TMDB_API_KEY || '42dace73a1c2b8df4438c9fb198bc7f2'}`
      const resp = await fetch(target)
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          'Content-Type': resp.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // ═══ AI 推荐 (DeepSeek) ═══
    if (path.startsWith('/api/ai/')) {
      const aiPath = path.replace('/api/ai', '')
      const aiKey = env.VITE_AI_API_KEY
      if (!aiKey) {
        return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
      }
      const target = `https://api.deepseek.com/v1${aiPath}`
      // 转发请求体
      const body = await request.text()
      const resp = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiKey}`
        },
        body: body
      })
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // ═══ 健康检查 ═══
    if (path === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response('Not found', { status: 404 })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    })
  }
}
