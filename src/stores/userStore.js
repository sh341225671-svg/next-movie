import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const isLoggedIn = computed(() => !!user.value)

  // ═══ 用户交互数据（持久化用 localStorage） ═══

  // 评分：{ movieId: { score: 1-10, timestamp } }
  const ratings = ref(loadFromStorage('next_ratings', {}))
  // 点赞：{ movieId: true }
  const likes = ref(loadFromStorage('next_likes', {}))
  // 收藏：{ movieId: { title, poster, timestamp } }
  const favorites = ref(loadFromStorage('next_favorites', {}))
  // 看过：{ movieId: { title, timestamp, userRating } }
  const watched = ref(loadFromStorage('next_watched', {}))

  function loadFromStorage(key, fallback) {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : fallback
    } catch { return fallback }
  }

  function saveToStorage(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
  }

  function setUser(u) {
    user.value = u
    try { localStorage.setItem('next_user', JSON.stringify(u)) } catch {}
  }

  function clearUser() {
    user.value = null
    try { localStorage.removeItem('next_user') } catch {}
  }

  // 同步交互数据到 KV
  async function syncToCloud() {
    if (!user.value?.nickname) return
    try {
      await fetch('/api/auth/save-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: user.value.nickname,
          interactions: {
            likes: likes.value,
            favorites: favorites.value,
            watched: watched.value,
            ratings: ratings.value
          }
        })
      })
    } catch {}
  }

  // 初始化时从 localStorage 恢复登录态
  try {
    const saved = localStorage.getItem('next_user')
    if (saved) user.value = JSON.parse(saved)
  } catch {}

  // 评分
  function setRating(movieId, score, info = {}) {
    ratings.value[movieId] = { score, title: info.title || '', poster: info.poster || '', genreIds: info.genreIds || [], timestamp: Date.now() }
    ratings.value = { ...ratings.value }
    saveToStorage('next_ratings', ratings.value)
    syncToCloud()
  }
  function getRating(movieId) {
    return ratings.value[movieId] || null
  }

  // 点赞
  function toggleLike(movieId, info = {}) {
    if (likes.value[movieId]) {
      delete likes.value[movieId]
    } else {
      likes.value[movieId] = { title: info.title || '', poster: info.poster || '', timestamp: Date.now() }
    }
    likes.value = { ...likes.value }
    saveToStorage('next_likes', likes.value)
    syncToCloud()
  }
  function isLiked(movieId) {
    return !!likes.value[movieId]
  }

  // 收藏
  function toggleFavorite(movieId, info = {}) {
    if (favorites.value[movieId]) {
      delete favorites.value[movieId]
    } else {
      favorites.value[movieId] = { title: info.title || '', poster: info.poster || '', genreIds: info.genreIds || [], timestamp: Date.now() }
    }
    favorites.value = { ...favorites.value }
    saveToStorage('next_favorites', favorites.value)
    syncToCloud()
  }
  function isFavorited(movieId) {
    return !!favorites.value[movieId]
  }

  // 看过
  function markWatched(movieId, info = {}) {
    if (watched.value[movieId]) {
      delete watched.value[movieId]
    } else {
      watched.value[movieId] = { title: info.title || '', timestamp: Date.now(), userRating: info.userRating || 0 }
    }
    watched.value = { ...watched.value }
    saveToStorage('next_watched', watched.value)
    syncToCloud()
  }
  function isWatched(movieId) {
    return !!watched.value[movieId]
  }

  // 统计数据
  const stats = computed(() => ({
    totalRatings: Object.keys(ratings.value).length,
    totalLikes: Object.keys(likes.value).length,
    totalFavorites: Object.keys(favorites.value).length,
    totalWatched: Object.keys(watched.value).length,
  }))

  return {
    user, isLoggedIn,
    ratings, likes, favorites, watched, stats,
    setUser, clearUser,
    setRating, getRating,
    toggleLike, isLiked,
    toggleFavorite, isFavorited,
    markWatched, isWatched,
  }
})
