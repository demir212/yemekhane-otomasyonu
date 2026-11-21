// Okuma/yazma ayrımı ve "kendi yazdığını oku" tutarlılığı
//
// Listeleme ve raporlar replikadan okunur. Replikasyon eşzamansız olduğu için kullanıcı
// bir yazma yaptıktan hemen sonra replikada eski veriyi görebilir (ör. rezervasyondan sonra
// eski bakiye). Bu yüzden bir kullanıcı yazma yaptıktan sonra kısa bir süre o kullanıcının
// okumaları kaynaktan (mysql-primary) yapılır.
const ayar = require('../ayarlar');
const { yazma, okuma } = require('../veri/baglanti');

const sonYazma = new Map(); // kullanici_id -> zaman (ms)

async function yazmaYapildi(kullaniciId) {
  sonYazma.set(kullaniciId, Date.now());
}

// Bu kullanıcının okuması hangi havuzdan yapılmalı?
async function okumaHavuzu(kullaniciId) {
  const zaman = sonYazma.get(kullaniciId);
  if (zaman && Date.now() - zaman < ayar.kaynaktanOkumaSuresi * 1000) return yazma;
  return okuma;
}

module.exports = { yazmaYapildi, okumaHavuzu };
