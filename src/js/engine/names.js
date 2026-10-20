// Nombres aleatorios para los jugadores de la máquina
(function (root) {
  const C = root.Catan || (root.Catan = {});
  const MALE = ['Aurelio', 'Casimiro', 'Eustaquio', 'Gaspar', 'Ignacio', 'Leandro', 'Nicanor', 'Pancracio', 'Saturnino', 'Ulises',
    'Wenceslao', 'Zacarías', 'Cosme', 'Rigoberto', 'Anselmo', 'Baltasar', 'Florencio', 'Gumersindo', 'Hilario', 'Lisandro'];
  const FEMALE = ['Bárbara', 'Dolores', 'Fermina', 'Hortensia', 'Jacinta', 'Matilde', 'Olvido', 'Remedios', 'Teodora', 'Valentina',
    'Ximena', 'Brunilda', 'Leocadia', 'Eulalia', 'Petronila', 'Casilda', 'Genoveva', 'Inmaculada', 'Rosalía', 'Visitación'];
  const TITLES = [['el Navegante', 'la Navegante'], ['el Constructor', 'la Constructora'], ['el Mercader', 'la Mercader'],
    ['el Explorador', 'la Exploradora'], ['el Pastor', 'la Pastora'], ['el Leñador', 'la Leñadora'], ['el Minero', 'la Minera'],
    ['el Granjero', 'la Granjera'], ['el Alfarero', 'la Alfarera'], ['el Colono', 'la Colona'], ['el Audaz', 'la Audaz'],
    ['el Astuto', 'la Astuta'], ['el Prudente', 'la Prudente'], ['el Viajero', 'la Viajera'], ['el Barón', 'la Baronesa'],
    ['el Sabio', 'la Sabia']];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function randomBotNames(n, exclude = []) {
    const used = new Set(exclude.map(x => String(x).split(' ')[0].toLowerCase()));
    const usedTitles = new Set();
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 2000) {
      const fem = Math.random() < 0.5;
      const f = pick(fem ? FEMALE : MALE);
      const ti = Math.floor(Math.random() * TITLES.length);
      if (used.has(f.toLowerCase()) || usedTitles.has(ti)) continue;
      used.add(f.toLowerCase());
      usedTitles.add(ti);
      out.push(f + ' ' + TITLES[ti][fem ? 1 : 0]);
    }
    return out;
  }
  C.randomBotNames = randomBotNames;
})(typeof window !== 'undefined' ? window : globalThis);
