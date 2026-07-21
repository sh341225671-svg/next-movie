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
          <MovieCard v-for="m in trending" :key="m.id" :movie="m" :isWatched="userStore.isWatched(m.id)" :userRating="userStore.getRating(m.id)?.score || 0" @select="goDetail" />
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
            <button @click="refreshRecs" :disabled="recLoading || refreshCount >= MAX_REFRESH"
              style="font-size: 13px; background: none; border: none; cursor: pointer; font-family: inherit;"
              :style="{ color: refreshCount >= MAX_REFRESH ? 'var(--text-tertiary)' : 'var(--accent)', opacity: refreshCount >= MAX_REFRESH ? 0.5 : 0.7 }">
              ↻ 换一批{{ refreshCount >= MAX_REFRESH ? '（已达上限）' : `（剩余${MAX_REFRESH - refreshCount}次）` }}
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
          <MovieCard v-for="m in topRated" :key="m.id" :movie="m" :isWatched="userStore.isWatched(m.id)" :userRating="userStore.getRating(m.id)?.score || 0" @select="goDetail" />
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
import { getTrending, getPopular, getTopRated, formatMovie, getStaticData } from '@/data/tmdb'
import MovieCard from '@/components/MovieCard.vue'

// ━━━ 推荐函数（内联）━━━
let _recCandidates = null
async function getRecCandidates() {
  if (_recCandidates) return _recCandidates
  const sd = await getStaticData()
  if (sd?.movies) {
    _recCandidates = sd.movies.map(formatMovie).filter(Boolean)
    return _recCandidates
  }
  return []
}
async function getProfileRecs(user, interactions, seed = 0) {
  const candidates = await getRecCandidates()
  if (!candidates.length) return []
  const watchedSet = new Set(Object.keys(interactions?.watched || {}).map(Number))
  let pool = candidates.filter(m => !watchedSet.has(m.id))
  pool.sort((a, b) => ((parseFloat(a.rating||0)*7+seed*137)%100)-((parseFloat(b.rating||0)*7+seed*137)%100))
  return pool.slice(0, 6).map(m => ({
    movie: m,
    reason: (m.overview||'').slice(0,25) + ' | 评分'+m.rating,
    tier: '推荐'
  }))
}
async function getTextRecs(query, user, interactions) {
  const candidates = await getRecCandidates()
  if (!candidates.length) return []
  const watchedSet = new Set(Object.keys(interactions?.watched || {}).map(Number))
  try {
    const ak = import.meta.env.VITE_AI_API_KEY
    if (ak) {
      const r = await fetch('/api/ai/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({model:'deepseek-v4-flash',
          messages:[{role:'system',content:'你是电影推荐专家。根据用户需求从候选影片中分析并推荐6部。每部给20-30字专业理由。输出JSON。'},
          {role:'user',
          content:`用户需求:${query.slice(0,150)}\n\n候选影片:\n${candidates.slice(0,20).map(m=>`《${m.title}》(${m.year}) 评分${m.rating} ${(m.overview||'').slice(0,40)}`).join('\n')}\n\n输出JSON:{"recommendations":[{"title":"","year":"","reason":"专业理由"}]}`}],
          max_tokens:2048, temperature:0.5})
      })
      if (r.ok) {
        const d = await r.json()
        let c = d.choices?.[0]?.message?.content || d.choices?.[0]?.message?.reasoning_content || ''
        let p = null
        try { p = JSON.parse(c) } catch { const m = c.match(/\{[\s\S]*\}/); if (m) try { p = JSON.parse(m[0]) } catch {} }
        if (p?.recommendations?.length) {
          const matched = p.recommendations.slice(0, 6).map(rec => {
            const m = candidates.find(x => x.title === rec.title || x.title?.includes(rec.title))
            return m && !watchedSet.has(m.id) ? { ...rec, movie: m } : null
          }).filter(Boolean)
          if (matched.length > 0) return matched  // 匹配成功才返回
        }
      }
    }
  } catch {}

  // AI 失败 → TMDB 搜索（更广的电影库）
  try {
    const { searchMulti, formatMovie: fm } = await import('@/data/tmdb')
    const data = await searchMulti(query, 1)
    const hits = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 10)
    if (hits.length >= 1) {
      return hits.map(fm).filter(Boolean).filter(m => !watchedSet.has(m.id)).slice(0, 6).map(m => ({
        movie: m, reason: `与你搜索「${query.slice(0,8)}」相关 · 评分${m.rating || '?'}`, tier: '推荐'
      }))
    }
  } catch {}

  // TMDB 也无结果 → 关键词匹配
  const q = query.toLowerCase()
  const kw = q.split(/[\s,\\.!\\?;:\\u3000-\\u303f\\uff00-\\uffef]+/).filter(w => w.length >= 2)
  let scored = candidates.filter(m => !watchedSet.has(m.id)).map(m => {
    let s = 0; const t = (m.title||'').toLowerCase(), o = (m.overview||'').toLowerCase()
    kw.forEach(k => { if (t.includes(k)) s += 5; if (o.includes(k)) s += 2 })
    const r = parseFloat(m.rating||0); if (r >= 8) s += 2; else if (r >= 7) s += 1
    return { movie: m, score: s }
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score)
  let res = scored.slice(0, 6).map(s => ({ movie: s.movie, reason: (s.movie.overview||'').slice(0, 25) + ' | 评分' + s.movie.rating, tier: '推荐' }))
  if (res.length < 6) {
    const used = new Set(res.map(r => r.movie.id))
    for (const c of [...candidates].sort((a, b) => parseFloat(b.rating||0) - parseFloat(a.rating||0))) {
      if (res.length >= 6) break
      if (used.has(c.id) || watchedSet.has(c.id)) continue
      res.push({ movie: c, reason: `评分${c.rating}，口碑稳定`, tier: '备选' })
      used.add(c.id)
    }
  }
  return res
}

// 防 tree-shaking：强制保留所有推荐相关函数
const __keep = () => { loadAutoRecs(); submitTextQuery(); refreshRecs(); }
window.__nextRecs = { getRecCandidates, getProfileRecs, getTextRecs, loadAutoRecs, submitTextQuery, refreshRecs, __keep }

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

// 刷新次数持久化（localStorage + 日期绑定）
const REFRESH_KEY = 'next_refresh_count_v2'
const REFRESH_DATE_KEY = 'next_refresh_date_v2'
try {
  const savedDate = localStorage.getItem(REFRESH_DATE_KEY)
  const today = new Date().toDateString()
  if (savedDate === today) {
    const savedCount = localStorage.getItem(REFRESH_KEY)
    if (savedCount) refreshCount.value = parseInt(savedCount) || 0
  } else {
    localStorage.setItem(REFRESH_DATE_KEY, today)
    localStorage.setItem(REFRESH_KEY, '0')
    refreshCount.value = 0
  }
} catch {}

// (以下为自动加载逻辑)

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

// 每日推荐缓存（24小时内不重复请求）- v2新键名强制刷新旧缓存
const DAILY_CACHE_KEY = 'next_daily_recs_v2'
function getDailyCache() {
  try {
    const raw = localStorage.getItem(DAILY_CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const today = new Date().toDateString()
    if (data.date === today && Array.isArray(data.recs) && data.recs.length >= 3
      && data.recs[0]?.reason && data.recs[0]?.movie?.id) return data.recs
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
    topRated.value = (ratedData.results || []).slice(0, 8).map(formatMovie)
    
    // 过滤高分区已看过的
    if (userStore.isLoggedIn) {
      const w = new Set(Object.keys(userStore.watched || {}).map(Number))
      topRated.value = topRated.value.filter(m => !w.has(m.id))
    }

    const formattedPop = (popData.results || []).map(formatMovie)
    heroMovie.value = formattedPop[0]
    // 每日轮换：根据日期选择不同的 hero 影片
    if (formattedPop.length > 1) {
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
      heroMovie.value = formattedPop[dayOfYear % formattedPop.length]
    }
    
    // 先显示主内容（Hero+热榜+高分），不阻塞
    loading.value = false
    heroLoaded.value = true

    // 每日首次加载推荐（缓存机制）
    if (userStore.isLoggedIn) {
      const cached = getDailyCache()
      if (cached) {
        const watchedSet = new Set(Object.keys(userStore.watched || {}).map(Number))
        recommendations.value = cached.filter(r => !watchedSet.has(r.movie?.id || r.id))
        if (recommendations.value.length < 6) {
          await loadAutoRecs()
        }
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

async function loadAutoRecs(seed = 0) {
  if (!userStore.isLoggedIn) { recLoading.value = false; return }
  recLoading.value = true
  try {
    const recs = await getProfileRecs(userStore.user, {
      ratings: userStore.ratings,
      watched: userStore.watched,
      favorites: userStore.favorites,
    }, seed)
    recommendations.value = recs
  } catch (e) {
    console.error(e)
  } finally {
    recLoading.value = false
  }
}

// 刷新次数限制
const refreshCount = ref(0)
const MAX_REFRESH = 3

async function refreshRecs() {
  if (recLoading.value || refreshCount.value >= MAX_REFRESH) return
  refreshCount.value++
  try { localStorage.setItem(REFRESH_KEY, String(refreshCount.value)) } catch {}
  await loadAutoRecs(refreshCount.value)
  if (recommendations.value.length) setDailyCache(recommendations.value)
}

function switchRecMode(mode) {
  recMode.value = mode
}

async function submitTextQuery() {
  if (!queryText.value.trim() || textLoading.value) return
  textLoading.value = true
  try {
    const recs = await getTextRecs(queryText.value.trim(), userStore.user, {
      ratings: userStore.ratings,
      watched: userStore.watched,
      favorites: userStore.favorites,
    })
    textResults.value = recs
    try { localStorage.setItem('next_text_results', JSON.stringify(textResults.value)) } catch {}
    queryText.value = ''
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
