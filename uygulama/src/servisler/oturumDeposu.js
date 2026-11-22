// Oturum deposu (Aşama 3: Redis)
//   Anahtar: oturum:{token}   Değer: {kullanici_id, rol, ad, soyad} (JSON)
//   Süre: 30 dakika; her istekte yeniden 30 dakikaya çıkar (kayan süre). Çıkışta silinir.
// Oturumlar uygulama container'ının dışında durduğu için container yeniden başlasa da
// kullanıcılar oturumdan düşmez.
const ayar = require('../ayarlar');
const { redis } = require('../veri/redisBaglanti');

const anahtar = (token) => `oturum:${token}`;

async function kaydet(token, veri) {
  await redis.set(anahtar(token), JSON.stringify(veri), { EX: ayar.oturumSuresi });
}

// GETEX: değeri okur ve süreyi tek komutta yeniden 30 dakikaya ayarlar
async function getir(token) {
  const json = await redis.getEx(anahtar(token), { EX: ayar.oturumSuresi });
  return json ? JSON.parse(json) : null;
}

async function sil(token) {
  await redis.del(anahtar(token));
}

module.exports = { kaydet, getir, sil };
