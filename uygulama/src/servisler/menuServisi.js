// İş katmanı · günün menüsü ve haftalık menü
const { okuma } = require('../veri/baglanti');
const menuVeri = require('../veri/menuVeri');
const rezervasyonVeri = require('../veri/rezervasyonVeri');
const tutarlilik = require('./tutarlilik');
const dogrula = require('./dogrula');

// Kural: öğrenci öğrenci fiyatını, personel ve yönetici personel fiyatını öder
function fiyatSec(rol, menu) {
  return rol === 'ogrenci' ? menu.ogrenci_fiyati : menu.personel_fiyati;
}

async function referanslar() {
  const [yemekhaneler, ogunler] = await Promise.all([menuVeri.yemekhaneler(okuma), menuVeri.ogunler(okuma)]);
  return { yemekhaneler, ogunler };
}

// v_menu_detay satırlarını kategorilere göre gruplar, toplam kaloriyi hesaplar
function menuOlustur(satirlar) {
  if (satirlar.length === 0) return null;
  const ilk = satirlar[0];
  const kategoriler = [];
  for (const s of satirlar) {
    let grup = kategoriler[kategoriler.length - 1];
    if (!grup || grup.kategori !== s.kategori) {
      grup = { kategori: s.kategori, yemekler: [] };
      kategoriler.push(grup);
    }
    grup.yemekler.push({
      id: s.yemek_id,
      ad: s.yemek,
      kalori: s.kalori,
      vejetaryen: Boolean(s.vejetaryen),
      alerjenler: s.alerjenler ? s.alerjenler.split(', ') : [],
      alerjen_idler: s.alerjen_idler ? s.alerjen_idler.split(',').map(Number) : [],
    });
  }
  return {
    menu_id: ilk.menu_id,
    tarih: ilk.tarih,
    yemekhane_id: ilk.yemekhane_id,
    yemekhane: ilk.yemekhane,
    ogun_id: ilk.ogun_id,
    ogun: ilk.ogun,
    rezervasyon_son: ilk.rezervasyon_son,
    ogrenci_fiyati: ilk.ogrenci_fiyati,
    personel_fiyati: ilk.personel_fiyati,
    toplam_kalori: satirlar.reduce((t, s) => t + s.kalori, 0),
    tamami_vejetaryen: satirlar.every((s) => s.vejetaryen),
    kategoriler,
  };
}

// Menü içeriği (yemekler, kalori, alerjen). Değişmeyen veri: replikadan okunur.
async function menuIcerigi(yemekhaneId, tarih, ogunId) {
  return menuOlustur(await menuVeri.menuDetay(okuma, yemekhaneId, tarih, ogunId));
}

async function gununMenusu(oturum, sorgu) {
  const yemekhaneId = dogrula.id(sorgu.yemekhane_id, 'Yemekhane');
  const ogunId = dogrula.id(sorgu.ogun_id, 'Öğün');
  const tarih = dogrula.tarih(sorgu.tarih);

  const menu = await menuIcerigi(yemekhaneId, tarih, ogunId);
  if (!menu) return null;

  const db = await tutarlilik.okumaHavuzu(oturum.kullanici_id);
  const [doluluk, durumlar] = await Promise.all([
    menuVeri.menuDolulugu(db, menu.menu_id),
    rezervasyonVeri.menulerdekiDurum(db, oturum.kullanici_id, [menu.menu_id]),
  ]);
  return {
    ...menu,
    fiyat: fiyatSec(oturum.rol, menu),
    doluluk,
    rezervasyon: durumlar[menu.menu_id] || null,
  };
}

// Seçilen günden başlayarak 7 günlük menü, doluluk ve kullanıcının rezervasyonları
async function haftalikMenu(oturum, sorgu) {
  const yemekhaneId = dogrula.id(sorgu.yemekhane_id, 'Yemekhane');
  const baslangic = dogrula.tarih(sorgu.baslangic);
  const bitis = dogrula.gunEkle(baslangic, 6);

  const db = await tutarlilik.okumaHavuzu(oturum.kullanici_id);
  const menuler = await menuVeri.dolulukListesi(db, yemekhaneId, baslangic, bitis);
  const [icerikler, durumlar] = await Promise.all([
    Promise.all(menuler.map((m) => menuIcerigi(m.yemekhane_id, m.tarih, m.ogun_id))),
    rezervasyonVeri.menulerdekiDurum(db, oturum.kullanici_id, menuler.map((m) => m.menu_id)),
  ]);

  const gunler = [];
  for (let i = 0; i < 7; i++) gunler.push({ tarih: dogrula.gunEkle(baslangic, i), menuler: [] });

  menuler.forEach((m, i) => {
    const gun = gunler.find((g) => g.tarih === m.tarih);
    const icerik = icerikler[i];
    gun.menuler.push({
      menu_id: m.menu_id,
      ogun_id: m.ogun_id,
      ogun: m.ogun,
      fiyat: fiyatSec(oturum.rol, m),
      kapasite: m.kapasite,
      bos_yer: m.bos_yer,
      rezervasyon_son: m.rezervasyon_son,
      suresi_doldu: Boolean(m.suresi_doldu),
      toplam_kalori: icerik ? icerik.toplam_kalori : null,
      yemekler: icerik ? icerik.kategoriler.flatMap((k) => k.yemekler.map((y) => y.ad)) : [],
      rezervasyon: durumlar[m.menu_id] || null,
    });
  });
  return { baslangic, bitis, gunler };
}

module.exports = { referanslar, gununMenusu, haftalikMenu, menuIcerigi, fiyatSec };
