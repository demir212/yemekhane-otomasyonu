// =====================================================================
// Yemekhane · tüm sayfaların ortak kodu
// Arayüz yalnızca /api/ adreslerine fetch ile istek atar; iş kuralı içermez.
// =====================================================================
'use strict';

const Y = (() => {
  const ROL_ADI = { ogrenci: 'Öğrenci', personel: 'Personel', yonetici: 'Yönetici' };
  const DURUM_ADI = { aktif: 'Aktif', kullanildi: 'Kullanıldı', iptal: 'İptal' };
  let ben = null;

  // JSON API isteği. Hata durumunda sunucunun Türkçe mesajıyla Error fırlatır.
  async function istek(yol, { yontem = 'GET', govde } = {}) {
    const secenek = { method: yontem, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
    if (govde !== undefined) {
      secenek.headers['Content-Type'] = 'application/json';
      secenek.body = JSON.stringify(govde);
    }
    let yanit;
    try {
      yanit = await fetch(yol, secenek);
    } catch {
      throw new Error('Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.');
    }
    const girisSayfasi = location.pathname === '/' || location.pathname === '/index.html';
    if (yanit.status === 401 && !girisSayfasi) {
      location.href = '/';
      throw new Error('Oturum gerekli.');
    }
    const tur = yanit.headers.get('content-type') || '';
    const veri = tur.includes('application/json') ? await yanit.json() : null;
    if (!yanit.ok) {
      if (veri && veri.hata) throw new Error(veri.hata);
      throw new Error(yanit.status >= 502 ? 'Uygulama servisine ulaşılamıyor.' : 'İstek başarısız oldu.');
    }
    return veri;
  }

  // HTML'e yazılacak her metin buradan geçer (XSS'e karşı)
  function esc(deger) {
    return String(deger ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const para = (n) => Number(n).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

  function tarihYaz(t, secenek = { day: 'numeric', month: 'long', weekday: 'long' }) {
    const [y, a, g] = String(t).slice(0, 10).split('-').map(Number);
    return new Date(y, a - 1, g).toLocaleDateString('tr-TR', secenek);
  }
  const kisaTarih = (t) => tarihYaz(t, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const saat = (zaman) => String(zaman).slice(11, 16);

  // İstanbul saatine göre bugün (YYYY-AA-GG)
  const bugun = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());

  function gunEkle(t, n) {
    const d = new Date(`${t}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function bildir(kutu, mesaj, tur = 'hata') {
    kutu.textContent = mesaj;
    kutu.className = `bildirim bildirim-${tur}`;
    kutu.setAttribute('role', tur === 'hata' ? 'alert' : 'status');
    kutu.hidden = false;
  }
  function bildirimGizle(kutu) {
    kutu.hidden = true;
  }

  function bakiyeGoster(bakiye) {
    if (ben) ben.bakiye = bakiye;
    const alan = document.getElementById('ust-bakiye');
    if (alan) alan.textContent = para(bakiye);
  }

  function ustKisimCiz(aktifSayfa) {
    const baglantilar = [
      ['/menu.html', 'Günün menüsü'],
      ['/hafta.html', 'Haftalık menü'],
      ['/rezervasyonlarim.html', 'Rezervasyonlarım'],
      ['/bakiye.html', 'Bakiye'],
      ['/degerlendirme.html', 'Değerlendirme'],
    ];
    if (ben.rol === 'yonetici') baglantilar.push(['/yonetim.html', 'Yönetim']);

    const ust = document.getElementById('ust');
    ust.className = 'ust';
    ust.innerHTML = `
      <div class="kapsayici ust-ic">
        <a class="marka" href="/menu.html">Yemekhane</a>
        <div class="kullanici-bilgi">
          <span>${esc(ben.ad)} ${esc(ben.soyad)} · ${esc(ROL_ADI[ben.rol])}</span>
          <strong id="ust-bakiye">${para(ben.bakiye)}</strong>
          <button type="button" class="cikis" id="cikis">Çıkış</button>
        </div>
        <nav class="gezinme" aria-label="Ana menü">
          ${baglantilar
            .map(([yol, ad]) => `<a href="${yol}"${yol === aktifSayfa ? ' aria-current="page"' : ''}>${ad}</a>`)
            .join('')}
        </nav>
      </div>`;
    // Telefonda menü yana kaydığı için aktif sekmeyi görünür alana getir
    const aktif = ust.querySelector('[aria-current="page"]');
    const gezinme = ust.querySelector('.gezinme');
    if (aktif) gezinme.scrollLeft = aktif.offsetLeft - (gezinme.clientWidth - aktif.offsetWidth) / 2;

    document.getElementById('cikis').addEventListener('click', async () => {
      try { await istek('/api/oturum/cikis', { yontem: 'POST' }); } finally { location.href = '/'; }
    });
  }

  // Her korumalı sayfanın başında çağrılır: oturum yoksa giriş sayfasına döner
  async function sayfaBaslat(aktifSayfa, { rol } = {}) {
    ben = await istek('/api/ben');
    if (rol && ben.rol !== rol) {
      location.href = '/menu.html';
      throw new Error('Yetkisiz sayfa');
    }
    ustKisimCiz(aktifSayfa);
    return ben;
  }

  // Yemekhane ve öğün seçim kutularını doldurur
  async function referanslariDoldur(yemekhaneSecim, ogunSecim) {
    const ref = await istek('/api/referanslar');
    if (yemekhaneSecim) {
      yemekhaneSecim.innerHTML = ref.yemekhaneler.map((y) => `<option value="${y.id}">${esc(y.ad)}</option>`).join('');
    }
    if (ogunSecim) {
      ogunSecim.innerHTML = ref.ogunler
        .map((o) => `<option value="${o.id}">${esc(o.ad)} (son: ${esc(o.son_saat)})</option>`)
        .join('');
    }
    return ref;
  }

  // Menü kartlarındaki rezervasyon düğmesi: durumuna göre etkin ya da pasif
  function rezervasyonDugmesi(menu) {
    const r = menu.rezervasyon;
    if (r && r.durum === 'aktif') return '<span class="etiket etiket-aktif">Rezervasyonunuz var</span>';
    if (r && r.durum === 'kullanildi') return '<span class="etiket etiket-kullanildi">Kullanıldı</span>';
    if (menu.suresi_doldu) return '<button class="dugme" disabled>Rezervasyon süresi doldu</button>';
    if (menu.bos_yer <= 0) return '<button class="dugme" disabled>Kapasite dolu</button>';
    return `<button class="dugme" data-rezervasyon="${menu.menu_id}">Rezervasyon yap · ${para(menu.fiyat)}</button>`;
  }

  async function rezervasyonYap(menuId) {
    const sonuc = await istek('/api/rezervasyonlar', { yontem: 'POST', govde: { menu_id: Number(menuId) } });
    bakiyeGoster(sonuc.bakiye);
    return sonuc;
  }

  return {
    ROL_ADI, DURUM_ADI, istek, esc, para, tarihYaz, kisaTarih, saat, bugun, gunEkle,
    bildir, bildirimGizle, bakiyeGoster, sayfaBaslat, referanslariDoldur,
    rezervasyonDugmesi, rezervasyonYap,
    get ben() { return ben; },
  };
})();
