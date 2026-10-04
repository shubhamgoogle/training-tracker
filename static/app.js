/**
 * SBI Green Marathon S7 Hyderabad — Training Tracker Frontend Logic
 * Strictly uses safe DOM creation APIs (createElement, textContent, replaceChildren)
 * and synchronizes state between the server SQLite database and browser localStorage.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "sbi_green_marathon_s7_progress_v1";
  const DATA = window.PROGRAM_DATA;

  // In-memory state (CSRF token is held only in memory, never in localStorage)
  let csrfToken = "";
  let state = {
    logs: {}, // { [itemId]: { completed: boolean, updatedAt: number } }
    notes: {} // { [dayId]: { note: string, updatedAt: number } }
  };

  let activeWeekNum = 1;
  let activeDayIndex = 1; // 1 = Mon ... 7 = Sun
  let toastTimeoutId = null;

  function loadLocalCache() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (parsed.logs && typeof parsed.logs === "object") {
          state.logs = parsed.logs;
        }
        if (parsed.notes && typeof parsed.notes === "object") {
          state.notes = parsed.notes;
        }
      }
    } catch (_err) {
      // Ignore storage access errors in private browsing
    }
  }

  function saveLocalCache() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ logs: state.logs, notes: state.notes })
      );
    } catch (_err) {
      // Ignore quota errors
    }
  }

  function setSyncIndicator(text, isWarning) {
    const el = document.getElementById("sync-status");
    if (!el) return;
    el.textContent = text;
    el.style.color = isWarning ? "var(--accent-amber)" : "var(--accent-green-bright)";
  }

  function showToast(message) {
    const banner = document.getElementById("toast-banner");
    if (!banner) return;
    banner.textContent = message;
    banner.classList.add("visible");
    if (toastTimeoutId) {
      window.clearTimeout(toastTimeoutId);
    }
    toastTimeoutId = window.setTimeout(() => {
      banner.classList.remove("visible");
    }, 2200);
  }

  function isItemCompleted(itemId) {
    return Boolean(state.logs[itemId] && state.logs[itemId].completed);
  }

  /**
   * Compute completion metrics for a day object.
   * Handles optional items and alternative groups (e.g., Sunday Long Run OR Cricket).
   */
  function getDayProgress(day) {
    let requiredUnits = 0;
    let completedUnits = 0;
    let anyTouched = false;
    const seenAltGroups = new Set();

    day.items.forEach((item) => {
      const done = isItemCompleted(item.id);
      if (done) {
        anyTouched = true;
      }
      if (item.optional) {
        return;
      }
      if (item.altGroup) {
        if (!seenAltGroups.has(item.altGroup)) {
          seenAltGroups.add(item.altGroup);
          requiredUnits += 1;
          const groupSatisfied = day.items
            .filter((x) => x.altGroup === item.altGroup)
            .some((x) => isItemCompleted(x.id));
          if (groupSatisfied) {
            completedUnits += 1;
          }
        }
      } else {
        requiredUnits += 1;
        if (done) {
          completedUnits += 1;
        }
      }
    });

    const isComplete = requiredUnits > 0 && completedUnits >= requiredUnits;
    const isPartial = !isComplete && (completedUnits > 0 || anyTouched);
    return {
      requiredUnits,
      completedUnits,
      isComplete,
      isPartial,
      status: isComplete ? "done" : isPartial ? "partial" : "pending"
    };
  }

  function computeOverallStats() {
    let totalDays = 0;
    let doneDays = 0;
    let totalRequiredUnits = 0;
    let doneRequiredUnits = 0;
    let totalPlannedKm = 0;
    let completedKm = 0;

    DATA.weeks.forEach((w) => {
      totalPlannedKm += w.runKm;
      w.days.forEach((d) => {
        totalDays += 1;
        const prog = getDayProgress(d);
        totalRequiredUnits += prog.requiredUnits;
        doneRequiredUnits += prog.completedUnits;
        if (prog.isComplete) {
          doneDays += 1;
        }
        d.items.forEach((item) => {
          if (item.km && isItemCompleted(item.id)) {
            completedKm += item.km;
          }
        });
      });
    });

    return {
      totalDays,
      doneDays,
      totalRequiredUnits,
      doneRequiredUnits,
      totalPlannedKm: Math.round(totalPlannedKm * 10) / 10,
      completedKm: Math.round(completedKm * 10) / 10
    };
  }

  function detectCurrentProgramDay() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const todayIso = `${y}-${m}-${d}`;

    for (const w of DATA.weeks) {
      for (const day of w.days) {
        if (day.isoDate === todayIso) {
          return { week: w.week, dayIndex: day.dayIndex, isExactMatch: true };
        }
      }
    }
    if (todayIso < DATA.meta.startDate) {
      return { week: 1, dayIndex: 1, isExactMatch: false };
    }
    if (todayIso > DATA.meta.raceDate) {
      return { week: 11, dayIndex: 7, isExactMatch: false };
    }
    return { week: 1, dayIndex: 1, isExactMatch: false };
  }

  // Server Sync & API Calls
  async function syncWithServer() {
    try {
      setSyncIndicator("Syncing...", false);
      const getRes = await window.fetch("/api/state", {
        method: "GET",
        credentials: "same-origin"
      });
      if (!getRes.ok) {
        setSyncIndicator("Offline Cache", true);
        return;
      }
      const serverData = await getRes.json();
      if (serverData.csrfToken) {
        csrfToken = serverData.csrfToken;
      }

      // Merge local & server state using last-write-wins timestamp
      const mergedLogs = Object.assign({}, serverData.logs || {});
      Object.keys(state.logs).forEach((id) => {
        const localEntry = state.logs[id];
        const srvEntry = mergedLogs[id];
        if (!srvEntry || localEntry.updatedAt >= srvEntry.updatedAt) {
          mergedLogs[id] = localEntry;
        }
      });

      const mergedNotes = Object.assign({}, serverData.notes || {});
      Object.keys(state.notes).forEach((dayId) => {
        const localNote = state.notes[dayId];
        const srvNote = mergedNotes[dayId];
        if (!srvNote || localNote.updatedAt >= srvNote.updatedAt) {
          mergedNotes[dayId] = localNote;
        }
      });

      state.logs = mergedLogs;
      state.notes = mergedNotes;
      saveLocalCache();
      renderAll();

      // Push merged state back so ephemeral Cloud Run instances stay hydrated
      if (csrfToken && (Object.keys(state.logs).length > 0 || Object.keys(state.notes).length > 0)) {
        const postRes = await window.fetch("/api/sync", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          body: JSON.stringify({ logs: state.logs, notes: state.notes })
        });
        if (postRes.ok) {
          const synced = await postRes.json();
          if (synced.logs) state.logs = synced.logs;
          if (synced.notes) state.notes = synced.notes;
          saveLocalCache();
          renderAll();
        }
      }
      setSyncIndicator("Synced", false);
    } catch (_err) {
      setSyncIndicator("Local Saved", true);
    }
  }

  async function toggleExerciseItem(item, day) {
    const nowMs = Date.now();
    const currentlyDone = isItemCompleted(item.id);
    const nextDone = !currentlyDone;

    const batchUpdates = [{ itemId: item.id, completed: nextDone, updatedAt: nowMs }];

    // If this item is part of an exclusive alternative group (e.g. Sunday Long Run OR Cricket)
    // and is being checked ON, uncheck the other option so mileage/choice stays accurate
    if (nextDone && item.altGroup) {
      day.items.forEach((other) => {
        if (other.id !== item.id && other.altGroup === item.altGroup && isItemCompleted(other.id)) {
          batchUpdates.push({ itemId: other.id, completed: false, updatedAt: nowMs });
        }
      });
    }

    batchUpdates.forEach((u) => {
      state.logs[u.itemId] = { completed: u.completed, updatedAt: u.updatedAt };
    });
    saveLocalCache();
    renderAll();

    showToast(nextDone ? `Completed: ${item.name}` : `Unchecked: ${item.name}`);

    if (!csrfToken) return;
    try {
      setSyncIndicator("Saving...", false);
      const res = await window.fetch("/api/day-batch", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({ items: batchUpdates })
      });
      setSyncIndicator(res.ok ? "Synced" : "Local Saved", !res.ok);
    } catch (_err) {
      setSyncIndicator("Local Saved", true);
    }
  }

  async function toggleEntireDay(day) {
    const prog = getDayProgress(day);
    const markAsDone = !prog.isComplete;
    const nowMs = Date.now();
    const batchUpdates = [];
    const handledAltGroups = new Set();

    day.items.forEach((item) => {
      if (!markAsDone) {
        batchUpdates.push({ itemId: item.id, completed: false, updatedAt: nowMs });
        return;
      }
      if (item.optional) {
        return;
      }
      if (item.altGroup) {
        if (!handledAltGroups.has(item.altGroup)) {
          handledAltGroups.add(item.altGroup);
          const groupItems = day.items.filter((x) => x.altGroup === item.altGroup);
          const alreadyDone = groupItems.some((x) => isItemCompleted(x.id));
          if (!alreadyDone && groupItems.length > 0) {
            batchUpdates.push({
              itemId: groupItems[0].id,
              completed: true,
              updatedAt: nowMs
            });
          }
        }
      } else {
        batchUpdates.push({ itemId: item.id, completed: true, updatedAt: nowMs });
      }
    });

    batchUpdates.forEach((u) => {
      state.logs[u.itemId] = { completed: u.completed, updatedAt: u.updatedAt };
    });
    saveLocalCache();
    renderAll();

    showToast(
      markAsDone
        ? `${day.dayName} (${day.displayDate}) marked complete!`
        : `${day.dayName} (${day.displayDate}) reset`
    );

    if (!csrfToken || batchUpdates.length === 0) return;
    try {
      setSyncIndicator("Saving...", false);
      const res = await window.fetch("/api/day-batch", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({ items: batchUpdates })
      });
      setSyncIndicator(res.ok ? "Synced" : "Local Saved", !res.ok);
    } catch (_err) {
      setSyncIndicator("Local Saved", true);
    }
  }

  async function saveDayNote(dayId, noteText) {
    const clean = (noteText || "").trim().slice(0, 500);
    const nowMs = Date.now();
    state.notes[dayId] = { note: clean, updatedAt: nowMs };
    saveLocalCache();
    showToast("Note saved");

    if (!csrfToken) return;
    try {
      setSyncIndicator("Saving...", false);
      const res = await window.fetch("/api/note", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({ dayId, note: clean, updatedAt: nowMs })
      });
      setSyncIndicator(res.ok ? "Synced" : "Local Saved", !res.ok);
    } catch (_err) {
      setSyncIndicator("Local Saved", true);
    }
  }

  // Rendering Functions (Using strict createElement / textContent / replaceChildren)
  function renderHeaderStats() {
    const stats = computeOverallStats();
    const daysEl = document.getElementById("stat-days-done");
    const itemsEl = document.getElementById("stat-items-done");
    const kmEl = document.getElementById("stat-km-done");
    const fillEl = document.getElementById("overall-progress-fill");

    if (daysEl) daysEl.textContent = `${stats.doneDays} / ${stats.totalDays}`;
    if (itemsEl) itemsEl.textContent = `${stats.doneRequiredUnits} / ${stats.totalRequiredUnits}`;
    if (kmEl) kmEl.textContent = `${stats.completedKm} / ${stats.totalPlannedKm} km`;
    if (fillEl) {
      const pct =
        stats.totalRequiredUnits > 0
          ? Math.min(100, Math.round((stats.doneRequiredUnits / stats.totalRequiredUnits) * 100))
          : 0;
      fillEl.style.width = `${pct}%`;
    }
  }

  function renderWeekPills() {
    const container = document.getElementById("week-pills-container");
    if (!container) return;
    container.replaceChildren();

    DATA.weeks.forEach((w) => {
      const doneCount = w.days.filter((d) => getDayProgress(d).isComplete).length;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "week-pill";
      if (w.week === activeWeekNum) btn.classList.add("active");
      if (doneCount === 7) btn.classList.add("completed");

      const titleSpan = document.createElement("span");
      titleSpan.className = "week-pill-title";
      titleSpan.textContent = `W${w.week}`;

      const subSpan = document.createElement("span");
      subSpan.className = "week-pill-sub";
      subSpan.textContent = doneCount === 7 ? "7/7 ✓" : `${doneCount}/7`;

      btn.appendChild(titleSpan);
      btn.appendChild(subSpan);

      btn.addEventListener("click", () => {
        activeWeekNum = w.week;
        renderAll();
      });

      container.appendChild(btn);
    });
  }

  function renderDailyView() {
    const weekObj = DATA.weeks.find((w) => w.week === activeWeekNum) || DATA.weeks[0];
    const dayObj = weekObj.days.find((d) => d.dayIndex === activeDayIndex) || weekObj.days[0];

    // Week dates & Phase banner
    const weekDatesEl = document.getElementById("selected-week-dates");
    if (weekDatesEl) {
      weekDatesEl.textContent = `Week ${weekObj.week} • ${weekObj.dates}`;
    }

    const periodTag = document.getElementById("phase-period-tag");
    const gymTag = document.getElementById("phase-gym-tag");
    const kmTag = document.getElementById("phase-km-tag");
    const goalText = document.getElementById("phase-goal-text");

    if (periodTag) periodTag.textContent = weekObj.phase.period;
    if (gymTag) gymTag.textContent = `Gym: ${weekObj.phase.gym}`;
    if (kmTag) kmTag.textContent = `Target Run: ${weekObj.runKmDisplay}`;
    if (goalText) goalText.textContent = weekObj.phase.goal;

    // 7-Day Tabs
    const dayTabsContainer = document.getElementById("day-tabs-container");
    if (dayTabsContainer) {
      dayTabsContainer.replaceChildren();
      weekObj.days.forEach((d) => {
        const prog = getDayProgress(d);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `day-tab-btn status-${prog.status}`;
        if (d.dayIndex === activeDayIndex) {
          btn.classList.add("active");
        }

        const nameSpan = document.createElement("span");
        nameSpan.className = "day-tab-name";
        nameSpan.textContent = d.shortDay;

        const numSpan = document.createElement("span");
        numSpan.className = "day-tab-num";
        numSpan.textContent = d.displayDate.split(" ")[1];

        const dotSpan = document.createElement("span");
        dotSpan.className = "day-status-dot";

        btn.appendChild(nameSpan);
        btn.appendChild(numSpan);
        btn.appendChild(dotSpan);

        btn.addEventListener("click", () => {
          activeDayIndex = d.dayIndex;
          renderAll();
        });

        dayTabsContainer.appendChild(btn);
      });
    }

    // Active Day Header & Progress
    const dateBadge = document.getElementById("day-date-badge");
    const durationBadge = document.getElementById("day-duration-badge");
    const titleEl = document.getElementById("day-title");
    const purposeEl = document.getElementById("day-purpose");
    const btnCompleteDay = document.getElementById("btn-complete-day");
    const dayFill = document.getElementById("day-progress-fill");
    const dayLabel = document.getElementById("day-progress-label");

    if (dateBadge) dateBadge.textContent = `${dayObj.dayName}, ${dayObj.displayDate}`;
    if (durationBadge) durationBadge.textContent = dayObj.duration;
    if (titleEl) titleEl.textContent = dayObj.title;
    if (purposeEl) purposeEl.textContent = dayObj.purpose;

    const dayProg = getDayProgress(dayObj);
    if (btnCompleteDay) {
      if (dayProg.isComplete) {
        btnCompleteDay.textContent = "✓ Day Complete (Reset)";
        btnCompleteDay.classList.add("all-done");
      } else {
        btnCompleteDay.textContent = "Mark Day Complete";
        btnCompleteDay.classList.remove("all-done");
      }
      btnCompleteDay.onclick = () => toggleEntireDay(dayObj);
    }

    if (dayFill) {
      const pct =
        dayProg.requiredUnits > 0
          ? Math.min(100, Math.round((dayProg.completedUnits / dayProg.requiredUnits) * 100))
          : 0;
      dayFill.style.width = `${pct}%`;
    }
    if (dayLabel) {
      dayLabel.textContent = `${dayProg.completedUnits} of ${dayProg.requiredUnits} done`;
    }

    // Exercise List
    const listContainer = document.getElementById("exercise-list-container");
    if (listContainer) {
      listContainer.replaceChildren();
      let prevAltGroup = null;

      dayObj.items.forEach((item) => {
        if (item.altGroup && prevAltGroup === item.altGroup) {
          const orDiv = document.createElement("div");
          orDiv.className = "or-divider-badge";
          orDiv.textContent = "— OR —";
          listContainer.appendChild(orDiv);
        }
        prevAltGroup = item.altGroup || null;

        const done = isItemCompleted(item.id);
        const itemBtn = document.createElement("button");
        itemBtn.type = "button";
        itemBtn.className = `exercise-item type-${item.type}`;
        if (done) itemBtn.classList.add("done");
        itemBtn.setAttribute("aria-pressed", done ? "true" : "false");

        const checkCircle = document.createElement("div");
        checkCircle.className = "exercise-check-circle";
        checkCircle.textContent = "✓";

        const bodyDiv = document.createElement("div");
        bodyDiv.className = "exercise-body";

        const topLine = document.createElement("div");
        topLine.className = "exercise-top-line";

        const nameSpan = document.createElement("span");
        nameSpan.className = "exercise-name";
        nameSpan.textContent = item.name;

        const recBadge = document.createElement("span");
        recBadge.className = "exercise-rec-badge";
        recBadge.textContent = item.recommended;

        topLine.appendChild(nameSpan);
        topLine.appendChild(recBadge);

        const detailP = document.createElement("p");
        detailP.className = "exercise-detail";
        detailP.textContent = item.detail;

        bodyDiv.appendChild(topLine);
        bodyDiv.appendChild(detailP);

        itemBtn.appendChild(checkCircle);
        itemBtn.appendChild(bodyDiv);

        itemBtn.addEventListener("click", () => toggleExerciseItem(item, dayObj));
        listContainer.appendChild(itemBtn);
      });
    }

    // Daily Note Input
    const noteInput = document.getElementById("day-note-input");
    const btnSaveNote = document.getElementById("btn-save-note");
    if (noteInput) {
      const savedNote = state.notes[dayObj.id] ? state.notes[dayObj.id].note : "";
      if (document.activeElement !== noteInput) {
        noteInput.value = savedNote;
      }
    }
    if (btnSaveNote && noteInput) {
      btnSaveNote.onclick = () => saveDayNote(dayObj.id, noteInput.value);
    }
  }

  function renderCalendarView() {
    const container = document.getElementById("calendar-weeks-container");
    if (!container) return;
    container.replaceChildren();

    DATA.weeks.forEach((w) => {
      const card = document.createElement("div");
      card.className = "cal-week-card";

      const header = document.createElement("div");
      header.className = "cal-week-header";

      const title = document.createElement("h3");
      title.className = "cal-week-title";
      title.textContent = `Week ${w.week}: ${w.dates}`;

      const badges = document.createElement("div");
      badges.className = "cal-week-badges";

      const kmBadge = document.createElement("span");
      kmBadge.className = "cal-badge-km";
      kmBadge.textContent = w.runKmDisplay;

      const doneDaysCount = w.days.filter((d) => getDayProgress(d).isComplete).length;
      const doneBadge = document.createElement("span");
      doneBadge.className = "cal-badge-done";
      doneBadge.textContent = `${doneDaysCount}/7 days`;

      badges.appendChild(kmBadge);
      badges.appendChild(doneBadge);
      header.appendChild(title);
      header.appendChild(badges);

      const grid = document.createElement("div");
      grid.className = "cal-days-grid";

      w.days.forEach((d) => {
        const prog = getDayProgress(d);
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = `cal-day-cell ${prog.status}`;

        const top = document.createElement("div");
        top.className = "cal-day-top";

        const daySpan = document.createElement("span");
        daySpan.textContent = `${d.shortDay} • ${d.displayDate}`;

        const statusSpan = document.createElement("span");
        statusSpan.className = "cal-day-status";
        statusSpan.textContent =
          prog.status === "done"
            ? "✓ Done"
            : prog.status === "partial"
            ? `${prog.completedUnits}/${prog.requiredUnits}`
            : "";

        top.appendChild(daySpan);
        top.appendChild(statusSpan);

        const label = document.createElement("div");
        label.className = "cal-day-label";
        label.textContent = d.calendarLabel;

        cell.appendChild(top);
        cell.appendChild(label);

        cell.addEventListener("click", () => {
          activeWeekNum = w.week;
          activeDayIndex = d.dayIndex;
          switchTab("view-daily");
          renderAll();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });

        grid.appendChild(cell);
      });

      card.appendChild(header);
      card.appendChild(grid);
      container.appendChild(card);
    });
  }

  function renderGuidesView() {
    const objEl = document.getElementById("guide-objective-text");
    if (objEl && !objEl.textContent) {
      objEl.textContent = DATA.meta.objective;
    }

    const whyEl = document.getElementById("guide-why-structure");
    if (whyEl && !whyEl.textContent) {
      whyEl.textContent = `Why this structure? ${DATA.meta.whyStructure}`;
    }

    // Section 1: Weekly Structure
    const structContainer = document.getElementById("guide-weekly-structure");
    if (structContainer && structContainer.childElementCount === 0) {
      DATA.weeklyStructure.forEach((row) => {
        const item = document.createElement("div");
        item.className = "guide-row-item";

        const top = document.createElement("div");
        top.className = "guide-row-top";

        const title = document.createElement("span");
        title.className = "guide-row-title";
        title.textContent = `${row.day} — ${row.training}`;

        const pill = document.createElement("span");
        pill.className = "guide-row-pill";
        pill.textContent = row.time;

        top.appendChild(title);
        top.appendChild(pill);

        const sub = document.createElement("p");
        sub.className = "guide-row-sub";
        sub.textContent = row.purpose;

        item.appendChild(top);
        item.appendChild(sub);
        structContainer.appendChild(item);
      });
    }

    // Section 3: Pace & HR Guide
    const paceContainer = document.getElementById("guide-pace-list");
    if (paceContainer && paceContainer.childElementCount === 0) {
      DATA.paceGuide.forEach((p) => {
        const item = document.createElement("div");
        item.className = "guide-row-item";

        const top = document.createElement("div");
        top.className = "guide-row-top";

        const title = document.createElement("span");
        title.className = "guide-row-title";
        title.textContent = `${p.type}: ${p.pace}`;

        const pill = document.createElement("span");
        pill.className = "guide-row-pill";
        pill.textContent = p.hrRpe;

        top.appendChild(title);
        top.appendChild(pill);

        const sub = document.createElement("p");
        sub.className = "guide-row-sub";
        sub.textContent = p.rule;

        item.appendChild(top);
        item.appendChild(sub);
        paceContainer.appendChild(item);
      });
    }

    const baseEl = document.getElementById("guide-baseline-text");
    if (baseEl && !baseEl.textContent) {
      baseEl.textContent = DATA.meta.baseline;
    }

    // Section 4: Strength Plan
    const prinEl = document.getElementById("guide-strength-principle");
    if (prinEl && !prinEl.textContent) {
      prinEl.textContent = `Principle: ${DATA.meta.strengthPrinciple}`;
    }
    const effEl = document.getElementById("guide-strength-effort");
    if (effEl && !effEl.textContent) {
      effEl.textContent = `Effort Rule: ${DATA.meta.strengthEffort}`;
    }

    const strengthContainer = document.getElementById("guide-strength-sessions");
    if (strengthContainer && strengthContainer.childElementCount === 0) {
      Object.values(DATA.strengthTemplates).forEach((tpl) => {
        const box = document.createElement("div");
        box.className = "strength-template-box";

        const h3 = document.createElement("h3");
        h3.className = "strength-template-title";
        h3.textContent = tpl.title;
        box.appendChild(h3);

        tpl.exercises.forEach((ex) => {
          const row = document.createElement("div");
          row.className = "strength-ex-row";

          const nameSpan = document.createElement("span");
          nameSpan.textContent = ex.name;

          const setsSpan = document.createElement("span");
          setsSpan.className = "strength-ex-sets";
          setsSpan.textContent = ex.setsReps;

          row.appendChild(nameSpan);
          row.appendChild(setsSpan);
          box.appendChild(row);
        });

        strengthContainer.appendChild(box);
      });
    }

    // Section 5: Strength Volume by Phase
    const phasesContainer = document.getElementById("guide-phases-list");
    if (phasesContainer && phasesContainer.childElementCount === 0) {
      DATA.strengthPhases.forEach((ph) => {
        const item = document.createElement("div");
        item.className = "guide-row-item";

        const top = document.createElement("div");
        top.className = "guide-row-top";

        const title = document.createElement("span");
        title.className = "guide-row-title";
        title.textContent = ph.period;

        const pill = document.createElement("span");
        pill.className = "guide-row-pill";
        pill.textContent = ph.gym;

        top.appendChild(title);
        top.appendChild(pill);

        const sub = document.createElement("p");
        sub.className = "guide-row-sub";
        sub.textContent = ph.goal;

        item.appendChild(top);
        item.appendChild(sub);
        phasesContainer.appendChild(item);
      });
    }
  }

  function switchTab(targetId) {
    document.querySelectorAll(".tab-view").forEach((section) => {
      section.classList.toggle("active", section.id === targetId);
    });
    document.querySelectorAll(".nav-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-target") === targetId);
    });
  }

  function setupBackupHandlers() {
    const btnExport = document.getElementById("btn-export-json");
    const inputImport = document.getElementById("input-import-json");

    if (btnExport) {
      btnExport.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sbi-marathon-s7-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Backup exported");
      });
    }

    if (inputImport) {
      inputImport.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const imported = JSON.parse(String(ev.target.result));
            if (imported && typeof imported === "object") {
              if (imported.logs && typeof imported.logs === "object") {
                Object.assign(state.logs, imported.logs);
              }
              if (imported.notes && typeof imported.notes === "object") {
                Object.assign(state.notes, imported.notes);
              }
              saveLocalCache();
              renderAll();
              await syncWithServer();
              showToast("Progress imported & synced!");
            }
          } catch (_err) {
            showToast("Invalid backup JSON file");
          }
        };
        reader.readAsText(file);
      });
    }
  }

  const THEME_STORAGE_KEY = "sbi_green_marathon_s7_theme";

  function applyTheme(theme) {
    const normalized = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", normalized);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", normalized === "light" ? "#f3f7f5" : "#0b1310");
    }
    const btnTheme = document.getElementById("btn-theme-toggle");
    if (btnTheme) {
      btnTheme.textContent = normalized === "light" ? "☾ Dark" : "☀ Light";
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch (_err) {
      // Ignore storage errors
    }
  }

  function setupThemeToggle() {
    let savedTheme = "dark";
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        savedTheme = stored;
      }
    } catch (_err) {
      // Ignore
    }
    applyTheme(savedTheme);

    const btnTheme = document.getElementById("btn-theme-toggle");
    if (btnTheme) {
      btnTheme.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        const next = current === "light" ? "dark" : "light";
        applyTheme(next);
        showToast(`${next === "light" ? "Light" : "Dark"} theme enabled`);
      });
    }
  }

  function renderAll() {
    renderHeaderStats();
    renderWeekPills();
    renderDailyView();
    renderCalendarView();
    renderGuidesView();
  }

  function init() {
    setupThemeToggle();
    loadLocalCache();
    const detected = detectCurrentProgramDay();
    activeWeekNum = detected.week;
    activeDayIndex = detected.dayIndex;

    // Navigation listeners
    document.querySelectorAll(".nav-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");
        if (target) switchTab(target);
      });
    });

    const btnToday = document.getElementById("btn-today");
    if (btnToday) {
      btnToday.addEventListener("click", () => {
        const cur = detectCurrentProgramDay();
        activeWeekNum = cur.week;
        activeDayIndex = cur.dayIndex;
        switchTab("view-daily");
        renderAll();
        showToast(
          cur.isExactMatch
            ? "Jumped to Today's session"
            : `Program starts Oct 5 — showing Week ${cur.week}, Day ${cur.dayIndex}`
        );
      });
    }

    setupBackupHandlers();
    renderAll();
    syncWithServer();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
