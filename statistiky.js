// statistik.js – zobrazí měsíční tržby jako graf pomocí Chart.js (rozděleno na firmy a jednotlivce)

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
    const firmyMap = {};   // companies
    const ostatniMap = {}; // others
  
    const snapshot = await db.collection("sales").get();
  
    snapshot.forEach(doc => {
      const data = doc.data();
      const datum = new Date(data.datum);
      if (isNaN(datum)) return; // validace datumu
  
      const mesicKey = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}`;
  
      const cil = data.typ === "others" ? ostatniMap : firmyMap;
      if (!cil[mesicKey]) cil[mesicKey] = 0;
      cil[mesicKey] += Number(data.castka);
    });
  
    // Spojit všechny klíče (měsíce), aby byly ve správném pořadí
    const vsechnyMesice = Array.from(new Set([...Object.keys(firmyMap), ...Object.keys(ostatniMap)]));
    vsechnyMesice.sort();
  
    const labels = vsechnyMesice.map(k => {
      const [rok, mesic] = k.split("-");
      const mesicIndex = parseInt(mesic) - 1;
      const nazevMesice = MESICE_TEXT[mesicIndex] || `${mesic}.`;
      return `${nazevMesice} ${rok}`;
    });
  
    const firmyData = vsechnyMesice.map(k => firmyMap[k] || 0);
    const ostatniData = vsechnyMesice.map(k => ostatniMap[k] || 0);
  
    const ctx = document.getElementById("grafTrzeb").getContext("2d");
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Firmy',
            data: firmyData,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Ostatní odběratelé',
            data: ostatniData,
            backgroundColor: 'rgba(255, 206, 86, 0.6)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Měsíční tržby – firmy vs. ostatní odběratelé',
            font: {
              size: 18
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return value + ' Kč';
              }
            }
          }
        }
      }
    });
  });

  async function vygenerujGrafy() {
    const snapshot = await db.collection("sales").get();
    const statistiky = {};
  
    snapshot.forEach(doc => {
      const data = doc.data();
      if (Array.isArray(data.zmrzliny)) {
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
  
      const ctx = document.getElementById(`chart_${typ.replaceAll(".", "")}`);
      if (!ctx) return;
  
      new Chart(ctx, {
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
  }
  
  document.addEventListener("DOMContentLoaded", vygenerujGrafy);
  