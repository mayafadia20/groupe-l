// Lens — logique de l'application (état dans le navigateur, aucune dépendance)
// Toutes les données vivent dans localStorage sous la clé « lens.data » ; « Réinitialiser la démo » les efface.
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const KEY = "lens.data";

  // ───────────────────────── données par défaut (celles de la démonstration) ─────────────────────────
  const DEF = {
    company: { name: "Construction Boréal inc.", sector: "Construction", size: "50 à 99 employés", email: "direction@constructionboreal.ca", first: "Maya", day: 8 },
    departments: [
      { name: "Direction", resp: "M. Lounici", parent: "", n: 4 }, { name: "Opérations", resp: "S. Roy", parent: "Direction", n: 14 },
      { name: "Estimation", resp: "J. Tremblay", parent: "Opérations", n: 9 }, { name: "Approvisionnement", resp: "A. Côté", parent: "Opérations", n: 6 },
      { name: "Finance", resp: "L. Gagnon", parent: "Direction", n: 5 }, { name: "Ressources humaines", resp: "N. Bouchard", parent: "Finance", n: 3 },
      { name: "Technologies", resp: "K. Pelletier", parent: "Finance", n: 4 }, { name: "Ventes", resp: "É. Morin", parent: "Direction", n: 7 }],
    users: [
      { name: "Julie Tremblay", mail: "j.tremblay@constructionboreal.ca", dept: "Estimation", role: "Gestionnaire", status: "active" },
      { name: "Simon Roy", mail: "s.roy@constructionboreal.ca", dept: "Opérations", role: "Gestionnaire", status: "active" },
      { name: "Alexandre Côté", mail: "a.cote@constructionboreal.ca", dept: "Approvisionnement", role: "Gestionnaire", status: "sent" },
      { name: "Louise Gagnon", mail: "l.gagnon@constructionboreal.ca", dept: "Finance", role: "Administratrice", status: "active" },
      { name: "Marc Bélanger", mail: "m.belanger@constructionboreal.ca", dept: "Estimation", role: "Contributeur", status: "sent" },
      { name: "Patricia Lavoie", mail: "p.lavoie@constructionboreal.ca", dept: "Estimation", role: "Contributrice", status: "todo" }],
    extraInvited: 25,   // comptes invités hors de la liste affichée (démo : 31 sur 52)
    objForm: { cat: "Financier", depts: ["Finance", "Estimation", "Opérations", "Approvisionnement"] },
    objectives: [
      { cat: "Financier", weight: 40, title: "Profitabilité sur les contrats", depts: 4, target: "14 à 16 %", status: "creating" },
      { cat: "Opérationnel", weight: 35, title: "Délai de soumission", depts: 2, target: "6 j", status: "active" },
      { cat: "Humain", weight: 25, title: "Charge moyenne des équipes", depts: 8, target: "80 %", status: "draft" }],
    indicators: [],
    task: { name: "Préparer une soumission", dept: "Estimation", proc: "Nouveau processus", freq: "Plusieurs fois par semaine", windows: ["Excel", "Revit", "Outlook", "Word"] },
    rec: null,
    processes: [
      { dept: "ESTIMATION", ver: "v3", title: "Préparer une soumission", steps: 4, recs: 3 },
      { dept: "APPROVISIONNEMENT", ver: "v1", title: "Commander les matériaux", steps: 5, recs: 1 },
      { dept: "FINANCE", ver: "v2", title: "Facturer un projet", steps: 4, recs: 2 }],
    activeProc: 0, procValidated: false,
    steps: [{ title: "Lire les plans", dur: "20 min", who: "J. Tremblay", sys: "Revit" }, { title: "Estimer les quantités", dur: "45 min", who: "J. Tremblay", sys: "Excel" },
            { title: "Obtenir les prix", dur: "attente 1,5 j", who: "A. Côté", sys: "Outlook" }, { title: "Monter la soumission", dur: "30 min", who: "J. Tremblay", sys: "Word" }],
    fiche: {}, ficheSaved: false,
    projects: [
      { name: "Automatiser la reprise des quantités Revit → Excel", dept: "Estimation", resp: "J. Tremblay", gain: "14 h / sem", status: "En cours" },
      { name: "Approbation des achats en deux niveaux", dept: "Approvisionnement", resp: "A. Côté", gain: "9 h / sem", status: "À faire" },
      { name: "Feuilles de temps saisies une seule fois", dept: "Opérations", resp: "S. Roy", gain: "7 h / sem", status: "À faire" },
      { name: "Relances clients automatisées", dept: "Finance", resp: "L. Gagnon", gain: "4 h / sem", status: "Terminé" }],
    realOverrides: {}, period: "T3 2026", chartMode: "monthly", sysMode: "usage", dashObj: 0,
  };
  let D = load();
  function load() { try { const s = localStorage.getItem(KEY); if (s) return Object.assign(JSON.parse(JSON.stringify(DEF)), JSON.parse(s)); } catch (_) {} return JSON.parse(JSON.stringify(DEF)); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (_) {} }
  const deptNames = () => D.departments.map((d) => d.name);
  const totalEmployees = () => D.departments.reduce((a, d) => a + (Number(d.n) || 0), 0);
  const initials = (n) => n.split(/\s+/).map((w) => w[0] || "").join("").slice(0, 2).toUpperCase();
  const mmss = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  const num = (v) => parseFloat(String(v).replace(",", ".").replace(/[^\d.\-]/g, "")) || 0;
  const fr = (v, d) => v.toLocaleString("fr-CA", { maximumFractionDigits: d == null ? 1 : d });

  // ───────────────────────── messages, dialogues, téléchargements ─────────────────────────
  function toast(msg, dark) {
    const box = $("#toasts"); if (!box) return;
    const t = document.createElement("div");
    t.style.cssText = "max-width: 360px; padding: 12px 16px; border-radius: 14px; font-size: 13.5px; line-height: 1.4; box-shadow: 0 18px 40px -16px rgba(0,0,0,.45); " + (dark === false ? "background:#fff;color:#111113;border:1.5px solid #dcdce0" : "background:#111113;color:#fff");
    t.textContent = msg; box.appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .4s"; t.style.opacity = "0"; setTimeout(() => t.remove(), 420); }, 3200);
  }
  const INPUT = "height: 44px; box-sizing: border-box; border-radius: 12px; border: 1.5px solid #dcdce0; padding: 0 12px; font: inherit; font-size: 14px; color: #111113; width: 100%; background: #fff";
  function dialog(o) {
    return new Promise((resolve) => {
      const dlg = $("#dlg"); if (!dlg || typeof dlg.showModal !== "function") { resolve(null); return; }
      $("#dlg-title").textContent = o.title || ""; $("#dlg-text").textContent = o.text || ""; $("#dlg-ok").textContent = o.ok || "Confirmer";
      const box = $("#dlg-fields"); box.innerHTML = "";
      (o.fields || []).forEach((f) => {
        const lab = document.createElement("label"); lab.style.cssText = "display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600";
        lab.appendChild(document.createTextNode(f.label));
        let el;
        if (f.options) { el = document.createElement("select"); f.options.forEach((v) => { const op = document.createElement("option"); op.textContent = v; el.appendChild(op); }); if (f.value) el.value = f.value; }
        else if (f.type === "textarea") { el = document.createElement("textarea"); el.rows = 3; el.value = f.value || ""; }
        else { el = document.createElement("input"); el.type = f.type || "text"; el.value = f.value || ""; if (f.placeholder) el.placeholder = f.placeholder; }
        el.name = f.name; el.style.cssText = INPUT + (f.type === "textarea" ? "; height: auto; padding: 10px 12px; resize: vertical" : ""); el.style.fontWeight = "400";
        lab.appendChild(el); box.appendChild(lab);
      });
      const form = $("#dlg-form");
      const done = (v) => { dlg.close(); form.onsubmit = null; $("#dlg-cancel").onclick = null; resolve(v); };
      form.onsubmit = (e) => { e.preventDefault(); const out = {}; new FormData(form).forEach((v, k) => (out[k] = String(v).trim())); done(out); };
      $("#dlg-cancel").onclick = () => done(null);
      dlg.oncancel = (e) => { e.preventDefault(); done(null); };
      dlg.showModal(); const first = box.querySelector("input, select, textarea"); if (first) first.focus();
    });
  }
  function download(name, content, type) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type: type || "text/plain;charset=utf-8" })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function pickFile(accept) { return new Promise((resolve) => { const f = $("#file-in"); f.accept = accept || ""; f.value = ""; f.onchange = () => { const file = f.files[0]; if (!file) return resolve(null); const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsText(file); }; f.click(); }); }
  function parseCSV(text) { return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, ""))); }

  // ───────────────────────── écran 1 : connexion ─────────────────────────
  function initConnexion() {
    const f = { name: $("#co-name"), sector: $("#co-sector"), size: $("#co-size"), email: $("#co-email") };
    if (!f.name) return;
    f.name.value = D.company.name; f.sector.value = D.company.sector; f.size.value = D.company.size; f.email.value = D.company.email;
    const commit = (ms) => (e) => {
      if (!f.name.value.trim() || !/.+@.+\..+/.test(f.email.value)) { e.preventDefault(); toast("Indiquez le nom de l’entreprise et un courriel valide.", false); return; }
      D.company.name = f.name.value.trim(); D.company.sector = f.sector.value; D.company.size = f.size.value; D.company.email = f.email.value.trim();
      const local = D.company.email.split("@")[0].split(/[._-]/)[0]; if (local && local !== "direction") D.company.first = local[0].toUpperCase() + local.slice(1);
      save(); applyCompany(); toast(ms ? "Connexion Microsoft simulée · espace « " + D.company.name + " » ouvert" : "Espace « " + D.company.name + " » créé");
    };
    $("#btn-create").addEventListener("click", commit(false));
    $("#btn-ms").addEventListener("click", commit(true));
  }
  function applyCompany() {
    $$(".co-sub").forEach((el) => { el.textContent = el.dataset.sub.replace("Construction Boréal inc.", D.company.name); });
    const h = $("#home-name"); if (h) h.textContent = D.company.first || "Maya";
  }

  // ───────────────────────── écran 2 : départements ─────────────────────────
  const IN = (focus, bold) => "height: 42px; box-sizing: border-box; border-radius: 12px; border: 1.5px solid " + (focus ? "#111113" : "#dcdce0") + "; padding: 0 12px; font: inherit; font-size: 14px;" + (bold ? " font-weight: 600;" : "") + " color: #111113; min-width: 0";
  function renderDepts() {
    const box = $("#dep-rows"); if (!box) return;
    const names = deptNames();
    box.innerHTML = D.departments.map((d, i) => {
      const opts = ['<option' + (d.parent === "" ? " selected" : "") + '>— (sommet)</option>'].concat(names.filter((n) => n !== d.name).map((n) => '<option' + (n === d.parent ? " selected" : "") + ">" + esc(n) + "</option>")).join("");
      return '<div data-i="' + i + '" style="display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.1fr) minmax(0, 1.1fr) 90px 36px; gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid #ececef">' +
        '<input data-k="name" aria-label="Département" value="' + esc(d.name) + '" style="' + IN(false, true) + '">' +
        '<input data-k="resp" aria-label="Responsable" value="' + esc(d.resp) + '" style="' + IN(false, false) + '">' +
        '<select data-k="parent" aria-label="Relève de" style="height: 42px; box-sizing: border-box; border-radius: 12px; border: 1.5px solid #dcdce0; padding: 0 8px; font: inherit; font-size: 14px; color: ' + (d.parent === "" ? "#5e5e65" : "#111113") + '; background: #ffffff; min-width: 0">' + opts + "</select>" +
        '<input data-k="n" aria-label="Employés" value="' + esc(d.n) + '" style="' + IN(false, false) + '">' +
        '<button type="button" data-del="' + i + '" aria-label="Supprimer" style="width: 36px; height: 36px; border-radius: 50%; border: none; background: #f1f1f3; font: inherit; cursor: pointer">×</button></div>';
    }).join("");
    renderTree(); renderInvites(); renderMapList();
  }
  function renderTree() {
    const tree = $("#dep-tree"); if (!tree) return;
    const badge = $("#dep-badge"); if (badge) badge.textContent = D.departments.length + " départements · " + totalEmployees() + " employés";
    const kids = (p) => D.departments.filter((d) => (d.parent || "") === p);
    const row = (d, lvl) => {
      const meta = esc(d.resp) + " · " + esc(d.n);
      if (lvl === 0) return '<div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 14px; background: radial-gradient(130% 260% at 90% -60%, #4a4a4f 0%, #1a1a1d 40%, #070708 100%); color: #ffffff"><b>' + esc(d.name) + '</b><span style="font-size: 12px; color: #d4d4d8">' + meta + "</span></div>";
      if (lvl === 1) return '<div style="display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; border-radius: 14px; border: 1.5px solid #111113"><b>' + esc(d.name) + '</b><span style="font-size: 12px; color: #5e5e65">' + meta + "</span></div>";
      return '<div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 14px; background: #f4f4f6"><span style="font-weight: 600">' + esc(d.name) + '</span><span style="font-size: 12px; color: #5e5e65">' + meta + "</span></div>";
    };
    const walk = (p, lvl, seen) => kids(p).filter((d) => !seen.has(d.name)).map((d) => { seen.add(d.name); const c = walk(d.name, lvl + 1, seen); return row(d, lvl) + (c ? '<div style="margin-left: 18px; padding-left: 16px; border-left: 1.5px solid ' + (lvl === 0 ? "#111113" : "#a9a9b0") + '; display: flex; flex-direction: column; gap: 8px">' + c + "</div>" : ""); }).join("");
    tree.innerHTML = walk("", 0, new Set()) || '<p style="margin:0;font-size:13px;color:#5e5e65">Ajoutez un département pour voir la structure.</p>';
  }
  function initDepts() {
    const box = $("#dep-rows"); if (!box) return;
    box.addEventListener("input", (e) => { const r = e.target.closest("[data-i]"); if (!r) return; const d = D.departments[+r.dataset.i]; const k = e.target.dataset.k; if (!d || !k) return;
      if (k === "parent") d.parent = e.target.value === "— (sommet)" ? "" : e.target.value; else if (k === "n") d.n = Math.max(0, parseInt(e.target.value, 10) || 0); else d[k] = e.target.value;
      save(); renderTree(); renderInvites(); });
    box.addEventListener("change", (e) => { if (e.target.dataset.k === "name") renderDepts(); });
    box.addEventListener("click", (e) => { const b = e.target.closest("[data-del]"); if (!b) return; const d = D.departments[+b.dataset.del];
      dialog({ title: "Supprimer « " + d.name + " » ?", text: "Les départements qui en relèvent remonteront d’un niveau.", ok: "Supprimer" }).then((ok) => { if (!ok) return;
        D.departments.forEach((x) => { if (x.parent === d.name) x.parent = d.parent; }); D.departments.splice(+b.dataset.del, 1); save(); renderDepts(); toast("Département supprimé"); }); });
    $("#dep-add").addEventListener("click", () => dialog({ title: "Nouveau département", fields: [{ name: "name", label: "Département" }, { name: "resp", label: "Responsable" }, { name: "parent", label: "Relève de", options: ["— (sommet)"].concat(deptNames()), value: "Direction" }, { name: "n", label: "Employés", type: "number", value: "3" }], ok: "Ajouter" })
      .then((v) => { if (!v || !v.name) return; D.departments.push({ name: v.name, resp: v.resp, parent: v.parent === "— (sommet)" ? "" : v.parent, n: parseInt(v.n, 10) || 0 }); save(); renderDepts(); toast("« " + v.name + " » ajouté"); }));
    $("#dep-template").addEventListener("click", () => dialog({ title: "Appliquer le gabarit Construction ?", text: "Les 8 départements types remplaceront la liste actuelle.", ok: "Appliquer" }).then((ok) => { if (!ok) return; D.departments = JSON.parse(JSON.stringify(DEF.departments)); save(); renderDepts(); toast("Gabarit Construction appliqué"); }));
    $("#dep-import").addEventListener("click", () => pickFile(".csv,.txt").then((txt) => { if (!txt) return; const rows = parseCSV(txt).filter((r) => r.length >= 2 && !/^d[ée]partement$/i.test(r[0]));
      if (!rows.length) { toast("Aucune ligne lisible : attendu « Département;Responsable;Relève de;Employés »", false); return; }
      D.departments = rows.map((r) => ({ name: r[0], resp: r[1] || "", parent: r[2] && !/sommet/i.test(r[2]) ? r[2] : "", n: parseInt(r[3], 10) || 0 })); save(); renderDepts(); toast(rows.length + " départements importés"); }));
  }

  // ───────────────────────── écran 3 : utilisateurs ─────────────────────────
  const ST = { active: '<span style="font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 999px; background: #111113; color: #ffffff; white-space: nowrap">Active</span>', sent: '<span style="font-size: 12px; font-weight: 600; padding: 4px 9px; border-radius: 999px; border: 1.5px solid #111113; white-space: nowrap">Invitation envoyée</span>', todo: '<span style="font-size: 12px; font-weight: 600; padding: 4px 9px; border-radius: 999px; border: 1.5px dashed #6b6b72; color: #5e5e65; white-space: nowrap">À inviter</span>' };
  function renderUsers() {
    const body = $("#usr-body"); if (!body) return;
    body.innerHTML = D.users.map((u, i) => '<tr data-i="' + i + '" style="border-top: 1px solid #ececef"><td style="padding: 11px 8px 11px 0"><span style="display: flex; align-items: center; gap: 10px"><span style="flex: none; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(160deg, #e9e9ec, #c4c4ca); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px">' + esc(initials(u.name)) + '</span><span style="display: flex; flex-direction: column"><b style="font-weight: 600">' + esc(u.name) + '</b><span style="font-size: 12px; color: #5e5e65">' + esc(u.mail) + '</span></span></span></td><td style="padding: 11px 8px">' + esc(u.dept) + '</td><td style="padding: 11px 8px">' + esc(u.role) + '</td><td style="padding: 11px 0 11px 8px; text-align: right"><button type="button" data-cycle="' + i + '" title="Changer le statut" style="border: none; background: transparent; padding: 0; font: inherit; cursor: pointer">' + ST[u.status] + "</button></td></tr>").join("");
    renderInvites();
    const sel = $("#inv-dept"); if (sel) sel.innerHTML = deptNames().map((n) => "<option>" + esc(n) + "</option>").join("");
  }
  function renderInvites() {
    const count = $("#inv-count"); if (!count) return;
    const total = totalEmployees(); const listed = D.users.filter((u) => u.status !== "todo");
    const invited = Math.min(total, listed.length + (D.extraInvited || 0));
    const active = Math.min(invited, D.users.filter((u) => u.status === "active").length + Math.round((D.extraInvited || 0) * 0.6));
    count.textContent = invited; $("#inv-total").textContent = total; $("#inv-bar").style.width = (total ? Math.round(invited / total * 100) : 0) + "%";
    $("#inv-active").textContent = active + " comptes actifs"; $("#inv-pending").textContent = (invited - active) + " en attente";
    const box = $("#inv-depts"); const main = D.departments.slice(0, 4); const others = D.departments.slice(4);
    const line = (name, a, b) => '<div style="display: flex; flex-direction: column; gap: 5px"><span style="display: flex; justify-content: space-between"><span>' + esc(name) + "</span><b>" + a + " / " + b + '</b></span><span style="display: block; height: 6px; border-radius: 6px; background: #e4e4e8"><span style="display: block; width: ' + (b ? Math.min(100, Math.round(a / b * 100)) : 0) + '%; height: 6px; border-radius: 6px; background: #111113"></span></span></div>';
    const inv = (d) => Math.min(d.n, D.users.filter((u) => u.dept === d.name && u.status !== "todo").length + Math.round(d.n * 0.55));
    box.innerHTML = main.map((d) => line(d.name, inv(d), d.n)).join("") + (others.length ? line("Autres départements", others.reduce((a, d) => a + Math.round(inv(d) * 0.3), 0), others.reduce((a, d) => a + d.n, 0)) : "");
  }
  function initUsers() {
    const btn = $("#inv-btn"); if (!btn) return;
    btn.addEventListener("click", () => { const mail = $("#inv-mail").value.trim(); if (!/.+@.+\..+/.test(mail)) { toast("Entrez un courriel valide.", false); return; }
      if (D.users.some((u) => u.mail.toLowerCase() === mail.toLowerCase())) { toast("Cette personne est déjà dans la liste.", false); return; }
      const local = mail.split("@")[0]; const parts = local.split(/[._-]/); const name = parts.length > 1 ? parts[0][0].toUpperCase() + ". " + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join(" ") : local;
      D.users.unshift({ name, mail, dept: $("#inv-dept").value, role: $("#inv-role").value, status: "sent" }); save(); renderUsers(); $("#inv-mail").value = ""; toast("Invitation envoyée à " + mail); });
    $("#usr-body").addEventListener("click", (e) => { const b = e.target.closest("[data-cycle]"); if (!b) return; const u = D.users[+b.dataset.cycle]; u.status = { todo: "sent", sent: "active", active: "todo" }[u.status]; save(); renderUsers(); });
    $("#inv-sync").addEventListener("click", () => { btn.disabled = true; toast("Synchronisation avec Microsoft Entra ID…");
      setTimeout(() => { const add = [["Catherine Dubois", "Opérations", "Contributrice"], ["Hugo Lemieux", "Ventes", "Contributeur"], ["Sophie Martel", "Ressources humaines", "Gestionnaire"]].filter(([n]) => !D.users.some((u) => u.name === n));
        add.forEach(([n, d, r]) => D.users.push({ name: n, mail: n.toLowerCase().replace(/\s+/, ".").normalize("NFD").replace(/[̀-ͯ]/g, "") + "@" + (D.company.email.split("@")[1] || "exemple.ca"), dept: d, role: r, status: "sent" }));
        btn.disabled = false; save(); renderUsers(); toast(add.length ? add.length + " comptes synchronisés depuis Entra ID" : "Annuaire déjà à jour"); }, 1200); });
    $("#inv-import").addEventListener("click", () => pickFile(".csv,.txt").then((txt) => { if (!txt) return; const rows = parseCSV(txt).filter((r) => /@/.test(r[0] || "") || /@/.test(r[1] || "")); let n = 0;
      rows.forEach((r) => { const mail = r.find((c) => /@/.test(c)); const name = r.find((c) => c && !/@/.test(c) && !deptNames().includes(c)) || mail.split("@")[0]; if (D.users.some((u) => u.mail === mail)) return; D.users.push({ name, mail, dept: r.find((c) => deptNames().includes(c)) || deptNames()[0], role: "Contributeur", status: "sent" }); n++; });
      save(); renderUsers(); toast(n ? n + " invitations créées depuis le fichier" : "Aucun courriel trouvé dans le fichier", !!n); }));
  }

  // ───────────────────────── écran 4 : objectifs ─────────────────────────
  function chipGroup(boxSel, isOn, onPick) {
    const box = $(boxSel); if (!box) return;
    const paint = () => $$("button", box).forEach((b) => { const on = isOn(b.textContent.replace(/^✓\s*/, "").trim()); b.style.background = on ? "#111113" : (b.style.borderColor ? "#ffffff" : "#f1f1f3"); b.style.color = on ? "#ffffff" : "#111113"; if (b.style.borderWidth || /border: 1.5px/.test(b.getAttribute("style") || "")) { b.style.borderColor = on ? "#111113" : "#dcdce0"; } b.textContent = (b.dataset.check === "1" ? (on ? "✓ " : "") : "") + b.textContent.replace(/^✓\s*/, "").trim(); });
    box.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; onPick(b.textContent.replace(/^✓\s*/, "").trim()); paint(); });
    paint();
  }
  const GRADC = "radial-gradient(130% 160% at 90% -10%, #4a4a4f 0%, #1a1a1d 40%, #070708 100%)";
  function renderObjectives() {
    const list = $("#obj-list"); if (!list) return;
    $("#obj-badge").textContent = D.objectives.length + (D.objectives.length > 1 ? " objectifs" : " objectif");
    list.innerHTML = D.objectives.map((o, i) => {
      const dark = o.status !== "draft";
      const head = '<span style="font-size: 12.5px; font-weight: 600; letter-spacing: 0.06em">' + esc(o.cat.toUpperCase()) + " · POIDS " + o.weight + " %</span>";
      const badge = o.status === "creating" ? '<span style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #ffffff; color: #111113">En création</span>' : '<button type="button" data-objdel="' + i + '" aria-label="Retirer" style="border: none; background: transparent; color: inherit; font: inherit; font-size: 16px; cursor: pointer; line-height: 1">×</button>';
      return '<div style="border-radius: 22px; padding: 20px; background: ' + (dark ? GRADC : "#f4f4f6") + "; color: " + (dark ? "#ffffff" : "#111113") + "; display: flex; flex-direction: column; gap: 12px" + (o.status === "creating" ? "; box-shadow: 0 0 0 3px #ffffff, 0 0 0 5px #111113" : "") + '"><div style="display: flex; justify-content: space-between; align-items: flex-start">' + head + badge + '</div><span style="font-size: 16px; font-weight: 600">' + esc(o.title) + '</span><div style="display: flex; justify-content: space-between; font-size: 13px; color: ' + (dark ? "#d4d4d8" : "#5e5e65") + '"><span>•••• ' + o.depts + ' département' + (o.depts > 1 ? "s" : "") + '</span><b style="color: ' + (dark ? "#ffffff" : "#111113") + '; font-size: 18px">' + esc(o.target) + "</b></div></div>";
    }).join("");
  }
  function objTarget() { const op = $("#obj-op").value, a = $("#obj-min").value.trim(), b = $("#obj-max").value.trim(), u = $("#obj-unit").value.trim(); return (op === "↔" && b ? a + " à " + b : (op === "↔" ? "" : op + " ") + a).trim() + " " + u; }
  function initObjectives() {
    if (!$("#obj-add")) return;
    chipGroup("#obj-cats", (t) => t === D.objForm.cat, (t) => { D.objForm.cat = t; save(); });
    $$("#obj-depts button").forEach((b) => (b.dataset.check = "1"));
    chipGroup("#obj-depts", (t) => D.objForm.depts.includes(t), (t) => { const i = D.objForm.depts.indexOf(t); if (i < 0) D.objForm.depts.push(t); else D.objForm.depts.splice(i, 1); save(); });
    $("#obj-add").addEventListener("click", () => { const title = $("#obj-title").value.trim(); if (!title) { toast("Donnez un nom à l’objectif.", false); return; }
      D.objectives.forEach((o) => { if (o.status === "creating") o.status = "active"; });
      D.objectives.unshift({ cat: D.objForm.cat, weight: Math.max(5, Math.round(100 / (D.objectives.length + 1))), title, depts: D.objForm.depts.length, target: objTarget(), status: "creating", horizon: $("#obj-horizon").value });
      save(); renderObjectives(); toast("Objectif « " + title + " » ajouté"); });
    $("#obj-list").addEventListener("click", (e) => { const b = e.target.closest("[data-objdel]"); if (!b) return; D.objectives.splice(+b.dataset.objdel, 1); save(); renderObjectives(); toast("Objectif retiré"); });
    $("#ind-add").addEventListener("click", () => dialog({ title: "Nouvel indicateur", fields: [{ name: "dept", label: "Département", options: deptNames() }, { name: "name", label: "Indicateur", placeholder: "Ex. : Délai de facturation" }, { name: "target", label: "Cible", placeholder: "Ex. : 10 j / dossier" }], ok: "Ajouter" })
      .then((v) => { if (!v || !v.name) return; D.indicators.push(v); save(); renderIndicators(); toast("Indicateur ajouté"); }));
    renderIndicators(); renderObjectives();
  }
  function renderIndicators() {
    const box = $("#ind-rows"); if (!box) return; $$("[data-extra]", box).forEach((n) => n.remove());
    D.indicators.forEach((i) => box.insertAdjacentHTML("beforeend", '<div data-extra="1" style="display: grid; grid-template-columns: 150px minmax(0, 1fr) 150px; gap: 12px; align-items: center; padding: 12px 16px; border-top: 1px solid #ececef; font-size: 14px"><span style="font-size: 12px; font-weight: 700; letter-spacing: 0.1em">' + esc(i.dept.toUpperCase().slice(0, 11)) + "</span><span>" + esc(i.name) + '</span>' + (i.target ? '<span style="justify-self: end; font-size: 12.5px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: #e4e4e8">' + esc(i.target) + "</span>" : '<span style="justify-self: end; font-size: 12.5px; font-style: italic; padding: 3px 9px; border-radius: 999px; border: 1.5px dashed #b9b9bf; color: #5e5e65">cible à définir</span>') + "</div>"));
  }

  // ───────────────────────── écran 5 : nouveau diagnostic ─────────────────────────
  function initTask() {
    const name = $("#task-name"); if (!name) return;
    name.value = D.task.name; $("#task-dept").innerHTML = deptNames().map((n) => "<option" + (n === D.task.dept ? " selected" : "") + ">" + esc(n) + "</option>").join("");
    $("#task-proc").innerHTML = ["Nouveau processus"].concat(D.processes.map((p) => p.title)).map((t) => "<option" + (t === D.task.proc ? " selected" : "") + ">" + esc(t) + "</option>").join("");
    chipGroup("#task-freq", (t) => t === D.task.freq, (t) => { D.task.freq = t; save(); });
    $$("#task-win span").forEach((s) => { s.style.cursor = "pointer"; });
    $("#task-win").addEventListener("click", (e) => { const s = e.target.closest("span"); if (!s || /exclue/.test(s.textContent)) return; const t = s.textContent.replace(/^✓\s*/, "").trim(); const i = D.task.windows.indexOf(t);
      if (i < 0) { D.task.windows.push(t); s.style.background = "#111113"; s.style.color = "#fff"; s.textContent = "✓ " + t; } else { D.task.windows.splice(i, 1); s.style.background = "#f1f1f3"; s.style.color = "#111113"; s.textContent = t; } save(); });
    $("#rec-start").addEventListener("click", (e) => {
      if (!$("#task-consent").checked) { e.preventDefault(); toast("Cochez le consentement à l’enregistrement pour démarrer.", false); return; }
      if (!name.value.trim()) { e.preventDefault(); toast("Donnez un nom à la tâche.", false); return; }
      if (!D.task.windows.length) { e.preventDefault(); toast("Choisissez au moins une fenêtre à capter.", false); return; }
      D.task.name = name.value.trim(); D.task.dept = $("#task-dept").value; D.task.proc = $("#task-proc").value;
      D.rec = { elapsed: 0, paused: false, running: true, clicks: 0, captures: 0, actions: [{ t: 0, label: "Démarrage de l’enregistrement", tag: "Lens", kind: "f" }], total: null, pool: 0 };
      save(); applyTask(); toast("Enregistrement démarré"); });
  }
  function applyTask() { $$(".task-title").forEach((el) => (el.textContent = D.task.name)); $$(".task-sub").forEach((el) => (el.textContent = "Diagnostic · " + D.task.dept + (el.closest("#enregistrement") ? " · " + (D.users.find((u) => u.dept === D.task.dept) || { name: D.company.first }).name : ""))); }

  // ───────────────────────── écran 6 : enregistrement ─────────────────────────
  const POOL = [["Ouverture de Plans_Laval.pdf", "Document entrant", "f"], ["Mesures prises dans la maquette", "Revit · 46 clics", "f"], ["Création de Estimation_Projet-Laval.xlsx", "Excel · document sortant", "f"], ["Quantités ressaisies depuis Revit", "Saisie double détectée", "dark"], ["Courriel envoyé au fournisseur", "Outlook · demande de prix", "f"], ["Copie des prix dans Excel", "Saisie double détectée", "dark"], ["Mise en page de la soumission", "Word", "f"], ["Soumission.pdf exportée", "Document sortant", "f"]];
  let recTimer = null;
  function actionRow(a) {
    const t = mmss(a.t); if (a.kind === "dark") return '<li style="display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 10px; padding: 10px 0; border-top: 1px solid #ececef"><span style="font-size: 12.5px; color: #5e5e65">' + t + '</span><span style="display: flex; flex-direction: column; gap: 3px"><span style="font-size: 13.5px">' + esc(a.label) + '</span><span style="align-self: flex-start; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #111113; color: #ffffff">' + esc(a.tag) + "</span></span></li>";
    if (a.kind === "live") return '<li style="display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 10px; padding: 10px 0; border-top: 1px solid #ececef"><span style="font-size: 12.5px; font-weight: 700">' + t + '</span><span style="display: flex; flex-direction: column; gap: 3px"><span style="font-size: 13.5px; font-weight: 600">' + esc(a.label) + '</span><span style="align-self: flex-start; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 999px; border: 1.5px solid #111113">' + esc(a.tag) + "</span></span></li>";
    return '<li style="display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 10px; padding: 10px 0; border-top: 1px solid #ececef"><span style="font-size: 12.5px; color: #5e5e65">' + t + '</span><span style="display: flex; flex-direction: column; gap: 3px"><span style="font-size: 13.5px">' + esc(a.label) + '</span><span style="align-self: flex-start; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: #f1f1f3">' + esc(a.tag) + "</span></span></li>";
  }
  function renderRec() {
    const timer = $("#rec-timer"); if (!timer) return;
    if (!D.rec) { timer.textContent = "Enregistrement · 00:00"; $("#rec-actions").innerHTML = '<li style="padding: 10px 0; font-size: 13.5px; color: #5e5e65">Aucun enregistrement en cours. Lancez-en un depuis « Créer un diagnostic ».</li>'; return; }
    timer.textContent = (D.rec.paused ? "En pause · " : "Enregistrement · ") + mmss(D.rec.elapsed);
    $("#rec-dot").style.background = D.rec.paused ? "#9a9aa1" : "#111113"; $("#rec-pause").textContent = D.rec.paused ? "Reprendre" : "Pause";
    $("#rec-counter").textContent = D.rec.clicks + " clics · " + D.rec.captures + " captures";
    const live = D.rec.running ? [{ t: D.rec.elapsed, label: "Saisie des quantités en cours…", tag: ($("#task-win") ? (D.task.windows[0] || "Écran") : "Excel") + " · en direct", kind: "live" }] : [];
    $("#rec-actions").innerHTML = D.rec.actions.concat(live).map(actionRow).join("");
  }
  function tick() { if (!D.rec || !D.rec.running || D.rec.paused || location.hash !== "#enregistrement") return; D.rec.elapsed++; D.rec.clicks += Math.random() < 0.7 ? 1 : 0;
    if (D.rec.elapsed % 7 === 0) { const p = POOL[D.rec.pool % POOL.length]; D.rec.pool++; D.rec.captures++; D.rec.clicks += 3 + Math.floor(Math.random() * 6); D.rec.actions.push({ t: D.rec.elapsed, label: p[0], tag: p[1], kind: p[2] }); }
    if (D.rec.elapsed % 5 === 0) save(); renderRec(); }
  function initRec() {
    if (!$("#rec-timer")) return; recTimer = setInterval(tick, 1000);
    $("#rec-pause").addEventListener("click", () => { if (!D.rec) return; D.rec.paused = !D.rec.paused; D.rec.actions.push({ t: D.rec.elapsed, label: D.rec.paused ? "Pause" : "Reprise", tag: "Lens", kind: "f" }); save(); renderRec(); });
    $("#rec-note").addEventListener("click", () => { if (!D.rec) { toast("Aucun enregistrement en cours.", false); return; } dialog({ title: "Note vocale", text: "La transcription est simulée : tapez le contenu de la note.", fields: [{ name: "txt", label: "Note", type: "textarea" }], ok: "Ajouter" }).then((v) => { if (!v || !v.txt) return; D.rec.actions.push({ t: D.rec.elapsed, label: "Note : " + v.txt, tag: "Note vocale", kind: "f" }); save(); renderRec(); toast("Note ajoutée à la chronologie"); }); });
    $("#rec-finish").addEventListener("click", () => { if (!D.rec) return; D.rec.running = false; D.rec.total = D.rec.elapsed; D.rec.actions.push({ t: D.rec.elapsed, label: "Fin de l’enregistrement", tag: "Lens", kind: "f" });
      const p = D.processes.find((x) => x.title === D.task.name); if (p) p.recs++; else D.processes.unshift({ dept: D.task.dept.toUpperCase(), ver: "v1", title: D.task.name, steps: D.steps.length, recs: 1 }); D.activeProc = Math.max(0, D.processes.findIndex((x) => x.title === D.task.name)); D.procValidated = false;
      save(); renderProcesses(); applyTask(); toast("Enregistrement terminé · processus proposé à partir de " + D.rec.clicks + " clics"); });
  }

  // ───────────────────────── écran 7 : diagnostic ─────────────────────────
  function procCard(p, i, on) {
    return '<button type="button" data-proc="' + i + '" style="border: none; text-align: left; font: inherit; cursor: pointer; border-radius: 22px; padding: 20px; min-height: 120px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px; ' + (on ? "background: " + GRADC + "; color: #ffffff; box-shadow: 0 18px 36px -20px rgba(0, 0, 0, 0.55)" : "background: #ffffff; color: #111113; box-shadow: 0 24px 48px -28px rgba(17, 17, 19, 0.18)") + '"><span style="display: flex; justify-content: space-between; width: 100%; font-size: 13px; font-weight: 600; letter-spacing: 0.06em"><span>' + esc(p.dept) + "</span><span>" + esc(p.ver) + '</span></span><span style="font-size: 17px; font-weight: 600">' + esc(p.title) + '</span><span style="display: flex; justify-content: space-between; width: 100%; font-size: 13px; color: ' + (on ? "#d4d4d8" : "#5e5e65") + '"><span>•••• ' + p.steps + " étapes</span><span>" + p.recs + " enregistrement" + (p.recs > 1 ? "s" : "") + "</span></span></button>";
  }
  function renderProcesses() {
    const box = $("#proc-cards"); if (!box) return; box.innerHTML = D.processes.map((p, i) => procCard(p, i, i === D.activeProc)).join("");
    const t = $$("#diagnostic .task-title"); const p = D.processes[D.activeProc]; if (p) t.forEach((el) => (el.textContent = p.title));
    const sub = $("#diagnostic .task-sub"); if (sub && p) sub.textContent = "Diagnostic · " + p.dept[0] + p.dept.slice(1).toLowerCase();
    const tot = $("#diagnostic .rec-total"); if (tot) tot.textContent = D.rec && D.rec.total != null ? mmss(D.rec.total) : "12:48";
    const v = $("#epc-validate"); if (v) { v.textContent = D.procValidated ? "Processus validé ✓" : "Valider le processus"; }
  }
  function ficheInputs() { return $$("#fiche input, #fiche select, #fiche textarea"); }
  function ficheCompute() {
    const row = (k) => $('#fiche .f-row[data-f="' + k + '"]'); const val = (k) => { const r = row(k); if (!r) return 0; const ins = $$("input", r); const a = num(ins[0].value); const b = ins.length > 3 ? num(ins[1].value) : a; return (a + b) / 2; };
    const unitOf = (k) => { const r = row(k); if (!r) return ""; const ins = $$("input", r); return (ins[ins.length - 2].value || "").toLowerCase(); };
    const toDays = (v, u) => /min/.test(u) ? v / 60 / (D.company.day || 8) : /^h/.test(u) ? v / (D.company.day || 8) : /sem/.test(u) ? v * 5 : v;
    const cycle = toDays(val("tt"), unitOf("tt")) + toDays(val("wb"), unitOf("wb")) + toDays(val("wa"), unitOf("wa"));
    const c = $("#f-cycle"); if (c) c.textContent = "≈ " + fr(cycle, 1) + (cycle >= 2 ? " jours" : " jour");
    const freq = val("freq"), cap = val("cap"); const util = cap ? Math.round(freq / cap * 100) : 0;
    const u = $("#f-util"); if (u) u.textContent = util + " %"; const b = $("#f-util-badge"); if (b) { b.textContent = util > 100 ? "Goulot" : util > 85 ? "À surveiller" : "OK"; b.style.background = util > 100 ? "#111113" : "transparent"; b.style.color = util > 100 ? "#fff" : "#111113"; }
    const ins = ficheInputs().filter((i) => i.tagName !== "SELECT"); const filled = ins.filter((i) => String(i.value).trim() !== "").length;
    const fc = $("#fiche-count"); if (fc) fc.textContent = filled + " / " + ins.length + " champs"; const fb = $("#fiche-bar"); if (fb) fb.style.width = Math.round(filled / ins.length * 100) + "%";
    return { cycle, util };
  }
  function initDiag() {
    if (!$("#proc-cards")) return;
    $("#proc-cards").addEventListener("click", (e) => { const b = e.target.closest("[data-proc]"); if (!b) return; D.activeProc = +b.dataset.proc; D.procValidated = false; save(); renderProcesses(); });
    $("#proc-new").addEventListener("click", () => dialog({ title: "Nouveau processus", fields: [{ name: "dept", label: "Département", options: deptNames() }, { name: "title", label: "Nom du processus", placeholder: "Ex. : Clôturer un chantier" }], ok: "Créer" }).then((v) => { if (!v || !v.title) return; D.processes.unshift({ dept: v.dept.toUpperCase(), ver: "v1", title: v.title, steps: 0, recs: 0 }); D.activeProc = 0; D.procValidated = false; save(); renderProcesses(); toast("Processus créé · enregistrez une tâche pour le cartographier"); }));
    $("#epc-validate").addEventListener("click", () => { D.procValidated = true; const p = D.processes[D.activeProc]; if (p) p.ver = "v" + (parseInt(p.ver.slice(1), 10) + 1); save(); renderProcesses(); toast("Processus validé · nouvelle version publiée"); });
    $("#epc-addstep").addEventListener("click", () => dialog({ title: "Étape hors écran", text: "Une étape réalisée sans ordinateur (appel, visite de chantier, signature…).", fields: [{ name: "title", label: "Étape" }, { name: "dur", label: "Durée", placeholder: "Ex. : 15 min" }, { name: "who", label: "Qui exécute", value: D.users[0] ? D.users[0].name : "" }, { name: "sys", label: "Support", value: "Téléphone" }], ok: "Ajouter" })
      .then((v) => { if (!v || !v.title) return; D.steps.push(v); const p = D.processes[D.activeProc]; if (p) p.steps = D.steps.length;
        $("#epc").insertAdjacentHTML("beforeend", '<div style="display: flex; flex-direction: column; align-items: center"><span style="width: 1.5px; height: 22px; background: #111113"></span><span style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid #111113"></span></div><div style="display: flex; align-items: center"><div style="width: 100px; min-height: 74px; box-sizing: border-box; border: 1.5px solid #6b6b72; border-radius: 50%; padding: 8px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px"><span style="font-size: 10px; font-weight: 600; letter-spacing: 0.14em; color: #5e5e65">QUI</span><span style="font-size: 10.5px; font-weight: 600; padding: 2px 7px; border: 1px solid #6b6b72; border-radius: 999px; white-space: nowrap">' + esc(v.who) + '</span></div><span style="width: 14px; height: 1.5px; background: #111113"></span><div style="width: 150px; min-height: 64px; box-sizing: border-box; border-radius: 10px; padding: 8px 10px; background: ' + GRADC + '; color: #ffffff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 2px"><span style="font-size: 11px; color: #c9c9ce">Étape ' + D.steps.length + " · " + esc(v.dur || "hors écran") + '</span><b style="font-size: 13.5px; font-weight: 600; line-height: 1.2">' + esc(v.title) + '</b></div><span style="width: 14px; height: 1.5px; background: #111113"></span><div style="width: 100px; min-height: 52px; box-sizing: border-box; border: 1.5px solid #111113; border-left: 6px solid #111113; padding: 6px 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 2px"><span style="font-size: 9.5px; font-weight: 600; letter-spacing: 0.12em; color: #5e5e65">SUPPORT</span><span style="font-size: 12px">' + esc(v.sys) + "</span></div></div>");
        save(); renderProcesses(); toast("Étape « " + v.title + " » ajoutée au processus"); }));
    $("#epc-export").addEventListener("click", () => { const p = D.processes[D.activeProc] || { title: D.task.name }; const id = (s) => s.normalize("NFD").replace(/[^\w]/g, "_");
      let x = '<?xml version="1.0" encoding="UTF-8"?>\n<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Lens_' + id(p.title) + '" targetNamespace="https://lounici.ca/lens">\n  <bpmn:process id="P_' + id(p.title) + '" name="' + esc(p.title) + '" isExecutable="false">\n    <bpmn:startEvent id="start" name="Demande reçue"/>\n';
      D.steps.forEach((s, i) => { x += '    <bpmn:task id="t' + (i + 1) + '" name="' + esc(s.title) + '"><bpmn:documentation>' + esc(s.dur) + " · " + esc(s.who) + " · " + esc(s.sys) + "</bpmn:documentation></bpmn:task>\n"; });
      x += '    <bpmn:endEvent id="end" name="Terminé"/>\n'; const nodes = ["start"].concat(D.steps.map((_, i) => "t" + (i + 1))).concat(["end"]);
      for (let i = 0; i < nodes.length - 1; i++) x += '    <bpmn:sequenceFlow id="f' + i + '" sourceRef="' + nodes[i] + '" targetRef="' + nodes[i + 1] + '"/>\n';
      x += "  </bpmn:process>\n</bpmn:definitions>\n"; download(id(p.title) + ".bpmn", x, "application/xml"); toast("Fichier BPMN téléchargé"); });
    const f = $("#fiche"); ficheInputs().forEach((inp, i) => { if (D.fiche[i] != null) inp.value = D.fiche[i]; });
    f.addEventListener("input", (e) => { const i = ficheInputs().indexOf(e.target); if (i >= 0) { D.fiche[i] = e.target.value; D.ficheSaved = false; } ficheCompute(); });
    f.addEventListener("change", () => save());
    $("#fiche-save").addEventListener("click", () => { D.ficheSaved = true; save(); const r = ficheCompute(); toast("Fiche enregistrée · cycle ≈ " + fr(r.cycle, 1) + " j · utilisation " + r.util + " %"); });
    $("#diag-validate").addEventListener("click", () => { D.procValidated = true; save(); toast("Diagnostic validé · visible sur l’accueil et le tableau de bord"); });
    $("#diag-rerecord").addEventListener("click", () => { D.rec = { elapsed: 0, paused: false, running: true, clicks: 0, captures: 0, actions: [{ t: 0, label: "Nouvel enregistrement", tag: "Lens", kind: "f" }], total: null, pool: 0 }; save(); renderRec(); });
    ficheCompute(); renderProcesses();
  }

  // ───────────────────────── écran 8 : accueil ─────────────────────────
  function renderMapList() {
    const wrap = $("#map-wrap"); if (!wrap) return; let list = $("#map-listview");
    if (!list) { list = document.createElement("div"); list.id = "map-listview"; list.hidden = true; wrap.parentNode.insertBefore(list, wrap.nextSibling); }
    const cov = (d) => Math.min(100, Math.round(((D.users.filter((u) => u.dept === d.name && u.status !== "todo").length + 2) / Math.max(1, d.n)) * 100));
    list.innerHTML = '<table style="width: 100%; border-collapse: collapse; font-size: 14px"><thead><tr style="color: #5e5e65; font-size: 12.5px; text-align: left"><th style="font-weight: 500; padding: 6px 8px 10px 0">Département</th><th style="font-weight: 500; padding: 6px 8px 10px">Responsable</th><th style="font-weight: 500; padding: 6px 8px 10px">Relève de</th><th style="font-weight: 500; padding: 6px 8px 10px">Employés</th><th style="font-weight: 500; padding: 6px 0 10px 8px; text-align: right">Couverture</th></tr></thead><tbody>' +
      D.departments.map((d) => '<tr style="border-top: 1px solid #ececef"><td style="padding: 11px 8px 11px 0"><b>' + esc(d.name) + '</b></td><td style="padding: 11px 8px">' + esc(d.resp) + '</td><td style="padding: 11px 8px; color: #5e5e65">' + esc(d.parent || "—") + '</td><td style="padding: 11px 8px">' + d.n + '</td><td style="padding: 11px 0 11px 8px; text-align: right"><b>' + cov(d) + " %</b></td></tr>").join("") + "</tbody></table>";
  }
  function renderHR() {
    const rows = $("#rh-rows"); if (!rows) return;
    const total = totalEmployees(); const users = D.users;
    const active = users.filter((u) => u.status === "active").length, sent = users.filter((u) => u.status === "sent").length, todo = users.filter((u) => u.status === "todo").length;
    const accounts = Math.min(total, active + sent + (Number(D.extraInvited) || 0));
    const engaged = total ? Math.round((accounts / total) * 100) : 0;
    $("#rh-kicker").textContent = "RESSOURCES HUMAINES · " + D.departments.length + " DÉPARTEMENTS · " + total + " EMPLOYÉS";
    const tile = (v, l, dark) => '<div style="border-radius: 20px; padding: 16px; min-height: 92px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; gap: 4px; background: ' + (dark ? GRADC : "#f4f4f6") + "; color: " + (dark ? "#ffffff" : "#111113") + '"><b style="font-size: 26px; line-height: 1">' + v + '</b><span style="font-size: 12.5px; color: ' + (dark ? "#d4d4d8" : "#5e5e65") + '">' + l + "</span></div>";
    $("#rh-kpis").innerHTML = tile(total, "employés", true) + tile(accounts, "comptes Lens") + tile(sent, sent > 1 ? "invitations en attente" : "invitation en attente") + tile(todo, "encore à inviter") + tile(engaged + " %", "de l’équipe engagée");
    const max = Math.max(1, ...D.departments.map((d) => Number(d.n) || 0));
    const COLS = "minmax(140px, 1.2fr) minmax(0, 2fr) 90px 110px";
    rows.innerHTML = '<div style="display: grid; grid-template-columns: ' + COLS + '; gap: 12px; align-items: center; padding: 8px 0 10px; font-size: 12.5px; color: #5e5e65"><span>Département</span><span>Effectif</span><span style="text-align: right">Comptes actifs</span><span style="text-align: right">Responsable</span></div>' +
      D.departments.map((d) => { const n = Number(d.n) || 0; const us = users.filter((u) => u.dept === d.name); const act = us.filter((u) => u.status === "active").length;
        return '<div style="display: grid; grid-template-columns: ' + COLS + '; gap: 12px; align-items: center; padding: 11px 0; border-top: 1px solid #ececef; font-size: 14px"><span style="display: flex; flex-direction: column; gap: 2px"><b>' + esc(d.name) + "</b>" + (d.parent ? '<span style="font-size: 12px; color: #5e5e65">Relève de ' + esc(d.parent) + "</span>" : "") + '</span><span style="display: flex; align-items: center; gap: 10px"><span style="flex: 1; display: block; height: 10px; border-radius: 10px; background: #e4e4e8"><span style="display: block; width: ' + Math.round((n / max) * 100) + '%; height: 10px; border-radius: 10px; background: #111113"></span></span><b style="min-width: 56px; font-size: 13px">' + n + ' empl.</b></span><span style="text-align: right">' + act + " / " + us.length + '</span><span style="text-align: right; color: #5e5e65">' + esc(d.resp) + "</span></div>"; }).join("");
  }
  function initHome() {
    if (!$("#home-name")) return; applyCompany(); renderMapList(); renderHR();
    $("#rh-invite").addEventListener("click", () => { location.hash = "utilisateurs"; });
    const seg = (on, off) => { on.style.background = "#111113"; on.style.color = "#fff"; off.style.background = "transparent"; off.style.color = "#111113"; };
    $("#map-global").addEventListener("click", () => { $("#map-wrap").hidden = false; $("#map-listview").hidden = true; seg($("#map-global"), $("#map-list")); });
    $("#map-list").addEventListener("click", () => { renderMapList(); $("#map-wrap").hidden = true; $("#map-listview").hidden = false; seg($("#map-list"), $("#map-global")); });
    $("#map-add-dept").addEventListener("click", () => { location.hash = "departements"; });
    $("#struct-edit").addEventListener("click", () => { location.hash = "departements"; });
    $("#part-invite").addEventListener("click", () => { location.hash = "utilisateurs"; });
    const add = $('#accueil a[href="#tableau"]'); if (add && /Ajouter/.test(add.textContent)) add.setAttribute("href", "#objectifs");
    $$(".map-dept").forEach((b) => b.addEventListener("click", () => { const d = D.departments.find((x) => x.name === b.dataset.dept); const pct = b.querySelector("span") ? b.querySelector("span").textContent : "";
      dialog({ title: b.dataset.dept, text: (d ? "Responsable : " + d.resp + " · " + d.n + " employés · " : "") + "couverture du diagnostic " + pct + ". Ouvrir les diagnostics de ce département ?", ok: "Voir les diagnostics" }).then((ok) => { if (!ok) return; const i = D.processes.findIndex((p) => p.dept.toLowerCase() === b.dataset.dept.toLowerCase()); if (i >= 0) D.activeProc = i; save(); renderProcesses(); location.hash = "diagnostic"; }); }));
    $("#home-search").addEventListener("input", (e) => { const q = e.target.value.trim().toLowerCase(); $$(".map-dept").forEach((b) => { b.style.opacity = !q || b.dataset.dept.toLowerCase().includes(q) ? "1" : "0.25"; }); });
    $("#home-search").addEventListener("keydown", (e) => { if (e.key !== "Enter") return; const q = e.target.value.trim().toLowerCase(); if (!q) return;
      const p = D.processes.find((x) => x.title.toLowerCase().includes(q)); if (p) { D.activeProc = D.processes.indexOf(p); save(); renderProcesses(); location.hash = "diagnostic"; return; }
      const u = D.users.find((x) => x.name.toLowerCase().includes(q)); if (u) { location.hash = "utilisateurs"; toast(u.name + " · " + u.dept + " · " + u.role); return; } toast("Aucun résultat pour « " + e.target.value.trim() + " »", false); });
    $$("#accueil nav > div:last-child, #tableau nav > div:last-child").forEach((card) => { if (/Diagnostic en cours/.test(card.textContent)) { card.style.cursor = "pointer"; card.addEventListener("click", () => { location.hash = "diagnostic"; }); } });
  }
  function initNotifs() { $$(".notif-btn").forEach((b) => b.addEventListener("click", () => { const pending = D.users.filter((u) => u.status === "sent").length; const todo = D.users.filter((u) => u.status === "todo").length;
    const items = ["Goulot confirmé : « Estimer les quantités » à 112 % d’utilisation", pending + " invitation" + (pending > 1 ? "s" : "") + " en attente de réponse", todo ? todo + " employé" + (todo > 1 ? "s" : "") + " encore à inviter" : null, D.rec && D.rec.running ? "Un enregistrement est en cours (" + mmss(D.rec.elapsed) + ")" : null, D.procValidated ? "Processus « " + (D.processes[D.activeProc] || {}).title + " » validé" : "Le processus « " + (D.processes[D.activeProc] || {}).title + " » attend votre validation"].filter(Boolean);
    dialog({ title: "Notifications", text: items.map((s) => "• " + s).join("\n"), ok: "Fermer" }); $("#dlg-text").style.whiteSpace = "pre-line"; })); }

  // ───────────────────────── écran 9 : tableau de bord ─────────────────────────
  const DASH = [{ cat: "FINANCIER", val: "14 à 16 %", desc: "de profitabilité sur les contrats de construction", real: "Réel 10 à 12 % · écart −4 pts" }, { cat: "OPÉRATIONNEL", val: "6 j", desc: "de délai de soumission par dossier", real: "Réel 9,2 j · écart +3,2 j" }, { cat: "HUMAIN", val: "80 %", desc: "de charge moyenne des équipes", real: "Réel 92 % · écart +12 pts" }];
  const CHARTS = { monthly: { labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep"], v: [64, -24, 88, 132, -14, 104, 72, -34, 56], total: "−48 600 $" }, weekly: { labels: ["S27", "S28", "S29", "S30", "S31", "S32", "S33", "S34", "S35", "S36", "S37", "S38"], v: [40, 58, -12, 76, 92, -30, 64, 48, -18, 70, 36, 54], total: "−12 300 $" } };
  function renderChart() {
    const c = $("#chart"); if (!c) return; const d = CHARTS[D.chartMode]; const per = D.period === "T2 2026" ? 0.8 : D.period === "Année 2026" ? 1.15 : 1;
    c.style.gridTemplateColumns = "repeat(" + d.labels.length + ", minmax(0, 1fr))";
    c.innerHTML = d.labels.map((l, i) => { const v = Math.round(d.v[i] * per); const up = v > 0; return '<div style="display: flex; flex-direction: column; align-items: center">' + (up ? '<div style="height: 150px; width: 100%; display: flex; align-items: flex-end; justify-content: center"><span style="width: 100%; max-width: 46px; height: ' + Math.min(150, v) + 'px; border-radius: 14px; background: #111113"></span></div><div style="height: 44px; width: 100%; border-top: 1px solid #d8d8dc"></div>' : '<div style="height: 150px; width: 100%"></div><div style="height: 44px; width: 100%; border-top: 1px solid #d8d8dc; display: flex; justify-content: center"><span style="width: 100%; max-width: 46px; height: ' + Math.min(44, -v) + 'px; border-radius: 0 0 12px 12px; border: 2px solid #111113; border-top: none; box-sizing: border-box"></span></div>') + '<span style="font-size: 12px; color: #5e5e65; margin-top: 6px">' + l + "</span></div>"; }).join("");
    const t = $("#chart-total"); if (t) t.textContent = (per === 1 ? d.total : "−" + fr(Math.round(num(d.total) * per / 100) * 100, 0) + " $").replace(/ /g, " ");
    const seg = (on, off) => { on.style.background = "#111113"; on.style.color = "#fff"; off.style.background = "transparent"; off.style.color = "#111113"; }; seg($(D.chartMode === "weekly" ? "#chart-weekly" : "#chart-monthly"), $(D.chartMode === "weekly" ? "#chart-monthly" : "#chart-weekly"));
  }
  function renderSys() { $$(".sys-sub").forEach((t) => { const n = parseInt(t.dataset.usage, 10) || 0; t.textContent = D.sysMode === "cost" ? fr(n * 35, 0) + " $ / mois" : t.dataset.usage; }); const seg = (on, off) => { on.style.background = "#111113"; on.style.color = "#fff"; off.style.background = "transparent"; off.style.color = "#111113"; }; if ($("#sys-usage")) seg($(D.sysMode === "cost" ? "#sys-cost" : "#sys-usage"), $(D.sysMode === "cost" ? "#sys-usage" : "#sys-cost")); }
  function renderDashGlobal() { const g = $("#dash-global"); if (!g) return; const o = DASH[D.dashObj] || DASH[0]; const sp = $$(":scope > span, :scope > b", g); sp[0].textContent = "OBJECTIF GLOBAL · " + o.cat; sp[1].textContent = o.val; sp[2].textContent = o.desc; sp[3].textContent = o.real; }
  function applyReal() { Object.keys(D.realOverrides).forEach((k) => { const a = $$('#tableau .ind[data-ind="' + CSS.escape(k) + '"]')[0]; if (!a) return; const r = D.realOverrides[k]; const dark = $$("div", a).find((d) => /RÉEL/.test(d.textContent) && /radial-gradient/.test(d.getAttribute("style") || "")); if (dark) { const b = dark.querySelector("b"); if (b) b.textContent = r.value; const units = $$("span > span", dark).filter((s) => /rgba\(255, 255, 255, 0.14\)/.test(s.getAttribute("style") || "")); if (units[0] && r.unit) units[0].textContent = r.unit; } }); }
  function initDash() {
    if (!$("#dash-period")) return; $("#dash-period").value = D.period; $("#dash-obj").selectedIndex = D.dashObj;
    $("#dash-period").addEventListener("change", (e) => { D.period = e.target.value; save(); renderChart(); toast("Période : " + D.period); });
    $("#dash-obj").addEventListener("change", (e) => { D.dashObj = e.target.selectedIndex; save(); renderDashGlobal(); });
    $("#chart-weekly").addEventListener("click", () => { D.chartMode = "weekly"; save(); renderChart(); }); $("#chart-monthly").addEventListener("click", () => { D.chartMode = "monthly"; save(); renderChart(); });
    $("#sys-usage").addEventListener("click", () => { D.sysMode = "usage"; save(); renderSys(); }); $("#sys-cost").addEventListener("click", () => { D.sysMode = "cost"; save(); renderSys(); });
    $("#dash-ind-add").addEventListener("click", () => dialog({ title: "Nouvel indicateur", fields: [{ name: "dept", label: "Département", options: deptNames() }, { name: "name", label: "Indicateur" }, { name: "target", label: "Cible", placeholder: "Ex. : 5 j / dossier" }, { name: "desc", label: "Pourquoi il compte", type: "textarea" }], ok: "Ajouter" }).then((v) => { if (!v || !v.name) return; D.indicators.push(v); save(); addDashInd(v); toast("Indicateur ajouté au tableau de bord"); }));
    $("#dash-cols").addEventListener("click", (e) => { const b = e.target.closest(".ind-plus"); if (!b) return; const art = b.closest(".ind"); const name = art.dataset.ind;
      dialog({ title: "Nouvelle mesure · " + name, text: "Saisissez la valeur réelle observée sur la période.", fields: [{ name: "value", label: "Valeur réelle" }, { name: "unit", label: "Unité", placeholder: "%, jours, h…" }, { name: "src", label: "Source", options: ["Mesurée", "Estimée", "Donnée système"] }], ok: "Enregistrer" }).then((v) => { if (!v || !v.value) return; D.realOverrides[name] = v; save(); applyReal(); toast("Mesure enregistrée pour « " + name + " »"); }); });
    $$(".cat-btn").forEach((b) => b.addEventListener("click", () => { $$(".cat-btn").forEach((x) => { x.style.background = "#f4f4f6"; x.style.color = "#111113"; x.style.boxShadow = "none"; $$("svg", x).forEach((s) => s.setAttribute("stroke", "#111113")); $$("span span", x).forEach((s) => (s.style.color = "#5e5e65")); }); b.style.background = GRADC; b.style.color = "#fff"; $$("svg", b).forEach((s) => s.setAttribute("stroke", "#ffffff")); $$("span span", b).forEach((s) => (s.style.color = "#d4d4d8")); const i = DASH.findIndex((d) => d.cat === b.dataset.cat.toUpperCase()); if (i >= 0) { D.dashObj = i; $("#dash-obj").selectedIndex = i; save(); renderDashGlobal(); } toast("Catégorie : " + b.dataset.cat); }));
    D.indicators.forEach(addDashInd); renderChart(); renderSys(); renderDashGlobal(); applyReal();
  }
  function addDashInd(v) {
    const cols = $("#dash-cols"); if (!cols) return; let col = $$(":scope > div", cols).find((c) => c.textContent.trim().toUpperCase().startsWith(v.dept.toUpperCase()));
    const art = '<article class="ind" data-ind="' + esc(v.name) + '" style="display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border-top: 1px solid #ececef"><div style="display: flex; justify-content: space-between; align-items: center; gap: 8px"><b style="font-size: 14px">' + esc(v.name) + '</b><button type="button" class="ind-plus" aria-label="Ajouter une mesure" style="flex: none; width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid #111113; background: #ffffff; font: inherit; font-weight: 700; cursor: pointer">+</button></div><p style="margin: 0; font-size: 12px; line-height: 1.45; color: #5e5e65">' + esc(v.desc || "Indicateur ajouté manuellement.") + '</p><div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px">' + (v.target ? '<div style="border-radius: 12px; padding: 9px 10px; background: #e4e4e8; display: flex; flex-direction: column; gap: 6px"><span style="font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; color: #3a3a3f">CIBLE</span><span style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px"><b style="font-size: 11.5px; padding: 3px 8px; border-radius: 999px; background: #ffffff">' + esc(v.target) + "</b></span></div>" : '<div style="border-radius: 12px; padding: 8px 9px; border: 1.5px dashed #b9b9bf; display: flex; flex-direction: column; gap: 6px"><span style="font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; color: #5e5e65">CIBLE</span><span style="font-size: 11px; font-style: italic; color: #5e5e65">aucune cible fixée</span></div>') + '<div style="border-radius: 12px; padding: 8px 9px; border: 1.5px dashed #b9b9bf; display: flex; flex-direction: column; gap: 6px"><span style="font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; color: #5e5e65">ÉCART</span><span style="font-size: 11px; font-style: italic; color: #5e5e65">en attente du réel</span></div></div><div style="border-radius: 12px; padding: 9px 10px; background: ' + GRADC + '; color: #ffffff; display: flex; align-items: flex-end; justify-content: space-between; gap: 8px"><span style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; color: #c9c9ce">RÉEL</span><span style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px"><b style="font-size: 11.5px; padding: 3px 8px; border-radius: 999px; background: #ffffff; color: #111113">—</b><span style="font-size: 11px; padding: 3px 7px; border-radius: 999px; background: rgba(255, 255, 255, 0.14)">à mesurer</span></span></span></div></article>';
    if (col) { col.querySelector("div > div:last-child, div").parentNode; $$(":scope > div > div", col)[0].insertAdjacentHTML("beforeend", art); const cnt = $$(":scope > div > div > div:first-child > span", col)[0]; if (cnt) cnt.textContent = $$("article", col).length + " indicateurs"; }
    else cols.insertAdjacentHTML("beforeend", '<div style="display: flex; flex-direction: column; align-items: stretch"><span style="align-self: center; width: 1.5px; height: 20px; background: #111113"></span><div style="background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e4e4e8; display: flex; flex-direction: column"><div style="background: ' + GRADC + '; color: #ffffff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em">' + esc(v.dept.toUpperCase()) + '<span style="font-size: 11.5px; font-weight: 500; letter-spacing: 0; color: #c9c9ce">1 indicateur</span></div>' + art.replace("; border-top: 1px solid #ececef", "") + "</div></div>");
  }

  // ───────────────────────── écrans 10 à 12 : analyses, projets, paramètres ─────────────────────────
  function insights() {
    const r = $("#fiche") ? ficheCompute() : { util: 112, cycle: 1.6 }; const pending = D.users.filter((u) => u.status === "sent").length; const todo = D.users.filter((u) => u.status === "todo").length;
    const list = [
      { t: "Goulot : « Estimer les quantités »", d: "Utilisation à " + r.util + " % pour " + fr(r.cycle, 1) + " j de cycle. La saisie des quantités est refaite à la main depuis Revit.", gain: "14 h / sem", dept: "Estimation", pri: 1 },
      { t: "Double saisie Revit → Excel", d: "Deux échanges manuels détectés pendant l’enregistrement. Un export direct des quantités supprime la ressaisie.", gain: "9 h / sem", dept: "Estimation", pri: 1 },
      { t: "Attente fournisseurs : 1,5 j", d: "Les demandes de prix partent par courriel une à une. Une demande groupée par projet réduit l’attente.", gain: "1 j de cycle", dept: "Approvisionnement", pri: 2 },
      pending + todo ? { t: (pending + todo) + " employés sans compte actif", d: "La couverture du diagnostic plafonne tant que l’équipe n’est pas invitée.", gain: "couverture +" + Math.min(30, (pending + todo) * 4) + " pts", dept: "Ressources humaines", pri: 2 } : null,
      D.objectives.length < 4 ? { t: "Objectif client absent", d: "Aucun objectif global ne porte sur la conversion des soumissions (24 % contre 30 % visés).", gain: "cible à fixer", dept: "Ventes", pri: 3 } : null,
      { t: "Licences peu utilisées", d: "Quatre systèmes servent à moins de 5 étapes. Vérifier les abonnements avant le renouvellement.", gain: "≈ 1 200 $ / mois", dept: "Technologies", pri: 3 }].filter(Boolean);
    return list.sort((a, b) => a.pri - b.pri);
  }
  function renderIA() {
    const box = $("#ia-list"); if (!box) return; const items = insights(); $("#ia-count").textContent = items.length + " constat" + (items.length > 1 ? "s" : "");
    box.innerHTML = items.map((it, i) => '<div style="border-radius: 20px; padding: 18px; display: flex; flex-direction: column; gap: 8px; ' + (it.pri === 1 ? "background: " + GRADC + "; color: #fff" : "background: #f4f4f6") + '"><div style="display: flex; justify-content: space-between; gap: 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; ' + (it.pri === 1 ? "color: #c9c9ce" : "color: #5e5e65") + '"><span>PRIORITÉ ' + it.pri + "</span><span>" + esc(it.dept.toUpperCase()) + '</span></div><b style="font-size: 15px">' + esc(it.t) + '</b><span style="font-size: 13px; line-height: 1.45; ' + (it.pri === 1 ? "color: #d4d4d8" : "color: #5e5e65") + '">' + esc(it.d) + '</span><div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px"><b style="font-size: 14px">' + esc(it.gain) + '</b><button type="button" data-mkprj="' + i + '" style="min-height: 34px; padding: 0 12px; border-radius: 999px; border: none; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; ' + (it.pri === 1 ? "background: #fff; color: #111113" : "background: #111113; color: #fff") + '">Créer un projet</button></div></div>').join("");
    const plan = $("#ia-plan"); plan.innerHTML = items.map((it, i) => '<li style="display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid #ececef; font-size: 14px"><b style="width: 34px; height: 34px; border-radius: 50%; background: ' + (i === 0 ? "#111113" : "#e4e4e8") + "; color: " + (i === 0 ? "#fff" : "#111113") + '; display: flex; align-items: center; justify-content: center">' + (i + 1) + '</b><span><b style="font-weight: 600">' + esc(it.t) + '</b><span style="display: block; font-size: 12.5px; color: #5e5e65">' + esc(it.dept) + " · " + esc(it.gain) + '</span></span><span style="font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: #f1f1f3">' + (i < 2 ? "30 jours" : i < 4 ? "60 jours" : "90 jours") + "</span></li>").join("");
  }
  function initIA() { if (!$("#ia-list")) return; renderIA();
    $("#ia-refresh").addEventListener("click", () => { toast("Analyse des données en cours…"); setTimeout(() => { renderIA(); toast("Analyses régénérées à partir des données actuelles"); }, 900); });
    $("#ia-list").addEventListener("click", (e) => { const b = e.target.closest("[data-mkprj]"); if (!b) return; const it = insights()[+b.dataset.mkprj]; if (D.projects.some((p) => p.name === it.t)) { toast("Un projet existe déjà pour ce constat.", false); return; } D.projects.unshift({ name: it.t, dept: it.dept, resp: (D.departments.find((d) => d.name === it.dept) || {}).resp || D.company.first, gain: it.gain, status: "À faire" }); save(); renderProjects(); toast("Projet créé · voir l’onglet Projets"); });
    $("#ia-export").addEventListener("click", () => { download("lens-feuille-de-route.csv", "﻿Priorité;Constat;Département;Gain visé;Horizon\n" + insights().map((it, i) => [it.pri, it.t, it.dept, it.gain, i < 2 ? "30 jours" : i < 4 ? "60 jours" : "90 jours"].map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\n"), "text/csv;charset=utf-8"); toast("Feuille de route exportée"); });
  }
  let prjFilter = "";
  function renderProjects() {
    const body = $("#prj-body"); if (!body) return; const rows = D.projects.map((p, i) => ({ p, i })).filter(({ p }) => !prjFilter || p.status === prjFilter);
    body.innerHTML = rows.length ? rows.map(({ p, i }) => '<tr style="border-top: 1px solid #ececef"><td style="padding: 11px 8px 11px 0"><b style="font-weight: 600">' + esc(p.name) + '</b></td><td style="padding: 11px 8px">' + esc(p.dept) + '</td><td style="padding: 11px 8px">' + esc(p.resp) + '</td><td style="padding: 11px 8px">' + esc(p.gain) + '</td><td style="padding: 11px 8px"><select data-st="' + i + '" style="height: 34px; border-radius: 999px; border: 1.5px solid #dcdce0; background: #fff; font: inherit; font-size: 12.5px; font-weight: 600; padding: 0 10px">' + ["À faire", "En cours", "Terminé"].map((s) => "<option" + (s === p.status ? " selected" : "") + ">" + s + "</option>").join("") + '</select></td><td style="padding: 11px 0 11px 8px; text-align: right"><button type="button" data-prjdel="' + i + '" aria-label="Supprimer" style="width: 32px; height: 32px; border-radius: 50%; border: none; background: #f1f1f3; font: inherit; cursor: pointer">×</button></td></tr>').join("") : '<tr><td colspan="6" style="padding: 16px 0; color: #5e5e65; font-size: 13.5px">Aucun projet dans ce filtre.</td></tr>';
  }
  function initProjects() { if (!$("#prj-body")) return; renderProjects();
    $("#prj-filters").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; prjFilter = b.dataset.filter; $$("button", $("#prj-filters")).forEach((x) => { x.style.background = x === b ? "#111113" : "#f1f1f3"; x.style.color = x === b ? "#fff" : "#111113"; }); renderProjects(); });
    $("#prj-body").addEventListener("change", (e) => { const s = e.target.closest("[data-st]"); if (!s) return; D.projects[+s.dataset.st].status = s.value; save(); toast("Statut mis à jour"); renderProjects(); });
    $("#prj-body").addEventListener("click", (e) => { const b = e.target.closest("[data-prjdel]"); if (!b) return; D.projects.splice(+b.dataset.prjdel, 1); save(); renderProjects(); toast("Projet supprimé"); });
    $("#prj-add").addEventListener("click", () => dialog({ title: "Nouveau projet", fields: [{ name: "name", label: "Projet" }, { name: "dept", label: "Département", options: deptNames() }, { name: "resp", label: "Responsable" }, { name: "gain", label: "Gain visé", placeholder: "Ex. : 6 h / sem" }], ok: "Créer" }).then((v) => { if (!v || !v.name) return; D.projects.unshift({ name: v.name, dept: v.dept, resp: v.resp || (D.departments.find((d) => d.name === v.dept) || {}).resp || "", gain: v.gain || "à estimer", status: "À faire" }); save(); renderProjects(); toast("Projet créé"); }));
  }
  function initSettings() {
    if (!$("#set-save")) return; const f = { name: $("#set-name"), sector: $("#set-sector"), size: $("#set-size"), email: $("#set-email"), first: $("#set-first"), day: $("#set-day") };
    const fill = () => { f.name.value = D.company.name; f.sector.value = D.company.sector; f.size.value = D.company.size; f.email.value = D.company.email; f.first.value = D.company.first; f.day.value = D.company.day;
      $("#set-stats").textContent = D.departments.length + " départements · " + totalEmployees() + " employés · " + D.users.length + " comptes · " + D.objectives.length + " objectifs · " + D.processes.length + " processus · " + D.projects.length + " projets. Données conservées dans ce navigateur seulement.";
      $("#set-account").textContent = D.company.email + " · connecté par le portail client de Groupe Lounici."; };
    fill();
    $("#set-save").addEventListener("click", () => { D.company.name = f.name.value.trim() || D.company.name; D.company.sector = f.sector.value; D.company.size = f.size.value; D.company.email = f.email.value.trim(); D.company.first = f.first.value.trim() || "Maya"; D.company.day = Math.min(24, Math.max(1, parseInt(f.day.value, 10) || 8)); save(); applyCompany(); fill(); if ($("#fiche")) ficheCompute(); toast("Paramètres enregistrés"); });
    $("#set-export").addEventListener("click", () => { download("lens-" + D.company.name.replace(/[^\w]+/g, "-").toLowerCase() + ".json", JSON.stringify(D, null, 2), "application/json"); toast("Espace exporté"); });
    $("#set-import").addEventListener("click", () => pickFile(".json").then((txt) => { if (!txt) return; try { const o = JSON.parse(txt); if (!o.company || !o.departments) throw 0; D = Object.assign(JSON.parse(JSON.stringify(DEF)), o); save(); toast("Espace importé · rechargement"); setTimeout(() => location.reload(), 600); } catch (_) { toast("Fichier JSON invalide", false); } }));
    $("#set-reset").addEventListener("click", () => dialog({ title: "Réinitialiser la démonstration ?", text: "Toutes les données saisies dans ce navigateur seront remplacées par celles de départ.", ok: "Réinitialiser" }).then((ok) => { if (!ok) return; try { localStorage.removeItem(KEY); } catch (_) {} location.hash = "connexion"; location.reload(); }));
    $("#set-logout").addEventListener("click", () => { try { sessionStorage.removeItem("portail"); } catch (_) {} location.href = "index.html"; });
  }

  // ───────────────────────── bascules génériques Oui / Non et boutons de filtre ─────────────────────────
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.id || b.dataset.st) return; const p = b.parentElement; if (!p || p.tagName !== "SPAN") return;
    const st = p.getAttribute("style") || ""; if (!/padding: 3px; border-radius: 999px; background: #f1f1f3/.test(st)) return;
    $$("button", p).forEach((x) => { x.style.background = x === b ? "#111113" : "transparent"; x.style.color = x === b ? "#ffffff" : "#111113"; }); if ($("#fiche") && $("#fiche").contains(b)) { D.ficheSaved = false; }
  });

  // ───────────────────────── démarrage ─────────────────────────
  function refresh() { const h = location.hash.slice(1) || "connexion"; if (h === "enregistrement") renderRec(); if (h === "diagnostic") { renderProcesses(); ficheCompute(); } if (h === "accueil") { applyCompany(); renderMapList(); renderHR(); } if (h === "analyses") renderIA(); if (h === "projets") renderProjects(); if (h === "parametres") initSettings.fill && initSettings.fill(); }
  function init() {
    initConnexion(); initDepts(); renderDepts(); initUsers(); renderUsers(); initObjectives(); initTask(); initRec(); renderRec(); initDiag(); initHome(); initNotifs(); initDash(); initIA(); initProjects(); initSettings(); applyCompany(); applyTask();
    window.addEventListener("hashchange", refresh); refresh();
    const dlg = $("#dlg"); if (dlg) dlg.addEventListener("close", () => { $("#dlg-text").style.whiteSpace = ""; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
