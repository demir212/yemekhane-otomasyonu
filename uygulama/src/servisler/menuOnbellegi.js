// Menü önbelleği (Aşama 3: Redis)
//   Anahtar: menu:{yemekhane_id}:{tarih}:{ogun_id}
//   Değer:   menü içeriği (yemekler, kategoriler, kalori, alerjenler, fiyatlar) JSON olarak
//   Süre:    menünün ait olduğu günün sonuna kadar (İstanbul saatiyle 23:59:59)
//   Silinme: yönetici menüyü oluşturduğunda / değiştirdiğinde
// Doluluk ve kullanıcının rezervasyonu gibi sık değişen bilgiler önbelleğe alınmaz.
const { redis } = require('../veri/redisBaglanti');

const anahtar = (yemekhaneId, tarih, ogunId) => `menu:${yemekhaneId}:${tarih}:${ogunId}`;

// Menü gününün bittiği an (Unix saniye). Türkiye yıl boyu UTC+3'tür.
function gunSonu(tarih) {
  return Math.floor(new Date(`${tarih}T23:59:59+03:00`).getTime() / 1000);
}

async function yaz(yemekhaneId, tarih, ogunId, menu) {
  const k = anahtar(yemekhaneId, tarih, ogunId);
  const bitis = gunSonu(tarih);
  // Menü yoksa ya da günü geçmişse önbelleğe yazılmaz
  if (!menu || bitis <= Date.now() / 1000) return false;
  await redis.set(k, JSON.stringify(menu), { EXAT: bitis });
  return true;
}

// Önce Redis'e bakar; yoksa yukleyici() ile veritabanından okur ve önbelleğe yazar
async function getir(yemekhaneId, tarih, ogunId, yukleyici) {
  const k = anahtar(yemekhaneId, tarih, ogunId);
  const json = await redis.get(k);
  if (json !== null) {
    console.log(`[önbellek] ISABET ${k} → Redis'ten okundu`);
    return JSON.parse(json);
  }
  const menu = await yukleyici();
  const yazildi = await yaz(yemekhaneId, tarih, ogunId, menu);
  console.log(`[önbellek] ISKA   ${k} → veritabanından okundu${yazildi ? ', önbelleğe yazıldı' : ''}`);
  return menu;
}

async function sil(yemekhaneId, tarih, ogunId) {
  const k = anahtar(yemekhaneId, tarih, ogunId);
  const silinen = await redis.del(k);
  console.log(`[önbellek] SİLİNDİ ${k} (yönetici menüyü değiştirdi; ${silinen ? 'eski kayıt vardı' : 'kayıt yoktu'})`);
}

module.exports = { anahtar, getir, yaz, sil };
