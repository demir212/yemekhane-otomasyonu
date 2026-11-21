// Ara katman · oturum ve rol kontrolü
const oturumServisi = require('../servisler/oturumServisi');

const CEREZ_ADI = 'oturum';

function cerezOku(req, ad) {
  const baslik = req.headers.cookie || '';
  for (const parca of baslik.split(';')) {
    const [anahtar, ...deger] = parca.trim().split('=');
    if (anahtar === ad) return decodeURIComponent(deger.join('='));
  }
  return null;
}

function tokenAl(req) {
  return cerezOku(req, CEREZ_ADI);
}

// Geçerli oturum yoksa 401 döner; varsa req.oturum doldurulur
async function oturumGerekli(req, res, next) {
  try {
    const oturum = await oturumServisi.oturumGetir(tokenAl(req));
    if (!oturum) return res.status(401).json({ hata: 'Oturumunuz sona erdi. Lütfen yeniden giriş yapın.' });
    req.oturum = oturum;
    next();
  } catch (hata) {
    next(hata);
  }
}

function rolGerekli(...roller) {
  return (req, res, next) => {
    if (!roller.includes(req.oturum.rol)) return res.status(403).json({ hata: 'Bu işlem için yetkiniz yok.' });
    next();
  };
}

module.exports = { CEREZ_ADI, tokenAl, oturumGerekli, rolGerekli };
