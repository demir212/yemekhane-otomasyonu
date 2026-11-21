// İş katmanı · giriş, çıkış, oturum
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { UygulamaHatasi } = require('../hatalar');
const { okuma } = require('../veri/baglanti');
const kullaniciVeri = require('../veri/kullaniciVeri');
const oturumDeposu = require('./oturumDeposu');
const tutarlilik = require('./tutarlilik');

async function girisYap(eposta, sifre) {
  if (typeof eposta !== 'string' || typeof sifre !== 'string' || !eposta.trim() || !sifre) {
    throw new UygulamaHatasi('E-posta ve şifre gereklidir.');
  }
  const kullanici = await kullaniciVeri.epostaIleBul(okuma, eposta.trim().toLowerCase());
  const sifreDogru = kullanici && (await bcrypt.compare(sifre, kullanici.sifre_hash));
  if (!sifreDogru) throw new UygulamaHatasi('E-posta veya şifre hatalı.', 401);
  if (!kullanici.aktif) throw new UygulamaHatasi('Hesabınız pasif durumda.', 403);

  const token = crypto.randomBytes(32).toString('hex');
  const oturum = { kullanici_id: kullanici.id, rol: kullanici.rol, ad: kullanici.ad, soyad: kullanici.soyad };
  await oturumDeposu.kaydet(token, oturum);
  return { token, oturum };
}

function cikisYap(token) {
  return oturumDeposu.sil(token);
}

function oturumGetir(token) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return oturumDeposu.getir(token);
}

async function profil(oturum) {
  const db = await tutarlilik.okumaHavuzu(oturum.kullanici_id);
  const kullanici = await kullaniciVeri.idIleBul(db, oturum.kullanici_id);
  if (!kullanici) throw new UygulamaHatasi('Kullanıcı bulunamadı.', 404);
  return kullanici;
}

module.exports = { girisYap, cikisYap, oturumGetir, profil };
