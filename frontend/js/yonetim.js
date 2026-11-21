'use strict';
(async () => {
  const kutu = document.getElementById('bildirim');
  const filtre = document.getElementById('rapor-filtre');
  const rapor = document.getElementById('rapor');
  const formAlani = document.getElementById('menu-formu-alani');
  const form = document.getElementById('menu-formu');
  const yemekSecim = document.getElementById('yemek-secim');
  let yemekler = [];
  let duzenlenenId = null; // null: yeni menü

  // ---------- Rapor ----------
  function raporSatiri(m) {
    const yuzde = Number(m.doluluk_yuzde);
    const puan = m.ortalama_puan === null ? '–' : `${m.ortalama_puan} <span class="soluk">(${m.oy_sayisi})</span>`;
    return `<tr>
      <td data-baslik="Tarih">${Y.kisaTarih(m.tarih)}</td>
      <td data-baslik="Yemekhane">${Y.esc(m.yemekhane)}</td>
      <td data-baslik="Öğün">${Y.esc(m.ogun)}</td>
      <td data-baslik="Fiyat" class="sayi">${Y.para(m.ogrenci_fiyati)} / ${Y.para(m.personel_fiyati)}</td>
      <td data-baslik="Rezerve" class="sayi">${m.rezerve} / ${m.kapasite}</td>
      <td data-baslik="Doluluk">
        <div class="cubuk${yuzde >= 90 ? ' yuksek' : ''}" title="%${yuzde}"><span style="width:${Math.min(yuzde, 100)}%"></span></div>
        <span class="soluk">%${yuzde}</span>
      </td>
      <td data-baslik="Puan" class="sayi">${puan}</td>
      <td data-baslik=""><button class="dugme dugme-kucuk dugme-ikincil" data-duzenle="${m.menu_id}">Düzenle</button></td>
    </tr>`;
  }

  async function raporYukle() {
    const parametre = new URLSearchParams({ baslangic: filtre.baslangic.value, bitis: filtre.bitis.value });
    try {
      const menuler = await Y.istek(`/api/yonetim/menuler?${parametre}`);
      rapor.innerHTML = menuler.length
        ? menuler.map(raporSatiri).join('')
        : '<tr><td colspan="8" class="soluk">Bu aralıkta menü yok.</td></tr>';
    } catch (hata) {
      Y.bildir(kutu, hata.message);
    }
  }

  // ---------- Menü formu ----------
  function yemekSecimCiz() {
    const gruplar = new Map();
    yemekler.forEach((y) => {
      if (!gruplar.has(y.kategori)) gruplar.set(y.kategori, []);
      gruplar.get(y.kategori).push(y);
    });
    yemekSecim.innerHTML = [...gruplar].map(([kategori, liste]) => `
      <fieldset>
        <legend>${Y.esc(kategori)}</legend>
        ${liste.map((y) => `
          <label class="secim">
            <input type="checkbox" name="yemek" value="${y.id}" data-kalori="${y.kalori}">
            ${Y.esc(y.ad)} <span class="soluk">${y.kalori} kcal${y.vejetaryen ? ' · V' : ''}</span>
          </label>`).join('')}
      </fieldset>`).join('');
  }

  function seciliOzet() {
    const secili = [...form.querySelectorAll('input[name=yemek]:checked')];
    document.getElementById('secili-sayi').textContent = secili.length;
    document.getElementById('secili-kalori').textContent = secili.reduce((t, k) => t + Number(k.dataset.kalori), 0);
  }

  function formAc(baslik, menu) {
    Y.bildirimGizle(kutu);
    duzenlenenId = menu ? menu.id : null;
    document.getElementById('form-baslik').textContent = baslik;
    form.reset();
    form.yemekhane_id.disabled = form.tarih.disabled = form.ogun_id.disabled = Boolean(menu);
    if (menu) {
      form.yemekhane_id.value = menu.yemekhane_id;
      form.tarih.value = menu.tarih;
      form.ogun_id.value = menu.ogun_id;
      form.ogrenci_fiyati.value = menu.ogrenci_fiyati;
      form.personel_fiyati.value = menu.personel_fiyati;
      form.querySelectorAll('input[name=yemek]').forEach((k) => { k.checked = menu.yemek_idler.includes(Number(k.value)); });
    } else {
      form.tarih.value = Y.gunEkle(Y.bugun(), 1);
    }
    seciliOzet();
    formAlani.hidden = false;
    formAlani.scrollIntoView({ behavior: 'smooth' });
  }

  form.addEventListener('change', (olay) => { if (olay.target.name === 'yemek') seciliOzet(); });

  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    Y.bildirimGizle(kutu);
    const govde = {
      yemekhane_id: Number(form.yemekhane_id.value),
      tarih: form.tarih.value,
      ogun_id: Number(form.ogun_id.value),
      ogrenci_fiyati: form.ogrenci_fiyati.value,
      personel_fiyati: form.personel_fiyati.value,
      yemek_idler: [...form.querySelectorAll('input[name=yemek]:checked')].map((k) => Number(k.value)),
    };
    try {
      if (duzenlenenId) {
        await Y.istek(`/api/yonetim/menuler/${duzenlenenId}`, { yontem: 'PUT', govde });
      } else {
        await Y.istek('/api/yonetim/menuler', { yontem: 'POST', govde });
      }
      formAlani.hidden = true;
      await raporYukle();
      Y.bildir(kutu, duzenlenenId ? 'Menü güncellendi.' : 'Menü oluşturuldu.', 'basari');
    } catch (hata) {
      Y.bildir(kutu, hata.message);
    }
    kutu.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('vazgec').addEventListener('click', () => { formAlani.hidden = true; });
  document.getElementById('yeni-menu').addEventListener('click', () => formAc('Yeni menü', null));

  rapor.addEventListener('click', async (olay) => {
    const dugme = olay.target.closest('[data-duzenle]');
    if (!dugme) return;
    try {
      const menu = await Y.istek(`/api/yonetim/menuler/${dugme.dataset.duzenle}`);
      formAc(`Menü düzenle · ${Y.kisaTarih(menu.tarih)}`, menu);
    } catch (hata) {
      Y.bildir(kutu, hata.message);
    }
  });

  // ---------- Başlangıç ----------
  await Y.sayfaBaslat('/yonetim.html', { rol: 'yonetici' });
  await Y.referanslariDoldur(form.yemekhane_id, form.ogun_id);
  yemekler = await Y.istek('/api/yonetim/yemekler');
  yemekSecimCiz();
  filtre.baslangic.value = Y.gunEkle(Y.bugun(), -1);
  filtre.bitis.value = Y.gunEkle(Y.bugun(), 6);
  filtre.addEventListener('change', raporYukle);
  raporYukle();
})();
