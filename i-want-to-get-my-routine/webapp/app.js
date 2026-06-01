const STORAGE_KEY = "routine-atlas-v3";

const quickActions = [
  { key: "mobility", label: "Mobility", hint: "Hips, core, lower back" },
  { key: "workout", label: "Workout", hint: "Strength session" },
  { key: "walk", label: "Walk", hint: "Recovery or steps" },
  { key: "mealPlan", label: "Ate planned food", hint: "Stayed on plan" },
  { key: "water", label: "Water target", hint: "Hydration done" },
  { key: "reset", label: "Reset task", hint: "Cleaning or admin" },
  { key: "calorieHit", label: "Calorie target", hint: "Close enough" },
  { key: "proteinHit", label: "Protein target", hint: "Hit the minimum" },
];

const trainingPlan = [
  {
    day: "Day 1",
    title: "Lower body + core",
    meta: "Main builder day",
    summary:
      "Use controlled squats, split squats, glute bridges, and dead bugs. Focus on bracing and clean movement instead of chasing load.",
    tags: ["Goblet squat 6-10", "Split squat 8-12", "Bridge 10-15", "Side plank"],
  },
  {
    day: "Day 2",
    title: "Mobility + recovery",
    meta: "Still counts",
    summary:
      "Hip flexor stretch, adductor rockbacks, breathing resets, and an easy walk. This is the day that keeps you from tightening up.",
    tags: ["10 min mobility", "20-30 min walk", "Bird dog", "Suitcase carry"],
  },
  {
    day: "Day 3",
    title: "Lower body + unilateral",
    meta: "Leg and hip control",
    summary:
      "Step-ups, leg press or box squats, light RDL patterns, and Pallof presses. Use a range of motion your back trusts.",
    tags: ["Step-up 8-12", "Leg press 6-10", "Ham curl 10-15", "Pallof press"],
  },
  {
    day: "Day 4",
    title: "Upper + trunk balance",
    meta: "Supportive, not dominant",
    summary:
      "A smaller upper-body session keeps your strong area maintained without stealing recovery from legs, hips, and trunk work.",
    tags: ["Row", "Incline press", "Pulldown", "Farmer carry"],
  },
];

const mealIdeas = [
  { title: "Breakfast", meta: "Reliable start", calories: 450, protein: 35, text: "Greek yogurt bowl with fruit and oats." },
  { title: "Lunch", meta: "Batchable", calories: 650, protein: 45, text: "Chicken rice bowl with vegetables and a sauce you like." },
  { title: "Dinner", meta: "Simple repeat", calories: 700, protein: 40, text: "Turkey pasta or potatoes with a vegetable side." },
  { title: "Emergency meal", meta: "Busy day backup", calories: 600, protein: 40, text: "Rotisserie chicken with microwave rice." },
];

const prepItems = [
  "Cook a protein base",
  "Cook a carb base",
  "Wash fruit and vegetables",
  "Restock a fast protein snack",
  "Keep one emergency meal ready",
];

const cleaningPlan = [
  { area: "Kitchen", freq: "Daily", title: "Dishes and counters", summary: "Ten-minute shutdown after dinner." },
  { area: "Home", freq: "Daily", title: "Visible clutter reset", summary: "Pick up obvious clutter before bed." },
  { area: "Bathroom", freq: "Weekly", title: "Sink, toilet, mirror", summary: "One short midweek reset is enough." },
  { area: "Laundry", freq: "Weekly", title: "One load start to finish", summary: "Wash, dry, and fold in one loop." },
  { area: "Groceries", freq: "Weekly", title: "Staples run", summary: "Protein, carbs, produce, and one easy backup meal." },
  { area: "Deep clean", freq: "Monthly", title: "One zone only", summary: "Bathroom or kitchen, not the whole place." },
];

const summaryRanges = {
  7: "Week",
  30: "Month",
  183: "6 Months",
  365: "Year",
};

const defaultDayState = () => ({
  sleep: "",
  pain: "",
  calories: "",
  protein: "",
  steps: "",
  bodyweight: "",
  cleaningNote: "",
  notes: "",
  mobility: false,
  workout: false,
  walk: false,
  mealPlan: false,
  water: false,
  reset: false,
  calorieHit: false,
  proteinHit: false,
});

function makeDefaultState() {
  return {
    settings: {
      calorieTarget: 2200,
      proteinTarget: 160,
      sleepTarget: 8,
      stepTarget: 7000,
    },
    days: {},
    groceries: [],
    summaryRange: 7,
    weekPlan: {
      Monday: { workout: "Day 1", meals: "Chicken rice bowl", cleaning: "Paperwork + reset", focus: "Bracing and squat pattern" },
      Tuesday: { workout: "Mobility + walk", meals: "Leftovers", cleaning: "Kitchen", focus: "Hip mobility" },
      Wednesday: { workout: "Day 3", meals: "Turkey pasta", cleaning: "Bathroom", focus: "Unilateral work" },
      Thursday: { workout: "Walk + stretch", meals: "Leftovers", cleaning: "Floors", focus: "Recovery" },
      Friday: { workout: "Day 4", meals: "Flexible dinner", cleaning: "Night reset", focus: "Upper support" },
      Saturday: { workout: "Optional Day 1 or walk", meals: "Groceries and prep", cleaning: "Laundry", focus: "Catch-up" },
      Sunday: { workout: "Mobility only", meals: "Meal prep day", cleaning: "Sheets + fridge", focus: "Weekly reset" },
    },
    prepChecks: Object.fromEntries(prepItems.map((item) => [item, false])),
  };
}

function mergeState(incoming) {
  const base = makeDefaultState();
  return {
    ...base,
    ...incoming,
    settings: { ...base.settings, ...(incoming?.settings || {}) },
    weekPlan: { ...base.weekPlan, ...(incoming?.weekPlan || {}) },
    prepChecks: { ...base.prepChecks, ...(incoming?.prepChecks || {}) },
    groceries: Array.isArray(incoming?.groceries) ? incoming.groceries : [],
    days: incoming?.days || {},
    summaryRange: Number(incoming?.summaryRange || 7),
  };
}

function loadLocalState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return makeDefaultState();
  try {
    return mergeState(JSON.parse(raw));
  } catch {
    return makeDefaultState();
  }
}

let state = loadLocalState();
let deferredPrompt = null;
let saveTimer = null;
let isHydrating = false;
let syncApi = null;
let authApi = null;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDayState(dateKey = todayKey()) {
  if (!state.days[dateKey]) state.days[dateKey] = defaultDayState();
  return state.days[dateKey];
}

function setSyncStatus(message) {
  const node = document.getElementById("sync-status");
  if (node) node.textContent = message;
}

function persistLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function queueSync(reason = "updated") {
  persistLocal();
  if (isHydrating || !syncApi?.ready || !syncApi?.userId) return;
  clearTimeout(saveTimer);
  setSyncStatus(`Syncing ${reason}...`);
  saveTimer = window.setTimeout(async () => {
    try {
      await syncApi.save({
        userId: syncApi.userId,
        payload: {
          ...state,
          updatedAt: new Date().toISOString(),
        },
      });
      setSyncStatus(`Synced to cloud for ${syncApi.userLabel || syncApi.userId}.`);
    } catch (error) {
      console.error(error);
      setSyncStatus("Cloud sync failed. Your data is still saved on this device.");
    }
  }, 450);
}

function formatLongDate(date = new Date()) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) && value !== "" ? num : null;
}

function round(value, digits = 0) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getPeriodKeys(daysBack) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (daysBack - 1));
  return Object.keys(state.days).filter((key) => {
    const date = new Date(`${key}T00:00:00`);
    return date >= start && date <= end;
  }).sort();
}

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
}

function computeScore(day) {
  return quickActions.reduce((sum, item) => sum + (day[item.key] ? 1 : 0), 0);
}

function calculateSummary(daysBack) {
  const keys = getPeriodKeys(daysBack);
  const entries = keys.map((key) => ({ key, ...getDayState(key) }));
  const scores = entries.map(computeScore);
  const countTrue = (field) => entries.filter((entry) => entry[field]).length;
  const numericAverage = (field) => {
    const values = entries.map((entry) => numberOrNull(entry[field])).filter((value) => value !== null);
    if (!values.length) return 0;
    return round(values.reduce((sum, value) => sum + value, 0) / values.length, field === "sleep" || field === "bodyweight" ? 1 : 0);
  };

  const totalChecks = keys.length * quickActions.length;
  const consistency = totalChecks ? Math.round((scores.reduce((sum, score) => sum + score, 0) / totalChecks) * 100) : 0;
  const groceryWindow = state.groceries.filter((item) => {
    if (!item.completedAt) return false;
    const completed = new Date(item.completedAt);
    const start = new Date();
    start.setDate(start.getDate() - (daysBack - 1));
    return completed >= start;
  });

  return {
    label: summaryRanges[daysBack],
    loggedDays: keys.length,
    consistency,
    avgScore: keys.length ? round(scores.reduce((sum, score) => sum + score, 0) / keys.length, 1) : 0,
    mobilityDays: countTrue("mobility"),
    workoutDays: countTrue("workout"),
    walkDays: countTrue("walk"),
    resetDays: countTrue("reset"),
    calorieHitDays: countTrue("calorieHit"),
    proteinHitDays: countTrue("proteinHit"),
    avgSleep: numericAverage("sleep"),
    avgPain: numericAverage("pain"),
    avgCalories: numericAverage("calories"),
    avgProtein: numericAverage("protein"),
    avgSteps: numericAverage("steps"),
    avgBodyweight: numericAverage("bodyweight"),
    groceryBought: groceryWindow.length,
    activeGroceries: state.groceries.filter((item) => !item.done).length,
  };
}

function computeWeeklyConsistency() {
  return calculateSummary(7).consistency;
}

function computeStreak() {
  let streak = 0;
  for (const key of lastSevenDays().reverse()) {
    if (computeScore(getDayState(key)) >= 4) streak += 1;
    else break;
  }
  return streak;
}

function renderQuickActions() {
  const container = document.getElementById("quick-actions");
  const day = getDayState();
  container.innerHTML = "";
  quickActions.forEach((action) => {
    const button = document.createElement("button");
    button.className = `quick-pill${day[action.key] ? " is-on" : ""}`;
    button.innerHTML = `<span>${action.hint}</span><strong>${action.label}</strong>`;
    button.addEventListener("click", () => {
      day[action.key] = !day[action.key];
      if (action.key === "calorieHit" && !day.calories) day.calories = state.settings.calorieTarget;
      if (action.key === "proteinHit" && !day.protein) day.protein = state.settings.proteinTarget;
      queueSync("daily actions");
      syncUI();
    });
    container.appendChild(button);
  });
}

function bindTodayFields() {
  ["sleep", "pain", "calories", "protein", "steps", "bodyweight", "cleaning-note", "notes"].forEach((id) => {
    document.getElementById(id).addEventListener("input", (event) => {
      const day = getDayState();
      const storageKey = id === "cleaning-note" ? "cleaningNote" : id;
      day[storageKey] = event.target.value;

      if (id === "calories") {
        const calories = Number(event.target.value || 0);
        day.calorieHit = calories > 0 && Math.abs(calories - state.settings.calorieTarget) <= 150;
      }

      if (id === "protein") {
        const protein = Number(event.target.value || 0);
        day.proteinHit = protein >= state.settings.proteinTarget;
      }

      queueSync("today");
      syncUI();
    });
  });

  document.getElementById("reset-today").addEventListener("click", () => {
    delete state.days[todayKey()];
    getDayState(todayKey());
    queueSync("reset");
    syncUI();
  });
}

function renderWeekPlan() {
  const board = document.getElementById("week-board");
  board.innerHTML = "";
  Object.entries(state.weekPlan).forEach(([dayName, plan]) => {
    const card = document.createElement("article");
    card.className = "week-card";
    card.innerHTML = `
      <div class="week-card__day">${dayName}</div>
      <label class="mini-label">Workout</label>
      <input data-day="${dayName}" data-key="workout" value="${plan.workout || ""}" />
      <label class="mini-label">Meals</label>
      <textarea data-day="${dayName}" data-key="meals">${plan.meals || ""}</textarea>
      <label class="mini-label">Cleaning</label>
      <input data-day="${dayName}" data-key="cleaning" value="${plan.cleaning || ""}" />
      <label class="mini-label">Focus</label>
      <textarea data-day="${dayName}" data-key="focus">${plan.focus || ""}</textarea>
    `;
    board.appendChild(card);
  });

  board.querySelectorAll("input, textarea").forEach((element) => {
    element.addEventListener("input", (event) => {
      const { day, key } = event.target.dataset;
      state.weekPlan[day][key] = event.target.value;
      queueSync("weekly plan");
    });
  });
}

function renderSummary() {
  const summary = calculateSummary(state.summaryRange);
  const grid = document.getElementById("summary-grid");
  const highlights = document.getElementById("summary-highlights");
  const adjustments = document.getElementById("summary-adjustments");

  document.querySelectorAll(".range-chip").forEach((chip) => {
    chip.classList.toggle("is-active", Number(chip.dataset.range) === state.summaryRange);
  });

  const cards = [
    { label: "Consistency", value: `${summary.consistency}%`, detail: `${summary.loggedDays} logged days in this ${summary.label.toLowerCase()}` },
    { label: "Average daily score", value: `${summary.avgScore}/8`, detail: "Based on your quick check-ins" },
    { label: "Workouts", value: `${summary.workoutDays}`, detail: `${summary.mobilityDays} mobility days and ${summary.walkDays} walk days` },
    { label: "Nutrition hits", value: `${summary.calorieHitDays}/${summary.proteinHitDays}`, detail: "Calorie target days / protein target days" },
    { label: "Average sleep", value: `${summary.avgSleep}h`, detail: `Average pain ${summary.avgPain}/10` },
    { label: "Average steps", value: `${summary.avgSteps}`, detail: `${summary.resetDays} reset-task days` },
    { label: "Average intake", value: `${summary.avgCalories} cal`, detail: `${summary.avgProtein}g protein average` },
    { label: "Groceries", value: `${summary.groceryBought}`, detail: `${summary.activeGroceries} items still on your list` },
  ];

  grid.innerHTML = cards
    .map(
      (card) => `
        <article class="summary-card">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
          <span>${card.detail}</span>
        </article>
      `,
    )
    .join("");

  const highlightRows = [
    `${summary.mobilityDays} mobility days gave your hips and lower back some attention.`,
    `${summary.workoutDays} training days and ${summary.walkDays} walks kept momentum moving.`,
    `${summary.groceryBought} grocery items were marked bought in this ${summary.label.toLowerCase()}.`,
    summary.avgBodyweight ? `Average bodyweight tracked: ${summary.avgBodyweight}.` : "No bodyweight trend yet, which is fine if you do not want to track it daily.",
  ];

  const adjustmentRows = [
    summary.consistency < 55 ? "Lower the minimum daily standard so you can string together easier wins." : "Your consistency is solid enough to keep the current minimum day structure.",
    summary.avgSleep && summary.avgSleep < state.settings.sleepTarget ? "Sleep is under target. Protect bedtime before adding more training volume." : "Sleep is near target or not tracked enough yet.",
    summary.proteinHitDays < Math.max(3, Math.ceil(summary.loggedDays / 2)) ? "Protein targets are lagging. Make one protein snack automatic." : "Protein adherence is holding up well.",
    summary.activeGroceries > 8 ? "Your grocery list is getting long. Clear or buy the oldest items first." : "Your grocery list is manageable right now.",
  ];

  highlights.innerHTML = highlightRows.map((row) => `<div class="summary-row">${row}</div>`).join("");
  adjustments.innerHTML = adjustmentRows.map((row) => `<div class="summary-row">${row}</div>`).join("");
}

function renderTraining() {
  const list = document.getElementById("training-list");
  list.innerHTML = trainingPlan
    .map(
      (item) => `
        <article class="stack-card">
          <div class="stack-card__header">
            <div>
              <span class="stack-card__meta">${item.day} - ${item.meta}</span>
              <h3>${item.title}</h3>
            </div>
          </div>
          <p>${item.summary}</p>
          <div class="stack-card__tags">
            ${item.tags.map((tag, index) => `<span class="tag ${index % 2 ? "tag--teal" : ""}">${tag}</span>`).join("")}
          </div>
        </article>
      `,
    )
    .join("");
}

function renderMeals() {
  const cards = document.getElementById("meal-cards");
  cards.innerHTML = mealIdeas
    .map(
      (meal, index) => `
        <article class="meal-card">
          <div class="meal-card__header">
            <div>
              <span class="meal-card__meta">${meal.meta}</span>
              <h3>${meal.title}</h3>
            </div>
            <span class="tag ${index % 2 ? "tag--gold" : "tag--teal"}">${meal.calories} cal - ${meal.protein}g</span>
          </div>
          <p>${meal.text}</p>
        </article>
      `,
    )
    .join("");

  const checklist = document.getElementById("prep-checklist");
  checklist.innerHTML = "";
  prepItems.forEach((item) => {
    const row = document.createElement("label");
    row.className = "check-row";
    row.innerHTML = `
      <span>${item}</span>
      <input class="check-toggle" type="checkbox" ${state.prepChecks[item] ? "checked" : ""} />
    `;
    row.querySelector("input").addEventListener("change", (event) => {
      state.prepChecks[item] = event.target.checked;
      queueSync("meal prep");
      syncUI();
    });
    checklist.appendChild(row);
  });
}

function renderGroceries() {
  const active = document.getElementById("grocery-active");
  const completed = document.getElementById("grocery-completed");
  const activeItems = state.groceries.filter((item) => !item.done);
  const completedItems = state.groceries
    .filter((item) => item.done)
    .sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")))
    .slice(0, 12);

  const renderList = (items, doneList) => {
    if (!items.length) return `<div class="summary-row">${doneList ? "Nothing bought yet." : "Your grocery list is clear."}</div>`;
    return items
      .map(
        (item) => `
          <div class="grocery-item">
            <div>
              <strong>${item.name}</strong>
              <span class="grocery-item__meta">${item.category}${item.completedAt ? ` - bought ${new Date(item.completedAt).toLocaleDateString()}` : ""}</span>
            </div>
            <div class="grocery-actions">
              ${
                doneList
                  ? `<button class="tiny-button" data-grocery-action="restore" data-grocery-id="${item.id}">Restore</button>`
                  : `<button class="tiny-button" data-grocery-action="done" data-grocery-id="${item.id}">Bought</button>`
              }
              <button class="tiny-button" data-grocery-action="delete" data-grocery-id="${item.id}">Delete</button>
            </div>
          </div>
        `,
      )
      .join("");
  };

  active.innerHTML = renderList(activeItems, false);
  completed.innerHTML = renderList(completedItems, true);

  document.querySelectorAll("[data-grocery-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.groceryAction;
      const id = button.dataset.groceryId;
      const item = state.groceries.find((entry) => entry.id === id);
      if (!item) return;
      if (action === "done") {
        item.done = true;
        item.completedAt = new Date().toISOString();
      } else if (action === "restore") {
        item.done = false;
        item.completedAt = "";
      } else if (action === "delete") {
        state.groceries = state.groceries.filter((entry) => entry.id !== id);
      }
      queueSync("groceries");
      syncUI();
    });
  });
}

function renderCleaning() {
  const list = document.getElementById("cleaning-list");
  list.innerHTML = cleaningPlan
    .map(
      (item, index) => `
        <article class="stack-card">
          <div class="stack-card__header">
            <div>
              <span class="stack-card__meta">${item.area} - ${item.freq}</span>
              <h3>${item.title}</h3>
            </div>
            <span class="tag ${index % 2 ? "tag--gold" : ""}">${item.freq}</span>
          </div>
          <p>${item.summary}</p>
        </article>
      `,
    )
    .join("");
}

function bindSettings() {
  [
    ["target-calories", "calorieTarget"],
    ["target-protein", "proteinTarget"],
    ["target-sleep", "sleepTarget"],
    ["target-steps", "stepTarget"],
  ].forEach(([id, key]) => {
    document.getElementById(id).addEventListener("input", (event) => {
      state.settings[key] = Number(event.target.value || 0);
      queueSync("settings");
      syncUI();
    });
  });

  document.getElementById("export-data").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `routine-atlas-backup-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("import-data").addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    const text = await file.text();
    state = mergeState(JSON.parse(text));
    queueSync("import");
    renderWeekPlan();
    syncUI();
  });

  document.getElementById("install-app").addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt = null;
      return;
    }
    alert("Install becomes available after the browser offers it. On mobile, you can also use Add to Home Screen.");
  });

  document.getElementById("google-sign-in").addEventListener("click", async () => {
    if (!authApi?.ready) {
      alert("Firebase is not configured yet. Finish the Firebase setup first.");
      return;
    }

    try {
      setSyncStatus("Opening Google sign-in...");
      await authApi.signIn();
    } catch (error) {
      console.error(error);
      setSyncStatus("Google sign-in did not finish. Local mode is still working.");
    }
  });

  document.getElementById("sign-out").addEventListener("click", async () => {
    if (!authApi?.ready) return;
    await authApi.signOut();
    setSyncStatus("Signed out. Local mode is still available on this device.");
  });
}

function bindSummaryRange() {
  document.querySelectorAll(".range-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.summaryRange = Number(chip.dataset.range);
      queueSync("summary range");
      renderSummary();
    });
  });
}

function bindGroceries() {
  const input = document.getElementById("grocery-input");
  const category = document.getElementById("grocery-category");
  const add = () => {
    const name = input.value.trim();
    if (!name) return;
    state.groceries.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name,
      category: category.value,
      done: false,
      completedAt: "",
      createdAt: new Date().toISOString(),
    });
    input.value = "";
    category.value = "Protein";
    queueSync("grocery list");
    syncUI();
  };

  document.getElementById("add-grocery").addEventListener("click", add);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  });
}

function syncTodayFields() {
  const day = getDayState();
  document.getElementById("sleep").value = day.sleep;
  document.getElementById("pain").value = day.pain;
  document.getElementById("calories").value = day.calories;
  document.getElementById("protein").value = day.protein;
  document.getElementById("steps").value = day.steps;
  document.getElementById("bodyweight").value = day.bodyweight;
  document.getElementById("cleaning-note").value = day.cleaningNote;
  document.getElementById("notes").value = day.notes;
}

function syncHeader() {
  const day = getDayState();
  document.getElementById("today-date").textContent = formatLongDate();
  document.getElementById("daily-score").textContent = `${computeScore(day)}/${quickActions.length}`;
  document.getElementById("streak-count").textContent = `${computeStreak()}`;
  document.getElementById("weekly-score").textContent = `${computeWeeklyConsistency()}%`;
}

function syncSettings() {
  document.getElementById("target-calories").value = state.settings.calorieTarget;
  document.getElementById("target-protein").value = state.settings.proteinTarget;
  document.getElementById("target-sleep").value = state.settings.sleepTarget;
  document.getElementById("target-steps").value = state.settings.stepTarget;
}

function syncUI() {
  renderQuickActions();
  syncTodayFields();
  syncHeader();
  syncSettings();
  renderSummary();
  renderMeals();
  renderGroceries();
}

function bindNav() {
  document.querySelectorAll(".nav-chip").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;
      document.querySelectorAll(".nav-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
      document.querySelectorAll(".panel").forEach((panel) => panel.classList.toggle("active", panel.id === target));
    });
  });
}

function registerPwa() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });
}

async function setupFirebaseSync() {
  try {
    const [{ firebaseConfig }, appLib, authLib, dbLib] = await Promise.all([
      import("./firebase-config.js"),
      import("https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js"),
    ]);

    if (!firebaseConfig?.apiKey || firebaseConfig.apiKey === "replace-me") {
      setSyncStatus("Local mode only. Add Firebase config to sync across devices.");
      return;
    }

    const app = appLib.initializeApp(firebaseConfig);
    const auth = authLib.getAuth(app);
    const db = dbLib.getFirestore(app);
    const provider = new authLib.GoogleAuthProvider();

    syncApi = {
      ready: false,
      userId: "",
      userLabel: "",
      async save({ userId, payload }) {
        const ref = dbLib.doc(db, "users", userId, "routine", "default");
        await dbLib.setDoc(ref, payload, { merge: true });
      },
    };

    authApi = {
      ready: true,
      async signIn() {
        const isSmallScreen = window.matchMedia("(max-width: 700px)").matches;
        if (isSmallScreen) await authLib.signInWithRedirect(auth, provider);
        else await authLib.signInWithPopup(auth, provider);
      },
      async signOut() {
        await authLib.signOut(auth);
      },
    };

    setSyncStatus("Firebase ready. Sign in with Google to sync across devices.");

    try {
      await authLib.getRedirectResult(auth);
    } catch (error) {
      console.error(error);
    }

    authLib.onAuthStateChanged(auth, async (user) => {
      if (!user) {
        syncApi.ready = false;
        syncApi.userId = "";
        syncApi.userLabel = "";
        setSyncStatus("Not signed in. Local mode is active until you sign in with Google.");
        return;
      }

      syncApi.ready = true;
      syncApi.userId = user.uid;
      syncApi.userLabel = user.email || user.uid;
      setSyncStatus(`Signed in as ${syncApi.userLabel}. Loading your cloud data...`);

      try {
        const ref = dbLib.doc(db, "users", user.uid, "routine", "default");
        const snapshot = await dbLib.getDoc(ref);
        if (snapshot.exists()) {
          isHydrating = true;
          state = mergeState(snapshot.data());
          persistLocal();
          renderWeekPlan();
          syncUI();
          isHydrating = false;
          setSyncStatus(`Synced to cloud for ${syncApi.userLabel}.`);
        } else {
          queueSync("first save");
        }
      } catch (error) {
        console.error(error);
        setSyncStatus("Signed in, but cloud data could not be loaded.");
      }
    });
  } catch (error) {
    console.error(error);
    setSyncStatus("Firebase is not configured yet. Local mode is still working.");
  }
}

function init() {
  bindNav();
  bindTodayFields();
  bindSettings();
  bindSummaryRange();
  bindGroceries();
  renderWeekPlan();
  renderTraining();
  renderCleaning();
  syncUI();
  registerPwa();
  setupFirebaseSync();
}

init();
