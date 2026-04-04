# TicketPulse MVP (Real-time Ticket Booking Prototype)

Interactive MVP of an event ticket platform covering customer + admin journeys.

## Implemented customer capabilities
- signup/login (prototype auth)
- browse and search events by city, date, category
- view venue details and seat layout
- select seats and hold for 5 minutes
- mock payment and booking confirmation
- QR ticket generation + download
- booking cancellation from "My bookings"
- notification center (Email/SMS/Push simulation)

## Implemented admin capabilities
- create events (prototype form)
- manage venue list and seat-layout entry point
- define pricing and coupons (prototype actions)
- monitor bookings and refunds
- view mini reports (bookings/revenue/refund count)

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
