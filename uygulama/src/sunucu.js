// Uygulama giriş noktası
const express = require('express');
const ayar = require('./ayarlar');
const rotalar = require('./rotalar');
const hataYakalayici = require('./ara/hataYakalayici');
const { hazir: redisHazir } = require('./veri/redisBaglanti');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));

app.use('/api', rotalar);
app.use('/api', (req, res) => res.status(404).json({ hata: 'Böyle bir adres yok.' }));
app.use(hataYakalayici);

// Oturumlar Redis'te tutulduğu için Redis'e bağlanmadan istek kabul edilmez
redisHazir
  .then(() => {
    app.listen(ayar.port, () => {
      console.log(`[uygulama] ${ayar.port} portunda dinleniyor`);
      console.log(`[uygulama] yazma: ${ayar.db.yazmaHost}, okuma: ${ayar.db.okumaHost}, redis: ${ayar.redis.host}`);
    });
  })
  .catch((hata) => {
    console.error(`[uygulama] Redis'e bağlanılamadı: ${hata.message}`);
    process.exit(1);
  });
