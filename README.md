# TicketPulse MVP (Real-time Ticket Booking Prototype)

Interactive MVP of an event ticket platform covering customer + admin journeys.

## UI
- Modern modal-driven homepage with location selector
- Same modern visual style applied to booking, notifications (alerts), and admin pages
- Razorpay UPI style checkout experience in booking flow

## Core services implemented (mock microservices)
- API Gateway: `/api/gateway/{service}/...`
  - service routing
  - bearer token validation for protected services
  - rate limiting / throttling
  - request logging
  - CORS headers
  - API version check (`v1`)
- Auth Service: `/api/auth`
  - signup, login, refresh token, forgot-password
  - RBAC role field support (`customer`, `event organizer`, `admin`, `support`)
  - mock password hashing helper
- User Service: `/api/user`
  - profile, booking history, preferences/city
- Event Service: `/api/events`
  - create, update, publish/unpublish
  - event metadata fields
- Venue Service: `/api/venues`
  - venue create/list and seat-layout retrieval
- Inventory Service: `/api/inventory`
  - seat states (`AVAILABLE`, `HELD`, `BOOKED`, `BLOCKED`)
  - hold / release / block / book
- Booking Service: `/api/bookings`
  - create, status updates, cancellation/refund-initiation
  - booking status lifecycle fields
- Payment Service: `/api/payments`
  - Razorpay-style idempotent payment processing
- Notification Service: `/api/notifications`
  - typed notifications payload records
- Search Service: `/api/search`
  - search by city/date/category/query with price range filters
- Admin Service: `/api/admin`
  - venue/event creation, coupons, refunds, sales monitor view
- Reporting Service: `/api/reporting`
  - booking/revenue/occupancy/top-events/failed-payment/refund reports
- Storage helper: `/api/storage`

## Data model (mock)
In-memory structures include Users, Events, Venues, Seats, Bookings, Payments, Notifications, Refunds, Coupons with fields aligned to the requested design.

## S3 storage configuration
Asset path helper support for:
- ticket PDFs
- QR images
- event banners
- invoices
- logs archive

Set env vars (or rely on defaults):
```bash
AWS_REGION=ap-south-1
S3_BUCKET_NAME=mohan12324234
S3_PREFIX_TICKETS=tickets
S3_PREFIX_QR=qr
S3_PREFIX_BANNERS=banners
S3_PREFIX_INVOICES=invoices
S3_PREFIX_LOGS=logs
```

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
