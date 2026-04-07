# 🎮 Tepirek Revamped

A modern guild management platform for **Margonem** MMORPG players. We built this because spreadsheets weren't cutting it anymore — managing squads, tracking events, running auctions, and keeping tabs on everyone's skills deserves something better.

Built with TypeScript, end-to-end typesafety, and a monorepo setup that makes the frontend and backend actually talk to each other without the usual API contract headaches.

---

## ✨ What you can do

### 📊 Event Management

- Track guild events and activities
- Hero management with a betting system
- Event history, rankings, and vault management

### 💰 Auction System

- Main and auxiliary character auctions
- Profession-based filtering
- Round and column-based signup

### 🎯 Skills Tracker

- One place to store all of clans skills
- Range-based skill organization

### 👥 User Management

- Role-based access control (Admin/User)
- Discord OAuth
- Admin panel for managing users

### 📋 And a few extras

- Task/todo management
- Guild announcements
- Player listing with verification status
- Calculator tools (ODW, ULEPA)

---

## 🏗️ What's under the hood

This is a **Turborepo monorepo** with end-to-end typesafety. The frontend and backend share types through the `packages/api` layer, so there's no guessing about API contracts — change a type in one place and everything stays in sync.

```
tepirek-revamped/
├── apps/
│   ├── web/          # Frontend (TanStack Start, port 3001)
│   └── server/       # Backend (Hono + Bun, port 3000)
│
├── packages/
│   ├── api/          # Shared oRPC routers (end-to-end types)
│   ├── auth/         # Better Auth config
│   ├── db/           # Drizzle ORM + PostgreSQL schemas
│   └── config/       # Shared TypeScript configs
│
└── turbo.json        # Build orchestration
```

### Tech choices

| Layer        | What we use                | Why                                   |
| ------------ | -------------------------- | ------------------------------------- |
| **Frontend** | TanStack Start + React 19  | SSR, file-based routing, great DX     |
| **Backend**  | Hono + Bun                 | Lightweight, fast, simple             |
| **API**      | oRPC                       | End-to-end typesafety without codegen |
| **Database** | PostgreSQL + Drizzle ORM   | Type-safe queries, no ORM bloat       |
| **Auth**     | Better Auth                | Discord OAuth + email, zero fuss      |
| **UI**       | shadcn/ui + Tailwind v4    | Accessible, customizable, no lock-in  |
| **Linting**  | Ultracite (Oxlint + Oxfmt) | Fast, strict, zero-config             |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 10+
- **PostgreSQL** 15+
- **Bun** (for the server)

### Quick start

Already know the drill?

```bash
git clone https://github.com/Matthieusz/tepirek-revamped.git
cd tepirek-revamped
pnpm install
pnpm db:start && pnpm db:push && pnpm dev
```

### Full setup

1. **Clone & install**

   ```bash
   git clone https://github.com/Matthieusz/tepirek-revamped.git
   cd tepirek-revamped
   pnpm install
   ```

2. **Set up your env**

   Create `apps/server/.env`:

   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/tepirek

   # Auth
   BETTER_AUTH_SECRET=your-secret-key-here
   BETTER_AUTH_URL=http://localhost:3000
   CORS_ORIGIN=http://localhost:3001

   # Discord OAuth (optional)
   DISCORD_CLIENT_ID=your-discord-client-id
   DISCORD_CLIENT_SECRET=your-discord-client-secret
   DISCORD_SERVER_ID=your-discord-server-id
   ```

3. **Set up the database**

   ```bash
   pnpm db:start    # Start PostgreSQL (Docker)
   pnpm db:push     # Push schema to database
   ```

4. **Start dev servers**

   ```bash
   pnpm dev
   ```

   - Frontend: [http://localhost:3001](http://localhost:3001)
   - API: [http://localhost:3000](http://localhost:3000)

---

## 📜 Commands

| Command            | What it does                        |
| ------------------ | ----------------------------------- |
| `pnpm dev`         | Start everything in dev mode        |
| `pnpm dev:web`     | Frontend only                       |
| `pnpm dev:server`  | Backend only                        |
| `pnpm build`       | Build everything for production     |
| `pnpm check`       | Run Ultracite (lint + format check) |
| `pnpm fix`         | Auto-fix lint and format issues     |
| `pnpm check-types` | TypeScript type checking            |

### Database

| Command            | What it does                       |
| ------------------ | ---------------------------------- |
| `pnpm db:push`     | Push schema changes                |
| `pnpm db:studio`   | Open Drizzle Studio (database GUI) |
| `pnpm db:generate` | Generate migrations                |
| `pnpm db:migrate`  | Run migrations                     |
| `pnpm db:start`    | Start PostgreSQL (Docker)          |
| `pnpm db:stop`     | Stop PostgreSQL                    |

---

## 🔐 Authentication Flow

1. **Sign up** — Email/password or Discord OAuth
2. **Wait in the waiting room** — Wait till you get verified by an admin or get approved through membership in set Discord server
3. **Get approved** — Admins verify you via the player list

---

## 🤝 Contributing

Got an idea or found a bug? Here's how to help out:

1. Fork the repo
2. Create a branch (`git checkout -b feature/your-thing`)
3. Make your changes
4. Run `pnpm check` and `pnpm check-types` to make sure everything's clean
5. Push and open a PR

If you're not sure where to start, just open an issue and we'll figure it out together.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
