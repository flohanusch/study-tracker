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

// Today's date as "YYYY-MM-DD" in local time.
// (toISOString() would use UTC and can give the wrong day around midnight.)
function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // months start at 0
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

  minutesInput.value = ""; // keep the date for logging more on the same day
  minutesInput.focus();
});

// ---------- Start ----------

const data = loadData();
dateInput.value = todayString();
renderSessions();
