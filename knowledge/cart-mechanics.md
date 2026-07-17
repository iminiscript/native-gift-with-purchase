# Cart mechanics — the `_isGWP` contract + the anti-loop reconcile (get this right)

This is the load-bearing part. The reconcile mutates the cart (adds/removes the gift),
which fires another cart update — **without the guard below it infinite-loops.**

## The gift line-item property contract

The auto-added gift line carries:

| Property | Value | Role |
|---|---|---|
| `_isGWP` | `"true"` | marks the line as a system-managed gift. Detection accepts `"true"`, `true`, `1`, `"1"`. |
| `_gwp_tier` | `"<n>"` | which tier/threshold added it (string), for multi-tier setups. |

- Leading underscore = hidden line-item property. Keep it.
- The gift is identified by **variant id AND `_isGWP`** — so a shopper's own manual
  add of the same product is NOT treated as the managed gift and is never auto-removed.

## Auto-add

When the trigger threshold is met and no managed gift is present, add it in one call:

```js
await fetch(`${Shopify.routes.root}cart/add.js`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({
    items: [{ id: giftVariantId, quantity: 1,
              properties: { _isGWP: "true", _gwp_tier: String(tier) } }],
    sections: cartSectionsToRender,   // morph the drawer in the same round-trip
  }),
});
```

**Bundle into the triggering add.** When the shopper's own add-to-cart is what pushes
the subtotal over the threshold, append the gift item to **that** `/cart/add.js`
`items` array instead of firing a second request — fewer round-trips, no flicker.

## Auto-remove / fix quantity

- **Remove** when the subtotal drops below the threshold: `/cart/change.js` with the
  gift's 1-based `line` and `quantity: 0` (or `/cart/update.js` by line/id).
- **Fix quantity** to 1 if the shopper changed it (`meets && has && qty !== 1`).
- **Re-add** if the shopper deletes the gift while still eligible (next evaluate sees
  `has === false && meets === true`).

## The reconcile — and the anti-loop guard (REQUIRED)

Evaluate on every cart change:

```js
const meets = subtotalCents >= targetThreshold;   // subtotal EXCLUDING gift lines
const gift  = findManagedGift(cart);               // variantId + _isGWP
const has   = !!gift, qty = gift?.quantity ?? 0;

if (meets && !has)              add();
else if (!meets && has)         remove(gift);
else if (meets && has && qty!==1) setQty(gift, 1);
```

Two guards make it safe:

1. **Mutation lock** — set a lock before any add/remove/qty call and clear it in a
   `finally`. While locked, `evaluate()` returns early. Prevents concurrent/overlapping
   mutations (each of which triggers another cart update).
2. **State memoization** — cache `{ meets, has, qty, total }` from the last evaluate;
   if unchanged, return immediately. This is what stops the add→cart-update→evaluate→…
   loop from repeating once the state has settled.

Also **ignore transient zero totals**: during an async cart refresh `total_price` can
briefly read `0`; if the last known total was > 0 and < ~400ms elapsed, skip that
update so the gift isn't wrongly removed and the bar doesn't flash to 0%.

## Threshold math — compute on the NON-gift subtotal

- Work in **integer cents**.
- The trigger subtotal must **exclude the gift line** (and any other `_isGWP` lines).
  If the gift is a real $0 product it contributes 0 anyway; but if it's made free via a
  Shopify automatic discount, its **catalog price is still in `total_price`** — so
  summing non-`_isGWP` line prices (`item.final_line_price`) is the safe, correct
  basis, not raw `cart.total_price` (free-gift-enforcement.md, gotchas.md).
- Respect the merchant's chosen basis (subtotal vs original/pre-discount) if exposed
  as a setting.

## Acceptance criteria (validator MUST enforce)

- The gift is added with `_isGWP: "true"` (+ `_gwp_tier`) and identified by variant id
  + `_isGWP`; a manually-added same product is never auto-removed.
- Add is a single `/cart/add.js` (bundled into the triggering add when applicable);
  remove is `/cart/change.js` qty 0.
- A **lock + state memoization** guard is present and transient zeros are ignored —
  the reconcile provably cannot loop.
- The trigger threshold is computed on the **non-gift subtotal in cents**.
