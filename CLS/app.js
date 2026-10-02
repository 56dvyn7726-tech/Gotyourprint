/* ============================================================
   NASTAVENÍ – upravte podle potřeby
   ============================================================ */
const CONFIG = {
  // URL webové aplikace z Google Apps Script (viz NAVOD.md).
  // Prázdné = ukázkový režim (objednávky jen v prohlížeči).
  scriptUrl: "https://script.google.com/macros/s/AKfycbyyEQc8kynVf77i26dRyVyfAhj4YYANCjjimMEcUtnDglEE5kmUg0NcOtG-PUAKaCQ1/exec",
  demoPassword: "tricka",       // heslo do správy jen pro ukázkový režim
  demoAccount: "123456789/0100", // smyšlený účet jen pro ukázkový režim (skutečný účet se nastavuje ve skriptu Google)

  title: "Combat Life Saver",
  deadline: "Objednávky přijímáme do 15. 10. 2026 · trička doručíme na váš domovský útvar",

  variants: [
    { id: "cerna", name: "Černá", print: "bílý potisk", color: "#161616", img: "img/cerna.jpg" },
    { id: "oliva", name: "Oliva", print: "černý potisk", color: "#6b7042", img: "img/oliva.jpg" },
  ],

  // Střihy triček – každý má vlastní velikosti a rozměry (A = šířka, B = délka, C = rukáv, v cm)
  cuts: [
    {
      id: "fit", name: "FIT", price: 479,     // cena za kus v Kč
      specs: ["Klasický střih", "100% bavlna", "180 g/m²"],
      info: "img/info-fit.jpg",
      chart: "img/tabulka-fit.jpg",
      sizes: [
        { id: "S",   a: 47, b: 70, c: 19.5 },
        { id: "M",   a: 51, b: 72, c: 20.5 },
        { id: "L",   a: 55, b: 74, c: 21.5 },
        { id: "XL",  a: 59, b: 76, c: 22.5 },
        { id: "2XL", a: 64, b: 78, c: 23.5 },
      ],
    },
    {
      id: "everyday", name: "EVERYDAY", price: 479,
      specs: ["Klasický střih", "100% bavlna", "180 g/m²"],
      info: "img/info-everyday.jpg",
      chart: "img/tabulka-everyday.jpg",
      sizes: [
        { id: "XS",  a: 45.5, b: 71.5, c: 20 },
        { id: "S",   a: 48.5, b: 73.5, c: 20.5 },
        { id: "M",   a: 51.5, b: 75.5, c: 21 },
        { id: "L",   a: 54.5, b: 77.5, c: 22 },
        { id: "XL",  a: 57.5, b: 79.5, c: 23 },
        { id: "2XL", a: 60.5, b: 81.5, c: 24 },
        { id: "3XL", a: 65,   b: 82.5, c: 24.5 },
      ],
    },
  ],
};

/* ============================================================ */

const $ = (id) => document.getElementById(id);
const STORE_KEY = "gyp-order-v2-" + CONFIG.title;
const DEMO_KEY = "gyp-demo-orders-v2-" + CONFIG.title;
const itemKey = (c, v, s) => `${c.name} ${v.name} ${s.id}`;   // např. "FIT Černá M"
// všechny kombinace střih × barva × velikost v pořadí z nastavení
const combos = () => CONFIG.cuts.flatMap((c) => CONFIG.variants.flatMap((v) => c.sizes.map((s) => ({ c, v, s, key: itemKey(c, v, s) }))));
// cena objednávky podle cen střihů
const orderPrice = (items) => combos().reduce((a, { c, key }) => a + (Number(items[key]) || 0) * (c.price || 0), 0);
const kc = (n) => `${cz(n)} Kč`;
const sumKeys = (items, keys) => keys.reduce((a, k) => a + (Number(items[k]) || 0), 0);
// všechny velikosti napříč střihy (pro souhrnnou tabulku)
const allSizes = () => {
  const order = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  const ids = [...new Set(CONFIG.cuts.flatMap((c) => c.sizes.map((s) => s.id)))];
  return ids.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
};
const cz = (n) => n.toLocaleString("cs-CZ");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

function storageGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function storageSet(key, value) {
  try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch { /* bez úložiště */ }
}

/* ---------- Platba (v ostrém provozu údaje posílá skript Google) ---------- */

function czIban(account) {
  const m = String(account).replace(/\s/g, "").match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/);
  if (!m) return "";
  const bban = m[3] + (m[1] || "").padStart(6, "0") + m[2].padStart(10, "0");
  let mod = 0;
  for (const d of bban + "123500") mod = (mod * 10 + Number(d)) % 97;
  return "CZ" + String(98 - mod).padStart(2, "0") + bban;
}

function demoPayment(vs, amount, name) {
  const message = ("CLS tricko " + name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 .,-]/g, "").toUpperCase().slice(0, 60).trim();
  const iban = czIban(CONFIG.demoAccount);
  return { account: CONFIG.demoAccount, iban, vs: String(vs), amount, message, days: 7,
    spd: `SPD*1.0*ACC:${iban}*AM:${amount.toFixed(2)}*CC:CZK*X-VS:${vs}*MSG:${message}` };
}

function drawQr(canvas, text) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (typeof qrcode !== "function") return;
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const cell = Math.floor(canvas.width / (n + 8));
  const off = Math.floor((canvas.width - cell * n) / 2);
  ctx.fillStyle = "#000";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(off + c * cell, off + r * cell, cell, cell);
}

function renderPayment() {
  const p = state.payment;
  $("payBox").hidden = !p || !state.submitted;
  if (!p) return;
  $("payAccount").textContent = p.account;
  $("payAmount").textContent = kc(p.amount);
  $("payVs").textContent = p.vs;
  $("payMsg").textContent = p.message;
  $("payDays").textContent = p.days ? ` Zaplaťte prosím do ${p.days} dnů.` : "";
  $("payDemo").hidden = !!CONFIG.scriptUrl;
  drawQr($("payQr"), p.spd);
}

$("payBox").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  const text = $(b.dataset.copy).textContent.replace(/\s/g, "");
  try {
    await navigator.clipboard.writeText(text);
    b.textContent = "Zkopírováno";
    setTimeout(() => { b.textContent = "Kopírovat"; }, 1500);
  } catch {
    getSelection().selectAllChildren($(b.dataset.copy));
  }
});

/* ---------- Úložiště: Google Apps Script, nebo ukázka v prohlížeči ---------- */

const api = CONFIG.scriptUrl ? {
  async call(body) {
    const res = await fetch(CONFIG.scriptUrl, { method: "POST", body: JSON.stringify(body) }); // text/plain = bez CORS preflight
    if (!res.ok) throw new Error("http_" + res.status);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "unknown");
    return data;
  },
  save(order) { return this.call({ action: "save", order }); },
  cancel(id) { return this.call({ action: "cancel", id }); },
  list(password) { return this.call({ action: "list", password }).then((d) => d.orders); },
  remove(password, id) { return this.call({ action: "delete", password, id }).then((d) => d.orders); },
  setPaid(password, id, paid) { return this.call({ action: "setPaid", password, id, paid }).then((d) => d.orders); },
} : {
  all() { return storageGet(DEMO_KEY, []); },
  async save(order) {
    const all = this.all();
    const now = new Date().toISOString();
    const i = all.findIndex((o) => o.id === order.id);
    if (i >= 0 && all[i].paid) throw new Error("paid");
    const vs = i >= 0 ? all[i].vs : Math.max(1000, ...all.map((o) => o.vs || 0)) + 1;
    const row = { ...order, vs, paid: "", created: i >= 0 ? all[i].created : now, updated: now };
    i >= 0 ? (all[i] = row) : all.push(row);
    storageSet(DEMO_KEY, all);
    return { ok: true, updated: now, payment: demoPayment(vs, orderPrice(order.items), order.name) };
  },
  async cancel(id) {
    if (this.all().some((o) => o.id === id && o.paid)) throw new Error("paid");
    storageSet(DEMO_KEY, this.all().filter((o) => o.id !== id));
    return { ok: true };
  },
  async setPaid(password, id, paid) {
    const all = await this.list(password);
    all.forEach((o) => { if (o.id === id) o.paid = paid ? new Date().toISOString() : ""; });
    storageSet(DEMO_KEY, all);
    return all;
  },
  async list(password) {
    if (password !== CONFIG.demoPassword) throw new Error("bad_password");
    return this.all();
  },
  async remove(password, id) { storageSet(DEMO_KEY, this.all().filter((o) => o.id !== id)); return this.list(password); },
};

/* ---------- Stav zákazníka (pamatuje si volby) ---------- */

const saved = storageGet(STORE_KEY, null);
const state = {
  id: saved?.id || null,
  submitted: saved?.submitted || null,
  items: { ...(saved?.items || {}) },
  cut: CONFIG.cuts.some((c) => c.id === saved?.cut) ? saved.cut : CONFIG.cuts[0].id,
  payment: saved?.payment || null,
};
const currentCut = () => CONFIG.cuts.find((c) => c.id === state.cut);

function persistDraft() {
  storageSet(STORE_KEY, {
    id: state.id,
    submitted: state.submitted,
    items: state.items,
    cut: state.cut,
    payment: state.payment,
    first: $("fFirst").value,
    last: $("fLast").value,
    phone: $("fPhone").value,
    email: $("fEmail").value,
    unit: $("fUnit").value,
    note: $("fNote").value,
    consent: $("fConsent").checked,
  });
}

/* ---------- Vykreslení nabídky ---------- */

function buildShop() {
  $("title").textContent = CONFIG.title;
  if (CONFIG.deadline) { $("deadline").textContent = CONFIG.deadline; $("deadline").hidden = false; }
  if (!CONFIG.scriptUrl) { $("demoPass").textContent = CONFIG.demoPassword; $("demoBanner").hidden = false; }

  $("cuts").innerHTML = CONFIG.cuts.map((c) => `
    <button type="button" class="cut" role="tab" data-cut="${c.id}" aria-selected="false">
      <span class="cut-name">${esc(c.name)}<span class="cut-count" hidden></span></span>
      <span class="cut-specs">${esc([...c.specs, `velikosti ${c.sizes[0].id}–${c.sizes[c.sizes.length - 1].id}`].join(" · "))}</span>
      ${c.price ? `<span class="cut-price">${kc(c.price)} / ks</span>` : ""}
    </button>`).join("");
  $("cuts").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cut]");
    if (!b || b.dataset.cut === state.cut) return;
    state.cut = b.dataset.cut;
    renderCut();
    persistDraft();
  });

  $("variants").addEventListener("click", (e) => {
    const fig = e.target.closest("[data-zoom]");
    if (fig) return openZoom(fig.dataset.zoom);
    const cell = e.target.closest(".size");
    if (!cell) return;
    const key = cell.dataset.key;
    const q = state.items[key] || 0;
    if (e.target.closest("[data-plus]") || e.target.closest("[data-add]")) setQty(key, q + 1);
    else if (e.target.closest("[data-minus]")) setQty(key, q - 1);
  });

  // info o střizích a tabulky velikostí – vždy všechny najednou
  $("cutInfos").innerHTML = CONFIG.cuts.map((c) => {
    const cols = c.sizes.map((s) => `<th scope="col">${s.id}</th>`).join("");
    const row = (label, name, f) => `<tr><th scope="row"><span>${label}</span><em class="lbl">${name}</em></th>${c.sizes.map((s) => `<td>${String(f(s)).replace(".", ",")}</td>`).join("")}</tr>`;
    return `
      <article class="cut-info" data-cut="${c.id}">
        <div class="cut-info-head">
          ${c.info ? `<figure data-zoom="${esc(c.info)}"><img src="${esc(c.info)}" alt="Tričko ${esc(c.name)} – produktový list" loading="lazy"></figure>` : ""}
          <div>
            <h3>${esc(c.name)}</h3>
            ${c.price ? `<p class="info-price">${kc(c.price)} <small>/ ks</small></p>` : ""}
            <ul>${c.specs.map((x) => `<li>${esc(x)}</li>`).join("")}<li>velikosti ${c.sizes[0].id}–${c.sizes[c.sizes.length - 1].id}</li></ul>
          </div>
        </div>
        <div class="table-scroll"><table aria-label="Tabulka velikostí ${esc(c.name)}">
          <thead><tr><th scope="col">Vel.</th>${cols}</tr></thead>
          <tbody>${row("A", "Šířka", (s) => s.a)}${row("B", "Délka", (s) => s.b)}${row("C", "Rukáv", (s) => s.c)}</tbody>
        </table></div>
        <div class="links">
          ${c.chart ? `<button type="button" data-zoom="${esc(c.chart)}">Nákres měření</button>` : ""}
          ${c.info ? `<button type="button" data-zoom="${esc(c.info)}">Produktový list</button>` : ""}
        </div>
      </article>`;
  }).join("");
  $("cutInfos").addEventListener("click", (e) => {
    const z = e.target.closest("[data-zoom]");
    if (z) openZoom(z.dataset.zoom);
  });
  renderCut();
}

// vykreslí velikosti a tabulku rozměrů pro zvolený střih
function renderCut() {
  const c = currentCut();
  document.querySelectorAll(".cut").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.cut === c.id)));

  $("variants").innerHTML = CONFIG.variants.map((v) => `
    <article class="variant" data-variant="${v.id}">
      <figure data-zoom="${esc(v.img)}"><img src="${esc(v.img)}" alt="Tričko ${esc(v.name)} (${esc(v.print)}) – přední a zadní strana" loading="lazy"></figure>
      <div class="variant-body">
        <h3 class="variant-title"><span class="swatch" style="background:${v.color}"></span>${esc(c.name)} ${esc(v.name)}<small>${esc(v.print)}</small></h3>
        <div class="sizes">
          ${c.sizes.map((s) => `
            <div class="size" data-key="${esc(itemKey(c, v, s))}">
              <button type="button" class="size-label" data-add aria-label="${esc(c.name)} ${esc(v.name)} ${s.id}: přidat kus">${s.id}</button>
              <div class="stepper">
                <button type="button" data-minus aria-label="${esc(c.name)} ${esc(v.name)} ${s.id}: ubrat">−</button>
                <output>0</output>
                <button type="button" data-plus aria-label="${esc(c.name)} ${esc(v.name)} ${s.id}: přidat">+</button>
              </div>
            </div>`).join("")}
        </div>
      </div>
    </article>`).join("");

  document.querySelectorAll(".cut-info").forEach((el) => el.classList.toggle("current", el.dataset.cut === c.id));
  renderItems();
}

function setQty(key, q) {
  q = Math.max(0, Math.min(99, q));
  if (q) state.items[key] = q; else delete state.items[key];
  renderItems();
  persistDraft();
}

function totalPieces(items) { return Object.values(items).reduce((a, b) => a + (Number(b) || 0), 0); }

function renderItems() {
  document.querySelectorAll(".size").forEach((cell) => {
    const q = state.items[cell.dataset.key] || 0;
    cell.querySelector("output").textContent = q;
    cell.classList.toggle("on", q > 0);
  });
  const c = currentCut();
  document.querySelectorAll(".variant").forEach((el) => {
    const v = CONFIG.variants.find((x) => x.id === el.dataset.variant);
    el.classList.toggle("has-items", c.sizes.some((s) => state.items[itemKey(c, v, s)]));
  });
  document.querySelectorAll(".cut").forEach((b) => {
    const cut = CONFIG.cuts.find((x) => x.id === b.dataset.cut);
    const n = sumKeys(state.items, combos().filter((x) => x.c === cut).map((x) => x.key));
    const badge = b.querySelector(".cut-count");
    badge.hidden = !n;
    badge.textContent = `${n} ks`;
  });

  const entries = orderedEntries(state.items);
  const total = totalPieces(state.items);
  $("recap").innerHTML = entries.length
    ? entries.map(([k, q]) => `<div class="recap-row"><span>${esc(k)} × ${q}</span><span>${kc(orderPrice({ [k]: q }))}</span></div>`).join("") +
      `<div class="recap-row recap-total"><span>Celkem ${total} ks</span><span>${kc(orderPrice(state.items))}</span></div>`
    : `<span class="recap-empty">Zatím nemáte vybrané žádné tričko. Nahoře klikněte na velikost.</span>`;
}

// položky v pořadí barev a velikostí z nastavení
function orderedEntries(items) {
  const out = [];
  combos().forEach(({ key }) => { if (Number(items[key])) out.push([key, Number(items[key]) || 0]); });
  Object.keys(items).forEach((k) => { if (!out.some(([x]) => x === k)) out.push([k, Number(items[k]) || 0]); });
  return out;
}

/* ---------- Odeslání objednávky ---------- */

const ERRORS = {
  paid: "Tato objednávka je už zaplacená, proto ji nejde změnit ani zrušit. Kontaktujte nás prosím.",
  closed: "Objednávky jsou už uzavřené, změny nejde uložit.",
  rate_limited: "Příliš mnoho pokusů v krátké době. Zkuste to prosím později nebo nás kontaktujte.",
  bad_items: "Některé vybrané tričko už není v nabídce. Obnovte prosím stránku a vyberte znovu.",
  busy: "Server je právě vytížený, zkuste to prosím za chvíli znovu.",
};

function showClosed() {
  $("closedBanner").hidden = false;
  $("submitBtn").disabled = true;
  $("cancelOrderBtn").hidden = true;
}

function setStatus(el, text, kind) { el.textContent = text; el.className = "status" + (kind ? " " + kind : ""); }

function renderSavedInfo() {
  $("savedInfo").textContent = state.submitted ? `Uloženo ${fmtDate(state.submitted)} – můžete ji kdykoli upravit.` : "";
  $("submitBtn").textContent = state.submitted ? "Uložit změny" : "Odeslat objednávku";
  $("cancelOrderBtn").hidden = !state.submitted;
  $("newOrderBtn").hidden = !state.submitted;
}

// Vyčistí formulář pro další objednávku (předchozí zůstává uložená u nás, jen se už v tomto prohlížeči neupravuje).
$("newOrderBtn").addEventListener("click", () => {
  Object.assign(state, { id: null, submitted: null, items: {}, payment: null });
  ["fFirst", "fLast", "fPhone", "fEmail", "fUnit", "fNote"].forEach((id) => { $(id).value = ""; $(id).removeAttribute("aria-invalid"); });
  $("fConsent").checked = false;
  persistDraft();
  renderItems();
  renderSavedInfo();
  renderPayment();
  setStatus($("formStatus"), "Formulář je prázdný, můžete vyplnit novou objednávku. Předchozí objednávka zůstává uložená.", "ok");
  $("pickTitle").scrollIntoView({ behavior: "smooth" });
});

$("orderForm").addEventListener("input", (e) => {
  if (e.target.getAttribute("aria-invalid") === "true" && e.target.value.trim()) e.target.removeAttribute("aria-invalid");
  persistDraft();
});

$("orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = $("formStatus");
  const first = $("fFirst").value.trim();
  const last = $("fLast").value.trim();
  const name = `${first} ${last}`;
  const phone = $("fPhone").value.trim();
  const email = $("fEmail").value.trim();
  const unit = $("fUnit").value.trim();
  if (!totalPieces(state.items)) return setStatus(status, "Vyberte prosím alespoň jedno tričko (klikněte na velikost).", "err");

  // povinná pole – chybějící zvýrazníme a přejdeme na první z nich
  const phoneOk = phone.replace(/[^\d]/g, "").length >= 9 && /^[+\d\s()-]+$/.test(phone);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const missing = [
    ["fFirst", first, "jméno"],
    ["fLast", last, "příjmení"],
    ["fPhone", phoneOk, phone ? "správné telefonní číslo (aspoň 9 číslic)" : "telefon"],
    ["fEmail", emailOk, email ? "správný e-mail (např. jan.novak@email.cz)" : "e-mail"],
    ["fUnit", unit, "domovský útvar"],
    ["fConsent", $("fConsent").checked, "souhlas se zpracováním údajů (zaškrtněte políčko)"],
  ].filter(([id, ok]) => { $(id).setAttribute("aria-invalid", String(!ok)); return !ok; });
  if (missing.length) {
    $(missing[0][0]).focus();
    const names = missing.map((m) => m[2]);
    const list = names.length > 1 ? names.slice(0, -1).join(", ") + " a " + names[names.length - 1] : names[0];
    return setStatus(status, `Vyplňte prosím ${list}.`, "err");
  }

  const btn = $("submitBtn");
  btn.disabled = true;
  setStatus(status, "Ukládám…");
  if (!state.id) state.id = newId();
  try {
    const res = await api.save({ id: state.id, name, phone, email, unit, note: $("fNote").value.trim(), items: state.items, website: $("fWebsite").value });
    state.submitted = res.updated || new Date().toISOString();
    state.payment = res.payment || null;
    persistDraft();
    renderSavedInfo();
    renderPayment();
    const mailNote = res.emailSent ? ` Potvrzení jsme poslali na ${email}.`
      : !CONFIG.scriptUrl ? " (V ukázkovém režimu se potvrzovací e-mail neposílá.)" : "";
    const payNote = state.payment ? " Níže najdete údaje k platbě." : "";
    const amount = state.payment ? state.payment.amount : orderPrice(state.items);
    setStatus(status, `Hotovo! Objednávka (${totalPieces(state.items)} ks, ${kc(amount)}) je uložená. Děkujeme.${mailNote}${payNote}`, "ok");
  } catch (err) {
    setStatus(status, ERRORS[err.message] || "Objednávku se nepodařilo uložit. Zkontrolujte připojení k internetu a zkuste to znovu.", "err");
    if (err.message === "closed") showClosed();
  } finally {
    btn.disabled = false;
  }
});

$("cancelOrderBtn").addEventListener("click", () => { $("cancelConfirm").hidden = false; $("cancelOrderBtn").hidden = true; });
$("cancelNo").addEventListener("click", () => { $("cancelConfirm").hidden = true; $("cancelOrderBtn").hidden = false; });
$("cancelYes").addEventListener("click", async () => {
  $("cancelConfirm").hidden = true;
  try {
    await api.cancel(state.id);
    state.id = null;
    state.submitted = null;
    state.items = {};
    state.payment = null;
    renderItems();
    persistDraft();
    renderSavedInfo();
    renderPayment();
    setStatus($("formStatus"), "Objednávka byla zrušena.", "ok");
  } catch (err) {
    $("cancelOrderBtn").hidden = false;
    setStatus($("formStatus"), ERRORS[err.message] || "Zrušení se nepodařilo, zkuste to prosím znovu.", "err");
  }
});

/* ---------- Náhled obrázku ---------- */

function openZoom(src) {
  const d = $("zoom");
  d.querySelector("img").src = src;
  d.showModal();
}
$("zoomClose").addEventListener("click", () => $("zoom").close());
$("zoom").addEventListener("click", (e) => { if (e.target === $("zoom")) $("zoom").close(); });

/* ============================================================
   SPRÁVA OBJEDNÁVEK
   ============================================================ */

let adminPass = null;
let adminOrders = [];
let adminFilter = "all";

const framed = (() => { try { return window.top !== window.self; } catch { return true; } })();

function logoutAdmin() {
  adminPass = null;
  adminOrders = [];
  try { sessionStorage.removeItem("gyp-admin"); } catch { /* nic */ }
  $("adminData").hidden = true;
  $("adminLogin").hidden = false;
  $("adminLogout").hidden = true;
  $("adminPass").value = "";
  $("exportText").value = "";
}

function showAdmin(on) {
  if (on && framed) {
    alertFramed();
    return;
  }
  $("admin").hidden = !on;
  $("shop").hidden = on;
  $("adminOpen").hidden = on;
  if (on) {
    try { adminPass = sessionStorage.getItem("gyp-admin") || null; } catch { adminPass = null; }
    if (adminPass) loadOrders(); else $("adminPass").focus();
  }
  window.scrollTo(0, 0);
}
$("adminOpen").addEventListener("click", () => { history.replaceState(null, "", "#sprava"); showAdmin(true); });
$("adminClose").addEventListener("click", () => { history.replaceState(null, "", location.pathname + location.search); showAdmin(false); });

// Správa se nesmí otevřít uvnitř cizí stránky (ochrana proti podvrženému klikání).
function alertFramed() {
  setStatus($("formStatus"), "Správu objednávek otevřete přímo v prohlížeči, ne uvnitř jiné stránky.", "err");
}

$("adminLogout").addEventListener("click", () => {
  logoutAdmin();
  setStatus($("adminStatus"), "Odhlášeno.", "ok");
});

$("adminLogin").addEventListener("submit", (e) => {
  e.preventDefault();
  adminPass = $("adminPass").value;
  loadOrders();
});

async function loadOrders() {
  const status = $("adminStatus");
  setStatus(status, "Načítám objednávky…");
  try {
    adminOrders = await api.list(adminPass);
    try { sessionStorage.setItem("gyp-admin", adminPass); } catch { /* nic */ }
    $("adminLogin").hidden = true;
    $("adminLogout").hidden = false;
    setStatus(status, "");
    renderAdmin();
  } catch (err) {
    adminPass = null;
    try { sessionStorage.removeItem("gyp-admin"); } catch { /* nic */ }
    $("adminLogin").hidden = false;
    $("adminData").hidden = true;
    setStatus(status, {
      bad_password: "Nesprávné heslo.",
      locked: "Příliš mnoho špatných pokusů. Správa je na 15 minut zamčená.",
      default_password: "Ve skriptu Google není nastavené vlastní heslo (ADMIN_PASSWORD, aspoň 8 znaků). Do té doby je správa zablokovaná.",
    }[err.message] || "Objednávky se nepodařilo načíst. Zkuste to znovu.", "err");
  }
}
$("refreshBtn").addEventListener("click", loadOrders);

function sumTotals(orders) {
  const t = {};
  orders.forEach((o) => Object.entries(o.items || {}).forEach(([k, q]) => { t[k] = (t[k] || 0) + Number(q); }));
  return t;
}

function renderAdmin() {
  $("adminData").hidden = false;
  const orders = [...adminOrders].sort((a, b) => String(a.created).localeCompare(String(b.created)));
  const totals = sumTotals(orders);
  const pieces = totalPieces(totals);

  const all = combos();
  $("stats").innerHTML = [
    [orders.length, plural(orders.length, "objednávka", "objednávky", "objednávek")],
    [pieces, plural(pieces, "tričko celkem", "trička celkem", "triček celkem")],
    ...CONFIG.cuts.map((c) => [sumKeys(totals, all.filter((x) => x.c === c).map((x) => x.key)), c.name]),
    ...CONFIG.variants.map((v) => [sumKeys(totals, all.filter((x) => x.v === v).map((x) => x.key)), v.name.toLowerCase()]),
    [kc(orderPrice(totals)), "k vybrání celkem"],
    [kc(orderPrice(sumTotals(orders.filter((o) => o.paid)))), `zaplaceno (${orders.filter((o) => o.paid).length} obj.)`],
    [kc(orderPrice(sumTotals(orders.filter((o) => !o.paid)))), `čeká na platbu (${orders.filter((o) => !o.paid).length} obj.)`],
  ].map(([n, l]) => `<div class="stat"><b>${n}</b><span>${esc(l)}</span></div>`).join("");

  const sizes = allSizes();
  const head = `<thead><tr><th scope="col">Střih a barva</th>${sizes.map((id) => `<th scope="col">${id}</th>`).join("")}<th scope="col">Celkem</th></tr></thead>`;
  const body = CONFIG.cuts.map((c) => `<tr class="cut-row"><th scope="rowgroup" colspan="${sizes.length + 2}">${esc(c.name)}</th></tr>` +
    CONFIG.variants.map((v) => {
      const cells = sizes.map((id) => {
        const s = c.sizes.find((x) => x.id === id);
        if (!s) return `<td class="na">–</td>`;
        const n = totals[itemKey(c, v, s)] || 0;
        return `<td class="${n ? "" : "zero"}">${n}</td>`;
      }).join("");
      const sum = sumKeys(totals, c.sizes.map((s) => itemKey(c, v, s)));
      return `<tr><th scope="row">${esc(v.name)}</th>${cells}<td class="total">${sum}</td></tr>`;
    }).join("")).join("");
  const foot = `<tfoot><tr><th scope="row">Celkem</th>${sizes.map((id) => `<td>${sumKeys(totals, all.filter((x) => x.s.id === id).map((x) => x.key))}</td>`).join("")}<td>${pieces}</td></tr></tfoot>`;
  $("sumTable").innerHTML = head + `<tbody>${body}</tbody>` + foot;

  // rozvoz: kusy podle útvaru (názvy sjednocené bez ohledu na velikost písmen a mezery)
  const units = {};
  orders.forEach((o) => {
    const label = String(o.unit || "neuvedeno").trim().replace(/\s+/g, " ");
    const key = label.toLowerCase();
    units[key] = units[key] || { label, pieces: 0, orders: 0, paid: 0 };
    units[key].pieces += totalPieces(o.items || {});
    units[key].orders += 1;
    if (o.paid) units[key].paid += 1;
  });
  const unitRows = Object.values(units).sort((a, b) => a.label.localeCompare(b.label, "cs"));
  $("unitTable").innerHTML = `<thead><tr><th scope="col">Útvar</th><th scope="col">Objednávek</th><th scope="col">Zaplaceno</th><th scope="col">Kusů</th></tr></thead><tbody>` +
    unitRows.map((u) => `<tr><th scope="row">${esc(u.label)}</th><td>${u.orders}</td><td>${u.paid}</td><td class="total">${u.pieces}</td></tr>`).join("") + `</tbody>`;

  const shown = orders.map((o, i) => [o, i]).filter(([o]) => adminFilter === "all" || (adminFilter === "paid") === !!o.paid);
  document.querySelectorAll("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === adminFilter)));
  $("orders").innerHTML = shown.length ? shown.map(([o, i]) => `
    <div class="order ${o.paid ? "is-paid" : "is-unpaid"}" data-id="${esc(o.id)}">
      <div class="order-head">
        <b>${i + 1}. ${esc(o.name)}</b>
        ${o.vs ? `<span>VS ${esc(o.vs)}</span>` : ""}
        <span class="badge ${o.paid ? "paid" : "unpaid"}">${o.paid ? `Zaplaceno ${fmtDate(o.paid).split(" ").slice(0, 3).join(" ")}` : "Nezaplaceno"}</span>
        <span>${esc(o.phone || o.contact || "")}</span>
        <span>${esc(o.email || "")}</span>
        ${o.unit ? `<span>útvar: ${esc(o.unit)}</span>` : ""}
        <span class="order-price">${kc(orderPrice(o.items || {}))}</span>
        <span>${fmtDate(o.updated || o.created)}</span>
        <span class="del">
          <button type="button" class="btn link" data-del>Smazat</button>
          <span class="confirm" hidden>Smazat objednávku?
            <button type="button" class="btn small" data-del-yes>Ano</button>
            <button type="button" class="btn small" data-del-no>Ne</button>
          </span>
        </span>
      </div>
      <div class="order-items">${orderedEntries(o.items || {}).map(([k, q]) => `${esc(k)} × ${q}`).join(", ")}</div>
      ${o.note ? `<div class="order-note">${esc(o.note)}</div>` : ""}
      <div class="order-actions">
        <button type="button" class="btn small" data-paid="${o.paid ? "0" : "1"}">${o.paid ? "Zrušit označení zaplaceno" : "Označit jako zaplaceno"}</button>
      </div>
    </div>`).join("") : `<p class="note">${orders.length ? "Žádná objednávka v tomto filtru." : "Zatím žádné objednávky."}</p>`;

  $("exportText").value = exportText(orders, totals);
}

document.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => {
  adminFilter = b.dataset.filter;
  renderAdmin();
}));

$("orders").addEventListener("click", async (e) => {
  const order = e.target.closest(".order");
  if (!order) return;
  const confirmEl = order.querySelector(".confirm");
  const delBtn = order.querySelector("[data-del]");
  if (e.target.closest("[data-del]")) { confirmEl.hidden = false; delBtn.hidden = true; }
  if (e.target.closest("[data-del-no]")) { confirmEl.hidden = true; delBtn.hidden = false; }
  const paidBtn = e.target.closest("[data-paid]");
  if (paidBtn) {
    paidBtn.disabled = true;
    try {
      adminOrders = await api.setPaid(adminPass, order.dataset.id, paidBtn.dataset.paid === "1");
      renderAdmin();
    } catch {
      paidBtn.disabled = false;
      setStatus($("adminStatus"), "Změna se nepodařila, zkuste to znovu.", "err");
    }
  }
  if (e.target.closest("[data-del-yes]")) {
    try {
      adminOrders = await api.remove(adminPass, order.dataset.id);
      renderAdmin();
    } catch {
      setStatus($("adminStatus"), "Smazání se nepodařilo.", "err");
    }
  }
});

function exportText(orders, totals) {
  const lines = [`${CONFIG.title.toUpperCase()} – SOUHRN (${new Date().toLocaleDateString("cs-CZ")})`, ""];
  CONFIG.cuts.forEach((c) => CONFIG.variants.forEach((v) => {
    const parts = c.sizes.map((s) => `${s.id}: ${totals[itemKey(c, v, s)] || 0}`);
    const sum = sumKeys(totals, c.sizes.map((s) => itemKey(c, v, s)));
    lines.push(`${c.name} ${v.name} (${v.print}) – ${parts.join(", ")} → celkem ${sum} ks`);
  }));
  lines.push(`Celkem: ${totalPieces(totals)} ks, ${kc(orderPrice(totals))}, ${orders.length} ${plural(orders.length, "objednávka", "objednávky", "objednávek")}`, "", "OBJEDNÁVKY");
  orders.forEach((o, i) => {
    const items = orderedEntries(o.items || {}).map(([k, q]) => `${k} ×${q}`).join(", ");
    const contact = [o.phone || o.contact, o.email, o.unit && `útvar ${o.unit}`].filter(Boolean).join(", ");
    lines.push(`${i + 1}. ${o.vs ? `[VS ${o.vs}] ` : ""}${o.name} (${contact}) – ${items} – ${kc(orderPrice(o.items || {}))} – ${o.paid ? "ZAPLACENO" : "NEZAPLACENO"}${o.note ? ` – ${o.note}` : ""}`);
  });
  return lines.join("\n");
}

$("copyBtn").addEventListener("click", async () => {
  const text = $("exportText").value;
  try {
    await navigator.clipboard.writeText(text);
    setStatus($("copyStatus"), "Zkopírováno.", "ok");
  } catch {
    const ta = $("exportText");
    ta.hidden = false;
    ta.focus();
    ta.select();
    setStatus($("copyStatus"), "Seznam je označený níže – zkopírujte ho (Ctrl+C).", "");
  }
});

$("csvBtn").addEventListener("click", () => {
  const orders = [...adminOrders].sort((a, b) => String(a.created).localeCompare(String(b.created)));
  const keys = combos().map((x) => x.key);
  // text začínající = + - @ by Excel spustil jako vzorec
  const cell = (v) => `"${String(v ?? "").replace(/^[=+\-@]/, "'$&").replace(/"/g, '""')}"`;
  const rows = [["VS", "Jméno", "Telefon", "E-mail", "Útvar", "Poznámka", "Datum", ...keys, "Kusů", "Cena (Kč)", "Zaplaceno"].map(cell).join(";")];
  orders.forEach((o) => rows.push([o.vs, o.name, o.phone || o.contact, o.email, o.unit, o.note, fmtDate(o.updated || o.created),
    ...keys.map((k) => o.items?.[k] || 0), totalPieces(o.items || {}), orderPrice(o.items || {}), o.paid ? fmtDate(o.paid) : "ne"].map(cell).join(";")));
  const totals = sumTotals(orders);
  rows.push(["", "CELKEM", "", "", "", "", "", ...keys.map((k) => totals[k] || 0), totalPieces(totals), orderPrice(totals), ""].map(cell).join(";"));
  const blob = new Blob(["﻿" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `objednavky-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});

/* ---------- Start ---------- */

buildShop();
// V náhledu na claude.ai nejde stahovat soubory – tlačítko CSV tam skryjeme.
if (window.claude) $("csvBtn").hidden = true;
if (saved) {
  $("fFirst").value = saved.first || "";
  $("fLast").value = saved.last || "";
  $("fPhone").value = saved.phone || "";
  $("fEmail").value = saved.email || "";
  $("fUnit").value = saved.unit || "";
  $("fNote").value = saved.note || "";
  $("fConsent").checked = !!saved.consent;
}
renderItems();
renderSavedInfo();
renderPayment();
if (location.hash === "#sprava") showAdmin(true);

// Jsou objednávky otevřené? (nastavuje se ve skriptu Google)
if (CONFIG.scriptUrl) {
  fetch(CONFIG.scriptUrl).then((r) => r.json()).then((d) => { if (d && d.open === false) showClosed(); }).catch(() => {});
}
