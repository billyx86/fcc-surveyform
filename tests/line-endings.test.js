import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

// Files git should treat as binary - never line-ending-normalised.
const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2", ".ttf"]);
const SKIP_DIRS = new Set([".git", "node_modules"]);

function* walk(dir) {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
            if (!SKIP_DIRS.has(entry)) yield* walk(full);
        } else {
            yield full;
        }
    }
}

test("a normalizing .gitattributes exists and forces LF (#9)", () => {
    const ga = path.join(root, ".gitattributes");
    assert.ok(existsSync(ga), "no .gitattributes - line endings are at the mercy of each editor");
    const text = readFileSync(ga, "utf8");
    // The catch-all must normalise text files to LF on checkout.
    assert.match(text, /^\*\s+text=auto\s+eol=lf/m,
        ".gitattributes must declare a `* text=auto eol=lf` catch-all");
    // The file itself must be LF-clean, or it teaches the very habit it bans.
    assert.equal(readFileSync(ga).includes(0x0d), false, ".gitattributes contains CR bytes");
});

test("no tracked text file contains CR bytes (#9)", () => {
    const offenders = [];
    for (const full of walk(root)) {
        if (BINARY_EXT.has(path.extname(full).toLowerCase())) continue;
        const buf = readFileSync(full);
        // Any CR byte (CRLF or lone CR) means line endings are not normalised.
        if (buf.includes(0x0d)) offenders.push(path.relative(root, full));
    }
    assert.deepEqual(offenders, [],
        "line endings not normalised to LF: " + offenders.join(", ") +
        " - a CRLF-saved editor will churn diffs on these files");
});
