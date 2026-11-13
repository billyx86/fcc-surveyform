// script.js — intercept the demo form's submit (#8).
//
// The form has no action, so a "real" submit would navigate to "#",
// reload the page and silently wipe every field. This handler stops that,
// confirms the submission locally (screen-reader friendly via
// role="status"), and resets the fields so the demo can be repeated.
// Native constraint validation (required / type / min / max) is left
// untouched: the browser still blocks invalid submits before this runs.

(function () {
    "use strict";

    const form = document.getElementById("survey-form");
    const status = document.getElementById("submit-status");
    if (!form || !status) return;

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        status.hidden = false;
        // Give the announcement a moment of visibility, then clear it so
        // the user can start a fresh entry.
        window.clearTimeout(form._submitStatusTimer);
        form._submitStatusTimer = window.setTimeout(function () {
            status.hidden = true;
        }, 6000);
        form.reset();
    });
})();
