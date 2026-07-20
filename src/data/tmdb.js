// TMDB API 封装
// 首页数据由构建脚本预取（public/data/home.json），零运行时 API 请求
// 其他页面（搜索、详情、发现、播放源）按需调 API

const DEV = import.meta.env.DEV
const BASE = '/api/tmdb'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '42dace73a1c2b8df4438c9fb198bc7f2'
const LANG = 'zh-CN'

// ━━━ 静态数据（构建时预取） ━━━
let _staticData = null
export async function getStaticData() {
  if (_staticData) return _staticData
  try {
    const resp = await fetch('/data/home.json')
    if (resp.ok) { _staticData = await resp.json(); return _staticData }
  } catch {}
  return null
}

function imgUrl(path, size = 'w500') {
  if (!path) return null
  // 直连 image.tmdb.org（已验证国内可访问）
  return `https://image.tmdb.org/t/p/${size}${path}`
}

// ━━━ API 请求（仅用于搜索/详情/发现等无法预取的页面） ━━━
async function fetchAPI(endpoint, params = {}, timeout = 8000) {
  const qs = new URLSearchParams({ api_key: API_KEY, language: LANG })
  Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, v))
  // 缓存 1 小时
  const cacheKey = `tmdb_${endpoint}_${qs}`
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const p = JSON.parse(cached)
      if (Date.now() - p.ts < 3600000) return p.data
    }
  } catch {}
  const url = `${BASE}${endpoint}?${qs}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  let res
  try { res = await fetch(url, { signal: ctrl.signal }) }
  catch (e) { clearTimeout(timer); throw new Error('网络请求失败') }
  clearTimeout(timer)
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  const data = await res.json()
  try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data })) } catch {}
  return data
}

// ━━━ 首页推荐类（从静态数据读取） ━━━

export async function getTrending(type = 'movie', page = 1) {
  const sd = await getStaticData()
  if (sd && page === 1) return { results: sd.trending.map(id => sd.movies.find(m => m.id === id)).filter(Boolean) }
  return fetchAPI(`/trending/${type}/week`, { page })
}

export async function getPopular(page = 1) {
  const sd = await getStaticData()
  if (sd && page === 1) return { results: sd.popular.map(id => sd.movies.find(m => m.id === id)).filter(Boolean) }
  return fetchAPI('/movie/popular', { page })
}

export async function getTopRated(page = 1) {
  const sd = await getStaticData()
  if (sd && page === 1) return { results: sd.topRated.map(id => sd.movies.find(m => m.id === id)).filter(Boolean) }
  return fetchAPI('/movie/top_rated', { page })
}

export async function getGenres() {
  const sd = await getStaticData()
  if (sd?.genres) return { genres: sd.genres }
  return fetchAPI('/genre/movie/list')
}

// ━━━ 需要实时 API 的 ━━━

export async function getRecommendations(movieId, page = 1) {
  return fetchAPI(`/movie/${movieId}/recommendations`, { page })
}

export async function getSimilar(movieId, page = 1) {
  return fetchAPI(`/movie/${movieId}/similar`, { page })
}

export async function getMovieDetail(movieId) {
  return fetchAPI(`/movie/${movieId}`, { append_to_response: 'credits,videos,images' })
}

export async function getTvDetail(tvId) {
  return fetchAPI(`/tv/${tvId}`, { append_to_response: 'credits,videos,images' })
}

export async function getCredits(movieId) {
  return fetchAPI(`/movie/${movieId}/credits`)
}

export async function getImages(movieId) {
  return fetchAPI(`/movie/${movieId}/images`)
}

export async function searchMulti(query, page = 1) {
  return fetchAPI('/search/multi', { query, page })
}

export async function discoverMovies(filters = {}) {
  return fetchAPI('/discover/movie', filters)
}

export async function getWatchProviders(movieId) {
  return fetchAPI(`/movie/${movieId}/watch/providers`)
}

// ━━━ 免费源 ━━━

const CN_PLATFORMS = [
  { name: '腾讯视频', url: (q) => `https://v.qq.com/x/search/?q=${encodeURIComponent(q)}`, icon: 'TX' },
  { name: '爱奇艺', url: (q) => `https://www.iqiyi.com/search/${encodeURIComponent(q)}.html`, icon: 'AQ' },
  { name: 'B站', url: (q) => `https://search.bilibili.com/all?keyword=${encodeURIComponent(q)}`, icon: 'BZ' },
  { name: '优酷', url: (q) => `https://www.youku.com/search?q=${encodeURIComponent(q)}`, icon: 'YK' },
  { name: '豆瓣', url: (q) => `https://www.douban.com/search?q=${encodeURIComponent(q)}`, icon: 'DB' },
]

const FREE_SOURCES = [
  { name: 'LIBVIO', url: (q) => `https://www.libvio.io/search/-------------.html?wd=${encodeURIComponent(q)}&submit=`, icon: '🎬' },
  { name: '大米星球', url: (q) => `https://www.dmq8a2x9s1.shop/vodsearch/-------------.html?wd=${encodeURIComponent(q)}`, icon: '🌾' },
  { name: '低端影视', url: (q) => `https://www.hpqianggui.com/UHDjwxI/-------------.html?wd=${encodeURIComponent(q)}`, icon: '📽️' },
]

export { CN_PLATFORMS, FREE_SOURCES }

// ━━━ 格式化 ━━━

export function formatMovie(m) {
  if (!m) return null
  return {
    id: m.id,
    title: m.title || m.name || '',
    originalTitle: m.original_title || m.original_name || '',
    poster: imgUrl(m.poster_path || m.poster, 'w500'),
    backdrop: imgUrl(m.backdrop_path || m.backdrop, 'original'),
    year: (m.release_date || m.first_air_date || m.year || '').slice(0, 4),
    rating: (m.vote_average || m.rating) ? Number(m.vote_average || m.rating).toFixed(1) : null,
    overview: m.overview || '',
    genreIds: m.genre_ids || m.genreIds || [],
    mediaType: m.media_type || m.mediaType || 'movie',
  }
}

export function formatMovieDetail(d) {
  return {
    id: d.id,
    title: d.title || d.name,
    originalTitle: d.original_title || d.original_name,
    tagline: d.tagline || '',
    overview: d.overview || '',
    poster: imgUrl(d.poster_path, 'w500'),
    backdrop: imgUrl(d.backdrop_path, 'original'),
    year: (d.release_date || d.first_air_date || '').slice(0, 4),
    rating: d.vote_average ? Number(d.vote_average).toFixed(1) : null,
    runtime: d.runtime || 0,
    genres: d.genres?.map(g => ({ id: g.id, name: g.name })) || [],
    genreIds: d.genres?.map(g => g.id) || [],
    cast: d.credits?.cast?.slice(0, 8).map(c => ({
      id: c.id, name: c.name, character: c.character,
      photo: imgUrl(c.profile_path, 'w185')
    })) || [],
    director: d.credits?.crew?.find(c => c.job === 'Director')?.name || '',
    videos: d.videos?.results?.slice(0, 3) || [],
    images: d.images?.backdrops?.slice(0, 5).map(i => imgUrl(i.file_path, 'original')) || []
  }
}

export function formatWatchProviders(data) {
  const result = { overseas: [], domestic: [] }
  const us = data?.results?.US
  if (us) {
    const seen = new Set()
    ;[...(us.flatrate || []), ...(us.rent || []), ...(us.buy || [])].forEach(p => {
      if (!seen.has(p.provider_id)) {
        seen.add(p.provider_id)
        result.overseas.push({ id: p.provider_id, name: p.provider_name, logo: imgUrl(p.logo_path, 'original'), type: us.flatrate?.some(x => x.provider_id === p.provider_id) ? '订阅' : '租借/购买' })
      }
    })
  }
  const cn = data?.results?.CN
  if (cn) {
    const seen = new Set()
    ;[...(cn.flatrate || []), ...(cn.rent || []), ...(cn.buy || [])].forEach(p => {
      if (!seen.has(p.provider_id)) {
        seen.add(p.provider_id)
        result.domestic.push({ id: p.provider_id, name: p.provider_name, logo: imgUrl(p.logo_path, 'original'), type: cn.flatrate?.some(x => x.provider_id === p.provider_id) ? '订阅' : '租借/购买' })
      }
    })
  }
  return result
}
