export const bank = []

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 52)
}

function add(item) {
  if (bank.some((entry) => entry.id === item.id)) {
    throw new Error(`Повторяющийся id: ${item.id}`)
  }
  bank.push(item)
}

function word(en, ipa, ru, extra = {}) {
  add({
    id: `w-${slug(en)}`,
    kind: 'word',
    en,
    ipa,
    ru,
    enAlts: extra.enAlts || [],
    ruAlts: extra.ruAlts || [],
  })
}

function phrase(en, ru) {
  add({
    id: `p-${slug(en)}`,
    kind: 'phrase',
    en,
    ipa: '',
    ru,
    enAlts: [],
    ruAlts: [],
  })
}

word('accept', 'əkˈsɛpt', 'принимать')
word('advice', 'ədˈvaɪs', 'совет')
word('amount', 'əˈmaʊnt', 'количество')
word('argue', 'ˈɑːgjuː', 'ссориться')
word('argument', 'ˈɑːgjʊmənt', 'ссора, спор')
word('arrive', 'əˈraɪv', 'прибывать')
word('at least', 'æt liːst', 'как минимум')
word('be good at', 'biː gʊd æt', 'быть хорошим в чем-либо')
word('borrow', 'ˈbɒrəʊ', 'брать в долг')
word('brain', 'breɪn', 'мозг')
word('calm', 'kɑːm', 'спокойный')
word('circle of friends', 'ˈsɜːkl ɒv frɛndz', 'круг друзей')
word('close friend', 'kləʊs frɛnd', 'близкий друг')
word('competitive', 'kəmˈpɛtɪtɪv', 'соревнующийся')
word('conversation', 'ˌkɒnvəˈseɪʃən', 'беседа, общение')
word('couple', 'ˈkʌpl', 'пара')
word('creative', 'kri(ː)ˈeɪtɪv', 'креативный, творческий')
word('curious', 'ˈkjʊərɪəs', 'любопытный, любознательный')
word('decide', 'dɪˈsaɪd', 'решать')
word('delayed', 'dɪˈleɪd', 'задержан, опоздавший')
word('depend on', 'dɪˈpɛnd ɒn', 'зависеть от')
word('describe', 'dɪsˈkraɪb', 'описывать')
word('disaster', 'dɪˈzɑːstə', 'катастрофа')
word('divorce', 'dɪˈvɔːs', 'развод')
word('earn money', 'ɜːn ˈmʌni', 'зарабатывать деньги')
word('eat out', 'iːt aʊt', 'кушать вне дома')
word('embarrassed', 'ɪmˈbærəst', 'смущенный')
word('enjoy', 'ɪnˈʤɔɪ', 'наслаждаться')
word('fair', 'feə', 'справедливый')
word('fall in love', 'fɔːl ɪn lʌv', 'влюбиться')
word('freak out', 'friːk aʊt', 'приводить в ужас')
word('get divorced', 'gɛt dɪˈvɔːst', 'развестись')
word('get engaged', 'gɛt ɪnˈgeɪʤd', 'помолвиться')
word('get married', 'gɛt ˈmærɪd', 'пожениться')
word('get on well', 'gɛt ɒn wɛl', 'ладить, быть в хороших отношениях')
word('get to know', 'gɛt tuː nəʊ', 'познакомиться, узнать')
word('go for a walk', 'gəʊ fɔːr ə wɔːk', 'ходить на прогулку')
word('go on holiday', 'gəʊ ɒn ˈhɒlədeɪ', 'ездить в отпуск')
word('go shopping', 'gəʊ ˈʃɒpɪŋ', 'ходить за покупками, ходить по магазинам')
word('gossip', 'ˈgɒsɪp', 'сплетня, сплетничать')
word('habit', 'ˈhæbɪt', 'привычка')
word('happiness', 'ˈhæpɪnɪs', 'счастье')
word('have a conversation', 'hæv ə ˌkɒnvəˈseɪʃən', 'общаться')
word('have sth in common', 'hæv ɪn ˈkɒmən', 'иметь общего', {
  enAlts: ['have something in common'],
})
word('have time off', 'hæv taɪm ɒf', 'быть в отпуске, не работать')
word('hire', 'ˈhaɪə', 'нанимать')
word('honest', 'ˈɒnɪst', 'честный')
word('imagination', 'ɪˌmæʤɪˈneɪʃən', 'воображение')
word('immediately', 'ɪˈmiːdiətli', 'немедленно')
word('interrupt', 'ˌɪntəˈrʌpt', 'перебивать, прерывать')
word('invent', 'ɪnˈvɛnt', 'изобретать, придумывать')
word('joy', 'ʤɔɪ', 'радость')
word('keep in touch', 'kiːp ɪn tʌʧ', 'быть на связи')
word('luckily', 'ˈlʌkɪli', 'к счастью')
word('love at first sight', 'lʌv æt fɜːst saɪt', 'любовь с первого взгляда')
word('meet', 'miːt', 'встретиться')
word('mood', 'muːd', 'настроение')
word('negative', 'ˈnɛgətɪv', 'негативный')
word('occupation', 'ˌɒkjʊˈpeɪʃən', 'занятость')
word('offer', 'ˈɒfə', 'предложение, предлагать')
word("on sb's own", 'ɒn əʊn', 'самостоятельно, один на один', {
  enAlts: ["on one's own", 'on my own', 'on your own'],
})
word('opportunity', 'ˌɒpəˈtjuːnɪti', 'возможность')
word('post', 'pəʊst', 'разместить, опубликовать')
word('propose to', 'prəˈpəʊz tuː', 'сделать предложение')
word('reason', 'ˈriːzn', 'причина')
word('relationship', 'rɪˈleɪʃənʃɪp', 'отношения')
word('remind', 'ˈrɪmaɪnd', 'напоминать')
word('research', 'rɪˈsɜːʧ', 'исследование')
word('romantic', 'rəʊˈmæntɪk', 'романтические', {
  ruAlts: ['романтичный', 'романтический', 'романтичная'],
})
word('rude', 'ruːd', 'грубый')
word('sad', 'sæd', 'грустный')
word('satisfaction', 'ˌsætɪsˈfækʃən', 'удовлетворение')
word('sense of humour', 'sɛns ɒv ˈhjuːmə', 'чувство юмора')
word('sincere', 'sɪnˈsɪə', 'искренний')
word('single', 'ˈsɪŋgl', 'одинокий')
word('skill', 'skɪl', 'навык')
word('smile', 'smaɪl', 'улыбка, улыбаться')
word('spend money', 'spɛnd ˈmʌni', 'тратить деньги')
word('spend time', 'spɛnd taɪm', 'проводить время')
word('split up', 'splɪt ʌp', 'разорвать отношения')
word('suddenly', 'ˈsʌdnli', 'внезапно')
word('sure', 'ʃʊə', 'уверенный')
word('take turns', 'teɪk tɜːnz', 'меняться, делать по очереди')
word('talk about', 'tɔːk əˈbaʊt', 'говорить о')
word('tell jokes', 'tɛl ʤəʊks', 'шутить')
word('topic', 'ˈtɒpɪk', 'тема')
word('trust', 'trʌst', 'доверие, доверять')
word('try', 'traɪ', 'пробовать, пытаться')
word('unexpected', 'ˌʌnɪksˈpɛktɪd', 'неожиданный')
word('voluntary work', 'ˈvɒləntəri wɜːk', 'добровольная работа')
word("wake up sb's brain", 'weɪk ʌp breɪn', 'разбудить мозг, встряхнуть', {
  enAlts: ['wake up your brain', "wake up somebody's brain"],
})
word('watch out', 'wɒʧ aʊt', 'остерегаться')

phrase('I accept your advice.', 'Я принимаю твой совет.')
phrase('Thanks for the advice.', 'Спасибо за совет.')
phrase('They often argue.', 'Они часто ссорятся.')
phrase('We had an argument.', 'У нас был спор.')
phrase('We arrived late.', 'Мы прибыли поздно.')
phrase('Give me at least an hour.', 'Дай мне как минимум час.')
phrase('She is good at art.', 'Она хороша в рисовании.')
phrase('Can I borrow this?', 'Можно взять это в долг?')
phrase('Use your brain.', 'Включи мозг.')
phrase('Please stay calm.', 'Пожалуйста, будь спокойным.')
phrase('He is a close friend.', 'Он близкий друг.')
phrase('She is competitive.', 'Она любит соревноваться.')
phrase("Let's have a conversation.", 'Давай пообщаемся.')
phrase('They are a couple.', 'Они пара.')
phrase('Be creative.', 'Будь творческим.')
phrase('Stay curious.', 'Оставайся любознательным.')
phrase("I can't decide.", 'Я не могу решить.')
phrase('The train is delayed.', 'Поезд задержан.')
phrase('It depends on you.', 'Это зависит от тебя.')
phrase('What a disaster!', 'Какая катастрофа!')
phrase('I must earn money.', 'Я должен зарабатывать деньги.')
phrase("Let's eat out.", 'Давай поедим вне дома.')
phrase('I feel embarrassed.', 'Я смущен.')
phrase('I enjoy music.', 'Я наслаждаюсь музыкой.')
phrase("That's fair.", 'Это справедливо.')
phrase('We fell in love.', 'Мы влюбились.')
phrase('It freaked me out.', 'Это привело меня в ужас.')
phrase('They got engaged.', 'Они помолвились.')
phrase('They got married.', 'Они поженились.')
phrase('We get on well.', 'Мы хорошо ладим.')
phrase('I want to get to know you.', 'Я хочу узнать тебя.')
phrase("Let's go for a walk.", 'Давай пойдём на прогулку.')
phrase("Let's go on holiday.", 'Давай поедем в отпуск.')
phrase("Let's go shopping.", 'Давай сходим по магазинам.')
phrase("That's a bad habit.", 'Это плохая привычка.')
phrase('We have a lot in common.', 'У нас много общего.')
phrase('I need time off.', 'Мне нужен отпуск.')
phrase('Be honest.', 'Будь честным.')
phrase('Use your imagination.', 'Используй воображение.')
phrase('Do it immediately.', 'Сделай это немедленно.')
phrase("Don't interrupt.", 'Не перебивай.')
phrase('This brings me joy.', 'Это приносит мне радость.')
phrase('Keep in touch.', 'Будем на связи.')
phrase('Luckily, yes.', 'К счастью, да.')
phrase('It was love at first sight.', 'Это была любовь с первого взгляда.')
phrase("Let's meet soon.", 'Давай скоро встретимся.')
phrase("I'm in a good mood.", 'У меня хорошее настроение.')
phrase("Don't be negative.", 'Не будь негативным.')
phrase('I got an offer.', 'Я получил предложение.')
phrase('I live on my own.', 'Я живу самостоятельно.')
phrase('Post the photo.', 'Опубликуй фото.')
phrase('He proposed to me.', 'Он сделал мне предложение.')
phrase("That's the reason.", 'Вот причина.')
phrase('We are in a relationship.', 'Мы в отношениях.')
phrase('Remind me later.', 'Напомни мне позже.')
phrase('Be sincere.', 'Будь искренним.')
phrase("I'm single.", 'Я одинок.')
phrase('Smile, please.', 'Улыбнись, пожалуйста.')
phrase("Don't spend money.", 'Не трать деньги.')
phrase('They split up.', 'Они разорвали отношения.')
phrase("I'm sure.", 'Я уверен.')
phrase("Let's take turns.", 'Давай по очереди.')
phrase('He tells jokes.', 'Он шутит.')
phrase('I trust you.', 'Я тебе доверяю.')
phrase('Try again.', 'Попробуй ещё раз.')
phrase('That was unexpected.', 'Это было неожиданно.')
phrase('I do voluntary work.', 'Я занимаюсь добровольной работой.')
phrase('Watch out!', 'Осторожно!')
