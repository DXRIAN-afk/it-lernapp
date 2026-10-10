// ===================================================================
//  Retro PC 95 – ein alter Windows-PC im Browser
//  Kein Server, keine Installation: einfach index.html öffnen.
// ===================================================================

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

// ---------------------------------------------------------------
//  Programme
// ---------------------------------------------------------------
const APPS = {
  computer:  { title: "Arbeitsplatz",       icon: "🖥️", w: 420, h: 300, open: openComputer },
  pokedex:   { title: "Pokédex.exe",        icon: "📕", w: 520, h: 380, open: openPokedex },
  notepad:   { title: "Unbenannt - Editor", icon: "📝", w: 460, h: 320, open: openNotepad },
  paint:     { title: "Paint",              icon: "🎨", w: 560, h: 420, open: openPaint },
  calc:      { title: "Rechner",            icon: "🧮", w: 230, h: 290, open: openCalc },
  mines:     { title: "Minesweeper",        icon: "💣", w: 230, h: 300, open: openMines },
  dos:       { title: "MS-DOS-Eingabeaufforderung", icon: "⬛", w: 540, h: 320, open: openDos },
  trash:     { title: "Papierkorb",         icon: "🗑️", w: 340, h: 220, open: openTrash },
};

const DESKTOP_ICONS = ["computer", "pokedex", "notepad", "paint", "calc", "mines", "dos", "trash"];

// ---------------------------------------------------------------
//  Boot-Sequenz
// ---------------------------------------------------------------
const BOOT_LINES = [
  "Retro BIOS v4.51PG, Copyright (C) 1984-1995",
  "",
  "Pentium-S CPU at 133MHz",
  "Speichertest :  16384K OK",
  "",
  "Erkenne IDE-Festplatte ... POKEDISK 540MB",
  "Erkenne CD-ROM ........... 4x SPEED",
  "",
  "Starte Retro 95 ...",
];

function boot() {
  const out = $("#boot-text");
  out.textContent = "";
  let i = 0;
  const next = () => {
    if (i < BOOT_LINES.length) {
      out.textContent += BOOT_LINES[i++] + "\n";
      setTimeout(next, 180 + Math.random() * 200);
    } else {
      setTimeout(() => {
        $("#boot").classList.add("hidden");
        $("#desktop").classList.remove("hidden");
      }, 600);
    }
  };
  next();
}

// Mit Klick oder Taste den Boot überspringen
$("#boot").addEventListener("click", () => {
  $("#boot").classList.add("hidden");
  $("#desktop").classList.remove("hidden");
});

// ---------------------------------------------------------------
//  Desktop-Symbole
// ---------------------------------------------------------------
function makeIcon(key, onOpen, parent) {
  const app = APPS[key] || key;
  const icon = el("div", "icon", `<div class="pic">${app.icon}</div><div class="label">${app.title.replace(" - Editor", "").replace("Unbenannt", "Editor")}</div>`);
  icon.addEventListener("click", (e) => {
    e.stopPropagation();
    parent.querySelectorAll(".icon.selected").forEach((i) => i.classList.remove("selected"));
    icon.classList.add("selected");
  });
  icon.addEventListener("dblclick", onOpen);
  parent.appendChild(icon);
  return icon;
}

function buildDesktop() {
  const icons = $("#icons");
  DESKTOP_ICONS.forEach((k) => makeIcon(k, () => openApp(k), icons));
  $("#desktop").addEventListener("click", () => {
    icons.querySelectorAll(".icon.selected").forEach((i) => i.classList.remove("selected"));
    closeStart();
  });
}

// ---------------------------------------------------------------
//  Startmenü
// ---------------------------------------------------------------
function buildStartMenu() {
  const list = $("#start-items");
  const items = ["pokedex", "notepad", "paint", "calc", "mines", "dos", "computer"];
  items.forEach((k) => {
    const li = el("li", "", `<span class="pic">${APPS[k].icon}</span>${APPS[k].title.replace("Unbenannt - ", "")}`);
    li.addEventListener("click", () => { closeStart(); openApp(k); });
    list.appendChild(li);
  });
  list.appendChild(el("hr"));
  const about = el("li", "", `<span class="pic">❓</span>Info`);
  about.addEventListener("click", () => {
    closeStart();
    msgBox("Info", "ℹ️", "Retro 95<br>Version 4.00.950<br><br>Ein PC auf deinem PC. 🖥️");
  });
  list.appendChild(about);
  const off = el("li", "", `<span class="pic">⏻</span>Beenden...`);
  off.addEventListener("click", () => { closeStart(); shutdown(); });
  list.appendChild(off);

  $("#start-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = $("#start-menu");
    menu.classList.toggle("hidden");
    $("#start-btn").classList.toggle("pressed", !menu.classList.contains("hidden"));
  });
  $("#start-menu").addEventListener("click", (e) => e.stopPropagation());
}

function closeStart() {
  $("#start-menu").classList.add("hidden");
  $("#start-btn").classList.remove("pressed");
}

function shutdown() {
  document.querySelectorAll(".window").forEach((w) => w._close());
  $("#desktop").classList.add("hidden");
  $("#shutdown").classList.remove("hidden");
}
$("#restart-btn").addEventListener("click", () => {
  $("#shutdown").classList.add("hidden");
  $("#boot").classList.remove("hidden");
  boot();
});

// ---------------------------------------------------------------
//  Uhr
// ---------------------------------------------------------------
function tick() {
  const d = new Date();
  $("#clock").textContent = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
setInterval(tick, 1000);

// ---------------------------------------------------------------
//  Fenster-Manager
// ---------------------------------------------------------------
let zTop = 10;
let offset = 0;

function openApp(key) {
  const app = APPS[key];
  app.open(app);
}

function createWindow({ title, icon, w = 400, h = 300, menu = null, status = null, resizable = true }) {
  const win = el("div", "window");
  const maxW = window.innerWidth - 20, maxH = window.innerHeight - 60;
  w = Math.min(w, maxW); h = Math.min(h, maxH);
  win.style.width = w + "px";
  win.style.height = h + "px";
  win.style.left = Math.max(0, Math.min(120 + offset, window.innerWidth - w - 10)) + "px";
  win.style.top = Math.max(0, Math.min(40 + offset, window.innerHeight - h - 50)) + "px";
  offset = (offset + 24) % 200;

  const bar = el("div", "titlebar", `<span>${icon}</span><span class="title">${title}</span>`);
  const bMin = el("button", "btn", "_");
  const bMax = el("button", "btn", "□");
  const bClose = el("button", "btn close", "✕");
  bar.append(bMin, bMax, bClose);
  win.appendChild(bar);

  if (menu) {
    const mb = el("div", "menubar");
    menu.forEach((m) => mb.appendChild(el("span", "", m)));
    win.appendChild(mb);
  }

  const content = el("div", "content");
  win.appendChild(content);

  let statusEl = null;
  if (status !== null) {
    statusEl = el("div", "statusbar", `<div>${status}</div>`);
    win.appendChild(statusEl);
  }
  if (resizable) {
    const r = el("div", "resizer");
    win.appendChild(r);
    dragResize(r, win);
  } else {
    bMax.disabled = true;
  }

  // Taskleisten-Knopf
  const task = el("button", "btn", `${icon} ${title}`);
  $("#tasks").appendChild(task);

  const focus = () => {
    document.querySelectorAll(".window.active").forEach((x) => x.classList.remove("active"));
    document.querySelectorAll("#tasks .pressed").forEach((x) => x.classList.remove("pressed"));
    win.classList.add("active");
    win.classList.remove("hidden");
    task.classList.add("pressed");
    win.style.zIndex = ++zTop;
  };
  win._close = () => {
    win._onclose && win._onclose();
    win.remove();
    task.remove();
  };

  win.addEventListener("mousedown", focus);
  bClose.addEventListener("click", win._close);
  bMin.addEventListener("click", (e) => {
    e.stopPropagation();
    win.classList.add("hidden");
    win.classList.remove("active");
    task.classList.remove("pressed");
  });
  bMax.addEventListener("click", () => win.classList.toggle("maximized"));
  bar.addEventListener("dblclick", () => resizable && win.classList.toggle("maximized"));
  task.addEventListener("click", () => {
    if (win.classList.contains("active") && !win.classList.contains("hidden")) {
      win.classList.add("hidden");
      win.classList.remove("active");
      task.classList.remove("pressed");
    } else focus();
  });

  dragMove(bar, win);
  $("#windows").appendChild(win);
  focus();

  return {
    win, content,
    setTitle: (t) => { $(".title", bar).textContent = t; task.textContent = `${icon} ${t}`; },
    setStatus: (t) => { if (statusEl) statusEl.firstChild.textContent = t; },
    close: win._close,
  };
}

function dragMove(handle, win) {
  handle.addEventListener("pointerdown", (e) => {
    if (e.target.tagName === "BUTTON" || win.classList.contains("maximized")) return;
    const sx = e.clientX - win.offsetLeft, sy = e.clientY - win.offsetTop;
    const move = (ev) => {
      win.style.left = Math.max(-win.offsetWidth + 60, Math.min(window.innerWidth - 60, ev.clientX - sx)) + "px";
      win.style.top = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - sy)) + "px";
    };
    const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  });
}

function dragResize(handle, win) {
  handle.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, sw = win.offsetWidth, sh = win.offsetHeight;
    const move = (ev) => {
      win.style.width = Math.max(200, sw + ev.clientX - sx) + "px";
      win.style.height = Math.max(120, sh + ev.clientY - sy) + "px";
    };
    const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  });
}

function msgBox(title, icon, text) {
  const { content, close } = createWindow({ title, icon: "", w: 300, h: 160, resizable: false });
  content.innerHTML = `<div class="dialog"><div class="pic">${icon}</div><div>${text}</div></div>`;
  const btns = el("div", "dialog-buttons");
  const ok = el("button", "btn", "OK");
  ok.addEventListener("click", close);
  btns.appendChild(ok);
  content.appendChild(btns);
}

// ---------------------------------------------------------------
//  Arbeitsplatz
// ---------------------------------------------------------------
function openComputer(app) {
  const { content } = createWindow({ ...app, menu: ["Datei", "Bearbeiten", "Ansicht", "Hilfe"], status: "4 Objekt(e)" });
  const box = el("div", "explorer sunken");
  box.style.height = "100%";
  content.appendChild(box);
  makeIcon({ title: "3½-Diskette (A:)", icon: "💾" }, () => msgBox("A:\\", "⚠️", "Auf A:\\ kann nicht zugegriffen werden.<br>Das Gerät ist nicht bereit."), box);
  makeIcon({ title: "POKEDISK (C:)", icon: "🖴" }, () => openApp("pokedex"), box);
  makeIcon({ title: "CD-ROM (D:)", icon: "💿" }, () => msgBox("D:\\", "💿", "Bitte legen Sie die Pokémon-CD ein."), box);
  makeIcon({ title: "Systemsteuerung", icon: "⚙️" }, openSettings, box);
}

function openSettings() {
  const { content } = createWindow({ title: "Anzeige - Hintergrund", icon: "⚙️", w: 300, h: 200, resizable: false });
  content.innerHTML = `<div style="padding:14px">Hintergrundfarbe wählen:<br><br></div>`;
  const colors = { Türkis: "#008080", Blau: "#000080", Schwarz: "#000", Pikachu: "#e8c547", Gras: "#3a7d44" };
  const row = el("div");
  row.style.cssText = "display:flex;gap:6px;flex-wrap:wrap";
  Object.entries(colors).forEach(([name, c]) => {
    const b = el("button", "btn", name);
    b.style.minWidth = "0";
    b.onclick = () => { $("#desktop").style.background = c; };
    row.appendChild(b);
  });
  content.firstChild.appendChild(row);
}

// ---------------------------------------------------------------
//  Editor
// ---------------------------------------------------------------
function openNotepad(app) {
  const { content } = createWindow({ ...app, menu: ["Datei", "Bearbeiten", "Suchen", "Hilfe"] });
  content.classList.add("sunken", "notepad");
  const ta = el("textarea");
  let saved = "";
  try { saved = localStorage.getItem("retro95-notepad") || ""; } catch (e) {}
  ta.value = saved || "Willkommen bei Retro 95!\r\n\r\nDoppelklicke auf die Symbole auf dem Desktop,\r\num Programme zu starten.\r\n\r\nDieser Text wird automatisch gespeichert.";
  ta.addEventListener("input", () => { try { localStorage.setItem("retro95-notepad", ta.value); } catch (e) {} });
  content.appendChild(ta);
  ta.focus();
}

// ---------------------------------------------------------------
//  Rechner
// ---------------------------------------------------------------
function openCalc(app) {
  const { content } = createWindow({ ...app, menu: ["Bearbeiten", "Ansicht", "Hilfe"], resizable: false });
  content.innerHTML = `<div class="calc"><div class="display sunken">0</div><div class="keys"></div></div>`;
  const disp = $(".display", content), keys = $(".keys", content);
  let cur = "0", prev = null, op = null, fresh = true;

  const calc = (a, b, o) => ({ "+": a + b, "-": a - b, "*": a * b, "/": b === 0 ? NaN : a / b }[o]);
  const show = (v) => { disp.textContent = isNaN(v) ? "Fehler" : String(+parseFloat(v).toPrecision(12)); };

  ["C", "←", "%", "/", "7", "8", "9", "*", "4", "5", "6", "-", "1", "2", "3", "+", "±", "0", ",", "="].forEach((k) => {
    const b = el("button", "btn" + ("/*-+=C←%".includes(k) ? " op" : ""), k);
    b.onclick = () => {
      if (/\d/.test(k)) { cur = fresh || cur === "0" ? k : cur + k; fresh = false; }
      else if (k === ",") { if (fresh) { cur = "0."; fresh = false; } else if (!cur.includes(".")) cur += "."; }
      else if (k === "C") { cur = "0"; prev = null; op = null; fresh = true; }
      else if (k === "←") { cur = cur.length > 1 ? cur.slice(0, -1) : "0"; }
      else if (k === "±") { cur = String(-parseFloat(cur)); }
      else if (k === "%") { cur = String(parseFloat(cur) / 100); }
      else if (k === "=") { if (op) { cur = String(calc(prev, parseFloat(cur), op)); op = null; fresh = true; } }
      else {
        if (op && !fresh) cur = String(calc(prev, parseFloat(cur), op));
        prev = parseFloat(cur); op = k; fresh = true;
      }
      show(cur);
    };
    keys.appendChild(b);
  });
}

// ---------------------------------------------------------------
//  Paint
// ---------------------------------------------------------------
function openPaint(app) {
  const { content } = createWindow({ ...app, menu: ["Datei", "Bearbeiten", "Ansicht", "Bild", "Optionen", "Hilfe"], status: "Klicke und ziehe zum Malen." });
  content.innerHTML = `<div class="paint">
      <div class="tools">
        <div class="palette"></div>
        <select class="size"><option value="2">Dünn</option><option value="5" selected>Mittel</option><option value="12">Dick</option></select>
        <button class="btn clear" style="min-width:0">Neu</button>
      </div>
      <div class="canvas-wrap"><canvas width="800" height="600"></canvas></div>
    </div>`;
  const cv = $("canvas", content), ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
  let color = "#000", drawing = false, last = null;

  const pal = $(".palette", content);
  ["#000", "#fff", "#808080", "#c0c0c0", "#800000", "#f00", "#808000", "#ff0", "#008000", "#0f0", "#008080", "#0ff", "#000080", "#00f", "#800080", "#f0f"]
    .forEach((c, i) => {
      const s = el("div", "swatch" + (i === 0 ? " sel" : ""));
      s.style.background = c;
      s.onclick = () => { color = c; pal.querySelectorAll(".sel").forEach((x) => x.classList.remove("sel")); s.classList.add("sel"); };
      pal.appendChild(s);
    });
  $(".clear", content).onclick = () => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); };

  const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener("pointerdown", (e) => { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); draw(e); });
  cv.addEventListener("pointermove", (e) => drawing && draw(e));
  cv.addEventListener("pointerup", () => { drawing = false; });
  function draw(e) {
    const p = pos(e);
    ctx.strokeStyle = color; ctx.lineWidth = +$(".size", content).value; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke();
    last = p;
  }
}

// ---------------------------------------------------------------
//  Minesweeper
// ---------------------------------------------------------------
function openMines(app) {
  const { content, win } = createWindow({ ...app, menu: ["Spiel", "Hilfe"], resizable: false });
  const W = 9, H = 9, M = 10;
  content.innerHTML = `<div class="mines">
      <div class="head sunken" style="background:#c0c0c0"><span class="lcd left">010</span><button class="btn face">🙂</button><span class="lcd time">000</span></div>
      <div class="grid sunken" style="background:#c0c0c0;grid-template-columns:repeat(${W},20px)"></div></div>`;
  const grid = $(".grid", content), face = $(".face", content), left = $(".left", content), time = $(".time", content);
  const COLORS = ["", "#00f", "#008000", "#f00", "#000080", "#800000", "#008080", "#000", "#808080"];
  let cells, over, opened, flags, timer, secs, started;

  function reset() {
    grid.innerHTML = ""; over = false; opened = 0; flags = 0; secs = 0; started = false;
    clearInterval(timer); time.textContent = "000"; left.textContent = "010"; face.textContent = "🙂";
    cells = [];
    for (let i = 0; i < W * H; i++) {
      const d = el("div", "cell");
      const c = { d, mine: false, open: false, flag: false, n: 0, i };
      d.addEventListener("click", () => reveal(c));
      d.addEventListener("contextmenu", (e) => { e.preventDefault(); flag(c); });
      d.addEventListener("mousedown", () => !over && (face.textContent = "😮"));
      d.addEventListener("mouseup", () => !over && (face.textContent = "🙂"));
      grid.appendChild(d); cells.push(c);
    }
  }
  function neighbors(c) {
    const x = c.i % W, y = Math.floor(c.i / W), r = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < W && ny < H) r.push(cells[ny * W + nx]);
    }
    return r;
  }
  function placeMines(safe) {
    let placed = 0;
    while (placed < M) {
      const c = cells[Math.floor(Math.random() * cells.length)];
      if (!c.mine && c !== safe) { c.mine = true; placed++; }
    }
    cells.forEach((c) => (c.n = neighbors(c).filter((n) => n.mine).length));
  }
  function reveal(c) {
    if (over || c.open || c.flag) return;
    if (!started) {
      started = true; placeMines(c);
      timer = setInterval(() => { secs = Math.min(999, secs + 1); time.textContent = String(secs).padStart(3, "0"); }, 1000);
    }
    c.open = true; opened++;
    c.d.classList.add("open");
    if (c.mine) {
      c.d.classList.add("boom");
      over = true; clearInterval(timer); face.textContent = "😵";
      cells.forEach((x) => x.mine && (x.d.textContent = "💣"));
      return;
    }
    if (c.n) { c.d.textContent = c.n; c.d.style.color = COLORS[c.n]; }
    else neighbors(c).forEach(reveal);
    if (opened === W * H - M && !over) {
      over = true; clearInterval(timer); face.textContent = "😎";
      cells.forEach((x) => x.mine && (x.d.textContent = "🚩"));
    }
  }
  function flag(c) {
    if (over || c.open) return;
    c.flag = !c.flag; flags += c.flag ? 1 : -1;
    c.d.textContent = c.flag ? "🚩" : "";
    left.textContent = String(M - flags).padStart(3, "0");
  }
  face.onclick = reset;
  win._onclose = () => clearInterval(timer);
  reset();
}

// ---------------------------------------------------------------
//  MS-DOS
// ---------------------------------------------------------------
function openDos(app) {
  const { content, close } = createWindow({ ...app });
  const box = el("div", "dos");
  content.appendChild(box);
  const out = el("span");
  box.appendChild(out);
  const line = el("span", "", "");
  const prompt = el("span", "", "C:\\&gt;");
  const input = el("input");
  line.append(prompt, input);
  box.appendChild(line);
  out.textContent = "Retro 95 [Version 4.00.950]\n(C) Copyright 1981-1995.\n\nTippe HELP für eine Liste der Befehle.\n\n";
  box.addEventListener("click", () => input.focus());
  setTimeout(() => input.focus(), 50);

  const cmds = {
    help: () => "Befehle: HELP, DIR, CLS, VER, DATE, TIME, ECHO <text>, POKEDEX, PAINT, EXIT",
    dir: () => " Datenträger in Laufwerk C: ist POKEDISK\n\n POKEDEX  EXE     65.535  15.10.95\n PAINT    EXE     12.288  15.10.95\n AUTOEXEC BAT          128  15.10.95\n CONFIG   SYS          256  15.10.95\n        4 Datei(en)   78.207 Bytes",
    ver: () => "Retro 95 [Version 4.00.950]",
    date: () => "Aktuelles Datum: " + new Date().toLocaleDateString("de-DE"),
    time: () => "Aktuelle Zeit: " + new Date().toLocaleTimeString("de-DE"),
    pokedex: () => { openApp("pokedex"); return "Starte POKEDEX.EXE ..."; },
    paint: () => { openApp("paint"); return "Starte PAINT.EXE ..."; },
  };
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const raw = input.value.trim();
    const [cmd, ...rest] = raw.split(" ");
    const c = cmd.toLowerCase();
    out.textContent += "C:\\>" + raw + "\n";
    input.value = "";
    if (c === "cls") out.textContent = "";
    else if (c === "exit") return close();
    else if (c === "echo") out.textContent += rest.join(" ") + "\n\n";
    else if (cmds[c]) out.textContent += cmds[c]() + "\n\n";
    else if (c) out.textContent += "Befehl oder Dateiname nicht gefunden.\n\n";
    box.scrollTop = box.scrollHeight;
  });
}

// ---------------------------------------------------------------
//  Papierkorb
// ---------------------------------------------------------------
function openTrash(app) {
  const { content } = createWindow({ ...app, menu: ["Datei", "Bearbeiten", "Ansicht", "Hilfe"], status: "1 Objekt(e)" });
  const box = el("div", "explorer sunken");
  box.style.height = "100%";
  content.appendChild(box);
  makeIcon({ title: "hausaufgaben.doc", icon: "📄" }, () => msgBox("Hmm...", "🤔", "Die wurden wohl absichtlich gelöscht."), box);
}

// ---------------------------------------------------------------
//  Pokédex
// ---------------------------------------------------------------
const TYPE_COLORS = {
  Pflanze: "#78c850", Gift: "#a040a0", Feuer: "#f08030", Wasser: "#6890f0", Flug: "#a890f0",
  Elektro: "#e0c000", Normal: "#a8a878", Psycho: "#f85888", Geist: "#705898", Drache: "#7038f8",
  Käfer: "#a8b820", Fee: "#ee99ac",
};

const POKEMON = [
  { id: 1,   name: "Bisasam",   emoji: "🌱", types: ["Pflanze", "Gift"], h: 0.7, w: 6.9,   text: "Auf seinem Rücken trägt es seit der Geburt einen Samen, der mit ihm wächst." },
  { id: 4,   name: "Glumanda",  emoji: "🔥", types: ["Feuer"],           h: 0.6, w: 8.5,   text: "Die Flamme an seiner Schwanzspitze zeigt seine Lebenskraft an." },
  { id: 6,   name: "Glurak",    emoji: "🐉", types: ["Feuer", "Flug"],   h: 1.7, w: 90.5,  text: "Es speit Feuer, das so heiß ist, dass es Felsen schmelzen lässt." },
  { id: 7,   name: "Schiggy",   emoji: "🐢", types: ["Wasser"],          h: 0.5, w: 9.0,   text: "Zieht sich bei Gefahr in seinen Panzer zurück und spritzt Wasser." },
  { id: 25,  name: "Pikachu",   emoji: "⚡", types: ["Elektro"],         h: 0.4, w: 6.0,   text: "Speichert Elektrizität in seinen Backen und entlädt sie bei Gefahr." },
  { id: 39,  name: "Pummeluff", emoji: "🎤", types: ["Normal", "Fee"],   h: 0.5, w: 5.5,   text: "Sein Gesang lässt jeden einschlafen – sehr zu seinem Ärger." },
  { id: 52,  name: "Mauzi",     emoji: "🐱", types: ["Normal"],          h: 0.4, w: 4.2,   text: "Liebt runde, glänzende Dinge, besonders Münzen." },
  { id: 54,  name: "Enton",     emoji: "🦆", types: ["Wasser"],          h: 0.8, w: 19.6,  text: "Leidet ständig unter Kopfschmerzen, die psychische Kräfte auslösen." },
  { id: 94,  name: "Gengar",    emoji: "👻", types: ["Geist", "Gift"],   h: 1.5, w: 40.5,  text: "Versteckt sich in Schatten und lässt die Temperatur sinken." },
  { id: 129, name: "Karpador",  emoji: "🐟", types: ["Wasser"],          h: 0.9, w: 10.0,  text: "Das schwächste Pokémon. Kann nur platschen. Aber wehe, es entwickelt sich!" },
  { id: 133, name: "Evoli",     emoji: "🦊", types: ["Normal"],          h: 0.3, w: 6.5,   text: "Seine instabilen Gene erlauben viele verschiedene Entwicklungen." },
  { id: 143, name: "Relaxo",    emoji: "😴", types: ["Normal"],          h: 2.1, w: 460.0, text: "Tut nichts anderes als essen und schlafen. Blockiert gern Wege." },
  { id: 150, name: "Mewtu",     emoji: "🧬", types: ["Psycho"],          h: 2.0, w: 122.0, text: "Wurde durch Genmanipulation erschaffen. Gilt als das stärkste Pokémon." },
  { id: 151, name: "Mew",       emoji: "🩷", types: ["Psycho"],          h: 0.4, w: 4.0,   text: "Soll die Gene aller Pokémon in sich tragen. Sehr selten gesehen." },
];

function openPokedex(app) {
  const { content, setStatus } = createWindow({ ...app, menu: ["Datei", "Ansicht", "Hilfe"], status: POKEMON.length + " Pokémon registriert" });
  content.innerHTML = `<div class="pokedex"><div class="list sunken"></div><div class="detail sunken" style="background:#c0c0c0"></div></div>`;
  const list = $(".list", content), detail = $(".detail", content);

  function show(p, row) {
    list.querySelectorAll(".sel").forEach((x) => x.classList.remove("sel"));
    row.classList.add("sel");
    // Sprite aus dem Internet laden; offline wird stattdessen ein Emoji angezeigt
    const sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-i/red-blue/transparent/${p.id}.png`;
    detail.innerHTML = `
      <div class="screen"><img src="${sprite}" alt="${p.name}"></div>
      <h2>#${String(p.id).padStart(3, "0")} ${p.name}</h2>
      <div class="types">${p.types.map((t) => `<span style="background:${TYPE_COLORS[t]}">${t}</span>`).join("")}</div>
      <table><tr><td>Größe:</td><td>${p.h.toLocaleString("de-DE")} m</td></tr><tr><td>Gewicht:</td><td>${p.w.toLocaleString("de-DE")} kg</td></tr></table>
      <p style="text-align:center;max-width:280px;margin:4px 0">${p.text}</p>`;
    const img = $("img", detail);
    img.onerror = () => { img.parentNode.textContent = p.emoji; };
    setStatus(`${p.name} ausgewählt`);
  }

  POKEMON.forEach((p, i) => {
    const row = el("div", "", `${String(p.id).padStart(3, "0")} ${p.name}`);
    row.onclick = () => show(p, row);
    list.appendChild(row);
    if (i === 0) show(p, row);
  });
}

// ---------------------------------------------------------------
//  Start
// ---------------------------------------------------------------
buildDesktop();
buildStartMenu();
tick();
boot();
