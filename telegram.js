const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { Api } = require('telegram');

// ⚠️ ВСТАВЬ СВОИ ДАННЫЕ
const apiId = 29503255;             // ← число
const apiHash = '8cccabe6f3747cff5c00178688d93e5e';           // ← строка в кавычках
const SESSION_STRING = '1AgAOMTQ5LjE1NC4xNjcuNTEBu2/4D0DD8AbOW1pd0bek5pNucUkdTtwBtk8jNPFIKJvkjeSx3GwsTowmsaRb1/KtKm3XSsrad5+kqu/EP8YsXo48hmEE6eGfKK29Xjh6RgriAjMugjF+DxDt6ICBLO74AVQm5yA2Fcw8fo0IdVcFJFc3XN29Si/8Ij2CDGwIkhBqJv1O6CyitbQ5ZtiOE0VM4V1sD+JHoXjD81Ex0q1ZiZC2w52bqVW1cE/7hq6SqvOvr3nuthg+umxxzX3IWszrHWyJt0N1G/juXiQZhlOUK6LDhzaR7NJRgBwXD/+CNOW1JqtYQ3K/2kb1TSj5M3h6lGntls4kaT62SBjZEdERRj4=';    // ← строка из telegram-login.js (пока пусто — ок)

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
    // Если нет ключей или сессии — просто пропускаем Telegram
    if (!apiId || !apiHash || !SESSION_STRING || SESSION_STRING.length < 50) {
        console.warn('⚠️ Telegram не подключён. Заполни apiId, apiHash и SESSION_STRING в telegram.js');
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
        console.error('   Скорее всего, SESSION_STRING невалидная. Запусти node telegram-login.js заново.');
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
        console.error('❌ Сессия не авторизована. Запусти telegram-login.js заново.');
        return;
    }

    console.log('✅ Telegram подключён');

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

    // Слушаем новые
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