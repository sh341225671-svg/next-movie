// ═══ 本地推荐引擎（纯算法，零 API 请求） ═══
// 首页数据预取后，推荐通过本地类型匹配完成

import { formatMovie } from './tmdb'
import { getStaticData } from './tmdb'

let _candidates = null

// ━━━ 获取候选影片池（直接从静态数据，不依赖 sessionStorage） ━━━
export async function getCandidates() {
  if (_candidates) return _candidates
  const sd = await getStaticData()
  if (sd?.movies) {
    _candidates = sd.movies.map(formatMovie).filter(Boolean)
    return _candidates
  }
  return []
}

// ━━━ 智能推荐 ━━━
export async function getProfileRecommendations(user, interactions, seed = 0) {
  const candidates = await getCandidates()
  if (!candidates.length) return []

  const favIds = new Set()
  user?.favoriteMovies?.forEach(m => { if (m.id) favIds.add(m.id) })
  Object.keys(interactions?.favorites || {}).forEach(id => favIds.add(Number(id)))
  Object.entries(interactions?.ratings || {}).forEach(([id, r]) => { if (r.score >= 7) favIds.add(Number(id)) })
  
  const watchedSet = new Set(Object.keys(interactions?.watched || {}).map(Number))
  const genreScore = {}
  const addGenre = (ids, w) => { (ids || []).forEach(g => { genreScore[g] = (genreScore[g] || 0) + w }) }
  user?.favoriteMovies?.forEach(m => addGenre(m.genre_ids || m.genreIds, 3))
  Object.entries(interactions?.ratings || {}).forEach(([id, r]) => { if (r.score >= 7) addGenre(r.genreIds, 2) })
  
  const topGenres = Object.entries(genreScore).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => Number(e[0]))
  
  let matched = candidates.filter(m => !watchedSet.has(m.id) && !favIds.has(m.id) && m.genreIds?.some(g => topGenres.includes(g)))
  
  // 种子排序，保证每次换一批不同结果
  matched.sort((a, b) => {
    const aS = (a.genreIds || []).filter(g => topGenres.includes(g)).length
    const bS = (b.genreIds || []).filter(g => topGenres.includes(g)).length
    if (aS !== bS) return bS - aS
    return ((parseFloat(a.rating || 0) * 7 + seed * 137) % 100) - ((parseFloat(b.rating || 0) * 7 + seed * 137) % 100)
  })

  const result = matched.slice(0, 6).map(m => ({ movie: m, reason: reasonText(m, topGenres), tier: '推荐' }))

  // 不够6部则从候选池补
  if (result.length < 6) {
    const used = new Set(result.map(r => r.movie.id))
    for (const c of candidates.sort((a, b) => parseFloat(b.rating||0) - parseFloat(a.rating||0))) {
      if (result.length >= 6) break
      if (used.has(c.id) || watchedSet.has(c.id)) continue
      result.push({ movie: c, reason: `评分${c.rating}，口碑稳定`, tier: '备选' })
      used.add(c.id)
    }
  }
  return result
}

// ━━━ 文字提问推荐 ━━━
export async function getTextRecommendations(query, user, interactions) {
  const candidates = await getCandidates()
  if (!candidates.length) return []
  const watchedSet = new Set(Object.keys(interactions?.watched || {}).map(Number))
  
  // 先试 AI
  try {
    const aiKey = import.meta.env.VITE_AI_API_KEY
    if (aiKey) {
      const prompt = `用户说:${query.slice(0,80)}。从候选推荐6部最匹配的,每部给20-30字精准理由。候选:${candidates.slice(0,12).map(m=>`${m.title}(${m.year})${m.rating}分`).join(';')}\n\nJSON:{"recommendations":[{"title":"","year":"","tier":"首选/次选/备选","reason":"20-30字理由"}]}`
      const res = await fetch('/api/ai/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({model:'deepseek-v4-flash', messages:[{role:'system',content:'直接输出JSON不要思考'},{role:'user',content:prompt}], max_tokens:4096, temperature:0.3})
      })
      if (res.ok) {
        const data = await res.json()
        let content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || ''
        let parsed = null
        try { parsed = JSON.parse(content) } catch {}
        if (!parsed) { const m = content.match(/\{[\s\S]*\}/); if (m) try { parsed = JSON.parse(m[0]) } catch {} }
        if (parsed?.recommendations?.length) {
          return parsed.recommendations.slice(0, 6).map(rec => {
            const match = candidates.find(m => m.title === rec.title || m.title?.includes(rec.title) || rec.title?.includes(m.title))
            return match && !watchedSet.has(match.id) ? { ...rec, movie: match } : null
          }).filter(Boolean)
        }
      }
    }
  } catch {}
  
  // AI 降级 → 关键词匹配
  const q = query.toLowerCase()
  const kw = q.split(/[\s,\.!\?;:\u3000-\u303f\uff00-\uffef]+/).filter(w => w.length >= 2)
  const genreNames = {动作:28,冒险:12,动画:16,喜剧:35,犯罪:80,纪录:99,剧情:18,家庭:10751,奇幻:14,历史:36,恐怖:27,音乐:10402,悬疑:9648,爱情:10749,科幻:878,惊悚:53,战争:10752,西部:37}
  const inferredG = new Set()
  kw.forEach(k => Object.entries(genreNames).forEach(([n,id]) => { if (k.includes(n)||n.includes(k)) inferredG.add(id) }))
  
  const scored = candidates.filter(m => !watchedSet.has(m.id)).map(m => {
    let s = 0; const t = (m.title||'').toLowerCase(), o = (m.overview||'').toLowerCase()
    kw.forEach(k => { if (t.includes(k)) s += 5; if (o.includes(k)) s += 2 })
    if (inferredG.size > 0) s += (m.genreIds||[]).filter(g => inferredG.has(g)).length * 3
    const r = parseFloat(m.rating||0); if (r >= 8) s += 2; else if (r >= 7) s += 1
    return { movie: m, score: s }
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score)
  
  const result = scored.slice(0, 6).map(s => ({ movie: s.movie, reason: reasonText(s.movie, inferredG), tier: '推荐' }))
  if (result.length < 6) {
    const used = new Set(result.map(r => r.movie.id))
    for (const c of [...candidates].sort((a,b) => parseFloat(b.rating||0)-parseFloat(a.rating||0))) {
      if (result.length >= 6) break
      if (used.has(c.id) || watchedSet.has(c.id)) continue
      result.push({ movie: c, reason: `评分${c.rating}，口碑稳定`, tier: '备选' })
      used.add(c.id)
    }
  }
  return result
}

function reasonText(movie, topGenres) {
  const gn = id => ({28:'动作',12:'冒险',16:'动画',35:'喜剧',80:'犯罪',99:'纪录',18:'剧情',10751:'家庭',14:'奇幻',36:'历史',27:'恐怖',10402:'音乐',9648:'悬疑',10749:'爱情',878:'科幻',53:'惊悚',10752:'战争',37:'西部'})[id] || ''
  const matched = (movie.genreIds || []).filter(g => [...topGenres].includes(g))
  const gs = matched.map(gn).filter(Boolean).join('/')
  const r = movie.rating || '?'
  if (matched.length >= 2 && gs) return `${gs}类型，评分${r}`
  if (matched.length === 1 && gs) return `${gs}类型，评分${r}`
  if (parseFloat(r) >= 8) return `评分${r}，口碑佳作`
  return `评分${r}，口碑稳定`
}

// 为了兼容旧的导入引用
export function getCachedCandidates() { return [] }
export function matchRecommendations(recs, _) { return recs }
