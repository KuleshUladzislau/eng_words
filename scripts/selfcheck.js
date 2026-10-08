import { bank } from '../src/data.js'
import {
  defaultSettings,
  isCorrect,
  nextQuestion,
  poolOf,
  recordAnswer,
  scoreOf,
  stageOf,
  summarize,
} from '../src/engine.js'

const words = bank.filter((item) => item.kind === 'word')
const phrases = bank.filter((item) => item.kind === 'phrase')
if (words.length !== 92) throw new Error(`слов ${words.length}, ожидалось 92`)
if (phrases.length < 30) throw new Error(`фраз слишком мало: ${phrases.length}`)

const argument = words.find((item) => item.en === 'argument')
if (!isCorrect('спор', argument, 'en-ru')) throw new Error('не принят вариант «спор»')
if (!isCorrect('Ссора, спор', argument, 'en-ru')) throw new Error('не принята полная пара')
if (!isCorrect("I'm sure.", phrases.find((item) => item.en === "I'm sure."), 'ru-en')) {
  throw new Error('не принят английский с апострофом')
}
if (isCorrect('спор', argument, 'ru-en')) throw new Error('русский засчитан как английский')

const settings = defaultSettings()
const progress = {}
const target = words[0]
for (let step = 0; step < 3; step += 1) recordAnswer(progress, target.id, true)
if (stageOf(progress, target.id, settings) !== 'learning') throw new Error('после 3 верных ещё не «учу»')
recordAnswer(progress, target.id, false)
if (scoreOf(progress[target.id], settings) !== 0) throw new Error('ошибка не сбросила серию')
for (let step = 0; step < 4; step += 1) recordAnswer(progress, target.id, true)
if (stageOf(progress, target.id, settings) !== 'known') throw new Error('4 подряд не закрыли карточку')

settings.resetOnMistake = false
const other = words[1]
recordAnswer(progress, other.id, true)
recordAnswer(progress, other.id, false)
recordAnswer(progress, other.id, true)
if (scoreOf(progress[other.id], settings) !== 2) throw new Error('без сброса серии счётчик верных потерялся')

const fresh = { total: 12, answered: 0, introduced: [], recent: [], onlyIds: null }
const freshProgress = {}
const freshSettings = defaultSettings()
let previous = ''
for (let step = 0; step < 8; step += 1) {
  const question = nextQuestion(poolOf(bank, freshSettings, fresh), freshProgress, freshSettings, fresh)
  if (question.item.id === previous) throw new Error('одно и то же слово два раза подряд')
  previous = question.item.id
  recordAnswer(freshProgress, question.item.id, true)
  fresh.answered += 1
}

const session = {
  total: settings.sessionSize,
  answered: 0,
  introduced: [],
  recent: [],
  onlyIds: null,
}
const pool = poolOf(bank, settings, session)
const seen = new Set()
for (let step = 0; step < settings.sessionSize; step += 1) {
  const question = nextQuestion(pool, progress, settings, session)
  if (!question) throw new Error('пустой вопрос')
  if (!question.options && question.mode === 'choice') throw new Error('у выбора нет вариантов')
  if (question.mode === 'choice' && !question.options.includes(question.answerText)) {
    throw new Error('правильного варианта нет среди кнопок')
  }
  seen.add(question.item.id)
  recordAnswer(progress, question.item.id, step % 4 !== 0)
  session.answered += 1
}
if (session.introduced.length > settings.newPerSession) {
  throw new Error(`новых ${session.introduced.length}, лимит ${settings.newPerSession}`)
}

const counts = summarize(pool, progress, settings)
if (counts.total !== pool.length) throw new Error('сводка не сходится')
console.log(`ok: ${words.length} слов, ${phrases.length} фраз, новых за урок ${session.introduced.length}, уникальных ${seen.size}`)
