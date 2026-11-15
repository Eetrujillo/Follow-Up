# Deploy

Three containers behind one port published on loopback. The host nginx, which
serves the neighbouring apps on the same VPS, terminates TLS and proxies to
`127.0.0.1:3202`.

```
browser ──▶ frontend (nginx :3202) ──/api/*──▶ backend (NestJS :3000) ──▶ postgres (:5432)
```

Only `frontend` publishes a port. `backend` and `postgres` live on the compose
network and are not reachable from outside.

## Repository layout

| Repository | Role | Branch |
|---|---|---|
| `Eetrujillo/Follow-Up` | NestJS API + Prisma + this compose file | `main` |
| `Eetrujillo/Follow_Up` | Angular SPA, mounted as the `frontend` submodule | `feat/api-migration` (until merged) |

The SPA submodule is pinned by a gitlink. If the deploy needs a specific frontend
branch, check it out inside `frontend/` on the server before building, or merge it
into the branch the gitlink points at.

## API path convention

The backend mounts every route under `/api` (`app.setGlobalPrefix('api')` in
`backend/src/main.ts`). The SPA calls the relative path `/api`
(`src/app/shared/services/backend-api.config.ts`).

Both halves of that decision are load-bearing:

- The prefix avoids a real collision: the SPA owns the `/calendar` route, so an
  unprefixed `GET /calendar` would be answered by the SPA history fallback and
  never reach the API.
- The relative URL keeps host and port out of the bundle, so the same image works
  behind the VPS IP today and behind a domain later.

`nginx.conf` therefore proxies `/api/` with `proxy_pass http://backend:3000;` and
**no trailing slash**. Adding one strips the `/api` prefix and every call 404s.

## First deploy on the server

Assumes a Docker-capable user and a directory for the project. On the current VPS
the checkout lives at `/root/admin/home/projects/victor/Follow-Up`, next to the
other apps:

```bash
cd /root/admin/home/projects/victor
git clone https://github.com/Eetrujillo/Follow-Up.git
cd Follow-Up
git checkout prod
# .gitmodules points at git@github.com, which needs a key on the server; the
# repositories are public, so override it to HTTPS for this clone.
git config submodule.frontend.url https://github.com/Eetrujillo/Follow_Up.git
git -c url."https://github.com/".insteadOf="git@github.com:" \
    submodule update --init --recursive

cp env.sample .env
```

Fill `.env` — at minimum these three, or compose refuses to start:

```bash
# generate real values, do not keep the placeholders
openssl rand -hex 24     # -> POSTGRES_PASSWORD
openssl rand -hex 32     # -> JWT_SECRET
```

Then:

```bash
docker compose up -d --build
docker compose ps
curl -s http://127.0.0.1:3202/ | head -3          # SPA shell
curl -s http://127.0.0.1:3202/api                 # backend answer through nginx
```

Migrations run automatically: the backend container executes
`npx prisma migrate deploy` before `node dist/src/main.js`.

## Ports on this VPS

| Port | Owner |
|---|---|
| 3201 | adulto mayor platform |
| 3202 | this project, on loopback only |

`FRONTEND_PORT` in `.env` changes the published port.

### Docker bypasses ufw

A published port is reachable from the internet **even if ufw denies it**: Docker
writes its DNAT rules in `PREROUTING`/`FORWARD`, before the `INPUT` chain that ufw
filters. That is why this compose file publishes on `127.0.0.1` and the host
nginx is the only public entry, the same way the adulto mayor platform does it.

### Host reverse proxy and TLS

The host nginx owns 80 and 443 and already serves the neighbouring sites. Add a
server block that proxies the public name to the loopback port, then let certbot
issue the certificate:

```nginx
server {
    server_name follow-up.apolobyte.online;
    location / {
        proxy_pass http://127.0.0.1:3202;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/follow-up /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d follow-up.apolobyte.online
```

On Cloudflare the record must be **DNS only** (grey cloud) while certbot
validates, or the HTTP-01 challenge never reaches the server. Proxying can be
re-enabled afterwards, with SSL/TLS mode set to Full (strict).

## Automated deploy

`.github/workflows/prod.yml` runs on a push to `prod` or manually. It needs these
repository secrets:

| Secret | Value |
|---|---|
| `SSH_HOST` | server IP or hostname |
| `SSH_USER` | deploy user |
| `SSH_PRIVATE_KEY` | private key with access to the server |
| `SSH_PASSPHRASE` | passphrase of that key, if any |
| `SSH_PORT` | SSH port |
| `WORK_DIR` | absolute path of the checkout on the server |
| `PROD_BRANCH` | branch to deploy (for example `main`) |

## Operational notes

- A dirty working tree on the server breaks `git pull --ff-only`. Commit or stash
  before deploying.
- Changing values in `.env` requires recreating the containers
  (`docker compose up -d`); `docker restart` does not re-read the file.
- `docker image prune -f` runs after each deploy to keep the disk from filling
  with superseded builds.
- The postgres data lives in the `postgres_data` volume. Removing it with
  `docker compose down -v` deletes every user and document.

## Security follow-up (not solved by this deploy)

`Eetrujillo/Follow_Up` on `main` still carries a jsonbin `X-Master-Key` and a
Cohere API key hardcoded in the client, and the repository is public. This deploy
uses `feat/api-migration`, which does not contain either key. Rotate both
credentials and purge them from `main` and from the git history before that branch
is ever served.
