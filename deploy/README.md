# WonFlow Phase 1 — testing deployment

Target: `hpbsp.wonflow.tech`, app on port **3007**, fresh server.

This deploys the Docker image built from the repo's [`Dockerfile`](../Dockerfile).
It does **not** copy the working tree to the server — `.env.local` and
`node_modules` must never be uploaded.

---

## 1. Get the code onto the server

Use git, not `scp -r`. A recursive copy would ship your local `.env.local`
secrets and gigabytes of Windows-built `node_modules` that cannot run on Linux.

```bash
ssh <user>@187.127.106.114
sudo mkdir -p /opt/wonflow && sudo chown "$USER" /opt/wonflow
git clone <your-repo-url> /opt/wonflow
cd /opt/wonflow/deploy
```

No git remote? From your machine, ship only tracked files:

```bash
git archive --format=tar.gz -o wonflow.tar.gz HEAD
scp wonflow.tar.gz <user>@187.127.106.114:/opt/wonflow/
# then on the server: tar xzf wonflow.tar.gz
```

`git archive` respects `.gitignore`, so secrets stay behind.

## 2. Install Docker (fresh server)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # log out and back in
```

## 3. Configure

```bash
cp .env.deploy.example .env.deploy
openssl rand -base64 48   # SESSION_SECRET
openssl rand -base64 48   # AUTH_ENCRYPTION_KEY
openssl rand -base64 24   # POSTGRES_PASSWORD
nano .env.deploy
```

Set `POSTGRES_PASSWORD` in **both** places — the variable and inside
`DATABASE_URL`. Set a strong `WONFLOW_DEVELOPMENT_PASSWORD`; it is shared by
every seeded account on an internet-facing host.

## 4. Bring it up

```bash
docker compose --env-file .env.deploy up -d database
docker compose --env-file .env.deploy run --rm migrate     # migrations + seed
docker compose --env-file .env.deploy up -d --build web
docker compose --env-file .env.deploy logs -f web
```

The migrate step prints a table of seeded logins. Save it.

Verify:

```bash
curl -I http://localhost:3007
```

## 5. TLS

Port 3007 serves plain HTTP. Put a reverse proxy in front before exposing it,
otherwise passwords cross the network in clear text:

```bash
sudo apt install -y caddy
echo 'hpbsp.wonflow.tech { reverse_proxy 127.0.0.1:3007 }' | sudo tee /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

Caddy obtains a certificate automatically once `hpbsp.wonflow.tech` resolves to
this server. Then close 3007 at the firewall so only 80/443 are public.

---

## Redeploying after a code change

```bash
git pull
docker compose --env-file .env.deploy run --rm migrate      # only if migrations changed
docker compose --env-file .env.deploy up -d --build web
```

## Why the settings are what they are

| Setting | Value | Reason |
|---|---|---|
| `WONFLOW_ENVIRONMENT` | `staging` | `production` makes the seed script refuse to run and forces an `https://` app URL. |
| `NEXT_PUBLIC_WONFLOW_DATA_MODE` | `api` | Screens read the real database. `mock` would show fixtures. |
| `NEXT_PUBLIC_WONFLOW_ENABLE_DEMO` | `false` | Keeps demo scaffolding out of a client-facing test. |
| `ALLOW_MOCK_DATA` | `false` | Server refuses to fall back to fixtures. |
| Postgres port | `127.0.0.1` only | The database must not be reachable from the internet. |

`NEXT_PUBLIC_*` values are inlined at image build time, so changing them
requires `--build`, not just a restart.

## Known gaps on this deployment

- **No SMTP.** `SMTP_*` is unset and no mailer is implemented, so the platform
  cannot send the owner welcome email. Use the copy-message and mailto buttons
  on the tenant screen instead.
- **No object storage.** `OBJECT_STORAGE_*` is unset; document upload and
  logo storage will not persist files.
- **No TURN server.** `WONFLOW_WEBRTC_ICE_SERVERS_JSON` is empty, so video
  consultations may fail across restrictive networks.
- **Queue board is browser-local.** Reception's live queue still uses
  `localStorage`; it does not sync between machines. Booking and doctor
  sittings are server-backed and do sync.
