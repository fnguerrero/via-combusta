/* Simula partidas completas sobre varias cartas: cada casa tiene que generar
   una prueba valida, con exactamente una opcion correcta y una explicacion que
   no rompa. Sirve para no descubrir un error recien jugando. */
global.Chart = require('../js/astro/chart.js');
global.Ephemeris = require('../js/astro/ephemeris.js');
var C = global.Chart;
var D = global.Dignities = require('../js/astro/dignities.js');
var Places = require('../js/astro/places.js');
var S = global.Story = require('../js/game/story.js');
var P = require('../js/game/puzzles.js');

var fails = 0;
function bad(msg) { fails++; console.log(' FAIL ' + msg); }

function transits() {
  var jd = Ephemeris.julianDay(2026, 8, 26, 15);
  var p = Ephemeris.positions(jd, 2026, 8);
  var out = {};
  ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn',
   'uranus', 'neptune', 'pluto'].forEach(function (k) {
    var sp = Ephemeris.speed(k, jd, 2026, 8);
    out[k] = {
      lon: p[k].lon, speed: sp, retrograde: sp < 0,
      signName: C.SIGNS[C.signOf(p[k].lon)], text: C.formatLon(p[k].lon)
    };
  });
  return out;
}
var T = transits();

var CARTAS = [
  { n: 'Bel', y: 1989, m: 7, d: 14, h: 4, mi: 25, city: 'Ciudad de Buenos Aires' },
  { n: 'Verano 1990', y: 1990, m: 1, d: 8, h: 2, mi: 10, city: 'Rosario' },
  { n: 'Mediodia', y: 1975, m: 11, d: 30, h: 12, mi: 0, city: 'Córdoba' },
  { n: 'Pre-1969', y: 1965, m: 12, d: 20, h: 23, mi: 55, city: 'Mendoza' },
  { n: 'Ushuaia', y: 2001, m: 6, d: 21, h: 8, mi: 30, city: 'Ushuaia' },
  { n: 'Londres', y: 1958, m: 4, d: 2, h: 17, mi: 45, city: 'Londres' },
  { n: 'Reciente', y: 2010, m: 3, d: 15, h: 0, mi: 5, city: 'La Plata' }
];

CARTAS.forEach(function (c) {
  var city = Places.find(c.city);
  if (!city) { bad('ciudad no encontrada: ' + c.city); return; }
  var off = Places.offsetFor(city, c.y, c.m, c.d);
  var carta = C.build({
    year: c.y, month: c.m, day: c.d, hour: c.h, minute: c.mi,
    utcOffset: off, lat: city.lat, lon: city.lon, place: city.name
  }, { system: 'placidus' });

  var ctx = { name: c.n, chart: carta, transits: T, state: {} };
  var seed = 12345 + c.y;

  console.log('\n== ' + c.n + ' == ' + c.city + '  UTC' + off +
    '   AC ' + carta.angles.asc.text + '  ' + carta.sect);

  // Prologo y textos no deben romper ni quedar vacios.
  [S.prologue(ctx), S.briefing(ctx)].forEach(function (arr, i) {
    if (!arr.length) bad('texto vacio (' + i + ')');
    arr.forEach(function (p) {
      if (typeof p !== 'string' || !p.trim()) bad('parrafo invalido en texto ' + i);
      if (p.indexOf('undefined') >= 0) bad('undefined en texto: ' + p.slice(0, 70));
    });
  });

  for (var h = 1; h <= 12; h++) {
    // El capitulo tiene que generar parrafos.
    var caps = S.CHAPTERS[h](ctx);
    if (!caps || !caps.length) bad('casa ' + h + ': capitulo vacio');
    caps.forEach(function (p) {
      if (p.indexOf('undefined') >= 0) bad('casa ' + h + ': undefined en el texto');
    });
    S.threatLine(ctx, h);
    if (S.CHAPTER_OUTRO[h]) S.CHAPTER_OUTRO[h](ctx, {});
    S.chapterFailText(ctx, h);

    var set = P.forHouse(h, ctx, seed);
    if (h === 4) {
      if (set !== null) bad('casa IV no deberia tener prueba');
      console.log('   IV   refugio, sin prueba');
      continue;
    }
    if (!set || !set.length) { bad('casa ' + h + ': sin prueba'); continue; }

    set.forEach(function (p, idx) {
      var etiqueta = 'casa ' + h + (set.length > 1 ? ' paso ' + (idx + 1) : '');
      if (!p.prompt || p.prompt.indexOf('undefined') >= 0) bad(etiqueta + ': prompt invalido');
      if (!p.options || p.options.length !== 4) {
        bad(etiqueta + ': tiene ' + (p.options ? p.options.length : 0) + ' opciones, deberian ser 4');
        return;
      }
      var correctas = p.options.filter(function (o) { return o.correct; });
      if (correctas.length !== 1) bad(etiqueta + ': ' + correctas.length + ' opciones correctas');
      var etiquetas = p.options.map(function (o) { return o.label; });
      if (new Set(etiquetas).size !== etiquetas.length) bad(etiqueta + ': opciones repetidas -> ' + etiquetas.join(' | '));
      etiquetas.forEach(function (l) {
        if (!l || String(l).indexOf('undefined') >= 0) bad(etiqueta + ': opcion invalida "' + l + '"');
      });
      // La explicacion tiene que funcionar en los dos casos.
      [true, false].forEach(function (ok) {
        var e = p.explain(ok);
        if (typeof e !== 'string' || !e.trim()) bad(etiqueta + ': explicacion vacia');
        if (e.indexOf('undefined') >= 0) bad(etiqueta + ': undefined en la explicacion');
      });
      if (idx === 0) {
        console.log('   ' + S.roman(h).padEnd(4) + ' ' +
          p.prompt.replace(/<[^>]+>/g, '').slice(0, 88));
      }
    });
  }

  // Finales.
  [true, false].forEach(function (won) {
    var e = S.ending(ctx, won);
    if (!e.title || !e.paragraphs.length) bad('final ' + won + ' incompleto');
    e.paragraphs.forEach(function (p) {
      if (p.indexOf('undefined') >= 0) bad('undefined en el final ' + won);
    });
  });
});

/* La misma carta y la misma semilla tienen que dar la misma partida. */
console.log('\n== Reproducibilidad ==');
(function () {
  var city = Places.find('Ciudad de Buenos Aires');
  var carta = C.build({ year: 1989, month: 7, day: 14, hour: 4, minute: 25,
    utcOffset: -3, lat: city.lat, lon: city.lon }, { system: 'placidus' });
  var ctx = { name: 'Bel', chart: carta, transits: T, state: {} };
  var a = P.forHouse(6, ctx, 999)[0];
  var b = P.forHouse(6, ctx, 999)[0];
  var igual = a.prompt === b.prompt &&
    a.options.map(function (o) { return o.label; }).join() ===
    b.options.map(function (o) { return o.label; }).join();
  if (!igual) bad('la misma semilla dio dos partidas distintas');
  else console.log('  OK  misma semilla, misma prueba');
  var c2 = P.forHouse(6, ctx, 1000)[0];
  console.log('  OK  otra semilla cambia el orden de opciones: ' +
    (c2.options.map(function (o) { return o.label; }).join() !==
     a.options.map(function (o) { return o.label; }).join()));
})();

/* Husos horarios argentinos: los casos que suelen salir mal. */
console.log('\n== Husos horarios de Argentina ==');
[
  [1989, 7, 14, -3, 'invierno 1989'],
  [1990, 1, 8, -2, 'horario de verano 1989/90'],
  [1965, 12, 20, -3, 'verano 1965, huso base -4'],
  [1965, 6, 1, -4, 'invierno 1965, huso base -4'],
  [1970, 3, 1, -3, 'tras el cambio de 1969'],
  [2008, 1, 15, -2, 'horario de verano 2007/08'],
  [2010, 1, 15, -3, 'sin horario de verano'],
  [1974, 3, 1, -2, 'verano 1974']
].forEach(function (t) {
  var got = Places.argentinaOffset(t[0], t[1], t[2]);
  var ok = got === t[3];
  if (!ok) fails++;
  console.log((ok ? '  OK  ' : ' FAIL ') + (t[0] + '-' + t[1] + '-' + t[2]).padEnd(12) +
    'UTC' + got + '  esperado UTC' + t[3] + '   ' + t[4]);
});

console.log('\n' + (fails === 0
  ? 'TODO OK: las doce casas generan partida jugable en todas las cartas probadas.'
  : fails + ' PROBLEMAS.'));
process.exit(fails === 0 ? 0 : 1);
