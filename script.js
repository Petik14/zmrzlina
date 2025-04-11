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

// 🟢 Nastav dnešní datum jako výchozí
document.addEventListener("DOMContentLoaded", () => {
    const dnes = new Date().toISOString().split("T")[0];
    document.getElementById("datum").value = dnes;

    nactiFirmyDoSelectu();
    zobrazTrzby();
});

// 🔽 Načtení firem do <select>
async function nactiFirmyDoSelectu() {
    const select = document.getElementById("firma");
    select.innerHTML = "";

    const dotaz = await db.collection("companies").orderBy("nazev").get();
    dotaz.forEach((doc) => {
        const data = doc.data();
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = data.nazev;
        select.appendChild(option);
    });
}

// 📤 Odeslání formuláře (přidání nebo úprava tržby)
document.getElementById("trzbaForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const firmaId = document.getElementById("firma").value;
    const datum = document.getElementById("datum").value;
    const castka = parseFloat(document.getElementById("castka").value);
    const editId = document.getElementById("editId").value;

    if (!firmaId || !datum || isNaN(castka) || castka <= 0) {
        alert("Vyplň všechna pole správně.");
        return;
    }

    try {
        if (editId) {
            // ✏️ Úprava
            await db.collection("sales").doc(editId).update({
                firmaId: firmaId,
                datum: datum,
                castka: castka
            });
            alert("Tržba byla upravena ✅");
        } else {
            // ➕ Nová
            await db.collection("sales").add({
                firmaId: firmaId,
                datum: datum,
                castka: castka,
                cas: new Date()
            });
            alert("Tržba byla přidána ✅");
        }

        document.getElementById("trzbaForm").reset();
        document.getElementById("datum").value = new Date().toISOString().split("T")[0];
        document.getElementById("editId").value = "";
        zobrazTrzby();
    } catch (e) {
        console.error("Chyba při ukládání:", e);
        alert("Chyba při ukládání ❌");
    }
});

// 🧾 Zobrazení tržeb v tabulce
async function zobrazTrzby() {
    const tbody = document.getElementById("trzbyBody");
    tbody.innerHTML = "";

    const companiesSnapshot = await db.collection("companies").get();
    const companiesMap = {};
    companiesSnapshot.forEach(doc => {
        companiesMap[doc.id] = doc.data().nazev;
    });

    const trzbySnapshot = await db.collection("sales").orderBy("datum", "desc").get();

    let poradi = 1;
    trzbySnapshot.forEach(doc => {
        const data = doc.data();
        const tr = document.createElement("tr");

        const nazevFirmy = companiesMap[data.firmaId] || "Neznámá firma";
        const datumFormatovane = formatujDatum(data.datum);

        tr.innerHTML = `
            <td>${poradi}</td>
            <td>${nazevFirmy}</td>
            <td>${datumFormatovane}</td>
            <td>${data.castka} Kč</td>
            <td>
                <button onclick="zobrazEditForm('${doc.id}', '${data.firmaId}', '${data.datum}', ${data.castka})">✏️</button>
                <button onclick="smazTrzbu('${doc.id}')">🗑️</button>
            </td>
        `;

        tbody.appendChild(tr);
        poradi++;
    });
}

// 🕓 Datum ve formátu dd. MM. yyyy
function formatujDatum(datumString) {
    const d = new Date(datumString);
    const den = String(d.getDate()).padStart(2, '0');
    const mesic = String(d.getMonth() + 1).padStart(2, '0');
    const rok = d.getFullYear();
    return `${den}. ${mesic}. ${rok}`;
}

// ✏️ Načtení dat do formuláře pro úpravu
function zobrazEditForm(id, firmaId, datum, castka) {
    document.getElementById("editId").value = id;
    document.getElementById("firma").value = firmaId;
    document.getElementById("datum").value = datum;
    document.getElementById("castka").value = castka;
}

// 🗑️ Smazání tržby
async function smazTrzbu(id) {
    if (confirm("Opravdu chceš smazat tuto tržbu?")) {
        try {
            await db.collection("sales").doc(id).delete();
            alert("Tržba smazána 🗑️");
            zobrazTrzby();
        } catch (e) {
            console.error("Chyba při mazání:", e);
            alert("Chyba při mazání ❌");
        }
    }
}
