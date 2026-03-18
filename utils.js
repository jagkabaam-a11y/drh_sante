const getVal = id => document.getElementById(id).value.trim();
const setVal = (id, val) => document.getElementById(id).value = val || "";

function notify(msg, color) {
  const el = document.getElementById("status");
  el.style.display = "block";
  el.innerText = msg;
  el.style.backgroundColor = color === "green" ? "#d4edda" : color === "red" ? "#f8d7da" : "#e2e3e5";
  el.style.color = color === "green" ? "#155724" : color === "red" ? "#721c24" : "#383d41";
}

function buildPayload(user, extra = {}) {
  const fields = [
    "objet",
    "nom_complet",
    "fonction",
    "grade",
    "structure",
    "telephone",
    "numero_enregistrement",
    "statut"
  ];

  const payload = {};
  fields.forEach(f => payload[f] = getVal(f));
  payload.user_id = user.id; // Garde la trace de qui a créé le dossier

  return Object.assign(payload, extra);
}

function previewFile(input) {
  const file = input.files[0];
  const preview = document.getElementById("preview");
  preview.innerHTML = "";
  if (!file) { preview.innerText = "Aucun fichier sélectionné"; return; }

  if (file.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = "100%";
    img.style.borderRadius = "5px";
    preview.appendChild(img);
  } else if (file.type === "application/pdf") {
    preview.innerHTML = `<p>📄 Fichier PDF détecté : <strong>${file.name}</strong></p>`;
  } else {
    preview.innerText = "Format non supporté (Utilisez PDF ou Image).";
  }
}