# 🎮 Gamorax

**A real-time quiz platform built for live classroom sessions** — lecturers host with a join PIN, students play in real time, and the platform generates instant leaderboards and downloadable reports.

> 👥 **Team project** (3 members) · 🔐 The live demo requires creating a free account to try the host/student flow.

🔗 **Live Demo:** [gamorax.app](https://gamorax.app)

---

## ✨ Why It's Interesting

Gamorax was built to make live classroom quizzes fast to set up, effortless to join, and genuinely engaging — no app installs, no lag between question and score. It combines a Next.js frontend, a Socket.IO real-time backend, and Supabase for data, supporting live multiplayer sessions with instant scoring and leaderboard updates.

---

## 🚀 Key Features

**Live Game Flow**
- Lecturer hosts a quiz → the system generates a unique join **PIN**
- Students join instantly via link or **QR code** — no installs required
- Live lobby shows students joining in real time (name, ID, avatar)
- Real-time question delivery with time-based scoring
- Live leaderboard updates as students answer
- End-of-game report: rank, correct answers, and points per student

**Quiz Formats Supported**
- Multiple choice · True/False · Matching · Free-text answer input

**Student Experience**
- Custom DiceBear-generated avatars with live preview
- Simple, fast join flow — no friction between PIN and first question

**Reporting**
- Auto-generated results after every session
- Export-ready rows: rank, student ID, name, score, points

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript |
| Real-time backend | Node.js + Socket.IO |
| Database | Supabase |
| UI | QR-code join flow, live host & lobby views |

---

## 👥 Team & My Contribution

Gamorax was built by a 3-person team:

| Member | Focus |
|---|---|
| **Shwan (me)** | Frontend & backend — Next.js app, Socket.IO real-time server, core game logic (PIN join, live scoring, leaderboard) |
| **Tulip** | Database — Supabase schema design and data layer, System architecture |
| **Lucas** | UX flow and planning |

---

## ⚙️ Running Locally

**Requirements:** Node.js, npm/pnpm/yarn

```bash
npm install
npm run dev
```

The app needs two `.env` files — one for the Next.js app, one for the Socket.IO server (Supabase keys, socket URL, CORS origin). See [`/socket-server`](./socket-server) for backend-specific setup.

---
