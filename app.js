/* =========================================================
   GotYourPrint – návrhář triček
   Vše, co budete chtít upravit (ceny, barvy, e-mail…), je v CONFIG.
   ========================================================= */

const CONFIG = {
  // Kam se mají posílat objednávky.
  // 1) Vlastní backend nebo služba typu Formspree / Getform / Basin:
  //    vložte URL, formulář se odešle jako multipart/form-data (včetně náhledů a obrázků).
  // 2) Pokud necháte prázdné, otevře se e-mailový klient zákazníka
  //    a náhledy se mu stáhnou, aby je mohl přiložit.
  orderEndpoint: "",
  orderEmail: "objednavky@gotyourprint.cz",

  currency: "Kč",
  printPricePerSide: 150,          // cena potisku jedné strany
  quantityDiscounts: [             // od kolika kusů jaká sleva
    { from: 25, percent: 15 },
    { from: 10, percent: 10 },
  ],
  minPrintDpi: 150,                // pod touto hodnotou se zobrazí varování o kvalitě

  types: [
    { id: "classic",  name: "Klasické tričko", price: 290, printCm: 30 },
    { id: "oversize", name: "Oversize tričko", price: 390, printCm: 34 },
    { id: "long",     name: "Dlouhý rukáv",    price: 420, printCm: 30 },
    { id: "tank",     name: "Tílko",           price: 260, printCm: 28 },
  ],

  colors: [
    { name: "Bílá",         hex: "#ffffff" },
    { name: "Černá",        hex: "#1c1c1e" },
    { name: "Šedý melír",   hex: "#b8b8b8" },
    { name: "Tmavě modrá",  hex: "#1f2d4d" },
    { name: "Královská modrá", hex: "#2856b8" },
    { name: "Červená",      hex: "#c62828" },
    { name: "Vínová",       hex: "#6d1f2c" },
    { name: "Lahvově zelená", hex: "#1f5a3a" },
    { name: "Olivová",      hex: "#6b6b3a" },
    { name: "Žlutá",        hex: "#f5c518" },
    { name: "Oranžová",     hex: "#ef7d1a" },
    { name: "Růžová",       hex: "#f2a7c3" },
    { name: "Béžová",       hex: "#d9c7a7" },
  ],

  sizes: [
    { id: "XS",  width: 44, length: 66, surcharge: 0 },
    { id: "S",   width: 47, length: 69, surcharge: 0 },
    { id: "M",   width: 52, length: 72, surcharge: 0 },
    { id: "L",   width: 56, length: 74, surcharge: 0 },
    { id: "XL",  width: 61, length: 76, surcharge: 0 },
    { id: "2XL", width: 66, length: 78, surcharge: 50 },
    { id: "3XL", width: 71, length: 80, surcharge: 80 },
  ],
};

/* ---------- Tvary triček (souřadnice plátna 500 × 600) ---------- */

// d = hloubka výstřihu (vpředu hlubší, vzadu mělčí)
const SHAPES = {
  classic: {
    neckDepth: { front: 95, back: 55 },
    body: (d) => `M175 40 Q250 ${d} 325 40 L400 65 L480 150 L425 205 L390 178 L390 555 Q250 570 110 555 L110 178 L75 205 L20 150 L100 65 Z`,
    neck: (d) => `M175 40 Q250 ${d} 325 40`,
    seams: "M100 65 Q116 120 110 178 M400 65 Q384 120 390 178 M28 158 L81 210 M472 158 L419 210",
    print: { x: 165, y: 110, w: 170, h: 235 },
  },
  oversize: {
    neckDepth: { front: 92, back: 55 },
    body: (d) => `M180 40 Q250 ${d} 320 40 L415 68 L492 205 L432 238 L405 212 L405 565 Q250 578 95 565 L95 212 L68 238 L8 205 L85 68 Z`,
    neck: (d) => `M180 40 Q250 ${d} 320 40`,
    seams: "M85 68 Q102 150 95 212 M415 68 Q398 150 405 212 M16 212 L73 243 M484 212 L427 243",
    print: { x: 155, y: 115, w: 190, h: 255 },
  },
  long: {
    neckDepth: { front: 95, back: 55 },
    body: (d) => `M175 40 Q250 ${d} 325 40 L400 65 L445 190 L478 470 L432 478 L405 300 L390 200 L390 555 Q250 570 110 555 L110 200 L95 300 L68 478 L22 470 L55 190 L100 65 Z`,
    neck: (d) => `M175 40 Q250 ${d} 325 40`,
    seams: "M100 65 Q118 130 110 200 M400 65 Q382 130 390 200 M25 450 L71 458 M475 450 L429 458",
    print: { x: 165, y: 110, w: 170, h: 235 },
  },
  tank: {
    neckDepth: { front: 115, back: 75 },
    body: (d) => `M190 30 L218 30 Q250 ${d} 282 30 L310 30 Q318 150 390 195 L390 555 Q250 570 110 555 L110 195 Q182 150 190 30 Z`,
    neck: (d) => `M218 30 Q250 ${d} 282 30`,
    seams: "M310 30 Q318 150 390 195 M110 195 Q182 150 190 30",
    print: { x: 165, y: 135, w: 170, h: 220 },
  },
};

/* ---------- Stav aplikace ---------- */

const state = {
  type: CONFIG.types[0].id,
  color: CONFIG.colors[0],
  size: "M",
  qty: 1,
  side: "front",
  designs: { front: null, back: null }, // { img, file, x, y, scale, rotation }
};

const W = 500, H = 600;
const canvas = document.getElementById("shirtCanvas");
const ctx = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);

/* ---------- Pomocné funkce ---------- */

const fmt = (n) => `${Math.round(n).toLocaleString("cs-CZ")} ${CONFIG.currency}`;
const getType = () => CONFIG.types.find((t) => t.id === state.type);
const getSize = () => CONFIG.sizes.find((s) => s.id === state.size);
const sideName = (side) => (side === "front" ? "přední strana" : "zadní strana");

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amount * 255)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

/* ---------- Kreslení ---------- */

function drawShirt(c, typeId, side, colorHex, design, showGuides) {
  const shape = SHAPES[typeId];
  const d = shape.neckDepth[side];
  const body = new Path2D(shape.body(d));
  const dark = luminance(colorHex) < 0.35;

  c.clearRect(0, 0, W, H);

  // stín pod tričkem
  c.save();
  c.shadowColor = "rgba(0,0,0,0.18)";
  c.shadowBlur = 24;
  c.shadowOffsetY = 10;
  c.fillStyle = colorHex;
  c.fill(body);
  c.restore();

  // stínování látky
  c.save();
  c.clip(body);
  const side_ = c.createLinearGradient(0, 0, W, 0);
  side_.addColorStop(0, "rgba(0,0,0,0.16)");
  side_.addColorStop(0.25, "rgba(0,0,0,0)");
  side_.addColorStop(0.75, "rgba(0,0,0,0)");
  side_.addColorStop(1, "rgba(0,0,0,0.16)");
  c.fillStyle = side_;
  c.fillRect(0, 0, W, H);
  const top = c.createRadialGradient(250, 220, 30, 250, 260, 330);
  top.addColorStop(0, dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.25)");
  top.addColorStop(1, "rgba(0,0,0,0.06)");
  c.fillStyle = top;
  c.fillRect(0, 0, W, H);

  // švy
  c.strokeStyle = dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.12)";
  c.lineWidth = 1.5;
  c.setLineDash([4, 3]);
  c.stroke(new Path2D(shape.seams));
  c.setLineDash([]);

  // potisk
  if (design) drawDesign(c, shape.print, design);

  c.restore();

  // lem výstřihu
  c.save();
  c.lineCap = "round";
  c.strokeStyle = shade(colorHex, dark ? 0.08 : -0.12);
  c.lineWidth = 11;
  c.stroke(new Path2D(shape.neck(d)));
  c.strokeStyle = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)";
  c.lineWidth = 1;
  c.stroke(new Path2D(shape.neck(d + 12)));
  c.restore();

  // obrys
  c.strokeStyle = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)";
  c.lineWidth = 1.5;
  c.stroke(body);

  // vodítko tiskové plochy
  if (showGuides) {
    const p = shape.print;
    c.save();
    c.strokeStyle = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.3)";
    c.setLineDash([6, 5]);
    c.lineWidth = 1;
    c.strokeRect(p.x, p.y, p.w, p.h);
    c.restore();
    if (!design) {
      c.save();
      c.fillStyle = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)";
      c.font = "14px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText("Sem umístěte svůj obrázek", p.x + p.w / 2, p.y + p.h / 2);
      c.restore();
    }
  }
}

function designRect(print, dsg) {
  // SVG bez zadaných rozměrů má naturalWidth 0 – použijeme čtverec
  const iw = dsg.img.naturalWidth || 1000, ih = dsg.img.naturalHeight || 1000;
  const fit = Math.min(print.w / iw, print.h / ih);
  const w = iw * fit * dsg.scale;
  const h = ih * fit * dsg.scale;
  const cx = print.x + print.w / 2 + dsg.x * print.w;
  const cy = print.y + print.h / 2 + dsg.y * print.h;
  return { w, h, cx, cy };
}

function drawDesign(c, print, dsg) {
  const { w, h, cx, cy } = designRect(print, dsg);
  c.save();
  c.beginPath();
  c.rect(print.x, print.y, print.w, print.h);
  c.clip();
  c.translate(cx, cy);
  c.rotate((dsg.rotation * Math.PI) / 180);
  c.drawImage(dsg.img, -w / 2, -h / 2, w, h);
  c.restore();
}

function setupCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function render() {
  drawShirt(ctx, state.type, state.side, state.color.hex, state.designs[state.side], true);
  canvas.classList.toggle("can-drag", !!state.designs[state.side]);
}

/* Vykreslí náhled do samostatného plátna (pro stažení / objednávku) */
function renderSideImage(side, scale = 2) {
  const off = document.createElement("canvas");
  off.width = W * scale;
  off.height = H * scale;
  const c = off.getContext("2d");
  c.scale(scale, scale);
  drawShirt(c, state.type, side, state.color.hex, state.designs[side], false);
  return off;
}

function renderCombinedImage() {
  const scale = 2;
  const out = document.createElement("canvas");
  out.width = W * 2 * scale;
  out.height = (H + 40) * scale;
  const c = out.getContext("2d");
  c.fillStyle = "#f5f4f1";
  c.fillRect(0, 0, out.width, out.height);
  ["front", "back"].forEach((side, i) => {
    c.drawImage(renderSideImage(side, scale), i * W * scale, 0);
    c.fillStyle = "#6b6b70";
    c.font = `${16 * scale}px system-ui, sans-serif`;
    c.textAlign = "center";
    c.fillText(side === "front" ? "Přední strana" : "Zadní strana", (i * W + W / 2) * scale, (H + 22) * scale);
  });
  return out;
}

const canvasToBlob = (cv) => new Promise((res) => cv.toBlob(res, "image/png"));

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/* ---------- Výběr typu, barvy, velikosti ---------- */

function buildOptions() {
  // typy
  const typeBox = $("typeOptions");
  CONFIG.types.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "type-card";
    btn.dataset.id = t.id;
    const shape = SHAPES[t.id];
    btn.innerHTML = `
      <svg viewBox="0 0 500 600" aria-hidden="true">
        <path d="${shape.body(shape.neckDepth.front)}" fill="#eee" stroke="#555" stroke-width="10" stroke-linejoin="round"/>
      </svg>
      <span class="t-name">${t.name}</span>
      <span class="t-price">od ${fmt(t.price)}</span>`;
    btn.addEventListener("click", () => {
      state.type = t.id;
      update();
    });
    typeBox.appendChild(btn);
  });

  // barvy
  const colorBox = $("colorOptions");
  CONFIG.colors.forEach((col) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.style.background = col.hex;
    btn.title = col.name;
    btn.setAttribute("aria-label", col.name);
    btn.addEventListener("click", () => {
      state.color = col;
      update();
    });
    colorBox.appendChild(btn);
  });

  // velikosti
  const sizeBox = $("sizeOptions");
  CONFIG.sizes.forEach((s) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "size-btn";
    btn.dataset.id = s.id;
    btn.innerHTML = s.surcharge ? `${s.id}<small>+${s.surcharge} ${CONFIG.currency}</small>` : s.id;
    btn.addEventListener("click", () => {
      state.size = s.id;
      update();
    });
    sizeBox.appendChild(btn);
  });

  $("sizeTable").innerHTML = CONFIG.sizes
    .map((s) => `<tr><td>${s.id}</td><td>${s.width}</td><td>${s.length}</td></tr>`)
    .join("");
}

/* ---------- Cena ---------- */

function calcPrice() {
  const type = getType();
  const size = getSize();
  const printedSides = ["front", "back"].filter((s) => state.designs[s]).length;
  const unit = type.price + size.surcharge + printedSides * CONFIG.printPricePerSide;
  const discount = CONFIG.quantityDiscounts.find((d) => state.qty >= d.from);
  const subtotal = unit * state.qty;
  const discountAmount = discount ? (subtotal * discount.percent) / 100 : 0;
  return { type, size, printedSides, unit, subtotal, discount, discountAmount, total: subtotal - discountAmount };
}

function renderSummary() {
  const p = calcPrice();
  const rows = [
    [`${p.type.name}, ${state.color.name}, ${p.size.id}`, fmt(p.type.price + p.size.surcharge)],
    [`Potisk (${p.printedSides}× strana)`, fmt(p.printedSides * CONFIG.printPricePerSide)],
    [`Cena za kus × ${state.qty}`, fmt(p.subtotal)],
  ];
  if (p.discount) rows.push([`Množstevní sleva ${p.discount.percent} %`, "−" + fmt(p.discountAmount)]);
  $("summary").innerHTML =
    rows.map(([a, b]) => `<div class="row"><span>${a}</span><span>${b}</span></div>`).join("") +
    `<div class="row total"><span>Celkem</span><span>${fmt(p.total)}</span></div>`;
}

/* ---------- Obrázek ---------- */

function loadImageFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("Vyberte prosím obrázek (PNG, JPG, WEBP nebo SVG).");
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    alert("Obrázek je příliš velký (max. 15 MB).");
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.designs[state.side] = { img, file, x: 0, y: 0, scale: 0.8, rotation: 0 };
    update();
  };
  img.onerror = () => alert("Obrázek se nepodařilo načíst.");
  img.src = url;
}

function checkQuality() {
  const dsg = state.designs[state.side];
  const warn = $("qualityWarning");
  if (!dsg || dsg.file.type === "image/svg+xml") {
    warn.hidden = true;
    return;
  }
  const print = SHAPES[state.type].print;
  const { w } = designRect(print, dsg);
  const widthCm = (w / print.w) * getType().printCm;
  const dpi = dsg.img.naturalWidth / (widthCm / 2.54);
  warn.hidden = dpi >= CONFIG.minPrintDpi;
  warn.textContent = `Pozor: obrázek má při této velikosti nízké rozlišení (~${Math.round(dpi)} DPI). ` +
    `Potisk může být rozmazaný – doporučujeme obrázek ve vyšším rozlišení nebo jej zmenšit.`;
}

function syncImageControls() {
  const dsg = state.designs[state.side];
  $("imageControls").hidden = !dsg;
  if (dsg) {
    $("scaleRange").value = Math.round(dsg.scale * 100);
    $("rotateRange").value = Math.round(dsg.rotation);
  }
  checkQuality();
}

/* ---------- Posouvání obrázku myší / prstem ---------- */

const pointers = new Map();
let dragStart = null;
let pinchStart = null;

function toCanvasCoords(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}

canvas.addEventListener("pointerdown", (e) => {
  const dsg = state.designs[state.side];
  if (!dsg) return;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, toCanvasCoords(e));
  if (pointers.size === 1) {
    const p = toCanvasCoords(e);
    dragStart = { px: p.x, py: p.y, x: dsg.x, y: dsg.y };
    canvas.classList.add("dragging");
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: dsg.scale };
    dragStart = null;
  }
});

canvas.addEventListener("pointermove", (e) => {
  const dsg = state.designs[state.side];
  if (!dsg || !pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, toCanvasCoords(e));
  const print = SHAPES[state.type].print;

  if (pointers.size === 2 && pinchStart) {
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    dsg.scale = clamp(pinchStart.scale * (dist / pinchStart.dist), 0.1, 2);
  } else if (dragStart) {
    const p = toCanvasCoords(e);
    dsg.x = clamp(dragStart.x + (p.x - dragStart.px) / print.w, -0.75, 0.75);
    dsg.y = clamp(dragStart.y + (p.y - dragStart.py) / print.h, -0.75, 0.75);
  }
  render();
  syncImageControls();
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = null;
  if (pointers.size === 0) {
    dragStart = null;
    canvas.classList.remove("dragging");
  }
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);

canvas.addEventListener("wheel", (e) => {
  const dsg = state.designs[state.side];
  if (!dsg) return;
  e.preventDefault();
  dsg.scale = clamp(dsg.scale * (e.deltaY < 0 ? 1.05 : 0.95), 0.1, 2);
  render();
  syncImageControls();
}, { passive: false });

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* ---------- Přetažení souboru na tričko ---------- */

const wrap = $("canvasWrap");
["dragenter", "dragover"].forEach((ev) =>
  wrap.addEventListener(ev, (e) => {
    e.preventDefault();
    wrap.classList.add("drag-over");
  })
);
["dragleave", "drop"].forEach((ev) =>
  wrap.addEventListener(ev, (e) => {
    e.preventDefault();
    wrap.classList.remove("drag-over");
  })
);
wrap.addEventListener("drop", (e) => loadImageFile(e.dataTransfer.files[0]));

/* ---------- Ovládací prvky ---------- */

$("fileInput").addEventListener("change", (e) => {
  loadImageFile(e.target.files[0]);
  e.target.value = "";
});

$("scaleRange").addEventListener("input", (e) => {
  const dsg = state.designs[state.side];
  if (!dsg) return;
  dsg.scale = e.target.value / 100;
  render();
  checkQuality();
});

$("rotateRange").addEventListener("input", (e) => {
  const dsg = state.designs[state.side];
  if (!dsg) return;
  dsg.rotation = Number(e.target.value);
  render();
});

$("centerBtn").addEventListener("click", () => {
  const dsg = state.designs[state.side];
  if (!dsg) return;
  dsg.x = 0;
  dsg.y = 0;
  update();
});

$("fitBtn").addEventListener("click", () => {
  const dsg = state.designs[state.side];
  if (!dsg) return;
  Object.assign(dsg, { x: 0, y: 0, scale: 1, rotation: 0 });
  update();
});

$("removeBtn").addEventListener("click", () => {
  state.designs[state.side] = null;
  update();
});

document.querySelectorAll(".side-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    state.side = btn.dataset.side;
    update();
  })
);

function setQty(v) {
  state.qty = clamp(Math.round(Number(v) || 1), 1, 500);
  $("qtyInput").value = state.qty;
  renderSummary();
}
$("qtyMinus").addEventListener("click", () => setQty(state.qty - 1));
$("qtyPlus").addEventListener("click", () => setQty(state.qty + 1));
$("qtyInput").addEventListener("change", (e) => setQty(e.target.value));

$("downloadBtn").addEventListener("click", async () => {
  downloadBlob(await canvasToBlob(renderCombinedImage()), "gotyourprint-navrh.png");
});

/* ---------- Objednávka ---------- */

const dialog = $("orderDialog");
const form = $("orderForm");
const statusEl = $("formStatus");

function orderSummaryText() {
  const p = calcPrice();
  const sides = ["front", "back"]
    .filter((s) => state.designs[s])
    .map((s) => `${sideName(s)} (${state.designs[s].file.name})`)
    .join(", ");
  return [
    `Typ: ${p.type.name}`,
    `Barva: ${state.color.name}`,
    `Velikost: ${p.size.id}`,
    `Počet kusů: ${state.qty}`,
    `Potisk: ${sides}`,
    `Cena celkem: ${fmt(p.total)}`,
  ].join("\n");
}

$("orderOpenBtn").addEventListener("click", () => {
  if (!state.designs.front && !state.designs.back) {
    alert("Nejdříve prosím nahrajte obrázek, který chcete na tričko natisknout.");
    return;
  }
  const preview = renderCombinedImage().toDataURL("image/png");
  $("orderRecap").innerHTML =
    `<img src="${preview}" alt="Náhled návrhu"><div>${orderSummaryText().replace(/\n/g, "<br>")}</div>`;
  statusEl.textContent = "";
  statusEl.className = "form-status";
  dialog.showModal();
});

$("orderCancelBtn").addEventListener("click", () => dialog.close());

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const p = calcPrice();
  const submitBtn = $("orderSubmitBtn");

  // informace o objednávce
  fd.set("type", p.type.name);
  fd.set("color", state.color.name);
  fd.set("size", p.size.id);
  fd.set("quantity", String(state.qty));
  fd.set("total", fmt(p.total));
  fd.set("summary", orderSummaryText());

  const files = [];
  files.push(["preview", await canvasToBlob(renderCombinedImage()), "nahled.png"]);
  for (const side of ["front", "back"]) {
    const dsg = state.designs[side];
    if (!dsg) continue;
    files.push([`preview_${side}`, await canvasToBlob(renderSideImage(side, 3)), `nahled-${side}.png`]);
    files.push([`original_${side}`, dsg.file, `original-${side}-${dsg.file.name}`]);
    fd.set(`placement_${side}`, JSON.stringify({
      x: +dsg.x.toFixed(3), y: +dsg.y.toFixed(3), scale: +dsg.scale.toFixed(3), rotation: dsg.rotation,
    }));
  }

  if (CONFIG.orderEndpoint) {
    files.forEach(([field, blob, name]) => fd.append(field, blob, name));
    submitBtn.disabled = true;
    statusEl.className = "form-status";
    statusEl.textContent = "Odesílám objednávku…";
    try {
      const res = await fetch(CONFIG.orderEndpoint, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(res.status);
      statusEl.className = "form-status ok";
      statusEl.textContent = "Děkujeme! Objednávka byla odeslána, brzy se vám ozveme e-mailem.";
      form.reset();
    } catch (err) {
      statusEl.className = "form-status err";
      statusEl.textContent = `Objednávku se nepodařilo odeslat. Zkuste to prosím znovu nebo nám napište na ${CONFIG.orderEmail}.`;
    } finally {
      submitBtn.disabled = false;
    }
    return;
  }

  // Záložní varianta: e-mail + stažení souborů k přiložení
  files.forEach(([, blob, name]) => downloadBlob(blob, name));
  const body = [
    "Dobrý den, objednávám tričko s potiskem:",
    "",
    orderSummaryText(),
    "",
    `Jméno: ${fd.get("name")}`,
    `E-mail: ${fd.get("email")}`,
    `Telefon: ${fd.get("phone") || "-"}`,
    `Adresa: ${fd.get("address")}`,
    `Poznámka: ${fd.get("note") || "-"}`,
    "",
    "(Náhled a obrázky přikládám – byly staženy do složky Stažené soubory.)",
  ].join("\n");
  window.location.href =
    `mailto:${CONFIG.orderEmail}?subject=${encodeURIComponent("Objednávka trička – " + fd.get("name"))}` +
    `&body=${encodeURIComponent(body)}`;
  statusEl.className = "form-status ok";
  statusEl.textContent = "Otevřel se váš e-mail. Přiložte prosím stažené soubory (náhled a obrázky) a e-mail odešlete.";
});

/* ---------- Aktualizace UI ---------- */

function update() {
  document.querySelectorAll(".type-card").forEach((b) => b.classList.toggle("active", b.dataset.id === state.type));
  document.querySelectorAll(".swatch").forEach((b) => b.classList.toggle("active", b.title === state.color.name));
  document.querySelectorAll(".size-btn").forEach((b) => b.classList.toggle("active", b.dataset.id === state.size));
  document.querySelectorAll(".side-btn").forEach((b) => {
    const on = b.dataset.side === state.side;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on);
  });
  $("colorName").textContent = "– " + state.color.name;
  $("sideLabel").textContent = sideName(state.side);
  render();
  syncImageControls();
  renderSummary();
}

setupCanvas();
buildOptions();
update();
window.addEventListener("resize", () => {
  setupCanvas();
  render();
});
