import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const html = readFileSync(path.join(root, "index.html"), "utf8");

test("has a responsive viewport meta tag", () => {
    const m = html.match(/<meta[^>]+name=["']viewport["'][^>]*>/i);
    assert.ok(m, "no viewport meta tag");
    assert.match(m[0], /width=device-width/i, "viewport should use width=device-width");
});

test("the #comments textarea has an accessible label", () => {
    // either a <label for="comments"> or the textarea wrapped in a <label>
    const htmlFor = [...html.matchAll(/<label\b[^>]*\bfor=["']comments["'][^>]*>/gi)];
    const wrapped = /<label\b[^>]*>\s*<textarea[^>]*\bid=["']comments["']/i.test(html);
    assert.ok(htmlFor.length > 0 || wrapped,
        "#comments has no label association — assistive tech announces it with no name");
});

test("all text/email/number inputs are labelled", () => {
    const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((m) => m[1]));
    const labels = new Set([...html.matchAll(/<label\b[^>]*\bfor=["']([^"']+)["']/gi)].map((m) => m[1]));
    const fieldIds = [...html.matchAll(/<input\b[^>]*\btype=["'](?:text|email|number)["'][^>]*\bid=["']([^"']+)["']/gi)]
        .map((m) => m[1]);
    assert.ok(fieldIds.length >= 3, "expected at least name/email/number inputs");
    for (const id of fieldIds) {
        assert.ok(labels.has(id), `input#${id} has no <label for="${id}">`);
    }
    for (const id of labels) {
        assert.ok(ids.has(id), `label for="${id}" targets a missing id`);
    }
});

test("survey has the required spec elements", () => {
    assert.ok(/<form[^>]*\bid=["']survey-form["']/i.test(html), "no <form id=\"survey-form\">");
    assert.ok(html.includes('id="name"'), "no #name input");
    assert.ok(html.includes('id="email"'), "no #email input");
    const num = html.match(/<input\b[^>]*\bid=["']number["'][^>]*>/i)?.[0] ?? "";
    assert.ok(num.includes('type="number"'), "#number is not type=number");
    assert.ok(num.includes('min="0"') && num.includes('max="99"'), "#number should be constrained 0-99");
    assert.ok(/<select\b[^>]*\bid=["']dropdown["']/i.test(html), "no <select id=\"dropdown\">");
    assert.ok(html.match(/type=["']radio["']/gi) !== null, "no radio inputs");
    const radios = [...html.matchAll(/type=["']radio["']/gi)].length;
    assert.ok(radios >= 2, "expected at least two radio options");
    assert.ok(html.match(/type=["']checkbox["']/gi) !== null, "no checkbox inputs");
    assert.ok(html.includes('id="comments"'), "no #comments textarea");
    assert.ok(/<button\b[^>]*\bid=["']submit["'][^>]*\btype=["']submit["']/i.test(html) ||
        /<button\b[^>]*\btype=["']submit["'][^>]*\bid=["']submit["']/i.test(html),
        "no <button id=\"submit\" type=\"submit\">");
});

test("radio and checkbox groups are wrapped in <fieldset>/<legend>", () => {
    // Screen readers announce fieldset+legend as a named group; bare <p>
    // questions leave every option as an isolated, unlabelled input.
    const fieldsets = html.match(/<fieldset\b/gi) ?? [];
    const legends = html.match(/<legend\b/gi) ?? [];
    assert.ok(fieldsets.length >= 2, `expected >=2 fieldsets (recommend + improve), found ${fieldsets.length}`);
    assert.ok(legends.length >= 2, `expected >=2 legends, found ${legends.length}`);
    // Each fieldset must actually contain a legend
    for (const m of html.matchAll(/<fieldset\b[^>]*>[\s\S]*?<\/fieldset>/gi)) {
        assert.match(m[0], /<legend\b/i, "a <fieldset> has no <legend> inside it");
    }
});

test("every label[for] and every id is unique and resolvable", () => {
    const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((m) => m[1]);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(dupes, [], `duplicate ids: ${[...new Set(dupes)].join(", ")}`);
});

test("local href/src references point at existing files", () => {
    const refs = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)]
        .map((m) => m[1])
        .filter((r) => !/^(https?:)?\/\//.test(r) && !r.startsWith("#"));
    for (const ref of refs) {
        assert.ok(existsSync(path.join(root, ref)), `local reference "${ref}" does not exist`);
    }
});

test("#name and #email have autocomplete so browser autofill works (#5)", () => {
    const field = (id) => html.match(new RegExp(`<input\\b[^>]*\\bid=["']${id}["'][^>]*>`, "i"))?.[0] ?? "";
    const name = field("name");
    const email = field("email");
    assert.ok(name.includes('autocomplete="name"'), "#name has no autocomplete=\"name\"");
    assert.ok(email.includes('autocomplete="email"'), "#email has no autocomplete=\"email\"");
});

test("the demo form says it has no action and collects no data (#5)", () => {
    const form = html.match(/<form\b[^>]*>/i)?.[0] ?? "";
    assert.ok(!/\baction\s*=/i.test(form), "<form id=\"survey-form\"> should have no action (it is a demo)");
    assert.ok(
        /demo\s+form/i.test(html) && /no\s+(data\s+is\s+)?(collected|sent)/i.test(html),
        "form should say it is a demo and that no data is collected or sent"
    );
});
