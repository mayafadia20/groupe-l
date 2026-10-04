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
})();
