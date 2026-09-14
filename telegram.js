require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { Api } = require('telegram');

const apiId = parseInt(process.env.TELEGRAM_API_ID) || 0;
const apiHash = process.env.TELEGRAM_API_HASH || '';
const SESSION_STRING = process.env.TELEGRAM_SESSION || '';
const CHANNEL = 'eRadarrua';

const recentMessages = [];
const MAX_MESSAGES = 50;
const listeners = new Set();

function addListener(fn) { listeners.add(fn); }
function removeListener(fn) { listeners.delete(fn); }

function pushMessage(msg) {
    recentMessages.unshift(msg);
    if (recentMessages.length > MAX_MESSAGES) recentMessages.pop();
    listeners.forEach(fn => { try { fn(msg); } catch (e) {} });
}

async function startTelegram() {
    if (!apiId || !apiHash || !SESSION_STRING || SESSION_STRING.length < 50) {
        console.warn('⚠️ Telegram не подключён. Проверь .env');
        return;
    }

    let client;
    try {
        client = new TelegramClient(
            new StringSession(SESSION_STRING),
            apiId,
            apiHash,
            { connectionRetries: 5 }
        );
    } catch (e) {
        console.error('❌ Ошибка StringSession:', e.message);
        return;
    }

    console.log('Подключаюсь к Telegram...');
    try {
        await client.connect();
    } catch (e) {
        console.error('❌ Не удалось подключиться к Telegram:', e.message);
        return;
    }

    if (!(await client.isUserAuthorized())) {
        console.error('❌ Сессия не авторизована. Перезапусти telegram-login.js');
        return;
    }

    console.log('✅ Telegram подключён');

    // Подписка на канал
    try {
        await client.invoke(new Api.channels.JoinChannel({ channel: CHANNEL }));
        console.log(`✅ Подписка на @${CHANNEL} оформлена`);
    } catch (e) {
        console.log(`ℹ️ Уже подписаны на @${CHANNEL}`);
    }

    // Загружаем последние сообщения
    try {
        const messages = await client.getMessages(CHANNEL, { limit: 20 });
        messages.reverse().forEach(m => {
            if (m.text) {
                const date = new Date(m.date * 1000);
                recentMessages.push({
                    id: m.id,
                    text: m.text,
                    date: date.toISOString(),
                    time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                    channel: CHANNEL
                });
            }
        });
        console.log(`Загружено ${recentMessages.length} последних сообщений`);
    } catch (e) {
        console.warn('Не удалось загрузить историю:', e.message);
    }

    // Слушаем новые сообщения
    client.addEventHandler(async (event) => {
        const message = event.message;
        if (!message || !message.text) return;

        const date = new Date(message.date * 1000);
        const msg = {
            id: message.id,
            text: message.text,
            date: date.toISOString(),
            time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            channel: CHANNEL
        };
        console.log(`📨 [${msg.time}] ${msg.text.slice(0, 80)}`);
        pushMessage(msg);
    }, new NewMessage({ chats: [CHANNEL] }));
}

module.exports = {
    startTelegram,
    getRecentMessages: () => recentMessages,
    addListener,
    removeListener
};