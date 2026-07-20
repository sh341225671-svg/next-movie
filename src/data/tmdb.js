// TMDB API 封装
// API 和图片都走本地后端代理，浏览器不直连任何被墙域名
// 开发模式：Vite 代理 → 后端
// 生产模式：Express 后端统一代理

const DEV = import.meta.env.DEV

// API 路径（开发走 Vite proxy，生产走 Express）
const BASE = '/api/tmdb'

function imgUrl(path, size = 'w500') {
  if (!path) return null
  // 统一走本地代理路径（开发走 Vite proxy，生产走 Express）
  // 浏览器不直连任何被墙域名
  return `/api/tmdb-img/t/p/${size}${path}`
}
const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '42dace73a1c2b8df4438c9fb198bc7f2'
const LANG = 'zh-CN'

async function fetchAPI(endpoint, params = {}, timeout = 5000) {
  // 构造查询参数
  const qs = new URLSearchParams({ api_key: API_KEY, language: LANG })
  Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, v))

  const url = `${BASE}${endpoint}?${qs}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  let res
  try {
    res = await fetch(url, { signal: controller.signal })
  } catch (e) {
    clearTimeout(timer)
    console.error(`[TMDB] 请求失败: ${url.slice(0, 80)}... — ${e.message}`)
    throw new Error(`网络请求失败，请检查网络`)
  }
  clearTimeout(timer)

  if (!res.ok) throw new Error(`TMDB ${res.status}: ${res.statusText}`)
  return res.json()
}

// ━━━ 推荐类 ━━━

export async function getTrending(type = 'movie', page = 1) {
  return fetchAPI(`/trending/${type}/week`, { page })
}

export async function getRecommendations(movieId, page = 1) {
  return fetchAPI(`/movie/${movieId}/recommendations`, { page })
}

export async function getSimilar(movieId, page = 1) {
  return fetchAPI(`/movie/${movieId}/similar`, { page })
}

// ━━━ 详情类 ━━━

export async function getMovieDetail(movieId) {
  return fetchAPI(`/movie/${movieId}`, {
    append_to_response: 'credits,videos,images'
  })
}

export async function getTvDetail(tvId) {
  return fetchAPI(`/tv/${tvId}`, {
    append_to_response: 'credits,videos,images'
  })
}

export async function getCredits(movieId) {
  return fetchAPI(`/movie/${movieId}/credits`)
}

export async function getImages(movieId) {
  return fetchAPI(`/movie/${movieId}/images`)
}

// ━━━ 搜索与发现 ━━━

export async function searchMulti(query, page = 1) {
  return fetchAPI('/search/multi', { query, page })
}

export async function discoverMovies(filters = {}) {
  return fetchAPI('/discover/movie', filters)
}

export async function getGenres() {
  return fetchAPI('/genre/movie/list')
}

// ━━━ 热门/高分 ━━━

export async function getPopular(page = 1) {
  return fetchAPI('/movie/popular', { page })
}

export async function getTopRated(page = 1) {
  return fetchAPI('/movie/top_rated', { page })
}

// ━━━ 播放源 ━━━

export async function getWatchProviders(movieId) {
  return fetchAPI(`/movie/${movieId}/watch/providers`)
}

// 中国视频平台搜索链接
const CN_PLATFORMS = [
  { name: '腾讯视频', url: (q) => `https://v.qq.com/x/search/?q=${encodeURIComponent(q)}`, icon: 'TX' },
  { name: '爱奇艺', url: (q) => `https://www.iqiyi.com/search/${encodeURIComponent(q)}.html`, icon: 'AQ' },
  { name: 'B站', url: (q) => `https://search.bilibili.com/all?keyword=${encodeURIComponent(q)}`, icon: 'BZ' },
  { name: '优酷', url: (q) => `https://www.youku.com/search?q=${encodeURIComponent(q)}`, icon: 'YK' },
  { name: '豆瓣', url: (q) => `https://www.douban.com/search?q=${encodeURIComponent(q)}`, icon: 'DB' },
]

// 免费视频源（用户验证可用）
const FREE_SOURCES = [
  { name: 'LIBVIO', url: (q) => `https://www.libvio.io/search/-------------.html?wd=${encodeURIComponent(q)}&submit=`, icon: '🎬' },
  { name: '大米星球', url: (q) => `https://www.dmq8a2x9s1.shop/vodsearch/-------------.html?wd=${encodeURIComponent(q)}`, icon: '🌾' },
  { name: '低端影视', url: (q) => `https://www.hpqianggui.com/UHDjwxI/-------------.html?wd=${encodeURIComponent(q)}`, icon: '📽️' },
]

export { CN_PLATFORMS, FREE_SOURCES }

// ━━━ 工具函数（格式化数据） ━━━

export function formatMovie(m) {
  return {
    id: m.id,
    title: m.title || m.name,
    originalTitle: m.original_title || m.original_name,
    poster: imgUrl(m.poster_path, 'w500'),
    backdrop: imgUrl(m.backdrop_path, 'original'),
    year: (m.release_date || m.first_air_date || '').slice(0, 4),
    rating: m.vote_average ? Number(m.vote_average).toFixed(1) : null,
    overview: m.overview || '',
    genreIds: m.genre_ids || [],
    mediaType: m.media_type || 'movie',
    voteCount: m.vote_count || 0
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
      id: c.id,
      name: c.name,
      character: c.character,
      photo: imgUrl(c.profile_path, 'w185')
    })) || [],
    director: d.credits?.crew?.find(c => c.job === 'Director')?.name || '',
    videos: d.videos?.results?.slice(0, 3) || [],
    images: d.images?.backdrops?.slice(0, 5).map(i => imgUrl(i.file_path, 'original')) || []
  }
}

// 格式化播放源数据
export function formatWatchProviders(data) {
  const result = { overseas: [], domestic: [] }

  const us = data?.results?.US
  if (us) {
    const platforms = new Set()
    ;[...(us.flatrate || []), ...(us.rent || []), ...(us.buy || [])].forEach(p => {
      if (!platforms.has(p.provider_id)) {
        platforms.add(p.provider_id)
        result.overseas.push({
          id: p.provider_id,
          name: p.provider_name,
          logo: imgUrl(p.logo_path, 'original'),
          type: us.flatrate?.some(x => x.provider_id === p.provider_id) ? '订阅' : '租借/购买'
        })
      }
    })
  }

  const cn = data?.results?.CN
  if (cn) {
    const platforms = new Set()
    ;[...(cn.flatrate || []), ...(cn.rent || []), ...(cn.buy || [])].forEach(p => {
      if (!platforms.has(p.provider_id)) {
        platforms.add(p.provider_id)
        result.domestic.push({
          id: p.provider_id,
          name: p.provider_name,
          logo: imgUrl(p.logo_path, 'original'),
          type: cn.flatrate?.some(x => x.provider_id === p.provider_id) ? '订阅' : '租借/购买'
        })
      }
    })
  }

  return result
}
