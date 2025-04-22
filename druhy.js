async function pridejZmrzlinu(zmrzlina = null) {
  const container = document.getElementById("zmrzlinyContainer");

  const wrapper = document.createElement("div");
  wrapper.className = "zmrzlina-item";
  wrapper.style.marginBottom = "10px";

  const typSelect = document.createElement("select");
  typSelect.className = "typ-baleni";
  typSelect.innerHTML = `<option value="">Typ balení</option>`;

  const prichutSelect = document.createElement("select");
  prichutSelect.className = "prichut-select";
  prichutSelect.innerHTML = `<option value="">-- Vyber příchuť --</option>`;

  const pocetInput = document.createElement("input");
  pocetInput.type = "number";
  pocetInput.min = "1";
  pocetInput.placeholder = "Počet ks";
  pocetInput.className = "pocet-kusu";

  const odebratBtn = document.createElement("button");
  odebratBtn.textContent = "❌";
  odebratBtn.type = "button";
  odebratBtn.className = "btn-odebrat";
  odebratBtn.onclick = () => wrapper.remove();

  // Přidání do wrapperu
  wrapper.appendChild(typSelect);
  wrapper.appendChild(prichutSelect);
  wrapper.appendChild(pocetInput);
  wrapper.appendChild(odebratBtn);
  container.appendChild(wrapper);

  // Načtení typů balení do typSelect
  const snapshot = await db.collection("flavors").get();
  snapshot.forEach(doc => {
    const opt = document.createElement("option");
    opt.value = doc.id;
    opt.textContent = doc.id;
    typSelect.appendChild(opt);
  });

  // Reakce na změnu typu balení
  typSelect.addEventListener("change", async () => {
    const vybranyTyp = typSelect.value;
    prichutSelect.innerHTML = `<option value="">-- Vyber příchuť --</option>`;
    if (!vybranyTyp) return;

    const doc = await db.collection("flavors").doc(vybranyTyp).get();
    const data = doc.data();
    if (data?.prichute) {
      data.prichute.forEach(p => {
        const o = document.createElement("option");
        o.value = p;
        o.textContent = p;
        prichutSelect.appendChild(o);
      });
    }

    // Pokud upravujeme a chceme nastavit příchuť
    if (zmrzlina?.typBaleni === vybranyTyp) {
      prichutSelect.value = zmrzlina.prichut;
    }
  });

  // Pokud upravujeme záznam, nastav hodnoty
  if (zmrzlina) {
    typSelect.value = zmrzlina.typBaleni;
    pocetInput.value = zmrzlina.pocet;
    typSelect.dispatchEvent(new Event("change"));
  }
}

// Funkce pro získání všech zmrzlin z formuláře
function ziskejZmrzlinyZFormulare() {
  const container = document.getElementById("zmrzlinyContainer");
  const zaznamy = container.querySelectorAll(".zmrzlina-item");
  const zmrzliny = [];

  zaznamy.forEach(z => {
    const typ = z.querySelector(".typ-baleni").value;
    const prichut = z.querySelector(".prichut-select").value;
    const pocet = parseInt(z.querySelector(".pocet-kusu").value);

    if (typ && prichut && !isNaN(pocet) && pocet > 0) {
      zmrzliny.push({ typBaleni: typ, prichut, pocet });
    }
  });

  return zmrzliny;
}

window.pridejZmrzlinu = pridejZmrzlinu;
