// Veri katmanı · yemekhaneler, öğünler ve menüler (v_menu_detay, v_menu_doluluk)

async function yemekhaneler(db) {
  const [satirlar] = await db.query('SELECT id, ad, konum, kapasite FROM yemekhaneler ORDER BY id');
  return satirlar;
}

async function ogunler(db) {
  const [satirlar] = await db.query(
    `SELECT id, ad, sira, TIME_FORMAT(son_saat, '%H:%i') AS son_saat, yarim_porsiyon_orani
       FROM ogunler ORDER BY sira`
  );
  return satirlar;
}

// Bir menünün yemekleri (her yemek bir satır). Menü yoksa boş dizi.
// yarim_porsiyon_orani: öğünün yarım porsiyon oranı (NULL: yarım porsiyon yok) · Aşama 4
async function menuDetay(db, yemekhaneId, tarih, ogunId) {
  const [satirlar] = await db.query(
    `SELECT d.menu_id, d.tarih, d.yemekhane_id, d.yemekhane, d.ogun_id, d.ogun, d.rezervasyon_son,
            d.ogrenci_fiyati, d.personel_fiyati, o.yarim_porsiyon_orani,
            d.yemek_id, d.yemek, d.kategori, d.kategori_sira,
            d.kalori, d.vejetaryen, d.alerjenler, d.alerjen_idler
       FROM v_menu_detay d
       JOIN ogunler o ON o.id = d.ogun_id
      WHERE d.yemekhane_id = ? AND d.tarih = ? AND d.ogun_id = ?
      ORDER BY d.kategori_sira, d.yemek`,
    [yemekhaneId, tarih, ogunId]
  );
  return satirlar;
}

// Menü başına doluluk. Son saat karşılaştırması veritabanında yapılır (NOW()).
async function dolulukListesi(db, yemekhaneId, baslangic, bitis) {
  const [satirlar] = await db.query(
    `SELECT d.menu_id, d.tarih, d.yemekhane_id, d.yemekhane, d.ogun_id, d.ogun,
            d.kapasite, d.rezerve, d.bos_yer, d.doluluk_yuzde, d.rezervasyon_son,
            (d.rezervasyon_son <= NOW()) AS suresi_doldu,
            m.ogrenci_fiyati, m.personel_fiyati, o.yarim_porsiyon_orani
       FROM v_menu_doluluk d
       JOIN menuler m ON m.id = d.menu_id
       JOIN ogunler o ON o.id = d.ogun_id
      WHERE d.yemekhane_id = ? AND d.tarih BETWEEN ? AND ?
      ORDER BY d.tarih, d.ogun_id`,
    [yemekhaneId, baslangic, bitis]
  );
  return satirlar;
}

async function menuDolulugu(db, menuId) {
  const [satirlar] = await db.query(
    `SELECT menu_id, kapasite, rezerve, bos_yer, doluluk_yuzde, rezervasyon_son,
            (rezervasyon_son <= NOW()) AS suresi_doldu
       FROM v_menu_doluluk WHERE menu_id = ?`,
    [menuId]
  );
  return satirlar[0] || null;
}

module.exports = { yemekhaneler, ogunler, menuDetay, dolulukListesi, menuDolulugu };
