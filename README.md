# Easy2Book Travel Planner

AI-powered trilingual travel companion for Tunisia and beyond. Built with Next.js 15, Tailwind CSS v4, shadcn/ui, Drizzle ORM, Neon Database, OpenAI GPT-4o / Whisper, and Meta Pixel / Conversions API.

## Features

- **Trilingual AI Chat**: French, English, and Tunisian Derja with automatic language mirroring.
- **Voice-to-Text**: WhatsApp-style touch-down recording, cross-browser support (Android / iOS), powered by OpenAI Whisper.
- **Smart Pricing Engine**: Provider prices are filtered through `pricing_rules` markup / discount / override logic before reaching the user.
- **Lead Qualification**: Inline booking form that sanitizes Tunisian phone numbers and generates structured WhatsApp manifests.
- **Meta Tracking**: Dual-layer Pixel + Conversions API with shared `eventId` deduplication.
- **Mobile-First UI**: `h-dvh` layouts optimized for smartphones and in-app webviews.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `OPENAI_API_KEY` | OpenAI API key |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Agency WhatsApp number (E.164) |
| `NEXT_PUBLIC_BRAND_EMAIL` | Public contact email |
| `NEXT_PUBLIC_FACEBOOK_URL` | Facebook page URL |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Instagram page URL |
| `NEXT_PUBLIC_WEBSITE_URL` | Agency website URL |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel ID |
| `META_ACCESS_TOKEN` | Meta Conversions API access token |

## Getting Started

```bash
npm install
npx drizzle-kit push
npx tsx src/db/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Build

```bash
npm run build
```

## Database

- Driver: `@neondatabase/serverless`
- ORM: `drizzle-orm`
- Migrations: `drizzle-kit`

## Deployment

This project is configured for Vercel:

1. Push the repository to GitHub.
2. Import the project in the Vercel dashboard.
3. Add the environment variables from `.env.example`.
4. Deploy.

Vercel will automatically run `npm run build` on every push.

## Security Headers

Security headers are configured in `vercel.json`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(self), geolocation=()`

## License

Private — Easy2Book.
