# Baltic Challenges · Admin

Moderation and content dashboard (Vite + React + TypeScript). It is served by Caddy under
`https://vps-1a18ee51.vps.ovh.net/admin/` on the same origin as the API, so all requests use relative `/v1/...` URLs.

## Development

```powershell
cd apps/admin
npm install
npm run dev
```

The dev server proxies `/v1` and `/uploads` to the production API (`https://vps-1a18ee51.vps.ovh.net`).
Open the URL Vite prints (e.g. `http://localhost:5173/admin/`).

## Build

```powershell
npm run typecheck
npm run build
```

Output goes to `apps/admin/dist` with assets referenced under `/admin/`. Deploy the contents of `dist` to the
directory Caddy serves at `/admin/`.

## Access

Only accounts with role `moderator` or `admin` can sign in. Admin-only actions (ban/unban, role changes,
creating/editing places and challenges) are hidden or disabled for moderators.

The first admin is created on the server:

```bash
sudo -u baltic node --env-file=/etc/baltic-challenges/api.env /opt/baltic-challenges/current/dist/scripts/set-role.js <email> admin
```

After that, admins can promote other users from the **Users** tab.
