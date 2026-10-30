
(() => {
  "use strict";

  window.__deskBooker?.stop?.();
  document.getElementById("desk-booker-panel")?.remove();

  const CFG = {
    preferred: [
      "23.D049",
      "23.D060",
      "23.D061",
      "23.D072",
      "23.D073"
    ],
    hour: 10,
    minute: 0,
    maxAttempts: 8,
    responseTimeoutMs: 5000,
    retryDelayMs: 150
  };

  const S = {
    armed: false,
    stopped: false,
    busy: false,
    submitted: false,
    confirmed: false,
    target: null,
    timer: null,
    responseTimer: null,
    observer: null,
    attempts: 0,
    tried: new Set(),
    logs: [],
    pendingDesk: null
  };

  window.__deskBooker = S;

  const panel = document.createElement("div");
  panel.id = "desk-booker-panel";
  panel.style.cssText = `
    position:fixed;right:18px;bottom:18px;
    z-index:2147483647;width:310px;
    padding:16px;background:#17212b;color:white;
    border-radius:12px;font:13px Arial,sans-serif;
    box-shadow:0 4px 20px #0007;
  `;

  panel.innerHTML = `
    <div style="font-size:17px;font-weight:bold">
      Desk Booker v2.0
    </div>
    <div id="db-status" style="margin:12px 0">
      Initializing...
    </div>
    <div id="db-clock" style="
      font-size:24px;font-weight:bold;margin:10px 0">
      --:--:--
    </div>
    <div id="db-count" style="margin-bottom:10px"></div>
    <div id="db-attempts" style="margin-bottom:12px"></div>
    <button id="db-test">TEST NOW</button>
    <button id="db-arm">ARM 10:00</button>
    <button id="db-stop">STOP</button>
    <button id="db-logs">COPY LOGS</button>
  `;

  document.body.appendChild(panel);

  panel.querySelectorAll("button").forEach(b => {
    b.type = "button";
    b.style.cssText = `
      padding:8px;margin:3px;border:0;
      border-radius:5px;cursor:pointer;
    `;
  });

  const $ = id => panel.querySelector("#" + id);

  function log(event, details = "") {
    const entry = {
      time: new Date().toISOString(),
      elapsedMs: performance.now().toFixed(1),
      event,
      details
    };

    S.logs.push(entry);
    console.log("[DeskBooker]", entry);

    try {
      sessionStorage.setItem(
        "deskBookerLogs",
        JSON.stringify(S.logs)
      );
    } catch (_) {}
  }

  function status(message) {
    $("db-status").textContent = message;
    log("STATUS", message);
  }

  function getDesks() {
    return [...document.querySelectorAll(
      'input[type="radio"][name="desk"]'
    )]
      .filter(el => !el.disabled)
      .map(el => ({
        el,
        name: el.closest("label")?.innerText
          .match(/23\.D\d+/)?.[0]
      }))
      .filter(d => d.name && d.el.isConnected);
  }

  function updateCount() {
    $("db-count").textContent =
      `Available in DOM: ${getDesks().length}`;

    $("db-attempts").textContent =
      `Attempts: ${S.attempts}/${CFG.maxAttempts}`;
  }

  function chooseDesk() {
    const desks = getDesks().filter(
      d => !S.tried.has(d.name)
    );

    for (const name of CFG.preferred) {
      const found = desks.find(d => d.name === name);
      if (found) return found;
    }

    return desks[0] || null;
  }

  function stop(message = "Stopped") {
    S.stopped = true;
    S.armed = false;
    S.busy = false;

    clearTimeout(S.timer);
    clearTimeout(S.responseTimer);
    S.observer?.disconnect();

    log("STOP", message);
  }

  S.stop = stop;

  function findSubmit(form) {
    return [...form.querySelectorAll(
      'button, input[type="submit"]'
    )].find(el => el.name === "book");
  }

  function visibleText() {
    return document.body.innerText || "";
  }

  const conflictPattern =
    /(?:desk|workstation|seat).{0,100}(?:not available|unavailable|already booked|already reserved|taken)|(?:not available|unavailable|already booked|already reserved).{0,100}(?:desk|workstation|seat)/i;

  const successPattern =
    /the booking has been successfully created/i;

  function finishSuccess() {
    if (S.confirmed || S.stopped) return;

    S.confirmed = true;
    S.busy = false;
    S.submitted = false;

    clearTimeout(S.responseTimer);
    S.observer?.disconnect();

    status("SUCCESS — booking confirmed");
    log("SUCCESS", S.pendingDesk || "");

    updateCount();
  }

  function handleConflict() {
    if (!S.busy || S.stopped || S.confirmed) return;

    clearTimeout(S.responseTimer);

    log("CONFLICT", S.pendingDesk || "");
    S.busy = false;
    S.submitted = false;

    if (S.attempts >= CFG.maxAttempts) {
      status("Attempt limit reached");
      return;
    }

    status("Conflict detected. Checking next desk...");

    setTimeout(() => {
      if (S.stopped || S.confirmed) return;

      // Retry only if a valid booking form is present.
      const next = chooseDesk();

      if (!next || !next.el.form?.isConnected) {
        status(
          "No usable desk form. Manual refresh required."
        );
        return;
      }

      attempt(false);
    }, CFG.retryDelayMs);
  }

  function watchResult() {
    S.observer?.disconnect();

    // Capture only text introduced/changed after submit.
    const baseline = visibleText();

    S.observer = new MutationObserver(() => {
      if (!S.busy || S.stopped || S.confirmed) return;

      const text = visibleText();

      if (text === baseline) return;

      if (successPattern.test(text) &&
          !successPattern.test(baseline)) {
        finishSuccess();
        return;
      }

      if (conflictPattern.test(text) &&
          !conflictPattern.test(baseline)) {
        handleConflict();
      }
    });

    S.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    clearTimeout(S.responseTimer);

    S.responseTimer = setTimeout(() => {
      if (!S.busy || S.confirmed || S.stopped) return;

      S.busy = false;
      S.submitted = false;
      S.observer?.disconnect();

      status(
        "Result unknown — check My Bookings before retry."
      );

      log(
        "UNKNOWN_RESULT",
        `No confirmed result for ${S.pendingDesk}`
      );
    }, CFG.responseTimeoutMs);
  }

  function attempt(testMode = false) {
    if (S.stopped || S.busy || S.confirmed) return;

    if (S.attempts >= CFG.maxAttempts) {
      status("Maximum attempts reached");
      return;
    }

    const desk = chooseDesk();

    if (!desk) {
      status("No untried available desks in current DOM");
      return;
    }

    const form = desk.el.form;

    if (!form || form.method.toLowerCase() !== "post") {
      status("Valid POST booking form not found");
      return;
    }

    const submit = findSubmit(form);

    if (!submit) {
      status("Book button not found");
      return;
    }

    desk.el.click();

    if (submit.disabled) {
      status("Book button remains disabled");
      return;
    }

    if (testMode) {
      const ok = confirm(
        `REAL BOOKING\n\nDesk: ${desk.name}\n\n` +
        "Verify the selected DATE and HOURS.\n\n" +
        "OK = submit real booking."
      );

      if (!ok) {
        status("Test cancelled");
        return;
      }
    }

    S.attempts++;
    S.tried.add(desk.name);
    S.pendingDesk = desk.name;
    S.busy = true;
    S.submitted = true;

    updateCount();

    log("ATTEMPT_START", {
      attempt: S.attempts,
      desk: desk.name
    });

    status(`Attempt ${S.attempts}: ${desk.name}`);

    watchResult();

    // Submit through the portal's existing UI.
    submit.click();

    log("SUBMIT_CLICKED", desk.name);
  }

  function arm() {
    if (S.stopped || S.armed || S.busy ||
        S.confirmed) return;

    if (!getDesks().length) {
      status("Open the desk list before ARM");
      return;
    }

    const target = new Date();
    target.setHours(CFG.hour, CFG.minute, 0, 0);

    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1);
    }

    S.target = target;
    S.armed = true;

    status(`ARMED for ${target.toLocaleString()}`);
    log("ARMED", target.toISOString());

    function tick() {
      if (!S.armed || S.stopped) return;

      const ms = S.target.getTime() - Date.now();

      if (ms <= 0) {
        S.armed = false;
        $("db-clock").textContent = "00:00:00";

        log("TRIGGER", "Booking time reached");
        attempt(false);
        return;
      }

      const sec = Math.ceil(ms / 1000);
      const h = String(Math.floor(sec / 3600))
        .padStart(2, "0");
      const m = String(Math.floor((sec % 3600) / 60))
        .padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");

      $("db-clock").textContent = `${h}:${m}:${s}`;

      S.timer = setTimeout(
        tick,
        Math.min(ms, 100)
      );
    }

    tick();
  }

  $("db-test").onclick = () => {
    if (S.armed) {
      status("Press STOP before manual testing");
      return;
    }
    attempt(true);
  };

  $("db-arm").onclick = arm;

  $("db-stop").onclick = () => {
    stop("User pressed STOP");
    panel.remove();
  };

  $("db-logs").onclick = async () => {
    const data = JSON.stringify(S.logs, null, 2);

    try {
      await navigator.clipboard.writeText(data);
      status("Logs copied to clipboard");
    } catch (_) {
      console.log(data);
      status("Clipboard unavailable — logs in Console");
    }
  };

  updateCount();
  status("Ready — verify date and hours");
})();
