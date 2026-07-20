/**
 * 构建前预取 TMDB 数据，生成静态 JSON 文件嵌入网站
 * 用户访问时零 API 请求，所有数据直接从本地 JSON 读取
 * 部署到 Cloudflare Pages 后，每次 git push 自动刷新数据
 */
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../public/data')
mkdirSync(DATA_DIR, { recursive: true })

const API_KEY = process.env.VITE_TMDB_API_KEY || '42dace73a1c2b8df4438c9fb198bc7f2'
const BASE = 'https://api.tmdb.org/3'
const LANG = 'zh-CN'

async function fetchJSON(endpoint) {
  const url = `${BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}&language=${LANG}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${endpoint}`)
  return res.json()
}

async function main() {
  console.log('📦 预取 TMDB 数据...')
  
  // 并行获取所有数据
  const [trending, popular, topRated, genres] = await Promise.all([
    fetchJSON('/trending/movie/week'),
    fetchJSON('/movie/popular'),
    fetchJSON('/movie/top_rated'),
    fetchJSON('/genre/movie/list'),
  ])

  // 去重合并所有影片
  const all = {}
  ;[...trending.results, ...popular.results, ...topRated.results].forEach(m => { all[m.id] = m })
  const movies = Object.values(all).sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))

  const payload = {
    generatedAt: new Date().toISOString(),
    movies: movies.slice(0, 100).map(m => ({
      id: m.id,
      title: m.title || m.name,
      poster: m.poster_path,
      backdrop: m.backdrop_path,
      year: (m.release_date || m.first_air_date || '').slice(0, 4),
      rating: m.vote_average ? Number(m.vote_average).toFixed(1) : null,
      overview: (m.overview || '').slice(0, 200),
      genreIds: m.genre_ids || [],
      mediaType: m.media_type || 'movie',
    })),
    genres: (genres.genres || []).slice(0, 20),
    trending: (trending.results || []).slice(0, 10).map(m => m.id),
    popular: (popular.results || []).slice(0, 10).map(m => m.id),
    topRated: (topRated.results || []).slice(0, 10).map(m => m.id),
  }

  writeFileSync(resolve(DATA_DIR, 'home.json'), JSON.stringify(payload))
  console.log(`✅ 已生成 public/data/home.json (${payload.movies.length} 部影片)`)
}

main().catch(e => {
  console.error('❌ 预取失败:', e.message)
  // 失败时生成空数据文件，不影响构建
  writeFileSync(resolve(DATA_DIR, 'home.json'), JSON.stringify({ generatedAt: null, movies: [], genres: [], trending: [], popular: [], topRated: [] }))
  console.log('⚠️  已生成空数据文件，构建将继续')
})
