# Cart mechanics — the `_isGWP` contract, LIVE reconcile, and anti-loop guard

Scope: **ONE free gift, ONE threshold.** This is the load-bearing part.

## The gift marker

The auto-added gift line carries one property: **`_isGWP: "true"`** (detection also
accepts `true`, `1`, `"1"`). The managed gift is identified by **variant id AND
`_isGWP`** — a shopper's own manual add of the same product is never touched.

## Resolve the gift VARIANT id

`/cart/add.js` needs a **variant id**, not a product id:
`{{ settings.gwp_product.selected_or_first_available_variant.id }}`. Passing the
product id makes the add silently fail.

## Reconcile LIVE on every cart change — not just page load (CRITICAL)

The reconcile must run **immediately on any cart mutation, with NO page reload** —
this is a top reported failure (gift only adds/removes after refresh). The gift
manager must:

- run **once on load** (returning shopper already over threshold), AND
- re-evaluate after **every** cart change. Subscribe to the theme's native cart-update
  event. For Horizon, this is **`StandardEvents.cartLinesUpdate`** from `@shopify/events`
  — NOT `cart:update` (Horizon does not fire that). Wait for `event.promise` to resolve
  (morph is complete) before evaluating.

> **Horizon warning — do NOT intercept window.fetch:** Horizon morphs the cart section
> inside the same `/cart/change.js` request using a `sections` param. By the time a
> patched fetch handler fires, Horizon has already morphed the DOM without the gift.
> A subsequent re-render is REQUIRED (see theme-integration.md §5). Use the event above
> instead of fetch patching.

For non-Horizon OS 2.0 themes that do not dispatch a native event, intercepting
`window.fetch` / `XMLHttpRequest` for `/cart/add|change|update|clear` POSTs is an
acceptable fallback — but always follow the mutation with a re-render or dispatch
of the theme's own cart-update event so the DOM reflects the new gift line.

Never gate the reconcile behind the progress bar — it runs even if the bar isn't
visible.

## Auto-add — quantity ALWAYS 1, add ONLY when absent

```js
// only when meets && !has:
items: [{ id: giftVariantId, quantity: 1, properties: { _isGWP: "true" } }]
```

- The gift quantity is **hardcoded 1** — NEVER derived from another line's quantity or
  from how many times an event fired. (Raising Product A to qty 5 must add **one**
  gift, not five.)
- The add is **idempotent**: guard on `!has` plus the lock + memo below, so repeated
  cart events can't stack multiple gift lines.
- When the shopper's own add is what crosses the threshold, bundle the gift into that
  same `/cart/add.js`.

## Auto-remove / fix quantity

- Remove when the subtotal drops below the threshold: `/cart/change.js` line →
  `quantity: 0` (or `/cart/update.js`).
- If the gift quantity is ever ≠ 1, force it back to 1.
- Re-add if the shopper somehow removes it while still eligible.

## Render the gift line as LOCKED — no quantity control, no remove

In the cart drawer AND cart page, a line with `_isGWP` renders **read-only**: **hide
its quantity stepper and its remove/delete icon** (a "Free gift" badge is nice). The
shopper cannot change or delete the gift — the system owns it. Only `_isGWP` lines are
locked; normal lines keep their controls.

### REQUIRED — Read the cart row template before writing any lock selector

This is a mandatory step for **both** the Analyzer (planning) and Dev (implementing).
Guessing selectors is a silent failure — no error is thrown, `theme check` passes, but
the gift line renders with live controls the shopper can use.

**Before writing any `_lockGiftLines` JS or `[data-is-gwp]` CSS:**

1. **Find and READ the theme's cart line-item template.** Common locations:
   - Horizon: `blocks/_cart-products.liquid` — **WARNING: this file is a thin wrapper
     that just contains `{% render 'cart-products' %}`**. Follow the render call and
     read `snippets/cart-products.liquid` instead — that is where the actual row
     structure lives.
   - Dawn: `snippets/cart-items.liquid`
   - Other themes: grep for `cart-item` or `line_item` in `snippets/` and `blocks/`
   - **General rule:** if the block/snippet you open contains only a `{% render '...' %}`
     call with no HTML, follow it. The real structure is always one level deeper.

2. **From that file, identify and record:**
   - The **data attribute on the row wrapper element** (e.g. `data-line-item-key`,
     `data-cart-item-key`, `data-key`, `data-index`) — this is what `_lockGiftLines()`
     uses to find the row in the DOM
   - The **exact element/class of the quantity stepper** (input, custom element, or
     wrapper div)
   - The **exact element/class of the remove/delete button**

3. **Use ONLY those confirmed values** — in both `gwp.js._lockGiftLines()` and the
   `[data-is-gwp='true'] ...` rules in `gwp.css`.

The Analyzer's plan MUST name the cart row file it will read. A plan that skips this
and lists generic selectors (`.quantity`, `.remove-item`, `.cart-remove-button`) is
incomplete — the Validator must reject it.

## The reconcile + anti-loop guard (REQUIRED)

```js
const meets = subtotalCents >= threshold;   // subtotal EXCLUDING the gift line
const gift  = findManagedGift(cart);         // variantId + _isGWP
const has   = !!gift, qty = gift?.quantity ?? 0;

if (meets && !has)                add();      // qty 1, once
else if (!meets && has)           remove(gift);
else if (meets && has && qty!==1) setQty(gift, 1);
```

Adding/removing the gift changes the cart → fires another event → re-enters this. Two
guards stop the loop:

1. **Mutation lock** — set before any add/remove/qty call, clear in `finally`; while
   locked, `evaluate()` returns early.
2. **State memoization** — cache `{ meets, has, qty, total }`; if unchanged, return.

Also **ignore transient zero totals** (a brief `0` during async refresh when the last
total was > 0 and < ~400ms ago) so the gift isn't wrongly removed.

## Threshold math

Work in **integer cents** against the single threshold, on the **non-gift subtotal**:
sum non-`_isGWP` line prices (`item.final_line_price`), not raw `cart.total_price` —
because a discount-backed gift's catalog price is still in `total_price`
(free-gift-enforcement.md).

## Acceptance criteria (validator MUST enforce)

- The gift quantity is **always exactly 1**, independent of other line quantities — it
  never multiplies.
- Add/remove happen **live via Ajax on every cart change (no refresh)** — on load and
  after any `/cart/*` mutation.
- The gift line renders with **no quantity control and no remove button**.
- Identified by variant id + `_isGWP`; a manual same-product add is untouched.
- A **lock + memoization** guard is present; the reconcile cannot loop.
- Threshold computed on the **non-gift subtotal in cents**.
- Lock selectors in `gwp.js` and `gwp.css` were sourced from the actual cart row
  template file — the Analyzer plan names that file explicitly.
