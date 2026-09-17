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

  // Apparition au défilement
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = document.querySelectorAll(".reveal, .tile, .device, .card-meter, .tile-stat");

  const show = (el) => {
    el.classList.add("is-visible");
    // Jauge circulaire
    el.querySelectorAll(".meter").forEach((m) => {
      const value = Number(m.dataset.value || 0);
      const fill = m.querySelector(".meter-fill");
      const circumference = 2 * Math.PI * 50;
      if (fill) fill.style.strokeDashoffset = String(circumference * (1 - value / 100));
    });
    // Compteurs
    el.querySelectorAll(".count").forEach((c) => animateCount(c));
  };

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
