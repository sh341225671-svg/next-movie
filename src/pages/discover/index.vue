<template>
  <div class="min-h-screen" style="background: var(--bg);">
    <header class="fixed top-0 left-0 right-0 z-50 glass" style="border-bottom: 1px solid var(--border);">
      <div style="width: 100%; max-width: 1152px; margin: 0 auto; padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between;">
        <img src="/assets/logo.png" class="logo-art-sm" alt="Next" />
        <button @click="router.push('/')" style="font-size: 14px; color: var(--text-secondary); background: none; border: none; cursor: pointer;">← 返回推荐</button>
      </div>
    </header>

    <main style="width: 100%; max-width: 1152px; margin: 0 auto; padding: 80px 24px 48px;">
      <!-- ═══ 类型标签行 ═══ -->
        <div style="padding-top: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <p style="font-size: 12px; font-weight: 600; color: var(--text-tertiary); letter-spacing: 0.5px; text-transform: uppercase;">🎯 类型</p>
            <button @click="genreExpanded = !genreExpanded"
              style="font-size: 12px; color: var(--accent); background: none; border: none; cursor: pointer;">
              {{ genreExpanded ? '收起 ▲' : '展开 ▼' }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2" :style="{ maxHeight: genreExpanded ? 'none' : '120px', overflow: 'hidden' }">
            <button v-for="g in genres" :key="g.id" @click="selectGenre(g.id)"
              class="filter-chip genre-chip"
              :class="{ active: selectedGenre === g.id }"
              style="flex: 0 0 calc(50% - 4px);"
              :style="{
                flex: windowWidth >= 768 ? '0 0 calc(33.33% - 6px)' : '0 0 calc(50% - 4px)',
                textAlign: 'left'
              }"
            >{{ g.emoji }} {{ g.name }}</button>
          </div>
          <div v-if="!genreExpanded && genres.length > 6" style="text-align: center; margin-top: 4px;">
            <button @click="genreExpanded = true" style="font-size: 12px; color: var(--text-tertiary); background: none; border: none; cursor: pointer;">▼ 展开全部</button>
          </div>
        </div>

      <!-- ═══ 筛选栏 ═══ -->
      <div style="margin-top: 8px;">
        <p style="font-size: 12px; font-weight: 600; color: var(--text-tertiary); margin-bottom: 8px; letter-spacing: 0.5px; text-transform: uppercase;">🔍 筛选条件</p>
        <div class="filter-bar" style="margin-bottom: 20px;">
        <!-- 评分筛选 -->
        <button class="filter-chip" :class="{ active: filterRating !== null }"
          @click="showRatingFilter = !showRatingFilter">
          ⭐ {{ filterRating ? `≥${filterRating}分` : '评分' }}
        </button>
        <!-- 年份筛选 -->
        <button class="filter-chip" :class="{ active: filterYear !== null }"
          @click="showYearFilter = !showYearFilter">
          📅 {{ filterYear || '年份' }}
        </button>
        <!-- 排序 -->
        <button v-for="opt in sortOptions" :key="opt.value"
          class="filter-chip" :class="{ active: sortBy === opt.value }"
          @click="sortBy = opt.value; loadMovies()">
          {{ opt.label }}
        </button>
        <!-- 重置 -->
        <button v-if="hasActiveFilters" class="filter-chip" @click="resetFilters"
          style="color: var(--heart); border-color: transparent;">
          ✕ 清除筛选
        </button>
      </div>
    </div>

    <!-- ═══ 评分下拉 ═══ -->
      <div v-if="showRatingFilter" class="slide-up" style="margin-bottom: 16px;">
        <div class="card" style="padding: 16px;">
          <div class="flex items-center justify-between mb-3">
            <span style="font-size: 14px; font-weight: 600;">最低评分</span>
            <span v-if="filterRating" style="font-size: 13px; color: var(--accent);">当前：≥{{ filterRating }}分</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button v-for="r in [5,6,7,8,9]" :key="r"
              class="filter-chip" :class="{ active: filterRating === r }"
              @click="filterRating = filterRating === r ? null : r; loadMovies()">
              {{ '⭐'.repeat(Math.floor(r/2)) }}{{ r%2 ? '½' : '' }} {{ r }}分+
            </button>
          </div>
        </div>
      </div>

      <!-- ═══ 年份下拉 ═══ -->
      <div v-if="showYearFilter" class="slide-up" style="margin-bottom: 16px;">
        <div class="card" style="padding: 16px;">
          <div class="flex items-center justify-between mb-3">
            <span style="font-size: 14px; font-weight: 600;">年份</span>
            <span v-if="filterYear" style="font-size: 13px; color: var(--accent);">当前：{{ filterYear }}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button v-for="y in yearOptions" :key="y.value"
              class="filter-chip" :class="{ active: filterYear === y.value }"
              @click="filterYear = filterYear === y.value ? null : y.value; loadMovies()">
              {{ y.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- ═══ 加载态 ═══ -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" style="border-color: var(--accent); border-top-color: transparent;"></div>
        <span style="margin-left: 12px; font-size: 14px; color: var(--text-secondary);">加载中...</span>
      </div>

      <!-- ═══ 错误态 ═══ -->
      <div v-if="error" style="text-align: center; padding: 40px 0;">
        <p style="font-size: 14px; color: var(--text-tertiary); margin-bottom: 12px;">{{ error }}</p>
        <button @click="loadMovies" style="padding: 8px 20px; border-radius: var(--r-pill); font-size: 13px; background: var(--surface); color: var(--text-secondary); border: none; cursor: pointer;">重试</button>
      </div>

      <!-- ═══ 结果统计 ═══ -->
      <div v-if="!loading && movies.length" style="font-size: 13px; color: var(--text-tertiary); margin-bottom: 12px;">
        {{ totalResults > 0 ? `共 ${totalResults} 部影片` : `找到 ${movies.length} 部` }}
      </div>

      <!-- ═══ 影片网格 ═══ -->
      <div v-if="movies.length">
        <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 20px;">
          <div v-for="m in movies" :key="m.id" class="cursor-pointer transition-all duration-300 hover:-translate-y-1" @click="goDetail(m)">
            <div class="card" style="aspect-ratio: 2/3; overflow: hidden;">
              <img v-if="m.poster" :src="m.poster" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
              <img v-else src="/assets/poster-placeholder.png" class="w-full h-full object-cover" />
            </div>
            <p style="font-size: 14px; font-weight: 500; margin-top: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ m.title }}</p>
            <div class="flex items-center gap-2" style="margin-top: 4px;">
              <span style="font-size: 12px; color: var(--text-secondary);">{{ m.year }}</span>
              <span v-if="m.rating" class="rating-badge">★ {{ m.rating }}</span>
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div v-if="hasMore" class="text-center" style="margin-top: 32px;">
          <button @click="loadMore" class="btn-pill" style="background: var(--surface); color: var(--text-secondary);">
            加载更多
          </button>
        </div>
      </div>

      <!-- 空结果 -->
      <div v-if="!loading && !error && !movies.length" class="text-center py-20">
        <p style="font-size: 15px; color: var(--text-secondary);">没有找到符合条件的影片</p>
        <button @click="resetFilters" style="margin-top: 12px; font-size: 13px; color: var(--accent); background: none; border: none; cursor: pointer;">清除筛选条件</button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { discoverMovies, getGenres, getPopular, formatMovie } from '@/data/tmdb'

const router = useRouter()

const genres = ref([])
const movies = ref([])
const loading = ref(true)
const error = ref('')
const selectedGenre = ref(null)
const genreExpanded = ref(false)
const windowWidth = ref(window.innerWidth)
const filterRating = ref(null)
const filterYear = ref(null)
const sortBy = ref('popularity.desc')
const showRatingFilter = ref(false)
const showYearFilter = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const totalResults = ref(0)

const hasActiveFilters = computed(() =>
  selectedGenre.value || filterRating.value || filterYear.value || sortBy.value !== 'popularity.desc'
)

const hasMore = computed(() => currentPage.value < totalPages.value)

const sortOptions = [
  { label: '🔥 热门', value: 'popularity.desc' },
  { label: '⭐ 评分', value: 'vote_average.desc' },
  { label: '📅 最新', value: 'primary_release_date.desc' },
]

const yearOptions = computed(() => {
  const year = new Date().getFullYear()
  return [
    { label: '2026年', value: `${year}` },
    { label: '2025-2026', value: `${year-1}-${year}` },
    { label: '2020年代', value: '2020-2029' },
    { label: '2010年代', value: '2010-2019' },
    { label: '2000年代', value: '2000-2009' },
    { label: '90年代经典', value: '1990-1999' },
    { label: '80年代经典', value: '1980-1989' },
  ]
})

// 类型图标映射
const genreEmojis = {
  28: '💥', 12: '🧭', 16: '🎨', 35: '😄', 80: '🔪',
  99: '📖', 18: '🎭', 10751: '👨‍👩‍👧', 14: '🧙', 36: '📜',
  27: '👻', 10402: '🎵', 9648: '🔍', 10749: '💕', 878: '🚀',
  10770: '📺', 53: '🔫', 10752: '⚔️', 37: '🤠'
}

onMounted(async () => {
  try {
    const g = await getGenres()
    genres.value = (g.genres || []).map(g => ({
      ...g,
      emoji: genreEmojis[g.id] || '🎬'
    }))
  } catch (e) {
    console.error(e)
  }
  // 默认加载热门影片
  await loadMovies()
})

async function loadMovies() {
  loading.value = true
  error.value = ''
  currentPage.value = 1

  try {
    const filters = {
      sort_by: sortBy.value,
      page: currentPage.value,
    }

    if (selectedGenre.value) filters.with_genres = selectedGenre.value
    if (filterRating.value) {
      filters['vote_average.gte'] = filterRating.value
      filters['vote_count.gte'] = 50 // 避免评分虚高
    }
    if (filterYear.value) {
      if (filterYear.value.includes('-')) {
        const [start, end] = filterYear.value.split('-')
        filters['primary_release_date.gte'] = `${start}-01-01`
        filters['primary_release_date.lte'] = `${end}-12-31`
      } else {
        filters['primary_release_date.gte'] = `${filterYear.value}-01-01`
        filters['primary_release_date.lte'] = `${filterYear.value}-12-31`
      }
    }

    const data = await discoverMovies(filters)
    movies.value = (data.results || []).map(formatMovie)
    totalPages.value = data.total_pages || 1
    totalResults.value = data.total_results || 0
  } catch (e) {
    console.error(e)
    error.value = '数据加载失败，请检查网络后重试'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (currentPage.value >= totalPages.value) return
  currentPage.value++
  try {
    const filters = {
      sort_by: sortBy.value,
      page: currentPage.value,
    }
    if (selectedGenre.value) filters.with_genres = selectedGenre.value
    if (filterRating.value) {
      filters['vote_average.gte'] = filterRating.value
      filters['vote_count.gte'] = 50
    }
    if (filterYear.value) {
      if (filterYear.value.includes('-')) {
        const [start, end] = filterYear.value.split('-')
        filters['primary_release_date.gte'] = `${start}-01-01`
        filters['primary_release_date.lte'] = `${end}-12-31`
      } else {
        filters['primary_release_date.gte'] = `${filterYear.value}-01-01`
        filters['primary_release_date.lte'] = `${filterYear.value}-12-31`
      }
    }
    const data = await discoverMovies(filters)
    movies.value = [...movies.value, ...(data.results || []).map(formatMovie)]
  } catch (e) {
    console.error(e)
    currentPage.value--
  }
}

function selectGenre(id) {
  selectedGenre.value = selectedGenre.value === id ? null : id
  loadMovies()
}

function resetFilters() {
  selectedGenre.value = null
  filterRating.value = null
  filterYear.value = null
  sortBy.value = 'popularity.desc'
  showRatingFilter.value = false
  showYearFilter.value = false
  loadMovies()
}

function goDetail(m) { router.push(`/movie/${m.id}?type=${m.mediaType || 'movie'}`) }
</script>
