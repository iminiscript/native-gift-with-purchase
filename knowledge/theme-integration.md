# Theme integration — OS 2.0 correctness (blocks, wiring, push-valid schema)

These are the same OS 2.0 mechanics that most often make a build *look* broken even
when the cart logic is right. All required.

## 1. Custom-element root + JS-wired events (no framework-magic markup)

If the progress bar / tier manager is a custom element (e.g.
`<gwp-progress-bar>`), the component's **root rendered element MUST be that tag** —
never a `<div>` that wraps or omits it. A `<div>` root means
`customElements.define('gwp-progress-bar', …)` never attaches, `connectedCallback`
never fires, and nothing updates.

- Wire all behavior in JS with `addEventListener` and `querySelector`/`data-*`. Do
  **NOT** rely on the host theme's declarative bindings (Horizon's `on:click="/…"`,
  `ref="…"`) unless you fully extend that framework — otherwise handlers are dead.
- Use `data-gwp="…"` role hooks for the elements JS updates (fill, marker, message),
  so CSS/class changes can't break it.

## 2. If it's an addable block — register it properly

If the progress bar is offered as a theme block a merchant can drop into the cart
drawer/section:
- give the block file its own `{% schema %}` (`name` + `settings`);
- have the parent section accept it (list the `type` in the section schema's `blocks`
  and render via `{% content_for "blocks" %}` / a block loop) — otherwise the editor
  shows "no block available";
- keep the block `type` identical to its filename.

Otherwise, rendering the progress bar directly inside the existing cart drawer + cart
snippets is fine and simplest.

## 3. Schema MUST be push-valid — `theme check` does NOT catch these

Shopify rejects invalid `{% schema %}` **at push time** even when `theme check`
passes:
- A **theme block's own** schema supports only `name`, `settings`, `blocks`,
  `presets`, `enabled_on`, `disabled_on`, `class`, `tag`. It does **NOT** support
  `limit` — put `limit` in the parent section's `blocks` entry, never in the block.
- Every block `type` referenced in a template/section/`presets` must match a real
  `blocks/<type>.liquid` with a valid schema, or the push fails
  ("theme block type must be defined in the theme blocks folder") — often a cascade
  from a block that itself failed to upload.
- **Acceptance: the theme PUSHES with zero file errors**, not just "theme check passes."

## 4. Cross-component shared state

The progress bar (cart), the tier manager, and the optional PDP message live in
different places. Share the computed "next" message / cart total through a
**page-level singleton or the theme's cart-update events** — don't try to read one
component's internals from another. Re-read/re-init after Section Rendering morphs.

## 5. Load assets only where used; never edit template JSON

Reference `gwp.js` / `gwp.css` from inside the cart (and optional PDP) snippets so
they load only there — never from global `layout/theme.liquid`. Never modify the
merchant's existing `templates/*.json` ([[plugins-avoid-template-json]]); ship stable
code and, at most, a net-new template.
