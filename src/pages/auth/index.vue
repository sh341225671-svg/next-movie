<template>
  <div class="min-h-screen relative flex items-center justify-center p-5 overflow-hidden fade-in" style="background: linear-gradient(180deg, #0A0A0F, #1C1C2E);">
    <div class="absolute inset-0 overflow-hidden opacity-20">
      <img src="/assets/auth-bg.jpg" class="w-full h-full object-cover" style="filter: blur(20px) brightness(0.3);" />
    </div>

    <div class="relative w-full" style="max-width: 440px;">
      <div class="text-center mb-10">
        <img src="/assets/logo.png" class="logo-art mx-auto mb-5" />
        <p style="font-size: 16px; color: var(--text-secondary);">注册或登录，开始发现好片</p>
      </div>

      <!-- 注册 -->
      <div v-if="isRegister" class="slide-up">
        <div style="margin-bottom: var(--space-6);">
          <p style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: var(--space-3); text-transform: uppercase; letter-spacing: 0.5px;">账号信息</p>
          <div class="space-y-4">
            <input v-model="nickname" placeholder="昵称（同时也是登录名）" maxlength="20"
              style="font-size: 16px; padding: 14px 16px; border-radius: var(--r-lg); background: var(--surface); border: 1px solid var(--border); color: var(--text); width: 100%; outline: none;">
            <input v-model="password" type="password" placeholder="密码（至少6位）" maxlength="50"
              style="font-size: 16px; padding: 14px 16px; border-radius: var(--r-lg); background: var(--surface); border: 1px solid var(--border); color: var(--text); width: 100%; outline: none;">
            <input v-model="confirmPassword" type="password" placeholder="确认密码" maxlength="50"
              style="font-size: 16px; padding: 14px 16px; border-radius: var(--r-lg); background: var(--surface); border: 1px solid var(--border); color: var(--text); width: 100%; outline: none;">
          </div>
        </div>
        <div style="margin-bottom: var(--space-6);">
          <p style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: var(--space-3); text-transform: uppercase; letter-spacing: 0.5px;">个人信息</p>
          <div class="space-y-4">
            <div class="flex gap-3">
              <button v-for="g in genders" :key="g.value" @click="gender = g.value"
                style="font-size: 15px; padding: 12px 0; border-radius: var(--r-pill); flex: 1; transition: all 0.3s; border: 1px solid; cursor: pointer;"
                :style="gender === g.value ? 'border-color:var(--accent); color:var(--accent); background:var(--accent-dim)' : 'border-color:var(--border); color:var(--text-secondary); background:transparent'">{{ g.label }}</button>
            </div>
            <input v-model="age" type="number" placeholder="年龄"
              style="font-size: 16px; padding: 14px 16px; border-radius: var(--r-lg); background: var(--surface); border: 1px solid var(--border); color: var(--text); width: 100%; outline: none;">
          </div>
        </div>
        <div style="margin-bottom: var(--space-6);">
          <p style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: var(--space-3); text-transform: uppercase; letter-spacing: 0.5px;">偏好设置</p>
          <p style="font-size: 14px; color: var(--text-tertiary); margin-bottom: var(--space-3);">挑选你喜欢的影片，越多推荐越准确。至少选 <strong>5 部</strong>。</p>
          <div class="flex flex-wrap gap-2" v-if="selectedMovies.length" style="margin-bottom: var(--space-3);">
            <span v-for="m in selectedMovies" :key="m.id"
              style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: var(--r-pill); background: var(--accent-dim); color: var(--accent); font-size: 13px;">
              {{ m.title }}
              <button @click="removeMovie(m)" style="font-size: 14px; line-height: 1; background: none; border: none; color: inherit; cursor: pointer;">×</button>
            </span>
          </div>
          <div class="relative">
            <input v-model="searchQuery" placeholder="搜索电影/电视剧..." style="font-size:14px;padding:12px 16px;border-radius:var(--r-md);background:var(--surface);border:1px solid var(--border);color:var(--text);width:100%;outline:none;box-sizing:border-box;" />
            <div v-if="searchResults.length" class="absolute top-full left-0 right-0 mt-1 z-10 overflow-hidden"
              style="border-radius: var(--r-md); background: var(--surface-hover); border: 1px solid var(--border); max-height: 200px; overflow-y: auto;">
              <button v-for="r in searchResults" :key="r.id" @click="addMovie(r)"
                style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; width: 100%; text-align: left; font-size: 13px; color: var(--text); cursor: pointer; transition: background 0.2s; border: none; background: transparent; font-family: inherit;">
                <span v-if="r.poster" style="width: 24px; height: 36px;"><img :src="r.poster" style="width:100%;height:100%;object-fit:cover;" /></span>
                <span>{{ r.title || r.name }}({{ (r.release_date || r.first_air_date || '').slice(0,4) }})</span>
              </button>
            </div>
          </div>
        </div>
        <button @click="submitRegister" class="btn-pill w-full" style="background: var(--accent-gradient); color: #000; box-shadow: var(--shadow-glow);">注册</button>
        <p class="text-center mt-4">
          <button @click="isRegister = false" style="font-size: 13px; color: var(--text-secondary); background: none; border: none; cursor: pointer;">已有账号？去登录</button>
        </p>
      </div>

      <!-- 登录 -->
      <div v-else class="slide-up">
        <div style="margin-bottom: var(--space-5);">
          <p style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: var(--space-3); text-transform: uppercase; letter-spacing: 0.5px;">登录</p>
          <div class="space-y-4">
            <input v-model="loginUsername" placeholder="昵称"
              style="font-size: 16px; padding: 14px 16px; border-radius: var(--r-lg); background: var(--surface); border: 1px solid var(--border); color: var(--text); width: 100%; outline: none;">
            <input v-model="loginPassword" type="password" placeholder="密码"
              style="font-size: 16px; padding: 14px 16px; border-radius: var(--r-lg); background: var(--surface); border: 1px solid var(--border); color: var(--text); width: 100%; outline: none;">
          </div>
        </div>
        <button @click="submitLogin" class="btn-pill w-full" style="background: var(--accent-gradient); color: #000; box-shadow: var(--shadow-glow);">登录</button>
        <p class="text-center mt-4">
          <button @click="isRegister = true" style="font-size: 13px; color: var(--text-secondary); background: none; border: none; cursor: pointer;">没有账号？去注册</button>
        </p>
      </div>

      <p v-if="error" class="mt-4 text-xs text-center" style="color: var(--heart);">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()
const isRegister = ref(true)

// 注册
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const gender = ref('')
const age = ref('')
const searchQuery = ref('')
const searchResults = ref([])
const selectedMovies = ref([])

// 登录
const loginUsername = ref('')
const loginPassword = ref('')

const error = ref('')

const genders = [
  { label: '男生', value: 'male' },
  { label: '女生', value: 'female' },
  { label: '其他', value: 'other' }
]

// 密码哈希
async function hashPw(pw) {
  const enc = new TextEncoder()
  const data = enc.encode(pw)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// 获取所有用户
function getUsers() {
  try { return JSON.parse(localStorage.getItem('next_users') || '[]') } catch { return [] }
}

function saveUsers(users) {
  try { localStorage.setItem('next_users', JSON.stringify(users)) } catch {}
}

async function submitRegister() {
  if (!nickname.value) { error.value = '请输入昵称'; return }
  if (nickname.value.length < 2) { error.value = '昵称至少2个字符'; return }
  if (!password.value || password.value.length < 6) { error.value = '密码至少6位'; return }
  if (password.value !== confirmPassword.value) { error.value = '两次密码不一致'; return }
  if (!gender.value) { error.value = '请选择性别'; return }
  if (!age.value) { error.value = '请输入年龄'; return }
  if (selectedMovies.value.length < 5) { error.value = '至少选5部影片'; return }

  const users = getUsers()
  if (users.find(u => u.nickname === nickname.value)) {
    error.value = '该昵称已被注册'
    return
  }

  const pwHash = await hashPw(password.value)
  const userData = {
    nickname: nickname.value,
    passwordHash: pwHash,
    gender: gender.value,
    age: Number(age.value),
    favoriteMovies: selectedMovies.value,
    createdAt: Date.now()
  }

  users.push(userData)
  saveUsers(users)

  const { passwordHash, ...safeUser } = userData
  userStore.setUser(safeUser)
  router.push('/')
}

async function submitLogin() {
  if (!loginUsername.value) { error.value = '请输入昵称'; return }
  if (!loginPassword.value) { error.value = '请输入密码'; return }

  const users = getUsers()
  const found = users.find(u => u.nickname === loginUsername.value)

  if (!found) { error.value = '该昵称未注册'; return }

  const pwHash = await hashPw(loginPassword.value)
  if (pwHash !== found.passwordHash) { error.value = '密码错误'; return }

  const { passwordHash, ...safeUser } = found
  userStore.setUser(safeUser)
  router.push('/')
}

// 搜索电影（watch 方式）
let searchTimer = null
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  if (!searchQuery.value.trim()) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    try {
      const { searchMulti } = await import('@/data/tmdb')
      const data = await searchMulti(searchQuery.value.trim())
      searchResults.value = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 8)
    } catch (e) { console.error(e) }
  }, 300)
})

function addMovie(m) {
  if (selectedMovies.value.length >= 10) return
  if (selectedMovies.value.some(s => s.id === m.id)) return
  selectedMovies.value.push({ id: m.id, title: m.title || m.name, poster_path: m.poster_path })
  searchQuery.value = ''; searchResults.value = []
}

function removeMovie(m) { selectedMovies.value = selectedMovies.value.filter(s => s.id !== m.id) }
</script>
