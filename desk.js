
(() => {
  "use strict";

  const CONFIG = {
    preferred: [
      "23.D049",
      "23.D060",
      "23.D061",
      "23.D072",
      "23.D073"
    ],
    hour: 10,
    minute: 0,
    second: 0
  };

  // Clean up any previous instance.
  window.__deskBooker?.stop?.();
  document.getElementById("desk-booker-panel")?.remove();

  const state = {
    armed: false,
    submitted: false,
    stopped: false,
    timer: null,
    target: null
  };

  window.__deskBooker = state;

  const panel = document.createElement("div");
  panel.id = "desk-booker-panel";
  panel.style.cssText = `
    position:fixed;
    right:20px;
    bottom:20px;
    z-index:2147483647;
    width:300px;
    padding:16px;
    background:#17212b;
    color:#fff;
    border-radius:12px;
    font:13px Arial,sans-serif;
    box-shadow:0 4px 20px #0006;
  `;

  panel.innerHTML = `
    <div style="font-size:17px;font-weight:bold;margin-bottom:10px">
      Desk Booker v1.2
    </div>
    <div id="db-status">Ready</div>
    <div id="db-clock" style="margin:10px 0;font-size:18px">
      --:--:--
    </div>
    <div id="db-count" style="margin-bottom:12px"></div>
    <button id="db-test">TEST NOW</button>
    <button id="db-arm">ARM 10:00</button>
    <button id="db-stop">STOP</button>
  `;

  document.body.appendChild(panel);

  panel.querySelectorAll("button").forEach(btn => {
    btn.type = "button";
    btn.style.cssText = `
      padding:8px;
      margin:3px;
      border:0;
      border-radius:5px;
      cursor:pointer;
    `;
  });

  const status = panel.querySelector("#db-status");
  const clock = panel.querySelector("#db-clock");
  const count = panel.querySelector("#db-count");

  function log(message) {
    console.log(
      `[DeskBooker ${new Date().toLocaleTimeString()}] ${message}`
    );
  }

  function setStatus(message) {
    status.textContent = message;
    log(message);
  }

  function getDesks() {
    return [...document.querySelectorAll(
      'input[type="radio"][name="desk"]'
    )]
      .filter(el => !el.disabled)
      .map(el => ({
        element: el,
        name: el.closest("label")?.innerText
          .match(/23\.D\d+/)?.[0]
      }))
      .filter(d => d.name);
  }

  function chooseDesk(desks) {
    for (const name of CONFIG.preferred) {
      const desk = desks.find(d => d.name === name);
      if (desk) return desk;
    }
    return desks[0] || null;
  }

  function refreshCount() {
    count.textContent =
      `Available in current form: ${getDesks().length}`;
  }

  function stop() {
    state.stopped = true;
    state.armed = false;
    if (state.timer !== null) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  state.stop = stop;

  function book(testMode) {
    if (state.stopped || state.submitted) return;

    const desks = getDesks();
    const selected = chooseDesk(desks);

    refreshCount();

    if (!selected) {
      setStatus("No desks in current form. Nothing submitted.");
      return;
    }

    const form = selected.element.form;
    if (!form || form.method.toLowerCase() !== "post") {
      setStatus("Booking POST form not found.");
      return;
    }

    const submit = [...form.querySelectorAll(
      'button, input[type="submit"]'
    )].find(el => el.name === "book");

    if (!submit) {
      setStatus("Book button not found.");
      return;
    }

    // Select first; portal enables Book afterwards.
    selected.element.click();

    if (submit.disabled) {
      setStatus("Book button is still disabled.");
      return;
    }

    if (testMode) {
      const ok = confirm(
        `REAL BOOKING\n\n` +
        `Desk: ${selected.name}\n\n` +
        `Verify DATE and HOURS in the portal.\n\n` +
        `OK = submit booking.`
      );
      if (!ok) {
        setStatus("Cancelled. No booking submitted.");
        return;
      }
    }

    state.submitted = true;
    state.armed = false;

    setStatus(`Submitting ${selected.name}...`);
    submit.click();
  }

  function nextTenAM() {
    const date = new Date();
    date.setHours(
      CONFIG.hour,
      CONFIG.minute,
      CONFIG.second,
      0
    );

    if (date.getTime() <= Date.now()) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  function arm() {
    if (state.armed || state.submitted || state.stopped) {
      return;
    }

    state.target = nextTenAM();
    state.armed = true;

    setStatus(
      `ARMED: ${state.target.toLocaleString()}`
    );

    function tick() {
      if (!state.armed || state.stopped) return;

      const remaining = state.target.getTime() - Date.now();

      if (remaining <= 0) {
        state.timer = null;
        state.armed = false;
        clock.textContent = "00:00:00";
        book(false);
        return;
      }

      const seconds = Math.ceil(remaining / 1000);
      const h = String(Math.floor(seconds / 3600))
        .padStart(2, "0");
      const m = String(Math.floor((seconds % 3600) / 60))
        .padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");

      clock.textContent = `${h}:${m}:${s}`;

      state.timer = setTimeout(
        tick,
        Math.min(remaining, 100)
      );
    }

    tick();
  }

  panel.querySelector("#db-test").onclick = () => {
    if (state.armed) {
      setStatus("Stop the timer before testing.");
      return;
    }
    book(true);
  };

  panel.querySelector("#db-arm").onclick = () => {
    if (getDesks().length === 0) {
      setStatus("Open the desk list before arming.");
      return;
    }
    arm();
  };

  panel.querySelector("#db-stop").onclick = () => {
    stop();
    panel.remove();
    log("Stopped.");
  };

  refreshCount();
  setStatus("Ready. Verify date and hours before ARM.");
})();
