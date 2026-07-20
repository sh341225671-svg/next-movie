<template>
  <div class="min-h-screen" style="background: var(--bg);">
    <header class="fixed top-0 left-0 right-0 z-50 glass" style="border-bottom: 1px solid var(--border);">
      <div style="width: 100%; max-width: 1152px; margin: 0 auto; padding: 0 24px; height: 56px; display: flex; align-items: center; gap: 16px;">
        <button @click="router.back()" style="font-size: 18px; color: var(--text-secondary); background: none; border: none; cursor: pointer; padding: 8px; margin: -8px;">←</button>
        <h1 style="font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ movie?.title || '加载中...' }}</h1>
      </div>
    </header>

    <div v-if="loading" style="max-width: 1152px; margin: 0 auto; padding: 120px 24px 0; text-align: center;">
      <div class="skeleton" style="aspect-ratio: 2/1; border-radius: var(--r-lg);" />
      <p style="margin-top: 16px; font-size: 14px; color: var(--text-tertiary);">
        {{ loadTimeout ? '加载超时，请检查网络或刷新重试' : '正在加载...' }}
      </p>
      <button v-if="loadTimeout" @click="loadData"
        style="margin-top: 12px; padding: 8px 20px; border-radius: var(--r-pill); font-size: 13px; background: var(--surface); color: var(--accent); border: none; cursor: pointer;">
        重新加载
      </button>
    </div>

    <main style="max-width: 1152px; margin: 0 auto; padding: 80px 24px 48px;" v-if="movie">
      <!-- ═══ Hero区 + 氛围背景 ═══ -->
      <div class="slide-up" style="position: relative;">
        <div v-if="movie.backdrop" style="position: absolute; top: -40px; left: -24px; right: -24px; height: 420px; overflow: hidden; pointer-events: none; z-index: 0;"
          ><img :src="movie.backdrop" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.08; filter: blur(40px);" />
        </div>
        <div class="flex flex-col md:flex-row gap-8 items-start" style="position: relative; z-index: 1;">
          <div class="flex-shrink-0" style="width: 200px;">
            <div class="card" style="aspect-ratio: 2/3; overflow: hidden;">
              <img v-if="movie.poster" :src="movie.poster" class="w-full h-full object-cover" />
              <img v-else src="/assets/poster-placeholder.png" class="w-full h-full object-cover" />
            </div>
          </div>
          <div class="flex-1">
            <h1 style="font-family: var(--font-display); font-size: 32px; font-weight: 700; line-height: 1.05;">{{ movie.title }}</h1>
            <div class="flex flex-wrap items-center gap-4" style="margin-top: var(--space-3); font-size: 14px; color: var(--text-secondary);">
              <span>{{ movie.year }}</span>
              <span v-if="movie.runtime">{{ Math.floor(movie.runtime/60) }}h{{ movie.runtime%60 }}m</span>
              <span v-if="movie.director">导演: {{ movie.director }}</span>
            </div>
            <div class="flex items-center gap-3" style="margin-top: var(--space-3);">
              <span class="rating-badge" style="font-size: 16px; padding: 4px 12px;">★ {{ movie.rating }}</span>
              <span style="font-size: 12px; color: var(--text-tertiary);">{{ getTmdbRatingInfo(movie.rating).label }}</span>
            </div>
            <div class="flex flex-wrap gap-2" style="margin-top: var(--space-4);">
              <span v-for="g in movie.genres" :key="g.id" style="padding: 4px 14px; border-radius: var(--r-pill); font-size: 12px; background: var(--surface); color: var(--text-secondary);">{{ g.name }}</span>
            </div>

            <!-- ═══ 10分制评分（5星半星） ═══ -->
            <div v-if="userStore.isLoggedIn" style="margin-top: var(--space-4);">
              <div class="flex items-center gap-3">
                <span style="font-size: 13px; color: var(--text-secondary);">我的评分：</span>
                <div class="flex gap-1">
                  <div v-for="s in 5" :key="s" class="star-10-wrapper" style="position: relative; width: 24px; height: 24px; font-size: 24px; line-height: 1;">
                    <!-- 左半星点击区（奇数分） -->
                    <div @click="rate(s * 2 - 1)"
                      @mouseenter="hoverRating = s * 2 - 1" @mouseleave="hoverRating = 0"
                      style="position: absolute; left: 0; top: 0; width: 50%; height: 100%; z-index: 3; cursor: pointer;"></div>
                    <!-- 右半星点击区（偶数分） -->
                    <div @click="rate(s * 2)"
                      @mouseenter="hoverRating = s * 2" @mouseleave="hoverRating = 0"
                      style="position: absolute; right: 0; top: 0; width: 50%; height: 100%; z-index: 3; cursor: pointer;"></div>
                    <!-- 灰色底星 -->
                    <span style="color: var(--text-tertiary); pointer-events: none;">★</span>
                    <!-- 金色填充 -->
                    <span style="position: absolute; left: 0; top: 0; overflow: hidden; pointer-events: none; white-space: nowrap; transition: width 0.1s;"
                      :style="{
                        width: displayRating >= s * 2 ? '100%' : displayRating >= s * 2 - 1 ? '50%' : '0%',
                        color: 'var(--accent)'
                      }"
                    >★</span>
                  </div>
                </div>
              </div>
              <div v-if="userRatingLabel" style="margin-top: 4px;">
                <span class="rating-label">{{ userRatingLabel.label }}</span>
                <span style="font-size: 11px; color: var(--text-tertiary); margin-left: 8px;">
                  {{ userRatingLabel.short }} · {{ userRating }}分
                </span>
              </div>
            </div>
            <div v-else style="margin-top: var(--space-3);">
              <span style="font-size: 13px; color: var(--text-tertiary);">登录后即可评分</span>
              <button @click="router.push('/auth')" style="margin-left: 8px; font-size: 13px; color: var(--accent); background: none; border: none; cursor: pointer;">去登录 →</button>
            </div>

            <p style="margin-top: var(--space-4); font-size: 15px; line-height: 1.6; color: var(--text-secondary);">{{ movie.overview || '暂无简介' }}</p>

            <!-- 操作按钮 -->
            <div class="flex items-center gap-8" style="margin-top: var(--space-5);">
              <button @click="toggleLike"
                style="display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; background: none; border: none; cursor: pointer; padding: 12px; margin: -12px; font-family: inherit; transition: color var(--duration);"
                :style="{ color: userStore.isLiked(movie.id) ? 'var(--heart)' : 'var(--text-secondary)' }">
                <span style="font-size: 24px;">{{ userStore.isLiked(movie.id) ? '♥' : '♡' }}</span>
                <span>点赞</span>
              </button>
              <button @click="toggleFav"
                style="display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; background: none; border: none; cursor: pointer; padding: 12px; margin: -12px; font-family: inherit; transition: color var(--duration);"
                :style="{ color: userStore.isFavorited(movie.id) ? 'var(--accent)' : 'var(--text-secondary)' }">
                <span style="font-size: 24px;">{{ userStore.isFavorited(movie.id) ? '★' : '☆' }}</span>
                <span>收藏</span>
              </button>
              <button @click="toggleWatched"
                style="display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; background: none; border: none; cursor: pointer; padding: 12px; margin: -12px; font-family: inherit; transition: color var(--duration);"
                :style="{ color: userStore.isWatched(movie.id) ? 'var(--success)' : 'var(--text-secondary)' }">
                <span style="font-size: 24px;">{{ userStore.isWatched(movie.id) ? '✓' : '○' }}</span>
                <span>看过</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ 播放源 ═══ -->
      <section class="slide-up" style="margin-top: var(--space-6);">
        <h2 style="font-size: 18px; font-weight: 700; margin-bottom: var(--space-3);">在哪看</h2>
        <div v-if="providersLoading" class="skeleton" style="height: 60px; border-radius: var(--r-lg);" />
        <div v-else>
          <!-- 海外平台 -->
          <div v-if="providers.overseas.length">
            <p style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 8px;">海外</p>
            <div class="flex flex-wrap gap-3">
              <a v-for="p in providers.overseas" :key="p.id" :href="`https://www.themoviedb.org/movie/${movie.id}/watch`" target="_blank"
                style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--r-pill); background: var(--surface); font-size: 13px; color: var(--text-secondary); text-decoration: none; transition: all 0.2s;"
                @mouseenter="e => e.target.style.background = 'var(--surface-hover)'"
                @mouseleave="e => e.target.style.background = 'var(--surface)'">
                <img v-if="p.logo" :src="p.logo" style="width: 20px; height: 20px; border-radius: 4px;" />
                <span>{{ p.name }}</span>
                <span style="font-size: 10px; color: var(--accent);">{{ p.type }}</span>
              </a>
            </div>
          </div>
          <div v-else style="font-size: 13px; color: var(--text-tertiary); margin-bottom: 8px;">海外暂无播放源</div>

          <!-- 国内平台 -->
          <div style="margin-top: 12px;">
            <p style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 8px;">
              国内
              <span style="font-size: 11px; color: var(--text-tertiary);">（搜索）</span>
            </p>
            <!-- TMDB 返回的国内平台 -->
            <div class="flex flex-wrap gap-3" v-if="providers.domestic.length">
              <a v-for="p in providers.domestic" :key="p.id" :href="`https://www.themoviedb.org/movie/${movie.id}/watch`" target="_blank"
                style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--r-pill); background: var(--surface); font-size: 13px; color: var(--text-secondary); text-decoration: none; transition: all 0.2s;"
                @mouseenter="e => e.target.style.background = 'var(--surface-hover)'"
                @mouseleave="e => e.target.style.background = 'var(--surface)'">
                <img v-if="p.logo" :src="p.logo" style="width: 20px; height: 20px; border-radius: 4px;" />
                <span>{{ p.name }}</span>
                <span style="font-size: 10px; color: var(--accent);">{{ p.type }}</span>
              </a>
            </div>
            <!-- 搜索链接（用于国内平台手动搜索） -->
            <div class="flex flex-wrap gap-3" style="margin-top: 8px;">
              <a v-for="p in cnPlatforms" :key="p.name"
                :href="p.url(movie.title)" target="_blank" rel="noopener"
                style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--r-pill); background: var(--surface); font-size: 13px; color: var(--text-secondary); text-decoration: none; transition: all 0.2s;"
                @mouseenter="e => e.target.style.background = 'var(--surface-hover)'"
                @mouseleave="e => e.target.style.background = 'var(--surface)'">
                <span style="width: 20px; height: 20px; border-radius: 4px; background: var(--accent-dim); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--accent);">{{ p.icon }}</span>
                <span>{{ p.name }}</span>
                <span style="font-size: 10px; color: var(--text-tertiary);">搜索</span>
              </a>
            </div>
          </div>

          <!-- 免费资源（类似大米星球） -->
          <div style="margin-top: 16px;">
            <p style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 8px;">
              🆓 免费资源
              <span style="font-size: 11px; color: var(--text-tertiary);">（点击搜索）</span>
            </p>
            <div class="flex flex-wrap gap-3">
              <a v-for="p in freeSources" :key="p.name"
                :href="p.url(movie.title)" target="_blank" rel="noopener"
                style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--r-pill); background: var(--surface); font-size: 13px; color: var(--text-secondary); text-decoration: none; transition: all 0.2s;"
                @mouseenter="e => e.target.style.background = 'var(--surface-hover)'"
                @mouseleave="e => e.target.style.background = 'var(--surface)'">
                <span style="font-size: 16px;">{{ p.icon }}</span>
                <span>{{ p.name }}</span>
                <span style="font-size: 10px; color: var(--accent);">免费</span>
              </a>
            </div>
            <div style="margin-top: 12px; padding: 10px 14px; border-radius: var(--r-md); background: var(--surface); border: 1px solid rgba(255,255,255,0.04);">
              <p style="font-size: 12px; line-height: 1.5; color: var(--text-tertiary);">
                💡 免费资源来自第三方站点，建议浏览时注意保护个人信息，不下载任何不明文件。Next 仅提供信息检索服务。
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ 演员 ═══ -->
      <section v-if="movie.cast?.length" class="slide-up" style="margin-top: var(--space-6);">
        <h2 style="font-size: 18px; font-weight: 700; margin-bottom: var(--space-3);">演员</h2>
        <div class="scroll-x flex gap-4 pb-2">
          <div v-for="actor in movie.cast" :key="actor.id" class="flex-shrink-0 text-center" style="width: 70px;">
            <div style="width: 56px; height: 56px; margin: 0 auto; border-radius: 50%; overflow: hidden; background: var(--surface);">
              <img v-if="actor.photo" :src="actor.photo" class="w-full h-full object-cover" />
            </div>
            <p style="font-size: 12px; margin-top: 4px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ actor.name }}</p>
          </div>
        </div>
      </section>

      <!-- ═══ 同类推荐 ═══ -->
      <section v-if="similarMovies.length" class="slide-up" style="margin-top: var(--space-6);">
        <div class="flex items-center justify-between mb-3">
          <h2 style="font-size: 18px; font-weight: 700;">同类推荐</h2>
          <span style="font-size: 13px; color: var(--text-tertiary);">共 {{ similarMovies.length }} 部</span>
        </div>
        <div class="scroll-x flex gap-4 pb-2">
          <div v-for="m in similarMovies" :key="m.id" class="flex-shrink-0 cursor-pointer transition-all duration-300 hover:-translate-y-1" style="width: 120px;" @click="goDetail(m)">
            <div class="card" style="aspect-ratio: 2/3; overflow: hidden;">
              <img v-if="m.poster" :src="m.poster" class="w-full h-full object-cover" />
              <img v-else src="/assets/poster-placeholder.png" class="w-full h-full object-cover" />
            </div>
            <p style="font-size: 13px; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">{{ m.title }}</p>
            <span v-if="m.rating" class="rating-badge" style="margin-top: 2px;">★ {{ m.rating }}</span>
          </div>
        </div>
      </section>

      <!-- ═══ 评论区 ═══ -->
      <section class="slide-up" style="margin-top: var(--space-6); padding-top: var(--space-5); border-top: 1px solid var(--border);">
        <h2 style="font-size: 18px; font-weight: 700; margin-bottom: var(--space-3);">评论 ({{ comments.length }})</h2>

        <div v-if="userStore.isLoggedIn" class="card" style="padding: 16px; margin-bottom: var(--space-3);">
          <textarea v-model="newComment" placeholder="写下你的观后感..."
            style="width: 100%; min-height: 80px; font-size: 14px; line-height: 1.5; padding: 12px; border-radius: var(--r-md); background: var(--bg); border: 1px solid var(--border); color: var(--text); resize: vertical; outline: none; font-family: inherit;"></textarea>
          <div class="flex items-center justify-between" style="margin-top: 12px;">
            <span v-if="!newComment.trim()" style="font-size: 12px; color: var(--text-tertiary);">友善的评论是交流的起点</span>
            <span v-else style="font-size: 12px; color: var(--text-tertiary);">{{ newComment.length }} / 500</span>
            <button @click="submitComment" :disabled="!newComment.trim()"
              class="btn-pill"
              :style="{ background: newComment.trim() ? 'var(--accent-gradient)' : 'var(--surface)', color: newComment.trim() ? '#000' : 'var(--text-tertiary)', opacity: newComment.trim() ? 1 : 0.5 }">
              发表评论
            </button>
          </div>
        </div>
        <div v-else style="text-align: center; padding: 20px 0; margin-bottom: var(--space-3);">
          <p style="font-size: 13px; color: var(--text-tertiary);">登录后即可发表评论</p>
          <button @click="router.push('/auth')" style="margin-top: 8px; font-size: 13px; color: var(--accent); background: none; border: none; cursor: pointer;">去登录 →</button>
        </div>

        <div v-if="!comments.length" style="text-align: center; padding: 20px 0;">
          <p style="font-size: 14px; color: var(--text-tertiary);">暂无评论，来写第一条吧 ✍️</p>
        </div>
        <div v-for="(c, i) in comments" :key="i" style="padding: 12px 0; border-bottom: 1px solid var(--border);">
          <div class="flex items-center gap-3">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent-dim); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--accent);">{{ c.author[0] }}</div>
            <div>
              <p style="font-size: 13px; font-weight: 600;">{{ c.author }}</p>
              <div class="flex items-center gap-2">
                <span v-if="c.rating" class="star-rating star-rating-sm">
                  <span v-for="s in 5" :key="s" class="star" :class="{ filled: s <= c.rating }">★</span>
                </span>
                <span style="font-size: 11px; color: var(--text-tertiary);">{{ c.time }}</span>
              </div>
            </div>
          </div>
          <p style="font-size: 14px; line-height: 1.5; color: var(--text-secondary); margin-top: 8px; white-space: pre-wrap;">{{ c.content }}</p>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { getMovieDetail, getTvDetail, getSimilar, getWatchProviders, formatMovieDetail, formatMovie, CN_PLATFORMS, FREE_SOURCES, formatWatchProviders } from '@/data/tmdb'
import { getTmdbRatingInfo, RATING_LEVELS } from '@/data/rating'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const movie = ref(null)
const loading = ref(true)
const loadTimeout = ref(false)
const similarMovies = ref([])
const providers = ref({ overseas: [], domestic: [] })
const providersLoading = ref(true)

// 评分
const userRating = ref(0)
const hoverRating = ref(0)
const displayRating = computed(() => hoverRating.value || userRating.value)
const userRatingLabel = computed(() => {
  const r = hoverRating.value || userRating.value
  return RATING_LEVELS.find(l => l.score === r) || null
})

// 评论
const comments = ref([])
const newComment = ref('')

// 判断是电影还是剧集，使用不同 API
const mediaType = route.query.type || 'movie'
const detailFn = mediaType === 'tv' ? getTvDetail : getMovieDetail
let loadTimer = null

async function loadData() {
  const movieId = Number(route.params.id)
  loading.value = true
  loadTimeout.value = false
  loadTimer = setTimeout(() => { loadTimeout.value = true }, 4000)
  try {
    const data = await detailFn(movieId)
    movie.value = formatMovieDetail(data)

    // 同类推荐
    const simData = await getSimilar(movieId)
    similarMovies.value = (simData.results || []).slice(0, 10).map(formatMovie)

    // 播放源
    const watchData = await getWatchProviders(movieId)
    providers.value = formatWatchProviders(watchData)

    // 加载用户的已有评分
    const existing = userStore.getRating(movieId)
    if (existing) userRating.value = existing.score
  } catch (e) {
    console.error(e)
  } finally {
    clearTimeout(loadTimer)
    loading.value = false
    providersLoading.value = false
  }
}

onMounted(loadData)

// 同类推荐切换影片时刷新数据
watch(() => route.params.id, () => {
  if (movie.value && route.params.id != movie.value.id) loadData()
})

function rate(score) {
  userRating.value = score
  userStore.setRating(movie.value.id, score, { title: movie.value.title, poster: movie.value.poster, genreIds: movie.value.genreIds || [] })
}

function toggleLike() {
  if (!userStore.isLoggedIn) { router.push('/auth'); return }
  userStore.toggleLike(movie.value.id, { title: movie.value.title, poster: movie.value.poster })
}

function toggleFav() {
  if (!userStore.isLoggedIn) { router.push('/auth'); return }
  userStore.toggleFavorite(movie.value.id, { title: movie.value.title, poster: movie.value.poster, genreIds: movie.value.genreIds || [] })
}

function toggleWatched() {
  if (!userStore.isLoggedIn) { router.push('/auth'); return }
  userStore.markWatched(movie.value.id, { title: movie.value.title, userRating: userRating.value })
}

function submitComment() {
  if (!newComment.value.trim() || newComment.value.length > 500) return
  const now = new Date()
  const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  comments.value.unshift({
    author: userStore.user?.nickname || '匿名用户',
    content: newComment.value.trim(),
    rating: userRating.value || 0,
    time: timeStr
  })
  newComment.value = ''
}

function goDetail(m) { router.push(`/movie/${m.id}?type=${m.mediaType || 'movie'}`) }

const cnPlatforms = CN_PLATFORMS
const freeSources = FREE_SOURCES
</script>
