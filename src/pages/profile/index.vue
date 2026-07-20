<template>
  <div class="min-h-screen" style="background: var(--bg);">
    <header class="fixed top-0 left-0 right-0 z-50 glass" style="border-bottom: 1px solid var(--border);">
      <div style="width: 100%; max-width: 1152px; margin: 0 auto; padding: 0 24px; height: 56px; display: flex; align-items: center; gap: 12px;">
        <button @click="router.back()" style="font-size: 18px; color: var(--text-secondary); background: none; border: none; cursor: pointer; padding: 8px; margin: -8px;">←</button>
        <img src="/assets/logo.png" class="logo-art-sm" alt="Next" />
      </div>
    </header>

    <main style="width: 100%; max-width: 1152px; margin: 0 auto; padding: 80px 24px 100px;">
      <!-- ═══ 已登录 ═══ -->
      <div v-if="userStore.isLoggedIn" class="slide-up">
        <!-- 头部资料 -->
        <div class="flex items-center gap-5" style="padding: 28px 0 24px; border-bottom: 1px solid var(--border);">
          <div class="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
            style="background: var(--accent-dim); color: var(--accent);">
            {{ userStore.user.nickname?.[0] || '?' }}
          </div>
          <div>
            <p style="font-size: 20px; font-weight: 700;">{{ userStore.user.nickname }}</p>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 14px; color: var(--text-secondary);">
              <span>{{ userStore.user.gender === 'male' ? '男生' : userStore.user.gender === 'female' ? '女生' : '其他' }}</span>
              <span>·</span>
              <span>{{ userStore.user.age || '?' }}岁</span>
            </div>
          </div>
        </div>

        <!-- 数据统计 -->
        <div class="grid" style="grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 20px;">
          <div v-for="s in statItems" :key="s.label" style="text-align: center; padding: 16px 8px; border-radius: var(--r-lg); background: var(--surface);">
            <p style="font-size: 24px; font-weight: 700; color: var(--accent);">{{ s.count }}</p>
            <p style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">{{ s.label }}</p>
          </div>
        </div>

        <!-- 影剧特质分析 -->
        <div v-if="userStore.isLoggedIn && tasteTags.length" class="slide-up" style="margin-top: 20px; padding: 16px; border-radius: var(--r-lg); background: var(--surface); border: 1px solid rgba(212,168,85,0.08);">
          <div class="flex items-center gap-2" style="margin-bottom: 12px;">
            <span style="font-size: 16px;">🎭</span>
            <span style="font-size: 14px; font-weight: 600;">你的影剧特质</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <span v-for="t in tasteTags" :key="t"
              style="padding: 4px 12px; border-radius: var(--r-pill); font-size: 12px; background: var(--accent-dim); color: var(--accent); font-weight: 500;">
              {{ t }}
            </span>
          </div>
          <p style="margin-top: 8px; font-size: 12px; line-height: 1.5; color: var(--text-tertiary);">
            {{ tasteSummary }}
          </p>
        </div>

        <!-- 功能导航 -->
        <div style="margin-top: 24px;">
          <button v-for="item in menuItems" :key="item.key"
            @click="activeTab = item.key"
            class="w-full flex items-center justify-between px-4 py-4 rounded-xl text-sm transition-colors"
            style="background: none; border: none; cursor: pointer; font-family: inherit; font-size: 15px; color: var(--text); border-bottom: 1px solid var(--border);"
            @mouseenter="e => e.target.style.background = 'var(--surface)'"
            @mouseleave="e => e.target.style.background = 'transparent'">
            <div class="flex items-center gap-3">
              <span style="font-size: 18px;">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="item.count" style="font-size: 12px; color: var(--text-tertiary);">{{ item.count }}</span>
              <span style="color: var(--text-secondary); font-size: 14px;">→</span>
            </div>
          </button>
        </div>

        <!-- 列表内容 -->
        <div v-if="activeTab === 'likes' && likedList.length" style="margin-top: 16px;">
          <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px;">
            <div v-for="m in likedList" :key="m.id" class="cursor-pointer" @click="goMovie(m.id)">
              <div class="card" style="aspect-ratio: 2/3; overflow: hidden;">
                <img v-if="m.poster" :src="m.poster" class="w-full h-full object-cover" />
                <img v-else src="/assets/poster-placeholder.png" class="w-full h-full object-cover" />
              </div>
              <p style="font-size: 12px; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ m.title }}</p>
            </div>
          </div>
        </div>
        <div v-if="activeTab === 'favorites' && favoriteList.length" style="margin-top: 16px;">
          <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px;">
            <div v-for="m in favoriteList" :key="m.id" class="cursor-pointer" @click="goMovie(m.id)">
              <div class="card" style="aspect-ratio: 2/3; overflow: hidden;">
                <img v-if="m.poster" :src="m.poster" class="w-full h-full object-cover" />
                <img v-else src="/assets/poster-placeholder.png" class="w-full h-full object-cover" />
              </div>
              <p style="font-size: 12px; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ m.title }}</p>
            </div>
          </div>
        </div>
        <div v-if="activeTab === 'watched' && watchedList.length" style="margin-top: 16px;">
          <div v-for="m in watchedList" :key="m.id" style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); cursor: pointer;" @click="goMovie(m.id)">
            <div style="width: 40px; height: 60px; border-radius: var(--r-sm); overflow: hidden; flex-shrink: 0;">
              <img v-if="m.poster" :src="m.poster" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1">
              <p style="font-size: 14px; font-weight: 500;">{{ m.title }}</p>
              <p v-if="m.userRating" style="font-size: 12px; color: var(--accent); margin-top: 2px;">{{ '★'.repeat(Math.ceil(m.userRating/2)) }} {{ m.userRating }}分</p>
            </div>
            <span style="font-size: 11px; color: var(--text-tertiary);">{{ formatTime(m.timestamp) }}</span>
          </div>
        </div>
        <div v-if="activeTab === 'ratings' && ratingList.length" style="margin-top: 16px;">
          <div v-for="r in ratingList" :key="r.id" style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); cursor: pointer;" @click="goMovie(r.id)">
            <div style="width: 40px; height: 60px; border-radius: var(--r-sm); overflow: hidden; flex-shrink: 0;">
              <img v-if="r.poster" :src="r.poster" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1">
              <p style="font-size: 14px; font-weight: 500;">{{ r.title }}</p>
              <div class="flex items-center gap-2" style="margin-top: 2px;">
                <span class="star-rating star-rating-sm">
                  <span v-for="s in 5" :key="s" class="star" :class="{ filled: s <= Math.ceil(r.score/2) }">★</span>
                </span>
                <span style="font-size: 12px; color: var(--accent);">{{ r.score }}分</span>
              </div>
            </div>
          </div>
        </div>

        <button @click="logout" class="w-full mt-6 py-3 rounded-xl text-sm transition-colors border"
          style="border-color: var(--border); color: var(--text-secondary); background: none; cursor: pointer; font-family: inherit;"
          @mouseenter="e => e.target.style.color = 'var(--heart)'"
          @mouseleave="e => e.target.style.color = 'var(--text-secondary)'"
        >退出登录</button>
      </div>

      <!-- ═══ 未登录 ═══ -->
      <div v-else class="slide-up" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 0; text-align: center;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--surface); display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
          <span style="font-size: 36px; color: var(--text-secondary);">○</span>
        </div>
        <p style="font-size: 15px; color: var(--text-secondary); margin-bottom: 4px;">登录后可收藏影片、记录你看过的</p>
        <p style="font-size: 13px; color: var(--text-tertiary); margin-bottom: 24px;">发现更多好片，建立你的观影档案</p>
        <button @click="router.push('/auth')" class="btn-pill" style="background: var(--accent-gradient); color: #000; box-shadow: var(--shadow-glow);">登录 / 注册</button>
      </div>
    </main>

    <nav class="fixed bottom-0 left-0 right-0 z-50 glass md:hidden" style="border-top: 1px solid var(--border);">
      <div class="flex items-center justify-around h-14">
        <button @click="router.push('/')" style="display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 12px; background: none; border: none; cursor: pointer; color: var(--text-secondary); font-family: inherit;">
          <span style="font-size: 18px;">✦</span><span>推荐</span>
        </button>
        <button @click="router.push('/discover')" style="display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 12px; background: none; border: none; cursor: pointer; color: var(--text-secondary); font-family: inherit;">
          <span style="font-size: 18px;">◇</span><span>发现</span>
        </button>
        <button style="display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 12px; background: none; border: none; cursor: pointer; color: var(--accent); font-family: inherit;">
          <span style="font-size: 18px;">●</span><span>我的</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref(null)

const statItems = computed(() => [
  { label: '看过', count: userStore.stats.totalWatched },
  { label: '收藏', count: userStore.stats.totalFavorites },
  { label: '评分', count: userStore.stats.totalRatings },
  { label: '点赞', count: userStore.stats.totalLikes },
])

const menuItems = computed(() => [
  { key: 'likes', label: '我的喜欢', icon: '♥', count: userStore.stats.totalLikes },
  { key: 'favorites', label: '我的收藏', icon: '★', count: userStore.stats.totalFavorites },
  { key: 'watched', label: '我看过的', icon: '✓', count: userStore.stats.totalWatched },
  { key: 'ratings', label: '我的评分', icon: '⭐', count: userStore.stats.totalRatings },
])

// 影剧特质分析
const TASTE_TAGS_MAP = {
  action: { keywords: [28], label: '💥 动作爱好者', desc: '偏爱紧张刺激的动作场面' },
  comedy: { keywords: [35], label: '😄 喜剧达人', desc: '喜欢轻松幽默的调调' },
  drama: { keywords: [18], label: '🎭 剧情控', desc: '偏好深度叙事和人物刻画' },
  romance: { keywords: [10749], label: '💕 浪漫主义者', desc: '容易被爱情故事打动' },
  thriller: { keywords: [53], label: '🔫 悬疑迷', desc: '享受烧脑和紧张的氛围' },
  horror: { keywords: [27], label: '👻 恐怖分子', desc: '对惊悚内容情有独钟' },
  scifi: { keywords: [878], label: '🚀 科幻迷', desc: '热衷于未来世界和想象' },
  fantasy: { keywords: [14], label: '🧙 奇幻控', desc: '向往魔法与幻想世界' },
  animation: { keywords: [16], label: '🎨 动画党', desc: '对动画艺术情有独钟' },
  documentary: { keywords: [99], label: '📖 纪实派', desc: '喜欢真实的故事和知识' },
}

const tasteTags = computed(() => {
  const genreCount = {}
  const countMovie = (ids, weight) => {
    (ids || []).forEach(gid => { genreCount[gid] = (genreCount[gid] || 0) + weight })
  }
  // 收藏影片
  Object.values(userStore.favorites || {}).forEach(f => countMovie(f.genreIds || [], 3))
  // 评分影片
  Object.entries(userStore.ratings || {}).forEach(([id, r]) => {
    if (r.score >= 7) countMovie(r.genreIds || [], 2)
  })
  // 观看
  Object.entries(userStore.watched || {}).forEach(([id, w]) => countMovie(w.genreIds || [], 1))
  
  const sorted = Object.entries(genreCount).sort((a, b) => b[1] - a[1])
  const topGenres = sorted.slice(0, 3).map(([gid]) => Number(gid))
  
  return Object.values(TASTE_TAGS_MAP)
    .filter(t => t.keywords.some(k => topGenres.includes(k)))
    .slice(0, 3)
    .map(t => t.label)
})

const tasteSummary = computed(() => {
  const tags = Object.values(TASTE_TAGS_MAP)
    .filter(t => tasteTags.value.includes(t.label))
  if (!tags.length) return ''
  return tags.map(t => t.desc).join('，') + '。继续观影，发掘更多你的观影特质！'
})

const favoriteList = computed(() => {
  return Object.entries(userStore.favorites || {}).map(([id, info]) => ({
    id: Number(id),
    title: info.title || '未知',
    poster: info.poster || null,
    timestamp: info.timestamp
  }))
})

const watchedList = computed(() => {
  return Object.entries(userStore.watched || {}).map(([id, info]) => ({
    id: Number(id),
    title: info.title || '未知',
    poster: info.poster || null,
    timestamp: info.timestamp,
    userRating: info.userRating || 0
  })).sort((a, b) => b.timestamp - a.timestamp)
})

const likedList = computed(() => {
  return Object.entries(userStore.likes || {}).map(([id, info]) => ({
    id: Number(id),
    title: info.title || '',
    poster: info.poster || null,
    timestamp: info.timestamp
  }))
})

const ratingList = computed(() => {
  return Object.entries(userStore.ratings || {}).map(([id, info]) => ({
    id: Number(id),
    title: info.title || '',
    poster: info.poster || null,
    score: info.score || 0,
    timestamp: info.timestamp
  })).sort((a, b) => b.timestamp - a.timestamp)
})

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth()+1}月${d.getDate()}日`
}

function goMovie(id) { router.push(`/movie/${id}`) }

function logout() { userStore.clearUser() }
</script>
