'use strict';
(async () => {
  const form = document.getElementById('secim');
  const alan = document.getElementById('hafta');
  const kutu = document.getElementById('bildirim');

  function ogunKarti(m) {
    return `<article class="ogun-kart">
      <h3><span>${Y.esc(m.ogun)}</span><span class="fiyat" style="font-size:1rem">${Y.para(m.fiyat)}</span></h3>
      <p>${m.yemekler.map(Y.esc).join(', ')}</p>
      <p class="soluk">${m.toplam_kalori ?? '–'} kcal · Boş yer: <strong>${m.bos_yer}</strong> / ${m.kapasite}
        · Son: ${Y.saat(m.rezervasyon_son)}</p>
      ${Y.rezervasyonDugmesi(m)}
    </article>`;
  }

  function haftaCiz(veri) {
    const bugun = Y.bugun();
    alan.innerHTML = veri.gunler.map((g) => `
      <section class="panel gun${g.tarih === bugun ? ' bugun' : ''}">
        <h2>${Y.tarihYaz(g.tarih)}${g.tarih === bugun ? ' · Bugün' : ''}</h2>
        ${g.menuler.length ? g.menuler.map(ogunKarti).join('') : '<p class="soluk">Bu gün için menü yok.</p>'}
      </section>`).join('');
  }

  async function yukle() {
    const parametre = new URLSearchParams({ yemekhane_id: form.yemekhane.value, baslangic: form.baslangic.value });
    try {
      haftaCiz(await Y.istek(`/api/menu/hafta?${parametre}`));
    } catch (hata) {
      Y.bildir(kutu, hata.message);
    }
  }

  alan.addEventListener('click', async (olay) => {
    const dugme = olay.target.closest('[data-rezervasyon]');
    if (!dugme) return;
    Y.bildirimGizle(kutu);
    dugme.disabled = true;
    try {
      const sonuc = await Y.rezervasyonYap(dugme.dataset.rezervasyon);
      await yukle();
      Y.bildir(kutu, `Rezervasyon yapıldı. Ücret: ${Y.para(sonuc.ucret)}, yeni bakiye: ${Y.para(sonuc.bakiye)}`, 'basari');
    } catch (hata) {
      Y.bildir(kutu, hata.message);
      dugme.disabled = false;
    }
    kutu.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function kaydir(gun) {
    form.baslangic.value = Y.gunEkle(form.baslangic.value, gun);
    Y.bildirimGizle(kutu);
    yukle();
  }

  await Y.sayfaBaslat('/hafta.html');
  await Y.referanslariDoldur(form.yemekhane);
  form.baslangic.value = Y.bugun();
  form.addEventListener('change', () => { Y.bildirimGizle(kutu); yukle(); });
  document.getElementById('onceki').addEventListener('click', () => kaydir(-7));
  document.getElementById('sonraki').addEventListener('click', () => kaydir(7));
  yukle();
})();
