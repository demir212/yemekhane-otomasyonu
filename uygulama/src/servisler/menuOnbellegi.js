// Menü önbelleği (Aşama 3: Redis)
//   Anahtar: menu:{yemekhane_id}:{tarih}:{ogun_id}
//   Değer:   menü içeriği (yemekler, kategoriler, kalori, alerjenler, fiyatlar) JSON olarak
//   Süre:    menünün ait olduğu günün sonuna kadar (İstanbul saatiyle 23:59:59)
//   Silinme: yönetici menüyü oluşturduğunda / değiştirdiğinde
// Doluluk ve kullanıcının rezervasyonu gibi sık değişen bilgiler önbelleğe alınmaz.
const { redis } = require('../veri/redisBaglanti');

const anahtar = (yemekhaneId, tarih, ogunId) => `menu:${yemekhaneId}:${tarih}:${ogunId}`;

// Değerin biçim sürümü. Aşama 4'te menüye yarim_porsiyon_orani eklendi → sürüm 2.
// Aşama 3'te yazılmış (sürümsüz) kayıtlar eski biçimdir: okunmaz, silinir.
const SURUM = 2;

// Menü gününün bittiği an (Unix saniye). Türkiye yıl boyu UTC+3'tür.
function gunSonu(tarih) {
  return Math.floor(new Date(`${tarih}T23:59:59+03:00`).getTime() / 1000);
}

async function yaz(yemekhaneId, tarih, ogunId, menu) {
  const k = anahtar(yemekhaneId, tarih, ogunId);
  const bitis = gunSonu(tarih);
  // Menü yoksa ya da günü geçmişse önbelleğe yazılmaz
  if (!menu || bitis <= Date.now() / 1000) return false;
  await redis.set(k, JSON.stringify({ surum: SURUM, ...menu }), { EXAT: bitis });
  return true;
}

// Önce Redis'e bakar; yoksa yukleyici() ile veritabanından okur ve önbelleğe yazar
async function getir(yemekhaneId, tarih, ogunId, yukleyici) {
  const k = anahtar(yemekhaneId, tarih, ogunId);
  const json = await redis.get(k);
  if (json !== null) {
    const { surum, ...menu } = JSON.parse(json);
    if (surum === SURUM) {
      console.log(`[önbellek] ISABET ${k} → Redis'ten okundu`);
      return menu;
    }
    // Temizlikten kaçmış eski biçimli kayıt: kullanılmaz, aşağıda yenisiyle değiştirilir
    console.log(`[önbellek] ESKİ BİÇİM ${k} (sürüm ${surum ?? 'yok'}) → yok sayıldı`);
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

// Aşama 4 · Redis'te eski yapıdaki menü kayıtlarının temizlenmesi.
// Uygulama her açılışta menu:* anahtarlarını tarar (SCAN: Redis'i kilitlemez) ve
// güncel sürümde olmayanları siler. Silinen menüler ilk istekte yeni biçimle dolar.
async function eskiKayitlariTemizle() {
  let taranan = 0;
  const silinecek = [];
  for await (const k of redis.scanIterator({ MATCH: 'menu:*', COUNT: 100 })) {
    taranan++;
    const json = await redis.get(k);
    let surum = null;
    try { surum = JSON.parse(json).surum ?? null; } catch { /* bozuk kayıt: silinir */ }
    if (surum !== SURUM) silinecek.push(k);
  }
  if (silinecek.length > 0) await redis.del(silinecek);
  console.log(`[önbellek] açılış temizliği: ${taranan} menü kaydı tarandı, ${silinecek.length} eski biçimli kayıt silindi (güncel sürüm ${SURUM})`);
  return silinecek.length;
}

module.exports = { anahtar, getir, yaz, sil, eskiKayitlariTemizle };
