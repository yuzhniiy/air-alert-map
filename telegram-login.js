const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('readline');

const apiId = 29503255;
const apiHash = '8cccabe6f3747cff5c00178688d93e5e';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

(async () => {
    const client = new TelegramClient(new StringSession(''), apiId, apiHash, {});
    await client.start({
        phoneNumber: async () => await new Promise(r => rl.question('Номер телефона (в формате +380...): ', r)),
        password: async () => await new Promise(r => rl.question('Пароль 2FA (если есть): ', r)),
        phoneCode: async () => await new Promise(r => rl.question('Код из Telegram: ', r)),
        onError: (err) => console.error(err)
    });
    console.log('\n✅ ВОТ ТВОЯ СТРОКА СЕССИИ (скопируй её в telegram.js):\n');
    console.log(client.session.save());
    await client.disconnect();
    rl.close();
})();