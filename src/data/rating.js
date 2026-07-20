// ═══ 10 分制评分系统 ═══
// 基于半星递增，每星=2分
// 配合 TMDB 的 0-10 分制（保留一位小数）

// 10 级评分标签
export const RATING_LEVELS = [
  { score: 1, stars: 0.5, label: '不忍卒睹', short: '很差' },
  { score: 2, stars: 1.0, label: '不尽人意', short: '较差' },
  { score: 3, stars: 1.5, label: '乏善可陈', short: '一般' },
  { score: 4, stars: 2.0, label: '平淡如水', short: '尚可' },
  { score: 5, stars: 2.5, label: '中规中矩', short: '及格' },
  { score: 6, stars: 3.0, label: '饶有趣味', short: '不错' },
  { score: 7, stars: 3.5, label: '可圈可点', short: '良好' },
  { score: 8, stars: 4.0, label: '品质上乘', short: '优秀' },
  { score: 9, stars: 4.5, label: '出类拔萃', short: '惊艳' },
  { score: 10, stars: 5.0, label: '无懈可击', short: '完美' },
]

// 根据得分获取标签
export function getRatingLabel(score) {
  const level = RATING_LEVELS.find(r => r.score === Math.round(score))
  return level || RATING_LEVELS[4] // 默认中规中矩
}

// 根据 TMDB 评分（0-10）获取对应描述
export function getTmdbRatingInfo(tmdbScore) {
  const s = Math.min(10, Math.max(0, Math.round(parseFloat(tmdbScore) || 0)))
  return getRatingLabel(s)
}

// 半星关键帧（用于 CSS display）
export function starDisplay(score) {
  const full = Math.floor(score / 2)       // 满星数
  const half = score % 2 === 1 ? 1 : 0     // 是否有半星
  const empty = 5 - full - half            // 空星数
  return { full, half, empty }
}

// 将 5 分制星星转为 10 分制
export function starsToScore(stars) {
  return Math.round(stars * 2)
}
