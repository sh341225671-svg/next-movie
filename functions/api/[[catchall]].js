// Cloudflare Pages Function — 统一 API 代理
// 处理所有 /api/tmdb/*, /api/tmdb-img/*, /api/ai/*, /api/auth/* 请求

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname

  try {
    // ═══ 用户注册 ═══
    if (path === '/api/auth/register' && request.method === 'POST') {
      const body = await request.json()
      const { nickname, passwordHash, gender, age, favoriteMovies } = body
      if (!nickname || !passwordHash) {
        return new Response(JSON.stringify({ error: '缺少必填字段' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      }
      const existing = await env.NEXT_USERS?.get(`user:${nickname}`)
      if (existing) {
        return new Response(JSON.stringify({ error: '该昵称已被注册' }), { status: 409, headers: { 'Content-Type': 'application/json' } })
      }
      const userData = { nickname, passwordHash, gender, age, favoriteMovies: favoriteMovies || [], createdAt: Date.now() }
      if (env.NEXT_USERS) {
        await env.NEXT_USERS.put(`user:${nickname}`, JSON.stringify(userData))
      } else {
        // KV 未配置时回退 localStorage（不跨浏览器但至少能用）
        return new Response(JSON.stringify({ error: 'KV_NOT_CONFIGURED', user: null }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      const { passwordHash: _, ...safeUser } = userData
      return new Response(JSON.stringify({ success: true, user: safeUser }), { headers: { 'Content-Type': 'application/json' } })
    }

    // ═══ 用户登录 ═══
    if (path === '/api/auth/login' && request.method === 'POST') {
      const body = await request.json()
      const { nickname, passwordHash } = body
      const raw = env.NEXT_USERS ? await env.NEXT_USERS.get(`user:${nickname}`) : null
      if (!raw) {
        return new Response(JSON.stringify({ error: '该昵称未注册' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
      }
      const user = JSON.parse(raw)
      if (user.passwordHash !== passwordHash) {
        return new Response(JSON.stringify({ error: '密码错误' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
      }
      const { passwordHash: _, ...safeUser } = user
      // 返回交互数据
      const interactions = await (env.NEXT_USERS?.get(`int:${nickname}`) || '{}')
      safeUser.interactions = JSON.parse(interactions) || { likes: {}, favorites: {}, watched: {}, ratings: {} }
      return new Response(JSON.stringify({ success: true, user: safeUser }), { headers: { 'Content-Type': 'application/json' } })
    }

    // ═══ 保存交互数据 ═══
    if (path === '/api/auth/save-interactions' && request.method === 'POST') {
      const body = await request.json()
      const { nickname, interactions } = body
      if (nickname && env.NEXT_USERS) {
        await env.NEXT_USERS.put(`int:${nickname}`, JSON.stringify(interactions))
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

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
      const resp = await fetch(target, { cf: { cacheTtl: 86400, cacheEverything: true } })
      return new Response(resp.body, {
        status: resp.status,
        headers: { 'Content-Type': resp.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'public, max-age=86400, s-maxage=86400', 'CDN-Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' }
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
      const body = await request.text()
      const resp = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiKey}` },
        body: body
      })
      return new Response(resp.body, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    // ═══ 健康检查 ═══
    if (path === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString(), kv: !!env.NEXT_USERS }), {
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
