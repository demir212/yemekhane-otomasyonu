#!/bin/bash
# =====================================================================
# Aşama 1 · Altyapı doğrulaması
# Depo kökünden çalıştırın:   bash rapor/asama1-dogrulama.sh
# Her komut ve çıktısı ekrana yazılır ve rapor/asama1-cikti.txt dosyasına kaydedilir.
# (Windows'ta Git Bash ile çalıştırın.)
# =====================================================================
set -u
CIKTI="rapor/asama1-cikti.txt"
: > "$CIKTI"

PRIMARY=(docker compose exec -T mysql-primary mysql -uyemekhane_app -pUyg_2026 --default-character-set=utf8mb4 yemekhane)
REPLICA=(docker compose exec -T mysql-replica mysql -uyemekhane_app -pUyg_2026 --default-character-set=utf8mb4 yemekhane)
KULLANICI=7   # Mehmet Yıldız (öğrenci)

baslik() { printf '\n==================== %s ====================\n' "$*" | tee -a "$CIKTI"; }
calistir() {
    # Komutu (parolasız haliyle) ve çıktısını kaydet
    echo "\$ $*" | sed 's/-p[^ ]*/-p***/g' | tee -a "$CIKTI"
    "$@" 2>&1 | grep -v "Using a password on the command line" | tee -a "$CIKTI"
}
bekle_healthy() {
    for i in {1..60}; do
        durum=$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q "$1")" 2>/dev/null)
        [ "$durum" = "healthy" ] && return 0
        sleep 2
    done
    echo "UYARI: $1 healthy olmadı" | tee -a "$CIKTI"
}

baslik "Tarih"
calistir date

baslik "1. Servis durumları (tümü healthy, replica-setup Exited (0))"
calistir docker compose ps -a
calistir docker compose logs replica-setup

baslik "2. Replikasyon durumu (IO ve SQL Running = Yes)"
echo "\$ docker compose exec mysql-replica mysql -uroot -p*** -e \"SHOW REPLICA STATUS\\G\" | grep ..." | tee -a "$CIKTI"
docker compose exec -T mysql-replica mysql -uroot -pyemekhane_kok -e "SHOW REPLICA STATUS\G" 2>/dev/null \
  | grep -E "Source_Host|Replica_IO_Running|Replica_SQL_Running:|Seconds_Behind_Source|Last_.*Error:|Auto_Position|Executed_Gtid_Set" \
  | tee -a "$CIKTI"
calistir docker compose exec -T mysql-replica mysql -uroot -pyemekhane_kok -e "SELECT @@read_only, @@super_read_only"

baslik "3. Kaynakta bakiye yükleme -> replikada görünüyor"
calistir "${REPLICA[@]}" -e "SELECT id, ad, bakiye FROM kullanicilar WHERE id = $KULLANICI"
calistir "${PRIMARY[@]}" -e "CALL sp_bakiye_yukle($KULLANICI, 100)"
sleep 1
calistir "${REPLICA[@]}" -e "SELECT id, ad, bakiye FROM kullanicilar WHERE id = $KULLANICI"
calistir "${REPLICA[@]}" -e "SELECT id, tur, tutar, olusturma FROM bakiye_hareketleri WHERE kullanici_id = $KULLANICI ORDER BY id DESC LIMIT 1"

baslik "4. Replikaya yazma denemesi -> ERROR 1290 (read-only) beklenir"
calistir "${REPLICA[@]}" -e "CALL sp_bakiye_yukle($KULLANICI, 50)"
calistir "${REPLICA[@]}" -e "UPDATE kullanicilar SET bakiye = 0 WHERE id = $KULLANICI"

baslik "5. Replika durdurulur, arada kaynağa yazılır, replika yeniden başlar ve yakalar"
calistir docker compose stop mysql-replica
calistir "${PRIMARY[@]}" -e "CALL sp_bakiye_yukle($KULLANICI, 200)"
calistir "${PRIMARY[@]}" -e "SELECT id, bakiye FROM kullanicilar WHERE id = $KULLANICI"
calistir docker compose start mysql-replica
bekle_healthy mysql-replica
sleep 3
calistir "${REPLICA[@]}" -e "SELECT id, bakiye FROM kullanicilar WHERE id = $KULLANICI"
echo "\$ ... SHOW REPLICA STATUS\\G | grep Running" | tee -a "$CIKTI"
docker compose exec -T mysql-replica mysql -uroot -pyemekhane_kok -e "SHOW REPLICA STATUS\G" 2>/dev/null \
  | grep -E "Replica_IO_Running|Replica_SQL_Running:|Seconds_Behind_Source" | tee -a "$CIKTI"

baslik "6. Kural kontrolü: bakiye = SUM(hareketler) (kaynak ve replika aynı)"
SORGU="SELECT k.id, k.bakiye, SUM(h.tutar) AS hareket_toplami FROM kullanicilar k JOIN bakiye_hareketleri h ON h.kullanici_id = k.id WHERE k.id = $KULLANICI GROUP BY k.id"
calistir "${PRIMARY[@]}" -e "$SORGU"
calistir "${REPLICA[@]}" -e "$SORGU"

baslik "7. Redis"
calistir docker compose exec -T redis redis-cli ping

baslik "8. Apache"
calistir curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8080/

echo
echo "Bitti. Çıktı: $CIKTI"
