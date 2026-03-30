# Real-Time Chat App (MERN + Socket.IO)

Full-stack real-time chat application with:

- Backend API + Socket server in `backend/`
- React frontend in `frontend/`
- JWT cookie auth, user directory, online/offline presence, typing indicators, and persistent messages in MongoDB

## Features

- User registration and login
- Cookie-based auth for API calls
- Socket auth with JWT token
- One-to-one real-time messaging
- Message history from database
- Online/offline presence
- Typing start/stop indicators
- Multi-tab / multi-device user connection handling

## Tech Stack

- Backend: Node.js, Express, MongoDB (Mongoose), Socket.IO
- Frontend: React, TypeScript, Vite, React Router, Socket.IO Client
- Auth: JWT + cookies

## Project Structure

```text
chat-app/
├── backend/
│   ├── server.js
│   ├── src/
│   │   ├── app.js
│   │   ├── db/db.js
│   │   ├── controller/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── socket/socket.js
│   └── .env
└── frontend/
    ├── src/
    ├── public/
    └── vite.config.ts
```

## Backend API

Base URL (local): `http://localhost:3000`

## Local Setup

### 1) Clone

```bash
git clone <your-repo-url>
cd chat-app
```

### 2) Configure Backend Environment

Create `backend/.env`:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_random_secret
```

### 3) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4) Run backend

```bash
cd backend
npm run dev
```

### 5) Run frontend

```bash
cd frontend
npm run dev
```

Frontend runs on Vite dev server (usually `http://localhost:5173`) and proxies API/socket traffic to backend (`http://localhost:3000`).

## Frontend Notes

- Auth is managed with cookies + local user state
- Users list comes from `GET /api/users/get-users`
- Chat screen supports:
  - online/offline badges
  - typing indicators
  - recent chats

## Important Notes Before Public Push

- Do not commit `backend/.env`
- Rotate secrets immediately if leaked
- Use `.env.example` for sharing required env keys without values

## Scripts

Backend:

- `npm run dev` - start with nodemon
- `npm start` - start server

Frontend:

- `npm run dev` - Vite dev server
- `npm run lint` - ESLint
- `npm run build` - type-check + production build

## License

ISC (backend package default). Update if you want a project-level license.
