const firebaseConfig = {
  apiKey: "AIzaSyAWfXwkMWJTNDs-jPQSpDGJcGItOYcq5iQ",
  authDomain: "bohemilk-61bfe.firebaseapp.com",
  projectId: "bohemilk-61bfe",
  storageBucket: "bohemilk-61bfe.firebasestorage.app",
  messagingSenderId: "549481770450",
  appId: "1:549481770450:web:7a08ebc79a5a56e338ec0b",
  measurementId: "G-BBJTQZCQRF"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let vybranyRok = new Date().getFullYear();

// 📤 Odeslání formuláře (přidání nebo úprava firmy)
document.getElementById("formular").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("idName").value.trim();
  const typ = document.querySelector('input[name="type"]:checked')?.value;
  const editId = document.getElementById("editIdFirma").value;
  const adresa = document.getElementById("idAdresa").value.trim();


  if (!name || !typ) {
    document.getElementById("stav").innerText = "Vyplň všechny údaje.";
    return;
  }

  try {
    if (editId) {
      await db.collection("companies").doc(editId).update({
        nazev: name,
        adresa: adresa,
        typ: typ
      });
      alert(`Firma "${name}" byla upravena.`);
    } else {
      await db.collection("companies").add({
        nazev: name,
        adresa: adresa,
        typ: typ
      });
      alert(`Firma "${name}" byla přidána.`);
    }
  
    document.getElementById("formular").reset();
    document.getElementById("editIdFirma").value = "";
  
    await nactiFirmy(); // ✅ počkej na nové načtení dat
  } catch (e) {
    console.error("Chyba:", e);
    document.getElementById("stav").innerText = "Chyba při ukládání ❌";
  }
  
});

// 🧾 Načtení firem a tržeb
async function nactiFirmy() {
  const tbody = document.querySelector("table tbody");
  tbody.innerHTML = "";

  const trzbySnapshot = await db.collection("sales").get();
  const soucty = {};

  trzbySnapshot.forEach((doc) => {
    const data = doc.data();
    const d = new Date(data.datum);
    if (isNaN(d)) return;

    const rok = d.getFullYear();
    if (rok !== vybranyRok) return; // ✅ filtr podle zvoleného roku

    if (!soucty[data.firmaId]) soucty[data.firmaId] = 0;
    soucty[data.firmaId] += Number(data.castka);
  });

  const firmySnapshot = await db.collection("companies").get();
  const firmy = [];

  firmySnapshot.forEach((doc) => {
    firmy.push({
      id: doc.id,
      nazev: doc.data().nazev,
      typ: doc.data().typ,
      adresa: doc.data().adresa || "",
      suma: soucty[doc.id] || 0
    });
  });

  firmy.sort((a, b) => b.suma - a.suma);

  firmy.forEach((firma, index) => {
    const tr = document.createElement("tr");
    tr.classList.add("firma");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <a href="#" onclick="zobrazDetailFirmy('${firma.id}', '${firma.nazev}')">
          ${firma.nazev} <br>
          <p style="color: purple; margin:0;">${firma.adresa}</p>
        </a>
      </td>
      <td>${firma.typ}</td>
      <td>${firma.suma} Kč</td>
      <td>
        <button onclick="zobrazEditFormFirma('${firma.id}', '${firma.nazev}', '${firma.typ}')" style="font-size: 20px">✏️</button>
        <button onclick="smazFirmu('${firma.id}')" style="font-size: 20px">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const pocet = firmy.length;
  const celkem = firmy.reduce((suma, f) => suma + f.suma, 0);

  document.getElementById("souhrnFirmy").innerText =
    `Rok: ${vybranyRok}\nZáznamů: ${pocet}\nCelkem: ${celkem} Kč`;
}
// ✏️ Předvyplnění formuláře při úpravě
async function zobrazEditFormFirma(id, nazev, typ) {
  alert(`Upravuješ firmu: ${nazev}`);

  document.getElementById("editIdFirma").value = id;
  document.getElementById("idName").value = nazev;
  document.getElementById(`id${typ}`).checked = true;

  // ✅ Předvyplníme adresu přes await
  try {
    const doc = await db.collection("companies").doc(id).get();
    if (doc.exists) {
      const data = doc.data();
      document.getElementById("idAdresa").value = data.adresa || "";
    }
  } catch (e) {
    console.error("Chyba při načítání firmy:", e);
  }
}

// 🗑️ Smazání firmy
async function smazFirmu(id) {
  if (confirm("Opravdu chceš tuto firmu smazat?")) {
    try {
      await db.collection("companies").doc(id).delete();
      alert("Firma smazána ✅");
      nactiFirmy();
    } catch (e) {
      console.error("Chyba při mazání:", e);
      alert("Chyba při mazání ❌");
    }
  }
}
function formatujDatum(datumString) {
  const d = new Date(datumString);
  const den = String(d.getDate()).padStart(2, '0');
  const mesic = String(d.getMonth() + 1).padStart(2, '0');
  const rok = d.getFullYear();
  return `${den}. ${mesic}. ${rok}`;
}
async function zobrazDetailFirmy(firmaId, nazevFirmy) {
  const dotaz = await db.collection("sales")
    .where("firmaId", "==", firmaId)
    .orderBy("datum", "desc")
    .get();

  if (dotaz.empty) {
    document.getElementById("obsahDialogu").innerText = `Firma: ${nazevFirmy}\nNemá žádné záznamy.`;
  } else {
    let text = `Firma: ${nazevFirmy}\nZáznamy za rok ${vybranyRok}:\n`;
    let celkem = 0;
    let pocet = 0;

    dotaz.forEach(doc => {
      const data = doc.data();
      const d = new Date(data.datum);
      if (isNaN(d)) return;
      if (d.getFullYear() !== vybranyRok) return;

      const datum = formatujDatum(data.datum);
      celkem += Number(data.castka);
      pocet++;
      text += `• ${datum} – ${data.castka} Kč\n`;
    });

    if (pocet === 0) text += `Žádné záznamy za tento rok.`;
    else text += `\nPočet položek: ${pocet}\nCelkem: ${celkem} Kč`;

    document.getElementById("obsahDialogu").innerText = text;
  }

  document.getElementById("firmaDialog").showModal();
}
async function nactiDostupneRoky() {
  const rokSelect = document.getElementById("rokSelect");
  if (!rokSelect) return;

  const snapshot = await db.collection("sales").get();
  const rokySet = new Set();

  snapshot.forEach(doc => {
    const data = doc.data();
    const d = new Date(data.datum);
    if (!isNaN(d)) rokySet.add(d.getFullYear());
  });

  // když by nebyla žádná data, nech aspoň aktuální rok
  if (rokySet.size === 0) rokySet.add(new Date().getFullYear());

  const roky = Array.from(rokySet).sort((a, b) => b - a); // nejnovější nahoře

  rokSelect.innerHTML = "";
  roky.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    rokSelect.appendChild(opt);
  });

  // vyber aktuální rok, pokud existuje, jinak první dostupný
  const aktualni = new Date().getFullYear();
  vybranyRok = roky.includes(aktualni) ? aktualni : roky[0];
  rokSelect.value = String(vybranyRok);

  rokSelect.addEventListener("change", async () => {
    vybranyRok = parseInt(rokSelect.value, 10);
    await nactiFirmy(); // přepočítat tabulku pro nový rok
  });
}
document.addEventListener("DOMContentLoaded", async () => {
  await nactiDostupneRoky();
  await nactiFirmy();
});