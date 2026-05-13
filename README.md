# TicketPulse MVP (Single App Service)

Interactive MVP of an event ticket platform covering customer and admin journeys.

## Architecture
- `app`: one Next.js application service that owns all API routes under `/api/*`
- `db`: PostgreSQL service exposed through `DATABASE_URL`
- `redis`: Redis service exposed through `REDIS_URL`
- `/api/gateway/{domain}/...` is kept as a legacy compatibility proxy and now returns `X-Legacy-Gateway: deprecated`
- `/api/health` reports the app status and checks TCP reachability for the `db` and `redis` services

## API domains inside the single app service
- Auth: `/api/auth`
- User: `/api/user`
- Events: `/api/events`
- Venues: `/api/venues`
- Inventory: `/api/inventory`
- Bookings: `/api/bookings`
- Payments: `/api/payments`
- Notifications: `/api/notifications`
- Search: `/api/search`
- Admin: `/api/admin`
- Reporting: `/api/reporting`
- Storage: `/api/storage`

## Runtime note
The current MVP still uses in-memory application state for demo data, but the Docker topology is now a single app service with dedicated Redis and PostgreSQL dependency services.

## Environment
Copy `.env.example` to `.env`, then fill in your AWS credentials so storage uploads can reach S3.

```bash
APP_ARCHITECTURE=single-service
DATABASE_URL=postgresql://ticketpulse:ticketpulse@db:5432/ticketpulse
REDIS_URL=redis://redis:6379
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=mohan12324234
S3_PREFIX_TICKETS=tickets
S3_PREFIX_QR=qr
S3_PREFIX_BANNERS=banners
S3_PREFIX_INVOICES=invoices
S3_PREFIX_LOGS=logs
PINGRAM_API_KEY=pingram_sk_your_secret_key
PINGRAM_REGION=us
PINGRAM_SENDER_NAME=TicketPulse
# Optional for development. Leave empty to use Pingram-managed sender identity.
PINGRAM_SENDER_EMAIL=
PINGRAM_OTP_NOTIFICATION_TYPE=signup_otp
SIGNUP_OTP_EXPIRY_MINUTES=10
SIGNUP_OTP_MAX_ATTEMPTS=5
```

For signup OTP email delivery, configure `PINGRAM_API_KEY`.
`PINGRAM_SENDER_EMAIL` is optional in development.
From `app.pingram.io` API Keys screen, use only the **API Key** value (starts with `pingram_sk_`) for `PINGRAM_API_KEY`.
Do not use Client Id, Client Secret, or Public Key for server-side OTP sending.
For production, verify your sender domain in Pingram before setting a custom `PINGRAM_SENDER_EMAIL`.

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

Services:
- app: `http://localhost:3000`
- db: `localhost:5432`
- redis: `localhost:6379`

Health endpoint:
- `GET /api/health`

Stop containers:
```bash
docker compose down
```

## Access control note
- Admin navigation/menu appears only for users with `role=admin`.
- Non-admin users are blocked from viewing the admin dashboard page.
