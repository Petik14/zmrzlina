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
  
  // 📤 Odeslání formuláře (přidání nebo úprava firmy)
  document.getElementById("formular").addEventListener("submit", async function (e) {
    e.preventDefault();
  
    const name = document.getElementById("idName").value.trim();
    const typ = document.querySelector('input[name="type"]:checked')?.value;
    const editId = document.getElementById("editIdFirma").value;
  
    if (!name || !typ) {
      document.getElementById("stav").innerText = "Vyplň všechny údaje.";
      return;
    }
  
    try {
      if (editId) {
        await db.collection("companies").doc(editId).update({
          nazev: name,
          typ: typ
        });
        document.getElementById("stav").innerText = "Firma upravena ✅";
      } else {
        await db.collection("companies").add({
          nazev: name,
          typ: typ
        });
        document.getElementById("stav").innerText = "Firma přidána ✅";
      }
  
      document.getElementById("formular").reset();
      document.getElementById("editIdFirma").value = "";
      nactiFirmy();
    } catch (e) {
      document.getElementById("stav").innerText = "Chyba při ukládání ❌";
      console.error("Chyba:", e);
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
      if (!soucty[data.firmaId]) {
        soucty[data.firmaId] = 0;
      }
      soucty[data.firmaId] += Number(data.castka);
    });
  
    const firmySnapshot = await db.collection("companies").get();
    const firmy = [];
  
    firmySnapshot.forEach((doc) => {
      firmy.push({
        id: doc.id,
        nazev: doc.data().nazev,
        typ: doc.data().typ,
        suma: soucty[doc.id] || 0
      });
    });
  
    firmy.sort((a, b) => b.suma - a.suma);
  
    firmy.forEach((firma, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${firma.nazev}</td>
        <td>${firma.typ}</td>
        <td>${firma.suma} Kč</td>
        <td>
          <button onclick="zobrazEditFormFirma('${firma.id}', '${firma.nazev}', '${firma.typ}')"style="font-size: 30px">✏️</button>
          <button onclick="smazFirmu('${firma.id}')"style="font-size: 30px">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  // ✏️ Předvyplnění formuláře při úpravě
  function zobrazEditFormFirma(id, nazev, typ) {
    document.getElementById("editIdFirma").value = id;
    document.getElementById("idName").value = nazev;
    document.getElementById(`id${typ}`).checked = true;
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
  
  nactiFirmy();