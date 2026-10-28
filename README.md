# demo-app


(() => {
  "use strict";

  const CONFIG = {
    preferredDesks: [
      "23.D049",
      "23.D060",
      "23.D061",
      "23.D072",
      "23.D073"
    ],
    bookingHour: 10,
    bookingMinute: 0,
    bookingSecond: 0
  };

  // Prevent running two copies simultaneously.
  if (window.__deskBooker?.active) {
    console.warn("Desk Booker is already running.");
    return;
  }

  const state = {
    active: true,
    armed: false,
    timer: null,
    submitted: false
  };

  window.__deskBooker = state;

  const log = (...args) =>
    console.log(`[DeskBooker ${new Date().toLocaleTimeString()}]`, ...args);

  function availableDesks() {
    return [...document.querySelectorAll('input[type="radio"]')]
      .filter(el =>
        el.name === "desk" &&
        !el.disabled &&
        el.closest("label")?.innerText.includes("Desk")
      )
      .map(el => ({
        element: el,
        name: el.closest("label")?.innerText.match(/23\.D\d+/)?.[0]
      }))
      .filter(d => d.name);
  }

  function chooseDesk(desks) {
    for (const name of CONFIG.preferredDesks) {
      const match = desks.find(d => d.name === name);
      if (match) return match;
    }
    return desks[0] || null;
  }

  function stop() {
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    state.armed = false;
    state.active = false;
    log("Stopped.");
  }

  function book(testMode = false) {
    if (state.submitted) {
      log("A booking attempt has already been submitted.");
      return;
    }

    const desks = availableDesks();
    const selected = chooseDesk(desks);

    if (!selected) {
      log("No available desks found. No booking submitted.");
      return;
    }

    const form = selected.element.form;

    if (!form || form.method.toLowerCase() !== "post") {
      log("Expected POST booking form not found.");
      return;
    }

    const submit = [...form.querySelectorAll(
      'button, input[type="submit"]'
    )].find(el =>
      el.name === "book" ||
      el.value === "Book" ||
      el.textContent?.trim() === "Book"
    );

    if (!submit || submit.disabled) {
      log("Booking submit button not found or disabled.");
      return;
    }

    selected.element.click();

    log("Available desks:", desks.length);
    log("Selected desk:", selected.name);

    if (testMode) {
      const ok = confirm(
        `TEST BOOKING\n\n` +
        `Selected desk: ${selected.name}\n\n` +
        `Please verify the date and time shown ` +
        `on the portal before confirming.\n\n` +
        `Click OK to submit the REAL booking.`
      );
      if (!ok) {
        log("Test booking cancelled.");
        return;
      }
    }

    state.submitted = true;
    state.armed = false;

    log("Submitting booking for", selected.name);
    submit.click();
  }

  function nextTenAM() {
    const target = new Date();
    target.setHours(
      CONFIG.bookingHour,
      CONFIG.bookingMinute,
      CONFIG.bookingSecond,
      0
    );

    if (target <= new Date()) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  function arm() {
    if (state.armed || state.submitted) return;

    const target = nextTenAM();
    const delay = target.getTime() - Date.now();

    state.armed = true;
    log("Armed for:", target.toLocaleString());

    // Short final timer to limit drift.
    function tick() {
      if (!state.armed) return;

      const remaining = target.getTime() - Date.now();

      if (remaining <= 0) {
        state.timer = null;
        book(false);
        return;
      }

      state.timer = setTimeout(
        tick,
        Math.min(remaining, 250)
      );
    }

    tick();
  }

  // Small on-page control panel.
  const panel = document.createElement("div");
  panel.id = "desk-booker-panel";
  panel.style.cssText = `
    position:fixed;
    right:20px;
    bottom:20px;
    z-index:2147483647;
    background:#17212b;
    color:white;
    padding:16px;
    border-radius:12px;
    font:13px Arial,sans-serif;
    box-shadow:0 4px 20px #0006;
    width:260px;
  `;

  panel.innerHTML = `
    <div style="font-weight:bold;font-size:16px;margin-bottom:8px">
      Desk Booker
    </div>
    <div id="db-status" style="margin-bottom:12px">
      Ready. Select your booking date first.
    </div>
    <button id="db-test" type="button">TEST NOW</button>
    <button id="db-arm" type="button">ARM 10:00</button>
    <button id="db-stop" type="button">STOP</button>
  `;

  document.body.appendChild(panel);

  const status = panel.querySelector("#db-status");

  panel.querySelectorAll("button").forEach(button => {
    button.style.cssText = `
      padding:7px;
      margin:3px;
      border:0;
      border-radius:5px;
      cursor:pointer;
    `;
  });

  panel.querySelector("#db-test").onclick = () => {
    status.textContent = "Running test booking...";
    book(true);
  };

  panel.querySelector("#db-arm").onclick = () => {
    arm();
    status.textContent = "Armed for next 10:00. Keep this tab open.";
  };

  panel.querySelector("#db-stop").onclick = () => {
    stop();
    panel.remove();
  };

  log("Ready. Available desks:", availableDesks().length);
})();
