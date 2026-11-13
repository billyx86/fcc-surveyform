import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const html = readFileSync(path.join(root, "index.html"), "utf8");

// script.js is the new behaviour; the test must not assume it exists yet
// (that is exactly the RED condition), so it is read lazily.
function script() {
    const p = path.join(root, "script.js");
    assert.ok(existsSync(p), "script.js is missing — submit has no handler to intercept navigation");
    return readFileSync(p, "utf8");
}

test("the form's submit is intercepted so the page does not reload (#8)", () => {
    // index.html must actually load the script (deferred, at end of body is
    // the convention the line-endings/structure tests rely on).
    const scriptTag = html.match(/<script\b[^>]*\bsrc=[\"']script\.js[\"'][^>]*>/i);
    assert.ok(scriptTag, "index.html does not include <script src=\"script.js\">");
    assert.ok(/\bdefer\b/i.test(scriptTag[0]), "script.js should be deferred so the DOM is ready");

    const js = script();
    // A real submit listener on the survey form, and a preventDefault() so
    // the browser does not navigate to "#" and wipe every field.
    assert.ok(
        /addEventListener\(\s*["']submit["']/.test(js),
        "script.js does not addEventListener(\"submit\") — submitting still navigates"
    );
    assert.ok(
        /preventDefault\(\)/.test(js),
        "submit handler does not call event.preventDefault() — the page still reloads"
    );
});

test("submitting a valid form shows a confirmation the user can perceive (#8)", () => {
    const js = script();
    // The success message must be announced to assistive tech: a
    // role="status" element (or aria-live) that the script reveals on submit.
    assert.ok(
        /role\s*=\s*["']status["']|aria-live/i.test(html) || /role\s*=\s*["']status["']|aria-live/i.test(js),
        "no role=\"status\" / aria-live element — the confirmation is invisible to screen readers"
    );
    // The script must actually flip that element into a visible/shown state
    // (class toggle, hidden attr removal, or textContent) rather than only
    // defining it in the markup.
    assert.ok(
        /(classList\.(add|toggle)|\.hidden\s*=|textContent\s*=|innerText\s*=)/.test(js),
        "script.js never makes the status message visible on submit"
    );
    // Native validation must be left intact: the handler must not call
    // reportValidity()/checkValidity() in a way that replaces the browser,
    // and must not drop the required attributes (guarded in html.test.js).
    assert.ok(
        /getElementById|querySelector/.test(js),
        "script.js does not look up the form/status elements to drive the UI"
    );
});
