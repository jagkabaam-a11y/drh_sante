const supabaseClient = supabase.createClient(
  "https://ngsvrffgjksmmzyebptl.supabase.co",
  "sb_publishable_KLWH2wcZAqj3KHfkvzDTCg_oAEx9KS5"
);

let selectedDossier = null;

(async () => {
  // --- SÉCURITÉ ---
  const role = sessionStorage.getItem("role");
  if (role !== "entree" && role !== "admin") {
    alert("Accès refusé !");
    location.href = "login.html";
    return;
  }

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) { location.href = "login.html"; return; }

  // --- FONCTION INTERNE POUR L'UPLOAD ---
  async function traiterUpload(numero) {
    const file = document.getElementById("scanFile").files[0];
    if (!file) return null; 

    const fileExt = file.name.split('.').pop();
    const filePath = `entrees/${numero}_${Date.now()}.${fileExt}`;
    
    const { error: storageError } = await supabaseClient.storage
      .from("scans")
      .upload(filePath, file);

    if (storageError) throw new Error("Erreur de stockage : " + storageError.message);

    const { data: publicLink } = supabaseClient.storage
      .from("scans")
      .getPublicUrl(filePath);

    return publicLink.publicUrl;
  }

  // --- RECHERCHE AUTO-COMPLÉTION (Inclut Matricule) ---
  document.getElementById("searchInput").addEventListener("input", async e => {
    const q = e.target.value.trim();
    const list = document.getElementById("autocompleteList");
    list.innerHTML = "";
    if (q.length < 2) return;

    // On recherche par Nom, N° Enregistrement OU Matricule
    const { data } = await supabaseClient.from("problemes_agents")
      .select("*")
      .or(`nom_complet.ilike.%${q}%,numero_enregistrement.ilike.%${q}%,matricule.ilike.%${q}%`)
      .limit(5);

    if (data) {
      data.forEach(d => {
        const div = document.createElement("div");
        div.textContent = `${d.nom_complet} (Mat: ${d.matricule || 'N/A'}) - N° ${d.numero_enregistrement}`;
        div.onclick = () => {
          selectedDossier = d;
          list.innerHTML = "";
          document.getElementById("searchInput").value = div.textContent;
          
          // Remplissage du formulaire
          document.getElementById("objet").value = d.objet || "";
          document.getElementById("nom_complet").value = d.nom_complet || "";
          document.getElementById("matricule").value = d.matricule || ""; // Ajouté
          document.getElementById("fonction").value = d.fonction || "";
          document.getElementById("grade").value = d.grade || "";
          document.getElementById("structure").value = d.structure || "";
          document.getElementById("telephone").value = d.telephone || "";
          document.getElementById("numero_enregistrement").value = d.numero_enregistrement || "";
          document.getElementById("statut").value = d.statut || "receptionne";

          document.getElementById("saveButton").style.display = "none";
          document.getElementById("editButton").style.display = "inline-block";
        };
        list.appendChild(div);
      });
    }
  });

  // --- VISUALISATION DU DOCUMENT ---
  document.getElementById("scanFile").addEventListener("change", e => {
    const preview = document.getElementById("preview");
    const file = e.target.files[0];
    preview.innerHTML = ""; 

    if (file) {
      if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.maxWidth = "100%";
        img.style.maxHeight = "200px";
        img.style.marginTop = "10px";
        img.style.borderRadius = "5px";
        preview.appendChild(img);
      } else if (file.type === "application/pdf") {
        preview.innerHTML = `<div style="padding:15px; color:#000080;"><b>📄 PDF sélectionné :</b><br>${file.name}</div>`;
      }
    } else {
      preview.innerText = "Aucun fichier sélectionné";
    }
  });

  // --- ACTION : ENREGISTRER (NOUVEAU DOSSIER) ---
  document.getElementById("entreeForm").onsubmit = async e => {
    e.preventDefault();
    const statusDiv = document.getElementById("status");
    statusDiv.style.display = "block";
    statusDiv.innerText = "⏳ Enregistrement en cours...";

    try {
      const numero = document.getElementById("numero_enregistrement").value;
      const scanUrl = await traiterUpload(numero);

      const payload = {
        numero_enregistrement: numero,
        matricule: document.getElementById("matricule").value, // NOUVEAU
        objet: document.getElementById("objet").value,
        nom_complet: document.getElementById("nom_complet").value,
        fonction: document.getElementById("fonction").value,
        grade: document.getElementById("grade").value,
        structure: document.getElementById("structure").value,
        telephone: document.getElementById("telephone").value,
        statut: "Réceptionné", // Premier statut du circuit DRH
        date_arrivee: new Date().toISOString(),
        scan_entree_url: scanUrl,
        user_id: user.id // Pour savoir qui a fait la saisie
      };

      const { error } = await supabaseClient.from("problemes_agents").insert([payload]);
      if (error) throw error;
      
      alert("Dossier enregistré avec succès !"); 
      location.reload();
    } catch (err) {
      alert("❌ Erreur : " + err.message);
      statusDiv.style.display = "none";
    }
  };

  // --- ACTION : METTRE À JOUR (DOSSIER EXISTANT) ---
  document.getElementById("editButton").onclick = async () => {
    if (!selectedDossier) return;
    const statusDiv = document.getElementById("status");
    statusDiv.style.display = "block";
    statusDiv.innerText = "⏳ Mise à jour en cours...";

    try {
      const numero = document.getElementById("numero_enregistrement").value;
      const scanUrl = await traiterUpload(numero);

      const payload = {
        numero_enregistrement: numero,
        matricule: document.getElementById("matricule").value, // NOUVEAU
        objet: document.getElementById("objet").value,
        nom_complet: document.getElementById("nom_complet").value,
        fonction: document.getElementById("fonction").value,
        grade: document.getElementById("grade").value,
        structure: document.getElementById("structure").value,
        telephone: document.getElementById("telephone").value,
        statut: document.getElementById("statut").value
      };

      if (scanUrl) payload.scan_entree_url = scanUrl;

      const { error } = await supabaseClient.from("problemes_agents")
        .update(payload)
        .eq("id", selectedDossier.id);

      if (error) throw error;

      alert("Dossier mis à jour avec succès !"); 
      location.reload();
    } catch (err) {
      alert("❌ Erreur : " + err.message);
      statusDiv.style.display = "none";
    }
  };

})();