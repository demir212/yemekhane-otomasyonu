// İş katmanı · değerlendirme
// Kural: yalnızca kullanılmış (turnikeden geçilmiş) menü değerlendirilebilir.
const { UygulamaHatasi } = require('../hatalar');
const { yazma } = require('../veri/baglanti');
const degerlendirmeVeri = require('../veri/degerlendirmeVeri');
const tutarlilik = require('./tutarlilik');
const dogrula = require('./dogrula');

async function listele(oturum) {
  const db = await tutarlilik.okumaHavuzu(oturum.kullanici_id);
  return degerlendirmeVeri.degerlendirilebilirMenuler(db, oturum.kullanici_id);
}

async function kaydet(oturum, govde) {
  const menuId = dogrula.id(govde.menu_id, 'Menü');
  const puan = Number(govde.puan);
  if (!Number.isInteger(puan) || puan < 1 || puan > 5) {
    throw new UygulamaHatasi('Puan 1 ile 5 arasında olmalıdır.');
  }
  const yorum = typeof govde.yorum === 'string' && govde.yorum.trim() ? govde.yorum.trim() : null;
  if (yorum && yorum.length > 500) throw new UygulamaHatasi('Yorum en fazla 500 karakter olabilir.');

  // Kural kontrolü kaynakta yapılır (replikada henüz görünmeyen turnike geçişi olabilir)
  const kullanildi = await degerlendirmeVeri.menuKullanildiMi(yazma, oturum.kullanici_id, menuId);
  if (!kullanildi) throw new UygulamaHatasi('Yalnızca kullandığınız menüleri değerlendirebilirsiniz.');

  await degerlendirmeVeri.kaydet(yazma, oturum.kullanici_id, menuId, puan, yorum);
  await tutarlilik.yazmaYapildi(oturum.kullanici_id);
}

module.exports = { listele, kaydet };
