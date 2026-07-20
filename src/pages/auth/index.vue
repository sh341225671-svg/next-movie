<template>
  <div class="min-h-screen relative flex items-center justify-center p-5 overflow-hidden fade-in" style="background: linear-gradient(180deg, #0A0A0F, #1C1C2E);">
    <!-- 氛围背景 -->
    <div class="absolute inset-0 overflow-hidden opacity-20">
      <img src="/assets/auth-bg.jpg" class="w-full h-full object-cover" style="filter: blur(20px) brightness(0.3);" />
    </div>

    <!-- 表单 -->
    <div class="relative w-full" style="max-width: 440px;">
      <div class="text-center mb-10">
        <img src="/assets/logo.png" class="logo-art mx-auto mb-5" />
        <p style="font-size: 16px; color: var(--text-secondary);">注册或登录，开始发现好片</p>
      </div>

      <!-- 注册 -->
      <div v-if="isRegister" class="slide-up">
        <!-- 基本信息 -->
        <div style="margin-bottom: var(--space-6);">
          <p style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: var(--space-3); text-transform: uppercase; letter-spacing: 0.5px;">基本信息</p>
          <div class="space-y-4">
            <input v-model="nickname" placeholder="昵称" maxlength="20"
              style="font-size: 16px; padding: 14px 16px; border-radius: var(--r-lg); background: var(--surface); border: 1px solid var(--border); color: var(--text); width: 100%; outline: none; transition: border-color 0.3s; box-shadow: var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.05);"
              @focus="e => e.target.style.borderColor = 'var(--accent)'"
              @blur="e => e.target.style.borderColor = 'var(--border)'" />
            <div class="flex gap-3">
              <button v-for="g in genders" :key="g.value"
                @click="gender = g.value"
                style="font-size: 15px; padding: 12px 0; border-radius: var(--r-pill); flex: 1; transition: all 0.3s; border: 1px solid; cursor: pointer;"
                :style="gender === g.value
                  ? 'border-color:var(--accent); color:var(--accent); background:var(--accent-dim)'
                  : 'border-color:var(--border); color:var(--text-secondary); background:transparent'"
              >{{ g.label }}</button>
            </div>
            <input v-model="age" type="number" placeholder="年龄"
              style="font-size: 16px; padding: 14px 16px; border-radius: var(--r-lg); background: var(--surface); border: 1px solid var(--border); color: var(--text); width: 100%; outline: none; transition: border-color 0.3s; box-shadow: var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.05);"
              @focus="e => e.target.style.borderColor = 'var(--accent)'"
              @blur="e => e.target.style.borderColor = 'var(--border)'" />
          </div>
        </div>

        <!-- 偏好设置 -->
        <div style="margin-bottom: var(--space-6);">
          <p style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: var(--space-3); text-transform: uppercase; letter-spacing: 0.5px;">偏好设置</p>
          <p style="font-size: 14px; color: var(--text-tertiary); margin-bottom: var(--space-4);">挑选10部你喜欢的影片，帮你做精准推荐</p>
          <div class="flex flex-wrap gap-2" v-if="selectedMovies.length" style="margin-bottom: var(--space-3);">
            <span v-for="m in selectedMovies" :key="m.id"
              style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: var(--r-pill); background: var(--accent-dim); color: var(--accent); font-size: 13px;">
              {{ m.title }}
              <button @click="removeMovie(m)" style="font-size: 14px; line-height: 1; background: none; border: none; color: inherit; cursor: pointer;">×</button>
            </span>
          </div>
          <div class="relative">
            <input v-model="searchQuery" placeholder="搜索电影/电视剧..."
              style="font-size: 14px; padding: 12px 16px; border-radius: var(--r-md); background: var(--surface); border: 1px solid var(--border); color: var(--text); width: 100%; outline: none; box-shadow: var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.05);"
              @input="searchMovies" />
            <div v-if="searchResults.length" class="absolute top-full left-0 right-0 mt-1 z-10 overflow-hidden"
              style="border-radius: var(--r-md); background: var(--surface-hover); border: 1px solid var(--border); max-height: 200px; overflow-y: auto;">
              <button v-for="r in searchResults" :key="r.id" @click="addMovie(r)"
                style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; width: 100%; text-align: left; font-size: 13px; color: var(--text); cursor: pointer; transition: background 0.2s; border: none; background: transparent; font-family: inherit;"
                @mouseenter="e => e.target.style.background = 'var(--surface)'"
                @mouseleave="e => e.target.style.background = 'transparent'">
                <span style="width: 24px; height: 36px; overflow: hidden; border-radius: 3px; flex-shrink: 0;">
                  <img v-if="r.poster" :src="`https://image.tmdb.org/t/p/w92${r.poster_path}`" style="width: 100%; height: 100%; object-fit: cover;" />
                </span>
                <span>{{ r.title || r.name }}({{ (r.release_date || r.first_air_date || '').slice(0,4) }})</span>
              </button>
            </div>
          </div>
        </div>

        <button @click="submitRegister" class="btn-pill w-full" style="background: var(--accent-gradient); color: #000; box-shadow: var(--shadow-glow);">注册</button>
        <p class="text-center mt-4">
          <button @click="isRegister = false" style="font-size: 13px; color: var(--text-secondary); background: none; border: none; cursor: pointer; font-family: inherit;">已有账号？去登录</button>
        </p>
      </div>

      <!-- 登录 -->
      <div v-else class="slide-up">
        <div style="margin-bottom: var(--space-5);">
          <p style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: var(--space-3); text-transform: uppercase; letter-spacing: 0.5px;">登录</p>
          <input v-model="loginInput" placeholder="昵称或邮箱"
            style="font-size: 16px; padding: 14px 16px; border-radius: var(--r-lg); background: var(--surface); border: 1px solid var(--border); color: var(--text); width: 100%; outline: none; transition: border-color 0.3s; box-shadow: var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.05);"
            @focus="e => e.target.style.borderColor = 'var(--accent)'"
            @blur="e => e.target.style.borderColor = 'var(--border)'" />
        </div>
        <button @click="submitLogin" class="btn-pill w-full" style="background: var(--accent-gradient); color: #000; box-shadow: var(--shadow-glow);">登录</button>
        <p class="text-center mt-4">
          <button @click="isRegister = true" style="font-size: 13px; color: var(--text-secondary); background: none; border: none; cursor: pointer; font-family: inherit;">没有账号？去注册</button>
        </p>
      </div>

      <p v-if="error" class="mt-4 text-xs text-center" style="color: var(--heart);">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()
const isRegister = ref(true)
const nickname = ref('')
const gender = ref('')
const age = ref('')
const loginInput = ref('')
const error = ref('')
const searchQuery = ref('')
const searchResults = ref([])
const selectedMovies = ref([])

const genders = [
  { label: '男生', value: 'male' },
  { label: '女生', value: 'female' },
  { label: '其他', value: 'other' }
]

function submitRegister() {
  if (!nickname.value) { error.value = '请输入昵称'; return }
  if (!gender.value) { error.value = '请选择性别'; return }
  if (!age.value) { error.value = '请输入年龄'; return }
  userStore.setUser({ nickname: nickname.value, gender: gender.value, age: age.value, favoriteMovies: selectedMovies.value })
  router.push('/')
}

function submitLogin() {
  if (!loginInput.value) { error.value = '请输入昵称或邮箱'; return }
  userStore.setUser({ nickname: loginInput.value })
  router.push('/')
}

let searchTimeout = null
async function searchMovies() {
  clearTimeout(searchTimeout)
  if (!searchQuery.value.trim()) { searchResults.value = []; return }
  searchTimeout = setTimeout(async () => {
    try {
      const { searchMulti } = await import('@/data/tmdb')
      const data = await searchMulti(searchQuery.value.trim())
      searchResults.value = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 8)
    } catch (e) { console.error(e) }
  }, 300)
}

function addMovie(m) {
  if (selectedMovies.value.length >= 10) return
  if (selectedMovies.value.some(s => s.id === m.id)) return
  selectedMovies.value.push({ id: m.id, title: m.title || m.name, poster_path: m.poster_path })
  searchQuery.value = ''; searchResults.value = []
}

function removeMovie(m) { selectedMovies.value = selectedMovies.value.filter(s => s.id !== m.id) }
</script>
