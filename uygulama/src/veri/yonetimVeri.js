// Veri katmanı · yönetici paneli (menü oluşturma/düzenleme, doluluk ve puan raporu)
const { yazma } = require('./baglanti');

async function menuRaporu(db, baslangic, bitis) {
  const [satirlar] = await db.query(
    `SELECT d.menu_id, d.tarih, d.yemekhane_id, d.yemekhane, d.ogun_id, d.ogun,
            d.kapasite, d.rezerve, d.bos_yer, d.doluluk_yuzde,
            m.ogrenci_fiyati, m.personel_fiyati,
            p.oy_sayisi, p.ortalama_puan
       FROM v_menu_doluluk d
       JOIN menuler m     ON m.id = d.menu_id
       JOIN v_menu_puan p ON p.menu_id = d.menu_id
      WHERE d.tarih BETWEEN ? AND ?
      ORDER BY d.tarih, d.yemekhane_id, d.ogun_id`,
    [baslangic, bitis]
  );
  return satirlar;
}

async function yemekler(db) {
  const [satirlar] = await db.query(
    `SELECT y.id, y.ad, y.kalori, y.vejetaryen, k.id AS kategori_id, k.ad AS kategori
       FROM yemekler y
       JOIN yemek_kategorileri k ON k.id = y.kategori_id
      ORDER BY k.sira, y.ad`
  );
  return satirlar;
}

async function menuGetir(db, menuId) {
  const [menuler] = await db.query(
    `SELECT id, yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati
       FROM menuler WHERE id = ?`,
    [menuId]
  );
  if (!menuler[0]) return null;
  const [yemekSatirlari] = await db.query(
    'SELECT yemek_id FROM menu_yemekleri WHERE menu_id = ? ORDER BY yemek_id',
    [menuId]
  );
  return { ...menuler[0], yemek_idler: yemekSatirlari.map((s) => s.yemek_id) };
}

// Menü ve yemekleri tek transaction'da yazılır (kaynakta)
async function menuOlustur(menu) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    const [sonuc] = await baglanti.query(
      `INSERT INTO menuler (yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati)
       VALUES (?, ?, ?, ?, ?)`,
      [menu.yemekhane_id, menu.tarih, menu.ogun_id, menu.ogrenci_fiyati, menu.personel_fiyati]
    );
    const menuId = sonuc.insertId;
    await baglanti.query('INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?', [
      menu.yemek_idler.map((yemekId) => [menuId, yemekId]),
    ]);
    await baglanti.commit();
    return menuId;
  } catch (hata) {
    await baglanti.rollback();
    throw hata;
  } finally {
    baglanti.release();
  }
}

// Yemekhane, tarih ve öğün değişmez; fiyatlar ve yemekler güncellenir
async function menuGuncelle(menuId, menu) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    await baglanti.query(
      'UPDATE menuler SET ogrenci_fiyati = ?, personel_fiyati = ? WHERE id = ?',
      [menu.ogrenci_fiyati, menu.personel_fiyati, menuId]
    );
    await baglanti.query('DELETE FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
    await baglanti.query('INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?', [
      menu.yemek_idler.map((yemekId) => [menuId, yemekId]),
    ]);
    await baglanti.commit();
  } catch (hata) {
    await baglanti.rollback();
    throw hata;
  } finally {
    baglanti.release();
  }
}

module.exports = { menuRaporu, yemekler, menuGetir, menuOlustur, menuGuncelle };
