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
  const dnes = new Date().toISOString().split("T")[0];
  document.getElementById("datum").value = dnes;

  document.getElementById("typOdb").addEventListener("change", nactiOdb);

  await nastavRokyAOpcionalneSelect(); // ✅ přidá roky + nastaví vybranyRok
  await nactiOdb();

  await zobrazTrzby();
  pridejZmrzlinu();
});

async function nastavRokyAOpcionalneSelect() {
  const rokSelect = document.getElementById("rokSelect");
  if (!rokSelect) return; // když to do HTML nedáš, funguje to i bez toho

  const snapshot = await db.collection("sales").get();
  const rokySet = new Set();

  snapshot.forEach(doc => {
    const data = doc.data();
    const d = new Date(data.datum);
    if (!isNaN(d)) rokySet.add(d.getFullYear());
  });

  // když nejsou žádná data, nech aktuální rok
  if (rokySet.size === 0) {
    vybranyRok = new Date().getFullYear();
    rokSelect.innerHTML = `<option value="${vybranyRok}">${vybranyRok}</option>`;
    rokSelect.value = String(vybranyRok);
    return;
  }

  const roky = Array.from(rokySet).sort((a, b) => b - a);
  const aktualni = new Date().getFullYear();
  vybranyRok = roky.includes(aktualni) ? aktualni : roky[0];

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
    await zobrazTrzby();
  });
}

async function nactiOdb() {
  const typ = document.getElementById("typOdb").value;
  const select = document.getElementById("firma");
  select.innerHTML = "";

  const snapshot = await db.collection(typ).orderBy("nazev").get();
  snapshot.forEach(doc => {
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = doc.data().nazev;
    select.appendChild(option);
  });
}

document.getElementById("trzbaForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const typ = document.getElementById("typOdb").value;
  const firmaId = document.getElementById("firma").value;
  const datum = document.getElementById("datum").value;
  const castka = parseFloat(document.getElementById("castka").value);
  const editId = document.getElementById("editId").value;
  const zmrzliny = ziskejZmrzlinyZFormulare(); // z druhy.js

  if (!firmaId || !datum || isNaN(castka) || castka <= 0) {
    alert("Vyplň všechna pole správně.");
    return;
  }

  try {
    if (editId) {
      await db.collection("sales").doc(editId).update({
        firmaId, datum, castka, typ, zmrzliny
      });
      alert("Tržba byla upravena ✅");
    } else {
      await db.collection("sales").add({
        firmaId, datum, castka, typ, zmrzliny,
        cas: new Date()
      });
      alert("Tržba byla přidána ✅");
    }

    document.getElementById("trzbaForm").reset();
    document.getElementById("datum").value = new Date().toISOString().split("T")[0];
    document.getElementById("editId").value = "";
    document.getElementById("zmrzlinyContainer").innerHTML = "";

    await zobrazTrzby();
  } catch (e) {
    console.error("Chyba při ukládání:", e);
    alert("Chyba při ukládání ❌");
  }
});

async function zobrazTrzby() {
  const tbody = document.getElementById("trzbyBody");
  tbody.innerHTML = "";

  const companiesSnapshot = await db.collection("companies").get();
  const othersSnapshot = await db.collection("others").get();
  const companiesMap = {};
  const othersMap = {};

  companiesSnapshot.forEach(doc => companiesMap[doc.id] = doc.data().nazev);
  othersSnapshot.forEach(doc => othersMap[doc.id] = doc.data().nazev);

  const trzbySnapshot = await db.collection("sales").orderBy("datum", "desc").get();

  let poradi = 1;
  trzbySnapshot.forEach(doc => {
    const data = doc.data();
    const d = new Date(data.datum);
    if (isNaN(d)) return;

    // ✅ filtr na vybraný rok
    if (d.getFullYear() !== vybranyRok) return;

    const typ = data.typ || "companies";
    const nazev = typ === "others"
      ? (othersMap[data.firmaId] || "Neznámý jednotlivec")
      : (companiesMap[data.firmaId] || "Neznámá firma");

    const datumFormatovane = formatujDatum(data.datum);

    const tr = document.createElement("tr");
    tr.classList.add(data.typ === "others" ? "jednotlivec" : "firma");

    tr.innerHTML = `
      <td>${poradi}</td>
      <td><a href="#" onclick="zobrazDetailTrzeb(event, '${data.firmaId}', '${typ}')">${nazev}</a></td>
      <td>${datumFormatovane}</td>
      <td>${data.castka} Kč</td>
      <td>
        <button onclick="zobrazEditForm('${doc.id}', '${data.firmaId}', '${data.datum}', ${data.castka}, '${typ}')" style="font-size: 30px">✏️</button>
        <button onclick="smazTrzbu('${doc.id}')" style="font-size: 30px">🗑️</button>
      </td>
    `;

    tbody.appendChild(tr);
    poradi++;
  });

  document.getElementById("souhrnTrzby").innerText =
    `Rok: ${vybranyRok}\nZáznamů: ${poradi - 1}`;
}

function formatujDatum(datumString) {
  const d = new Date(datumString);
  const den = String(d.getDate()).padStart(2, '0');
  const mesic = String(d.getMonth() + 1).padStart(2, '0');
  const rok = d.getFullYear();
  return `${den}. ${mesic}. ${rok}`;
}

async function zobrazEditForm(id, firmaId, datum, castka, typ) {
  document.getElementById("editId").value = id;
  document.getElementById("typOdb").value = typ;

  await nactiOdb();
  document.getElementById("firma").value = firmaId;
  document.getElementById("datum").value = datum;
  document.getElementById("castka").value = castka;

  const container = document.getElementById("zmrzlinyContainer");
  container.innerHTML = "";

  const doc = await db.collection("sales").doc(id).get();
  const data = doc.data();

  if (Array.isArray(data.zmrzliny)) {
    for (const zmrzlina of data.zmrzliny) {
      await pridejZmrzlinu(zmrzlina);
    }
  }

  const selectFirma = document.getElementById("firma");
  const vybranyNazev = selectFirma.options[selectFirma.selectedIndex].textContent;

  const d = new Date(datum);
  const datumFormatovane =
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

  alert(`Upravuješ položku: ${vybranyNazev} : ${datumFormatovane}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function zobrazDetailTrzeb(event, firmaId, typ) {
  if (event) event.preventDefault();

  const snapshot = await db.collection("sales")
    .where("firmaId", "==", firmaId)
    .where("typ", "==", typ)
    .orderBy("datum", "desc")
    .get();

  if (snapshot.empty) {
    alert("Žádné záznamy");
    return;
  }

  let text = `Zmrzliny (rok ${vybranyRok}):\n`;
  let pocetRadku = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const d = new Date(data.datum);
    if (isNaN(d)) return;
    if (d.getFullYear() !== vybranyRok) return; // ✅ filtr roku

    if (Array.isArray(data.zmrzliny)) {
      data.zmrzliny.forEach(z => {
        text += `• ${z.typBaleni} – ${z.prichut} × ${z.pocet} ks\n`;
        pocetRadku++;
      });
    }
  });

  if (pocetRadku === 0) {
    alert(`Žádné zmrzliny za rok ${vybranyRok}.`);
    return;
  }

  alert(text);
}

async function smazTrzbu(id) {
  if (confirm("Opravdu chceš smazat tuto tržbu?")) {
    try {
      await db.collection("sales").doc(id).delete();
      alert("Tržba smazána 🗑️");
      await zobrazTrzby();
    } catch (e) {
      console.error("Chyba při mazání:", e);
      alert("Chyba při mazání ❌");
    }
  }
}

window.smazTrzbu = smazTrzbu;
window.zobrazEditForm = zobrazEditForm;
window.zobrazDetailTrzeb = zobrazDetailTrzeb;