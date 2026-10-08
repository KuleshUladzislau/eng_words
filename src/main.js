import './style.css'
import { bank } from './data.js'
import {
  isCorrect,
  load,
  nextQuestion,
  poolOf,
  priorityRatio,
  recordAnswer,
  sanitizeSettings,
  save,
  scoreOf,
  stageOf,
  summarize,
} from './engine.js'

const stored = load()

const state = {
  view: 'home',
  settings: stored.settings,
  progress: stored.progress,
  session: null,
  question: null,
  selected: null,
  typed: '',
  feedback: null,
  query: '',
  filter: 'all',
  modal: null,
}

const titles = {
  'en-ru:choice': 'Выбери перевод',
  'ru-en:choice': 'Выбери по-английски',
  'en-ru:type': 'Напиши перевод',
  'ru-en:type': 'Напиши по-английски',
}

function persist() {
  save(state.settings, state.progress)
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function plural(count, one, few, many) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function itemById(id) {
  return bank.find((item) => item.id === id)
}

function activePool(session = null) {
  return poolOf(bank, state.settings, session)
}

function algoHint(settings) {
  const ratio = priorityRatio(settings)
  const rule = settings.resetOnMistake
    ? `Карточка становится «знаю» после ${settings.masteryCount} верных ответов подряд. Ошибка обнуляет серию.`
    : `Карточка становится «знаю» после ${settings.masteryCount} верных ответов. Ошибка не стирает уже набранные.`
  const weak =
    settings.weakBoost <= 1
      ? 'В уроке карточки идут почти поровну, но последняя ошибка возвращается чаще.'
      : `Чем меньше верных, тем чаще показ: слабая карточка выпадает в ${ratio} ${plural(ratio, 'раз', 'раза', 'раз')} чаще.`
  const fresh = `За урок добавляется не больше ${settings.newPerSession} ${plural(settings.newPerSession, 'новой', 'новых', 'новых')}.`
  const review =
    settings.reviewEvery === 0
      ? 'Выученные не подмешиваются, пока в наборе есть невыученные.'
      : settings.reviewEvery === 1
        ? 'Каждый вопрос может быть повтором уже выученного.'
        : `Каждый ${settings.reviewEvery}-й вопрос — повтор выученного, если такие уже есть.`
  return `${rule} ${weak} ${fresh} ${review}`
}

function contentLabel(content) {
  if (content === 'words') return 'только слова'
  if (content === 'phrases') return 'только фразы'
  return 'слова и фразы'
}

function play(ok) {
  if (!state.settings.sound || typeof AudioContext === 'undefined') return
  try {
    const context = new AudioContext()
    const now = context.currentTime
    const notes = ok ? [523, 659] : [220]
    notes.forEach((freq, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = freq
      oscillator.type = 'sine'
      oscillator.connect(gain)
      gain.connect(context.destination)
      const start = now + index * 0.09
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.07, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)
      oscillator.start(start)
      oscillator.stop(start + 0.17)
    })
    setTimeout(() => context.close(), 600)
  } catch {
    /* звук не обязателен для урока */
  }
}

function startLesson(options = {}) {
  state.session = {
    total: options.total || state.settings.sessionSize,
    answered: 0,
    correct: 0,
    wrong: 0,
    introduced: [],
    recent: [],
    missed: [],
    justKnown: [],
    onlyIds: options.onlyIds || null,
    combo: 0,
    bestCombo: 0,
  }
  state.feedback = null
  state.selected = null
  state.typed = ''
  state.question = nextQuestion(activePool(state.session), state.progress, state.settings, state.session)
  state.view = state.question ? 'lesson' : 'result'
  state.modal = null
  render()
}

function grade(ok) {
  const question = state.question
  const before = scoreOf(state.progress[question.item.id], state.settings)
  const entry = recordAnswer(state.progress, question.item.id, ok)
  if (ok) {
    state.session.correct += 1
    state.session.combo += 1
    state.session.bestCombo = Math.max(state.session.bestCombo, state.session.combo)
    if (before < state.settings.masteryCount && scoreOf(entry, state.settings) >= state.settings.masteryCount) {
      state.session.justKnown.push(question.item.id)
    }
  } else {
    state.session.wrong += 1
    state.session.combo = 0
    if (!state.session.missed.includes(question.item.id)) state.session.missed.push(question.item.id)
  }
  state.feedback = { ok, after: scoreOf(entry, state.settings) }
  persist()
  play(ok)
  render()
}

function check() {
  if (!state.question || state.feedback) return
  const question = state.question
  if (question.mode === 'choice') {
    if (state.selected == null) return
    grade(question.options[state.selected] === question.answerText)
    return
  }
  const field = document.querySelector('#answer')
  if (field) state.typed = field.value
  if (!state.typed.trim()) return
  grade(isCorrect(state.typed, question.item, question.direction))
}

function giveUp() {
  if (!state.question || state.feedback) return
  grade(false)
}

function continueLesson() {
  state.session.answered += 1
  state.feedback = null
  state.selected = null
  state.typed = ''
  if (state.session.answered >= state.session.total) {
    state.view = 'result'
    state.question = null
    render()
    return
  }
  state.question = nextQuestion(activePool(state.session), state.progress, state.settings, state.session)
  state.view = state.question ? 'lesson' : 'result'
  render()
}

function dots(streak) {
  const goal = state.settings.masteryCount
  const filled = Math.min(goal, streak)
  return `<div class="dots" aria-label="${filled} из ${goal} верных подряд">${Array.from({ length: goal }, (_, index) => `<i class="${index < filled ? 'on' : ''}"></i>`).join('')}</div>`
}

function homeHtml() {
  const pool = activePool()
  const counts = summarize(pool, state.progress, state.settings)
  const done = counts.total > 0 && counts.known === counts.total
  return `
    <section class="screen">
      <div class="topbar">
        <div class="brand"><b>LIFE</b><span>SpeakOut Pre-Intermediate · Unit 1</span></div>
      </div>
      <div class="hero">
        <h1>Тренажёр слов и фраз</h1>
        <p>${counts.words} ${plural(counts.words, 'слово', 'слова', 'слов')} и ${counts.phrases} ${plural(counts.phrases, 'фраза', 'фразы', 'фраз')} в текущем наборе.</p>
      </div>
      <div class="stats">
        <div class="stat"><b>${counts.new}</b><span>новые</span></div>
        <div class="stat learn"><b>${counts.learning}</b><span>в работе</span></div>
        <div class="stat known"><b>${counts.known}</b><span>знаю</span></div>
      </div>
      <div class="plan">${
        done
          ? 'Весь текущий набор выучен. Урок пойдёт как повторение.'
          : `Урок: ${state.settings.sessionSize} ${plural(state.settings.sessionSize, 'вопрос', 'вопроса', 'вопросов')}, до ${state.settings.newPerSession} новых. «Знаю» — это ${state.settings.masteryCount} ${state.settings.resetOnMistake ? 'верных подряд' : 'верных ответов'}. Сейчас: ${contentLabel(state.settings.content)}.`
      }</div>
      <div class="actions">
        <button class="btn btn-primary" data-action="start">Начать урок</button>
        <div class="subnav">
          <button class="btn btn-blue" data-action="dict">Словарь</button>
          <button class="btn btn-ghost" data-action="settings">Настройки</button>
        </div>
      </div>
    </section>`
}

function lessonHtml() {
  const question = state.question
  const session = state.session
  if (!question) return resultHtml()
  const entry = state.progress[question.item.id]
  const streak = state.feedback ? state.feedback.after : entry?.streak || 0
  const stage = stageOf(state.progress, question.item.id, state.settings)
  const stageText = stage === 'new' ? 'Новое' : stage === 'known' ? 'Повтор' : 'Учим'
  const progress = Math.round(((session.answered + (state.feedback ? 1 : 0)) / session.total) * 100)
  const optionClass = (index) => {
    if (!state.feedback) return index === state.selected ? 'option picked' : 'option'
    const text = question.options[index]
    if (text === question.answerText) return 'option good'
    if (index === state.selected) return 'option bad'
    return 'option'
  }
  const choices =
    question.mode === 'choice'
      ? `<div class="choices">${question.options
          .map(
            (option, index) =>
              `<button class="${optionClass(index)}" data-action="pick" data-index="${index}" ${state.feedback ? 'disabled' : ''}>${esc(option)}</button>`,
          )
          .join('')}</div>`
      : `<input id="answer" class="answer" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="${question.direction === 'en-ru' ? 'Перевод' : 'По-английски'}" value="${esc(state.typed)}" ${state.feedback ? 'disabled' : ''}>`

  const dock = state.feedback
    ? `<div class="dock ${state.feedback.ok ? 'ok' : 'bad'}">
        <strong>${state.feedback.ok ? 'Верно' : 'Неверно'}</strong>
        <p>${esc(question.item.en)}${question.item.ipa ? ` · [${esc(question.item.ipa)}]` : ''}<br>${esc(question.item.ru)}<br>${state.feedback.after} из ${state.settings.masteryCount} ${state.settings.resetOnMistake ? 'подряд' : 'верных'}</p>
        <button class="btn ${state.feedback.ok ? 'btn-primary' : 'btn-danger'}" data-action="next">${session.answered + 1 >= session.total ? 'К итогам' : 'Дальше'}</button>
      </div>`
    : `<div class="checkbar">
        <button class="text-btn" data-action="giveup">Не знаю</button>
        <button class="btn btn-primary" data-action="check" ${(question.mode === 'choice' && state.selected == null) || (question.mode === 'type' && !state.typed.trim()) ? 'disabled' : ''}>Проверить</button>
      </div>`

  return `
    <section class="screen lesson">
      <div class="lesson-top">
        <button class="icon" data-action="ask-exit" aria-label="Закрыть урок">✕</button>
        <div class="track" aria-hidden="true"><span style="width:${progress}%"></span></div>
        <div class="combo ${session.combo >= 2 ? 'hot' : ''}">${session.combo >= 2 ? `🔥 ${session.combo}` : ''}</div>
      </div>
      <div class="task">
        <div class="kicker">${titles[`${question.direction}:${question.mode}`]}</div>
        <div class="chips">
          <span class="${question.item.kind}">${question.item.kind === 'word' ? 'Слово' : 'Фраза'}</span>
          <span>${stageText}</span>
        </div>
        <h2>${esc(question.prompt)}</h2>
        ${question.direction === 'en-ru' && question.item.ipa ? `<p class="ipa">[${esc(question.item.ipa)}]</p>` : ''}
        ${dots(streak)}
      </div>
      ${choices}
      ${dock}
    </section>`
}

function resultHtml() {
  const session = state.session
  if (!session) {
    return `<section class="screen result"><h1>Нет вопросов для этих настроек</h1><button class="btn btn-primary" data-action="home">На главную</button></section>`
  }
  const total = session.correct + session.wrong
  const percent = total ? Math.round((session.correct / total) * 100) : 0
  const title = percent >= 80 ? 'Отличный урок' : percent >= 50 ? 'Хорошая тренировка' : 'Есть что повторить'
  const known = session.justKnown.map(itemById).filter(Boolean)
  const missed = session.missed.map(itemById).filter(Boolean)
  return `
    <section class="screen result">
      <h1>${title}</h1>
      <div class="score" style="--p:${percent}"><strong>${percent}%</strong></div>
      <p class="muted" style="text-align:center">${session.correct} верно · ${session.wrong} ошибок · серия ${session.bestCombo}</p>
      ${
        known.length
          ? `<h2>Стали «знаю»</h2><ul class="miss">${known.map((item) => `<li>${esc(item.en)} — ${esc(item.ru)}</li>`).join('')}</ul>`
          : `<p class="hint">Новых выученных пока нет. Нужно ${state.settings.masteryCount} ${state.settings.resetOnMistake ? 'верных подряд' : 'верных ответов'}.</p>`
      }
      ${
        missed.length
          ? `<h2>Ошибки</h2><ul class="miss">${missed.map((item) => `<li>${esc(item.en)} — ${esc(item.ru)}</li>`).join('')}</ul>`
          : ''
      }
      <div class="actions">
        <button class="btn btn-primary" data-action="start">Ещё урок</button>
        ${missed.length ? '<button class="btn btn-blue" data-action="retry">Повторить ошибки</button>' : ''}
        <button class="btn btn-ghost" data-action="home">На главную</button>
      </div>
    </section>`
}

function visibleItems() {
  const query = state.query.trim().toLowerCase()
  return bank.filter((item) => {
    const stage = stageOf(state.progress, item.id, state.settings)
    if (state.filter === 'word' && item.kind !== 'word') return false
    if (state.filter === 'phrase' && item.kind !== 'phrase') return false
    if (['new', 'learning', 'known'].includes(state.filter) && stage !== state.filter) return false
    if (!query) return true
    return `${item.en} ${item.ru} ${item.ipa}`.toLowerCase().includes(query)
  })
}

function rowsHtml() {
  const items = visibleItems()
  if (!items.length) return '<p class="empty">Ничего не найдено</p>'
  return items
    .map((item) => {
      const entry = state.progress[item.id]
      const goal = state.settings.masteryCount
      const score = scoreOf(entry, state.settings)
      const stage = stageOf(state.progress, item.id, state.settings)
      const width = entry?.seen ? Math.min(100, Math.round((Math.min(score, goal) / goal) * 100)) : 0
      const label =
        stage === 'new'
          ? 'ещё не было'
          : stage === 'known'
            ? `знаю · ${entry.correct} верных`
            : `${score} из ${goal} ${state.settings.resetOnMistake ? 'подряд' : 'верных'} · ошибок ${entry.wrong}`
      return `
        <article class="row">
          <div class="row-top">
            <b>${esc(item.en)}</b>
            <span class="tag ${item.kind}">${item.kind === 'word' ? 'слово' : 'фраза'}</span>
          </div>
          ${item.ipa ? `<div class="ipa">[${esc(item.ipa)}]</div>` : ''}
          <div class="ru">${esc(item.ru)}</div>
          <div class="bar"><span style="width:${width}%"></span></div>
          <div class="meta">${label}</div>
        </article>`
    })
    .join('')
}

function dictHtml() {
  const filters = [
    ['all', 'Все'],
    ['word', 'Слова'],
    ['phrase', 'Фразы'],
    ['new', 'Новые'],
    ['learning', 'В работе'],
    ['known', 'Знаю'],
  ]
  return `
    <section class="screen">
      <div class="head-row">
        <h1>Словарь</h1>
        <button class="icon" data-action="home" aria-label="На главную">✕</button>
      </div>
      <p class="muted">Слова из Unit 1 и короткие фразы к теме Life. Полоска — серия верных ответов до цели ${state.settings.masteryCount}.</p>
      <label class="search"><input id="q" placeholder="Поиск" value="${esc(state.query)}"></label>
      <div class="filters">
        ${filters
          .map(
            ([id, label]) =>
              `<button class="${state.filter === id ? 'on' : ''}" data-action="filter" data-value="${id}">${label}</button>`,
          )
          .join('')}
      </div>
      <div class="list" id="dict-list">${rowsHtml()}</div>
    </section>`
}

function seg(setting, value, label) {
  const on = state.settings[setting] === value ? 'on' : ''
  return `<button class="${on}" data-action="set" data-setting="${setting}" data-value="${value}">${label}</button>`
}

function slider(setting, label, min, max) {
  return `
    <label class="slider">
      <div class="slider-top"><span>${label}</span><output>${state.settings[setting]}</output></div>
      <input type="range" min="${min}" max="${max}" step="1" value="${state.settings[setting]}" data-setting="${setting}">
    </label>`
}

function settingsHtml() {
  return `
    <section class="screen">
      <div class="head-row">
        <h1>Настройки</h1>
        <button class="icon" data-action="home" aria-label="На главную">✕</button>
      </div>
      <p class="muted">Алгоритм запоминает серию верных ответов по каждому слову и фразе. Ошибка обнуляет серию, и карточка снова показывается чаще.</p>
      ${slider('masteryCount', 'Сколько верных ответов нужно для «знаю»', 1, 10)}
      ${slider('weakBoost', 'Приоритет слабых: 1 — поровну, 5 — почти только слабые', 1, 5)}
      ${slider('newPerSession', 'Новых слов и фраз за один урок', 1, 20)}
      ${slider('reviewEvery', 'Повтор выученного каждые N вопросов, 0 — выкл.', 0, 12)}
      ${slider('sessionSize', 'Вопросов в уроке', 5, 30)}
      <div class="hint" id="algo-hint">${esc(algoHint(state.settings))}</div>
      <div class="field"><span>Что учить</span><div class="seg">${seg('content', 'all', 'Всё')}${seg('content', 'words', 'Слова')}${seg('content', 'phrases', 'Фразы')}</div></div>
      <div class="field"><span>Направление</span><div class="seg">${seg('direction', 'mix', 'Микс')}${seg('direction', 'en-ru', 'EN → RU')}${seg('direction', 'ru-en', 'RU → EN')}</div></div>
      <div class="field"><span>Формат</span><div class="seg">${seg('exercise', 'mix', 'Микс')}${seg('exercise', 'choice', 'Выбор')}${seg('exercise', 'type', 'Ввод')}</div></div>
      <label class="switch"><span>Ошибка обнуляет серию верных</span><input type="checkbox" data-setting="resetOnMistake" ${state.settings.resetOnMistake ? 'checked' : ''}></label>
      <label class="switch"><span>Звук</span><input type="checkbox" data-setting="sound" ${state.settings.sound ? 'checked' : ''}></label>
      <div class="actions">
        <button class="btn btn-danger" data-action="ask-reset">Сбросить прогресс</button>
        <button class="btn btn-ghost" data-action="home">Готово</button>
      </div>
    </section>`
}

function modalHtml() {
  if (state.modal === 'reset') {
    return `<div class="modal"><div class="sheet"><h2>Сбросить прогресс?</h2><p>Серии, верные ответы и ошибки удалятся. Настройки урока останутся.</p><button class="btn btn-danger" data-action="confirm-reset">Сбросить</button><button class="btn btn-ghost" data-action="close-modal">Отмена</button></div></div>`
  }
  if (state.modal === 'exit') {
    return `<div class="modal"><div class="sheet"><h2>Выйти из урока?</h2><p>Ответы, которые уже проверены, сохранены.</p><button class="btn btn-danger" data-action="home">Выйти</button><button class="btn btn-ghost" data-action="close-modal">Остаться</button></div></div>`
  }
  return ''
}

function render() {
  const view = {
    home: homeHtml,
    lesson: lessonHtml,
    result: resultHtml,
    dict: dictHtml,
    settings: settingsHtml,
  }[state.view]
  document.querySelector('#app').innerHTML = `<main class="app">${view()}${modalHtml()}</main>`
  const answer = document.querySelector('#answer')
  if (answer && !state.feedback) answer.focus()
}

function applySetting(key, value, rerender) {
  state.settings = sanitizeSettings({ ...state.settings, [key]: value })
  persist()
  if (!rerender) {
    const hint = document.querySelector('#algo-hint')
    if (hint) hint.textContent = algoHint(state.settings)
    return
  }
  if (state.view === 'settings' || state.view === 'home') render()
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]')
  if (!button) return
  const action = button.dataset.action
  if (action === 'start') startLesson()
  if (action === 'retry') {
    startLesson({
      onlyIds: state.session.missed.slice(),
      total: Math.min(20, Math.max(5, state.session.missed.length * 2)),
    })
  }
  if (action === 'home') {
    state.view = 'home'
    state.modal = null
    state.question = null
    render()
  }
  if (action === 'dict') {
    state.view = 'dict'
    render()
  }
  if (action === 'settings') {
    state.view = 'settings'
    render()
  }
  if (action === 'pick' && !state.feedback) {
    state.selected = Number(button.dataset.index)
    document.querySelectorAll('.option').forEach((option, index) => {
      option.classList.toggle('picked', index === state.selected)
    })
    const checkButton = document.querySelector('[data-action="check"]')
    if (checkButton) checkButton.disabled = false
  }
  if (action === 'check') check()
  if (action === 'giveup') giveUp()
  if (action === 'next') continueLesson()
  if (action === 'ask-exit') {
    state.modal = 'exit'
    render()
  }
  if (action === 'ask-reset') {
    state.modal = 'reset'
    render()
  }
  if (action === 'close-modal') {
    state.modal = null
    render()
  }
  if (action === 'confirm-reset') {
    state.progress = {}
    state.modal = null
    persist()
    render()
  }
  if (action === 'filter') {
    state.filter = button.dataset.value
    const list = document.querySelector('#dict-list')
    if (!list) {
      render()
      return
    }
    document.querySelectorAll('.filters button').forEach((item) => {
      item.classList.toggle('on', item.dataset.value === state.filter)
    })
    list.innerHTML = rowsHtml()
  }
  if (action === 'set') {
    applySetting(button.dataset.setting, button.dataset.value, true)
  }
})

document.addEventListener('input', (event) => {
  const target = event.target
  if (target.id === 'q') {
    state.query = target.value
    const list = document.querySelector('#dict-list')
    if (list) list.innerHTML = rowsHtml()
    return
  }
  if (target.id === 'answer') {
    state.typed = target.value
    const checkButton = document.querySelector('[data-action="check"]')
    if (checkButton) checkButton.disabled = !state.typed.trim()
    return
  }
  if (target.dataset.setting && target.type === 'range') {
    const output = target.closest('.slider')?.querySelector('output')
    if (output) output.textContent = target.value
    applySetting(target.dataset.setting, target.value, false)
  }
})

document.addEventListener('change', (event) => {
  const target = event.target
  if (target.dataset.setting && target.type === 'checkbox') {
    applySetting(target.dataset.setting, target.checked, false)
  }
})

document.addEventListener('keydown', (event) => {
  if (state.modal) {
    if (event.key === 'Escape') {
      state.modal = null
      render()
    }
    return
  }
  if (state.view !== 'lesson' || !state.question) return
  if (event.key === 'Escape') {
    state.modal = 'exit'
    render()
    return
  }
  if (state.feedback) {
    if (event.key === 'Enter') continueLesson()
    return
  }
  if (state.question.mode === 'choice' && ['1', '2', '3', '4'].includes(event.key)) {
    const index = Number(event.key) - 1
    if (index < state.question.options.length) {
      state.selected = index
      document.querySelectorAll('.option').forEach((option, optionIndex) => {
        option.classList.toggle('picked', optionIndex === index)
      })
      const checkButton = document.querySelector('[data-action="check"]')
      if (checkButton) checkButton.disabled = false
    }
  }
  if (event.key === 'Enter' && event.target.id !== 'q') {
    event.preventDefault()
    check()
  }
})

render()
