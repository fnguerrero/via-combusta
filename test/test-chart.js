/* Verificacion de angulos y casas SIN reusar las formulas de chart.js:
   se resuelve la geometria a mano (esfera celeste, altitud y angulo horario)
   y se compara contra lo que devuelve la libreria. */
var E = require('../js/astro/ephemeris.js');
var C = require('../js/astro/chart.js');

var D2R = Math.PI / 180, R2D = 180 / Math.PI;
var sind = function (x) { return Math.sin(x * D2R); };
var cosd = function (x) { return Math.cos(x * D2R); };
var tand = function (x) { return Math.tan(x * D2R); };
var norm360 = C.norm360;

var fails = 0;
function check(label, got, want, tolArcmin) {
  var d = got - want;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  var arcmin = Math.abs(d) * 60;
  var ok = arcmin <= tolArcmin;
  if (!ok) fails++;
  console.log((ok ? '  OK  ' : ' FAIL ') + label.padEnd(38) +
    'got=' + got.toFixed(5) + '  esperado=' + want.toFixed(5) +
    '  dif=' + arcmin.toFixed(3) + "'");
}

/* Coordenadas ecuatoriales de un punto de la ecliptica con beta = 0. */
function equatorial(lon, eps) {
  return {
    ra: norm360(Math.atan2(sind(lon) * cosd(eps), cosd(lon)) * R2D),
    dec: Math.asin(sind(eps) * sind(lon)) * R2D
  };
}
/* Altitud sobre el horizonte y si el punto esta al este (subiendo). */
function horizon(lon, eps, lat, ramc) {
  var eq = equatorial(lon, eps);
  var H = norm360(ramc - eq.ra);            // angulo horario, crece al oeste
  var Hs = H > 180 ? H - 360 : H;           // en (-180, 180]
  return {
    alt: Math.asin(sind(lat) * sind(eq.dec) + cosd(lat) * cosd(eq.dec) * cosd(H)) * R2D,
    rising: Hs < 0,
    H: Hs, dec: eq.dec, ra: eq.ra
  };
}

/* Ascendente por fuerza bruta: de los dos puntos donde la ecliptica corta el
   horizonte, el que esta subiendo (angulo horario negativo). Se barre en pasos
   de 0.05 grados detectando cualquier cambio de signo de la altitud. */
function ascendantBrute(eps, lat, ramc) {
  var found = [];
  var prev = horizon(0, eps, lat, ramc);
  for (var l = 0.05; l <= 360.0001; l += 0.05) {
    var cur = horizon(l, eps, lat, ramc);
    if ((prev.alt < 0) !== (cur.alt < 0)) {
      var lo = l - 0.05, hi = l, loNeg = prev.alt < 0;
      for (var i = 0; i < 60; i++) {
        var mid = (lo + hi) / 2;
        if ((horizon(mid, eps, lat, ramc).alt < 0) === loNeg) lo = mid; else hi = mid;
      }
      found.push(norm360((lo + hi) / 2));
    }
    prev = cur;
  }
  for (var k = 0; k < found.length; k++) {
    if (horizon(found[k], eps, lat, ramc).rising) return found[k];
  }
  return null;
}

/* Medio Cielo por fuerza bruta: punto de la ecliptica que cruza el meridiano
   superior, es decir angulo horario cero con altitud positiva. */
function midheavenBrute(eps, lat, ramc) {
  var prev = horizon(0, eps, lat, ramc);
  for (var l = 0.05; l <= 360.0001; l += 0.05) {
    var cur = horizon(l, eps, lat, ramc);
    // Cruce de H por cero en cualquier direccion, sin contar el salto de +-180.
    if ((prev.H < 0) !== (cur.H < 0) && Math.abs(cur.H - prev.H) < 90) {
      var lo = l - 0.05, hi = l, loNeg = prev.H < 0;
      for (var i = 0; i < 60; i++) {
        var mid = (lo + hi) / 2;
        if ((horizon(mid, eps, lat, ramc).H < 0) === loNeg) lo = mid; else hi = mid;
      }
      var res = norm360((lo + hi) / 2);
      if (horizon(res, eps, lat, ramc).alt > 0) return res;
    }
    prev = cur;
  }
  return null;
}

var CASOS = [
  { nombre: 'Buenos Aires (sur)', lat: -34.6037, lon: -58.3816, y: 1989, m: 7, d: 14, h: 4, mi: 25, off: -3 },
  { nombre: 'Buenos Aires (mediodia)', lat: -34.6037, lon: -58.3816, y: 1993, m: 11, d: 2, h: 12, mi: 0, off: -3 },
  { nombre: 'Londres (norte)', lat: 51.5074, lon: -0.1278, y: 1975, m: 3, d: 21, h: 18, mi: 40, off: 0 },
  { nombre: 'Quito (ecuador)', lat: -0.1807, lon: -78.4678, y: 2001, m: 12, d: 25, h: 23, mi: 10, off: -5 },
  { nombre: 'Ushuaia (sur extremo)', lat: -54.8019, lon: -68.3030, y: 1968, m: 6, d: 1, h: 9, mi: 5, off: -3 }
];

CASOS.forEach(function (c) {
  console.log('\n== ' + c.nombre + ' ==');
  var carta = C.build({
    year: c.y, month: c.m, day: c.d, hour: c.h, minute: c.mi,
    utcOffset: c.off, lat: c.lat, lon: c.lon
  }, { system: 'placidus' });

  var eps = carta.obliquity, ramc = carta.ramc, lat = c.lat;

  // 1) Ascendente y MC contra la resolucion geometrica directa.
  check('Ascendente vs geometria', carta.angles.asc.lon, ascendantBrute(eps, lat, ramc), 0.5);
  check('Medio Cielo vs geometria', carta.angles.mc.lon, midheavenBrute(eps, lat, ramc), 0.5);

  // 2) El Ascendente tiene que estar exactamente en el horizonte y subiendo.
  var hAsc = horizon(carta.angles.asc.lon, eps, lat, ramc);
  check('altitud del Ascendente (=0)', hAsc.alt, 0, 0.5);
  if (!hAsc.rising) { fails++; console.log(' FAIL el Ascendente no esta subiendo'); }
  else console.log('  OK  el Ascendente esta del lado este');

  // 3) El MC tiene que estar culminando y sobre el horizonte.
  var hMc = horizon(carta.angles.mc.lon, eps, lat, ramc);
  check('angulo horario del MC (=0)', hMc.H, 0, 0.5);
  if (hMc.alt <= 0) { fails++; console.log(' FAIL el MC quedo bajo el horizonte'); }
  else console.log('  OK  el MC esta sobre el horizonte');

  // 4) Definicion de Placidus: la cuspide 11 esta a 1/3 de su propio semiarco
  //    diurno contado desde el MC, la 12 a 2/3, y las 2 y 3 sobre el nocturno.
  if (carta.houseSystem === 'placidus') {
    [[11, 1 / 3, 'diurno'], [12, 2 / 3, 'diurno'],
     [2, 2 / 3, 'nocturno'], [3, 1 / 3, 'nocturno']].forEach(function (t) {
      var casa = t[0], frac = t[1], arco = t[2];
      var h = horizon(carta.houses[casa], eps, lat, ramc);
      var ad = Math.asin(tand(lat) * tand(h.dec)) * R2D;   // diferencia ascensional
      var semi = arco === 'diurno' ? (90 + ad) : (90 - ad);
      var esperado = arco === 'diurno' ? -frac * semi : -(180 - frac * semi);
      check('cuspide ' + casa + ': H vs ' + frac.toFixed(2) + ' semiarco', h.H, esperado, 1.0);
    });
  }

  // 5) Las 12 cuspides tienen que avanzar siempre en sentido antihorario.
  var suma = 0;
  for (var i = 1; i <= 12; i++) {
    var a = carta.houses[i], b = carta.houses[i === 12 ? 1 : i + 1];
    var paso = norm360(b - a);
    if (paso <= 0.0001 || paso >= 180) { fails++; console.log(' FAIL cuspide ' + i + ' avanza ' + paso.toFixed(2)); }
    suma += paso;
  }
  check('suma de los 12 arcos de casa', suma, 360, 1);

  // 6) Casas opuestas separadas exactamente 180 grados.
  for (var j = 1; j <= 6; j++) {
    var dif = norm360(carta.houses[j + 6] - carta.houses[j]);
    if (Math.abs(dif - 180) > 0.001) { fails++; console.log(' FAIL casas ' + j + '/' + (j + 6) + ' separadas ' + dif.toFixed(4)); }
  }
  console.log('  OK  casas opuestas a 180 grados');

  console.log('       AC ' + carta.angles.asc.text + '   MC ' + carta.angles.mc.text +
    '   carta ' + carta.sect + '   (' + carta.houseSystem + ')');
});

console.log('\n== Coherencia entre sistemas de casas ==');
var b = { year: 1989, month: 7, day: 14, hour: 4, minute: 25, utcOffset: -3, lat: -34.6037, lon: -58.3816 };
['placidus', 'porphyry', 'equal', 'whole'].forEach(function (sys) {
  var k = C.build(b, { system: sys });
  // En todos los sistemas la casa 1 arranca en el Ascendente o en su signo.
  var ok = sys === 'whole'
    ? C.signOf(k.houses[1]) === C.signOf(k.angles.asc.lon) && C.degInSign(k.houses[1]) < 0.0001
    : Math.abs(norm360(k.houses[1] - k.angles.asc.lon)) < 0.0001;
  if (!ok) fails++;
  console.log((ok ? '  OK  ' : ' FAIL ') + sys.padEnd(10) + 'casa 1 = ' + C.formatLon(k.houses[1]) +
    '   casa 10 = ' + C.formatLon(k.houses[10]));
});

console.log('\n== Via Combusta (15 Libra a 15 Escorpio) ==');
[[194.9, false], [195.1, true], [210, true], [224.9, true], [225.1, false]].forEach(function (t) {
  var got = C.inViaCombusta(t[0]);
  if (got !== t[1]) { fails++; }
  console.log((got === t[1] ? '  OK  ' : ' FAIL ') + t[0] + '° -> ' + got);
});

console.log('\n' + (fails === 0
  ? 'TODO OK: angulos y casas coinciden con la geometria resuelta a mano.'
  : fails + ' COMPROBACIONES FALLARON.'));
process.exit(fails === 0 ? 0 : 1);
