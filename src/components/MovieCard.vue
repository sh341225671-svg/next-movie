<template>
  <div
    class="card cursor-pointer flex-shrink-0"
    style="width: 140px; aspect-ratio: 2/3; position: relative; overflow: visible;"
    @click="$emit('select', movie)"
  >
    <!-- 海报 -->
    <div style="border-radius: var(--r-lg); overflow: hidden; aspect-ratio: 2/3;">
      <img v-if="movie.poster" :src="movie.poster" :alt="movie.title"
        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
      <img v-else src="/assets/poster-placeholder.png" class="w-full h-full object-cover" />
    </div>

    <!-- 评分徽章 -->
    <div v-if="movie.rating"
      class="rating-badge"
      style="position: absolute; top: 8px; right: 8px; opacity: 0; transition: opacity var(--duration); padding: 4px 8px; font-size: 11px;"
      @mouseenter="e => e.target.closest('.card').classList.add('show-badge')"
    >{{ movie.rating }}</div>

    <!-- 文字 -->
    <div style="margin-top: var(--space-2); padding: 0 2px;">
      <p style="font-size: 14px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ movie.title }}</p>
      <div class="flex items-center gap-2" style="margin-top: 2px;">
        <span style="font-size: 12px; color: var(--text-secondary);">{{ movie.year }}</span>
        <span v-if="movie.rating" class="rating-badge" style="font-size: 11px;">★ {{ movie.rating }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ movie: { type: Object, required: true } })
defineEmits(['select'])
</script>
