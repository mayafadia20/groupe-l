// Accès à la base en ligne de Lens (Supabase) : comptes, espace de l'entreprise, vidéos d'enregistrement.
// Chargé après lens-config.js. Sans configuration, LensCloud.enabled vaut false et tout reste local.
(function () {
  const cfg = window.LENS_CONFIG || {};
  const enabled = !!(cfg.url && cfg.anonKey);
  const ref = enabled ? ((/https?:\/\/([a-z0-9-]+)\./.exec(cfg.url) || [])[1] || "") : "";
  let client = null, lib = null, me = null;

  async function sb() {
    if (!enabled) throw new Error("Base en ligne non configurée");
    if (client) return client;
    lib = lib || await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    client = lib.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return client;
  }
  const fail = (e, quoi) => { const err = new Error(quoi + " : " + (e && e.message || e)); err.cause = e; throw err; };

  window.LensCloud = {
    enabled, ref,
    /** Vrai si une session Supabase est présente dans ce navigateur (test rapide, sans réseau). */
    hasLocalSession() { try { return enabled && !!localStorage.getItem("sb-" + ref + "-auth-token"); } catch (_) { return false; } },

    // ───── comptes ─────
    async session() { const c = await sb(); const { data } = await c.auth.getSession(); return data.session || null; },
    async signIn(email, password) { const c = await sb(); const { data, error } = await c.auth.signInWithPassword({ email: String(email).trim().toLowerCase(), password }); if (error) fail(error, "Connexion refusée"); me = null; return data.user; },
    async signOut() { me = null; try { const c = await sb(); await c.auth.signOut(); } catch (_) {} },
    async resetPassword(email, redirectTo) { const c = await sb(); const { error } = await c.auth.resetPasswordForEmail(String(email).trim().toLowerCase(), { redirectTo }); if (error) fail(error, "Envoi du courriel impossible"); },
    async updatePassword(password) { const c = await sb(); const { error } = await c.auth.updateUser({ password }); if (error) fail(error, "Changement de mot de passe impossible"); },
    /** Profil de la personne connectée : { user_id, entreprise_id, role, nom, email, entreprises: { nom } } ou null. */
    async me() {
      if (me) return me;
      const c = await sb(); const { data: s } = await c.auth.getSession(); if (!s.session) return null;
      const { data, error } = await c.from("membres").select("user_id, entreprise_id, role, nom, email, entreprises(nom)").eq("user_id", s.session.user.id).maybeSingle();
      if (error) fail(error, "Profil introuvable"); me = data || null; return me;
    },

    // ───── espace de l'entreprise (document JSON = l'état complet de Lens) ─────
    async loadSpace(entrepriseId) { const c = await sb(); const { data, error } = await c.from("espaces").select("data, updated_at").eq("entreprise_id", entrepriseId).maybeSingle(); if (error) fail(error, "Lecture de l’espace impossible"); return data; },
    async saveSpace(entrepriseId, d) { const c = await sb(); const { error } = await c.from("espaces").upsert({ entreprise_id: entrepriseId, data: d }, { onConflict: "entreprise_id" }); if (error) fail(error, "Enregistrement en ligne impossible"); },

    // ───── vidéos d'enregistrement ─────
    async uploadRecording(entrepriseId, blob, name, meta) {
      const c = await sb(); const path = entrepriseId + "/" + name;
      const { error } = await c.storage.from("enregistrements").upload(path, blob, { contentType: blob.type || "video/webm", upsert: false });
      if (error) fail(error, "Envoi de la vidéo impossible");
      const { data, error: e2 } = await c.from("enregistrements").insert(Object.assign({ entreprise_id: entrepriseId, fichier: path, taille: blob.size, type: blob.type || "video/webm" }, meta || {})).select("id").single();
      if (e2) fail(e2, "Fiche de l’enregistrement impossible");
      return { id: data.id, path };
    },
    async listRecordings(entrepriseId) { const c = await sb(); const { data, error } = await c.from("enregistrements").select("id, processus, departement, qui, debut, duree_s, fichier, taille, statut, cree_le").eq("entreprise_id", entrepriseId).order("cree_le", { ascending: false }); if (error) fail(error, "Lecture des enregistrements impossible"); return data || []; },
    async recordingUrl(path, seconds) { const c = await sb(); const { data, error } = await c.storage.from("enregistrements").createSignedUrl(path, seconds || 3600); if (error) fail(error, "Lien de la vidéo impossible"); return data.signedUrl; },

    // ───── gestion des accès (Groupe Lounici et administrateurs d'entreprise) ─────
    async allowEmail(email, entrepriseId, role, nom) { const c = await sb(); const { error } = await c.from("acces_autorises").upsert({ email: String(email).trim().toLowerCase(), entreprise_id: entrepriseId, role: role || "membre", nom: nom || null }, { onConflict: "email" }); if (error) fail(error, "Ajout à la liste des accès impossible"); },
    async signUpOther(email, password, nom) {
      lib = lib || await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
      const c2 = lib.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const { data, error } = await c2.auth.signUp({ email: String(email).trim().toLowerCase(), password, options: { data: { name: nom } } });
      if (error) fail(error, "Création du compte impossible"); return data.user;
    },
  };
})();
