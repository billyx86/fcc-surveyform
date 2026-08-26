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

## Tests

A `node:test` suite validates the HTML — responsive viewport meta, label
associations, the fieldset/legend grouping, and that every `href`/`src`
points at a real file:

```sh
npm test
```

## Project structure

- `index.html` — form markup
- `styles.css` — dark-themed styling
- `tests/html.test.js` — HTML validation tests
