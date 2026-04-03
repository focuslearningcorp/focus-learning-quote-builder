import React, { useState, useMemo } from "react";

// ── CONFIG ─────────────────────────────────────────────────
const VC_DM_TOTAL = 73.36 + 106.71;
const VC = {
  dmVdm: 73.36, dmVls: 106.71,
  sharedHostingYr: 3686.44, perUserHostingYr: 571.20,
  tierMargins: {
    Essential:        { dm: 0.80, hosting: 0.50 },
    "Essential Plus": { dm: 0.80, hosting: 0.50 },
    Enhanced:         { dm: 0.70, hosting: 0.55 },
    Enterprise:       { dm: 0.90, hosting: 0.55 },
  },
  upgradeAddOns: { MMS: 35000, "Self-Managed": 17500, "In-Place": 10000 },
  discountGuardrails: {
    Essential:        { suggested: 10, approval: 15, max: 25 },
    "Essential Plus": { suggested: 10, approval: 15, max: 25 },
    Enhanced:         { suggested: 10, approval: 15, max: 25 },
    Enterprise:       { suggested: 15, approval: 20, max: 30 },
  },
  seatLimits: {
    Essential: { vdm: 10 }, "Essential Plus": { vdm: 10 },
    Enhanced:  { vdm: 35 }, Enterprise:       { vdm: Infinity },
  },
  services: [
    { id:"clearpath",    name:"ClearPATH Onboarding (40 hrs)",             hours:40,  cost:2590,  list:7409,  auto:["Essential"],                      avail:["Essential Plus"] },
    { id:"training",     name:"Basic Training (remote/virtual included)",   hours:8,   cost:518,   list:2480,  auto:["Essential","Enhanced","Enterprise"], avail:["Essential Plus"] },
    { id:"cbt",          name:"Train-the-Trainer CBT Library (INPO 2.0)",   hours:0,   cost:0,     list:8000,  auto:["Essential","Enhanced","Enterprise"], avail:["Essential Plus"] },
    { id:"sharedTam",    name:"Shared Technical Account Manager",           hours:36,  cost:2331,  list:6668,  auto:["Essential"],                      avail:["Essential Plus"] },
    { id:"dedicatedTam", name:"Dedicated Technical Account Manager",        hours:200, cost:12950, list:38000, auto:["Enhanced","Enterprise"],          avail:[] },
    { id:"addlSvc",      name:"Additional Scoped Services",                 hours:90,  cost:5828,  list:16671, auto:["Enterprise"],                     avail:[] },
  ],
  extras: [
    { id:"xReformat",  name:"Reformatting Instructor Materials (5 sets/yr)" },
    { id:"xJobAid",    name:"Adding/Modifying Job Aids (10/yr)" },
    { id:"xOJT",       name:"OJT Guide & Task Qualification Sheets (15 guides/yr)" },
    { id:"xSelfStudy", name:"Self-Study Guide Development (2/yr, SCORM)" },
  ],
};
const QC = {
  tiers: {
    Essential:        { sw: 34816,  adminLim: 5,    empLim: 10   },
    "Essential Plus": { sw: 34816,  adminLim: 5,    empLim: 10   },
    Enhanced:         { sw: 63768,  adminLim: 20,   empLim: 50   },
    Enterprise:       { sw: 105229, adminLim: null, empLim: null },
  },
  itAddOns: { onPrem: 15000, managedIT: 7000 },
  dmCost: 6959,
  discountGuardrails: {
    Essential:        { suggested: 10, approval: 15, max: 25 },
    "Essential Plus": { suggested: 10, approval: 15, max: 25 },
    Enhanced:         { suggested: 10, approval: 15, max: 25 },
    Enterprise:       { suggested: 15, approval: 20, max: 30 },
  },
  services: [
    { id:"qtdTrain",   name:"QTD Training (Virtual or In-Person)",         cost:518,   list:1481.84,  auto:["Essential","Enhanced","Enterprise"], avail:["Essential Plus"] },
    { id:"content",    name:"Training Content Library – 10 credits",       cost:0,     list:3056.29,  auto:["Essential","Enhanced","Enterprise"], avail:["Essential Plus"] },
    { id:"coaching",   name:"Best-Practice Coaching (2 hrs/mo avg)",       cost:1332,  list:4445.52,  auto:["Essential","Enhanced","Enterprise"], avail:["Essential Plus"] },
    { id:"reports",    name:"Report Building & Customization",              cost:518,   list:1481.84,  auto:["Essential","Enhanced","Enterprise"], avail:["Essential Plus"] },
    { id:"per005",     name:"PER-005 Compliance Support – 2 positions",    cost:5260,  list:17041.15, auto:["Enhanced","Enterprise"],             avail:["Essential Plus"] },
    { id:"trainAdmin", name:"Training Admin Support – up to 20 employees", cost:10742, list:34823.22, auto:["Enterprise"],                        avail:[] },
  ],
  pickOne: [
    { id:"reformat",  name:"Reformatting of Instructor Materials (5 sets/yr)",        cost:5140, list:16671 },
    { id:"jobAids",   name:"Adding/Modifying Job Aids (10 job aids/yr)",               cost:5140, list:16671 },
    { id:"ojtGuide",  name:"OJT Guide & Task Qualification Sheet Dev (15 guides/yr)", cost:5140, list:16671 },
    { id:"selfStudy", name:"Self-Study Guide Dev (2 guides/yr – SCORM wrapped)",      cost:5140, list:16671 },
    { id:"nercEval",  name:"Mock NERC Evaluation / Coaching Prep (PER standards)",    cost:913,  list:16671 },
    { id:"trnPolicy", name:"Training Policy, Procedures & Internal Controls Dev",     cost:1985, list:16671 },
  ],
};
const DEAL_TYPES = ["New in existing market", "New market", "Renewal", "Expansion"];

// ── HELPERS ────────────────────────────────────────────────
const fmt = n => "$" + Math.round(n).toLocaleString();
const pct = n => (n * 100).toFixed(1) + "%";

function vSvcs(bundle) {
  return {
    auto:     VC.services.filter(s => s.auto.includes(bundle)),
    optional: VC.services.filter(s => s.avail.includes(bundle)),
    extras:   bundle === "Enterprise" ? VC.extras : [],
  };
}
function calcV(bundle, seats, onPrem, upType, optSvcs, extraP, discPct) {
  if (!bundle || bundle === "None" || bundle === "Legacy") return null;
  const m = VC.tierMargins[bundle] || VC.tierMargins.Essential;
  const n = Math.max(1, seats);
  const dmCost = VC_DM_TOTAL * n;
  const hostRaw = VC.sharedHostingYr + VC.perUserHostingYr * n;
  const hostCost = onPrem ? 0 : hostRaw;
  const floor = dmCost + hostCost;
  const dmList = dmCost / (1 - m.dm);
  const hostList = hostRaw / (1 - m.hosting);
  const addon = onPrem ? (VC.upgradeAddOns[upType] || 0) : 0;
  const sw = dmList + hostList + addon;
  const { auto } = vSvcs(bundle);
  const autoSvc = auto.reduce((s, v) => s + v.list, 0);
  const optSvc = optSvcs.reduce((s, v) => s + v.list, 0);
  const svc = autoSvc + optSvc + (extraP || 0);
  const svcCost = auto.reduce((s, v) => s + v.cost, 0) + optSvcs.reduce((s, v) => s + v.cost, 0) + (extraP || 0) * 0.3;
  const list = sw + svc, totalCost = floor + svcCost;
  const discAmt = list * (discPct || 0), final = list - discAmt;
  return { n, m, dmCost, hostCost, floor, dmList, hostList, addon, sw, svc, svcCost,
    list, totalCost, discAmt, final,
    swMgn: sw > 0 ? (sw - floor) / sw : 0,
    blendMgn: final > 0 ? (final - totalCost) / final : 0,
    belowFloor: final < floor };
}
function calcVLeg(onPrem, upType, seats) {
  const n = Math.max(1, seats), dm = VC_DM_TOTAL * n;
  const hostRaw = VC.sharedHostingYr + VC.perUserHostingYr * n;
  const host = onPrem ? 0 : hostRaw, m = VC.tierMargins.Enterprise;
  const dmL = dm / (1 - m.dm), hL = hostRaw / (1 - m.hosting);
  const addon = onPrem ? (VC.upgradeAddOns[upType] || 0) : 0;
  const seg = onPrem ? ("Self-Managed" === upType ? "On-Prem · Self-Managed" : "In-Place" === upType ? "On-Prem · In-Place" : "On-Prem · MMS") : "Hosted";
  return { floor: dm + host, impliedList: dmL + hL, addon, totalList: dmL + hL + addon, seg, dm, host, dmL, hL };
}
function qSvcs(bundle) {
  if (!bundle || bundle === "None" || bundle === "Legacy") return { auto: [], optional: [], pickOne: false };
  return {
    auto:     QC.services.filter(s => s.auto.includes(bundle)),
    optional: QC.services.filter(s => s.avail.includes(bundle)),
    pickOne:  bundle === "Enterprise",
  };
}
function calcQ(bundle, onPrem, managedIT, optIds, pickId, discPct) {
  const tier = QC.tiers[bundle]; if (!tier) return null;
  const it = (onPrem ? QC.itAddOns.onPrem : 0) + (managedIT ? QC.itAddOns.managedIT : 0);
  const sw = tier.sw + it;
  const { auto, optional, pickOne } = qSvcs(bundle);
  const optSel = optional.filter(s => optIds.includes(s.id));
  const pick = pickOne ? (QC.pickOne.find(p => p.id === pickId) || QC.pickOne[0]) : null;
  const svc = auto.reduce((s, v) => s + v.list, 0) + optSel.reduce((s, v) => s + v.list, 0) + (pick ? pick.list : 0);
  const svcCost = auto.reduce((s, v) => s + v.cost, 0) + optSel.reduce((s, v) => s + v.cost, 0) + (pick ? pick.cost : 0);
  const list = sw + svc, floor = QC.dmCost + svcCost;
  const discAmt = list * (discPct || 0), final = list - discAmt;
  return { swBase: tier.sw, it, sw, svc, svcCost, list, floor, discAmt, final,
    swMgn: sw > 0 ? (sw - QC.dmCost) / sw : 0,
    blendMgn: final > 0 ? (final - floor) / final : 0,
    belowFloor: final < floor };
}
function buildStairs(sw, svc, numYrs, yoy, otArr, discPct, costFloor) {
  const dp = discPct || 0;
  const rows = [];
  let swBase = sw, svcBase = svc;
  for (let i = 0; i < numYrs; i++) {
    const swYr  = i === 0 ? sw  * (1 - dp) : swBase;
    const svcYr = i === 0 ? svc * (1 - dp) : svcBase;
    const ot = parseFloat((otArr && otArr[i]) || 0) || 0;
    const recurring = swYr + svcYr;
    const total = recurring + ot;
    const margin = total > 0 && costFloor > 0 ? (total - costFloor) / total : 0;
    rows.push({ yr: "Year " + (i + 1), sw: Math.round(swYr), svc: Math.round(svcYr), ot: Math.round(ot), recurring: Math.round(recurring), total: Math.round(total), margin });
    if (i < numYrs - 1) {
      const r = 1 + ((yoy[i] !== undefined ? yoy[i] : 8)) / 100;
      swBase  = (i === 0 ? sw  : swBase)  * r;
      svcBase = (i === 0 ? svc : svcBase) * r;
    }
  }
  return rows;
}
function buildDealName(year, dealType, client, bundle, isOutYear, multiYearStart, multiYearEnd) {
  const name = client || "(Client Name)";
  const suffix = bundle && bundle !== "None" && bundle !== "Legacy" ? " – " + bundle : "";
  if (isOutYear) return "[" + year + " Renewal] [Multi-year " + multiYearStart + "–" + multiYearEnd + "] " + name + suffix;
  return "[" + year + " " + (dealType || "New in existing market") + "] " + name + suffix;
}
function dlCSV(rows, name) {
  const esc = v => String(v ?? "").replace(/"/g, "");
  const csv = rows.filter(Boolean).map(r => r.map(esc).map(c => '"' + c + '"').join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name; a.click();
}

// ── CSS ───────────────────────────────────────────────────
const SHARED_CSS = `
  *{box-sizing:border-box}
  body{background:#f0f4f8}
  input,select{font-family:'Archivo',Arial,sans-serif;font-size:16px;border:1.5px solid #c8d6e5;border-radius:6px;padding:9px 12px;color:#10285A;transition:border-color .2s;width:100%;background:white}
  input:focus,select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accentSoft)}
  select{background:white;cursor:pointer}
  textarea{font-family:'Archivo',Arial,sans-serif;font-size:15px;border:1.5px solid #c8d6e5;border-radius:6px;padding:10px;color:#10285A;width:100%;resize:vertical}
  .card{background:white;border-radius:10px;padding:20px 24px;margin-bottom:14px;border:1px solid #e8ecf1}
  .sec-title{font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--mid);margin-bottom:14px}
  .row{display:flex;gap:14px;margin-bottom:12px;flex-wrap:wrap}
  .field{display:flex;flex-direction:column;gap:4px;flex:1;min-width:130px}
  .field label{font-size:14px;font-weight:600;color:#5a6f87}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700}
  .badge-g{background:#e6faf5;color:#0a7c5f}
  .badge-y{background:#fef9e7;color:#9a7b0a}
  .badge-r{background:#fde8e8;color:#c0392b}
  .svc-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f0f3f6;font-size:15px}
  .svc-row:last-child{border-bottom:none}
  .chk{width:18px;height:18px;border-radius:4px;border:2px solid #c8d6e5;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .chk.on{background:var(--accent);border-color:var(--accent)}
  .chk.auto{background:#10285A;border-color:#10285A}
  .dl{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f3f6;font-size:16px}
  .dl:last-child{border-bottom:none}
  .dl-total{font-weight:700;font-size:18px;border-top:2px solid #10285A;padding-top:12px;margin-top:4px;border-bottom:none;display:flex;justify-content:space-between}
  .admin-box{background:#f8f9fb;border-radius:8px;padding:14px 16px;margin-top:12px;border:1px dashed #c8d6e5}
  .admin-box h4{font-size:13px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--mid);margin:0 0 8px}
  .admin-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#5a6f87}
  .admin-row .val{font-weight:600;color:#10285A}
  .mgn-bar{height:8px;background:#e8ecf1;border-radius:4px;overflow:hidden;margin-top:4px}
  .mgn-fill{height:100%;border-radius:4px;transition:width .4s ease}
  .po-opt{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;cursor:pointer;border:1.5px solid #e4eaf2;margin-bottom:6px}
  .po-opt:hover{border-color:var(--accent)}
  .po-opt.sel{border-color:#10285A;background:#eef2fa}
  .radio{width:16px;height:16px;border-radius:50%;border:2px solid #c8d6e5;flex-shrink:0;display:flex;align-items:center;justify-content:center}
  .po-opt.sel .radio{border-color:#10285A;background:#10285A}
  .radio-dot{width:6px;height:6px;border-radius:50%;background:white}
  .stairs{width:100%;border-collapse:collapse;font-size:14px;margin-top:8px}
  .stairs th{text-align:right;padding:8px 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#5a6f87;border-bottom:2px solid #10285A}
  .stairs th:first-child{text-align:left}
  .stairs td{padding:9px 10px;text-align:right;border-bottom:1px solid #f0f3f6}
  .stairs td:first-child{text-align:left;font-weight:600}
  .stairs tr:nth-child(even) td{background:#f8f9fb}
  .stairs .tcv-row td{border-top:2px solid #10285A;border-bottom:1px solid #d0d8e8;background:#f0f6fb;font-weight:700}
  .stairs .ot-row td{border-bottom:2px solid #10285A;background:#f0f6fb;font-weight:700;font-size:15px}
  .disc-box{background:#f8f9fb;border-radius:8px;padding:12px 16px;margin:10px 0}
  .inp-wrap{position:relative;display:inline-block}
  .inp-wrap input{padding-right:30px}
  .inp-suffix{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:14px;color:#5a6f87;pointer-events:none}
  .ot-grid{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}
  .ot-year{display:flex;flex-direction:column;gap:4px;align-items:center}
  .ot-year label{font-size:13px;font-weight:600;color:#5a6f87}
`;

// ── PURE COMPONENTS (defined OUTSIDE QuoteBuilder to avoid remount on re-render)
// Chk icon
function Chk() {
  return React.createElement("svg", { width:12, height:12, viewBox:"0 0 12 12" },
    React.createElement("path", { d:"M2 6l3 3 5-5", stroke:"white", strokeWidth:2, fill:"none" }));
}

// Discount block — receives accent color as prop so it's fully self-contained
function DiscBlock({ disc, setDisc, deal, guardrails, accentColor }) {
  const g = guardrails;
  const o1 = disc > g.suggested && disc <= g.approval;
  const o2 = disc > g.approval  && disc <= g.max;
  const o3 = disc > g.max;
  return (
    <div className="disc-box">
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div className="field" style={{ maxWidth:160, marginBottom:0 }}>
          <label>Discount</label>
          <div className="inp-wrap" style={{ width:160 }}>
            <input type="number" min={0} max={60} step={1} value={disc}
              onChange={e => setDisc(Math.max(0, Math.min(60, parseFloat(e.target.value)||0)))}
              style={{ borderColor: o2||o3 ? "#e74c3c" : o1 ? "#f0c36d" : "#c8d6e5" }} />
            <span className="inp-suffix">%</span>
          </div>
        </div>
        {disc > 0 && deal && <div style={{ fontSize:15, color:"#5a6f87", paddingTop:22 }}>{"−"}{fmt(deal.discAmt)}</div>}
      </div>
      <div style={{ fontSize:14, color:"#5a6f87", marginTop:6 }}>
        You may discount this deal — all deals must maintain a minimum 76% blended margin.
      </div>
      {o1 && <div style={{ background:"#fef9e7", border:"1px solid #f0c36d", borderRadius:6, padding:"7px 12px", fontSize:14, color:"#7d6608", marginTop:6 }}>⚠️ Above standard range ({g.suggested}%). Document business justification.</div>}
      {o2 && <div style={{ background:"#fde8e8", border:"1px solid #e6a1a1", borderRadius:6, padding:"7px 12px", fontSize:14, color:"#922", marginTop:6 }}>🔴 Above {g.approval}% — requires Sales Leadership sign-off before quoting.</div>}
      {o3 && <div style={{ background:"#fde8e8", border:"1px solid #c0392b", borderRadius:6, padding:"7px 12px", fontSize:14, color:"#c0392b", fontWeight:600, marginTop:6 }}>🚫 Above maximum ({g.max}%). Not authorized — contact VP of Sales.</div>}
    </div>
  );
}

// Price footer
function PriceFooter({ deal, isVision, accentColor }) {
  const m = deal.blendMgn;
  const b76 = m > 0 && m < 0.76;
  const swThresh = isVision ? 0.6 : 0.7;
  return (
    <div style={{ marginTop:4 }}>
      <div className="dl-total"><span>Total</span><span style={{ fontSize:22 }}>{fmt(deal.final)}</span></div>
      <div style={{ fontSize:13, color:"#5a6f87", marginTop:8, fontStyle:"italic" }}>
        *New logo pricing; discount to 76% margin floor permitted to minimize price increase at renewal.
      </div>
      <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
        <span className={"badge " + (deal.swMgn >= swThresh ? "badge-g" : deal.swMgn >= .4 ? "badge-y" : "badge-r")}>SW: {pct(deal.swMgn)}</span>
        <span className={"badge " + (m >= .76 ? "badge-g" : m >= .55 ? "badge-y" : "badge-r")}>Blended: {pct(m)}</span>
        {deal.belowFloor && <span className="badge badge-r">⚠️ Below cost floor</span>}
        {b76 && <span className="badge badge-r">⚠️ Below 76% floor</span>}
      </div>
      <div style={{ marginTop:10 }}>
        <div style={{ fontSize:13, color:"#5a6f87", marginBottom:2 }}>Blended Margin</div>
        <div className="mgn-bar"><div className="mgn-fill" style={{ width:Math.min(100,Math.max(0,m*100))+"%", background:m>=.76?accentColor:m>=.55?"#f0c36d":"#e74c3c" }} /></div>
      </div>
      {b76 && <div style={{ background:"#fde8e8", border:"1px solid #c0392b", borderRadius:6, padding:"9px 12px", fontSize:14, color:"#c0392b", fontWeight:600, marginTop:10 }}>🚫 Blended margin ({pct(m)}) is below the 76% minimum. Adjust discount or escalate to Sales Leadership.</div>}
      <div style={{ background:"#FFF3E0", border:"1px solid #ED7D2F", borderRadius:6, padding:"9px 12px", marginTop:10, fontSize:13, color:"#10285A" }}>
        ⚠️ Present as a <strong>single line item</strong> to the customer. SW/Services split is for HubSpot entry only.
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────
export default function QuoteBuilder() {
  // Shared
  const [product,   setProduct]   = useState("VISION");
  const [admin,     setAdmin]     = useState(false);
  const [client,    setClient]    = useState("");
  const [owner,     setOwner]     = useState("");
  const [dealType,  setDealType]  = useState("New in existing market");

  // VISION
  const [vBundle,   setVBundle]   = useState("Essential");
  const [vSeats,    setVSeats]    = useState(10);
  const [vStudents, setVStudents] = useState(50);
  const [vOnPrem,   setVOnPrem]   = useState(false);
  const [vUpType,   setVUpType]   = useState("MMS");
  const [vOptTog,   setVOptTog]   = useState({});
  const [vExtraP,   setVExtraP]   = useState("");
  const [vAeOvr,    setVAeOvr]    = useState("");
  const [vDisc,     setVDisc]     = useState(0);
  const [vNumYrs,   setVNumYrs]   = useState(1);
  const [vYoy,      setVYoy]      = useState([8, 8, 8, 8]);
  const [vOT,       setVOT]       = useState(["", "", "", "", ""]);

  // Qlarity
  const [qBundle,   setQBundle]   = useState("Essential");
  const [qAdmin,    setQAdmin]    = useState(3);
  const [qEmp,      setQEmp]      = useState(10);
  const [qOnPrem,   setQOnPrem]   = useState(false);
  const [qMgdIT,    setQMgdIT]    = useState(false);
  const [qOptIds,   setQOptIds]   = useState([]);
  const [qPickId,   setQPickId]   = useState(QC.pickOne[0].id);
  const [qPrior,    setQPrior]    = useState("");
  const [qIncrPct,  setQIncrPct]  = useState(5);
  const [qDisc,     setQDisc]     = useState(0);
  const [qNumYrs,   setQNumYrs]   = useState(1);
  const [qYoy,      setQYoy]      = useState([8, 8, 8, 8]);
  const [qOT,       setQOT]       = useState(["", "", "", "", ""]);

  const switchProduct = p => {
    setProduct(p); setAdmin(false);
    if (p === "VISION") {
      setVBundle("Essential"); setVSeats(10); setVStudents(50); setVOnPrem(false);
      setVUpType("MMS"); setVOptTog({}); setVExtraP(""); setVAeOvr(""); setVDisc(0);
      setVNumYrs(1); setVYoy([8,8,8,8]); setVOT(["","","","",""]);
    } else {
      setQBundle("Essential"); setQAdmin(3); setQEmp(10); setQOnPrem(false);
      setQMgdIT(false); setQOptIds([]); setQPickId(QC.pickOne[0].id);
      setQPrior(""); setQIncrPct(5); setQDisc(0);
      setQNumYrs(1); setQYoy([8,8,8,8]); setQOT(["","","","",""]);
    }
  };

  const isV    = product === "VISION";
  const ACCENT = isV ? "#05D2B2" : "#71D2C5";
  const ASFT   = isV ? "rgba(5,210,178,.15)" : "rgba(113,210,197,.18)";
  const MID    = isV ? "#15688E" : "#2E69AD";
  const GRAD   = isV ? "linear-gradient(135deg,#1A4481,#05D2B2)" : "linear-gradient(135deg,#1B387D,#71D2C5)";
  const BTN    = isV ? "#10285A" : "#1B387D";

  // Derived — VISION
  const vIsOn  = vBundle !== "None";
  const vIsLeg = vBundle === "Legacy";
  const vIsStd = vIsOn && !vIsLeg;
  const { auto: vAuto, optional: vOpt, extras: vExtras } = useMemo(() => vSvcs(vBundle), [vBundle]);
  const vEnOpt = useMemo(() => vOpt.filter(s => vOptTog[s.id]), [vOpt, vOptTog]);
  const vDeal  = useMemo(() => calcV(vBundle, vSeats, vOnPrem, vUpType, vEnOpt, parseFloat(vExtraP)||0, vDisc/100),
    [vBundle, vSeats, vOnPrem, vUpType, vEnOpt, vExtraP, vDisc]);
  const vLeg   = useMemo(() => vIsLeg ? calcVLeg(vOnPrem, vUpType, vSeats) : null, [vIsLeg, vOnPrem, vUpType, vSeats]);
  const vLim   = VC.seatLimits[vBundle];
  const vWarn  = vLim && vSeats > vLim.vdm;
  const vRec   = vSeats <= 10 ? "Essential" : vSeats <= 35 ? "Enhanced" : "Enterprise";
  const vOvrV  = vAeOvr ? parseFloat(vAeOvr) : null;
  const legP   = vLeg ? (vOvrV || vLeg.totalList) : 0;
  const legM   = vLeg && legP > 0 ? (legP - vLeg.floor) / legP : 0;
  const vStairs = useMemo(() =>
    vDeal ? buildStairs(vDeal.sw, vDeal.svc, vNumYrs, vYoy, vOT, vDisc/100, vDeal.floor) : [],
    [vDeal, vNumYrs, vYoy, vOT, vDisc]);

  // Derived — Qlarity
  const qIsLeg = qBundle === "Legacy";
  const qIsStd = qBundle !== "None" && !qIsLeg;
  const qTier  = QC.tiers[qBundle];
  const qWarn  = qTier && ((qTier.adminLim && qAdmin > qTier.adminLim)||(qTier.empLim && qEmp > qTier.empLim));
  const { auto: qAuto, optional: qOpt, pickOne: qHasPick } = useMemo(() => qSvcs(qBundle), [qBundle]);
  const qDeal  = useMemo(() => qIsStd ? calcQ(qBundle, qOnPrem, qMgdIT, qOptIds, qPickId, qDisc/100) : null,
    [qBundle, qOnPrem, qMgdIT, qOptIds, qPickId, qDisc, qIsStd]);
  const qLegP  = useMemo(() => { const p = parseFloat(qPrior)||0; return p > 0 ? { prior:p, pct:qIncrPct, price:p*(1+qIncrPct/100) } : null; }, [qPrior, qIncrPct]);
  const qStairs = useMemo(() =>
    qDeal ? buildStairs(qDeal.sw, qDeal.svc, qNumYrs, qYoy, qOT, qDisc/100, qDeal.floor) : [],
    [qDeal, qNumYrs, qYoy, qOT, qDisc]);
  const toggleQ = id => setQOptIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // ── Staircase render (plain function, NOT a component — prevents remount on state change)
  const renderStaircase = (stairs, numYrs, setNumYrs, yoy, setYoy, ot, setOT) => {
    if (!stairs.length) return null;
    const tcvRecurring = stairs.reduce((s, r) => s + r.recurring, 0);
    const tcvOneTime   = stairs.reduce((s, r) => s + r.ot, 0);
    const anyBelow76   = stairs.some(r => r.margin > 0 && r.margin < 0.76);
    const updYoy = (i, v) => { const u = [...yoy]; u[i] = parseFloat(v)||0; setYoy(u); };
    const updOT  = (i, v) => { const u = [...ot];  u[i] = v;               setOT(u);  };
    return (
      <div className="card">
        <div className="sec-title">Multi-Year Pricing</div>

        {/* Contract length */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#5a6f87", marginBottom:8 }}>Contract Length</div>
          <div style={{ display:"flex", gap:6 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setNumYrs(n)} style={{
                padding:"7px 16px", borderRadius:14, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                border: numYrs===n ? "2px solid "+BTN : "1px solid #c8d6e5",
                background: numYrs===n ? BTN : "white", color: numYrs===n ? "white" : "#10285A"
              }}>{n}{n===1?" yr":" yrs"}</button>
            ))}
          </div>
        </div>

        {/* YoY rates */}
        {numYrs > 1 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"#5a6f87", marginBottom:8 }}>Year-over-Year Increase (%)</div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {Array.from({ length: numYrs - 1 }, (_, i) => (
                <div key={i} style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"center" }}>
                  <label style={{ fontSize:13, color:"#5a6f87", fontWeight:600 }}>Yr {i+1}{"→"}{i+2}</label>
                  <div className="inp-wrap" style={{ width:80 }}>
                    <input type="number" min={0} max={50} step={0.5}
                      value={yoy[i] !== undefined ? yoy[i] : 8}
                      onChange={e => updYoy(i, e.target.value)}
                      style={{ textAlign:"center", paddingRight:24 }} />
                    <span className="inp-suffix">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* One-time per year */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#5a6f87", marginBottom:8 }}>One-Time Fees (per year)</div>
          <div className="ot-grid">
            {Array.from({ length: numYrs }, (_, i) => (
              <div key={i} className="ot-year">
                <label>Year {i+1}</label>
                <input type="number" value={ot[i] ?? ""}
                  onChange={e => updOT(i, e.target.value)}
                  placeholder="0"
                  style={{ width:110, textAlign:"center" }} />
              </div>
            ))}
          </div>
        </div>

        {anyBelow76 && (
          <div style={{ background:"#fde8e8", border:"1px solid #c0392b", borderRadius:6, padding:"9px 12px", fontSize:14, color:"#c0392b", fontWeight:600, marginBottom:12 }}>
            ⚠️ One or more years fall below the 76% margin floor. Review pricing before quoting.
          </div>
        )}

        {/* Table */}
        <table className="stairs">
          <thead>
            <tr>
              <th style={{ textAlign:"left" }}>Year</th>
              <th>Software</th><th>Services</th><th>One-Time</th><th>Total</th>
              <th>Blended Margin</th>
            </tr>
          </thead>
          <tbody>
            {stairs.map((r, i) => (
              <tr key={i}>
                <td>{r.yr}</td>
                <td>{fmt(r.sw)}</td>
                <td>{fmt(r.svc)}</td>
                <td>{r.ot > 0 ? fmt(r.ot) : "—"}</td>
                <td style={{ fontWeight:700 }}>{fmt(r.total)}</td>
                <td><span className={"badge "+(r.margin>=.76?"badge-g":r.margin>=.55?"badge-y":"badge-r")}>{pct(r.margin)}</span></td>
              </tr>
            ))}
            {numYrs > 1 && (<>
              <tr className="tcv-row">
                <td>Total ARR ({numYrs} yrs)</td>
                <td /><td /><td />
                <td>{fmt(tcvRecurring)}</td>
                <td />
              </tr>
              {tcvOneTime > 0 && (
                <tr className="ot-row">
                  <td>Total One-Time</td>
                  <td /><td /><td />
                  <td>{fmt(tcvOneTime)}</td>
                  <td />
                </tr>
              )}
            </>)}
          </tbody>
        </table>
        <div style={{ fontSize:13, color:"#5a6f87", marginTop:8 }}>
          Year 1 reflects quoted price (post-discount). Year 2+ escalate at the YoY rate. Margin assumes Year 1 cost floor held fixed.
        </div>
      </div>
    );
  };

  // ── HubSpot CSV builder
  const buildHubSpotCSV = (stairs, isVision, bundle, numYrs, deal, disc) => {
    const baseYear = new Date().getFullYear();
    const isMulti  = numYrs > 1;
    const rows     = [];
    const hr       = () => rows.push(["---"]);

    rows.push(["FOCUS LEARNING — QUOTE BUILDER EXPORT"]);
    rows.push(["Generated", new Date().toLocaleDateString()]);
    rows.push(["Product", isVision ? "VISION" : "Qlarity"]);
    rows.push(["For internal use only — do not share with customer"]);
    hr();

    // Company record
    rows.push(["UPDATE ON COMPANY RECORD IN HUBSPOT"]);
    rows.push(["HubSpot Label", "HubSpot Property", "Value"]);
    rows.push(["Product Platform",      "software_utilized__qtd___vision",  isVision ? "VISION" : "QTD"]);
    rows.push(["Bundle Type 2025/2026", "bundle_type__8_4_2025_",           bundle]);
    if (isVision) {
      rows.push(["VDM Seats (concurrent)", "(Tech/Product tab)", vSeats]);
      rows.push(["Student Seats",          "(Tech/Product tab)", vStudents]);
      rows.push(["On-Prem",               "(Tech/Product tab)", vOnPrem ? "Yes" : "No"]);
      if (vOnPrem) rows.push(["Upgrade Type", "(Tech/Product tab)", vUpType]);
    } else {
      rows.push(["Admin Seats",     "(Tech/Product tab)", qAdmin]);
      rows.push(["Employee Records","(Tech/Product tab)", qEmp]);
      rows.push(["On-Prem",        "(Tech/Product tab)", qOnPrem ? "Yes" : "No"]);
      if (qMgdIT) rows.push(["Managed IT Services", "(Tech/Product tab)", "Yes"]);
    }
    hr();

    stairs.forEach((row, i) => {
      const yr        = baseYear + i;
      const isOut     = i > 0;
      const dealName  = buildDealName(yr, dealType, client, bundle, isOut, baseYear, baseYear + numYrs - 1);
      const pipeline  = isOut ? "Renewal Pipeline" : "Sales Pipeline";
      const stage     = isOut ? "Drafting Proposal" : "Closed Won (set once signed)";
      const addonAmt  = isVision ? (deal && deal.addon ? Math.round(deal.addon * (isOut ? 1 : (1 - disc/100))) : 0) : 0;
      const itAmt     = isVision ? addonAmt : (deal && deal.it ? Math.round(deal.it * (i === 0 ? (1 - disc/100) : 1)) : 0);
      const swAmt     = row.sw - (isVision ? addonAmt : 0);
      const renewal   = isOut ? Math.round((row.sw + row.svc) - (stairs[i-1].sw + stairs[i-1].svc)) : 0;
      const expansion = (dealType === "Expansion" && i === 0) ? Math.round(row.sw + row.svc) : 0;

      rows.push(["DEAL " + (i + 1) + " OF " + numYrs + (isMulti ? " — " + (isOut ? "create as separate deal (Drafting Proposal)" : "primary deal") : "")]);
      rows.push(["HubSpot Label", "HubSpot Property", "Value"]);
      rows.push(["Deal Name",                "dealname",                            dealName]);
      rows.push(["Pipeline",                 "pipeline",                            pipeline]);
      rows.push(["Deal Stage",               "dealstage",                           stage]);
      rows.push(["Close Date",               "closedate",                           i === 0 ? "(enter actual close date)" : "(leave blank)"]);
      rows.push(["Contract Start Date",      "contract_start_date",                 "(enter " + yr + " start date)"]);
      rows.push(["Contract End Date",        "contract_end_date",                   "(enter " + yr + " end date)"]);
      rows.push(["Amount (= Total ARR)",     "amount",                              row.recurring]);
      rows.push(["Software ARR",             "software_arr",                        swAmt > 0 ? swAmt : row.sw]);
      rows.push(["Services ARR",             "services_arr",                        row.svc]);
      rows.push(["IT ARR",                   "it_arr",                              itAmt]);
      rows.push(["Total ARR (check)",        "total_arr__check_",                   row.recurring]);
      rows.push(["One-Time Services Revenue","one_time_services_revenue",           row.ot > 0 ? row.ot : 0]);
      rows.push(["Total One-Time Revenue",   "total_one_time_revenue",              row.ot > 0 ? row.ot : 0]);
      rows.push(["Renewal ARR Uplift",       "renewal_arr_component",               renewal > 0 ? renewal : 0]);
      rows.push(["Expansion ARR Uplift",     "expansion_arr_component",             expansion > 0 ? expansion : 0]);
      rows.push(["Multi-year",               "multi_year",                          isMulti ? "Yes" : "No"]);
      if (isMulti) rows.push(["Num. years in multi-year", "number_of_years_in_multi_year_contract", numYrs]);
      rows.push(["Deal Owner",               "hubspot_owner_id",                    owner || "(enter AE name)"]);
      rows.push(["Blended Margin (internal)","(internal only)",                    pct(row.margin)]);
      hr();
    });

    rows.push(["CHECKLIST"]);
    rows.push(["","[ ] Naming convention followed"]);
    rows.push(["","[ ] Correct pipeline selected"]);
    rows.push(["","[ ] Line items added (ARR = Annually, One-Time = One-Time Fee)"]);
    rows.push(["","[ ] Total ARR (check) matches Amount"]);
    rows.push(["","[ ] Renewal & Expansion ARR Uplift entered (use 0 if none)"]);
    rows.push(["","[ ] Product Platform and Bundle Type updated on company record"]);
    if (isMulti) rows.push(["","[ ] Separate deal per year — Year 1 Closed Won, Years 2+ Drafting Proposal"]);
    rows.push(["","[ ] Proposal URL added once past Value Alignment stage"]);
    return rows;
  };

  // ── Export render (plain function)
  const renderExport = (stairs, deal, isVision, bundle, numYrs, isStd, disc) => {
    if (!isStd || !deal) return null;
    const stairsToUse = stairs.length ? stairs
      : [{ sw: Math.round(deal.sw*(1-disc/100)), svc: Math.round(deal.svc*(1-disc/100)), ot:0,
           recurring: Math.round((deal.sw+deal.svc)*(1-disc/100)), total: Math.round(deal.final), margin: deal.blendMgn }];
    const fname = (isVision ? "VISION" : "Qlarity") + "_Quote_" + (client||"Draft").replace(/[^a-zA-Z0-9]/g,"_") + "_" + new Date().toISOString().slice(0,10) + ".csv";
    return (
      <div className="card">
        <div className="sec-title">Export</div>
        <button onClick={() => dlCSV(buildHubSpotCSV(stairsToUse, isVision, bundle, numYrs, deal, disc), fname)}
          style={{ background:BTN, color:"white", border:"none", borderRadius:6, padding:"9px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          ⬇ Download HubSpot Entry Sheet
        </button>
        <div style={{ fontSize:13, color:"#5a6f87", marginTop:8 }}>
          Maps to HubSpot field names. One deal per year for multi-year. Internal margins marked — do not share with customer.
        </div>
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div style={{ "--accent":ACCENT, "--accentSoft":ASFT, "--mid":MID, fontFamily:"'Archivo',Arial,sans-serif", color:"#10285A", maxWidth:960, margin:"0 auto", padding:"24px 16px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;900&display=swap" rel="stylesheet" />
      <style>{SHARED_CSS}</style>

      {/* Header */}
      <div style={{ background:GRAD, borderRadius:12, padding:"20px 28px", marginBottom:18 }}>
        <div style={{ display:"flex", gap:6, marginBottom:14 }}>
          {["VISION","Qlarity"].map(p => (
            <button key={p} onClick={() => switchProduct(p)} style={{
              padding:"7px 20px", borderRadius:20, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              background:product===p?"white":"rgba(255,255,255,.15)",
              color:product===p?(p==="VISION"?"#1A4481":"#1B387D"):"white",
              border:product===p?"none":"1px solid rgba(255,255,255,.35)"
            }}>{p}</button>
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color:"white", fontSize:24, fontWeight:900 }}>{product} Quote Builder</div>
            <div style={{ color:"rgba(255,255,255,.75)", fontSize:13, marginTop:2 }}>FOCUS Learning · Internal Use Only</div>
          </div>
          <button onClick={() => setAdmin(!admin)} style={{
            background:admin?"rgba(255,255,255,.25)":"rgba(255,255,255,.1)",
            border:"1px solid rgba(255,255,255,.3)", borderRadius:6, color:"white",
            padding:"7px 16px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit"
          }}>{admin ? "◉ Admin View" : "○ Admin View"}</button>
        </div>
      </div>

      {/* Deal Info */}
      <div className="card">
        <div className="sec-title">Deal Information</div>
        <div className="row">
          <div className="field"><label>Client Name</label><input value={client} onChange={e => setClient(e.target.value)} placeholder="Client name" /></div>
          <div className="field"><label>Opportunity Owner</label><input value={owner} onChange={e => setOwner(e.target.value)} placeholder="AE name" /></div>
          <div className="field"><label>Deal Type</label>
            <select value={dealType} onChange={e => setDealType(e.target.value)}>
              {DEAL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ══ VISION ══ */}
      {isV && (<>
        <div className="card">
          <div className="sec-title">Product & Configuration</div>
          <div className="row">
            <div className="field"><label>Bundle Type</label>
              <select value={vBundle} onChange={e => { setVBundle(e.target.value); setVOptTog({}); setVExtraP(""); }}>
                {["None","Legacy","Essential","Essential Plus","Enhanced","Enterprise"].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="field"><label>VDM Seats (concurrent)</label>
              <input type="number" min={1} max={500} value={vSeats} onChange={e => setVSeats(Math.max(1,parseInt(e.target.value)||1))} />
            </div>
            <div className="field"><label>Student Seats</label>
              <input type="number" min={1} value={vStudents} onChange={e => setVStudents(parseInt(e.target.value)||1)} />
            </div>
          </div>
          <div className="row">
            <div className="field"><label>On-Prem?</label>
              <select value={vOnPrem?"Yes":"No"} onChange={e => setVOnPrem(e.target.value==="Yes")}><option>No</option><option>Yes</option></select>
            </div>
            <div className="field" style={{ opacity:vOnPrem?1:.3, pointerEvents:vOnPrem?"auto":"none" }}><label>Upgrade Type</label>
              <select value={vUpType} onChange={e => setVUpType(e.target.value)}><option>MMS</option><option>Self-Managed</option><option>In-Place</option></select>
            </div>
          </div>
          {vWarn && vIsStd && <div style={{ background:"#fef3e2", border:"1px solid #f0c36d", borderRadius:6, padding:"9px 14px", fontSize:15 }}>⚠️ {vSeats} seats exceeds {vBundle} limit ({vLim.vdm}). Recommended: <strong>{vRec}</strong></div>}
        </div>

        {vIsLeg && vLeg && (
          <div className="card">
            <div className="sec-title">Legacy Pricing</div>
            <div style={{ background:"#f0f6fb", borderRadius:8, padding:16, marginBottom:12 }}>
              <div className="dl"><span>Segment</span><strong>{vLeg.seg}</strong></div>
              <div className="dl"><span>Cost Floor</span><span>{fmt(vLeg.floor)}</span></div>
              <div className="dl"><span>Implied List Price</span><strong>{fmt(vLeg.totalList)}</strong></div>
              {vOnPrem && <div className="dl"><span>{vUpType} Add-On</span><span>{fmt(vLeg.addon)}</span></div>}
            </div>
            <div className="field" style={{ maxWidth:260 }}><label>AE Override (optional)</label>
              <input type="number" value={vAeOvr} onChange={e => setVAeOvr(e.target.value)} placeholder="Leave blank for implied list" />
            </div>
            <div style={{ marginTop:12 }}>
              <div className="dl-total"><span>Legacy Price</span><span>{fmt(legP)}</span></div>
              <div style={{ marginTop:8 }}>
                <span className={"badge "+(legM>=.76?"badge-g":legM>=.5?"badge-y":"badge-r")}>{pct(legM)} margin</span>
                {legP < vLeg.floor && <span className="badge badge-r" style={{ marginLeft:8 }}>⚠️ Below cost floor</span>}
              </div>
            </div>
            {admin && <div className="admin-box"><h4>Cost Model</h4>
              <div className="admin-row"><span>D&M ({VC_DM_TOTAL.toFixed(2)}/seat × {vSeats})</span><span className="val">{fmt(vLeg.dm)}</span></div>
              <div className="admin-row"><span>Hosting</span><span className="val">{fmt(vLeg.host)}</span></div>
              <div className="admin-row" style={{ fontWeight:700 }}><span>Cost Floor</span><span className="val">{fmt(vLeg.floor)}</span></div>
            </div>}
          </div>
        )}

        {vIsStd && (
          <div className="card">
            <div className="sec-title">Services — {vBundle}</div>
            {vAuto.length > 0 && <>
              <div style={{ fontSize:13, fontWeight:700, color:"#0a7c5f", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Included in {vBundle}</div>
              {vAuto.map(s => (
                <div key={s.id} className="svc-row">
                  <div className="chk auto"><Chk /></div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600 }}>{s.name}</div>
                    {admin && <div style={{ fontSize:13, color:"#5a6f87", marginTop:2 }}>Cost: {fmt(s.cost)} · {s.hours} hrs</div>}
                  </div>
                  <div style={{ fontWeight:600, color:MID }}>{fmt(s.list)}</div>
                </div>
              ))}
            </>}
            {vOpt.length > 0 && <>
              <div style={{ fontSize:13, fontWeight:700, color:"#5a6f87", textTransform:"uppercase", letterSpacing:1, marginTop:16, marginBottom:6 }}>
                {vBundle==="Essential Plus"?"Select à la carte":"Optional Add-Ons"}
              </div>
              {vOpt.map(s => (
                <div key={s.id} className="svc-row" style={{ cursor:"pointer", userSelect:"none" }}
                  onClick={() => setVOptTog(p => Object.assign({}, p, { [s.id]: !p[s.id] }))}>
                  <div className={"chk"+(vOptTog[s.id]?" on":"")}>{vOptTog[s.id]&&<Chk />}</div>
                  <div style={{ flex:1 }}><div style={{ fontWeight:600 }}>{s.name}</div></div>
                  <div style={{ fontWeight:600, color:MID }}>{fmt(s.list)}</div>
                </div>
              ))}
            </>}
            {vExtras.length > 0 && <>
              <div style={{ fontSize:13, fontWeight:700, color:"#ED7D2F", textTransform:"uppercase", letterSpacing:1, marginTop:16, marginBottom:6 }}>Additional Services (requires scoping)</div>
              {vExtras.map(ex => (
                <div key={ex.id} className="svc-row" style={{ opacity:.7 }}>
                  <div className="chk" style={{ borderColor:"#ED7D2F", borderStyle:"dashed" }} />
                  <div style={{ flex:1 }}><div style={{ fontWeight:600 }}>{ex.name}</div></div>
                </div>
              ))}
              <div className="field" style={{ maxWidth:280, marginTop:8 }}><label>Scoped Extra Services Price</label>
                <input type="number" value={vExtraP} onChange={e => setVExtraP(e.target.value)} placeholder="0" />
              </div>
            </>}
            <div style={{ marginTop:12, padding:"10px 0", borderTop:"1px solid #e8ecf1", display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:16 }}>
              <span>Services Total</span><span>{vDeal?fmt(vDeal.svc):"$0"}</span>
            </div>
          </div>
        )}

        {vDeal && (
          <div className="card">
            <div className="sec-title">Deal Estimate</div>
            <div className="dl"><span>Software</span><span>{fmt(vDeal.sw)}</span></div>
            <div className="dl"><span>Services</span><span>{fmt(vDeal.svc)}</span></div>
            <div className="dl" style={{ fontWeight:600 }}><span>List Total</span><span>{fmt(vDeal.list)}</span></div>
            <DiscBlock disc={vDisc} setDisc={setVDisc} deal={vDeal}
              guardrails={VC.discountGuardrails[vBundle]||VC.discountGuardrails.Essential} accentColor={ACCENT} />
            {vDeal.discAmt > 0 && <div className="dl" style={{ color:"#5a6f87" }}><span>Discount ({pct(vDeal.discAmt/vDeal.list)})</span><span>{"−"}{fmt(vDeal.discAmt)}</span></div>}
            <PriceFooter deal={vDeal} isVision={true} accentColor={ACCENT} />
            {admin && <div className="admin-box" style={{ marginTop:12 }}><h4>Pricing Breakdown</h4>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:MID, marginBottom:6 }}>COST FLOOR</div>
                  <div className="admin-row"><span>D&M ({VC_DM_TOTAL.toFixed(2)}/seat × {vDeal.n})</span><span className="val">{fmt(vDeal.dmCost)}</span></div>
                  <div className="admin-row"><span>Shared hosting</span><span className="val">{vOnPrem?"$0":fmt(VC.sharedHostingYr)}</span></div>
                  <div className="admin-row"><span>Per-user ({vDeal.n} seats)</span><span className="val">{vOnPrem?"$0":fmt(VC.perUserHostingYr*vDeal.n)}</span></div>
                  <div className="admin-row" style={{ fontWeight:700, borderTop:"1px solid #ddd", paddingTop:4, marginTop:4 }}><span>Total</span><span className="val">{fmt(vDeal.floor)}</span></div>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:MID, marginBottom:6 }}>PRICE BUILD</div>
                  <div className="admin-row"><span>D&M list ({pct(vDeal.m.dm)})</span><span className="val">{fmt(vDeal.dmList)}</span></div>
                  <div className="admin-row"><span>Hosting list ({pct(vDeal.m.hosting)})</span><span className="val">{fmt(vDeal.hostList)}</span></div>
                  {vOnPrem && <div className="admin-row"><span>+ {vUpType}</span><span className="val">{fmt(vDeal.addon)}</span></div>}
                  <div className="admin-row" style={{ fontWeight:700, borderTop:"1px solid #ddd", paddingTop:4, marginTop:4 }}><span>Software</span><span className="val">{fmt(vDeal.sw)}</span></div>
                </div>
              </div>
              <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[["SW Margin",vDeal.swMgn,vDeal.swMgn>=.6],["Svc Margin",vDeal.svc>0?(vDeal.svc-vDeal.svcCost)/vDeal.svc:0,true],["Max Disc",vDeal.sw>0?(vDeal.sw-vDeal.floor)/vDeal.sw:0,true]].map(([l,v,g]) => (
                  <div key={l} style={{ background:"white", borderRadius:6, padding:"9px 12px", textAlign:"center" }}>
                    <div style={{ fontSize:13, color:"#5a6f87" }}>{l}</div>
                    <div style={{ fontSize:20, fontWeight:700, color:g?"#0a7c5f":"#c0392b" }}>{pct(v)}</div>
                  </div>
                ))}
              </div>
            </div>}
          </div>
        )}

        {vDeal && renderStaircase(vStairs, vNumYrs, setVNumYrs, vYoy, setVYoy, vOT, setVOT)}
        {vIsOn && <div className="card"><div className="sec-title">Notes</div><textarea rows={3} placeholder="Deal notes, special terms, scoping details..." /></div>}
        {renderExport(vStairs, vDeal, true, vBundle, vNumYrs, vIsStd, vDisc)}
      </>)}

      {/* ══ QLARITY ══ */}
      {!isV && (<>
        <div className="card">
          <div className="sec-title">Product & Configuration</div>
          <div className="row">
            <div className="field"><label>Bundle Type</label>
              <select value={qBundle} onChange={e => { setQBundle(e.target.value); setQOptIds([]); setQPickId(QC.pickOne[0].id); }}>
                {["None","Legacy","Essential","Essential Plus","Enhanced","Enterprise"].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            {qIsStd && <>
              <div className="field"><label>Admin Seats</label>
                <input type="number" min={1} value={qAdmin} onChange={e => setQAdmin(Math.max(1,parseInt(e.target.value)||1))} />
              </div>
              <div className="field"><label>Employee Records</label>
                <input type="number" min={1} value={qEmp} onChange={e => setQEmp(Math.max(1,parseInt(e.target.value)||1))} />
              </div>
            </>}
          </div>
          {qIsStd && (
            <div className="row">
              <div className="field"><label>On-Prem?</label>
                <select value={qOnPrem?"Yes":"No"} onChange={e => setQOnPrem(e.target.value==="Yes")}><option>No</option><option>Yes</option></select>
              </div>
              <div className="field"><label>Managed IT Services?</label>
                <select value={qMgdIT?"Yes":"No"} onChange={e => setQMgdIT(e.target.value==="Yes")}><option>No</option><option>Yes</option></select>
              </div>
              {(qOnPrem||qMgdIT) && (
                <div className="field" style={{ justifyContent:"flex-end" }}>
                  <div style={{ background:"#E4FEDF", borderRadius:6, padding:"9px 12px", fontSize:14, color:"#10285A", marginTop:22 }}>
                    Add-Ons: {[qOnPrem&&"On-Prem (+$15K)", qMgdIT&&"Managed IT (+$7K)"].filter(Boolean).join(" · ")}
                  </div>
                </div>
              )}
            </div>
          )}
          {qWarn && qIsStd && <div style={{ background:"#fff3e0", border:"1px solid #E1941E", borderRadius:6, padding:"9px 14px", fontSize:15 }}>⚠️ Seat count exceeds <strong>{qBundle}</strong> limits. Consider upgrading.</div>}
          {qBundle==="Essential Plus" && <div style={{ background:"#eef2fa", border:"1px solid #2E69AD", borderRadius:6, padding:"9px 14px", marginTop:4, fontSize:15, color:"#10285A" }}>ℹ️ <strong>Essential Plus:</strong> Same SW price as Essential. All services are à la carte.</div>}
        </div>

        {qIsLeg && (
          <div className="card">
            <div className="sec-title">Legacy Pricing</div>
            <div style={{ background:"#f0f6fb", borderRadius:8, padding:"12px 16px", marginBottom:14, fontSize:15, color:"#575757", lineHeight:1.6 }}>
              Legacy Qlarity = Prior contract value × (1 + increase %). Software only. Increase range: <strong>3–10%</strong>.
            </div>
            <div className="row">
              <div className="field"><label>Prior Contract Value</label>
                <input type="number" value={qPrior} onChange={e => setQPrior(e.target.value)} placeholder="Enter prior ACV" />
              </div>
              <div className="field"><label>Increase %</label>
                <div className="inp-wrap">
                  <input type="number" min={3} max={10} step={0.5} value={qIncrPct}
                    onChange={e => setQIncrPct(Math.min(10,Math.max(3,parseFloat(e.target.value)||3)))}
                    style={{ paddingRight:30 }} />
                  <span className="inp-suffix">%</span>
                </div>
              </div>
            </div>
            {qLegP && <>
              <div className="dl"><span>Prior Contract</span><span>{fmt(qLegP.prior)}</span></div>
              <div className="dl"><span>Increase</span><span>+{qLegP.pct}% (+{fmt(qLegP.price-qLegP.prior)})</span></div>
              <div className="dl-total"><span>Legacy Price</span><span style={{ fontSize:22 }}>{fmt(qLegP.price)}</span></div>
            </>}
          </div>
        )}

        {qIsStd && (
          <div className="card">
            <div className="sec-title">Services — {qBundle}</div>
            {qAuto.length > 0 && <>
              <div style={{ fontSize:13, fontWeight:700, color:"#0a6b5a", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Standard Inclusions — {qBundle}</div>
              {qAuto.map(s => (
                <div key={s.id} className="svc-row">
                  <div className="chk auto"><Chk /></div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600 }}>{s.name}</div>
                    {admin && <div style={{ fontSize:13, color:"#575757", marginTop:2 }}>Cost: {fmt(s.cost)}</div>}
                  </div>
                  <div style={{ fontWeight:600, color:MID }}>{fmt(s.list)}</div>
                </div>
              ))}
            </>}
            {qOpt.length > 0 && <>
              <div style={{ fontSize:13, fontWeight:700, color:"#575757", textTransform:"uppercase", letterSpacing:1, marginTop:18, marginBottom:6 }}>
                {qBundle==="Essential Plus"?"À la carte — select all that apply":"Optional Add-Ons"}
              </div>
              {qOpt.map(s => (
                <div key={s.id} className="svc-row" style={{ cursor:"pointer", userSelect:"none" }} onClick={() => toggleQ(s.id)}>
                  <div className={"chk"+(qOptIds.includes(s.id)?" on":"")}>{qOptIds.includes(s.id)&&<Chk />}</div>
                  <div style={{ flex:1 }}><div style={{ fontWeight:600 }}>{s.name}</div></div>
                  <div style={{ fontWeight:600, color:MID }}>{fmt(s.list)}</div>
                </div>
              ))}
            </>}
            {qHasPick && <>
              <div style={{ fontSize:13, fontWeight:700, color:"#E1941E", textTransform:"uppercase", letterSpacing:1, marginTop:18, marginBottom:8 }}>Enterprise Add-On — Select One</div>
              {QC.pickOne.map(p => (
                <div key={p.id} className={"po-opt"+(qPickId===p.id?" sel":"")} onClick={() => setQPickId(p.id)}>
                  <div className="radio">{qPickId===p.id&&<div className="radio-dot" />}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600 }}>{p.name}</div>
                    {admin && <div style={{ fontSize:13, color:"#575757", marginTop:1 }}>Cost: {fmt(p.cost)}</div>}
                  </div>
                  <div style={{ fontWeight:600, color:MID, whiteSpace:"nowrap", marginLeft:8 }}>{fmt(p.list)}</div>
                </div>
              ))}
            </>}
            {qBundle==="Essential Plus"&&qOptIds.length===0&&<div style={{ background:"#fff3e0", border:"1px solid #E1941E", borderRadius:6, padding:"9px 12px", fontSize:14, color:"#10285A", marginTop:6 }}>ℹ️ No services selected. Toggle on à la carte services if this deal includes any.</div>}
            <div style={{ marginTop:14, padding:"10px 0", borderTop:"1px solid #e8ecf1", display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:16 }}>
              <span>Services Total</span><span>{qDeal?fmt(qDeal.svc):"$0"}</span>
            </div>
          </div>
        )}

        {qDeal && (
          <div className="card">
            <div className="sec-title">Deal Estimate</div>
            <div className="dl"><span>Software</span><span>{fmt(qDeal.sw)}</span></div>
            {(qOnPrem||qMgdIT)&&admin&&<div style={{ paddingLeft:16 }}>
              {qOnPrem&&<div className="dl" style={{ fontSize:15, color:"#575757" }}><span>incl. On-Prem</span><span>{fmt(QC.itAddOns.onPrem)}</span></div>}
              {qMgdIT&&<div className="dl" style={{ fontSize:15, color:"#575757" }}><span>incl. Managed IT</span><span>{fmt(QC.itAddOns.managedIT)}</span></div>}
            </div>}
            <div className="dl"><span>Services</span><span>{fmt(qDeal.svc)}</span></div>
            <div className="dl" style={{ fontWeight:600 }}><span>List Total</span><span>{fmt(qDeal.list)}</span></div>
            <DiscBlock disc={qDisc} setDisc={setQDisc} deal={qDeal}
              guardrails={QC.discountGuardrails[qBundle]||QC.discountGuardrails.Essential} accentColor={ACCENT} />
            {qDeal.discAmt>0&&<div className="dl" style={{ color:"#5a6f87" }}><span>Discount ({pct(qDeal.discAmt/qDeal.list)})</span><span>{"−"}{fmt(qDeal.discAmt)}</span></div>}
            <PriceFooter deal={qDeal} isVision={false} accentColor={ACCENT} />
            {admin && <div className="admin-box" style={{ marginTop:12 }}><h4>Pricing Breakdown (Admin Only)</h4>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:MID, marginBottom:6 }}>SW PRICE BUILD</div>
                  <div className="admin-row"><span>Tier list</span><span className="val">{fmt(qDeal.swBase)}</span></div>
                  {qOnPrem&&<div className="admin-row"><span>On-Prem add-on</span><span className="val">+{fmt(QC.itAddOns.onPrem)}</span></div>}
                  {qMgdIT&&<div className="admin-row"><span>Managed IT add-on</span><span className="val">+{fmt(QC.itAddOns.managedIT)}</span></div>}
                  <div className="admin-row" style={{ fontWeight:700, borderTop:"1px solid #ddd", paddingTop:4, marginTop:4 }}><span>Software</span><span className="val">{fmt(qDeal.sw)}</span></div>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:MID, marginBottom:6 }}>COST BASIS</div>
                  <div className="admin-row"><span>Qlarity D&M / customer</span><span className="val">{fmt(QC.dmCost)}</span></div>
                  <div className="admin-row"><span>Services cost to FLC</span><span className="val">{fmt(qDeal.svcCost)}</span></div>
                  <div className="admin-row" style={{ fontWeight:700, borderTop:"1px solid #ddd", paddingTop:4, marginTop:4 }}><span>Cost Floor</span><span className="val">{fmt(qDeal.floor)}</span></div>
                </div>
              </div>
              <div style={{ background:"#fff8ed", border:"1px solid #E1941E", borderRadius:6, padding:"9px 12px", fontSize:14, color:"#10285A" }}>⚠️ No per-user hosting model for Qlarity — margins vs. D&M cost only; actual margin is higher.</div>
              <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[["SW Margin",qDeal.swMgn,qDeal.swMgn>=.7],["Svc Margin",qDeal.svc>0?(qDeal.svc-qDeal.svcCost)/qDeal.svc:0,true],["Max Disc @ floor",qDeal.list>0?(qDeal.list-qDeal.floor)/qDeal.list:0,true]].map(([l,v,g]) => (
                  <div key={l} style={{ background:"white", borderRadius:6, padding:"9px 12px", textAlign:"center" }}>
                    <div style={{ fontSize:13, color:"#575757" }}>{l}</div>
                    <div style={{ fontSize:20, fontWeight:700, color:g?"#0a6b5a":"#c0392b" }}>{pct(v)}</div>
                  </div>
                ))}
              </div>
            </div>}
          </div>
        )}

        {qDeal && renderStaircase(qStairs, qNumYrs, setQNumYrs, qYoy, setQYoy, qOT, setQOT)}
        {(qIsStd||qIsLeg) && <div className="card"><div className="sec-title">Notes</div><textarea rows={3} placeholder="Deal notes, special terms, scoping details..." /></div>}
        {renderExport(qStairs, qDeal, false, qBundle, qNumYrs, qIsStd, qDisc)}
      </>)}

      <div style={{ textAlign:"center", fontSize:13, color:"#8a9bb5", marginTop:14 }}>
        FOCUS Learning · Quote Builder · Internal Use Only · Confidential
      </div>
    </div>
  );
}
