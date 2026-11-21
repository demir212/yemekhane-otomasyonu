// Rotalar · tüm yollar /api/ ile başlar (Apache WEBAPI modu)
const express = require('express');
const { oturumGerekli, rolGerekli } = require('./ara/oturumKontrol');
const oturum = require('./kontrolculer/oturumKontrolcu');
const menu = require('./kontrolculer/menuKontrolcu');
const rezervasyon = require('./kontrolculer/rezervasyonKontrolcu');
const bakiye = require('./kontrolculer/bakiyeKontrolcu');
const degerlendirme = require('./kontrolculer/degerlendirmeKontrolcu');
const yonetim = require('./kontrolculer/yonetimKontrolcu');

// Express 4 async hataları yakalamaz: hatayı hata ara katmanına iletir
const sar = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const r = express.Router();

r.get('/', (req, res) => res.json({ durum: 'calisiyor' }));

// Oturum
r.post('/oturum/giris', sar(oturum.giris));
r.post('/oturum/cikis', sar(oturum.cikis));

// Buradan sonrası giriş gerektirir
r.use(oturumGerekli);
r.get('/ben', sar(oturum.ben));

r.get('/referanslar', sar(menu.referanslar));
r.get('/menu', sar(menu.gununMenusu));
r.get('/menu/hafta', sar(menu.haftalik));

r.get('/rezervasyonlar', sar(rezervasyon.listele));
r.post('/rezervasyonlar', sar(rezervasyon.olustur));
r.delete('/rezervasyonlar/:id', sar(rezervasyon.iptal));

r.get('/bakiye', sar(bakiye.ozet));
r.post('/bakiye/yukle', sar(bakiye.yukle));

r.get('/degerlendirmeler', sar(degerlendirme.listele));
r.post('/degerlendirmeler', sar(degerlendirme.kaydet));

// Yönetici paneli
r.use('/yonetim', rolGerekli('yonetici'));
r.get('/yonetim/menuler', sar(yonetim.menuRaporu));
r.get('/yonetim/menuler/:id', sar(yonetim.menuGetir));
r.post('/yonetim/menuler', sar(yonetim.menuOlustur));
r.put('/yonetim/menuler/:id', sar(yonetim.menuGuncelle));
r.get('/yonetim/yemekler', sar(yonetim.yemekler));

module.exports = r;
