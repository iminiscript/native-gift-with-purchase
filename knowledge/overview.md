# Native gift-with-purchase (GWP) — overview

## Target platform — Online Store 2.0 only

This plugin targets **Shopify Online Store 2.0 themes with theme-blocks** (e.g.
Horizon). It is **NOT** for vintage/legacy themes. It relies on OS 2.0 primitives:
JSON templates, theme blocks/sections, section `{% schema %}` settings, and the cart
Ajax API. If the theme is not OS 2.0, flag a blocking mismatch.

## Tasks stay simple — this plugin owns the "how"

A task should only ask, in plain merchant language, for a gift-with-purchase / free
gift / cart progress bar — e.g. *"add a free gift when the cart reaches $100, with a
progress bar in the cart."* It should NOT specify the mechanics. **This plugin fully
specifies the native behavior**: auto-add/remove, the `_isGWP` line-item contract, the
anti-loop reconcile, threshold math, and how the gift becomes free. Produce that
behavior whether or not the task mentions it.

## Directive — REQUIRED

This store offers a **native, no-app gift-with-purchase**: when the cart subtotal
crosses a configured spend threshold, a **configured gift product is automatically
added to the cart** as a line marked with the `_isGWP` property; a **tiered progress
bar** ("spend $X more for a free Y") shows in the cart drawer/page (and optionally as
a PDP message); the gift's quantity is held at **1**; and the gift is **removed** if
the cart drops back below the threshold.

There is **NO gift/rewards app**. The theme only **adds/removes the gift line and
renders progress**. Making the gift actually **free** is the merchant's setup — a **$0
product/variant** or a **Shopify automatic "free gift" discount** — the theme NEVER
manipulates price (free-gift-enforcement.md).

## If the task shows a GWP / progress bar, the plan + acceptance criteria MUST require

1. a **tiered progress bar** (up to 5 thresholds + a $0 start) rendered in the cart
   drawer AND cart page, driven by the cart subtotal, with thresholds/labels/messages
   from **theme settings** (progress-and-config.md); optional PDP mirror message.
2. **auto-add** the configured gift via a single `/cart/add.js` carrying
   `properties: { _isGWP: "true", _gwp_tier: "<n>" }` when the trigger threshold is
   met; when the shopper's add is what crosses the threshold, **bundle the gift into
   that same add request** (cart-mechanics.md).
3. **auto-remove** the gift (`/cart/change.js` line → quantity 0) when the subtotal
   drops below the threshold; **re-add** it if the shopper deletes it while still
   eligible; **fix quantity to 1** if tampered (cart-mechanics.md).
4. an **anti-loop guard** — a mutation **lock** plus **state memoization**
   (`{ meets, has, qty, total }`), and **transient-zero** handling — so reconciling
   the gift (which itself changes the cart) never loops (cart-mechanics.md). **#1
   correctness criterion.**
5. the **trigger threshold computed on the NON-gift subtotal** (exclude `_isGWP`
   lines and any $0 gift), in **integer cents** (cart-mechanics.md).
6. the gift identified by **variant id + `_isGWP`** so a shopper's own manual add of
   the same product is never auto-managed (cart-mechanics.md).
7. a documented **free-gift enforcement** path — $0 product OR merchant automatic
   discount — and the build must **not** try to zero the price in theme code
   (free-gift-enforcement.md).
8. progress + success **messaging** with `{{ amount_away }}` / `{{ next_tier }}`
   placeholders, and graceful transient-state handling (progress-and-config.md).
9. OS 2.0 correctness — the progress bar is an **addable block/section** with a
   **custom-element root**, all interaction **wired in JS**, cross-component state via
   a **page-level singleton or cart events**, and **push-valid `{% schema %}`**
   (theme-integration.md). The theme must PUSH with zero file errors.
10. assets loaded **only where used** (cart + optional PDP), never global; **never
    edit volatile `templates/*.json`**.
11. **error handling + diagnostics** — surface cart-mutation failures; log `[GWP]`
    warnings for config/shape problems.
12. **everything merchant-configurable from the theme editor** — the gift product
    (schema product picker), thresholds/labels/messages, a **master on/off toggle**
    (`enable_gwp` hides the whole feature), AND the **full appearance set** (title,
    background, track/fill/marker colours, bar height, corner radius, font sizes,
    padding) applied via CSS custom properties from settings. Nothing hardcoded; range
    settings carry `min/max/step/unit/default` and colours a `default`
    (progress-and-config.md, theme-integration.md).

## Where the code lives — stable theme code only

Follow [[plugins-avoid-template-json]] — stable code only, at most a net-new template.

```
snippets/gwp-progress-bar.liquid     the tiered progress bar (rendered in cart drawer + cart page)
snippets/gwp-pdp-message.liquid      OPTIONAL PDP "spend $X for a free gift" message
assets/gwp.js                        progress paint + tier manager (auto add/remove, lock+memo reconcile)
assets/gwp.css                       neutral base styling (restyled by theme tokens)
(config)                             GWP settings added to the theme's settings_schema group
```

Render the progress bar inside the existing cart drawer + cart snippets (or as an
addable block). Load `gwp.js`/`gwp.css` only on templates that use them — never from
global `layout/theme.liquid`.

## Scope

- **In scope:** native auto-add/remove gift on a spend threshold, tiered progress
  bar, PDP message, quantity lock to 1, reconcile guard.
- **Out of scope:** third-party gift/upsell/rewards apps (Rebuy, etc.); authoring the
  Shopify automatic discount itself; loyalty programs; the build-your-own-bundle
  builder (that's `native-bundle-builder`); editing volatile template JSON.

## Reference

Pattern derived from a production theme's native GWP. See cart-mechanics.md for the
load-bearing `_isGWP` contract + anti-loop reconcile, progress-and-config.md for the
bar/messages/settings, free-gift-enforcement.md for how the gift is free,
theme-integration.md for OS 2.0 correctness, and gotchas.md for the traps.
