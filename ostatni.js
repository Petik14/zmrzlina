// ostatni.js – pro stránku ostatni.html

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
  
  document.addEventListener("DOMContentLoaded", () => {
    nactiJednotlivce();
  });
  
  async function nactiJednotlivce() {
    const tbody = document.querySelector("table tbody");
    tbody.innerHTML = "";
  
    const trzbySnapshot = await db.collection("sales").get();
    const soucty = {}; // firmaId -> suma
  
    trzbySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.typ === "others") {
        if (!soucty[data.firmaId]) soucty[data.firmaId] = 0;
        soucty[data.firmaId] += Number(data.castka);
      }
    });
  
    const othersSnapshot = await db.collection("others").get();
    const jednotlivi = [];
  
    othersSnapshot.forEach(doc => {
      jednotlivi.push({
        id: doc.id,
        nazev: doc.data().nazev,
        suma: soucty[doc.id] || 0
      });
    });
  
    jednotlivi.sort((a, b) => b.suma - a.suma);
  
    let celkovaSuma = 0;
  
    jednotlivi.forEach((item, index) => {
      celkovaSuma += item.suma;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><a href="#" onclick="zobrazDetailJednotlivce('${item.id}', '${item.nazev}')">${item.nazev}</a></td>
        <td>${item.suma} Kč</td>
        <td>
          <button onclick="zobrazEditForm('${item.id}', '${item.nazev}')">✏️</button>
          <button onclick="smazJednotlivce('${item.id}')">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  
    document.getElementById("souhrnOstatni").innerText = `Záznamů: ${jednotlivi.length}\nCelkem: ${celkovaSuma} Kč`;
  }
  
  function zobrazEditForm(id, nazev) {
    document.getElementById("idName").value = nazev;
    document.getElementById("editIdJednotlivec").value = id;
  }
  
  async function smazJednotlivce(id) {
    if (confirm("Opravdu chceš smazat tohoto jednotlivce?")) {
      try {
        await db.collection("others").doc(id).delete();
        alert("Jednotlivec smazán ✅");
        nactiJednotlivce();
      } catch (e) {
        console.error("Chyba při mazání:", e);
        alert("Chyba při mazání ❌");
      }
    }
  }
  
  document.getElementById("formularOstatni").addEventListener("submit", async function (e) {
    e.preventDefault();
  
    const nazev = document.getElementById("idName").value.trim();
    const editId = document.getElementById("editIdJednotlivec").value;
  
    if (!nazev) {
      alert("Zadej jméno jednotlivce");
      return;
    }
  
    try {
      if (editId) {
        await db.collection("others").doc(editId).update({ nazev });
        alert("Jednotlivec upraven ✅");
      } else {
        await db.collection("others").add({ nazev });
        alert("Jednotlivec přidán ✅");
      }
  
      document.getElementById("formularOstatni").reset();
      document.getElementById("editIdJednotlivec").value = "";
      nactiJednotlivce();
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
      obsah.innerText = `Jednotlivec: ${nazev}\nNemá žádné záznamy.`;
    } else {
      let text = `Jednotlivec: ${nazev}\nZáznamy:\n`;
      let celkem = 0;
      let pocet = 0;
  
      dotaz.forEach(doc => {
        const data = doc.data();
        const datum = formatujDatum(data.datum);
        celkem += Number(data.castka);
        pocet++;
        text += `• ${datum} – ${data.castka} Kč\n`;
      });
  
      text += `\nPočet položek: ${pocet}\nCelkem: ${celkem} Kč`;
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
  
  window.zobrazDetailJednotlivce = zobrazDetailJednotlivce;