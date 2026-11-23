#!/bin/bash
# =====================================================================
# Aşama 4 · Değişiklik talebi doğrulaması (yarım porsiyon + alerjen uyarısı)
# Depo kökünden, sistem ayaktayken çalıştırın:   bash rapor/asama4-dogrulama.sh
#   1. Migration'dan önceki durum (replika şeması, Redis'teki menü kayıtları)
#   2. db/init/04_degisiklik.sql YALNIZCA kaynağa uygulanır (zaten uygulandıysa atlanır)
#   3. Değişikliğin replikaya geçtiği SHOW CREATE TABLE ile gösterilir
#   4. Mevcut verinin bozulmadığı gösterilir
#   5. Yeni uygulama devreye alınır; açılışta Redis'teki eski biçimli menü kayıtları silinir
#   6. Yarım porsiyon ve alerjen uyarısı API üzerinden denenir
# Her komut ve çıktısı ekrana yazılır ve rapor/asama4-cikti.txt dosyasına kaydedilir.
# =====================================================================
set -u
export MSYS_NO_PATHCONV=1
export TZ='<+03>-3'   # Türkiye saati (UTC+3); Git Bash bölge adlarını tanımaz
CIKTI="rapor/asama4-cikti.txt"
: > "$CIKTI"

ADRES="http://localhost:8080"
SIFRE='Yemek2026!'
KOK=(-uroot -pyemekhane_kok --default-character-set=utf8mb4 yemekhane)

baslik() { printf '\n==================== %s ====================\n' "$*" | tee -a "$CIKTI"; }
not()    { echo "# $*" | tee -a "$CIKTI"; }
calistir() {
    echo "\$ $*" | sed 's/ -p[^ ]*/ -p***/g' | tee -a "$CIKTI"
    "$@" 2>&1 | grep -v "Using a password on the command line" | tee -a "$CIKTI"
}
kaynak() { calistir docker compose exec -T mysql-primary mysql "${KOK[@]}" -e "$1"; }
replika() { calistir docker compose exec -T mysql-replica mysql "${KOK[@]}" -e "$1"; }
sessiz_kaynak() { docker compose exec -T mysql-primary mysql "${KOK[@]}" -N -e "$1" 2>/dev/null | tr -d '\r'; }
rcli() { calistir docker compose exec -T redis redis-cli "$@"; }

giris() {
    curl -s -D - -o /dev/null -H 'Content-Type: application/json' \
        -d "{\"eposta\":\"$1\",\"sifre\":\"$SIFRE\"}" "$ADRES/api/oturum/giris" \
        | tr -d '\r' | sed -n 's/^[Ss]et-[Cc]ookie: oturum=\([a-f0-9]*\).*/\1/p'
}
# API isteği (belirteç kısaltılarak kaydedilir); yanıt $YANIT değişkenine de konur
api() {
    local token=$1; shift
    echo "\$ curl -s -H 'Cookie: oturum=${token:0:8}…' $*" | tee -a "$CIKTI"
    YANIT=$(curl -s -H "Cookie: oturum=$token" "$@" 2>&1)
    echo "$YANIT" | tee -a "$CIKTI"
}
alan() { echo "$YANIT" | grep -o "\"$1\":[^,}]*" | head -1 | cut -d: -f2- | tr -d '"'; }
bekle_healthy() {
    for i in {1..60}; do
        durum=$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q "$1")" 2>/dev/null)
        [ "$durum" = "healthy" ] && return 0
        sleep 2
    done
    echo "UYARI: $1 healthy olmadı" | tee -a "$CIKTI"
}

baslik "Tarih"
calistir date '+%Y-%m-%d %H:%M:%S %z'

# ---------------------------------------------------------------------
baslik "1. Migration'dan önce"
not "Replikada rezervasyonlar tablosu (porsiyon sütunu yok):"
replika "SHOW CREATE TABLE rezervasyonlar\G"
replika "SHOW TABLES LIKE 'kullanici_alerjenleri'"
not "Kaynaktaki veri özeti (migration sonrası aynı kalmalı):"
OZET_SQL="SELECT (SELECT COUNT(*) FROM rezervasyonlar) AS rezervasyon, (SELECT SUM(ucret) FROM rezervasyonlar) AS ucret_toplami, (SELECT SUM(bakiye) FROM kullanicilar) AS bakiye_toplami, (SELECT COUNT(*) FROM bakiye_hareketleri) AS hareket"
kaynak "$OZET_SQL"
OZET_ONCE=$(sessiz_kaynak "$OZET_SQL")
not "Redis'teki menü kayıtları (Aşama 3 biçimi: içinde \"surum\" alanı yok):"
TOKEN=$(giris mehmet.yildiz@ogr.kampus.edu.tr)
YARIN=$(date -d tomorrow +%F)
curl -s -o /dev/null -H "Cookie: oturum=$TOKEN" "$ADRES/api/menu/hafta?yemekhane_id=1&baslangic=$YARIN"
echo "\$ docker compose exec -T redis redis-cli --scan --pattern 'menu:*' | wc -l" | tee -a "$CIKTI"
docker compose exec -T redis redis-cli --scan --pattern 'menu:*' | wc -l | tee -a "$CIKTI"
ORNEK="menu:1:$YARIN:2"
echo "\$ docker compose exec -T redis redis-cli GET $ORNEK | cut -c1-120" | tee -a "$CIKTI"
docker compose exec -T redis redis-cli GET "$ORNEK" | cut -c1-120 | tee -a "$CIKTI"

# ---------------------------------------------------------------------
baslik "2. Migration yalnızca kaynağa uygulanır"
VAR=$(sessiz_kaynak "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='yemekhane' AND TABLE_NAME='rezervasyonlar' AND COLUMN_NAME='porsiyon'")
if [ "$VAR" = "0" ]; then
    echo "\$ docker compose exec -T mysql-primary mysql -uroot -p*** yemekhane < db/init/04_degisiklik.sql" | tee -a "$CIKTI"
    docker compose exec -T mysql-primary mysql "${KOK[@]}" < db/init/04_degisiklik.sql 2>&1 \
        | grep -v "Using a password on the command line" | tee -a "$CIKTI"
    not "çıkış kodu: ${PIPESTATUS[0]}"
else
    not "Migration daha önce uygulanmış (porsiyon sütunu var); yeniden uygulanmadı."
fi
sleep 2

# ---------------------------------------------------------------------
baslik "3. Değişiklik replikaya geçti (SHOW CREATE TABLE replikada)"
replika "SHOW CREATE TABLE rezervasyonlar\G"
replika "SHOW CREATE TABLE ogunler\G"
replika "SHOW CREATE TABLE kullanici_alerjenleri\G"
not "Güncellenen yordam da replikada (3 parametre):"
replika "SELECT ORDINAL_POSITION AS sira, PARAMETER_NAME, DATA_TYPE FROM information_schema.PARAMETERS WHERE SPECIFIC_SCHEMA='yemekhane' AND SPECIFIC_NAME='sp_rezervasyon_yap' AND PARAMETER_MODE IS NOT NULL ORDER BY ORDINAL_POSITION"
echo "\$ docker compose exec -T mysql-replica mysql -uroot -p*** -e \"SHOW REPLICA STATUS\\G\" | grep ..." | tee -a "$CIKTI"
docker compose exec -T mysql-replica mysql -uroot -pyemekhane_kok -e "SHOW REPLICA STATUS\G" 2>/dev/null \
    | grep -E "Replica_(IO|SQL)_Running:|Seconds_Behind_Source|Last_SQL_Error:" | tee -a "$CIKTI"

# ---------------------------------------------------------------------
baslik "4. Mevcut veri bozulmadı"
kaynak "$OZET_SQL"
OZET_SONRA=$(sessiz_kaynak "$OZET_SQL")
if [ "$OZET_ONCE" = "$OZET_SONRA" ]; then not "Önce/sonra özetleri aynı ✓"; else not "UYARI: özet değişti (önce: $OZET_ONCE / sonra: $OZET_SONRA)"; fi
not "Geçmiş rezervasyonların hepsi tam porsiyon sayılır (replikadan):"
replika "SELECT porsiyon, COUNT(*) AS adet FROM rezervasyonlar GROUP BY porsiyon"
replika "SELECT id, ad, yarim_porsiyon_orani FROM ogunler ORDER BY sira"

# ---------------------------------------------------------------------
baslik "5. Yeni uygulama devreye alınır; Redis'teki eski biçimli menü kayıtları silinir"
BAS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "\$ docker compose up -d --build uygulama" | tee -a "$CIKTI"
docker compose up -d --build uygulama 2>&1 | grep -E "Built|Recreated|uygulama-1 Started|rror" | tee -a "$CIKTI"
bekle_healthy uygulama
echo "\$ docker compose logs --since $BAS uygulama | grep 'açılış temizliği'" | tee -a "$CIKTI"
docker compose logs --no-log-prefix --since "$BAS" uygulama 2>&1 | grep 'açılış temizliği' | tee -a "$CIKTI"
echo "\$ docker compose exec -T redis redis-cli --scan --pattern 'menu:*' | wc -l" | tee -a "$CIKTI"
docker compose exec -T redis redis-cli --scan --pattern 'menu:*' | wc -l | tee -a "$CIKTI"
TOKEN=$(giris mehmet.yildiz@ogr.kampus.edu.tr)
curl -s -o /dev/null -H "Cookie: oturum=$TOKEN" "$ADRES/api/menu?yemekhane_id=1&tarih=$YARIN&ogun_id=2"
not "İlk istekten sonra yeni biçimli kayıt (surum: 2, yarim_porsiyon_orani var):"
echo "\$ docker compose exec -T redis redis-cli GET $ORNEK | cut -c1-200" | tee -a "$CIKTI"
docker compose exec -T redis redis-cli GET "$ORNEK" | cut -c1-200 | tee -a "$CIKTI"
echo "\$ docker compose exec -T redis redis-cli GET $ORNEK | grep -o '\"yarim_porsiyon_orani\":[0-9.null]*'" | tee -a "$CIKTI"
docker compose exec -T redis redis-cli GET "$ORNEK" | grep -o '"yarim_porsiyon_orani":[0-9.nul]*' | tee -a "$CIKTI"

# ---------------------------------------------------------------------
baslik "6. Yarım porsiyon"
YTOKEN=$(giris leyla.arslan@kampus.edu.tr)
TEST_TARIH=$(date -d '+20 days' +%F)
not "Test için yönetici $TEST_TARIH tarihine Mühendislik yemekhanesinde kahvaltı ve öğle menüsü açar"
YEMEKLER=$(curl -s -H "Cookie: oturum=$YTOKEN" "$ADRES/api/yonetim/yemekler" | grep -o '"id":[0-9]*' | head -5 | cut -d: -f2 | paste -sd,)
for OGUN in 1 2; do
    curl -s -o /dev/null -X POST -H "Cookie: oturum=$YTOKEN" -H 'Content-Type: application/json' \
        -d "{\"yemekhane_id\":2,\"tarih\":\"$TEST_TARIH\",\"ogun_id\":$OGUN,\"ogrenci_fiyati\":40,\"personel_fiyati\":80,\"yemek_idler\":[$YEMEKLER]}" \
        "$ADRES/api/yonetim/menuler"
done
echo "\$ curl -s -H 'Cookie: oturum=${TOKEN:0:8}…' '$ADRES/api/menu?yemekhane_id=2&tarih=$TEST_TARIH&ogun_id=2'   (ve ogun_id=1)" | tee -a "$CIKTI"
YANIT=$(curl -s -H "Cookie: oturum=$TOKEN" "$ADRES/api/menu?yemekhane_id=2&tarih=$TEST_TARIH&ogun_id=2")
OGLE=$(alan menu_id)
not "Öğle menüsü $OGLE · öğrenci fiyatı: $(alan fiyat) TL, yarım porsiyon: $(alan yarim_fiyat) TL (oran $(alan yarim_porsiyon_orani))"
YANIT=$(curl -s -H "Cookie: oturum=$TOKEN" "$ADRES/api/menu?yemekhane_id=2&tarih=$TEST_TARIH&ogun_id=1")
KAHVALTI=$(alan menu_id)
not "Kahvaltı menüsü $KAHVALTI · yarım porsiyon fiyatı: $(alan yarim_fiyat) (kahvaltıda yarım porsiyon yok)"

not "Kahvaltıya yarım porsiyon → yordam reddeder:"
api "$TOKEN" -X POST -H 'Content-Type: application/json' -d "{\"menu_id\":$KAHVALTI,\"porsiyon\":\"yarim\"}" "$ADRES/api/rezervasyonlar"
not "Geçersiz porsiyon değeri → reddedilir:"
api "$TOKEN" -X POST -H 'Content-Type: application/json' -d "{\"menu_id\":$OGLE,\"porsiyon\":\"cift\"}" "$ADRES/api/rezervasyonlar"
not "Öğleye yarım porsiyon → ücret tam fiyatın %60'ı:"
api "$TOKEN" -X POST -H 'Content-Type: application/json' -d "{\"menu_id\":$OGLE,\"porsiyon\":\"yarim\"}" "$ADRES/api/rezervasyonlar"
REZ1=$(alan rezervasyon_id)
not "Porsiyon gönderilmezse tam porsiyon (kahvaltı):"
api "$TOKEN" -X POST -H 'Content-Type: application/json' -d "{\"menu_id\":$KAHVALTI}" "$ADRES/api/rezervasyonlar"
REZ2=$(alan rezervasyon_id)
not "Kaynakta kayıtlar ve bakiye hareketi açıklaması:"
kaynak "SELECT r.id, r.menu_id, r.porsiyon, r.ucret, h.tutar, h.aciklama FROM rezervasyonlar r JOIN bakiye_hareketleri h ON h.rezervasyon_id = r.id AND h.tur = 'rezervasyon' WHERE r.id IN ($REZ1, $REZ2) ORDER BY h.id DESC LIMIT 2"
not "İptalde iade, ödenen gerçek ücrettir:"
api "$TOKEN" -X DELETE "$ADRES/api/rezervasyonlar/$REZ1"
curl -s -o /dev/null -X DELETE -H "Cookie: oturum=$TOKEN" "$ADRES/api/rezervasyonlar/$REZ2"

# ---------------------------------------------------------------------
baslik "7. Alerjen uyarısı (profilde seçilen alerjenler menüde uyarılır)"
YANIT=$(curl -s -H "Cookie: oturum=$TOKEN" "$ADRES/api/menu?yemekhane_id=2&tarih=$TEST_TARIH&ogun_id=2")
ALERJEN=$(echo "$YANIT" | grep -o '"alerjenler":\["[^"]*"' | head -1 | sed 's/.*\["//; s/"$//')
LISTE=$(curl -s -H "Cookie: oturum=$TOKEN" "$ADRES/api/profil/alerjenler")
ALERJEN_ID=$(echo "$LISTE" | grep -o "\"id\":[0-9]*,\"ad\":\"$ALERJEN\"" | grep -o '[0-9]*' | head -1)
not "Menüdeki bir alerjen: $ALERJEN (id $ALERJEN_ID). Profilde seçilmeden önce uyarı yok:"
echo "\$ curl -s -H 'Cookie: oturum=${TOKEN:0:8}…' '$ADRES/api/menu?yemekhane_id=2&tarih=$TEST_TARIH&ogun_id=2' | grep -o '\"alerjen_uyarisi\":...'" | tee -a "$CIKTI"
echo "$YANIT" | grep -o '"alerjen_uyarisi":\[[^]]*\]' | head -1 | tee -a "$CIKTI"
not "Profilde $ALERJEN seçilir:"
api "$TOKEN" -X PUT -H 'Content-Type: application/json' -d "{\"alerjen_idler\":[$ALERJEN_ID]}" "$ADRES/api/profil/alerjenler"
kaynak "SELECT ka.kullanici_id, a.ad FROM kullanici_alerjenleri ka JOIN alerjenler a ON a.id = ka.alerjen_id WHERE ka.kullanici_id = 7"
not "Aynı menü artık uyarıyla gelir (menü uyarısı + yemek bazında uyari_alerjenler):"
YANIT=$(curl -s -H "Cookie: oturum=$TOKEN" "$ADRES/api/menu?yemekhane_id=2&tarih=$TEST_TARIH&ogun_id=2")
echo "\$ curl -s -H 'Cookie: oturum=${TOKEN:0:8}…' '$ADRES/api/menu?yemekhane_id=2&tarih=$TEST_TARIH&ogun_id=2' | grep -o ..." | tee -a "$CIKTI"
echo "$YANIT" | grep -o '"alerjen_uyarisi":\[[^]]*\]' | tee -a "$CIKTI"
echo "$YANIT" | grep -o '"ad":"[^"]*","kalori":[0-9]*,"vejetaryen":[a-z]*,"alerjenler":\[[^]]*\],"alerjen_idler":\[[^]]*\],"uyari_alerjenler":\["[^]]*\]' | tee -a "$CIKTI"
not "Geçersiz alerjen → reddedilir:"
api "$TOKEN" -X PUT -H 'Content-Type: application/json' -d '{"alerjen_idler":[250]}' "$ADRES/api/profil/alerjenler"
not "Başka bir kullanıcının (Ayşe) aynı menüsünde uyarı yok — uyarı kişiye özeldir:"
ATOKEN=$(giris ayse.demir@ogr.kampus.edu.tr)
curl -s -H "Cookie: oturum=$ATOKEN" "$ADRES/api/menu?yemekhane_id=2&tarih=$TEST_TARIH&ogun_id=2" | grep -o '"alerjen_uyarisi":\[[^]]*\]' | tee -a "$CIKTI"
# Test durumu temizlenir: alerjen seçimi kaldırılır, oturumlar kapatılır
curl -s -o /dev/null -X PUT -H "Cookie: oturum=$TOKEN" -H 'Content-Type: application/json' -d '{"alerjen_idler":[]}' "$ADRES/api/profil/alerjenler"
for t in "$TOKEN" "$YTOKEN" "$ATOKEN"; do curl -s -o /dev/null -X POST -H "Cookie: oturum=$t" "$ADRES/api/oturum/cikis"; done

echo
echo "Bitti. Çıktı: $CIKTI"
