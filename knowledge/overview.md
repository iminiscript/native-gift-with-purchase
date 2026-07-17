# Native gift-with-purchase (GWP) — overview

## Target platform — Online Store 2.0 only

This plugin targets **Shopify Online Store 2.0 themes with theme-blocks** (e.g.
Horizon). It is **NOT** for vintage/legacy themes. It relies on OS 2.0 primitives:
JSON templates, theme blocks/sections, section `{% schema %}` settings, and the cart
Ajax API. If the theme is not OS 2.0, flag a blocking mismatch.

## Tasks stay simple — this plugin owns the "how"

A task can be a one-liner — even just *"Create a GWP progress bar for the cart."* It
should NOT specify any mechanics, setting names, or thresholds. **This plugin fully
specifies the native behavior** and **everything else comes from here**: the settings
to expose, auto-add/remove, the `_isGWP` line-item contract, the anti-loop reconcile,
threshold math, message building, appearance, and how the gift becomes free. Build the
complete, generic feature from a minimal prompt.

A prompt that only says "progress bar" STILL requires the full auto-add/remove of the
gift — the bar without the gift-add is incomplete and broken. This is a **generic,
theme-agnostic** feature — do not tailor it to any one theme's runtime, helper library,
or naming. Use standard Shopify primitives only (the cart
Ajax API, `Shopify.routes.root`, standard cart-update events, plain custom elements)
so it drops into any OS 2.0 theme.

## Directive — REQUIRED

> **The defining behavior is AUTO-ADDING THE FREE GIFT to the cart when the threshold
> is met (and removing it below).** The progress bar is only the visual accompaniment.
> A build that renders the bar but does not actually add the gift to the cart is
> INCOMPLETE and must fail validation. Even a prompt that says only "create a progress
> bar" REQUIRES the full auto-add/remove behavior — they are one feature, never a
> visual-only meter.

A gift-with-purchase progress bar is a common, theme-agnostic cart pattern. When the
cart subtotal crosses a single configured spend threshold, ONE **configured gift
product is automatically added to the cart** as a line marked with the `_isGWP`
property; a **progress bar** ("You're $X away from your free gift") shows in the cart
drawer/page (and optionally as a PDP message); the gift's quantity is held at **1**;
and the gift is **removed** if the cart drops back below the threshold. There is
exactly ONE gift and ONE threshold — no tiers, no tiered discounts. Build it generic —
no assumptions about the host theme beyond standard OS 2.0 + the cart Ajax API.

There is **NO gift/rewards app**. The theme only **adds/removes the gift line and
renders progress**. Making the gift actually **free** is the merchant's setup — a **$0
product/variant** or a **Shopify automatic "free gift" discount** — the theme NEVER
manipulates price (free-gift-enforcement.md).

## The build MUST deliver (each rule is detailed in the linked file — don't restate it)

1. **[#1]** auto-add the ONE gift when the threshold is met and remove it below —
   **live via Ajax on every cart change, no refresh** (on load AND after any `/cart/*`
   mutation). A visual-only bar that doesn't move the gift fails (cart-mechanics.md).
2. the gift quantity is **always exactly 1** — never multiplies with other line
   quantities; add only when absent (cart-mechanics.md).
3. the gift line renders **locked** — no quantity control, no remove button; lock
   selectors sourced from the actual cart row template (Analyzer MUST read it and name
   it in the plan — generic guesses silently fail) (cart-mechanics.md).
4. **anti-loop guard** — mutation lock + state memoization + transient-zero handling,
   so the reconcile can't loop (cart-mechanics.md).
5. threshold on the **non-gift subtotal in cents**; gift identified by **variant id +
   `_isGWP`** so a manual same-product add is untouched (cart-mechanics.md).
6. a **progress bar** in the cart drawer + page (optional PDP mirror); message built by
   **concatenation** (prefix + JS amount + suffix), **no `{{ }}` tokens** in settings
   (progress-and-config.md).
7. **free-gift enforcement** is the merchant's ($0 product or automatic discount); the
   theme never zeroes the price (free-gift-enforcement.md).
8. **OS 2.0 correctness** — addable block/section with a **custom-element root**,
   JS-wired, **push-valid `{% schema %}`**; the theme PUSHES with zero errors
   (theme-integration.md).
9. **everything merchant-configurable** — gift product, threshold, messages, a master
   **on/off** toggle, and the **full appearance set** via CSS custom properties;
   nothing hardcoded; assets loaded only where used, no template-JSON edits
   (progress-and-config.md, theme-integration.md).

## Where the code lives — stable theme code only

Follow [[plugins-avoid-template-json]] — stable code only, at most a net-new template.

```
snippets/gwp-progress-bar.liquid     the progress bar (rendered in cart drawer + cart page)
snippets/gwp-pdp-message.liquid      OPTIONAL PDP "spend $X for a free gift" message
assets/gwp.js                        progress paint + gift manager (auto add/remove, lock+memo reconcile)
assets/gwp.css                       neutral base styling (restyled by theme tokens)
(config)                             GWP settings added to the theme's settings_schema group
```

Render the progress bar inside the existing cart drawer + cart snippets (or as an
addable block). Load `gwp.js`/`gwp.css` only on templates that use them — never from
global `layout/theme.liquid`.

## Scope

- **In scope:** native auto-add/remove of ONE gift on a single spend threshold,
  progress bar, PDP message, quantity lock to 1, reconcile guard.
- **Out of scope:** multi-tier thresholds or tiered discounts (this is strictly ONE
  gift + ONE threshold); third-party gift/upsell/rewards apps (Rebuy, etc.); authoring
  the Shopify automatic discount itself; loyalty programs; the build-your-own-bundle
  builder (that's `native-bundle-builder`); editing volatile template JSON.

## Reference

Pattern derived from a production theme's native GWP. See cart-mechanics.md for the
load-bearing `_isGWP` contract + anti-loop reconcile, progress-and-config.md for the
bar/messages/settings, free-gift-enforcement.md for how the gift is free,
theme-integration.md for OS 2.0 correctness, and gotchas.md for the traps.
