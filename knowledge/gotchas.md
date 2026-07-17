# Gotchas — the non-obvious traps (each mapped to a real observed failure)

Rules already stated in a topic file (threshold math, enforcement, cents, template
JSON, assets) are not repeated here.

## 1. Infinite reconcile loop (the big one)

Adding/removing the gift changes the cart → fires another cart event → re-runs the
reconcile → loop. Guard with a **mutation lock** + **state memoization**
(`{meets,has,qty,total}`) and ignore transient zero totals (cart-mechanics.md).

## 2. Gift only updates on page refresh, not live (reported)

If the gift adds/removes only after a reload, the reconcile is running just on page
load. It must re-evaluate on **every** cart change with no refresh: subscribe to the
theme's cart-update event AND **intercept `/cart/add|change|update|clear` writes**
(wrap `fetch`/XHR) so native quantity steppers and other apps also trigger it
(cart-mechanics.md "Reconcile LIVE").

## 3. Gift multiplies (added N times) when a product's quantity is raised (reported)

Raising Product A to qty 5 to hit the threshold must add **one** gift, not five. The
gift quantity is **hardcoded 1** — never derived from another line's quantity or from
how many events fired — and the add is idempotent (`!has` + lock + memo)
(cart-mechanics.md).

## 4. Gift is editable / removable in the cart (reported)

The shopper must not change or delete the gift. Render `_isGWP` lines **locked** —
hide the quantity stepper and the remove/delete icon; only that line, not normal items
(cart-mechanics.md "Render the gift line as LOCKED").

## 5. Managing a shopper's own copy of the gift product

Identify the managed gift by **variant id + `_isGWP`**. Matching on variant id alone
auto-removes a product the shopper genuinely bought. Only touch `_isGWP` lines.

## 6. Placeholder tokens in a setting default → Liquid syntax error

`{{ amount_away }}` in a setting output via `{{ ... | default: 'Spend {{ amount_away }} …' }}`
nests `{{ }}` inside a string → *"Unexpected character"*. Build the message by
concatenation with the amount in its own `<span>` (progress-and-config.md).

## 7. Progress fill width set via CSS instead of JS

The fill's width is dynamic — set it inline in JS (`fill.style.width = pct + '%'`).
CSS custom properties handle colour/height/radius only (progress-and-config.md).

## 8. Declarative `on:click`/`ref` markup or a `<div>` root → dead component

`on:click`/`ref` do nothing without the host framework; a `<div>` root means the
custom element never attaches. The component's **root is its custom-element tag**;
wire events in JS (theme-integration.md).

## 9. Push-schema errors (`theme check` misses them)

`limit` is not valid in a theme block's own schema; every referenced block `type` must
match a real block file. Both fail at **push** even when `theme check` passes
(theme-integration.md).

## 10. Gift never adds at all

Check: `enable_gwp` is off (defaults false); a **product** id was passed instead of a
**variant** id; the reconcile isn't wired (gotcha 2); or the gift variant is
unavailable (cart-mechanics.md).

## 12. Cart row block file is a thin wrapper — selectors still guessed (Horizon-specific)

In Horizon, `blocks/_cart-products.liquid` contains only `{% render 'cart-products' %}`.
If the Analyzer reads only the block file and stops there, it finds no HTML and no
selectors — and the Dev falls back to guessing anyway, defeating the purpose of the
required read.

**Fix:** Follow every `{% render '...' %}` call encountered when looking for cart row
structure. In Horizon the actual row HTML — including `data-key`, `quantity-selector`,
and `button.cart-items__remove` — is in `snippets/cart-products.liquid`. The plan must
name `snippets/cart-products.liquid` as the file read, not the block wrapper.

## 11. Gift line locking uses guessed selectors — silent failure (reported)

If `_lockGiftLines()` and the `[data-is-gwp='true']` CSS rules use generic class names
(`.quantity`, `.remove-item`, `.cart-remove-button`, etc.) without reading the actual
cart row template, the lock silently does nothing — the gift line renders with a
quantity stepper and a remove button the shopper can use. `theme check` passes and no
error is thrown.

**This is the most common locking failure.** The Analyzer must read the theme's cart
row template and name it in the plan before the Dev writes a single selector. See
cart-mechanics.md "REQUIRED — Read the cart row template before writing any lock
selector" for the exact steps.
