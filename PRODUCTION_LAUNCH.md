# FinCity Production Launch Runbook

## Recommended production stack
- Hosting: Vercel
- Database / realtime / storage / auth: Supabase
- Login: Google + Apple at launch; Facebook optional; email magic-link fallback without passwords
- Payments: Stripe Checkout / PaymentIntents
- Marketplace payouts for user-to-user resales: Stripe Connect
- Maps: existing FinCity map stack

## Important payment model
Customer card payments settle to the FinCity Stripe merchant balance and are paid out to FinCity's verified business bank account. Do not route merchant revenue to a personal credit card.

For primary City Drops:
1. User is authenticated.
2. Before bidding, store an eligible payment method with explicit consent using Stripe SetupIntent.
3. Bids are stored server-side.
4. Server closes auction at the canonical end time.
5. Winner is charged using a PaymentIntent. If SCA is required, show a payment-completion flow.
6. Transfer digital ownership only after a verified Stripe webhook confirms successful payment.

For future secondary sales:
- use Stripe Connect for seller onboarding, KYC and payouts;
- never hold seller/customer funds in a browser wallet.

## Production database entities
- profiles
- cities
- digital_buildings
- auctions
- bids
- ownership_history
- payments
- notifications
- citybook_posts
- citybook_comments
- citybook_likes
- conversations
- messages
- moderation_reports
- audit_log

## Auction invariants
- All bids server-side; never trust localStorage.
- Server time is authoritative.
- Database transaction / locking for every bid.
- Amount must exceed current bid by configured increment.
- User may not bid on own listing.
- One immutable closing timestamp per auction.
- Idempotency keys for payment and settlement operations.
- Ownership changes only after successful payment webhook.
- Admin actions protected by server-side roles and MFA.
- Full audit trail.

## Production environment variables
Configure as Vercel Secrets/Config, never commit secrets to Git.

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
APP_BASE_URL=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

## Required launch pages
- Legal notice / company identity and contact
- Terms of Service
- Auction Rules
- Privacy Policy
- Payment / refund / chargeback policy
- Community Guidelines for Citybook
- Reporting / blocking / moderation information

## Security
- HTTPS only
- Supabase Row Level Security
- admin MFA
- rate limiting
- CSRF / origin validation for sensitive endpoints
- Stripe webhook signature verification
- backups and recovery test
- monitoring and alerting
- no secrets in browser bundles
- content moderation/reporting for Citybook

## Launch gate
Real-money launch is allowed only when:
- Stripe business account is live and payout bank account verified
- Supabase production project configured
- OAuth production credentials configured
- server-side auctions and database are live
- Stripe test payment + webhook + refund tested
- legal texts reviewed for the exact FinCity digital-property business model
- privacy and consent flows are live
- admin access is server-side and MFA-protected
- end-to-end auction test completed on production infrastructure

Until all gates are green, run a closed beta with test money only.
