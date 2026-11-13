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
