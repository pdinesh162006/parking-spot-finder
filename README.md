# 🚗 ParkEase — Real-Time Parking Spot Finder

A full-stack web application that helps urban drivers **find, reserve, and pay** for parking spots near their destination in real time. Features live spot availability via Socket.io, dynamic surge pricing, Stripe payments, QR code gate tickets, and role-based dashboards.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6 |
| **State** | Zustand |
| **Maps** | Leaflet.js + OpenStreetMap tiles |
| **Charts** | Recharts |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL 16 (Prisma ORM) |
| **Cache** | Redis 7 (spot locking, session) |
| **Auth** | JWT (RS256) + httpOnly refresh cookies |
| **Payments** | Stripe Checkout Sessions |
| **Real-time** | Socket.io |
| **Email** | Nodemailer + SendGrid |
| **File uploads** | AWS S3 (with local fallback) |
| **DevOps** | Docker, docker-compose |
| **Testing** | Jest + Supertest (backend), Vitest + RTL (frontend) |

---

## 🚀 Quick Start

### Prerequisites

- [Node.js 20+](https://nodejs.org/) and npm
- [Docker](https://www.docker.com/) and docker-compose

### Option A: Docker Compose (Recommended)

```bash
# Start all services (Postgres, Redis, Backend, Frontend)
make dev

# In a separate terminal, run migrations and seed
make migrate
make seed
```

### Option B: Local Development

```bash
# 1. Start databases
docker-compose up postgres redis -d

# 2. Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev                     # → http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                     # → http://localhost:5173
```

### Option C: Standalone Mock Mode (Zero-Dependency)

If you do not have Docker, PostgreSQL, or Redis installed, the application is pre-configured to run in an in-memory **Mock Mode**.
1. Verify `MOCK_MODE=true` is set in `backend/.env`.
2. Start the backend: `cd backend && npm run dev`
3. Start the frontend: `cd frontend && npm run dev`
4. Open [http://localhost:5173/](http://localhost:5173/) and log in with any test account listed below!

---

## 🔑 Test Accounts

After seeding the database, these accounts are available:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@parkease.com | password123 |
| **Owner** | owner1@parkease.com | password123 |
| **Owner** | owner2@parkease.com | password123 |
| **Driver** | driver1@parkease.com | password123 |
| **Driver** | driver2@parkease.com | password123 |
| **Driver** | driver3@parkease.com | password123 |
| **Driver** | driver4@parkease.com | password123 |
| **Driver** | driver5@parkease.com | password123 |

---

## 📄 Pages & Features

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Hero landing page with search bar |
| `/search` | Public | Split-panel map + lot cards with filters |
| `/lots/:id` | Public | Lot details, real-time spot grid, reviews |
| `/reserve/:lotId/:spotId` | Auth | Booking summary + Stripe checkout |
| `/booking/success` | Auth | QR gate ticket confirmation |
| `/booking/cancel` | Auth | Payment failure with retry |
| `/dashboard` | Driver | Upcoming/Active/Past reservations |
| `/owner` | Owner | Lot management, revenue charts |
| `/admin` | Admin | KPI cards, user roles, lot approvals |
| `/profile` | Auth | Edit name, phone, password |
| `/login` | Public | Email/password login |
| `/register` | Public | Driver or Owner registration |

---

## 🧠 Core Business Logic

1. **Spot Locking** — Redis `SET NX EX 600` locks a spot for 10 minutes during checkout
2. **Availability** — Overlap query: no CONFIRMED/ACTIVE reservation intersects `[start, end]`
3. **Surge Pricing** — If lot occupancy > 80% in next 2 hours → price × 1.2
4. **QR Validation** — RS256-signed JWT token verified on scan, transitions reservation to COMPLETED
5. **Auto-Complete** — Cron job every 5 min: CONFIRMED→ACTIVE at startTime, ACTIVE→COMPLETED at endTime

---

## 🧪 Testing

```bash
# Backend tests (Jest + Supertest)
cd backend && npm test

# Frontend tests (Vitest + React Testing Library)
cd frontend && npm test
```

---

## 📁 API Endpoints

| Group | Method | Route | Description |
|-------|--------|-------|-------------|
| Auth | POST | `/api/auth/register` | Create account |
| Auth | POST | `/api/auth/login` | Login, returns JWT |
| Auth | POST | `/api/auth/refresh` | Rotate tokens |
| Auth | POST | `/api/auth/logout` | Clear cookie |
| Users | GET | `/api/users/me` | Get profile |
| Users | PUT | `/api/users/me` | Update name/phone |
| Users | PUT | `/api/users/me/password` | Change password |
| Lots | GET | `/api/lots` | Search with geo/filters |
| Lots | GET | `/api/lots/:id` | Detail + rating + spots |
| Lots | POST | `/api/lots` | Create lot (Owner) |
| Lots | PUT | `/api/lots/:id` | Update lot (Owner) |
| Lots | DELETE | `/api/lots/:id` | Soft-delete (Owner) |
| Lots | GET | `/api/lots/:id/spots` | Live spot availability |
| Spots | POST | `/api/spots` | Add spot (Owner) |
| Spots | PUT | `/api/spots/:id` | Update spot (Owner) |
| Spots | DELETE | `/api/spots/:id` | Deactivate spot |
| Reservations | POST | `/api/reservations` | Lock + Stripe checkout |
| Reservations | GET | `/api/reservations` | List user bookings |
| Reservations | GET | `/api/reservations/:id` | Detail + QR code |
| Reservations | POST | `/api/reservations/:id/cancel` | Cancel + refund |
| Reservations | POST | `/api/reservations/:id/extend` | Extend + charge diff |
| Payments | POST | `/api/payments/webhook` | Stripe webhook |
| Reviews | POST | `/api/reviews` | Submit review |
| Reviews | GET | `/api/reviews/lot/:lotId` | Lot reviews |
| Admin | GET | `/api/admin/users` | List users |
| Admin | PUT | `/api/admin/users/:id/role` | Change role |
| Admin | GET | `/api/admin/lots` | All lots |
| Admin | GET | `/api/admin/stats` | KPI dashboard |

---

## 📝 Environment Variables

See [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example) for all required variables. All third-party services (Stripe, AWS S3, SendGrid) have **mock fallbacks** that work out of the box for local development.

---

## 📜 License

MIT
