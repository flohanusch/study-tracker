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

// The Monday of the week that `date` falls in, as a new Date at midnight.
function mondayOf(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (monday.getDay() + 6) % 7; // getDay(): Sunday = 0
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday;
}

// "2026-11-12" -> e.g. "Thu, 12 Nov 2026" (in the browser's language).
function formatDate(dateStr) {
  // Not new Date("2026-11-12"): that is read as UTC and can be the wrong day.
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day); // local time, months start at 0
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// 45 -> "45 min", 60 -> "1 h", 90 -> "1 h 30 min"
function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
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

    // Old sessions have no classId at all; treat that like "No class".
    if (session.classId) {
      li.append(" · ", buildClassTag(session.classId)); // a plain string becomes text, not HTML
    }

    sessionList.append(li);
  }
}

// "● Maths" with the dot in the class colour, or "Deleted class".
function buildClassTag(classId) {
  const tag = document.createElement("span");
  tag.className = "class-tag";

  const cls = findClass(classId);
  if (!cls) {
    tag.classList.add("deleted");
    tag.textContent = "Deleted class";
    return tag;
  }

  const dot = document.createElement("span");
  dot.className = "class-dot";
  dot.style.backgroundColor = cls.color;

  tag.append(dot, cls.name);
  return tag;
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
  const day = mondayOf(new Date());
  day.setDate(day.getDate() - WEEKS * 7);

  // One square per day, in date order, up to and including today.
  // CSS places them Mon->Sun down each column.
  let dateStr = dateToString(day);
  while (dateStr <= today) {
    const minutes = totals[dateStr] || 0;

    const cell = document.createElement("div");
    cell.className = `cell level-${levelFor(minutes)}`;
    cell.dataset.date = dateStr;       // becomes data-date="..." for the tooltip
    cell.dataset.minutes = minutes;    // becomes data-minutes="..." (stored as text)
    heatmap.append(cell);

    day.setDate(day.getDate() + 1); // handles month ends, leap years, DST
    dateStr = dateToString(day);
  }

  // Show the most recent weeks first on narrow screens.
  heatmapScroll.scrollLeft = heatmapScroll.scrollWidth;
}

// ---------- Stats ----------

const statsBox = document.getElementById("stats");

// Days in a row with any study, counting back from today.
// If nothing is logged today yet, start from yesterday instead,
// so the streak doesn't show 0 every morning.
function currentStreak(totals) {
  const day = new Date();
  if (!totals[dateToString(day)]) {
    day.setDate(day.getDate() - 1);
  }

  let streak = 0;
  while (totals[dateToString(day)]) { // undefined (no study) stops the loop
    streak++;
    day.setDate(day.getDate() - 1); // one day back; safe across months and DST
  }
  return streak;
}

function renderStats() {
  const today = todayString();
  const monday = dateToString(mondayOf(new Date()));

  let total = 0;
  let week = 0;
  for (const session of data.sessions) {
    total += session.minutes;
    // Text comparison works because "YYYY-MM-DD" is in date order.
    if (session.date >= monday && session.date <= today) {
      week += session.minutes;
    }
  }

  const streak = currentStreak(minutesPerDay());
  const streakText = `${streak} ${streak === 1 ? "day" : "days"}`;

  statsBox.innerHTML = ""; // clear old boxes (no user text involved)
  statsBox.append(
    buildStat(streakText, "Streak"),
    buildStat(formatMinutes(week), "This week"),
    buildStat(formatMinutes(total), "Total")
  );
}

// One box: big value on top, small label below.
function buildStat(value, label) {
  const box = document.createElement("div");
  box.className = "stat";

  const valueEl = document.createElement("strong");
  valueEl.className = "stat-value";
  valueEl.textContent = value;

  const labelEl = document.createElement("span");
  labelEl.className = "stat-label";
  labelEl.textContent = label;

  box.append(valueEl, labelEl);
  return box;
}

// ---------- Heatmap tooltip ----------

const tooltip = document.getElementById("heatmap-tooltip");
const tooltipDate = document.getElementById("tooltip-date");
const tooltipTime = document.getElementById("tooltip-time");
const tooltipClasses = document.getElementById("tooltip-classes");

// Minutes per class on one date, most first, e.g.
// [{ key, name: "Maths", color: "#3b82f6", minutes: 90 }, ...]
function classBreakdown(dateStr) {
  // 1. Add up minutes per group: a class id, "deleted" or "none".
  const groups = {};
  for (const session of data.sessions) {
    if (session.date !== dateStr) continue; // skip other days

    let key = "none"; // no class (or an old session without classId)
    if (session.classId) {
      key = findClass(session.classId) ? session.classId : "deleted";
    }
    groups[key] = (groups[key] || 0) + session.minutes;
  }

  // 2. Turn { key: minutes } into a list of rows with a name and colour.
  // Object.entries gives [[key, minutes], [key, minutes], ...].
  const rows = Object.entries(groups).map(([key, minutes]) => {
    if (key === "none") return { key, name: "No class", color: null, minutes };
    if (key === "deleted") return { key, name: "Deleted class", color: null, minutes };
    const cls = findClass(key);
    return { key, name: cls.name, color: cls.color, minutes };
  });

  // 3. Most minutes first. Without the compare function, sort() would
  // compare as text ("100" before "30").
  return rows.sort((a, b) => b.minutes - a.minutes);
}

function showTooltip(cell) {
  const minutes = Number(cell.dataset.minutes); // data-* values are text
  tooltipDate.textContent = formatDate(cell.dataset.date);
  tooltipTime.textContent = minutes > 0 ? formatMinutes(minutes) : "Nothing logged";

  // Per-class lines. Skipped if the only group is "No class",
  // because that line would just repeat the total.
  tooltipClasses.innerHTML = ""; // clear old lines (no user text involved)
  const rows = minutes > 0 ? classBreakdown(cell.dataset.date) : [];
  const onlyNoClass = rows.length === 1 && rows[0].key === "none";
  if (!onlyNoClass) {
    for (const row of rows) {
      const li = document.createElement("li");

      const name = document.createElement("span");
      name.className = "tooltip-class-name";
      const dot = document.createElement("span");
      dot.className = "class-dot";
      if (row.color) dot.style.backgroundColor = row.color; // no colour = invisible dot, keeps alignment
      name.append(dot, row.name);

      const time = document.createElement("span");
      time.textContent = formatMinutes(row.minutes);

      li.append(name, time);
      tooltipClasses.append(li);
    }
  }
  tooltipClasses.hidden = tooltipClasses.children.length === 0;

  // All content is filled in above, BEFORE measuring below,
  // so a taller tooltip (more lines) is still placed correctly.

  // Show it first: a hidden element has no size, so we couldn't measure it.
  tooltip.hidden = false;

  const cellBox = cell.getBoundingClientRect(); // position on screen
  const tipBox = tooltip.getBoundingClientRect();
  const margin = 8; // keep this far from the screen edges
  const screenWidth = document.documentElement.clientWidth;

  // Centred above the square...
  let left = cellBox.left + cellBox.width / 2 - tipBox.width / 2;
  let top = cellBox.top - tipBox.height - 6;

  // ...but pushed back inside the screen if it would stick out.
  left = Math.max(margin, Math.min(left, screenWidth - tipBox.width - margin));
  if (top < margin) {
    top = cellBox.bottom + 6; // no room above: show it below instead
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTooltip() {
  tooltip.hidden = true;
}

// One listener on the whole grid instead of one per square ("event delegation").
// closest(".cell") finds the square the pointer is on, or null for the gaps.
heatmap.addEventListener("mouseover", (event) => {
  const cell = event.target.closest(".cell");
  if (cell) showTooltip(cell);
});

heatmap.addEventListener("mouseleave", hideTooltip);

// On phones a tap is a click.
heatmap.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (cell) showTooltip(cell);
});

// A click anywhere else hides it. Clicks on a square also arrive here
// (they bubble up), so those are ignored.
document.addEventListener("click", (event) => {
  if (!event.target.closest("#heatmap .cell")) hideTooltip();
});

// Scroll events don't bubble, so listen in the "capture" phase (true)
// to also catch scrolling inside the heatmap box.
window.addEventListener("scroll", hideTooltip, true);

// ---------- Classes ----------

const MAX_CLASS_NAME = 50; // same as maxlength="50" in index.html
const MAX_TOPIC_TITLE = 100;
const classList = document.getElementById("classes");
const classForm = document.getElementById("class-form");
const classNameInput = document.getElementById("class-name");
const classColorInput = document.getElementById("class-color");

// The class with this id, or undefined if there is none (e.g. deleted).
function findClass(id) {
  return data.classes.find((c) => c.id === id);
}

function renderClasses() {
  classList.innerHTML = ""; // clear old cards (no user text involved)

  if (data.classes.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No classes yet";
    classList.append(p);
    return;
  }

  // "cls", not "class": class is a reserved word in JavaScript.
  for (const cls of data.classes) {
    const card = document.createElement("article");
    card.className = "class-card";
    card.style.borderLeftColor = cls.color; // the coloured stripe

    const header = document.createElement("div");
    header.className = "class-header";

    const name = document.createElement("h3");
    name.textContent = cls.name;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button"; // a plain button, not a form submit
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.dataset.action = "delete-class"; // what the click listener should do
    deleteButton.dataset.id = cls.id;             // ...and to which class
    deleteButton.setAttribute("aria-label", `Delete class ${cls.name}`);

    header.append(name, deleteButton);
    card.append(header, buildProgress(cls), buildTopicList(cls), buildTopicForm(cls));
    classList.append(card);
  }
}

// "3 / 5 topics · 60%" with a bar in the class colour.
function buildProgress(cls) {
  const wrap = document.createElement("div");
  wrap.className = "progress";

  const total = cls.topics.length;
  if (total === 0) {
    // Checked first: 0 / 0 would be NaN.
    wrap.classList.add("empty");
    wrap.textContent = "No topics yet";
    return wrap;
  }

  const done = cls.topics.filter((topic) => topic.done).length;
  const percent = Math.round((done / total) * 100);

  const bar = document.createElement("div");
  bar.className = "progress-bar";
  const fill = document.createElement("div");
  fill.className = "progress-fill";
  fill.style.width = `${percent}%`;
  fill.style.backgroundColor = cls.color;
  bar.append(fill);

  const text = document.createElement("span");
  text.textContent = `${done} / ${total} topics · ${percent}%`;

  wrap.append(bar, text);
  return wrap;
}

// One row per topic: checkbox + title (inside a label) and a × button.
function buildTopicList(cls) {
  const ul = document.createElement("ul");
  ul.className = "topic-list";

  for (const topic of cls.topics) {
    const li = document.createElement("li");
    if (topic.done) li.classList.add("done");

    // Wrapping both in a <label> means tapping the title also ticks the box.
    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = topic.done;
    checkbox.dataset.action = "toggle-topic";
    checkbox.dataset.classId = cls.id; // becomes data-class-id="..."
    checkbox.dataset.id = topic.id;

    const title = document.createElement("span");
    title.textContent = topic.title;

    label.append(checkbox, title);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "topic-delete";
    deleteButton.textContent = "×";
    deleteButton.dataset.action = "delete-topic";
    deleteButton.dataset.classId = cls.id;
    deleteButton.dataset.id = topic.id;
    deleteButton.setAttribute("aria-label", `Delete topic ${topic.title}`);

    li.append(label, deleteButton);
    ul.append(li);
  }

  return ul;
}

// Small "New topic [Add]" form at the bottom of each card.
function buildTopicForm(cls) {
  const form = document.createElement("form");
  form.className = "topic-form";
  form.dataset.classId = cls.id; // which class the new topic belongs to

  const input = document.createElement("input");
  input.type = "text";
  input.name = "title"; // lets us find it later as form.elements.title
  input.placeholder = "New topic";
  input.maxLength = MAX_TOPIC_TITLE;
  input.required = true;
  input.setAttribute("aria-label", `New topic for ${cls.name}`);

  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Add";

  form.append(input, button);
  return form;
}

classForm.addEventListener("submit", (event) => {
  event.preventDefault();

  // trim() removes spaces at the start and end; "   " becomes "".
  const name = classNameInput.value.trim();
  if (name === "" || name.length > MAX_CLASS_NAME) {
    classNameInput.value = name; // drop the spaces, so "required" catches it next time
    classNameInput.focus();
    return;
  }

  // change data -> save -> re-render
  data.classes.push({
    id: crypto.randomUUID(),
    name,
    color: classColorInput.value, // always "#rrggbb"
    topics: [],
  });
  saveData();
  renderClasses();
  renderClassOptions(); // the new class appears in the log form

  classNameInput.value = "";
  classNameInput.focus();
});

// One listener for all buttons inside the class cards (event delegation).
// Each button says what it does in data-action and which item in data-id.
classList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return; // the click wasn't on one of our buttons

  const id = button.dataset.id;

  if (button.dataset.action === "delete-class") {
    const cls = data.classes.find((c) => c.id === id);
    if (!cls) return;
    if (!confirm(`Delete class "${cls.name}" and all its topics? Logged time stays in the heatmap.`)) return;

    // Keep every class except this one.
    data.classes = data.classes.filter((c) => c.id !== id);
    saveData();
    renderClasses();
    renderClassOptions(); // remove it from the log form
    renderSessions();     // its sessions now show "Deleted class"
  }

  if (button.dataset.action === "delete-topic") {
    const cls = data.classes.find((c) => c.id === button.dataset.classId);
    if (!cls) return;

    // Keep every topic except this one.
    cls.topics = cls.topics.filter((topic) => topic.id !== id);
    saveData();
    renderClasses();
  }
});

// Ticking or unticking a topic. "change" fires only when the state really
// changes, and also when using the keyboard (space bar).
classList.addEventListener("change", (event) => {
  const checkbox = event.target;
  if (checkbox.dataset.action !== "toggle-topic") return;

  const cls = data.classes.find((c) => c.id === checkbox.dataset.classId);
  if (!cls) return;
  const topic = cls.topics.find((t) => t.id === checkbox.dataset.id);
  if (!topic) return;

  topic.done = checkbox.checked; // copy what the user now sees
  saveData();
  renderClasses();
});

// Adding a topic. Submit events bubble up like clicks, so this one listener
// handles the topic form in every card.
classList.addEventListener("submit", (event) => {
  const form = event.target.closest(".topic-form");
  if (!form) return;
  event.preventDefault();

  const input = form.elements.title;
  const title = input.value.trim();
  if (title === "" || title.length > MAX_TOPIC_TITLE) {
    input.value = title;
    input.focus();
    return;
  }

  const classId = form.dataset.classId;
  const cls = data.classes.find((c) => c.id === classId);
  if (!cls) return;

  // change data -> save -> re-render
  cls.topics.push({ id: crypto.randomUUID(), title, done: false });
  saveData();
  renderClasses();

  // The re-render replaced the form, so the cursor is gone.
  // Find this class's new topic field and put the cursor back.
  const newInput = classList.querySelector(`.topic-form[data-class-id="${classId}"] input`);
  if (newInput) newInput.focus();
});

// ---------- Form ----------

const form = document.getElementById("log-form");
const dateInput = document.getElementById("log-date");
const minutesInput = document.getElementById("log-minutes");
const classSelect = document.getElementById("log-class");

// Fill the class dropdown: "No class" first, then one option per class.
function renderClassOptions() {
  const previous = classSelect.value; // remember the choice before rebuilding

  classSelect.innerHTML = ""; // clear old options (no user text involved)
  // new Option(text, value) treats the text as plain text, not HTML.
  classSelect.append(new Option("No class", ""));
  for (const cls of data.classes) {
    classSelect.append(new Option(cls.name, cls.id));
  }

  // Put the old choice back, unless that class was just deleted.
  classSelect.value = findClass(previous) ? previous : "";
}

form.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the browser from reloading the page

  const date = dateInput.value;                 // already "YYYY-MM-DD"
  const minutes = Number(minutesInput.value);   // input values are always text

  // Check again in JS: the HTML limits can be bypassed.
  if (!date || !Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) {
    return;
  }

  // "" means "No class"; store that as null.
  const classId = classSelect.value || null;
  if (classId !== null && !findClass(classId)) {
    return; // not a class that exists
  }

  // change data -> save -> re-render
  data.sessions.push({ id: crypto.randomUUID(), date, minutes, classId });
  saveData();
  renderSessions();
  renderHeatmap();
  renderStats();

  minutesInput.value = ""; // keep the date for logging more on the same day
  minutesInput.focus();
});

// ---------- Start ----------

const data = loadData();
dateInput.value = todayString();
renderClassOptions();
renderSessions();
renderHeatmap();
renderStats();
renderClasses();
