// İş katmanı · yönetici paneli
const { UygulamaHatasi } = require('../hatalar');
const yonetimVeri = require('../veri/yonetimVeri');
const tutarlilik = require('./tutarlilik');
const dogrula = require('./dogrula');

async function menuRaporu(oturum, sorgu) {
  const baslangic = dogrula.tarih(sorgu.baslangic);
  const bitis = sorgu.bitis ? dogrula.tarih(sorgu.bitis) : dogrula.gunEkle(baslangic, 6);
  if (bitis < baslangic) throw new UygulamaHatasi('Bitiş tarihi başlangıçtan önce olamaz.');
  const db = await tutarlilik.okumaHavuzu(oturum.kullanici_id);
  return yonetimVeri.menuRaporu(db, baslangic, bitis);
}

async function yemekler(oturum) {
  const db = await tutarlilik.okumaHavuzu(oturum.kullanici_id);
  return yonetimVeri.yemekler(db);
}

async function menuGetir(oturum, menuId) {
  const db = await tutarlilik.okumaHavuzu(oturum.kullanici_id);
  const menu = await yonetimVeri.menuGetir(db, dogrula.id(menuId, 'Menü'));
  if (!menu) throw new UygulamaHatasi('Menü bulunamadı.', 404);
  return menu;
}

function fiyatlariDogrula(govde) {
  const ogrenci = dogrula.tutar(govde.ogrenci_fiyati, 'Öğrenci fiyatı');
  const personel = dogrula.tutar(govde.personel_fiyati, 'Personel fiyatı');
  if (ogrenci < 0 || personel < 0) throw new UygulamaHatasi('Fiyat negatif olamaz.');
  const yemekIdler = Array.isArray(govde.yemek_idler) ? [...new Set(govde.yemek_idler.map(Number))] : [];
  if (yemekIdler.length === 0 || !yemekIdler.every((i) => Number.isInteger(i) && i > 0)) {
    throw new UygulamaHatasi('Menüye en az bir yemek seçmelisiniz.');
  }
  return { ogrenci_fiyati: ogrenci, personel_fiyati: personel, yemek_idler: yemekIdler };
}

// MySQL hata kodlarını kullanıcıya anlaşılır mesaja çevirir
function veritabaniHatasi(hata) {
  if (hata.errno === 1062) return new UygulamaHatasi('Bu yemekhane, tarih ve öğün için zaten bir menü var.');
  if (hata.errno === 1452) return new UygulamaHatasi('Geçersiz yemekhane, öğün ya da yemek seçimi.');
  return hata;
}

async function menuOlustur(oturum, govde) {
  const menu = {
    yemekhane_id: dogrula.id(govde.yemekhane_id, 'Yemekhane'),
    ogun_id: dogrula.id(govde.ogun_id, 'Öğün'),
    tarih: dogrula.tarih(govde.tarih),
    ...fiyatlariDogrula(govde),
  };
  try {
    const menuId = await yonetimVeri.menuOlustur(menu);
    await tutarlilik.yazmaYapildi(oturum.kullanici_id);
    return { menu_id: menuId };
  } catch (hata) {
    throw veritabaniHatasi(hata);
  }
}

async function menuGuncelle(oturum, menuId, govde) {
  const id = dogrula.id(menuId, 'Menü');
  const degisiklik = fiyatlariDogrula(govde);
  try {
    await yonetimVeri.menuGuncelle(id, degisiklik);
    await tutarlilik.yazmaYapildi(oturum.kullanici_id);
  } catch (hata) {
    throw veritabaniHatasi(hata);
  }
  return { menu_id: id };
}

module.exports = { menuRaporu, yemekler, menuGetir, menuOlustur, menuGuncelle };
