# Auction House - Real-Time Bidding Marketplace

## Tech Stack
- Frontend: Next.js, TypeScript, Tailwind CSS, Socket.io-client
- Backend: NestJS, TypeScript, Socket.io, TypeORM
- Database: PostgreSQL
- Queue: Redis (BullMQ)

## Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (running locally on port 5432)
- Redis (running locally on port 6379)

## Database Setup
1. Create a PostgreSQL database named `auction_house`
2. Update the database credentials in `backend/src/app.module.ts` if needed

## Redis Setup
1. Make sure Redis is running locally on port 6379
2. You can use Docker: `docker run -p 6379:6379 redis`

## Installation

### Backend
```bash
cd backend
npm install
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Features
- Real-time bidding with WebSockets
- Concurrency control with PostgreSQL pessimistic locks
- Anti-sniper feature (extends auction by 30 seconds if bid placed in last 30 seconds)
- Auction resolution with BullMQ
- Optimistic UI updates
- Server-side rendered pages for SEO

## Project Structure
```
auctionHouse/
├── backend/
│   ├── src/
│   │   ├── auctions/
│   │   ├── bids/
│   │   ├── users/
│   │   └── app.module.ts
│   └── package.json
└── frontend/
    ├── app/
    │   ├── auctions/
    │   ├── page.tsx
    │   └── layout.tsx
    └── package.json
```
