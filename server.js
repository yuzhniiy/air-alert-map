const express = require('express');
const cors = require('cors');
const axios = require('axios');

require('dotenv').config();

// ============ TELEGRAM ============
const telegram = require('./telegram');
telegram.startTelegram().catch(e => console.error('Telegram не запустился:', e));

// ============ ИСТОЧНИКИ ============
const TARGET_API_URL = 'https://aviacontrol.com.ua/api/targets';
const ALERTS_API_URL = 'https://alerts.com.ua/api/states';
const PORT = process.env.PORT || 3000;

// ============ СОЗДАЁМ APP ============
const app = express();
app.use(cors());

// ============ КЭШ ============
let targetsCache = { data: null, updatedAt: 0 };
let alertsCache = { data: null, updatedAt: 0 };

// ============ ФУНКЦИИ ОБНОВЛЕНИЯ ============
async function refreshTargetsCache() {
    try {
        const response = await axios.get(TARGET_API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0',
                'Referer': 'https://aviacontrol.com.ua/',
                'Accept': '*/*',
                'Accept-Language': 'ru,uk;q=0.9,en;q=0.8'
            }
        });
        targetsCache.data = response.data;
        targetsCache.updatedAt = Date.now();
        console.log(`[${new Date().toLocaleTimeString()}] Цели обновлены. Всего: ${response.data.targets?.length || 0}`);
    } catch (error) {
        console.error('Ошибка обновления целей:', error.message);
    }
}

async function refreshAlertsCache() {
    try {
        const response = await axios.get(ALERTS_API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0'
            }
        });
        alertsCache.data = response.data;
        alertsCache.updatedAt = Date.now();
        const activeCount = (response.data.states || []).filter(s => s.alert).length;
        console.log(`[${new Date().toLocaleTimeString()}] Тревоги обновлены. Активных: ${activeCount}`);
    } catch (error) {
        console.error('Ошибка обновления тревог:', error.message);
    }
}

refreshTargetsCache();
refreshAlertsCache();
setInterval(refreshTargetsCache, 5000);
setInterval(refreshAlertsCache, 25000);

// ============ ЭНДПОИНТЫ ============
app.get('/api/targets', (req, res) => {
    if (!targetsCache.data) return res.status(503).json({ error: 'Цели ещё не загружены' });
    res.json(targetsCache.data);
});

app.get('/api/alerts', (req, res) => {
    if (!alertsCache.data) return res.status(503).json({ error: 'Тревоги ещё не загружены' });
    res.json(alertsCache.data);
});

// Последние сообщения Telegram
app.get('/api/telegram', (req, res) => {
    res.json({ messages: telegram.getRecentMessages() });
});

// Живой поток (SSE)
app.get('/api/telegram/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    telegram.getRecentMessages().forEach(msg => {
        res.write(`data: ${JSON.stringify(msg)}\n\n`);
    });

    const listener = (msg) => {
        try { res.write(`data: ${JSON.stringify(msg)}\n\n`); } catch (e) {}
    };
    telegram.addListener(listener);

    req.on('close', () => {
        telegram.removeListener(listener);
        res.end();
    });
});

// ============ ЗАПУСК ============
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});