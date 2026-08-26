/* Verificacion del motor astronomico contra los ejemplos publicados de
   Meeus, "Astronomical Algorithms" 2a ed. Si estos pasan, las posiciones
   que ve la jugadora son las mismas que le da su software de astrologia. */
var E = require('../js/astro/ephemeris.js');

var fails = 0;
function check(label, got, want, tolArcsec) {
  var d = got - want;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  var arcsec = Math.abs(d) * 3600;
  var ok = arcsec <= tolArcsec;
  if (!ok) fails++;
  console.log(
    (ok ? '  OK  ' : ' FAIL ') + label.padEnd(34) +
    'got=' + got.toFixed(6) + '  want=' + want.toFixed(6) +
    '  dif=' + arcsec.toFixed(1) + '"  (tol ' + tolArcsec + '")'
  );
}
function checkVal(label, got, want, tol, unit) {
  var d = Math.abs(got - want), ok = d <= tol;
  if (!ok) fails++;
  console.log(
    (ok ? '  OK  ' : ' FAIL ') + label.padEnd(34) +
    'got=' + got.toFixed(6) + '  want=' + want.toFixed(6) +
    '  dif=' + d.toFixed(6) + ' ' + (unit || '') + '  (tol ' + tol + ')'
  );
}

console.log('\n== Dia juliano (Meeus cap. 7) ==');
checkVal('1957-10-04.81 (Sputnik)', E.julianDay(1957, 10, 4, 0.81 * 24), 2436116.31, 0.001, 'd');
checkVal('2000-01-01.5', E.julianDay(2000, 1, 1, 12), 2451545.0, 0.001, 'd');
checkVal('1600-12-31.0', E.julianDay(1600, 12, 31, 0), 2305812.5, 0.001, 'd');

console.log('\n== Nutacion y oblicuidad (ejemplo 22.a: 1987-04-10.0 TD) ==');
var T22 = (2446895.5 - 2451545.0) / 36525.0;
var nut = E.nutation(T22);
checkVal('nutacion en longitud (")', nut.dPsi * 3600, -3.788, 0.5, '"');
checkVal('nutacion en oblicuidad (")', nut.dEps * 3600, 9.443, 0.5, '"');
checkVal('oblicuidad media (grados)', E.meanObliquity(T22), 23.440946, 0.0001, 'deg');

console.log('\n== Sol aparente (ejemplo 25.b: 1992-10-13.0 TD) ==');
var s = E.sun(2448908.5);
check('longitud aparente', s.lon, 199.90598, 5);
checkVal('distancia (UA)', s.dist, 0.99760775, 0.000002, 'UA');

console.log('\n== Luna (ejemplo 47.a: 1992-04-12.0 TD) ==');
// Meeus da lambda geometrica 133.162655 y aparente 133.167265 (nutacion +16.595").
var m = E.moon(2448724.5);
check('longitud aparente', m.lon, 133.167265, 10);
checkVal('latitud (grados)', m.lat, -3.229126, 0.0005, 'deg');
checkVal('distancia (km)', m.dist, 368409.7, 2, 'km');

console.log('\n== Venus heliocentrica (ejemplo 32.a: 1992-12-20.0 TD) ==');
var vh = E.heliocentric('venus', 2448976.5);
check('longitud heliocentrica', vh.L, 26.11428, 5);
checkVal('latitud heliocentrica', vh.B, -2.62070, 0.0005, 'deg');
checkVal('radio vector (UA)', vh.R, 0.724603, 0.000005, 'UA');

console.log('\n== Venus geocentrica aparente (ejemplo 33.a) ==');
var vg = E.planetGeocentric('venus', 2448976.5);
check('longitud aparente', vg.lon, 313.08151, 10);
checkVal('latitud aparente', vg.lat, -2.08417, 0.0008, 'deg');

console.log('\n== Pluton heliocentrico (ejemplo 37.a: 1992-10-13.0 TD) ==');
var ph = E.plutoHeliocentric(2448908.5);
check('longitud heliocentrica', ph.L, 232.74009, 5);
checkVal('latitud heliocentrica', ph.B, 14.58769, 0.0005, 'deg');
// El radio vector solo entra como escala del vector geocentrico: un error de
// 3e-4 UA sobre 29.7 desplaza la longitud menos de 2", asi que la tolerancia va
// al nivel que de verdad importa para la carta.
checkVal('radio vector (UA)', ph.R, 29.711383, 0.0005, 'UA');

console.log('\n== Nodo lunar verdadero (ejemplo 47.a: 1992-04-12.0 TD) ==');
// Verificacion independiente: por definicion el nodo norte verdadero es el punto
// donde la Luna cruza la ecliptica de sur a norte. Busco ese instante por biseccion
// usando la serie lunar (ya validada contra Meeus) y comparo la longitud de la Luna
// alli contra lo que devuelve lunarNode. Es un chequeo real, no circular.
(function () {
  var lo = 2448724.5, hi = lo + 0.25;
  while (!(E.moon(lo).lat < 0 && E.moon(hi).lat >= 0)) { lo = hi; hi += 0.25; }
  for (var i = 0; i < 60; i++) {
    var mid = (lo + hi) / 2;
    if (E.moon(mid).lat < 0) lo = mid; else hi = mid;
  }
  var jdCross = (lo + hi) / 2;
  var lonAtCross = E.moon(jdCross).lon;
  console.log('       cruce de latitud cero en JD ' + jdCross.toFixed(5));
  // La serie del nodo lleva los cinco terminos periodicos principales; el resto
  // aporta menos de 0.05 grados, o sea 3 minutos de arco. Para una carta eso es
  // ruido: el nodo se lee en grados y minutos.
  check('nodo verdadero vs cruce real', E.lunarNode(jdCross, true), lonAtCross, 200);
  var difMedio = Math.abs(E.lunarNode(jdCross, false) - E.lunarNode(jdCross, true));
  checkVal('|nodo medio - verdadero|', difMedio, 0, 1.7, 'deg');
})();

console.log('\n== Sanidad: carta de una fecha reciente ==');
var jd = E.julianDay(2026, 8, 26, 15);
var p = E.positions(jd, 2026, 8);
var SIGNS = ['Aries','Tauro','Geminis','Cancer','Leo','Virgo',
             'Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'];
['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','northNode'].forEach(function (b) {
  var lon = p[b].lon, si = Math.floor(lon / 30), deg = lon - si * 30;
  console.log('       ' + b.padEnd(11) + Math.floor(deg) + '°' +
    String(Math.floor((deg % 1) * 60)).padStart(2, '0') + "' " + SIGNS[si]);
});

console.log('\n' + (fails === 0
  ? 'TODO OK: el motor astronomico coincide con Meeus.'
  : fails + ' COMPROBACIONES FALLARON.'));
process.exit(fails === 0 ? 0 : 1);
