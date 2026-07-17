# native-gift-with-purchase

A Theme Factory **integration plugin** that teaches the pipeline to build a **native,
no-app gift-with-purchase (GWP)** experience for Shopify **Online Store 2.0** themes
(e.g. Horizon).

**Author:** [iminiscript](https://github.com/iminiscript)

---

## What it does

Automatically adds ONE configured **free gift** to the cart when the shopper's spend
crosses a single threshold, shows a **progress bar** ("spend $X more for your free
gift") in the cart drawer/page (plus an optional PDP message), keeps the gift at
quantity 1, and removes it when the cart drops back below the threshold — **without any
third-party gift/rewards app**. One gift, one threshold — no tiers.

When a task mentions a gift with purchase / free gift / GWP / cart spend-goal bar, the
plugin's `description` matches, Theme Factory engages it, and its knowledge drives the
analyzer, dev, and validator agents.

---

## How it works

- The gift is a normal cart line marked with the `_isGWP: "true"` line-item property,
  added via `/cart/add.js` and removed via `/cart/change.js`.
- A **reconcile** runs on every cart change: add if the threshold is met and the gift
  is absent, remove if below, fix quantity to 1 if tampered.
- An **anti-loop guard** — a mutation **lock** + **state memoization**
  (`{meets,has,qty,total}`) + transient-zero handling — stops the reconcile (which
  itself changes the cart) from looping.
- The trigger threshold is computed on the **non-gift subtotal** in cents.
- The gift is made **free by the merchant** — a **$0 product** or a **Shopify
  automatic discount** — the theme never manipulates price.

---

## Requirements

- Shopify **Online Store 2.0** theme with theme-blocks (e.g. Horizon). Not for
  vintage/legacy themes.
- No app, no store credentials, no SDK.
- (Optional) esbuild on the `tf` host to activate the bundled Shopify Dev MCP tools;
  works knowledge-only without it.

---

## Contributes

- **Knowledge** (`knowledge/`):
  | File | Covers |
  |---|---|
  | `overview.md` | directive, OS 2.0 target, acceptance criteria, where code lives |
  | `cart-mechanics.md` | the `_isGWP` contract, add/remove, and the anti-loop reconcile (load-bearing) |
  | `progress-and-config.md` | progress bar, messaging, customizer settings |
  | `free-gift-enforcement.md` | how the gift becomes free ($0 product or automatic discount) |
  | `theme-integration.md` | OS 2.0 blocks, JS wiring, cross-component state, push-valid schema |
  | `gotchas.md` | the 11 traps |
- **Tools** (`tools.ts`): Shopify Dev MCP for build-time cart/variant lookups.
- No `storeSettings`, no `sdk` — native build, no external service.

---

## How to use

```bash
# dev — always runs your latest local copy:
tf run <task.md> --with-plugin ./native-gift-with-purchase

# or install permanently:
zip -r native-gift-with-purchase.zip native-gift-with-purchase
tf plugin install ./native-gift-with-purchase.zip
tf run <task.md>
```

A task can stay plain-language — the plugin owns the mechanics:

```markdown
# Task
Add a free gift when the cart reaches $100, with a progress bar in the cart showing
how much more the shopper needs to spend. Let the merchant pick the gift and the
threshold from the theme editor.
```

Confirm engagement via `[plugins] Engaged: native-gift-with-purchase` and the
`INTEGRATION PLUGINS` section of `logs/<runId>.log`. Merchant setup (choose gift +
thresholds, make the gift free) is in `USAGE.md`.

---

## Scope

Native theme build only. NOT a third-party gift/upsell/rewards app (Rebuy, etc.), NOT
authoring the automatic discount, NOT a loyalty program, NOT the build-your-own-bundle
builder (use `native-bundle-builder`). Never edits volatile `templates/*.json`.

---

*Pattern derived from a production theme's native GWP — the `_isGWP` contract, the
progress bar, and lock + memoization reconcile. Scoped to a single gift + single
threshold (no tiers).*
