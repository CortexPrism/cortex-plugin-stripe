# Changelog

## [Unreleased]

### Added
- Structured logging via ctx.logger in lifecycle hooks

### Changed
- Renamed manifest file from `cortex.json` to `manifest.json` for consistency with Cortex standard
- Standardized UI section structure to `ui.settings` format
- Normalized parameter naming: `defaultValue` → `default`, `options` → `enum`
- Added `homepage` field with repository URL
- Added `dependencies` field to manifest

## [1.0.1] — 2026-06-15

### Added
- Initial release
## [1.0.1] — 2026-06-17

### Added

- Initial project setup

## [1.0.0] — 2026-06-15

### Added

- Initial release of cortex-plugin-stripe
- `stripe_list_customers` — List customers with email filter
- `stripe_get_customer` — Get customer details
- `stripe_list_products` — List products and prices
- `stripe_create_checkout` — Create checkout sessions
- `stripe_list_subscriptions` — List subscriptions by status
- `stripe_revenue_report` — Generate revenue summary reports
