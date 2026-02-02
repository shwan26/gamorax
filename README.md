# Gamorax 🎮 Version 2⚡
A real-time quiz game built for classroom live sessions with lobby PIN join, live questions, scoring, and downloadable reports.

> Built with Next.js + Socket.IO + Supabase. Designed to be simple to host, fast to join, and fun to play.

---

## Key Features
### Quiz Features
- multiple choice
- true/false
- matching
- answer input

### Live Game
- ✅ Lecturer hosts a quiz → system generates a **PIN** 
- ✅ Students join via **/join/[pin]** (QR code supported)
- ✅ Live lobby shows joined students (name + ID + avatar)
- ✅ Lecturer starts the session → students receive questions in real time
- ✅ Time-based scoring + leaderboard
- ✅ End-of-game report (rank, correct count, points)

### Student Identity + Avatars
- Student auth stored locally (current version)
- DiceBear avatar seed + avatar preview & save
- Lobby renders avatar if `avatarSrc` exists (fallback to initials)

### Reporting
- Stores latest report per game
- Export-friendly rows (rank, studentId, name, score, points)

---

## Tech Stack
- **Frontend:** Next.js (App Router), TypeScript
- **Backend:** Node.js (`server.js`) + Socket.IO
- **Storage (current):** `supabase` 
- **UI:** QR join, modern lobby/host view

---

## Project Structure (high level)
```txt
gamorax/
├── server.js
├── package.json
├── next.config.js
├── tsconfig.json
├── .env                
├── public/
│   └── icons/
├── src/  #frontend website
└── socket-server/ #backend server
```
## Getting Started
install dependencies:
```bash
npm install
npm i read-excel-file
npm i lucide-react

```
run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

.env / .env.local :
```bash
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

socket-server/.env :
```bash
PORT=4000
CORS_ORIGIN=http://localhost:3000

SUPABASE_URL=https://iyimcyizxxlshdndfror.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5aW1jeWl6eHhsc2hkbmRmcm9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU0NTAyNiwiZXhwIjoyMDg0MTIxMDI2fQ.w2JgXjitSbuU8TINp6egbVYVd3pLCbTj5E8M7gULoiE
```

run app:
```bash
npm run dev
```

build app:
```bash
npm run build
```
