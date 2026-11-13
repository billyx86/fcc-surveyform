# fcc-surveyform

freeCodeCamp **"Survey Form"** certification project — a styled HTML form
that collects survey feedback. Data is not collected anywhere; this is a
front-end demo.

## Usage

Open `index.html` in a browser.

## Form fields

- **Name** — required text
- **Email** — required email
- **Age** — optional number, constrained 0–99
- **Where did you hear about me?** — required select
- **Would you recommend this survey to a friend?** — radio group
  (fieldset/legend)
- **What would you like to see improved?** — checkbox group, "check all
  that apply" (fieldset/legend)
- **Comments** — textarea
- **Submit** button

## Keyboard & submission behaviour

- **Focus is always visible (#10)** — every input, textarea, select and
  the submit button paints an explicit high-contrast `:focus-visible`
  outline, so keyboard and screen-reader users can always tell where
  they are in the 13-step form.
- **Submit gives feedback, no page reload (#8)** — a tiny `script.js`
  intercepts the demo form's `submit`, shows a `role="status"`
  confirmation line, and resets the fields. The browser's native
  constraint validation is untouched (invalid submits are still
  blocked before any feedback is shown).

## Tests

A `node:test` suite validates the HTML and CSS — responsive viewport meta,
label associations, the fieldset/legend grouping, the focus-visible outline
(#10), the submit interception + status message (#8), and that every
`href`/`src` points at a real file:

```sh
npm test
```

## Project structure

- `index.html` — form markup
- `styles.css` — dark-themed styling
- `script.js` — submit interception + `role="status"` confirmation (#8)
- `tests/html.test.js` — HTML validation tests
- `tests/css.test.js` — focus-visible outline assertions (#10)
- `tests/submit.test.js` — submit interception + status assertions (#8)
- `tests/line-endings.test.js` — line-ending hygiene: a normalizing
  `.gitattributes` and no CR bytes in tracked text files (#9)
