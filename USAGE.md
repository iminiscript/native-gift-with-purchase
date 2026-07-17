# native-gift-with-purchase — usage & manual steps

Theme Factory builds a native, no-app gift-with-purchase: a tiered cart progress bar
and automatic add/remove of a configured gift when a spend threshold is met. TF builds
the theme code — the merchant configures the thresholds/gift and makes the gift free.

## What TF does (automatic)

| What | How |
|---|---|
| Progress bar | Tiered meter in cart drawer + cart page (optional PDP message) |
| Auto-add gift | Single `/cart/add.js` with `_isGWP:"true"` + `_gwp_tier` when the threshold is met (bundled into the triggering add when possible) |
| Auto-remove | `/cart/change.js` qty 0 when the subtotal drops below the threshold |
| Keep qty 1 / re-add | Fixes tampered quantity; re-adds if deleted while eligible |
| Anti-loop reconcile | Mutation lock + state memoization + transient-zero handling |
| Threshold math | Computed on the non-gift subtotal, in cents |

## What TF does NOT do — merchant manual steps

| Task | Where | Notes |
|---|---|---|
| Choose the gift + thresholds | Theme editor | Set `gwp_product`, thresholds, labels, trigger tier, messages |
| **Make the gift free** | Shopify admin | **Required** — either set the gift to a **$0** price, OR create a Shopify **automatic discount** that makes it free when in the cart. Otherwise checkout charges for it. |
| Enable the feature | Theme editor | `enable_gwp` (+ `enable_gwp_pdp` for the PDP message) |

## Making the gift free — pick ONE

- **A — $0 product (simplest):** set the gift product/variant price to $0. Free
  everywhere, contributes $0 to the subtotal. Recommended.
- **B — automatic discount (no app):** keep the gift normally priced and add a Shopify
  automatic "free gift" discount. Note the cart may show the gift at full price until
  checkout applies the discount; the threshold is computed on the non-gift subtotal so
  this still triggers correctly.

## After TF delivers

1. Set the gift product, thresholds, labels, trigger tier, and messages in the editor.
2. Make the gift free (A or B) and verify with a test cart that crossing the threshold
   adds a **free** gift and dropping below removes it.
3. QA the checklist.

## QA checklist

- [ ] Progress bar renders in the cart drawer AND cart page and updates as the cart
      changes.
- [ ] Crossing the threshold auto-adds the gift (one line, `_isGWP`), qty 1.
- [ ] Dropping below the threshold removes the gift.
- [ ] Deleting the gift while eligible re-adds it; changing its qty resets to 1.
- [ ] No reconcile loop / no cart thrash (lock + memoization working).
- [ ] Gift is actually **free** at checkout (enforcement A or B active).
- [ ] A shopper's own manual purchase of the same product is NOT auto-removed.
- [ ] Assets load only on cart/PDP, not site-wide.

## Common "it's not working" causes

| Symptom | Likely cause | Fix |
|---|---|---|
| Cart thrashes / spins | Missing lock or memoization | Add the anti-loop guard (cart-mechanics.md) |
| Gift never removed / bar stuck | Threshold on raw total incl. gift price | Compute on non-gift subtotal |
| Gift charged at checkout | No $0 price and no automatic discount | Enable enforcement A or B |
| Shopper's own item removed | Matching on variant id only | Match variant id + `_isGWP` |
| Progressbar/gift dead | `<div>` root / declarative markup, or push schema error | theme-integration.md |
