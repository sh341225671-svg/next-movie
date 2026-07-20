<template>
  <div class="min-h-screen" style="background: var(--bg);">
    <!-- ═══ Header ═══ -->
    <header class="fixed top-0 left-0 right-0 z-50 glass" style="border-bottom: 1px solid var(--border);">
      <div style="width: 100%; max-width: 1152px; margin: 0 auto; padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between;">
        <div class="flex items-center gap-4">
          <img src="/assets/logo.png" class="logo-art" alt="Next" />
        </div>
        <div class="flex items-center gap-3 text-sm" style="margin-right: 0;">
          <!-- 搜索栏（固定显示） -->
          <div class="relative" style="position: relative;">
            <div class="flex items-center" style="position: relative;">
              <span style="position: absolute; left: 10px; font-size: 14px; color: var(--text-tertiary); pointer-events: none;">🔍</span>
              <input v-model="searchQuery" @keydown.enter="doSearch"
                @focus="searchFocused = true; $event.target.style.width = '220px'; $event.target.style.borderColor = 'var(--accent)'"
                @blur="searchBlur; $event.target.style.width = '180px'; $event.target.style.borderColor = 'var(--border)'"
                placeholder="搜索电影/电视剧..."
                style="width: 180px; font-size: 13px; padding: 8px 28px 8px 32px; border-radius: var(--r-pill); background: var(--surface); border: 1px solid var(--border); color: var(--text); outline: none; font-family: inherit; transition: width 0.3s, border-color 0.3s;" />
              <button v-if="searchQuery" @click="searchQuery = ''; searchResults = []"
                style="position: absolute; right: 8px; font-size: 12px; color: var(--text-tertiary); background: none; border: none; cursor: pointer;">✕</button>
            </div>
            <!-- 搜索下拉 -->
            <div v-if="searchFocused && searchResults.length"
              style="position: absolute; top: 100%; right: 0; margin-top: 8px; width: 360px; max-height: 400px; overflow-y: auto; border-radius: var(--r-lg); background: var(--surface-hover); border: 1px solid var(--border); box-shadow: var(--shadow-hover); z-index: 100;">
              <div v-for="r in searchResults" :key="r.id"
                @mousedown.prevent="goDetail(r)"
                style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; transition: background 0.2s;"
                @mouseenter="e => e.target.style.background = 'var(--surface)'"
                @mouseleave="e => e.target.style.background = 'transparent'">
                <div style="width: 32px; height: 48px; border-radius: 4px; overflow: hidden; flex-shrink: 0;">
                  <img v-if="r.poster" :src="r.poster" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
                <div class="flex-1" style="min-width: 0;">
                  <p style="font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ r.title }}</p>
                  <div class="flex items-center gap-2" style="margin-top: 2px;">
                    <span style="font-size: 11px; color: var(--text-secondary);">{{ r.year }}</span>
                    <span v-if="r.rating" style="font-size: 11px; color: var(--rating);">★ {{ r.rating }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button v-for="tab in navTabs" :key="tab.name"
            @click="router.push(tab.path)"
            style="font-size: 15px; padding: 8px 16px; border-radius: var(--r-pill); transition: all 0.3s; background: none; border: none; cursor: pointer; font-family: inherit;"
            :style="currentNav === tab.name ? 'background:var(--accent-dim); color:var(--accent)' : 'color:var(--text-secondary)'"
          >{{ tab.label }}</button>
          <button v-if="!userStore.isLoggedIn" @click="router.push('/auth')"
            class="btn-pill" style="background: var(--accent-gradient); color: #000;">登录</button>
        </div>
      </div>
    </header>

    <!-- ═══ Hero ═══ -->
    <section class="relative w-full overflow-hidden" style="height: 70vh; min-height: 420px; max-height: 600px;">
      <img :src="heroBg" class="absolute inset-0 w-full h-full object-cover transition-all duration-1000"
        :style="{ opacity: heroLoaded ? 1 : 0 }" @load="heroLoaded = true" />
      <div class="absolute inset-0" style="background: linear-gradient(to top, var(--bg) 0%, var(--bg) 15%, rgba(10,10,15,0.6) 40%, rgba(10,10,15,0.3) 70%, rgba(10,10,15,0.5) 100%);" />

      <div class="relative h-full max-w-6xl mx-auto px-5 flex flex-col justify-end pb-20 slide-up" v-if="!loading">
        <div class="flex items-start gap-8">
          <div class="hidden md:block flex-shrink-0" style="width: 200px;">
            <div class="card" style="aspect-ratio: 2/3; overflow: hidden;">
              <img v-if="heroMovie?.poster" :src="heroMovie.poster" class="w-full h-full object-cover" />
            </div>
          </div>
          <div class="max-w-lg">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs tracking-widest uppercase" style="color: var(--accent);">Next Pick</span>
              <span class="text-xs" style="color: var(--text-secondary);">· 今日推荐</span>
            </div>
            <h1 style="font-family: var(--font-display); font-size: 36px; font-weight: 700; line-height: 1.1; text-shadow: 0 2px 30px rgba(0,0,0,0.8);">
              {{ heroMovie?.title }}
            </h1>
            <div class="flex items-center gap-4 mt-3" style="font-size: 14px; color: var(--text-secondary);">
              <span v-if="heroMovie?.year">{{ heroMovie.year }}</span>
              <span v-if="heroMovie?.rating" style="color: var(--rating);">★ {{ heroMovie.rating }}</span>
              <span v-if="heroMovie?.genreNames" style="color: var(--text-secondary);">{{ heroMovie.genreNames }}</span>
            </div>
            <p class="mt-4 leading-relaxed line-clamp-3" style="font-size: 15px; color: #ccc; text-shadow: 0 1px 12px rgba(0,0,0,0.6);">
              {{ heroMovie?.overview || '加载中...' }}
            </p>
            <button @click="router.push(`/movie/${heroMovie?.id}`)"
              class="btn-pill" style="background: var(--accent-gradient); color: #000; box-shadow: var(--shadow-glow); margin-top: 20px;">
              看这部 →
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 内容区 ═══ -->
    <div style="width: 100%; max-width: 1152px; margin: 0 auto; padding: 0 24px; margin-top: -4px;">
      <!-- 加载态 -->
      <div v-if="loading" class="py-20 text-center">
        <div class="animate-spin w-8 h-8 mx-auto border-2 border-t-transparent rounded-full" style="border-color: var(--accent); border-top-color: transparent;"></div>
      </div>

      <!-- ═══ 本周热榜 ═══ -->
      <section v-if="trending.length" class="slide-up" style="padding-top: 60px;">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-4">
            <h2 style="font-size: 24px; font-weight: 700;">本周热榜</h2>
            <div class="flex items-center gap-1" style="font-size: 14px;">
              <button v-for="t in ['周', '月']" :key="t"
                @click="switchTrendPeriod(t)"
                style="padding: 4px 12px; border-radius: var(--r-pill); transition: all 0.3s; background: none; border: none; cursor: pointer; font-family: inherit;"
                :style="trendPeriod === t ? 'background:var(--accent-dim); color:var(--accent)' : 'color:var(--text-secondary)'"
              >{{ t }}</button>
            </div>
          </div>
          <button @click="router.push('/discover')" style="font-size: 14px; color: var(--text-secondary); background: none; border: none; cursor: pointer;">查看更多 →</button>
        </div>
        <div class="scroll-x flex gap-4 pb-4">
          <MovieCard v-for="m in trending" :key="m.id" :movie="m" @select="goDetail" />
        </div>
      </section>

      <!-- ═══ 猜你喜欢 ═══ -->
      <section class="slide-up" style="padding-top: 60px;">
        <div class="flex items-center justify-between mb-5">
          <h2 style="font-size: 24px; font-weight: 700;">猜你喜欢</h2>
          <div class="flex items-center gap-3">
            <button v-for="mode in recModes" :key="mode.key"
              @click="switchRecMode(mode.key)"
              style="font-size: 13px; padding: 4px 14px; border-radius: var(--r-pill); transition: all 0.3s; background: none; border: none; cursor: pointer; font-family: inherit;"
              :style="recMode === mode.key ? 'background:var(--accent-dim); color:var(--accent)' : 'color:var(--text-secondary)'"
            >{{ mode.label }}</button>
          </div>
        </div>

        <!-- 模式A：智能推荐 -->
        <div v-if="recMode === 'auto'">
          <div v-if="recLoading" style="text-align: center; padding: 40px 0;">
            <div class="animate-spin w-5 h-5 mx-auto border-2 border-t-transparent rounded-full" style="border-color: var(--accent); border-top-color: transparent;"></div>
            <p style="margin-top: 12px; font-size: 14px; color: var(--text-secondary);">AI 正在分析你的观影偏好...</p>
          </div>
          <div v-else-if="recommendations.length" class="grid" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px;">
            <div v-for="(m, i) in recommendations" :key="m.id || i"
              class="cursor-pointer transition-all duration-500 hover:-translate-y-1 scale-in"
              :style="{ animationDelay: `${i * 0.1}s` }"
              @click="goDetail(m.movie || m)">
              <div class="card" style="aspect-ratio: 2/3; overflow: hidden;">
                <img v-if="(m.movie?.poster || m.poster)" :src="(m.movie?.poster || m.poster)" class="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                <img v-else src="/assets/poster-placeholder.png" class="w-full h-full object-cover" />
              </div>
              <div style="margin-top: 10px;">
                <p style="font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ m.movie?.title || m.title }}</p>
                <p style="font-size: 12px; line-height: 1.4; color: var(--text-secondary); margin-top: 4px;">{{ m.reason }}</p>
              </div>
            </div>
          </div>
          <div v-else style="text-align: center; padding: 40px 0;">
            <p style="font-size: 14px; color: var(--text-tertiary);">还没收藏影片？先去发现页逛逛吧 🎬</p>
            <button @click="router.push('/discover')" style="margin-top: 12px; font-size: 13px; color: var(--accent); background: none; border: none; cursor: pointer;">去发现 →</button>
          </div>
          <div style="text-align: right; margin-top: 12px;">
            <button @click="refreshRecs" :disabled="recLoading"
              style="font-size: 13px; color: var(--accent); background: none; border: none; cursor: pointer; opacity: 0.7; font-family: inherit;">
              ↻ 换一批
            </button>
          </div>
        </div>

        <!-- 模式B：文字提问 -->
        <div v-else>
          <div class="card" style="padding: 16px; margin-bottom: 20px;">
            <textarea v-model="queryText" placeholder="描述你想看什么样的电影，例如：&#10;我平常喜欢看像复仇者联盟这种有超级英雄、制作精良、大场面、让人很爽的电影，请给我推荐一下"
              style="width: 100%; min-height: 80px; font-size: 14px; line-height: 1.5; padding: 12px; border-radius: var(--r-md); background: var(--bg); border: 1px solid var(--border); color: var(--text); resize: vertical; outline: none; font-family: inherit;"></textarea>
            <div class="flex items-center justify-between" style="margin-top: 12px;">
              <span style="font-size: 12px; color: var(--text-tertiary);">{{ queryText.length }} / 500</span>
              <button @click="submitTextQuery" :disabled="!queryText.trim() || textLoading"
                class="btn-pill"
                :style="{ background: queryText.trim() ? 'var(--accent-gradient)' : 'var(--surface)', color: queryText.trim() ? '#000' : 'var(--text-tertiary)', opacity: queryText.trim() ? 1 : 0.5 }">
                {{ textLoading ? '🎯 AI 分析中...' : '🎯 智能推荐' }}
              </button>
            </div>
          </div>
          <!-- AI 分析中提示 -->
          <div v-if="textLoading" class="card" style="padding: 24px; text-align: center; margin-bottom: 20px;">
            <div class="animate-spin w-6 h-6 mx-auto border-2 border-t-transparent rounded-full" style="border-color: var(--accent); border-top-color: transparent;"></div>
            <p style="margin-top: 12px; font-size: 14px; color: var(--text-secondary);">
              海量数据检索中，正在分析你的兴趣爱好
            </p>
            <p style="margin-top: 4px; font-size: 12px; color: var(--text-tertiary);">基于 AI 深度理解你的需求</p>
          </div>

          <div v-if="textResults.length" class="grid" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px;">
            <div v-for="(m, i) in textResults" :key="m.id || i"
              class="cursor-pointer transition-all duration-500 hover:-translate-y-1 scale-in"
              :style="{ animationDelay: `${i * 0.1}s` }"
              @click="goDetail(m.movie || m)">
              <div class="card" style="aspect-ratio: 2/3; overflow: hidden;">
                <img v-if="(m.movie?.poster || m.poster)" :src="(m.movie?.poster || m.poster)" class="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                <img v-else src="/assets/poster-placeholder.png" class="w-full h-full object-cover" />
              </div>
              <div style="margin-top: 10px;">
                <p style="font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ m.movie?.title || m.title }}</p>
                <p style="font-size: 12px; line-height: 1.4; color: var(--text-secondary); margin-top: 4px;">{{ m.reason }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ 高分推荐 ═══ -->
      <section v-if="topRated.length" class="slide-up" style="padding-top: 60px; padding-bottom: 80px;">
        <div class="flex items-center justify-between mb-5">
          <h2 style="font-size: 24px; font-weight: 700;">高分推荐</h2>
          <button @click="router.push('/discover')" style="font-size: 14px; color: var(--text-secondary); background: none; border: none; cursor: pointer;">查看更多 →</button>
        </div>
        <div class="scroll-x flex gap-4 pb-4">
          <MovieCard v-for="m in topRated" :key="m.id" :movie="m" @select="goDetail" />
        </div>
      </section>

      <!-- ═══ 页脚 ═══ -->
      <footer class="py-12 text-center" style="padding-top: var(--space-8);">
        <p style="font-size: 15px; color: var(--text-secondary);">Next · 懂电影，更懂你</p>
      </footer>
    </div>

    <!-- ═══ 底部导航 ═══ -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 glass md:hidden" style="border-top: 1px solid var(--border);">
      <div class="flex items-center justify-around h-14">
        <button v-for="tab in bottomTabs" :key="tab.name"
          @click="router.push(tab.path)"
          style="display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 12px; background: none; border: none; cursor: pointer; font-family: inherit; transition: color 0.3s;"
          :style="currentNav === tab.name ? 'color:var(--accent)' : 'color:var(--text-secondary)'">
          <span style="font-size: 18px;">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { getTrending, getPopular, getTopRated, formatMovie } from '@/data/tmdb'
import { getProfileRecommendations, getTextRecommendations, matchRecommendations } from '@/data/recommendation'
import MovieCard from '@/components/MovieCard.vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const heroLoaded = ref(false)
const trending = ref([])
const recommendations = ref([])
const topRated = ref([])
const heroMovie = ref(null)
const currentNav = ref('home')
const trendPeriod = ref('周')

// 推荐模式
const recMode = ref('auto')
const recLoading = ref(false)
const recModes = [
  { key: 'auto', label: '🤖 智能推荐' },
  { key: 'text', label: '✍️ 文字提问' },
]

// 文字提问
const queryText = ref('')
const textResults = ref([])
const textLoading = ref(false)

const heroBg = ref('/assets/hero-bg.jpg')

const navTabs = [
  { name: 'home', path: '/', label: '推荐' },
  { name: 'discover', path: '/discover', label: '发现' },
  { name: 'profile', path: '/profile', label: '我的' },
]

const bottomTabs = [
  { name: 'home', path: '/', label: '推荐', icon: '✦' },
  { name: 'discover', path: '/discover', label: '发现', icon: '◇' },
  { name: 'profile', path: '/profile', label: '我的', icon: '●' },
]

// 搜索
const searchQuery = ref('')
const searchResults = ref([])
const searchFocused = ref(false)
let searchTimer = null

// 文字提问结果持久化（刷新不消失）
try {
  const saved = localStorage.getItem('next_text_results')
  if (saved) textResults.value = JSON.parse(saved)
} catch {}

async function doSearch() {
  if (!searchQuery.value.trim()) return
  searchFocused.value = true
  try {
    const { searchMulti, formatMovie } = await import('@/data/tmdb')
    const data = await searchMulti(searchQuery.value.trim())
    searchResults.value = (data.results || [])
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 8)
      .map(formatMovie)
  } catch (e) {
    console.error(e)
  }
}

function searchBlur() {
  setTimeout(() => { searchFocused.value = false }, 200)
}

watch(searchQuery, () => {
  clearTimeout(searchTimer)
  if (searchQuery.value.trim().length >= 2) {
    searchTimer = setTimeout(doSearch, 400)
  } else {
    searchResults.value = []
  }
})

// 每日推荐缓存（24小时内不重复请求）
const DAILY_CACHE_KEY = 'next_daily_recs'
function getDailyCache() {
  try {
    const raw = localStorage.getItem(DAILY_CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const today = new Date().toDateString()
    // 旧版本缓存可能只有4部，重新获取
    if (data.date === today && Array.isArray(data.recs) && data.recs.length >= 6) return data.recs
  } catch {}
  return null
}
function setDailyCache(recs) {
  try {
    localStorage.setItem(DAILY_CACHE_KEY, JSON.stringify({ date: new Date().toDateString(), recs }))
  } catch {}
}

onMounted(async () => {
  try {
    const [trendData, popData, ratedData] = await Promise.all([
      getTrending('movie', 1),
      getPopular(1),
      getTopRated(1)
    ])
    trending.value = (trendData.results || []).slice(0, 10).map(formatMovie)
    topRated.value = (ratedData.results || []).slice(0, 10).map(formatMovie)

    const formattedPop = (popData.results || []).map(formatMovie)
    heroMovie.value = formattedPop[0]

    // 每日首次加载推荐（缓存机制）
    if (userStore.isLoggedIn) {
      const cached = getDailyCache()
      if (cached) {
        recommendations.value = cached
      } else {
        await loadAutoRecs()
        if (recommendations.value.length) {
          setDailyCache(recommendations.value)
        }
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function loadAutoRecs() {
  // 仅登录用户有推荐
  if (!userStore.isLoggedIn) { recLoading.value = false; return }

  recLoading.value = true
  try {
    const recs = await getProfileRecommendations(userStore.user, {
      ratings: userStore.ratings,
      watched: userStore.watched,
      favorites: userStore.favorites,
    })

    // 获取候选列表来匹配
    const popData = await getPopular(1)
    const candidates = (popData.results || []).map(formatMovie)
    const matched = matchRecommendations(recs, candidates)
    recommendations.value = matched.length ? matched : candidates.slice(0, 4).map(m => ({
      movie: m,
      reason: `评分 ${m.rating} 的高分影片`
    }))
  } catch (e) {
    console.error(e)
  } finally {
    recLoading.value = false
  }
}

async function refreshRecs() {
  if (recLoading.value) return
  await loadAutoRecs()
}

function switchRecMode(mode) {
  recMode.value = mode
}

async function submitTextQuery() {
  if (!queryText.value.trim() || textLoading.value) return
  textLoading.value = true
  try {
    const recs = await getTextRecommendations(queryText.value.trim(), userStore.user, {
      ratings: userStore.ratings,
      watched: userStore.watched,
      favorites: userStore.favorites,
    })
    const popData = await getPopular(1)
    const candidates = (popData.results || []).map(formatMovie)
    const matched = matchRecommendations(recs, candidates)
    textResults.value = matched.length ? matched : candidates.slice(0, 6).map(m => ({
      movie: m, reason: '高分推荐'
    }))
    // 持久化到 localStorage，刷新后仍然显示
    try { localStorage.setItem('next_text_results', JSON.stringify(textResults.value)) } catch {}
    queryText.value = '' // 清空输入框
  } catch (e) {
    console.error(e)
  } finally {
    textLoading.value = false
  }
}

async function loadTrending(period) {
  const data = await getTrending('movie', 1)
  trending.value = (data.results || []).slice(0, 10).map(formatMovie)
}

function switchTrendPeriod(t) {
  trendPeriod.value = t
  loadTrending(t === '月' ? 'week' : 'week')
}

function goDetail(m) { router.push(`/movie/${m.id || m.movie?.id}?type=${(m.mediaType || m.movie?.mediaType || 'movie')}`) }
</script>
