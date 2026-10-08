const KEY = 'life-unit1-v1'

export function defaultSettings() {
  return {
    masteryCount: 4,
    weakBoost: 2,
    newPerSession: 6,
    reviewEvery: 5,
    sessionSize: 12,
    content: 'all',
    direction: 'mix',
    exercise: 'mix',
    sound: true,
    resetOnMistake: true,
  }
}

function clampInt(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

export function sanitizeSettings(raw = {}) {
  const defaults = defaultSettings()
  return {
    masteryCount: clampInt(raw.masteryCount, 1, 10, defaults.masteryCount),
    weakBoost: clampInt(raw.weakBoost, 1, 5, defaults.weakBoost),
    newPerSession: clampInt(raw.newPerSession, 1, 20, defaults.newPerSession),
    reviewEvery: clampInt(raw.reviewEvery, 0, 12, defaults.reviewEvery),
    sessionSize: clampInt(raw.sessionSize, 5, 30, defaults.sessionSize),
    content: oneOf(raw.content, ['all', 'words', 'phrases'], defaults.content),
    direction: oneOf(raw.direction, ['mix', 'en-ru', 'ru-en'], defaults.direction),
    exercise: oneOf(raw.exercise, ['mix', 'choice', 'type'], defaults.exercise),
    sound: typeof raw.sound === 'boolean' ? raw.sound : defaults.sound,
    resetOnMistake: typeof raw.resetOnMistake === 'boolean' ? raw.resetOnMistake : defaults.resetOnMistake,
  }
}

export function load() {
  const empty = { settings: defaultSettings(), progress: {} }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    const data = JSON.parse(raw)
    return {
      settings: sanitizeSettings(data.settings || {}),
      progress: data.progress && typeof data.progress === 'object' ? data.progress : {},
    }
  } catch {
    return empty
  }
}

export function save(settings, progress) {
  localStorage.setItem(KEY, JSON.stringify({ settings, progress }))
}

export function poolOf(bank, settings, session) {
  return bank.filter((item) => {
    if (settings.content === 'words' && item.kind !== 'word') return false
    if (settings.content === 'phrases' && item.kind !== 'phrase') return false
    if (session?.onlyIds && !session.onlyIds.includes(item.id)) return false
    return true
  })
}

export function scoreOf(entry, settings) {
  if (!entry) return 0
  return settings.resetOnMistake ? entry.streak : entry.correct
}

export function stageOf(progress, id, settings) {
  const entry = progress[id]
  if (!entry?.seen) return 'new'
  if (scoreOf(entry, settings) >= settings.masteryCount) return 'known'
  return 'learning'
}

export function summarize(items, progress, settings) {
  const counts = { new: 0, learning: 0, known: 0, words: 0, phrases: 0, total: items.length }
  for (const item of items) {
    counts[item.kind === 'word' ? 'words' : 'phrases'] += 1
    counts[stageOf(progress, item.id, settings)] += 1
  }
  return counts
}

export function recordAnswer(progress, itemId, ok) {
  const entry = progress[itemId] || {
    correct: 0,
    wrong: 0,
    streak: 0,
    seen: 0,
    lastOk: null,
    lastAt: 0,
  }
  entry.seen += 1
  entry.lastAt = Date.now()
  entry.lastOk = ok
  if (ok) {
    entry.correct += 1
    entry.streak += 1
  } else {
    entry.wrong += 1
    entry.streak = 0
  }
  progress[itemId] = entry
  return entry
}

export function normalize(value) {
  return String(value)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/['’]/g, '')
    .replace(/[.,!?;:"«»()[\]\-—–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function unique(list) {
  return [...new Set(list.map((item) => item.trim()).filter(Boolean))]
}

export function answersFor(item, direction) {
  if (direction === 'ru-en') return unique([item.en, ...(item.enAlts || [])])
  if (item.kind === 'word') {
    return unique([item.ru, ...item.ru.split(','), ...(item.ruAlts || [])])
  }
  return unique([item.ru, ...(item.ruAlts || [])])
}

export function isCorrect(input, item, direction) {
  const value = normalize(input)
  if (!value) return false
  return answersFor(item, direction).some((answer) => normalize(answer) === value)
}

function shuffle(list) {
  const copy = list.slice()
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

function weightOf(entry, settings) {
  const gap = Math.max(1, settings.masteryCount - scoreOf(entry, settings))
  let weight = Math.pow(gap, Math.max(0, settings.weakBoost - 1))
  if (entry && entry.lastOk === false) weight *= 3
  return weight
}

function weightedPick(items, weightFor) {
  if (!items.length) return null
  const weights = items.map((item) => Math.max(0.001, weightFor(item)))
  let cursor = Math.random() * weights.reduce((sum, weight) => sum + weight, 0)
  for (let index = 0; index < items.length; index += 1) {
    cursor -= weights[index]
    if (cursor <= 0) return items[index]
  }
  return items[items.length - 1]
}

function withoutLast(items, session) {
  const last = session.recent[session.recent.length - 1]
  if (!last) return items
  return items.filter((item) => item.id !== last)
}

function selectItem(pool, progress, settings, session) {
  if (!pool.length) return null

  const mastered = []
  const learning = []
  const unseen = []

  for (const item of pool) {
    const entry = progress[item.id]
    if (!entry?.seen) {
      if (!session.introduced.includes(item.id)) unseen.push(item)
      continue
    }
    if (scoreOf(entry, settings) >= settings.masteryCount) mastered.push(item)
    else learning.push(item)
  }

  const allowNew =
    unseen.length > 0 &&
    ((settings.newPerSession > 0 && session.introduced.length < settings.newPerSession) ||
      (learning.length === 0 && mastered.length === 0))

  const reviewSlot =
    settings.reviewEvery > 0 &&
    mastered.length > 0 &&
    learning.length > 0 &&
    (session.answered + 1) % settings.reviewEvery === 0

  let bucket
  if (reviewSlot) bucket = mastered
  else if (!learning.length && allowNew) bucket = unseen
  else if (!learning.length && mastered.length) bucket = mastered
  else if (!learning.length) bucket = unseen
  else if (allowNew && Math.random() < 0.4) bucket = unseen
  else bucket = learning

  let choices = withoutLast(bucket, session)
  if (!choices.length && allowNew) choices = withoutLast(unseen, session)
  if (!choices.length && mastered.length) choices = withoutLast(mastered, session)
  if (!choices.length) choices = bucket.length ? bucket : pool

  if (mastered.length && choices.every((item) => mastered.includes(item))) {
    const ranked = choices
      .slice()
      .sort((a, b) => (progress[a.id]?.lastAt || 0) - (progress[b.id]?.lastAt || 0))
    const oldest = ranked.slice(0, Math.max(3, Math.ceil(ranked.length * 0.4)))
    return weightedPick(withoutLast(oldest, session).length ? withoutLast(oldest, session) : oldest, () => 1)
  }

  if (unseen.length && choices.every((item) => unseen.includes(item))) {
    return weightedPick(choices, () => 1)
  }

  return weightedPick(choices, (item) => weightOf(progress[item.id], settings))
}

function buildOptions(pool, item, direction, answerText) {
  const texts = []
  const sources = [
    shuffle(pool.filter((entry) => entry.id !== item.id && entry.kind === item.kind)),
    shuffle(pool.filter((entry) => entry.id !== item.id)),
  ]
  for (const source of sources) {
    for (const candidate of source) {
      const text = direction === 'en-ru' ? candidate.ru : candidate.en
      if (text === answerText || texts.includes(text)) continue
      texts.push(text)
      if (texts.length === 3) break
    }
    if (texts.length === 3) break
  }
  return shuffle([answerText, ...texts])
}

export function nextQuestion(pool, progress, settings, session) {
  const item = selectItem(pool, progress, settings, session)
  if (!item) return null

  if (!progress[item.id]?.seen && !session.introduced.includes(item.id)) {
    session.introduced.push(item.id)
  }
  session.recent.push(item.id)
  if (session.recent.length > 6) session.recent.shift()

  const direction =
    settings.direction === 'mix' ? (Math.random() < 0.5 ? 'en-ru' : 'ru-en') : settings.direction
  const mode = settings.exercise === 'mix' ? (Math.random() < 0.62 ? 'choice' : 'type') : settings.exercise
  const answerText = direction === 'en-ru' ? item.ru : item.en
  const prompt = direction === 'en-ru' ? item.en : item.ru

  return {
    item,
    direction,
    mode,
    prompt,
    answerText,
    options: mode === 'choice' ? buildOptions(pool, item, direction, answerText) : null,
  }
}

export function priorityRatio(settings) {
  if (settings.weakBoost <= 1) return 1
  return Math.pow(settings.masteryCount, settings.weakBoost - 1)
}
