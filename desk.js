
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

  // Remove an earlier panel and cancel its timer.
  if (window.__deskBooker) {
    window.__deskBooker.stop?.();
  }

  const previousPanel = document.getElementById(
    "desk-booker-panel"
  );
  previousPanel?.remove();

  const state = {
    active: true,
    armed: false,
    timer: null,
    submitted: false,
    stop: null
  };

  window.__deskBooker = state;

  function log(...args) {
    console.log(
      `[DeskBooker ${new Date().toLocaleTimeString()}]`,
      ...args
    );
  }

  function availableDesks() {
    return [
      ...document.querySelectorAll(
        'input[type="radio"][name="desk"]'
      )
    ]
      .filter(el =>
        !el.disabled &&
        el.closest("label")?.innerText.includes("Desk")
      )
      .map(el => ({
        element: el,
        name: el.closest("label")?.innerText
          .match(/23\.D\d+/)?.[0]
      }))
      .filter(d => d.name);
  }

  function chooseDesk(desks) {
    for (const preferred of CONFIG.preferredDesks) {
      const found = desks.find(
        desk => desk.name === preferred
      );

      if (found) {
        return found;
      }
    }

    return desks[0] || null;
  }

  function setStatus(message) {
    const status = document.getElementById("db-status");

    if (status) {
      status.textContent = message;
    }

    log(message);
  }

  function stop() {
    if (state.timer !== null) {
      clearTimeout(state.timer);
    }

    state.timer = null;
    state.armed = false;
    state.active = false;

    log("Stopped.");
  }

  state.stop = stop;

  function book(testMode = false) {
    if (!state.active || state.submitted) {
      setStatus("Booking already submitted or stopped.");
      return;
    }

    const desks = availableDesks();
    const selected = chooseDesk(desks);

    if (!selected) {
      setStatus("No available desks found.");
      return;
    }

    const form = selected.element.form;

    if (!form || form.method.toLowerCase() !== "post") {
      setStatus("Booking POST form not found.");
      return;
    }

    const submit = [
      ...form.querySelectorAll(
        'button, input[type="submit"]'
      )
    ].find(el =>
      el.name === "book" ||
      el.value === "Book" ||
      el.textContent?.trim() === "Book"
    );

    if (!submit) {
      setStatus("Book button not found.");
      return;
    }

    // Important: select the desk FIRST.
    selected.element.click();

    log("Available desks:", desks.length);
    log("Selected desk:", selected.name);

    // The portal enables Book after desk selection.
    if (submit.disabled) {
      setStatus(
        "Book button is still disabled after desk selection."
      );
      return;
    }

    setStatus(`Selected: ${selected.name}`);

    if (testMode) {
      const confirmed = confirm(
        "REAL BOOKING TEST\n\n" +
        `Desk: ${selected.name}\n\n` +
        "Check the selected DATE and HOURS " +
        "in the Modo Labs portal.\n\n" +
        "OK = submit the REAL booking.\n" +
        "Cancel = do not submit."
      );

      if (!confirmed) {
        setStatus("Test cancelled. No booking submitted.");
        return;
      }
    }

    state.submitted = true;
    state.armed = false;

    setStatus(`Submitting booking: ${selected.name}`);

    // Use the portal's native booking button.
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

    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1);
    }

    return target;
  }

  function arm() {
    if (!state.active || state.armed || state.submitted) {
      return;
    }

    const target = nextTenAM();

    state.armed = true;

    setStatus(
      "Armed for " + target.toLocaleString()
    );

    function tick() {
      if (!state.active || !state.armed) {
        return;
      }

      const remaining = target.getTime() - Date.now();

      if (remaining <= 0) {
        state.timer = null;
        state.armed = false;

        setStatus("10:00 reached. Starting booking...");
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

  // Build on-page panel.
  const panel = document.createElement("div");

  panel.id = "desk-booker-panel";

  panel.style.cssText = `
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2147483647;
    width: 280px;
    padding: 16px;
    background: #17212b;
    color: #ffffff;
    border-radius: 12px;
    font: 13px Arial, sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,.4);
  `;

  panel.innerHTML = `
    <div style="
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
    ">
      Desk Booker v1.1
    </div>

    <div id="db-status" style="
      margin-bottom: 12px;
      line-height: 1.5;
    ">
      Initializing...
    </div>

    <div id="db-count" style="
      margin-bottom: 12px;
      color: #b6c8d6;
    "></div>

    <button id="db-test" type="button">
      TEST NOW
    </button>

    <button id="db-arm" type="button">
      ARM 10:00
    </button>

    <button id="db-stop" type="button">
      STOP
    </button>
  `;

  document.body.appendChild(panel);

  panel.querySelectorAll("button").forEach(button => {
    button.style.cssText = `
      padding: 8px 10px;
      margin: 3px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    `;
  });

  const count = panel.querySelector("#db-count");

  function refreshCount() {
    const desks = availableDesks();

    count.textContent =
      `Available desks in current form: ${desks.length}`;
  }

  panel.querySelector("#db-test").onclick = () => {
    refreshCount();
    book(true);
  };

  panel.querySelector("#db-arm").onclick = () => {
    refreshCount();
    arm();
  };

  panel.querySelector("#db-stop").onclick = () => {
    stop();
    panel.remove();
  };

  refreshCount();
  setStatus("Ready. Select the booking date first.");
})();
