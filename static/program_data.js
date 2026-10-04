/**
 * SBI Green Marathon S7 Hyderabad — Complete Training Plan (Sections 1–5)
 * Half Marathon 21.1 km • Sunday, 20 December 2026 • 5:00 AM • University of Hyderabad
 */

window.PROGRAM_DATA = (function () {
  const META = {
    title: "SBI Green Marathon S7 Hyderabad",
    subtitle: "Half Marathon 21.1 km • Sunday, 20 Dec 2026 • 5:00 AM • University of Hyderabad",
    raceDate: "2026-12-20",
    startDate: "2026-10-05",
    objective:
      "Build from the current running base to a confident 21.1 km finish while preserving muscle, continuing sensible fat loss, and maintaining strength for the longer-term Ironman 70.3 goal. Practical 11-week plan built around a maximum ~90-minute weekday window.",
    whyStructure:
      "It gives 3 running exposures, 3 resistance-training exposures, and one complete rest day. It also separates the quality run from the long run and gives your legs a recovery buffer on Wednesday.",
    baseline:
      "Recent Wellness data shows about 53.8 km across the last 4 weeks, ~13.4 km/week, ~2.5 runs/week, longest recent run ~8.3 km, recent 14-day average pace ~9:35/km, and duration-weighted average HR ~134 bpm.",
    strengthPrinciple:
      "You will not lose large amounts of muscle simply because running volume rises. The main protection is continued resistance training, adequate protein, and avoiding an overly aggressive calorie deficit. The gym volume is deliberately enough to maintain/build strength without making running recovery impossible.",
    strengthEffort:
      "Keep ~2–3 reps in reserve on most sets. Do not take lower-body sets to failure. Friday legs should be moderate because Saturday and Sunday are running/cricket days."
  };

  // Section 1: Weekly Structure
  const WEEKLY_STRUCTURE = [
    {
      day: "Monday",
      training: "Lower-body strength",
      time: "60–80 min",
      purpose: "Main leg strength; avoid failure",
      type: "strength"
    },
    {
      day: "Tuesday",
      training: "Easy run + Upper body",
      time: "80–90 min",
      purpose: "Easy aerobic work + muscle maintenance",
      type: "combo"
    },
    {
      day: "Wednesday",
      training: "Full rest",
      time: "—",
      purpose: "Walking/mobility optional",
      type: "rest"
    },
    {
      day: "Thursday",
      training: "Quality run",
      time: "45–65 min",
      purpose: "Tempo / intervals / progression / HM effort",
      type: "run"
    },
    {
      day: "Friday",
      training: "Full body / upper + lower accessories",
      time: "65–85 min",
      purpose: "Moderate; protect Saturday/Sunday legs",
      type: "strength"
    },
    {
      day: "Saturday",
      training: "Easy/recovery run + mobility",
      time: "40–60 min",
      purpose: "Very easy aerobic volume",
      type: "run"
    },
    {
      day: "Sunday",
      training: "Long run OR cricket",
      time: "60–130+ min",
      purpose: "Cricket replaces long run; do not stack hard cricket + long run",
      type: "long"
    }
  ];

  // Section 3: Running Pace & Heart-Rate Guide
  const PACE_GUIDE = [
    {
      type: "Easy",
      pace: "~9:30–10:30/km",
      hrRpe: "125–145 bpm",
      rule: "Conversational; HR/RPE wins over pace, especially in heat."
    },
    {
      type: "Long",
      pace: "~9:30–10:45/km",
      hrRpe: "Mostly 125–145",
      rule: "First half deliberately easy; don't turn long runs into races."
    },
    {
      type: "Steady",
      pace: "~8:45–9:20/km",
      hrRpe: "Controlled",
      rule: "Faster than easy, but sustainable."
    },
    {
      type: "Tempo",
      pace: "~8:15–8:40/km initially",
      hrRpe: "~7/10 RPE",
      rule: "Controlled hard; not all-out."
    },
    {
      type: "HM effort",
      pace: "Establish Weeks 7–9",
      hrRpe: "Controlled-hard",
      rule: "Used to refine race pace."
    },
    {
      type: "Strides",
      pace: "20 sec fast + relaxed",
      hrRpe: "Not maximal",
      rule: "Smooth, quick mechanics; full recovery."
    }
  ];

  // Section 4: Detailed Strength Plan Templates (Exercise level with recommended sets × reps)
  const STRENGTH_TEMPLATES = {
    mondayLower: {
      title: "Monday — Lower Body",
      subtitle: "Keep ~2–3 reps in reserve. Do not take lower-body sets to failure.",
      exercises: [
        { key: "squat", name: "Squat / leg press", setsReps: "3×5–8", category: "Lower Body" },
        { key: "rdl", name: "Romanian deadlift", setsReps: "3×6–8", category: "Lower Body" },
        { key: "bss", name: "Bulgarian split squat", setsReps: "2×8–10/leg", category: "Lower Body" },
        { key: "leg_curl", name: "Leg curl", setsReps: "2–3×10–12", category: "Lower Body" },
        { key: "calf_raise", name: "Calf raise", setsReps: "3×10–15", category: "Lower Body" },
        { key: "core_mon", name: "Core", setsReps: "3 sets", category: "Core" }
      ]
    },
    tuesdayUpper: {
      title: "Tuesday — Upper (after easy run)",
      subtitle: "Easy aerobic work + upper-body muscle maintenance.",
      exercises: [
        { key: "bench", name: "Bench press", setsReps: "3×6–10", category: "Upper Body" },
        { key: "lat_pd", name: "Lat pulldown / pull-ups", setsReps: "3×8–12", category: "Upper Body" },
        { key: "seated_row", name: "Seated row", setsReps: "3×8–12", category: "Upper Body" },
        { key: "incline_db", name: "Incline DB press", setsReps: "2×8–12", category: "Upper Body" },
        { key: "shoulder_press", name: "Shoulder press", setsReps: "2×8–10", category: "Upper Body" },
        { key: "lat_raise_tue", name: "Lateral raise", setsReps: "2×12–15", category: "Upper Body" },
        { key: "arms_tue", name: "Biceps + triceps", setsReps: "2×10–15 each", category: "Arms" }
      ]
    },
    fridayFullBody: {
      title: "Friday — Full Body / Accessories",
      subtitle: "Moderate effort; protect Saturday & Sunday running/cricket legs.",
      exercises: [
        { key: "hip_thrust", name: "Hip thrust", setsReps: "3×8–12", category: "Lower Accessory" },
        { key: "bss_stepup", name: "Bulgarian split squat / step-up", setsReps: "2×8–10", category: "Lower Accessory" },
        { key: "ham_curl", name: "Hamstring curl", setsReps: "2×10–12", category: "Lower Accessory" },
        { key: "chest_press", name: "Chest press", setsReps: "3×6–10", category: "Upper Body" },
        { key: "row_fri", name: "Row", setsReps: "3×8–12", category: "Upper Body" },
        { key: "lat_pd_fri", name: "Lat pulldown", setsReps: "2×8–12", category: "Upper Body" },
        { key: "lat_raise_fri", name: "Lateral raise", setsReps: "2×12–15", category: "Upper Body" },
        { key: "arms_fri", name: "Arms", setsReps: "2 + 2 sets", category: "Arms" },
        { key: "core_fri", name: "Core", setsReps: "2–3 sets", category: "Core" }
      ]
    }
  };

  // Section 5: Strength Volume by Training Phase
  const STRENGTH_PHASES = [
    {
      period: "Weeks 1–3",
      weeks: [1, 2, 3],
      gym: "3 sessions/week",
      goal: "Normal productive volume; establish routine.",
      volumeBadge: "Normal Volume (100%)"
    },
    {
      period: "Week 4",
      weeks: [4],
      gym: "3 sessions, ~20% less volume",
      goal: "Cutback for recovery.",
      volumeBadge: "Cutback (~20% less gym volume)"
    },
    {
      period: "Weeks 5–6",
      weeks: [5, 6],
      gym: "3 sessions/week",
      goal: "Normal/moderate; long-run volume rises.",
      volumeBadge: "Normal / Moderate Volume"
    },
    {
      period: "Weeks 7–8",
      weeks: [7, 8],
      gym: "3 sessions, ~25% less volume",
      goal: "Maintain intensity, reduce fatigue.",
      volumeBadge: "Reduced Volume (~25% less)"
    },
    {
      period: "Week 9",
      weeks: [9],
      gym: "3 sessions, ~40% less volume",
      goal: "Peak running week; preserve strength.",
      volumeBadge: "Peak Run Week (~40% less gym volume)"
    },
    {
      period: "Week 10",
      weeks: [10],
      gym: "2 light sessions",
      goal: "Taper begins; no hard leg fatigue.",
      volumeBadge: "Taper (2 light sessions; no hard leg fatigue)"
    },
    {
      period: "Week 11",
      weeks: [11],
      gym: "Activation/light upper only",
      goal: "No heavy lower body; arrive fresh.",
      volumeBadge: "Race Week (Activation / light upper only)"
    }
  ];

  // Raw 11-Week Calendar Definition (Section 2)
  const RAW_WEEKS = [
    {
      week: 1,
      dates: "Oct 5–11",
      startDate: "2026-10-05",
      runKm: 23,
      runKmDisplay: "23 km",
      mon: "Lower",
      tue: "5 easy + Upper",
      tueKm: 5,
      wed: "REST",
      thu: "5 easy + 4×20s",
      thuKm: 5,
      thuType: "strides",
      thuDetail: "5 km easy (~9:30–10:30/km, 125–145 bpm) + 4×20 sec fast & relaxed strides (full recovery)",
      fri: "Full body",
      sat: "4 easy",
      satKm: 4,
      sun: "9 long",
      sunKm: 9
    },
    {
      week: 2,
      dates: "Oct 12–18",
      startDate: "2026-10-12",
      runKm: 26.5,
      runKmDisplay: "26.5 km",
      mon: "Lower",
      tue: "5.5 easy + Upper",
      tueKm: 5.5,
      wed: "REST",
      thu: "6: 3×1 km @8:30–8:45",
      thuKm: 6,
      thuType: "intervals",
      thuDetail: "6 km total run including 3×1 km intervals @ 8:30–8:45/km (~7/10 RPE, controlled hard)",
      fri: "Full body",
      sat: "4 easy",
      satKm: 4,
      sun: "11 long",
      sunKm: 11
    },
    {
      week: 3,
      dates: "Oct 19–25",
      startDate: "2026-10-19",
      runKm: 29,
      runKmDisplay: "29 km",
      mon: "Lower",
      tue: "6 easy + Upper",
      tueKm: 6,
      wed: "REST",
      thu: "6 steady; 3 km @8:45–9:10",
      thuKm: 6,
      thuType: "steady",
      thuDetail: "6 km total run including 3 km steady @ 8:45–9:10/km (Controlled; faster than easy, sustainable)",
      fri: "Full body",
      sat: "4.5 easy",
      satKm: 4.5,
      sun: "12.5 long",
      sunKm: 12.5
    },
    {
      week: 4,
      dates: "Oct 26–Nov 1",
      startDate: "2026-10-26",
      runKm: 25,
      runKmDisplay: "25 km",
      mon: "Lower ↓",
      tue: "5 easy + Upper",
      tueKm: 5,
      wed: "REST",
      thu: "5.5 easy + 6×20s",
      thuKm: 5.5,
      thuType: "strides",
      thuDetail: "5.5 km easy (~9:30–10:30/km, 125–145 bpm) + 6×20 sec fast & relaxed strides (full recovery)",
      fri: "Full body ↓",
      sat: "4 easy",
      satKm: 4,
      sun: "10.5 long",
      sunKm: 10.5
    },
    {
      week: 5,
      dates: "Nov 2–8",
      startDate: "2026-11-02",
      runKm: 31,
      runKmDisplay: "31 km",
      mon: "Lower",
      tue: "6 easy + Upper",
      tueKm: 6,
      wed: "REST",
      thu: "7: 3×1.5 km @8:15–8:35",
      thuKm: 7,
      thuType: "intervals",
      thuDetail: "7 km total run including 3×1.5 km intervals @ 8:15–8:35/km (~7/10 RPE, controlled hard)",
      fri: "Full body",
      sat: "4 easy",
      satKm: 4,
      sun: "14 long",
      sunKm: 14
    },
    {
      week: 6,
      dates: "Nov 9–15",
      startDate: "2026-11-09",
      runKm: 33,
      runKmDisplay: "33 km",
      mon: "Lower",
      tue: "6 easy + Upper",
      tueKm: 6,
      wed: "REST",
      thu: "7 progression; last 2 km @8:30–8:45",
      thuKm: 7,
      thuType: "progression",
      thuDetail: "7 km progression run; start easy (~9:30–10:30/km) and finish last 2 km @ 8:30–8:45/km",
      fri: "Full body",
      sat: "4.5 easy",
      satKm: 4.5,
      sun: "15.5 long",
      sunKm: 15.5
    },
    {
      week: 7,
      dates: "Nov 16–22",
      startDate: "2026-11-16",
      runKm: 35.5,
      runKmDisplay: "35.5 km",
      mon: "Lower ↓",
      tue: "6.5 easy + Upper",
      tueKm: 6.5,
      wed: "REST",
      thu: "7.5 tempo; 3 km @8:15–8:30",
      thuKm: 7.5,
      thuType: "tempo",
      thuDetail: "7.5 km total run including 3 km tempo @ 8:15–8:30/km (~7/10 RPE, controlled hard; not all-out)",
      fri: "Full body light",
      sat: "4.5 easy",
      satKm: 4.5,
      sun: "17 long",
      sunKm: 17
    },
    {
      week: 8,
      dates: "Nov 23–29",
      startDate: "2026-11-23",
      runKm: 36,
      runKmDisplay: "36 km",
      mon: "Lower ↓",
      tue: "6 easy + Upper",
      tueKm: 6,
      wed: "REST",
      thu: "7: 5×800 m @8:00–8:20",
      thuKm: 7,
      thuType: "intervals",
      thuDetail: "7 km total run including 5×800 m intervals @ 8:00–8:20/km (Controlled hard with recovery jogs)",
      fri: "Full body light",
      sat: "5 easy",
      satKm: 5,
      sun: "18 long",
      sunKm: 18
    },
    {
      week: 9,
      dates: "Nov 30–Dec 6",
      startDate: "2026-11-30",
      runKm: 37,
      runKmDisplay: "37 km",
      mon: "Lower light",
      tue: "6 easy + Upper",
      tueKm: 6,
      wed: "REST",
      thu: "7 incl. 3 km HM effort",
      thuKm: 7,
      thuType: "hm_effort",
      thuDetail: "7 km total run including 3 km @ Half Marathon effort (Controlled-hard; refine race pace)",
      fri: "Very light",
      sat: "5 easy",
      satKm: 5,
      sun: "19 long",
      sunKm: 19
    },
    {
      week: 10,
      dates: "Dec 7–13",
      startDate: "2026-12-07",
      runKm: 28,
      runKmDisplay: "28 km",
      mon: "Lower very light",
      tue: "6 easy + Upper light",
      tueKm: 6,
      wed: "REST",
      thu: "6 incl. 3×1 km HM effort",
      thuKm: 6,
      thuType: "hm_effort",
      thuDetail: "6 km total run including 3×1 km @ Half Marathon effort (Controlled-hard; sharpen race rhythm)",
      fri: "Very light",
      sat: "4 easy",
      satKm: 4,
      sun: "12 long",
      sunKm: 12
    },
    {
      week: 11,
      dates: "Dec 14–20",
      startDate: "2026-12-14",
      runKm: 30.1,
      runKmDisplay: "~30.1 km*",
      mon: "Activation",
      tue: "5 easy + Upper light",
      tueKm: 5,
      wed: "REST",
      thu: "4 easy + 4×20s",
      thuKm: 4,
      thuType: "strides",
      thuDetail: "4 km easy (~9:30–10:30/km) + 4×20 sec relaxed race-week strides (smooth mechanics, full recovery)",
      fri: "Mobility",
      sat: "20 min jog/walk OR rest",
      satKm: 0,
      sun: "RACE 21.1",
      sunKm: 21.1
    }
  ];

  function addDays(isoDate, daysToAdd) {
    const parts = isoDate.split("-").map(Number);
    const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + daysToAdd));
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatShortDate(isoDate) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parts = isoDate.split("-").map(Number);
    return `${months[parts[1] - 1]} ${parts[2]}`;
  }

  function getPhaseForWeek(weekNum) {
    return STRENGTH_PHASES.find((p) => p.weeks.includes(weekNum)) || STRENGTH_PHASES[0];
  }

  function getStrengthModifierNote(weekNum, label) {
    if (weekNum === 4) {
      return "Week 4 Cutback: perform ~20% less volume (e.g., drop 1 set on 3-set exercises)";
    }
    if (weekNum === 7 || weekNum === 8) {
      return `Week ${weekNum} Volume Reduction: ~25% less gym volume — maintain weight, reduce fatigue`;
    }
    if (weekNum === 9) {
      return "Week 9 Peak Run Week: ~40% less gym volume — preserve strength, save legs";
    }
    if (weekNum === 10) {
      return "Week 10 Taper: Very light session — no hard leg fatigue";
    }
    if (weekNum === 11) {
      return "Week 11 Race Week: Light activation / upper only — arrive fresh";
    }
    if (label && label.includes("↓")) {
      return "Reduced volume session — prioritize recovery";
    }
    return "Keep ~2–3 reps in reserve on most sets; avoid failure";
  }

  function buildWeeks() {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const shortDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return RAW_WEEKS.map((rw) => {
      const phase = getPhaseForWeek(rw.week);
      const wId = `w${rw.week}`;
      const days = [];

      // 1. MONDAY
      const monDate = addDays(rw.startDate, 0);
      const monId = `${wId}-d1`;
      const monItems = [];
      if (rw.week === 11) {
        monItems.push(
          {
            id: `${monId}-activation`,
            name: "Lower-Body Activation & Mobility",
            type: "mobility",
            recommended: "15–20 min light bodyweight activation",
            detail: "Race week: no heavy lower-body lifting; keep legs fresh for Sunday."
          },
          {
            id: `${monId}-core`,
            name: "Light Core Activation",
            type: "strength",
            recommended: "2 light sets",
            detail: "Gentle core engagement without fatigue."
          }
        );
      } else {
        const modNote = getStrengthModifierNote(rw.week, rw.mon);
        STRENGTH_TEMPLATES.mondayLower.exercises.forEach((ex) => {
          monItems.push({
            id: `${monId}-${ex.key}`,
            name: ex.name,
            type: "strength",
            recommended: `Recommended: ${ex.setsReps}`,
            detail: modNote
          });
        });
      }
      days.push({
        id: monId,
        week: rw.week,
        dayIndex: 1,
        dayName: dayNames[0],
        shortDay: shortDays[0],
        isoDate: monDate,
        displayDate: formatShortDate(monDate),
        calendarLabel: rw.mon,
        title: rw.week === 11 ? "Race-Week Activation" : `Lower-Body Strength (${rw.mon})`,
        duration: rw.week === 11 ? "25–35 min" : "60–80 min",
        purpose: rw.week === 11 ? "No heavy lower body; arrive fresh" : "Main leg strength; avoid failure",
        category: "strength",
        items: monItems
      });

      // 2. TUESDAY
      const tueDate = addDays(rw.startDate, 1);
      const tueId = `${wId}-d2`;
      const tueModNote = getStrengthModifierNote(rw.week, rw.tue);
      const tueItems = [
        {
          id: `${tueId}-easy-run`,
          name: `Easy Run — ${rw.tueKm} km`,
          type: "run",
          km: rw.tueKm,
          recommended: "Pace: ~9:30–10:30/km • HR: 125–145 bpm",
          detail: "Conversational effort; HR/RPE wins over pace, especially in heat."
        }
      ];
      STRENGTH_TEMPLATES.tuesdayUpper.exercises.forEach((ex) => {
        tueItems.push({
          id: `${tueId}-${ex.key}`,
          name: ex.name,
          type: "strength",
          recommended: `Recommended: ${ex.setsReps}`,
          detail: tueModNote
        });
      });
      days.push({
        id: tueId,
        week: rw.week,
        dayIndex: 2,
        dayName: dayNames[1],
        shortDay: shortDays[1],
        isoDate: tueDate,
        displayDate: formatShortDate(tueDate),
        calendarLabel: rw.tue,
        title: `${rw.tueKm} km Easy Run + Upper Body`,
        duration: "80–90 min",
        purpose: "Easy aerobic work + muscle maintenance",
        category: "combo",
        items: tueItems
      });

      // 3. WEDNESDAY
      const wedDate = addDays(rw.startDate, 2);
      const wedId = `${wId}-d3`;
      days.push({
        id: wedId,
        week: rw.week,
        dayIndex: 3,
        dayName: dayNames[2],
        shortDay: shortDays[2],
        isoDate: wedDate,
        displayDate: formatShortDate(wedDate),
        calendarLabel: rw.wed,
        title: "Full Rest & Recovery Day",
        duration: "Rest Day",
        purpose: "Protected complete rest day; walking/mobility optional",
        category: "rest",
        items: [
          {
            id: `${wedId}-rest`,
            name: "Full Rest Day Completed",
            type: "rest",
            recommended: "Complete recovery buffer between Tuesday & Thursday",
            detail: "Prioritize 7+ hours sleep, hydration, and adequate protein."
          },
          {
            id: `${wedId}-mobility-opt`,
            name: "Light Walking / Mobility (Optional)",
            type: "mobility",
            optional: true,
            recommended: "Optional 15–20 min easy walk or gentle stretching",
            detail: "Optional active recovery if feeling stiff."
          }
        ]
      });

      // 4. THURSDAY
      const thuDate = addDays(rw.startDate, 3);
      const thuId = `${wId}-d4`;
      const thuItems = [];
      if (rw.thuType === "strides") {
        const strideCount = rw.week === 4 ? "6×20 sec" : "4×20 sec";
        thuItems.push(
          {
            id: `${thuId}-run`,
            name: `Easy Run — ${rw.thuKm} km`,
            type: "run",
            km: rw.thuKm,
            recommended: "Pace: ~9:30–10:30/km • HR: 125–145 bpm",
            detail: "Conversational aerobic run before strides."
          },
          {
            id: `${thuId}-strides`,
            name: `Strides — ${strideCount}`,
            type: "run_drill",
            recommended: `${strideCount} fast + relaxed (Not maximal)`,
            detail: "Smooth, quick mechanics with full recovery walk/jog between strides."
          }
        );
      } else {
        let paceBadge = "Pace: ~8:15–8:45/km • ~7/10 RPE";
        if (rw.thuType === "steady") {
          paceBadge = "Steady Segment: 3 km @ 8:45–9:10/km • Controlled";
        } else if (rw.thuType === "hm_effort") {
          paceBadge = "HM Effort Segment • Controlled-hard race pace";
        } else if (rw.thuType === "progression") {
          paceBadge = "Progression: Last 2 km @ 8:30–8:45/km";
        } else if (rw.thuType === "tempo") {
          paceBadge = "Tempo: 3 km @ 8:15–8:30/km • ~7/10 RPE";
        } else if (rw.thuType === "intervals") {
          paceBadge = `Workout: ${rw.thu} • Controlled hard`;
        }
        thuItems.push({
          id: `${thuId}-quality-run`,
          name: `Quality Run — ${rw.thu}`,
          type: "run",
          km: rw.thuKm,
          recommended: paceBadge,
          detail: rw.thuDetail
        });
      }
      days.push({
        id: thuId,
        week: rw.week,
        dayIndex: 4,
        dayName: dayNames[3],
        shortDay: shortDays[3],
        isoDate: thuDate,
        displayDate: formatShortDate(thuDate),
        calendarLabel: rw.thu,
        title: `Quality Run (${rw.thu})`,
        duration: "45–65 min",
        purpose: "Tempo / intervals / progression / HM effort",
        category: "run",
        items: thuItems
      });

      // 5. FRIDAY
      const friDate = addDays(rw.startDate, 4);
      const friId = `${wId}-d5`;
      const friItems = [];
      if (rw.week === 11) {
        friItems.push({
          id: `${friId}-mobility`,
          name: "Race-Week Mobility & Stretching",
          type: "mobility",
          recommended: "20–30 min gentle full-body mobility",
          detail: "No gym resistance work today — keep legs fresh for Sunday's 21.1 km race."
        });
      } else {
        const friModNote = getStrengthModifierNote(rw.week, rw.fri);
        STRENGTH_TEMPLATES.fridayFullBody.exercises.forEach((ex) => {
          friItems.push({
            id: `${friId}-${ex.key}`,
            name: ex.name,
            type: "strength",
            recommended: `Recommended: ${ex.setsReps}`,
            detail: `${friModNote}. Protect Saturday/Sunday legs.`
          });
        });
      }
      days.push({
        id: friId,
        week: rw.week,
        dayIndex: 5,
        dayName: dayNames[4],
        shortDay: shortDays[4],
        isoDate: friDate,
        displayDate: formatShortDate(friDate),
        calendarLabel: rw.fri,
        title: rw.week === 11 ? "Race-Week Mobility" : `Full Body / Accessories (${rw.fri})`,
        duration: rw.week === 11 ? "20–30 min" : "65–85 min",
        purpose: rw.week === 11 ? "Arrive fresh for race day" : "Moderate; protect Saturday/Sunday legs",
        category: rw.week === 11 ? "mobility" : "strength",
        items: friItems
      });

      // 6. SATURDAY
      const satDate = addDays(rw.startDate, 5);
      const satId = `${wId}-d6`;
      const satItems = [];
      if (rw.week === 11) {
        satItems.push(
          {
            id: `${satId}-shakeout`,
            name: "Option A: 20 min Shakeout Jog / Walk",
            type: "run",
            km: 2,
            altGroup: "sat-w11",
            recommended: "20 min very easy jog/walk (~9:45–10:30/km)",
            detail: "Completing either Option A or Option B completes Saturday!"
          },
          {
            id: `${satId}-rest`,
            name: "Option B: Complete Rest Day",
            type: "rest",
            altGroup: "sat-w11",
            recommended: "Full pre-race rest & carb-focused meals",
            detail: "Completing either Option A or Option B completes Saturday!"
          }
        );
      } else {
        satItems.push(
          {
            id: `${satId}-easy-run`,
            name: `Easy / Recovery Run — ${rw.satKm} km`,
            type: "run",
            km: rw.satKm,
            recommended: "Pace: ~9:30–10:30/km • HR: 125–145 bpm",
            detail: "Very easy aerobic volume; keep effort strictly conversational."
          },
          {
            id: `${satId}-mobility`,
            name: "Mobility & Recovery Routine",
            type: "mobility",
            recommended: "10–15 min hips, calves, hamstrings & thoracic mobility",
            detail: "Prepares legs for Sunday's long run or cricket session."
          }
        );
      }
      days.push({
        id: satId,
        week: rw.week,
        dayIndex: 6,
        dayName: dayNames[5],
        shortDay: shortDays[5],
        isoDate: satDate,
        displayDate: formatShortDate(satDate),
        calendarLabel: rw.sat,
        title: rw.week === 11 ? "Shakeout Jog/Walk OR Rest" : `${rw.satKm} km Easy Run + Mobility`,
        duration: rw.week === 11 ? "20 min or Rest" : "40–60 min",
        purpose: "Very easy aerobic volume",
        category: "run",
        items: satItems
      });

      // 7. SUNDAY
      const sunDate = addDays(rw.startDate, 6);
      const sunId = `${wId}-d7`;
      const sunItems = [];
      if (rw.week === 11) {
        sunItems.push({
          id: `${sunId}-race`,
          name: "RACE DAY — SBI Green Marathon S7 (21.1 km)",
          type: "race",
          km: 21.1,
          recommended: "Sunday, 20 Dec 2026 • 5:00 AM • University of Hyderabad",
          detail: "Goal: Confident, strong, injury-free 21.1 km Half Marathon finish!"
        });
      } else {
        sunItems.push(
          {
            id: `${sunId}-long-run`,
            name: `Long Run — ${rw.sunKm} km`,
            type: "run",
            km: rw.sunKm,
            altGroup: "sun-choice",
            recommended: "Pace: ~9:30–10:45/km • HR: Mostly 125–145 bpm",
            detail: "First half deliberately easy; don't turn long runs into races. (Completing Long Run OR Cricket completes Sunday)"
          },
          {
            id: `${sunId}-cricket`,
            name: "Cricket Match (Replaces Long Run)",
            type: "cricket",
            altGroup: "sun-choice",
            recommended: "60–130+ min • Replaces Sunday Long Run",
            detail: "Cricket replaces long run; do NOT stack hard cricket + long run."
          }
        );
      }
      days.push({
        id: sunId,
        week: rw.week,
        dayIndex: 7,
        dayName: dayNames[6],
        shortDay: shortDays[6],
        isoDate: sunDate,
        displayDate: formatShortDate(sunDate),
        calendarLabel: rw.sun,
        title: rw.week === 11 ? "RACE DAY: 21.1 km Half Marathon" : `${rw.sunKm} km Long Run OR Cricket`,
        duration: "60–130+ min",
        purpose:
          rw.week === 11
            ? "SBI Green Marathon S7 Hyderabad • 5:00 AM Start"
            : "Cricket replaces long run; do not stack hard cricket + long run",
        category: rw.week === 11 ? "race" : "long",
        items: sunItems
      });

      return {
        week: rw.week,
        id: wId,
        dates: rw.dates,
        startDate: rw.startDate,
        runKm: rw.runKm,
        runKmDisplay: rw.runKmDisplay,
        phase: phase,
        days: days
      };
    });
  }

  return {
    meta: META,
    weeklyStructure: WEEKLY_STRUCTURE,
    paceGuide: PACE_GUIDE,
    strengthTemplates: STRENGTH_TEMPLATES,
    strengthPhases: STRENGTH_PHASES,
    weeks: buildWeeks()
  };
})();
