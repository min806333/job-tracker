# Stripe Operations

## Webhook Idempotency
- The `public.webhook_logs` table uses `event_id` as the primary key.
- Webhook processing inserts an `info` log row first (on conflict do nothing).
- If the insert is skipped because the event already exists, the webhook returns 200 without processing.

## Success Polling
- After checkout, users are redirected to `/dashboard/plan/success`.
- The page polls `/api/profile/plan` until `plan` becomes `pro` or a 60s timeout is reached.
- Polling frequency: every 2s for 20s, then every 5s.

## Admin Monitoring
- Admin page: `/dashboard/admin/subscriptions`
- Filters: status, severity, and search (user_id or subscription_id).
- Detail view: `/dashboard/admin/subscriptions/[subscriptionId]` shows subscription fields and recent webhook logs.
- Requires `profiles.is_admin = true`.

## Local Stripe CLI Test
1. Start the app:
```bash
npm run dev
```
2. Forward webhooks:
```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```
3. Trigger events:
```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```
