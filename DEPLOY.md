# Deploy KPPS Pilkalurah di STB

Branch ini berisi **hasil build siap saji** (`public/`) + konfigurasi serving. Jangan diedit manual;
isinya di-generate oleh `scripts/publish-dist.sh` dari branch sumber.

## Pertama kali
```bash
git clone --branch claude/web-dist --single-branch https://github.com/sidrive/kpps-pilkalurah.git /opt/kpps
cd /opt/kpps
```

### Opsi A — pm2 (Node 18+, tanpa npm install)
```bash
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup     # jalan otomatis saat STB reboot
```

### Opsi B — Docker
```bash
docker compose up -d
```
Keduanya listen di `127.0.0.1:8080` (hanya lokal; Cloudflare yang membuka ke publik).

## Cloudflare Tunnel
Arahkan public hostname ke `http://localhost:8080`. Contoh `/etc/cloudflared/config.yml`:
```yaml
ingress:
  - hostname: kpps.domainanda.com
    service: http://localhost:8080
  - service: http_status:404
```
**Wajib:** tambahkan hostname itu di Firebase Console → Authentication → Settings → Authorized domains,
kalau tidak login Google petugas gagal.

## Update (tiap ada build baru)
```bash
cd /opt/kpps && git pull
# pm2 & docker tidak perlu restart: file statis dibaca langsung dari disk
```
Cek versi yang sedang jalan: `curl https://kpps.domainanda.com/version.txt`.
Service worker (PWA) akan update otomatis di device saat app dibuka kembali.

## Rollback
```bash
git log --oneline -5 && git checkout <commit-sebelumnya>   # kembali: git checkout claude/web-dist
```
