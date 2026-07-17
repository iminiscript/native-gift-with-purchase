# Progress bar, messaging & customizer settings

## The progress bar

A tiered meter toward up to 5 thresholds (+ a $0 start), shown in the **cart drawer
and cart page**, optionally mirrored as a **PDP message**.

- Render initial state in **Liquid** from `cart.total_price` (correct first paint, no
  flash), then update reactively in JS on cart changes.
- Use **stable role hooks** (`data-gwp="fill|marker|nextText|successMessage|…"`), not
  CSS-class selectors, so restyling can't break behavior.
- Per-segment fill between thresholds `start`→`end`:
  ```js
  let w = 0;
  if (total >= end) w = 100;
  else if (total > start && end > start) w = Math.min(100, ((total - start) / (end - start)) * 100);
  ```
- Emit thresholds to JS as a sorted, comma-separated **cents** list in a data
  attribute; parse and sort ascending.

## Messaging

- **Progress:** `"You're {{ amount_away }} away from {{ next_tier }}"` — replace
  `{{ amount_away }}` with the formatted remaining amount and `{{ next_tier }}` with
  the next threshold's label.
- **Success:** at the max tier, show the success message and hide the "away" text.
- Keep templates as **settings** (below) so copy is merchant-editable.
- The PDP message reuses the same computed "next" message (share it via a page-level
  state value or recompute from the cart); it fetches `/cart.js` if cart state isn't
  yet available on first paint.

## Events

Update on the theme's cart-update event (`cart:update`) and on `shopify:section:load`
(theme editor). Re-init after section morphs (`section:updated`).

## Customizer settings

**Everything is configured from the theme editor `{% schema %}` — nothing hardcoded.**
This splits into on/off + behaviour, the gift, and a full appearance set.

### On/off + behaviour

| Setting | Type | Purpose |
|---|---|---|
| `enable_gwp` | checkbox | **Master on/off.** When off, the feature renders NOTHING and the tier manager does not run — the whole GWP (progress bar + auto-add) is toggled from admin. |
| `enable_gwp_pdp` | checkbox | Show/hide the PDP message independently. |
| `gwp_cart_price_type` | select | Threshold basis: subtotal vs original/pre-discount total. |

### The gift + thresholds (REQUIRED, from schema)

| Setting | Type | Purpose |
|---|---|---|
| `gwp_product` | product | **The gift product — chosen from the schema product picker.** Its selected/first variant is the gift variant id. Never ask the merchant to type a variant id; never inject it as a credential (no `storeSettings`). |
| `add_gwp_tier` | range 1–5 | Which threshold auto-adds the gift. |
| `gwp_threshold` … `gwp_threshold_five` | number (dollars) | Up to 5 thresholds. |
| `gwp_threshold_label` … `_five` + `_zero` | text | Tier labels (+ the $0 start label). |
| `gwp_progress_text` | text | Progress template with `{{ amount_away }}` / `{{ next_tier }}`. |
| `gwp_success_text` | text | Shown at the max tier. |

### Appearance — full styling control from admin

Expose the bar's look as settings too — the merchant styles it entirely from the
editor, no code:

| Setting | Type | Controls |
|---|---|---|
| `gwp_title` | text | Heading shown above the bar |
| `gwp_title_size` | range (px) | Title font size |
| `gwp_title_color` | color | Title colour |
| `gwp_text_size` | range (px) | Message/label font size |
| `gwp_text_color` | color | Message/label colour |
| `gwp_bg_color` | color | Wrapper background |
| `gwp_track_color` | color | Bar track (unfilled) colour |
| `gwp_fill_color` | color | Progress fill colour |
| `gwp_marker_color` / `gwp_marker_reached_color` | color | Milestone markers (default / reached) |
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
.gwp__fill{height:var(--gwp-bar-h);border-radius:var(--gwp-bar-r);background:var(--gwp-fill)}
```

### Rules

- Thresholds are entered in **dollars**; convert to **cents** (`| times: 100`) for all
  logic and data attributes.
- Every `range` setting needs `min`, `max`, `step`, `unit`, and `default` in its
  schema, and every `color` setting a `default` — or the push fails
  (theme-integration.md). Default appearance to the theme's design tokens so an
  unconfigured bar still looks on-brand.
- When `enable_gwp` is off, render nothing and do not initialise the tier manager.
- Load `gwp.js` / `gwp.css` from inside the cart/PDP snippets so they load only where
  used, never global (gotchas.md, theme-integration.md).
