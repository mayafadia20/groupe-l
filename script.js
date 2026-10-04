// Groupe L — interactions légères (aucune dépendance)

(function () {
  // Année du pied de page
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Menu mobile
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // Grand menu « Our expertise » : ouvert au clic, fermé par un second clic,
  // un clic ailleurs, la touche Échap ou le choix d'un lien
  const megaBtn = document.querySelector(".has-menu");
  const mega = megaBtn && document.getElementById(megaBtn.getAttribute("aria-controls"));
  if (megaBtn && mega) {
    const setMega = (open) => {
      mega.hidden = !open;
      megaBtn.setAttribute("aria-expanded", String(open));
    };
    megaBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setMega(mega.hidden);
    });
    mega.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.target.closest("a")) setMega(false);
    });
    document.addEventListener("click", () => setMega(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMega(false); });
  }

  // Portail client : la fenêtre de connexion s'ouvre au clic sur « Client Portal »
  // et se ferme par la croix, un clic sur le fond assombri ou la touche Échap
  const portalLink = document.querySelector(".nav-portal");
  const modal = document.getElementById("portail");
  if (portalLink && modal && typeof modal.showModal === "function") {
    portalLink.addEventListener("click", (e) => {
      e.preventDefault();
      modal.querySelector(".login-form").reset();
      modal.querySelector(".login-msg").hidden = true;
      modal.showModal();
    });
    modal.querySelector(".modal-close").addEventListener("click", () => modal.close());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
    // Pas de serveur derrière le formulaire : la vérification se fait dans le navigateur,
    // en comparant l'empreinte SHA-256 de « courriel:mot de passe » à celle attendue.
    // Le mot de passe n'apparaît pas en clair ici, mais ce n'est pas une vraie protection.
    const EMPREINTE = "662106a346a21f1d9d48fb777b0976a1970b79b6ea7f2b4e9139b79bfa8a4b47";
    const form = modal.querySelector(".login-form");
    const msg = form.querySelector(".login-msg");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const courriel = form.querySelector("[name=identifiant]").value.trim().toLowerCase();
      const mdp = form.querySelector("[name=mot-de-passe]").value;
      if (!courriel || !mdp) { msg.textContent = "Please enter your username and password."; msg.hidden = false; return; }
      if ((await sha256(courriel + ":" + mdp)) !== EMPREINTE) {
        msg.textContent = "Incorrect username or password.";
        msg.hidden = false;
        return;
      }
      try { sessionStorage.setItem("portail", "1"); } catch (_) {}
      window.location.href = "portail.html";
    });
    modal.addEventListener("close", () => { form.reset(); form.querySelector(".login-msg").hidden = true; });
  }

  // Page du portail : accessible seulement après le formulaire de connexion ;
  // « Log out » efface la session et ramène à l'accueil
  if (document.body.classList.contains("portail")) {
    let ouvert = false;
    try { ouvert = sessionStorage.getItem("portail") === "1"; } catch (_) {}
    if (!ouvert) { window.location.replace("index.html#portail"); return; }
    const sortie = document.getElementById("deconnexion");
    if (sortie) sortie.addEventListener("click", () => { try { sessionStorage.removeItem("portail"); } catch (_) {} });
  }

  // Apparition au défilement et compteurs
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = document.querySelectorAll(".reveal");

  const animateCount = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const target = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || "";
    if (reduced) { el.textContent = target + suffix; return; }
    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const show = (el) => {
    el.classList.add("is-visible");
    el.querySelectorAll(".count").forEach(animateCount);
  };

  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
    );
    targets.forEach((t) => io.observe(t));
  } else {
    targets.forEach(show);
  }

  // Empreinte SHA-256 en hexadécimal : fonction native du navigateur quand elle
  // existe (https), sinon une implémentation en JavaScript pur
  async function sha256(texte) {
    const octets = new TextEncoder().encode(texte);
    if (window.crypto && crypto.subtle) {
      const h = await crypto.subtle.digest("SHA-256", octets);
      return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return sha256js(octets);
  }
  function sha256js(octets) {
    const K = [];
    for (let i = 0, n = 2; K.length < 64; n++) {
      if ([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113,
           127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251,
           257, 263, 269, 271, 277, 281, 283, 293, 307, 311][i] === n) { K.push(Math.floor(Math.cbrt(n) % 1 * 2 ** 32) >>> 0); i++; }
    }
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const l = octets.length, bits = l * 8, total = Math.ceil((l + 9) / 64) * 64;
    const m = new Uint8Array(total); m.set(octets); m[l] = 0x80;
    new DataView(m.buffer).setUint32(total - 4, bits >>> 0); new DataView(m.buffer).setUint32(total - 8, Math.floor(bits / 2 ** 32));
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    const W = new Uint32Array(64);
    for (let o = 0; o < total; o += 64) {
      const v = new DataView(m.buffer, o, 64);
      for (let t = 0; t < 16; t++) W[t] = v.getUint32(t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
        const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H = H.map((x, i) => (x + [a, b, c, d, e, f, g, h][i]) >>> 0);
    }
    return H.map((x) => x.toString(16).padStart(8, "0")).join("");
  }
})();
