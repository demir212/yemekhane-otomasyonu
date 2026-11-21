// Veri katmanı · yemekhaneler, öğünler ve menüler (v_menu_detay, v_menu_doluluk)

async function yemekhaneler(db) {
  const [satirlar] = await db.query('SELECT id, ad, konum, kapasite FROM yemekhaneler ORDER BY id');
  return satirlar;
}

async function ogunler(db) {
  const [satirlar] = await db.query(
    `SELECT id, ad, sira, TIME_FORMAT(son_saat, '%H:%i') AS son_saat
       FROM ogunler ORDER BY sira`
  );
  return satirlar;
}

// Bir menünün yemekleri (her yemek bir satır). Menü yoksa boş dizi.
async function menuDetay(db, yemekhaneId, tarih, ogunId) {
  const [satirlar] = await db.query(
    `SELECT menu_id, tarih, yemekhane_id, yemekhane, ogun_id, ogun, rezervasyon_son,
            ogrenci_fiyati, personel_fiyati, yemek_id, yemek, kategori, kategori_sira,
            kalori, vejetaryen, alerjenler, alerjen_idler
       FROM v_menu_detay
      WHERE yemekhane_id = ? AND tarih = ? AND ogun_id = ?
      ORDER BY kategori_sira, yemek`,
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
            m.ogrenci_fiyati, m.personel_fiyati
       FROM v_menu_doluluk d
       JOIN menuler m ON m.id = d.menu_id
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
