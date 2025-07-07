async function zalohaDatabaze() {
  const vystup = {};

  const kolekce = ["companies", "others", "sales", "flavors"];

  for (const nazev of kolekce) {
    const snap = await db.collection(nazev).get();
    vystup[nazev] = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  const blob = new Blob([JSON.stringify(vystup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zaloha-bohemilk-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
