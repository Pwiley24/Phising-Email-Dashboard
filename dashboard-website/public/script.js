const CONFIG = { // Configuration for the phishing email dashboard
  title: "Phishing Queue Dashboard",
  subtitle: "Emails reported as Phishing by clients.",
  columns: ["Timestamp", "Subject", "Sender", "Recipient", "Client", "Links"],
  timestampColumn: 0,   // column used by the From/To range; null for no range filter
  stats: [              // each value gets the rows currently shown
    { label: "Filtered Emails", value: rows => rows.length },
    { label: "Filtered Clients", value: rows => new Set(rows.map(r => r[4])).size },
    { label: "Total Emails", fixed: true,value: rows => rows.length },
    { label: "Resolved Today", fixed: true,value: rows => "–" },
  ],
  rows: [
    // This will be filled in using a database
    //One array per row, one value per column
    // ["Cell", "Cell", "Cell", "Cell", "Cell", "Cell"],
    ["2024-06-01 12:00:00", "Phishing Email Subject", "sender@example.com", "recipient@example.com", "Client A", "https://example.com/link"],
    ["2024-06-02 14:30:00", "Another Phishing Email", "sender2@example.com", "recipient2@example.com", "Client B", "https://example.com/link2"],
    ["2024-06-03 09:15:00", "Suspicious Email", "sender3@example.com", "recipient3@example.com", "Client C", "https://example.com/link3"]
  ],
};

const $ = id => document.getElementById(id);
const C = CONFIG;
const uniq = i => [...new Set(C.rows.map(r => String(r[i])))];
const statEls = [];

/* ---------- Filters ---------- */
function cmp(a, v) { // compare two values, treating them as numbers if possible
  const an = Number(a), vn = Number(v);
  if (a !== "" && v !== "" && !isNaN(an) && !isNaN(vn)) return an - vn;
  return a < v ? -1 : a > v ? 1 : 0;
}
const lc = s => s.toLowerCase();
const OPS = [
  { id: "contains",     label: "contains",         test: (a, v) => lc(a).includes(lc(v)) },
  { id: "not_contains", label: "does not contain", test: (a, v) => !lc(a).includes(lc(v)) },
  { id: "is",           label: "is",               test: (a, v) => lc(a) === lc(v) },
  { id: "is_not",       label: "is not",           test: (a, v) => lc(a) !== lc(v) },
  { id: "gt",           label: "greater than",     test: (a, v) => cmp(a, v) > 0 },
  { id: "gte",          label: "greater than or equal to", test: (a, v) => cmp(a, v) >= 0 },
  { id: "lt",           label: "less than",        test: (a, v) => cmp(a, v) < 0 },
  { id: "lte",          label: "less than or equal to",    test: (a, v) => cmp(a, v) <= 0 },
];
const opOf = id => OPS.find(o => o.id === id);
const matches = (row, f) => opOf(f.op).test(String(row[f.col]), f.value);
const toTime = v => Date.parse(String(v).replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T"));

function inRange(row) { // check if the row's timestamp is within the selected range
  if (C.timestampColumn == null) return true;
  const from = $("t-from").value, to = $("t-to").value;
  if (!from && !to) return true;
  const t = toTime(row[C.timestampColumn]);
  if (isNaN(t)) return false;
  if (from && t < new Date(from).getTime()) return false;
  if (to && t > new Date(to).getTime() + 59999) return false;
  return true;
}

let filters = []; 

function draft() {  // filter currently being typed
  const value = $("f-value").value.trim();
  return value ? { col: +$("f-field").value, op: $("f-op").value, value } : null;
}
function fillValues() { // fill the value dropdown with the unique values for the selected column
  $("f-vals").innerHTML = "";
  uniq(+$("f-field").value).sort().forEach(v => $("f-vals").appendChild(new Option(v)));
}
function drawChips() { // show the currently applied filters
  const box = $("chips");
  box.innerHTML = "";
  filters.forEach((f, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.append(C.columns[f.col] + " " + opOf(f.op).label + " " + f.value);
    const x = document.createElement("button");
    x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Remove filter");
    x.addEventListener("click", () => { filters.splice(i, 1); drawChips(); render(); });
    chip.append(x);
    box.appendChild(chip);
  });
}
function addFilter() { // add the filter currently being typed
  const d = draft();
  if (!d) return;
  filters.push(d);
  $("f-value").value = "";
  drawChips(); render();
}

/* ---------- Build ---------- */
function build() { // Build the filter dropdowns and stats
  document.title = C.title;
  $("brand").textContent = C.title;
  $("title").textContent = C.title;
  $("sub").textContent = C.subtitle;
  C.columns.forEach((c, i) => {
    const th = document.createElement("th");
    th.textContent = c;
  });
  C.columns.forEach((c, i) => { if (i !== C.timestampColumn) $("f-field").add(new Option(c, i)); });
  if (C.timestampColumn == null) document.querySelector(".range").hidden = true;
    OPS.forEach(o => $("f-op").add(new Option(o.label, o.id)));
  fillValues();
  C.stats.forEach(s => {
    const d = document.createElement("div");
    d.className = "stat";
    const l = document.createElement("span"); l.textContent = s.label;
    const v = document.createElement("strong");
    d.append(l, v);
    $("stats").appendChild(d);
    statEls.push(v);
  });
}

/* ---------- Render ---------- */
function render() { // Render the table based on the current filters and search query
  const d = draft();
  const applied = d ? [...filters, d] : filters;
 const list = C.rows.filter(row => inRange(row) && applied.every(f => matches(row, f)));
  const tbody = $("rows");
  tbody.innerHTML = "";
  list.forEach(r => {
    const tr = document.createElement("tr");
    r.forEach((v, i) => {
      const td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  $("empty").textContent = C.rows.length
    ? "No rows match these filters. Clear a filter or try a different search."
    : "No data yet. Add rows to CONFIG.rows in the script.";
  $("empty").hidden = list.length > 0;
  C.stats.forEach((s, i) => { statEls[i].textContent = s.value(s.fixed ? C.rows : list); });
}

$("f-value").addEventListener("input", render);
$("f-value").addEventListener("keydown", e => { if (e.key === "Enter") addFilter(); });
$("f-field").addEventListener("change", () => { fillValues(); render(); });
$("f-op").addEventListener("change", render);
$("f-add").addEventListener("click", addFilter);
$("t-from").addEventListener("input", render);
$("t-to").addEventListener("input", render);
$("clear").addEventListener("click", () => {
  filters = []; $("f-value").value = "";
  $("t-from").value = ""; $("t-to").value = "";
  drawChips(); render();
});

build();
render();
