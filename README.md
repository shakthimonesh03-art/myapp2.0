# TicketPulse MVP (Real-time Ticket Booking Prototype).

A working MVP focused on interactive UI + core booking flow:
- city/category event discovery
- seat selection
- 5-minute seat hold timer
- mock payment
- booking confirmation with generated QR code
- admin dashboard summary

## Stack
- Next.js + React + TypeScript
- Mocked local data for quick iteration

## Run locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Run with Docker Compose
```bash
docker compose up --build
```
Open `http://localhost:3000`.

Stop containers:
```bash
docker compose down
```

## Product architecture (production direction)
This prototype maps to microservices boundaries:
- API Gateway
- Auth/User/Event/Venue/Inventory/Booking/Payment/Notification/Search/Admin/Reporting services
- PostgreSQL + Redis + Kafka + S3

See the pages for user and admin workflows while backend microservices are iterated independently.
