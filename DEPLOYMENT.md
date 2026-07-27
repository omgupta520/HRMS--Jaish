# Deployment Guide — HRMS

This guide covers deploying the HRMS backend (Node/Express) and frontend (React/Vite)
to production, using free-tier-friendly services. Adapt to your preferred host.

## Architecture

```
[ React (Vercel/Netlify) ]  --HTTPS-->  [ Express API (Render/Railway) ]  -->  [ MongoDB Atlas ]
```

---

## 1. Database — MongoDB Atlas

1. Create a free cluster at https://www.mongodb.com/atlas.
2. Add a database user and whitelist `0.0.0.0/0` (or your host's IP range).
3. Copy the connection string, e.g.
   `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/hrms?retryWrites=true&w=majority`

## 2. Backend — Render / Railway

**Settings**
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Node version: 18+

**Environment variables** (from `backend/.env.example`):

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `5000` (or provider-assigned) |
| `MONGO_URI` | your Atlas URI |
| `JWT_ACCESS_SECRET` | long random string |
| `JWT_REFRESH_SECRET` | long random string (different) |
| `JWT_ACCESS_EXPIRES` | `15m` |
| `JWT_REFRESH_EXPIRES` | `7d` |
| `CLIENT_URL` | your deployed frontend URL (for CORS) |
| `SMTP_*` / `MAIL_FROM` | SMTP credentials (optional; emails log to console if unset) |

**Seed in production (one-time):** run `npm run seed` from the provider's shell,
or temporarily as a release command. Remove/disable afterwards.

> File uploads are stored on the local disk under `backend/src/uploads`. On
> ephemeral hosts (Render free tier), use a persistent disk or switch the upload
> middleware to S3/Cloudinary for durability.

## 3. Frontend — Vercel / Netlify

**Settings**
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Because the app calls the API via the relative path `/api/v1`, configure a rewrite
so those calls reach the backend:

**Vercel** — `frontend/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://YOUR-BACKEND-URL/api/:path*" },
    { "source": "/uploads/:path*", "destination": "https://YOUR-BACKEND-URL/uploads/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Netlify** — `frontend/public/_redirects`:
```
/api/*       https://YOUR-BACKEND-URL/api/:splat   200
/uploads/*   https://YOUR-BACKEND-URL/uploads/:splat   200
/*           /index.html                            200
```

Then set `CLIENT_URL` on the backend to your frontend domain so CORS allows it.

## 4. Post-deploy checklist
- [ ] `GET https://YOUR-BACKEND-URL/api/v1/health` returns `{ success: true }`.
- [ ] Frontend loads and the demo login works.
- [ ] CORS: no console errors on cross-origin requests (check `CLIENT_URL`).
- [ ] Rotate the seeded demo passwords or remove demo data for real usage.
- [ ] Strong, unique `JWT_*` secrets are set.
- [ ] HTTPS enforced on both services.

## 5. Docker (optional, local prod-like)

A minimal `docker-compose` for backend + MongoDB:

```yaml
version: "3.9"
services:
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: ["mongo-data:/data/db"]
  api:
    build: ./backend
    ports: ["5000:5000"]
    environment:
      MONGO_URI: mongodb://mongo:27017/hrms
      JWT_ACCESS_SECRET: change_me
      JWT_REFRESH_SECRET: change_me_too
      CLIENT_URL: http://localhost:5173
    depends_on: [mongo]
volumes:
  mongo-data:
```

Add `backend/Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```
