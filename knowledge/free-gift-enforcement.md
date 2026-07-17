# How the gift becomes FREE — merchant setup, not theme code

## The theme never zeroes the price

The theme **adds and removes the gift line** and renders progress. It must **NOT** try
to make the gift free in theme code (you can't set a line price to $0 client-side, and
faking it desyncs from what Shopify charges). Making the gift free is the **merchant's
setup**, one of two ways:

### Option A — $0 product / variant (simplest)
The gift product/variant is priced **$0** in Shopify. It's free everywhere with zero
extra config, and it contributes 0 to the cart subtotal automatically.
- Merchant note (surface in USAGE + a setting help text): *"The selected gift product
  should be a $0 item (or covered by an automatic discount)."*

### Option B — Shopify automatic "free gift" discount (no app)
The gift is a normally-priced product, and a **Shopify automatic discount** in admin
makes it free when it's in the cart (e.g. "buy X, get Y free" / amount-off the gift).
- **Important consequence:** with a normally-priced gift, its price **is still in
  `cart.total_price`** until Shopify applies the discount at checkout. So:
  - compute the **trigger threshold on the NON-gift subtotal** (sum non-`_isGWP`
    `final_line_price`), not raw `total_price`, or the gift's own price inflates the
    total and can create a feedback wobble (cart-mechanics.md, gotchas.md);
  - the cart line may show the gift at full price in the drawer until checkout — set
    expectations in copy ("free at checkout") if using this path.

## What the build must do (either option)

- Emit the `_isGWP` contract so the gift is identifiable and manageable.
- Compute thresholds on the non-gift subtotal in cents.
- Surface — in USAGE.md and ideally the section help text — that the merchant must set
  the gift up as **$0 OR** back it with an **automatic discount**, or the "free gift"
  won't actually be free at checkout.
- Never manipulate cart totals/prices from JS.

## Not a store credential

No token or ID is injected — `storeSettings` is empty. The gift is chosen with the
`gwp_product` picker; enforcement is admin/Shopify config the merchant owns.
