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

// ━━━ 文字提问推荐（强化关键词匹配） ━━━
export function getTextRecommendations(query, user, interactions) {
  const profile = buildUserProfile(user, interactions)
  const candidates = getCachedCandidates()
  const watchedSet = new Set(profile.watchedMovies)
  const q = query.toLowerCase()
  
  // 提取关键词（保留更多中文词汇）
  const keywords = q.split(/[\s,\.!\?;:\u3000-\u303f\uff00-\uffef]+/).filter(w => w.length >= 2 && !'的了我喜欢看非常很特别最和与要请给想找一部些个之类像那样被在有了'.includes(w))
  
  // 类型名称映射
  const genreNames = { 动作:28, 冒险:12, 动画:16, 喜剧:35, 犯罪:80, 纪录:99, 剧情:18, 家庭:10751, 奇幻:14, 历史:36, 恐怖:27, 音乐:10402, 悬疑:9648, 爱情:10749, 科幻:878, 惊悚:53, 战争:10752, 西部:37 }
  
  // 从关键词推断类型
  const inferredGenres = new Set()
  keywords.forEach(k => {
    Object.entries(genreNames).forEach(([name, id]) => {
      if (k.includes(name) || name.includes(k)) inferredGenres.add(id)
    })
  })
  
  // 评分候选
  let scored = candidates
    .filter(m => !watchedSet.has(m.id))
    .map(m => {
      let score = 0
      const title = (m.title || '').toLowerCase()
      const overview = (m.overview || '').toLowerCase()
      
      // 标题匹配（高权重）
      keywords.forEach(k => {
        if (title.includes(k)) score += 5
        if (overview.includes(k)) score += 2
      })
      
      // 类型匹配
      if (inferredGenres.size > 0) {
        const matchCount = (m.genreIds || []).filter(g => inferredGenres.has(g)).length
        score += matchCount * 3
      }
      
      // 评分加成
      const rating = parseFloat(m.rating || 0)
      if (rating >= 8) score += 2
      else if (rating >= 7) score += 1
      
      return { movie: m, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
  
  const result = scored.slice(0, 6).map(s => ({
    movie: s.movie,
    reason: typeToReason(s.movie, inferredGenres, {}),
    tier: '推荐'
  }))
  
  // 不够6部补高分
  if (result.length < 6) {
    const usedIds = new Set(result.map(r => r.movie.id))
    for (const c of [...candidates].sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0))) {
      if (result.length >= 6) break
      if (usedIds.has(c.id) || watchedSet.has(c.id)) continue
      result.push({ movie: c, reason: `高分推荐 · ${c.rating}分`, tier: '备选' })
      usedIds.add(c.id)
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
  const matchedG = (movie.genreIds || []).filter(g => topGenres.includes(g))
  if (matchedG.length >= 2) return `与你喜欢的类型高度匹配 · ${movie.rating}分`
  if (matchedG.length === 1) return `与你喜欢的「${genreName(matchedG[0])}」类型相符 · ${movie.rating}分`
  return `高分推荐 · ${movie.rating}分`
}

function genreName(id) {
  const names = { 28:'动作',12:'冒险',16:'动画',35:'喜剧',80:'犯罪',99:'纪录',18:'剧情',10751:'家庭',14:'奇幻',36:'历史',27:'恐怖',10402:'音乐',9648:'悬疑',10749:'爱情',878:'科幻',10770:'电视',53:'惊悚',10752:'战争',37:'西部'}
  return names[id] || ''
}
