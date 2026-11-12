// ---------- Storage ----------

const STORAGE_KEY = "study-tracker";
const MAX_MINUTES = 1440; // 24 hours, same as max="1440" in index.html

function loadData() {
  const empty = { classes: [], sessions: [] };
  const text = localStorage.getItem(STORAGE_KEY);
  if (text === null) {
    return empty; // first visit, nothing saved yet
  }

  let saved;
  try {
    saved = JSON.parse(text);
  } catch (error) {
    console.warn("Saved data is not valid JSON, starting fresh.", error);
    return empty;
  }

  // Fill in anything missing, so older or partial data still works.
  // Future migrations go here.
  return {
    classes: Array.isArray(saved.classes) ? saved.classes : [],
    sessions: Array.isArray(saved.sessions) ? saved.sessions : [],
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------- Dates ----------

// Any Date as "YYYY-MM-DD" in local time.
// (toISOString() would use UTC and can give the wrong day around midnight.)
function dateToString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // months start at 0
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayString() {
  return dateToString(new Date());
}

// ---------- Rendering ----------

const sessionList = document.getElementById("sessions");

function renderSessions() {
  sessionList.innerHTML = ""; // clear old entries (no user text involved)

  if (data.sessions.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No sessions yet";
    li.className = "empty";
    sessionList.append(li);
    return;
  }

  // Copy the array before sorting, so data.sessions itself stays unchanged.
  // "YYYY-MM-DD" strings sort correctly as plain text.
  const newestFirst = [...data.sessions].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  for (const session of newestFirst) {
    const li = document.createElement("li");
    li.textContent = `${session.date} · ${session.minutes} min`;
    sessionList.append(li);
  }
}

// ---------- Heatmap ----------

const WEEKS = 52; // full weeks shown before the current week
const heatmap = document.getElementById("heatmap");
const heatmapScroll = document.getElementById("heatmap-scroll");

// Total minutes per date, e.g. { "2026-11-12": 135 }.
// Several sessions on the same day are added up.
function minutesPerDay() {
  const totals = {};
  for (const session of data.sessions) {
    totals[session.date] = (totals[session.date] || 0) + session.minutes;
  }
  return totals;
}

// Colour level 0-4 for a number of minutes (fixed limits).
function levelFor(minutes) {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

function renderHeatmap() {
  heatmap.innerHTML = ""; // clear old squares (no user text involved)

  const totals = minutesPerDay();
  const today = todayString();

  // Start: Monday of the current week, then WEEKS weeks further back.
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSinceMonday = (day.getDay() + 6) % 7; // getDay(): Sunday = 0
  day.setDate(day.getDate() - daysSinceMonday - WEEKS * 7);

  // One square per day, in date order, up to and including today.
  // CSS places them Mon->Sun down each column.
  let dateStr = dateToString(day);
  while (dateStr <= today) {
    const minutes = totals[dateStr] || 0;

    const cell = document.createElement("div");
    cell.className = `cell level-${levelFor(minutes)}`;
    cell.title = minutes > 0 ? `${dateStr}: ${minutes} min` : `${dateStr}: nothing logged`;
    heatmap.append(cell);

    day.setDate(day.getDate() + 1); // handles month ends, leap years, DST
    dateStr = dateToString(day);
  }

  // Show the most recent weeks first on narrow screens.
  heatmapScroll.scrollLeft = heatmapScroll.scrollWidth;
}

// ---------- Form ----------

const form = document.getElementById("log-form");
const dateInput = document.getElementById("log-date");
const minutesInput = document.getElementById("log-minutes");

form.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the browser from reloading the page

  const date = dateInput.value;                 // already "YYYY-MM-DD"
  const minutes = Number(minutesInput.value);   // input values are always text

  // Check again in JS: the HTML limits can be bypassed.
  if (!date || !Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) {
    return;
  }

  // change data -> save -> re-render
  data.sessions.push({ id: crypto.randomUUID(), date, minutes });
  saveData();
  renderSessions();
  renderHeatmap();

  minutesInput.value = ""; // keep the date for logging more on the same day
  minutesInput.focus();
});

// ---------- Start ----------

const data = loadData();
dateInput.value = todayString();
renderSessions();
renderHeatmap();
