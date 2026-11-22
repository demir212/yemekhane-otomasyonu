// Okuma/yazma ayrımı ve "kendi yazdığını oku" tutarlılığı
//
// Listeleme ve raporlar replikadan okunur. Replikasyon eşzamansız olduğu için kullanıcı
// bir yazma yaptıktan hemen sonra replikada eski veriyi görebilir (ör. rezervasyondan sonra
// eski bakiye). Bu yüzden bir kullanıcı yazma yaptıktan sonra kısa bir süre o kullanıcının
// okumaları kaynaktan (mysql-primary) yapılır.
//
// İşaret Redis'te tutulur: yazdi:{kullanici_id}, 10 saniye sonra kendiliğinden silinir.
// Böylece uygulama yeniden başlasa (ya da birden çok kopya çalışsa) da kural bozulmaz.
const ayar = require('../ayarlar');
const { yazma, okuma } = require('../veri/baglanti');
const { redis } = require('../veri/redisBaglanti');

const anahtar = (kullaniciId) => `yazdi:${kullaniciId}`;

async function yazmaYapildi(kullaniciId) {
  await redis.set(anahtar(kullaniciId), '1', { EX: ayar.kaynaktanOkumaSuresi });
}

// Bu kullanıcının okuması hangi havuzdan yapılmalı?
async function okumaHavuzu(kullaniciId) {
  return (await redis.exists(anahtar(kullaniciId))) ? yazma : okuma;
}

module.exports = { yazmaYapildi, okumaHavuzu };
