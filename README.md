# Gamorax 🎮 Version 1.0⚡
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

## Project Structure

```txt
gamorax/
├── public/                     # Static assets and import templates
├── socket-server/              # Socket.IO backend
├── src/
│   ├── app/                    # Next.js routes, layouts, and API handlers
│   ├── components/
│   │   ├── auth/               # Route and role guards
│   │   ├── live/               # Live-game UI
│   │   ├── navigation/         # Shared navigation bars
│   │   ├── question-edit/      # Question editor UI
│   │   ├── skeletons/          # Loading states
│   │   └── ui/                 # Reusable UI primitives
│   ├── hooks/                  # Shared React hooks
│   ├── lib/
│   │   ├── assignments/        # Assignment data access
│   │   ├── auth/               # Student authentication helpers
│   │   ├── avatars/            # Avatar generation and mapping
│   │   ├── courses/            # Course data access
│   │   ├── games/              # Game and question data access
│   │   ├── import/             # File import helpers
│   │   ├── live/               # Live sessions, reports, and sockets
│   │   ├── reports/            # Student report data access
│   │   └── supabase/           # Supabase client setup
│   └── styles/                 # Global and shared styles
├── next.config.ts
├── package.json
└── tsconfig.json
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

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_keys
```

run app:
```bash
npm run dev
```

build app:
```bash
npm run build
```
