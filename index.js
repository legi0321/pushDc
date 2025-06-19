
import 'dotenv/config';
import fs from 'fs';
import fetch from 'node-fetch';
import delay from 'delay';

// Ambil semua token & channel dari .env
const bots = Object.entries(process.env)
  .filter(([key]) => key.startsWith('TOKEN'))
  .map(([key, token]) => {
    const n = key.replace('TOKEN', '');
    const channels = process.env['CHANNELS' + n]
      .split(',')
      .map(pair => {
        const [id, d] = pair.split(':');
        return { id: id.trim(), delay: parseInt(d.trim()) || 17000 };
      });
    return { token, channels };
  });

// Ambil pesan dari file ./data/{channelId}.txt
const getMessageForChannel = (channelId) => {
  const path = `./data/${channelId}.txt`;
  if (!fs.existsSync(path)) return "Pesan default";
  const lines = fs.readFileSync(path, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "Pesan default";
  return lines[Math.floor(Math.random() * lines.length)];
};

// Kirim pesan ke channel Discord
const sendMessage = async (token, channelId, content) => {
  try {
    const res = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content, tts: false })
    });

    const json = await res.json();

    if (res.status === 429 && json.retry_after) {
      console.warn(`[⏳] Slowmode di ${channelId}, retry dalam ${json.retry_after}s`);
      await delay(json.retry_after * 1000);
      return await sendMessage(token, channelId, content);
    }

    if (json.id) {
      console.log(`[✅] ${channelId}: ${json.content}`);
    } else {
      console.log(`[❌] Gagal kirim ke ${channelId}:`, json);
    }

  } catch (err) {
    console.error(`[‼️] Error kirim ke ${channelId}: ${err.message}`);
  }
};

// Loop kirim per bot dan channel
bots.forEach(({ token, channels }) => {
  (async () => {
    console.log(`🚀 Bot aktif untuk ${channels.length} channel...`);
    while (true) {
      for (const ch of channels) {
        const msg = getMessageForChannel(ch.id);
        await sendMessage(token, ch.id, msg);
        await delay(ch.delay || 17000);
      }
    }
  })();
});
