# Gotchas — the traps that break a native GWP

## 1. Infinite reconcile loop (the big one)

Adding/removing the gift changes the cart, which fires another cart update, which
re-runs the reconcile → loop. You MUST guard with a **mutation lock** (skip evaluate
while a mutation is in flight) AND **state memoization** (`{meets,has,qty,total}`;
return early if unchanged). Missing either → the cart thrashes and hammers the Ajax
API (cart-mechanics.md).

## 2. Threshold counts the gift's own price

If the gift is made free via a Shopify automatic discount (not a $0 product), its
catalog price is still in `cart.total_price`. Computing the threshold on raw
`total_price` then includes the gift and can cause a feedback wobble (add gift → total
jumps → stays "met" → …). Compute on the **non-gift subtotal** (sum non-`_isGWP`
`final_line_price`) in cents (free-gift-enforcement.md).

## 3. Theme tries to make the gift free

You can't set a line price to $0 client-side. The gift is free via a **$0 product** or
a **merchant automatic discount** — never via theme price manipulation. Surface this
as a required merchant step (free-gift-enforcement.md).

## 4. Managing a shopper's own copy of the gift product

Identify the managed gift by **variant id + `_isGWP`**. If you match on variant id
alone, a shopper who genuinely buys that product gets it auto-removed. Only touch lines
carrying `_isGWP`.

## 5. Transient zero total removes the gift / flashes the bar

During async refreshes `total_price` can briefly be `0`. Ignore a `0` total if the
last known total was > 0 and < ~400ms elapsed, or the gift gets wrongly removed and the
bar flashes to 0%.

## 6. Quantity/removal by line number that shifted

Line numbers change as the cart changes. Recompute the gift's 1-based line at
mutation time (or address it by line-item `key`). Hold the gift at quantity 1.

## 7. Dollars vs cents

Settings are entered in dollars; all logic + data attributes are **cents**. Convert
with `| times: 100` and keep every comparison in cents.

## 8. Declarative markup / `<div>` root (dead component)

`on:click="/…"` / `ref="…"` do nothing without the host framework; a `<div>` root
means the custom element never attaches. Wire in JS; the component's root element is
its custom-element tag (theme-integration.md).

## 9. `limit` in a theme block's own schema / undefined block type → push fails

Shopify rejects these at push time (theme check misses them). No `limit` in a block's
own schema; every referenced block `type` must match a real block file
(theme-integration.md).

## 10. Loading GWP assets globally

Reference `gwp.js`/`gwp.css` from the cart (and PDP) snippets so they load only where
used — not from global `layout/theme.liquid`.

## 11. Editing volatile template JSON

Don't modify the merchant's existing `templates/*.json` — the theme editor overwrites
it ([[plugins-avoid-template-json]]). Ship stable code (+ optional net-new template).

## 12. Gift out of stock / unavailable

If the configured gift variant is unavailable, adding fails. Detect and degrade
(hide the "unlocked" state / log `[GWP]`) rather than retrying a rejected add.
