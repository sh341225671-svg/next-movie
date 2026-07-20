// ═══ 推荐引擎 ═══
import { getTrending, getPopular, getTopRated, discoverMovies, getGenres, formatMovie, searchMulti } from './tmdb'

// ━━━ 数据收集层 ━━━

export function buildUserProfile(user, interactions) {
  const profile = {
    age: user?.age || 0,
    gender: user?.gender || '',
    favoriteMovies: user?.favoriteMovies || [],
    likedGenres: {},
    ratedMovies: [],
    watchedMovies: [],
    favoritedMovies: [],
  }
  if (interactions?.ratings) {
    Object.entries(interactions.ratings).forEach(([id, r]) => {
      profile.ratedMovies.push({ movieId: Number(id), score: r.score })
    })
  }
  if (interactions?.watched) {
    profile.watchedMovies = Object.keys(interactions.watched).map(Number)
  }
  if (interactions?.favorites) {
    profile.favoritedMovies = Object.keys(interactions.favorites).map(Number)
  }
  return profile
}

export async function getCandidates(profile, limit = 30) {
  const cacheKey = 'next_candidates'
  const cached = sessionStorage.getItem(cacheKey)
  if (cached) {
    try { return JSON.parse(cached) } catch {}
  }
  const [trendingData, popularData, topRatedData] = await Promise.all([
    getTrending('movie', 1),
    getPopular(1),
    getTopRated(1)
  ])
  let all = [
    ...(trendingData.results || []),
    ...(popularData.results || []),
    ...(topRatedData.results || [])
  ]
  const seen = new Set()
  all = all.filter(m => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
  const watchedSet = new Set(profile.watchedMovies || [])
  all = all.filter(m => !watchedSet.has(m.id))
  all.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
  all = all.slice(0, limit)
  const result = all.map(formatMovie)
  try { sessionStorage.setItem(cacheKey, JSON.stringify(result)) } catch {}
  return result
}

// ━━━ AI 调用 ━━━
const AI_BASE = '/api/ai'
const AI_MODEL = 'deepseek-v4-flash'

async function callAI(prompt) {
  const res = await fetch(`${AI_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: '直接输出JSON，不要任何思考过程。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 8192
    })
  })
  if (!res.ok) throw new Error(`AI API ${res.status}`)
  const data = await res.json()
  // 优先用 content，如果为空则用 reasoning_content
  let content = data.choices?.[0]?.message?.content || ''
  if (!content) {
    content = data.choices?.[0]?.message?.reasoning_content || ''
  }
  try { return JSON.parse(content) } catch {}
  const m = content.match(/\{[\s\S]*\}/)
  if (m) try { return JSON.parse(m[0]) } catch {}
  throw new Error('AI 返回格式异常: ' + content.slice(0,100))
}

// ━━━ 模式A：画像推荐 ━━━
// ━━━ 模式A：画像推荐 ━━━
function buildProfilePrompt(profile, candidates) {
  const likes = profile.ratedMovies.filter(r => r.score >= 7).map(r => r.movieId).join(',')
  const favs = profile.favoritedMovies.join(',')
  const watched = profile.watchedMovies.join(',')
  const favTitles = profile.favoriteMovies?.map(m => m.title).filter(Boolean).join('、') || '暂无'
  return `用户${profile.age}岁${profile.gender === 'male' ? '男' : '女'}。
收藏影片:${favTitles}
高评分电影ID:${likes}
收藏电影ID:${favs}
已看过(不要再推荐):${watched}

基于用户收藏和高评分的影片类型偏好，从候选推荐6部电影（排除已看过的），必须够6部。每部给专业理由。

候选:${candidates.slice(0,15).map(m => `${m.title}(${m.year})${m.rating}分`).join(';')}

输出JSON:{"recommendations":[{"title":"","year":"","tier":"首选或次选或备选","reason":"30-50字专业理由"}]}`
}

// ━━━ 模式B：自由文本（AI全链路分析） ━━━
function buildTextPrompt(query, candidates) {
  return `专业电影推荐AI。按框架分析后输出JSON，必须推荐6部不同的电影。

【分析框架(内部思考)】
1.提取核心要素:题材/制作/场面/情绪
2.深层需求推导
3.筛选标准:候选池匹配(≥3项)
4.排序:首选/次选/备选

【用户输入】${query.slice(0,120)}

【候选影片】
${candidates.slice(0,15).map(m => `${m.title}(${m.year})${m.rating}分`).join(';')}

输出JSON(必须6部):{"recommendations":[{"title":"","year":"","tier":"首选或次选或备选","reason":"专业理由(30-50字)"}]}`
}

// 固定输出6部推荐的辅助函数
const REC_COUNT = 6

function ensureCount(recs, candidates) {
  const result = [...recs]
  const usedTitles = new Set(recs.map(r => (r.movie?.title || r.title || '')).filter(Boolean))
  for (const c of candidates) {
    if (result.length >= REC_COUNT) break
    if (usedTitles.has(c.title)) continue
    result.push({ movie: c, reason: `高分推荐 · ${c.rating}分`, tier: '备选' })
    usedTitles.add(c.title)
  }
  return result
}

// ━━━ 模式A：基于画像 ━━━
export async function getProfileRecommendations(user, interactions) {
  const profile = buildUserProfile(user, interactions)
  const candidates = await getCandidates(profile)
  try {
    const result = await callAI(buildProfilePrompt(profile, candidates))
    if (result?.recommendations?.length) {
      return ensureCount(matchRecommendations(result.recommendations, candidates), candidates)
    }
  } catch (e) { console.warn('[推荐] AI不可用，降级算法', e.message) }
  return ensureCount(getFallbackRecommendations(profile, candidates), candidates)
}

// ━━━ 模式B：基于文本 ━━━
export async function getTextRecommendations(query, user, interactions) {
  const profile = buildUserProfile(user, interactions)
  const candidates = await getCandidates(profile)
  
  try {
    const result = await callAI(buildTextPrompt(query, candidates))
    if (result?.recommendations?.length) {
      const matched = matchRecommendations(result.recommendations, candidates)
      for (const rec of matched) {
        if (!rec.movie) {
          try {
            const data = await searchMulti(rec.title, 1)
            if (data.results?.length) rec.movie = formatMovie(data.results[0])
          } catch {}
        }
      }
      return ensureCount(matched, candidates)
    }
  } catch (e) { console.warn('[推荐] AI失败，尝试TMDB搜索', e.message) }
  
  try {
    const data = await searchMulti(query, 1)
    const hits = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    if (hits.length >= 2) {
      const tmdbRecs = hits.slice(0, 6).map(formatMovie).map(m => ({
        movie: m, reason: `与「${query.slice(0,12)}」相关 · ${m.rating}分`
      }))
      return ensureCount(tmdbRecs, candidates)
    }
  } catch {}
  
  return ensureCount(candidates.slice(0, 6).map(m => ({
    movie: m, reason: `高分推荐 · ${m.rating}分`
  })), candidates)
}

// ━━━ 降级方案 ━━━
function getFallbackRecommendations(profile, candidates) {
  const favGenreIds = new Set()
  profile.favoriteMovies?.forEach(m => {
    (m.genre_ids || m.genreIds || []).forEach(g => favGenreIds.add(g))
  })
  if (favGenreIds.size > 0) {
    const matched = candidates
      .filter(m => m.genreIds?.some(g => favGenreIds.has(g)))
      .sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0))
      .slice(0, 6)
    if (matched.length >= 2) return matched.map(m => ({
      movie: m,
      reason: `与您收藏影片类型相符·${m.rating}分`
    }))
  }
  return candidates.slice(0, 6).map(m => ({
    movie: m,
    reason: `高分推荐·${m.rating}分`
  }))
}

// ━━━ 匹配 TMDB 数据 ━━━
export function matchRecommendations(recs, candidates) {
  return recs.map(rec => {
    // 先在候选列表中匹配
    const match = candidates.find(m =>
      m.title === rec.title || m.title?.includes(rec.title) || rec.title?.includes(m.title) ||
      m.originalTitle === rec.title
    )
    return match ? { ...rec, movie: match } : rec
  })
}
