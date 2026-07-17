# Progress bar, messaging & customizer settings

Scope: a **single** progress bar toward **one** threshold that unlocks **one** free
gift. No tiers, no multiple milestones.

## The progress bar

A single meter toward the one threshold, shown in the **cart drawer and cart page**,
optionally mirrored as a **PDP message**.

- Render initial state in **Liquid** from the cart subtotal (correct first paint, no
  flash), then update reactively in JS on cart changes.
- Use **stable role hooks** (`data-gwp="fill|nextText|successMessage|…"`), not CSS-class
  selectors, so restyling can't break behavior.
- Fill width toward the single threshold:
  ```js
  const w = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 0;
  ```

## Messaging — build by concatenation, NO placeholder tokens

Do **NOT** use templated placeholders like `{{ amount_away }}` / `{{ next_tier }}` in
settings. Putting a `{{ ... }}` inside a setting `default` string is a **Liquid syntax
error** (e.g. `{{ settings.gwp_progress_text | default: 'Spend {{ amount_away }} …' }}`
fails to parse), and the token-replacement approach is needlessly complex. Instead
compute the remaining amount and **concatenate** it with plain static copy.

- Compute `remaining = threshold - subtotal` (cents) and format as money.
- Render the amount in its **own element** so only it updates; wrap it with plain
  static copy:
  ```liquid
  <p class="gwp__message" data-gwp="nextText">
    {{ settings.gwp_progress_prefix }}
    <span data-gwp="amount"></span>
    {{ settings.gwp_progress_text }}
  </p>
  ```
  JS sets only the amount: `wrap.querySelector('[data-gwp="amount"]').textContent = formatMoney(remaining)`.
- Result reads e.g. **"You're $200 away from your free gift"** (prefix "You're" +
  amount "$200" + suffix "away from your free gift"). Example: gift unlocks at $400,
  cart is at $200 → shows "$200 away".
- **Success:** once the threshold is met, show the static `gwp_success_text` and hide
  the progress message.
- The PDP message reuses the same computed remaining amount (share via a page-level
  state value or recompute from the cart); it fetches `/cart.js` if cart state isn't
  yet available on first paint.

## Events

Update on the theme's cart-update event (`cart:update`) and on `shopify:section:load`
(theme editor). Re-init after section morphs (`section:updated`).

## Customizer settings

**Everything is configured from the theme editor `{% schema %}` — nothing hardcoded.**
On/off + behaviour, the gift, and a full appearance set.

### On/off + behaviour

| Setting | Type | Purpose |
|---|---|---|
| `enable_gwp` | checkbox | **Master on/off.** When off, the feature renders NOTHING and the gift manager does not run — the whole GWP (progress bar + auto-add) is toggled from admin. |
| `enable_gwp_pdp` | checkbox | Optional — show/hide the PDP message independently. |

### The gift + threshold (REQUIRED, from schema)

| Setting | Type | Purpose |
|---|---|---|
| `gwp_product` | product | **The gift product — chosen from the schema product picker.** Its selected/first variant is the gift variant id. Never ask the merchant to type a variant id; never inject it as a credential (no `storeSettings`). |
| `gwp_threshold` | number (dollars) | **The single spend threshold** that unlocks the gift. |
| `gwp_progress_prefix` | text | Plain text BEFORE the amount (default "You're"). No tokens/braces. |
| `gwp_progress_text` | text | Plain text AFTER the amount (default "away from your free gift"). No tokens/braces. |
| `gwp_success_text` | text | Shown once the threshold is met (default "You've unlocked your free gift!"). |

> One gift, one threshold. Do NOT add tier settings (`add_gwp_tier`, `gwp_threshold_two…`,
> per-tier labels) or tiered discounts — out of scope.

### Appearance — full styling control from admin

Expose the bar's look as settings — the merchant styles it entirely from the editor,
no code:

| Setting | Type | Controls |
|---|---|---|
| `gwp_title` | text | Heading shown above the bar |
| `gwp_title_size` | range (px) | Title font size |
| `gwp_title_color` | color | Title colour |
| `gwp_text_size` | range (px) | Message font size |
| `gwp_text_color` | color | Message colour |
| `gwp_bg_color` | color | Wrapper background |
| `gwp_track_color` | color | Bar track (unfilled) colour |
| `gwp_fill_color` | color | Progress fill colour |
| `gwp_bar_height` | range (px) | Bar height |
| `gwp_bar_radius` | range (px) | Bar corner radius |
| `gwp_padding` | range (px) | Wrapper padding |

Optionally add a `color_scheme` setting if the base theme uses schemes.

### Applying appearance — via CSS custom properties, not hardcoded CSS

Set the appearance settings as **inline CSS custom properties on the wrapper**, and
have `gwp.css` consume them with `var(...)` + a theme-token fallback. This keeps
`gwp.css` static (never regenerated per merchant) and makes every knob live:

```liquid
<div class="gwp" data-gwp="wrapper" style="
  --gwp-bg: {{ settings.gwp_bg_color | default: 'transparent' }};
  --gwp-track: {{ settings.gwp_track_color | default: 'rgba(0,0,0,.1)' }};
  --gwp-fill: {{ settings.gwp_fill_color | default: settings.color_palette.foreground }};
  --gwp-bar-h: {{ settings.gwp_bar_height | default: 8 }}px;
  --gwp-bar-r: {{ settings.gwp_bar_radius | default: 999 }}px;
  --gwp-title-size: {{ settings.gwp_title_size | default: 16 }}px;
  --gwp-title-color: {{ settings.gwp_title_color | default: settings.color_palette.foreground }};
  --gwp-text-size: {{ settings.gwp_text_size | default: 13 }}px;
  --gwp-text-color: {{ settings.gwp_text_color | default: settings.color_palette.foreground }};
  --gwp-pad: {{ settings.gwp_padding | default: 12 }}px;">
  {%- if settings.gwp_title != blank -%}<p class="gwp__title">{{ settings.gwp_title }}</p>{%- endif -%}
  ...
</div>
```
```css
.gwp{background:var(--gwp-bg);padding:var(--gwp-pad)}
.gwp__title{font-size:var(--gwp-title-size);color:var(--gwp-title-color)}
.gwp__track{height:var(--gwp-bar-h);border-radius:var(--gwp-bar-r);background:var(--gwp-track)}
.gwp__fill{height:var(--gwp-bar-h);border-radius:var(--gwp-bar-r);background:var(--gwp-fill);width:0}
```

The fill's **width** is the one thing NOT set by a CSS variable — JS sets it as an
inline style each cart update: `fill.style.width = pct + '%'` (0–100). The CSS custom
properties control only colour/height/radius/padding. Give `.gwp__fill` a base
`width:0` and a `transition:width .3s` so it animates.

### Rules

- **Never put a Liquid `{{ }}` tag inside a setting `default` value** — it's a Liquid
  syntax error (this is what broke the earlier build). Output text settings plainly
  (`{{ settings.gwp_progress_text }}`); build the message by concatenation (Messaging
  above), never by replacing a `{{ token }}` inside a merchant string.
- The threshold is entered in **dollars**; convert to **cents** (`| times: 100`) for
  all logic and data attributes.
- Every `range` setting needs `min`, `max`, `step`, `unit`, and `default` in its
  schema, and every `color` setting a `default` — or the push fails
  (theme-integration.md). Default appearance to the theme's design tokens so an
  unconfigured bar still looks on-brand.
- When `enable_gwp` is off, render nothing and do not initialise the gift manager.
- Load `gwp.js` / `gwp.css` from inside the cart/PDP snippets so they load only where
  used, never global (gotchas.md, theme-integration.md).
