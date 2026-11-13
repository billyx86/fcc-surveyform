import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const cssPath = path.join(root, "styles.css");

// Grab every "<selector list> { <body> }" rule (no nested rules in this
// file) so we can assert on individual rules rather than the whole sheet.
function rules(css) {
    return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
        selector: m[1].trim(),
        body: m[2],
    }));
}

test("styles.css exists and defines a :focus-family rule for form controls (#10)", () => {
    assert.ok(existsSync(cssPath), "styles.css missing");
    const css = readFileSync(cssPath, "utf8");
    const focusRules = rules(css).filter(({ selector }) =>
        /:(focus-visible|focus)\b/.test(selector)
    );
    assert.ok(
        focusRules.length > 0,
        "no :focus / :focus-visible rule — keyboard users get no reliable focus indicator on a 13-step form"
    );
    // The rule must target the actual form controls, not an unrelated element.
    assert.ok(
        focusRules.some(({ selector }) =>
            /\b(input|textarea|select|button)\b/.test(selector)
        ),
        "the focus rule does not target any input/textarea/select/button"
    );
});

test("the focus rule paints a visible outline, not just a border tweak (#10)", () => {
    const css = readFileSync(cssPath, "utf8");
    const focusRules = rules(css).filter(({ selector }) =>
        /:(focus-visible|focus)\b/.test(selector) &&
        /\b(input|textarea|select|button)\b/.test(selector)
    );
    assert.ok(
        focusRules.some(({ body }) => /outline\s*:\s*\S/.test(body)),
        "focus rule sets no outline — the existing border overrides erase the default UA outline"
    );
    assert.ok(
        focusRules.some(({ body }) => /outline-offset\s*:/.test(body)),
        "focus outline has no outline-offset — it touches the control's border"
    );
});

/*
 * WCAG non-text contrast (#14). Everything below recomputes the ratios from
 * the stylesheet instead of trusting a comment: relative luminance per
 * WCAG 2.x, ratio = (lighter + 0.05) / (darker + 0.05).
 */

function srgbToLinear(channel) {
    return channel <= 0.03928
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
    assert.ok(m, `"${hex}" is not a 6-digit hex colour`);
    const n = parseInt(m[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
        .map((v) => srgbToLinear(v / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

// Comments are stripped first so a rule's selector is never polluted by the
// explanatory blocks this stylesheet uses.
function sheet() {
    return readFileSync(cssPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

function rule(selector) {
    const found = rules(sheet()).find((r) => r.selector === selector);
    assert.ok(found, `no "${selector}" rule in styles.css`);
    return found;
}

// Exact-match declaration lookup: a plain /color\s*:/ regex would match
// "background-color" first and silently return the wrong value.
function declaration(body, property) {
    for (const part of body.split(";")) {
        const m = /^\s*([a-z-]+)\s*:\s*(.+)$/i.exec(part);
        if (m && m[1].toLowerCase() === property.toLowerCase()) {
            return m[2].trim();
        }
    }
    assert.fail(`no "${property}" declaration in: ${body.trim()}`);
}

function colour(value) {
    const m = /#[0-9a-f]{6}/i.exec(value);
    assert.ok(m, `no 6-digit hex colour in "${value}"`);
    return m[0];
}

// The two surfaces every non-text element in this sheet can be painted on.
const PANEL = colour(declaration(rule("form").body, "background-color"));
const PAGE = colour(declaration(rule("body").body, "background-color"));

test("focus outline clears WCAG 1.4.11 (>=3.0:1) on the panel and the page (#14)", () => {
    const focus = rules(sheet()).find(({ selector }) =>
        /:(focus-visible|focus)\b/.test(selector) &&
        /\b(input|textarea|select|button)\b/.test(selector)
    );
    assert.ok(focus, "no :focus-visible rule for form controls to check");
    const outline = colour(declaration(focus.body, "outline"));
    const onPanel = contrast(outline, PANEL);
    const onPage = contrast(outline, PAGE);
    assert.ok(onPanel >= 3.0,
        `focus outline ${outline} is only ${onPanel.toFixed(2)}:1 on the ${PANEL} form panel (WCAG 1.4.11 needs >= 3.0:1)`);
    assert.ok(onPage >= 3.0,
        `focus outline ${outline} is only ${onPage.toFixed(2)}:1 on the ${PAGE} page background (WCAG 1.4.11 needs >= 3.0:1)`);
});

test("submit button background clears WCAG 1.4.11 and its label stays legible (#14)", () => {
    const body = rule("button").body;
    const bg = colour(declaration(body, "background-color"));
    const fg = colour(declaration(body, "color"));
    const onPanel = contrast(bg, PANEL);
    const onPage = contrast(bg, PAGE);
    assert.ok(onPanel >= 3.0,
        `button background ${bg} is only ${onPanel.toFixed(2)}:1 on the ${PANEL} form panel (WCAG 1.4.11 needs >= 3.0:1)`);
    assert.ok(onPage >= 3.0,
        `button background ${bg} is only ${onPage.toFixed(2)}:1 on the ${PAGE} page background (WCAG 1.4.11 needs >= 3.0:1)`);
    // Changing the fill must not trade a non-text failure for a text one:
    // the button label still has to clear 1.4.3 (4.5:1).
    const text = contrast(fg, bg);
    assert.ok(text >= 4.5,
        `button text ${fg} on ${bg} is only ${text.toFixed(2)}:1 (WCAG 1.4.3 needs >= 4.5:1)`);
});

test("the ratios that already passed keep passing (#14)", () => {
    // input border vs panel — non-text, needs >= 3.0:1.
    const controls = rules(sheet()).find(({ selector }) =>
        selector.replace(/\s+/g, "") === "input,textarea,select"
    );
    assert.ok(controls, "no input/textarea/select rule to check");
    const border = colour(declaration(controls.body, "border"));
    const borderRatio = contrast(border, PANEL);
    assert.ok(borderRatio >= 3.0,
        `input border ${border} is only ${borderRatio.toFixed(2)}:1 on the ${PANEL} panel`);
    // Body/label text — inherits from body, needs >= 4.5:1 on both surfaces.
    const text = colour(declaration(rule("body").body, "color"));
    assert.ok(contrast(text, PANEL) >= 4.5,
        `label text ${text} is only ${contrast(text, PANEL).toFixed(2)}:1 on the panel`);
    assert.ok(contrast(text, PAGE) >= 4.5,
        `label text ${text} is only ${contrast(text, PAGE).toFixed(2)}:1 on the page`);
});
