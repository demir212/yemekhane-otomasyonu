'use strict';
(async () => {
  const form = document.getElementById('secim');
  const alan = document.getElementById('menu');
  const kutu = document.getElementById('bildirim');

  function yemekSatiri(y) {
    const etiketler = [];
    if (y.vejetaryen) etiketler.push('<span class="etiket etiket-veg">Vejetaryen</span>');
    y.alerjenler.forEach((a) => etiketler.push(`<span class="etiket">${Y.esc(a)}</span>`));
    return `<li>
      <span class="yemek-ad">${Y.esc(y.ad)}</span>
      <span class="soluk">${y.kalori} kcal</span>
      ${etiketler.join(' ')}
    </li>`;
  }

  function menuCiz(m) {
    alan.innerHTML = `
      <div class="menu-ust">
        <div>
          <h2>${Y.esc(m.yemekhane)} · ${Y.esc(m.ogun)}</h2>
          <p class="soluk">${Y.tarihYaz(m.tarih)}</p>
        </div>
        <span class="fiyat">${Y.para(m.fiyat)}</span>
      </div>
      ${m.kategoriler.map((k) => `
        <div class="kategori">
          <h3>${Y.esc(k.kategori)}</h3>
          <ul class="yemek-liste">${k.yemekler.map(yemekSatiri).join('')}</ul>
        </div>`).join('')}
      <div class="ozet-satir">
        <span><strong>Toplam:</strong> ${m.toplam_kalori} kcal</span>
        ${m.tamami_vejetaryen ? '<span class="etiket etiket-veg">Tamamı vejetaryen</span>' : ''}
        <span><strong>Boş yer:</strong> ${m.doluluk.bos_yer} / ${m.doluluk.kapasite}</span>
        <span><strong>Son rezervasyon:</strong> ${Y.kisaTarih(m.rezervasyon_son)} ${Y.saat(m.rezervasyon_son)}</span>
      </div>
      <div style="margin-top:1rem">${Y.rezervasyonDugmesi({ ...m, ...m.doluluk, suresi_doldu: Boolean(m.doluluk.suresi_doldu) })}</div>`;
  }

  async function yukle() {
    Y.bildirimGizle(kutu);
    alan.innerHTML = '<p class="soluk">Yükleniyor…</p>';
    const parametre = new URLSearchParams({
      yemekhane_id: form.yemekhane.value,
      tarih: form.tarih.value,
      ogun_id: form.ogun.value,
    });
    try {
      menuCiz(await Y.istek(`/api/menu?${parametre}`));
    } catch (hata) {
      alan.innerHTML = `<p class="soluk">${Y.esc(hata.message)}</p>`;
    }
  }

  alan.addEventListener('click', async (olay) => {
    const dugme = olay.target.closest('[data-rezervasyon]');
    if (!dugme) return;
    dugme.disabled = true;
    try {
      const sonuc = await Y.rezervasyonYap(dugme.dataset.rezervasyon);
      await yukle();
      Y.bildir(kutu, `Rezervasyon yapıldı. Ücret: ${Y.para(sonuc.ucret)}, yeni bakiye: ${Y.para(sonuc.bakiye)}`, 'basari');
    } catch (hata) {
      Y.bildir(kutu, hata.message);
      dugme.disabled = false;
    }
  });

  await Y.sayfaBaslat('/menu.html');
  await Y.referanslariDoldur(form.yemekhane, form.ogun);
  form.tarih.value = Y.bugun();
  form.ogun.value = '2'; // varsayılan: öğle
  form.addEventListener('change', yukle);
  yukle();
})();
