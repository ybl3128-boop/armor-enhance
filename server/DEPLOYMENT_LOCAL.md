# 로컬 및 VPS 배포 가이드

## 1. Docker Compose로 로컬 테스트

### 설치 요구사항
- Docker
- Docker Compose

### 실행

```bash
docker-compose up --build
```

시작되면:
- 백엔드: http://localhost:3001
- 데이터베이스: localhost:5432
- Health check: http://localhost:3001/health

### 종료

```bash
docker-compose down
```

데이터 삭제:
```bash
docker-compose down -v
```

---

## 2. VPS 직접 배포 (Ubuntu 20.04+)

### 서버 준비

```bash
# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 설치
sudo apt-get install -y postgresql postgresql-contrib

# Git 설치
sudo apt-get install -y git

# 방화벽 설정
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 애플리케이션 설치

```bash
# 게임 클론
git clone https://github.com/yourusername/armor-enhance.git
cd armor-enhance/server

# 의존성 설치
npm install --production

# 환경 설정
cp .env.example .env
nano .env  # 설정 수정
```

### PostgreSQL 데이터베이스 생성

```bash
sudo -u postgres createdb armor_enhance
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'your_password';"
```

### systemd 서비스 설정

```bash
sudo nano /etc/systemd/system/armor-enhance.service
```

내용:
```ini
[Unit]
Description=Armor Enhance Backend
After=network.target postgresql.service

[Service]
Type=simple
User=nodejs
WorkingDirectory=/home/nodejs/armor-enhance/server
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

Environment="NODE_ENV=production"
Environment="PORT=3001"

[Install]
WantedBy=multi-user.target
```

### 서비스 시작

```bash
sudo systemctl daemon-reload
sudo systemctl enable armor-enhance
sudo systemctl start armor-enhance
sudo systemctl status armor-enhance

# 로그 확인
sudo journalctl -u armor-enhance -f
```

### Nginx 리버스 프록시 설정

```bash
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/armor-enhance
```

설정:
```nginx
upstream backend {
    server localhost:3001;
}

server {
    listen 80;
    server_name api.yourgame.com;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 타임아웃 설정
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/armor-enhance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL 인증서 (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourgame.com
sudo certbot renew --dry-run  # 자동 갱신 테스트
```

### 성능 모니터링

```bash
# 서버 상태
curl https://api.yourgame.com/health

# 통계
curl https://api.yourgame.com/api/analytics/summary

# 시스템 모니터링
top
free -h
du -sh /var/lib/postgresql/
```

### 백업 설정

```bash
# 매일 자정에 백업
sudo crontab -e
```

추가:
```
0 0 * * * pg_dump -U postgres armor_enhance > /backups/armor_enhance_$(date +\%Y\%m\%d).sql
```

---

## 3. 트러블슈팅

### 데이터베이스 연결 오류

```bash
# PostgreSQL 상태 확인
sudo systemctl status postgresql

# 데이터베이스 접속
sudo -u postgres psql
\l  # 데이터베이스 목록
\du  # 사용자 목록
```

### 포트 충돌 확인

```bash
# 3001 포트 사용 확인
sudo lsof -i :3001

# 프로세스 종료
kill -9 <PID>
```

### 로그 확인

```bash
# 서비스 로그
sudo journalctl -u armor-enhance -n 100 -f

# Nginx 에러
sudo tail -f /var/log/nginx/error.log
```

### 성능 문제

```bash
# 느린 쿼리 확인
sudo -u postgres psql -d armor_enhance
SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC;

# 데이터베이스 최적화
VACUUM ANALYZE;
```

---

## 4. 업그레이드 및 유지보수

### 새 버전 배포

```bash
cd /home/nodejs/armor-enhance
git pull origin main
cd server
npm install --production
sudo systemctl restart armor-enhance
```

### 자동 업데이트 (선택사항)

```bash
# 매시간 자동 풀
sudo crontab -e
```

추가:
```
0 * * * * cd /home/nodejs/armor-enhance && git pull origin main && cd server && npm install --production && sudo systemctl restart armor-enhance
```
