# Stripe Billing & Payments

Manage Stripe products, prices, subscriptions, invoices, and customers from CortexPrism.

## Installation

```bash
cortex plugin install marketplace:cortex-plugin-stripe
cortex plugin install github:CortexPrism/cortex-plugin-stripe
cortex plugin install ./manifest.json
```

## Configuration

| Key                    | Type   | Required | Description                             |
| ---------------------- | ------ | -------- | --------------------------------------- |
| `stripeSecretKey`      | secret | yes      | Secret key (sk_live_... or sk_test_...) |
| `stripePublishableKey` | text   | no       | Publishable key                         |

## Tools

### stripe_list_customers — List customers

- `limit` (number, default `20`)
- `email` (string, optional)

### stripe_get_customer — Get customer details

- `customer_id` (string, required)

### stripe_list_products — List products/prices

- `active_only` (boolean, default `true`)
- `limit` (number, default `20`)

### stripe_create_checkout — Create checkout session

- `customer_id` (string, required)
- `price_id` (string, required)
- `success_url` (string, required)
- `cancel_url` (string, required)
- `quantity` (number, default `1`)

### stripe_list_subscriptions — List subscriptions

- `customer_id` (string, optional)
- `status` (enum: `active`, `past_due`, `canceled`, `all`, default `active`)

### stripe_revenue_report — Revenue report

- `period` (enum: `daily`, `weekly`, `monthly`, `yearly`)
- `start_date` (string, optional) — YYYY-MM-DD

## Capabilities

- `tools` — Tool execution
- `network:fetch` — HTTPS to Stripe API

## Development

```bash
deno task test
deno fmt --check
deno lint
```

## License

MIT
