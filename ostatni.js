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

document.addEventListener("DOMContentLoaded", async () => {
  await nastavRokyAOpcionalneSelect();
  await nactiJednotlivce();
});

/**
 * 1) Z databáze zjistí roky, které existují v sales pro typ=others
 * 2) Vybere default:
 *    - pokud existuje aktuální rok, dá aktuální
 *    - jinak dá nejnovější rok z dat
 * 3) Pokud existuje <select id="rokSelect">, tak ho naplní a přidá listener
 */
async function nastavRokyAOpcionalneSelect() {
  const snapshot = await db.collection("sales").get();
  const rokySet = new Set();

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.typ !== "others") return;

    const d = new Date(data.datum);
    if (!isNaN(d)) rokySet.add(d.getFullYear());
  });

  // když nemáš žádné sales (others), necháme aktuální rok
  if (rokySet.size === 0) {
    vybranyRok = new Date().getFullYear();
    return;
  }

  const roky = Array.from(rokySet).sort((a, b) => b - a);
  const aktualni = new Date().getFullYear();
  vybranyRok = roky.includes(aktualni) ? aktualni : roky[0];

  const rokSelect = document.getElementById("rokSelect");
  if (!rokSelect) return; // ✅ funguje i bez selectu

  rokSelect.innerHTML = "";
  roky.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    rokSelect.appendChild(opt);
  });

  rokSelect.value = String(vybranyRok);

  rokSelect.addEventListener("change", async () => {
    vybranyRok = parseInt(rokSelect.value, 10);
    await nactiJednotlivce();
  });
}

async function nactiJednotlivce() {
  const tbody = document.querySelector("table tbody");
  tbody.innerHTML = "";

  const trzbySnapshot = await db.collection("sales").get();
  const soucty = {};

  trzbySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.typ !== "others") return;

    const d = new Date(data.datum);
    if (isNaN(d)) return;

    if (d.getFullYear() !== vybranyRok) return; // ✅ filtr podle roku

    if (!soucty[data.firmaId]) soucty[data.firmaId] = 0;
    soucty[data.firmaId] += Number(data.castka);
  });

  const othersSnapshot = await db.collection("others").get();
  const jednotlivi = [];

  othersSnapshot.forEach(doc => {
    jednotlivi.push({
      id: doc.id,
      nazev: doc.data().nazev,
      adresa: doc.data().adresa || "",
      suma: soucty[doc.id] || 0
    });
  });

  jednotlivi.sort((a, b) => b.suma - a.suma);

  let celkovaSuma = 0;

  jednotlivi.forEach((item, index) => {
    celkovaSuma += item.suma;

    const tr = document.createElement("tr");
    tr.classList.add("jednotlivec");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <a href="#" onclick="zobrazDetailJednotlivce('${item.id}', '${item.nazev}')">
          ${item.nazev}<br>
          <p style="color:purple; margin:0;">${item.adresa}</p>
        </a>
      </td>
      <td>${item.suma} Kč</td>
      <td>
        <button onclick="zobrazEditForm('${item.id}', '${item.nazev}')">✏️</button>
        <button onclick="smazJednotlivce('${item.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("souhrnOstatni").innerText =
    `Rok: ${vybranyRok}\nZáznamů: ${jednotlivi.length}\nCelkem: ${celkovaSuma} Kč`;
}

function zobrazEditForm(id, nazev) {
  alert(`Upravuješ odběratele: ${nazev}`);
  document.getElementById("idName").value = nazev;
  document.getElementById("editIdJednotlivec").value = id;

  db.collection("others").doc(id).get().then((doc) => {
    if (doc.exists) {
      document.getElementById("idAdresa").value = doc.data().adresa || "";
    }
  });
}

async function smazJednotlivce(id) {
  if (confirm("Opravdu chceš smazat tohoto odběratele?")) {
    try {
      await db.collection("others").doc(id).delete();
      alert("Odběratel smazán ✅");
      await nactiJednotlivce();
    } catch (e) {
      console.error("Chyba při mazání:", e);
      alert("Chyba při mazání ❌");
    }
  }
}

document.getElementById("formularOstatni").addEventListener("submit", async function (e) {
  e.preventDefault();

  const nazev = document.getElementById("idName").value.trim();
  const adresa = document.getElementById("idAdresa").value.trim();
  const editId = document.getElementById("editIdJednotlivec").value;

  if (!nazev) {
    alert("Zadej jméno odběratele");
    return;
  }

  try {
    if (editId) {
      await db.collection("others").doc(editId).update({ nazev, adresa });
      alert(`Odběratel "${nazev}" upraven ✅`);
    } else {
      await db.collection("others").add({ nazev, adresa });
      alert(`Odběratel "${nazev}" přidán ✅`);
    }

    document.getElementById("formularOstatni").reset();
    document.getElementById("editIdJednotlivec").value = "";
    await nactiJednotlivce();
  } catch (e) {
    console.error("Chyba při ukládání:", e);
    alert("Chyba při ukládání ❌");
  }
});

async function zobrazDetailJednotlivce(firmaId, nazev) {
  const dotaz = await db.collection("sales")
    .where("firmaId", "==", firmaId)
    .where("typ", "==", "others")
    .orderBy("datum", "desc")
    .get();

  const dialog = document.getElementById("firmaDialog");
  const obsah = document.getElementById("obsahDialogu");

  if (dotaz.empty) {
    obsah.innerText = `Odběratel: ${nazev}\nNemá žádné záznamy.`;
  } else {
    let text = `Odběratel: ${nazev}\nZáznamy za rok ${vybranyRok}:\n`;
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

    if (pocet === 0) {
      text += `Žádné záznamy za tento rok.`;
    } else {
      text += `\nPočet položek: ${pocet}\nCelkem: ${celkem} Kč`;
    }

    obsah.innerText = text;
  }

  dialog.showModal();
}

function formatujDatum(datumString) {
  const d = new Date(datumString);
  const den = String(d.getDate()).padStart(2, '0');
  const mesic = String(d.getMonth() + 1).padStart(2, '0');
  const rok = d.getFullYear();
  return `${den}. ${mesic}. ${rok}`;
}

// ✅ důležité pro onclick v HTML
window.nactiJednotlivce = nactiJednotlivce;
window.zobrazEditForm = zobrazEditForm;
window.smazJednotlivce = smazJednotlivce;
window.zobrazDetailJednotlivce = zobrazDetailJednotlivce;