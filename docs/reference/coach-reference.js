
const REVIEW_BELOW = 0.3;
const CUE_GAP = 3;
const FAMILY = {
  "open question": "q", "closed question": "q",
  "simple reflection": "r", "complex reflection": "r",
  "affirm": "s", "seek collaboration": "s", "emphasize autonomy": "s", "ask permission": "s",
  "give information": "i", "persuade": "x", "confront": "x", "other": "o",
};
const FLAG_TEXT = {
  medical: ["red", "Medical concern: tell the care team today"],
  distress: ["red", "Emotional distress: check in and connect to support today"],
  social: ["red", "Unmet basic need: connect to a navigator today"],
  dropout: ["amber", "Dropout risk: participant may leave the program"],
  missed_concern: ["amber", "Coach did not route a concern the participant raised"],
  medical_advice: ["amber", "Coach gave medical advice outside their role"],
};

const $ = (id) => document.getElementById(id);
let lines = [];
let mode = "replay";
let session = 0;
let lastCueAt = -99;
const lat = { clef: [], glm: [] };

async function api(path, body) {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function chipFor(tag, speaker) {
  const cls = speaker === "coach" ? (FAMILY[tag] || "o") : tag;
  return `<span class="chip ${cls}">${esc(tag)}</span>`;
}

function render(l) {
  const conf = l.confidence == null ? "" : `<span class="meta">${Math.round(l.confidence * 100)}%</span>`;
  const tag = l.tag ? chipFor(l.tag, l.speaker) : `<span class="chip pending">tagging…</span>`;
  const glm = l.reviewing ? `<span class="glm">GLM reviewing…</span>`
    : l.reviewed ? `<span class="glm" title="${esc(l.reason || "")}">${l.reviewed === l.clefTag ? "GLM agrees" : `GLM changed from ${esc(l.clefTag)}`}</span>` : "";
  const flag = l.flag && l.flag !== "none" ? `<span class="chip flag ${(FLAG_TEXT[l.flag] || ["red"])[0]}">${esc(l.flag.replace("_", " "))}</span>` : "";
  const gold = l.gold && l.tag && $("showGold").checked && mode === "replay"
    ? `<span class="gold ${l.gold === l.tag ? "ok" : "no"}">${l.gold === l.tag ? "✓ expert" : "expert: " + esc(l.gold)}</span>` : "";
  l.el.className = `ln ${l.speaker}${flag ? " flagged" : ""}`;
  l.el.innerHTML = `<div class="who">${l.speaker === "coach" ? "Coach" : "Participant"}</div>
    <div><div class="bubble">${esc(l.text)}</div><div class="tags">${tag}${conf}${flag}${glm}${gold}</div></div>`;
}

async function addLine(speaker, text, gold) {
  const mine = session;
  const prev = lines.slice(-2).map(({ speaker, text, flag }) => ({ speaker, text, flag: flag || undefined }));
  const l = { speaker, text, gold, el: document.createElement("div") };
  lines.push(l);
  render(l);
  $("transcript").appendChild(l.el);
  $("transcript").scrollTop = $("transcript").scrollHeight;
  const t0 = performance.now();
  const r = await api("/api/turn", { line: { speaker, text }, previous: prev });
  if (mine !== session) return;
  lat.clef.push(performance.now() - t0);
  Object.assign(l, { tag: r.tag, clefTag: r.tag, confidence: r.confidence, flag: r.flag });
  render(l);
  if (l.flag && l.flag !== "none") showBanner(l);
  updateScore();
  checkTriggers(lines.indexOf(l));
  showLatency();
  if (r.confidence != null && r.confidence < REVIEW_BELOW) {
    l.reviewing = true; render(l);
    const g0 = performance.now();
    const v = await api("/api/review", { line: { speaker, text }, previous: prev, probabilities: r.probabilities });
    if (mine !== session) return;
    lat.glm.push(performance.now() - g0);
    l.reviewing = false;
    if (v.label) { l.reviewed = v.label; l.reason = v.reason; l.tag = v.label; }
    render(l);
    updateScore();
    showLatency();
  }
}

function showLatency() {
  const med = (a) => a.length ? Math.round([...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]) + " ms" : "–";
  $("lat").textContent = `Clef median ${med(lat.clef)} · GLM review median ${med(lat.glm)} (${lat.glm.length} of ${lat.clef.length} lines reviewed)`;
}

function showBanner(l) {
  const [level, text] = FLAG_TEXT[l.flag] || ["red", "Needs attention"];
  const b = document.createElement("div");
  b.className = `banner ${level}`;
  b.setAttribute("role", "alert");
  b.innerHTML = `<span>⚠ ${esc(text)} <small>“${esc(l.text.slice(0, 120))}”</small></span><button>Dismiss</button>`;
  b.querySelector("button").onclick = () => b.remove();
  $("banners").prepend(b);
  while ($("banners").children.length > 3) $("banners").lastChild.remove();
}

function updateScore() {
  const c = lines.filter((l) => l.speaker === "coach" && l.tag).map((l) => l.tag);
  const p = lines.filter((l) => l.speaker === "participant" && l.tag).map((l) => l.tag);
  const n = (t) => c.filter((x) => x === t).length;
  const oq = n("open question"), cq = n("closed question"), sr = n("simple reflection"), cr = n("complex reflection");
  const ad = n("affirm") + n("seek collaboration") + n("emphasize autonomy") + n("ask permission");
  const na = n("persuade") + n("confront");
  const q = oq + cq, r = sr + cr;
  const ch = p.filter((x) => x === "change").length, su = p.filter((x) => x === "sustain").length;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "–");
  $("mOQ").textContent = pct(oq, q);
  $("mRQ").textContent = q ? (r / q).toFixed(1) : "–";
  $("mCR").textContent = pct(cr, r);
  $("mAD").textContent = ad;
  $("mNA").textContent = na;
  $("mCT").textContent = pct(ch, ch + su);
  if (c.length < 4) return;
  // MITI-style targets: 2 reflections per question, 40% complex reflections, 50% open questions;
  // persuading or confronting costs points.
  const s = 30 * Math.min((q ? r / q : r ? 2 : 0) / 2, 1) + 20 * Math.min((r ? cr / r : 0) / 0.4, 1)
    + 20 * Math.min((q ? oq / q : 0) / 0.5, 1) + 30 * (ad + na ? ad / (ad + na) : 1);
  $("score").textContent = Math.round(s);
  $("scoreBar").style.width = Math.round(s) + "%";
  $("scoreBar").style.background = s >= 70 ? "var(--good)" : s >= 50 ? "var(--warn)" : "var(--bad)";
}

function checkTriggers(i) {
  const l = lines[i];
  let trigger = null;
  if (l.flag === "missed_concern") trigger = "The participant raised a concern and the coach moved on without routing it. Help the coach go back to it now.";
  else if (l.flag === "medical_advice") trigger = "The coach just gave medical advice outside their role. Help the coach walk it back and refer to the care team.";
  else if (l.flag === "dropout") trigger = "The participant is talking about leaving the program. Help the coach explore it without pressure.";
  else if (l.flag && l.flag !== "none") trigger = `Participant raised a ${l.flag} concern. Help the coach respond with care and connect them to the right person today.`;
  else if (l.speaker === "coach") {
    const coach = lines.slice(0, i + 1).filter((x) => x.speaker === "coach" && x.tag);
    const last = coach.slice(-4).map((x) => x.tag);
    const before = lines[i - 1];
    if (l.tag === "confront") trigger = "The coach just confronted the participant.";
    else if (l.tag === "persuade" && !coach.slice(-3, -1).some((x) => x.tag === "ask permission")) trigger = "The coach just told the participant what to do without asking permission.";
    else if (before && before.speaker === "participant" && before.tag === "change" && FAMILY[l.tag] !== "r" && l.tag !== "affirm") trigger = "The participant voiced change talk and the coach did not reflect or affirm it.";
    else if (last.length === 4 && last.every((t) => FAMILY[t] === "q")) trigger = "The coach has asked four questions in a row without a reflection.";
    else if (last.length >= 3 && last.slice(-3).every((t) => t === "closed question")) trigger = "Three closed questions in a row.";
    if (trigger && lines.filter((x) => x.speaker === "coach").length - lastCueAt < CUE_GAP) trigger = null;
  }
  if (!trigger) return;
  lastCueAt = lines.filter((x) => x.speaker === "coach").length;
  const mine = session;
  const recent = lines.slice(Math.max(0, i - 7), i + 1).map(({ speaker, text, tag }) => ({ speaker, text, tag }));
  api("/api/cue", { trigger, recent }).then((c) => {
    if (mine !== session || !c.cue) return;
    const box = $("cues");
    box.querySelector(".empty")?.remove();
    const d = document.createElement("div");
    d.className = "cue";
    d.innerHTML = `<div class="why">${esc(trigger)}</div><b>${esc(c.cue)}</b>${c.say ? `<q>${esc(c.say)}</q>` : ""}`;
    box.prepend(d);
    while (box.children.length > 4) box.lastChild.remove();
  });
}

function reset() {
  session++;
  lines = []; lastCueAt = -99;
  $("transcript").innerHTML = "";
  $("cues").innerHTML = `<div class="empty">Quiet. Cues appear only when the coach needs one.</div>`;
  $("banners").innerHTML = "";
  for (const id of ["mOQ", "mRQ", "mCR", "mAD", "mNA", "mCT", "score"]) $(id).textContent = "–";
  $("scoreBar").style.width = "0";
}

document.querySelectorAll(".tabs button").forEach((b) => b.onclick = () => {
  stopAll();
  mode = b.dataset.mode;
  document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll("[data-for]").forEach((c) => c.hidden = c.dataset.for !== mode);
  reset();
});

let calls = [];
let playing = false;
fetch("/demo-calls.json").then((r) => r.json()).then((d) => {
  calls = d.calls;
  $("callPick").innerHTML = calls.map((c, i) =>
    `<option value="${i}">${c.demo_tag === "safety" ? "⚠ " : c.demo_tag === "rough coach" ? "△ " : ""}${esc(c.call_id)} · ${esc(c.language)} · ${esc(c.goal_topic)} · ${esc(c.demo_tag)}</option>`).join("");
});
$("play").onclick = async () => {
  if (playing) return stopAll();
  reset();
  playing = true; $("play").textContent = "Stop";
  const mine = session;
  const call = calls[+$("callPick").value];
  for (const ln of call.lines) {
    if (!playing || mine !== session) break;
    addLine(ln.speaker, ln.text, ln.speaker === "coach" ? ln.coach_move : ln.participant_talk);
    await new Promise((r) => setTimeout(r, +$("speed").value));
  }
  if (mine === session) { playing = false; $("play").textContent = "Play"; }
};
$("showGold").onchange = () => lines.forEach(render);

function setSeg(id, s) { document.querySelectorAll(`#${id} button`).forEach((b) => b.classList.toggle("on", b.dataset.s === s)); }
function segment(id, cb) {
  document.querySelectorAll(`#${id} button`).forEach((b) => b.onclick = () => { setSeg(id, b.dataset.s); cb(b.dataset.s); });
}

let typeSpeaker = "coach";
segment("typeSpeaker", (s) => typeSpeaker = s);
const sendTyped = () => {
  const t = $("typeText").value.trim();
  if (!t) return;
  addLine(typeSpeaker, t);
  $("typeText").value = "";
  typeSpeaker = typeSpeaker === "coach" ? "participant" : "coach";
  setSeg("typeSpeaker", typeSpeaker);
};
$("send").onclick = sendTyped;
$("typeText").onkeydown = (e) => { if (e.key === "Enter") sendTyped(); };

// Live mic uses the browser's speech recognition: Apple's engine in Safari.
let liveSpeaker = "coach";
let rec = null;
let interim = null;
segment("liveSpeaker", (s) => liveSpeaker = s);
document.addEventListener("keydown", (e) => {
  if (mode !== "live" || e.code !== "Space" || e.target.tagName === "INPUT") return;
  e.preventDefault();
  liveSpeaker = liveSpeaker === "coach" ? "participant" : "coach";
  setSeg("liveSpeaker", liveSpeaker);
});
$("mic").onclick = () => {
  if (rec) return stopAll();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("This browser has no speech recognition. Use Safari or Chrome, or the Type tab."); return; }
  rec = new SR();
  rec.lang = $("lang").value;
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (e) => {
    for (let k = e.resultIndex; k < e.results.length; k++) {
      const res = e.results[k];
      const text = res[0].transcript.trim();
      if (res.isFinal) {
        interim?.remove(); interim = null;
        if (text) addLine(liveSpeaker, text);
      } else {
        if (!interim) { interim = document.createElement("div"); $("transcript").appendChild(interim); }
        interim.className = `ln ${liveSpeaker} interim`;
        interim.innerHTML = `<div class="who">${liveSpeaker === "coach" ? "Coach" : "Participant"}</div><div class="bubble">${esc(text)}</div>`;
        $("transcript").scrollTop = $("transcript").scrollHeight;
      }
    }
  };
  rec.onend = () => { if (rec) rec.start(); };
  rec.start();
  $("mic").textContent = "Stop mic"; $("mic").classList.add("rec");
};

function stopAll() {
  playing = false; $("play").textContent = "Play";
  if (rec) { const r = rec; rec = null; r.onend = null; r.stop(); }
  $("mic").textContent = "Start mic"; $("mic").classList.remove("rec");
}

