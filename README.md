# 🎮 Tepirek Revamped

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

A modern guild management platform for **Margonem** MMORPG players, built with cutting-edge TypeScript technologies.

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Project Structure](#-project-structure) • [Commands](#-commands)

</div>

---

## ✨ Features

### 🛡️ Squad Builder

- Create and manage team compositions (up to 10 characters per squad)
- Import characters from multiple game accounts
- Filter by world, profession, and level
- Share squads with other users (view or edit permissions)
- Public/private squad visibility

### 📊 Event Management

- Track guild events and activities
- Hero management system
- Betting system for events
- Event history and ranking
- Vault management

### 💰 Auction System

- Support for main and auxiliary character auctions
- Profession-based filtering
- Round and column-based signup system

### 🎯 Skills Tracker

- Track character skills and professions
- Range-based skill organization
- Profession and skill management

### 👥 User Management

- Role-based access control (Admin/User)
- Discord OAuth integration
- Email verification system
- Admin panel for user management

### 📋 Additional Features

- Task/Todo management
- Guild announcements
- Player listing with verification status
- Profile management
- Calculator tools (ODW, ULEPA)

---

## 🛠️ Tech Stack

### Frontend (`apps/web`)

| Technology         | Purpose                               |
| ------------------ | ------------------------------------- |
| **TanStack Start** | SSR framework with file-based routing |
| **TanStack Query** | Server state management               |
| **TanStack Form**  | Form handling with validation         |
| **shadcn/ui**      | Accessible UI components              |
| **TailwindCSS v4** | Utility-first styling                 |
| **Vite**           | Build tool and dev server             |

### Backend (`apps/server`)

| Technology      | Purpose                                |
| --------------- | -------------------------------------- |
| **Hono**        | Lightweight, performant web framework  |
| **oRPC**        | End-to-end type-safe API layer         |
| **Better Auth** | Authentication (Email + Discord OAuth) |
| **Bun**         | JavaScript runtime                     |

### Database (`packages/db`)

| Technology      | Purpose                    |
| --------------- | -------------------------- |
| **PostgreSQL**  | Relational database        |
| **Drizzle ORM** | Type-safe database queries |

### Tooling

| Technology    | Purpose                      |
| ------------- | ---------------------------- |
| **Turborepo** | Monorepo build orchestration |
| **Biome**     | Linting and formatting       |
| **pnpm**      | Package management           |

---

## 📁 Project Structure

```
tepirek-revamped/
├── apps/
│   ├── web/                    # Frontend application (port 3001)
│   │   └── src/
│   │       ├── components/     # Reusable UI components
│   │       │   ├── modals/     # Modal dialogs
│   │       │   ├── sidebar/    # Navigation sidebar
│   │       │   └── ui/         # shadcn/ui components
│   │       ├── routes/         # File-based routing
│   │       │   ├── dashboard/  # Protected dashboard routes
│   │       │   │   ├── auctions/
│   │       │   │   ├── calculator/
│   │       │   │   ├── events/
│   │       │   │   ├── skills/
│   │       │   │   └── squad-builder/
│   │       │   └── ...
│   │       ├── hooks/          # Custom React hooks
│   │       ├── lib/            # Utilities and helpers
│   │       └── utils/          # oRPC client setup
│   │
│   └── server/                 # Backend API (port 3000)
│       └── src/
│           └── index.ts        # Hono server entry
│
├── packages/
│   ├── api/                    # Shared API routers
│   │   └── src/routers/        # oRPC procedure definitions
│   │       ├── announcement.ts
│   │       ├── auction.ts
│   │       ├── bet.ts
│   │       ├── event.ts
│   │       ├── heroes.ts
│   │       ├── skills.ts
│   │       ├── squad.ts
│   │       ├── todo.ts
│   │       └── user.ts
│   │
│   ├── auth/                   # Better Auth configuration
│   │
│   ├── db/                     # Database layer
│   │   └── src/schema/         # Drizzle table definitions
│   │       ├── auth.ts
│   │       ├── auction.ts
│   │       ├── bet.ts
│   │       ├── event.ts
│   │       ├── skills.ts
│   │       ├── squad.ts
│   │       └── todo.ts
│   │
│   └── config/                 # Shared TypeScript configs
│
└── turbo.json                  # Turborepo configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 10+
- **PostgreSQL** 15+
- **Bun** (for server runtime)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Matthieusz/tepirek-revamped.git
   cd tepirek-revamped
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create `apps/server/.env`:

   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/tepirek

   # Auth
   BETTER_AUTH_SECRET=your-secret-key
   BETTER_AUTH_URL=http://localhost:3000
   CORS_ORIGIN=http://localhost:3001

   # Discord OAuth (optional)
   DISCORD_CLIENT_ID=your-discord-client-id
   DISCORD_CLIENT_SECRET=your-discord-client-secret
   DISCORD_SERVER_ID=your-discord-server-id
   ```

4. **Set up the database**

   ```bash
   # Start PostgreSQL (if using Docker)
   pnpm db:start

   # Push schema to database
   pnpm db:push
   ```

5. **Start development servers**

   ```bash
   pnpm dev
   ```

6. **Open in browser**
   - Frontend: [http://localhost:3001](http://localhost:3001)
   - API: [http://localhost:3000](http://localhost:3000)

---

## 📜 Commands

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start all apps in development mode |
| `pnpm dev:web`     | Start frontend only                |
| `pnpm dev:server`  | Start backend only                 |
| `pnpm build`       | Build all apps for production      |
| `pnpm check`       | Run Biome linting and formatting   |
| `pnpm check-types` | TypeScript type checking           |

### Database Commands

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm db:push`     | Push schema changes to database    |
| `pnpm db:studio`   | Open Drizzle Studio (database GUI) |
| `pnpm db:generate` | Generate migrations                |
| `pnpm db:migrate`  | Run migrations                     |
| `pnpm db:start`    | Start PostgreSQL (Docker)          |
| `pnpm db:stop`     | Stop PostgreSQL (Docker)           |

---

## 🔐 Authentication Flow

1. **Registration** - Email/password or Discord OAuth
2. **Email Verification** - Users wait in "waiting room" until verified
3. **Admin Approval** - Admins can verify users via the player list
4. **Discord Guild Check** - Optional validation that user belongs to specific Discord server

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private and intended for guild use only.

---

<div align="center">

Built with ❤️ for the Margonem community

</div>
