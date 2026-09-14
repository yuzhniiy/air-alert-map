require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('readline');

const apiId = parseInt(process.env.TELEGRAM_API_ID) || 29503255;
const apiHash = process.env.TELEGRAM_API_HASH || '8cccabe6f3747cff5c00178688d93e5e';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

(async () => {
    if (!apiId || !apiHash) {
        console.error('❌ TELEGRAM_API_ID или TELEGRAM_API_HASH не заданы в .env');
        process.exit(1);
    }

    const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });

    await client.start({
        phoneNumber: async () => await ask('Номер телефона (например +380...): '),
        password: async () => await ask('Пароль 2FA (если нет — просто Enter): '),
        phoneCode: async () => await ask('Код из Telegram: '),
        onError: (err) => console.error('Ошибка:', err.message)
    });

    console.log('\n========================================');
    console.log('ВОТ ТВОЯ СТРОКА СЕССИИ (скопируй её в .env как TELEGRAM_SESSION):');
    console.log('========================================\n');
    console.log(client.session.save());
    console.log('\n========================================\n');

    await client.disconnect();
    rl.close();
    process.exit(0);
})();