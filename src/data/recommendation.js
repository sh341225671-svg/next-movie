// ═══ 本地推荐引擎（纯算法，零 API 请求） ═══
// 首页数据预取后，推荐通过本地类型匹配完成，不调任何外部 API

import { getStaticData, formatMovie } from './tmdb'

// ━━━ 构建用户画像 ━━━
export function buildUserProfile(user, interactions) {
  return {
    age: user?.age || 0,
    gender: user?.gender || '',
    favoriteMovies: user?.favoriteMovies || [],
    ratedMovies: interactions?.ratings ? Object.entries(interactions.ratings).map(([id, r]) => ({ movieId: Number(id), score: r.score, genreIds: r.genreIds || [] })) : [],
    watchedMovies: interactions?.watched ? Object.keys(interactions.watched).map(Number) : [],
    favoritedMovies: interactions?.favorites ? Object.keys(interactions.favorites).map(Number) : [],
  }
}

// ━━━ 获取候选影片池 ━━━
export async function getCandidates() {
  const sd = await getStaticData()
  if (sd?.movies) return sd.movies.map(formatMovie).filter(Boolean)
  return []
}

// ━━━ 智能推荐（基于收藏+评分+喜好类型匹配） ━━━
export function getProfileRecommendations(user, interactions) {
  const profile = buildUserProfile(user, interactions)
  const candidates = getCachedCandidates()
  
  // 收藏影片的 ID 列表
  const favIds = new Set(profile.favoriteMovies?.map(m => m.id || m.movie_id)?.filter(Boolean) || [])
  profile.favoritedMovies.forEach(id => favIds.add(id))
  profile.ratedMovies.filter(r => r.score >= 7).forEach(r => favIds.add(r.movieId))
  
  // 排除已看过
  const watchedSet = new Set(profile.watchedMovies)
  
  // 统计用户喜欢的类型
  const genreScore = {}
  const countGenres = (ids, weight) => { (ids || []).forEach(g => { genreScore[g] = (genreScore[g] || 0) + weight }) }
  
  // 收藏影片的类型权重 3
  profile.favoriteMovies?.forEach(m => countGenres(m.genre_ids || m.genreIds || [], 3))
  // 高评分影片的类型权重 2
  profile.ratedMovies.filter(r => r.score >= 7).forEach(r => countGenres(r.genreIds, 2))
  // 收藏的类型权重 2
  profile.favoritedMovies.forEach(id => {
    const m = candidates.find(c => c.id === id)
    if (m) countGenres(m.genreIds, 2)
  })
  
  const topGenres = Object.entries(genreScore).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => Number(e[0]))
  
  // 按类型匹配候选
  let matched = candidates.filter(m =>
    !watchedSet.has(m.id) &&
    !favIds.has(m.id) &&
    m.genreIds?.some(g => topGenres.includes(g))
  )
  
  // 按匹配度排序
  matched.sort((a, b) => {
    const aScore = (a.genreIds || []).filter(g => topGenres.includes(g)).length
    const bScore = (b.genreIds || []).filter(g => topGenres.includes(g)).length
    return bScore - aScore || parseFloat(b.rating || 0) - parseFloat(a.rating || 0)
  })
  
  const result = matched.slice(0, 6).map(m => ({
    movie: m,
    reason: typeToReason(m, topGenres, genreScore),
    tier: '推荐'
  }))
  
  // 不够 6 部就补
  if (result.length < 6) {
    const usedIds = new Set(result.map(r => r.movie.id))
    for (const c of candidates) {
      if (result.length >= 6) break
      if (usedIds.has(c.id) || watchedSet.has(c.id)) continue
      result.push({ movie: c, reason: `高分推荐 · ${c.rating}分`, tier: '备选' })
      usedIds.add(c.id)
    }
  }
  
  return result.slice(0, 6)
}

// ━━━ 文字提问推荐（先 AI 后算法降级） ━━━
export async function getTextRecommendations(query, user, interactions) {
  const profile = buildUserProfile(user, interactions)
  const candidates = getCachedCandidates()
  const watchedSet = new Set(profile.watchedMovies)
  
  // 先试 AI（DeepSeek 直连）
  try {
    const aiKey = import.meta.env.VITE_AI_API_KEY
    if (aiKey) {
      const prompt = `你是一个专业电影推荐顾问。用户说：${query.slice(0, 100)}
从候选影片中推荐6部最匹配的，每部给50字以上的个性化推荐理由（贴合用户需求+电影特色）。
按匹配度排序（首选/次选/备选）。
候选影片：${candidates.slice(0, 15).map(m => `${m.title}(${m.year})${m.rating}分-${(m.overview||'').slice(0,30)}`).join(';')}

输出严格JSON格式：{"recommendations":[{"title":"片名","year":"年份","tier":"首选/次选/备选","reason":"50字以上理由"}]}`

      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiKey}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '直接输出JSON，不要思考过程。' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4096,
          temperature: 0.3
        })
      })
      if (res.ok) {
        const data = await res.json()
        let content = data.choices?.[0]?.message?.content || ''
        // 回退到 reasoning_content
        if (!content) content = data.choices?.[0]?.message?.reasoning_content || ''
        const parsed = tryParseJSON(content)
        if (parsed?.recommendations?.length) {
          // 匹配电影数据
          return parsed.recommendations.slice(0, 6).map(rec => {
            const match = candidates.find(m =>
              m.title === rec.title || m.title?.includes(rec.title) || rec.title?.includes(m.title)
            )
            return match ? { ...rec, movie: match } : { movie: null, title: rec.title, year: rec.year, tier: rec.tier, reason: rec.reason }
          }).filter(r => r.movie && !watchedSet.has(r.movie.id))
        }
      }
    }
  } catch (e) { console.warn('[推荐] AI不可用，使用算法降级', e.message) }
  
  // AI 降级 → 关键词匹配（同上）
  return getKeywordRecommendations(query, candidates, watchedSet)
}

function tryParseJSON(text) {
  try { return JSON.parse(text) } catch {}
  const m = text.match(/\{[\s\S]*\}/)
  if (m) try { return JSON.parse(m[0]) } catch {}
  return null
}

// 关键词降级匹配
function getKeywordRecommendations(query, candidates, watchedSet) {
  const q = query.toLowerCase()
  const keywords = q.split(/[\s,\.!\?;:\u3000-\u303f\uff00-\uffef]+/).filter(w => w.length >= 2 && !'的了我喜欢看非常很特别最和与要请给想找一部些个之类像那样被在有了'.includes(w))
  const genreNames = { 动作:28, 冒险:12, 动画:16, 喜剧:35, 犯罪:80, 纪录:99, 剧情:18, 家庭:10751, 奇幻:14, 历史:36, 恐怖:27, 音乐:10402, 悬疑:9648, 爱情:10749, 科幻:878, 惊悚:53, 战争:10752, 西部:37 }
  const inferredGenres = new Set()
  keywords.forEach(k => Object.entries(genreNames).forEach(([n, id]) => { if (k.includes(n) || n.includes(k)) inferredGenres.add(id) }))
  
  const scored = candidates.filter(m => !watchedSet.has(m.id)).map(m => {
    let score = 0
    const t = (m.title||'').toLowerCase(), o = (m.overview||'').toLowerCase()
    keywords.forEach(k => { if (t.includes(k)) score += 5; if (o.includes(k)) score += 2 })
    if (inferredGenres.size > 0) score += (m.genreIds||[]).filter(g => inferredGenres.has(g)).length * 3
    const r = parseFloat(m.rating||0)
    if (r >= 8) score += 2; else if (r >= 7) score += 1
    return { movie: m, score }
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score)
  
  const result = scored.slice(0, 6).map(s => ({ movie: s.movie, reason: typeToReason(s.movie, inferredGenres, {}), tier: '推荐' }))
  if (result.length < 6) {
    const used = new Set(result.map(r => r.movie.id))
    for (const c of [...candidates].sort((a,b) => parseFloat(b.rating||0) - parseFloat(a.rating||0))) {
      if (result.length >= 6) break
      if (used.has(c.id) || watchedSet.has(c.id)) continue
      result.push({ movie: c, reason: `高分推荐·${c.rating}分。${(c.overview||'').slice(0,30)}`, tier: '备选' })
      used.add(c.id)
    }
  }
  return result.slice(0, 6)
}

// ━━━ 匹配 ━━━
export function matchRecommendations(recs, candidates) {
  return recs.map(rec => {
    if (rec.movie) return rec
    const match = candidates.find(m => m.title === rec.title || m.title?.includes(rec.title) || rec.title?.includes(m.title))
    return match ? { ...rec, movie: match } : rec
  })
}

// ━━━ 工具 ━━━
function getCachedCandidates() {
  try {
    const raw = sessionStorage.getItem('next_candidates')
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function typeToReason(movie, topGenres, genreScore) {
  const matchedG = (movie.genreIds || []).filter(g => topGenres.has ? topGenres.has(g) : topGenres.includes(g))
  const gn = g => ({28:'动作',12:'冒险',16:'动画',35:'喜剧',80:'犯罪',99:'纪录',18:'剧情',10751:'家庭',14:'奇幻',36:'历史',27:'恐怖',10402:'音乐',9648:'悬疑',10749:'爱情',878:'科幻',53:'惊悚',10752:'战争',37:'西部'})[g] || ''
  const genreStr = matchedG.map(gn).filter(Boolean).join('、')
  const rating = movie.rating || '?'
  const overview = (movie.overview || '').slice(0, 40)
  
  if (matchedG.length >= 2 && genreStr.length > 3) {
    return `你喜欢${genreStr}这类影片，而《${movie.title}》正是${genreStr}类型的代表作，评分${rating}分，品质有保障。${overview}`
  }
  if (matchedG.length === 1 && genreStr) {
    const n = gn(matchedG[0]) || ''
    return `与你喜欢的${n}类型完全吻合。《${movie.title}》评分高达${rating}分，是同类型中的口碑佳作。${overview}`
  }
  if (parseFloat(rating) >= 8) {
    return `高分佳作推荐！《${movie.title}》获得${rating}分的超高评价，无论剧情、演技还是制作都属顶级水准。${overview}`
  }
  return `值得一看的优质影片。《${movie.title}》评分${rating}分，口碑良好。${overview}`
}
