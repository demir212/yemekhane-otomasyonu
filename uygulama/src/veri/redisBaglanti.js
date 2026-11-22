// Veri katmanı · Redis bağlantısı
//   oturum:{token}                        → kullanıcı oturumları (30 dk, her istekte yenilenir)
//   menu:{yemekhane_id}:{tarih}:{ogun_id}  → menü içeriği önbelleği (menü gününün sonuna kadar)
//   yazdi:{kullanici_id}                  → "kendi yazdığını oku" işareti (10 sn)
const { createClient } = require('redis');
const ayar = require('../ayarlar');

const redis = createClient({
  socket: {
    host: ayar.redis.host,
    port: ayar.redis.port,
    // Bağlantı koparsa artan aralıklarla (en çok 2 sn) yeniden dene
    reconnectStrategy: (deneme) => Math.min(deneme * 100, 2000),
  },
});

redis.on('ready', () => console.log(`[redis] ${ayar.redis.host}:${ayar.redis.port} bağlantısı hazır`));
redis.on('error', (hata) => console.error(`[redis] hata: ${hata.message}`));

// Sunucu dinlemeye başlamadan önce beklenir (sunucu.js)
const hazir = redis.connect();

module.exports = { redis, hazir };
