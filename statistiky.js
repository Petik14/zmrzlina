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

const MESICE_TEXT = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
];

document.addEventListener("DOMContentLoaded", async () => {
  const rokSelect = document.getElementById("rokSelect");
  const aktualniRok = new Date().getFullYear();
  rokSelect.value = aktualniRok;
  mesicSelect.value = new Date().getMonth(); // 0–11

  await zobrazGrafyZaRok(aktualniRok);

  rokSelect.addEventListener("change", async () => {
    await zobrazGrafyZaRok(parseInt(rokSelect.value));
  });

  mesicSelect.addEventListener("change", async () => {
    await zobrazGrafyZaRok(parseInt(rokSelect.value));
  });
});

async function zobrazGrafyZaRok(rok) {
  const firmyMap = {};
  const ostatniMap = {};
  const statistiky = {};

  const mesicSelect = document.getElementById("mesicSelect");
  const vybranyMesic = parseInt(mesicSelect.value); // 0–11

  const snapshot = await db.collection("sales").get();

  snapshot.forEach(doc => {
    const data = doc.data();
    const datum = new Date(data.datum);
    if (isNaN(datum) || datum.getFullYear() !== rok) return;

    // Tržby (nezávisle na měsíci)
    const mesicKey = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}`;
    const cil = data.typ === "others" ? ostatniMap : firmyMap;
    if (!cil[mesicKey]) cil[mesicKey] = 0;
    cil[mesicKey] += Number(data.castka);

    // Zmrzliny – jen pokud odpovídá měsíc
    if (datum.getMonth() === vybranyMesic && Array.isArray(data.zmrzliny)) {
      data.zmrzliny.forEach(z => {
        const typ = z.typBaleni;
        const prichut = z.prichut;
        const pocet = z.pocet;

        if (!statistiky[typ]) statistiky[typ] = {};
        if (!statistiky[typ][prichut]) statistiky[typ][prichut] = 0;
        statistiky[typ][prichut] += pocet;
      });
    }
  });

  // Vygeneruj graf tržeb
  const vsechnyMesice = Array.from(new Set([...Object.keys(firmyMap), ...Object.keys(ostatniMap)]));
  vsechnyMesice.sort();

  const labels = vsechnyMesice.map(k => {
    const [_, mesic] = k.split("-");
    const mesicIndex = parseInt(mesic) - 1;
    return `${MESICE_TEXT[mesicIndex]} ${rok}`;
  });

  const firmyData = vsechnyMesice.map(k => firmyMap[k] || 0);
  const ostatniData = vsechnyMesice.map(k => ostatniMap[k] || 0);

  const ctx = document.getElementById("grafTrzeb").getContext("2d");
  if (window.grafTrzebInstance) window.grafTrzebInstance.destroy();
  window.grafTrzebInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Firmy',
          data: firmyData,
          backgroundColor: 'rgba(54, 162, 235, 0.6)'
        },
        {
          label: 'Ostatní odběratelé',
          data: ostatniData,
          backgroundColor: 'rgba(255, 206, 86, 0.6)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Měsíční tržby (${rok}) – firmy vs. ostatní`
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => value + ' Kč'
          }
        }
      }
    }
  });

  // Vygeneruj zmrzlinové grafy
  const typy = [
    "120 ml",
    "460 ml",
    "Ballada 2,2 l",
    "Ballada 4,5 l",
    "Sorbet 300 ml",
    "Nanuk"
  ];

  typy.forEach(typ => {
    const data = statistiky[typ] || {};
    const prichute = Object.keys(data);
    const hodnoty = prichute.map(p => data[p]);

    const canvasId = `chart_${typ.replace(/\s|,|\./g, "")}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (window[`chart_${canvasId}`]) window[`chart_${canvasId}`].destroy();

    window[`chart_${canvasId}`] = new Chart(canvas, {
      type: "bar",
      data: {
        labels: prichute,
        datasets: [{
          label: `Zmrzliny ${typ}`,
          data: hodnoty,
          backgroundColor: "rgba(54, 162, 235, 0.6)"
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `Nejoblíbenější příchutě – ${typ}`
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  });

  // Vyplníme tabulku
  // Připravíme řádky do tabulky
  const rows = [];
  for (const typ in statistiky) {
    for (const prichut in statistiky[typ]) {
      rows.push({
        typ: typ,
        prichut: prichut,
        pocet: statistiky[typ][prichut]
      });
    }
  }

  // Seřadíme od nejprodávanější
  rows.sort((a, b) => b.pocet - a.pocet);

  // Vyplníme tabulku
  const tabulkaBody = document.querySelector("#vitezoveTabulka tbody");
  tabulkaBody.innerHTML = "";

  let celkem = 0;

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td style="padding: 6px 10px; border-bottom: 1px solid #ccc;">${row.typ}</td>
    <td style="padding: 6px 10px; border-bottom: 1px solid #ccc;">${row.prichut}</td>
    <td style="padding: 6px 10px; border-bottom: 1px solid #ccc; text-align: right;">${row.pocet}</td>
  `;
    tabulkaBody.appendChild(tr);
    celkem += row.pocet;
  });

  // Přidáme součtový řádek
  const soucetTr = document.createElement("tr");
  soucetTr.innerHTML = `
  <td colspan="2" style="padding: 10px; font-weight: bold; border-top: 2px solid #000;">Podtrženo, sečteno:</td>
  <td style="padding: 10px; font-weight: bold; border-top: 2px solid #000; text-align: right;">${celkem}</td>
`;
  tabulkaBody.appendChild(soucetTr);
}
