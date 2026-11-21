// Veri katmanı · iki bağlantı havuzu
//   yazma: mysql-primary (INSERT/UPDATE/CALL)
//   okuma: mysql-replica (listeleme ve raporlar, salt okunur)
const mysql = require('mysql2/promise');
const ayar = require('../ayarlar');

function havuzOlustur(host) {
  return mysql.createPool({
    host,
    port: ayar.db.port,
    user: ayar.db.kullanici,
    password: ayar.db.sifre,
    database: ayar.db.ad,
    charset: 'utf8mb4',
    timezone: '+03:00',
    dateStrings: true,      // DATE / DATETIME metin olarak gelsin, saat dilimi kayması olmasın
    decimalNumbers: true,   // DECIMAL alanlar sayı olarak gelsin
    connectionLimit: 10,
    waitForConnections: true,
  });
}

const yazma = havuzOlustur(ayar.db.yazmaHost);
const okuma = havuzOlustur(ayar.db.okumaHost);

// Stored procedure çağırır ve dönen tek satırı verir.
// Yordam kendi transaction'ını yönetir; burada BEGIN/COMMIT yoktur.
async function yordamCagir(sql, parametreler) {
  const [sonuc] = await yazma.query(sql, parametreler);
  return sonuc[0][0];
}

module.exports = { yazma, okuma, yordamCagir };
