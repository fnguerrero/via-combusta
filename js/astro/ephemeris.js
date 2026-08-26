/* Efemerides: posiciones eclipticas geocentricas aparentes.
   Planetas via VSOP87D truncado, Luna via ELP-2000/82 truncado (Meeus cap. 47),
   Pluton via la serie propia de Meeus cap. 37, nutacion por los terminos
   principales de la serie IAU 1980. Todo en JS puro, sin dependencias. */
var Ephemeris = (function () {
  'use strict';

  var V = (typeof VSOP87 !== 'undefined') ? VSOP87 : require('./vsop87.js');

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;

  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function sind(x) { return Math.sin(x * D2R); }
  function cosd(x) { return Math.cos(x * D2R); }

  /* --- Tiempo --- */

  // Dia juliano a partir de una fecha del calendario (gregoriano tras 1582-10-15).
  function julianDay(y, m, d, hours) {
    hours = hours || 0;
    if (m <= 2) { y -= 1; m += 12; }
    var a = Math.floor(y / 100);
    var b = (y > 1582 || (y === 1582 && (m > 10 || (m === 10 && d >= 15))))
      ? 2 - a + Math.floor(a / 4) : 0;
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1))
      + d + b - 1524.5 + hours / 24;
  }

  // Calendario a partir del dia juliano.
  function calendarFromJD(jd) {
    var z = Math.floor(jd + 0.5), f = jd + 0.5 - z, a = z;
    if (z >= 2299161) {
      var alpha = Math.floor((z - 1867216.25) / 36524.25);
      a = z + 1 + alpha - Math.floor(alpha / 4);
    }
    var b = a + 1524, c = Math.floor((b - 122.1) / 365.25);
    var d = Math.floor(365.25 * c), e = Math.floor((b - d) / 30.6001);
    var day = b - d - Math.floor(30.6001 * e) + f;
    var month = e < 14 ? e - 1 : e - 13;
    var year = month > 2 ? c - 4716 : c - 4715;
    var dayInt = Math.floor(day), hours = (day - dayInt) * 24;
    return { year: year, month: month, day: dayInt, hours: hours };
  }

  /* Delta T = TT - UT, en segundos. Polinomios de Espenak & Meeus (NASA),
     que es el estandar practico para el rango de fechas de nacimiento reales. */
  function deltaT(year, month) {
    var y = year + ((month || 6) - 0.5) / 12, t, u;
    if (y < 1600) { u = (y - 1820) / 100; return -20 + 32 * u * u; }
    if (y < 1700) { t = y - 1600; return 120 - 0.9808 * t - 0.01532 * t * t + t * t * t / 7129; }
    if (y < 1800) { t = y - 1700; return 8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t * t * t - t * t * t * t / 1174000; }
    if (y < 1860) { t = y - 1800; return 13.72 - 0.332447 * t + 0.0068612 * t * t + 0.0041116 * Math.pow(t, 3) - 0.00037436 * Math.pow(t, 4) + 0.0000121272 * Math.pow(t, 5) - 0.0000001699 * Math.pow(t, 6) + 0.000000000875 * Math.pow(t, 7); }
    if (y < 1900) { t = y - 1860; return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * Math.pow(t, 3) - 0.0004473624 * Math.pow(t, 4) + Math.pow(t, 5) / 233174; }
    if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * Math.pow(t, 3) - 0.000197 * Math.pow(t, 4); }
    if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * Math.pow(t, 3); }
    if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + Math.pow(t, 3) / 2547; }
    if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - Math.pow(t, 3) / 718; }
    if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * Math.pow(t, 3) + 0.000651814 * Math.pow(t, 4) + 0.00002373599 * Math.pow(t, 5); }
    if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    if (y < 2150) { return -20 + 32 * Math.pow((y - 1820) / 100, 2) - 0.5628 * (2150 - y); }
    u = (y - 1820) / 100; return -20 + 32 * u * u;
  }

  /* --- Nutacion y oblicuidad (Meeus cap. 22) --- */

  var NUT = [
    // [D, M, M', F, Omega, dPsi_0.0001", dPsi_T, dEps_0.0001", dEps_T]
    [0,0,0,0,1,-171996,-174.2,92025,8.9],
    [-2,0,0,2,2,-13187,-1.6,5736,-3.1],
    [0,0,0,2,2,-2274,-0.2,977,-0.5],
    [0,0,0,0,2,2062,0.2,-895,0.5],
    [0,1,0,0,0,1426,-3.4,54,-0.1],
    [0,0,1,0,0,712,0.1,-7,0],
    [-2,1,0,2,2,-517,1.2,224,-0.6],
    [0,0,0,2,1,-386,-0.4,200,0],
    [0,0,1,2,2,-301,0,129,-0.1],
    [-2,-1,0,2,2,217,-0.5,-95,0.3],
    [-2,0,1,0,0,-158,0,0,0],
    [-2,0,0,2,1,129,0.1,-70,0],
    [0,0,-1,2,2,123,0,-53,0],
    [2,0,0,0,0,63,0,0,0],
    [0,0,1,0,1,63,0.1,-33,0],
    [2,0,-1,2,2,-59,0,26,0],
    [0,0,-1,0,1,-58,-0.1,32,0],
    [0,0,1,2,1,-51,0,27,0],
    [-2,0,2,0,0,48,0,0,0],
    [0,0,-2,2,1,46,0,-24,0],
    [2,0,0,2,2,-38,0,16,0],
    [0,0,2,2,2,-31,0,13,0],
    [0,0,2,0,0,29,0,0,0],
    [-2,0,1,2,2,29,0,-12,0],
    [0,0,0,2,0,26,0,0,0],
    [-2,0,0,2,0,-22,0,0,0],
    [0,0,-1,2,1,21,0,-10,0],
    [0,2,0,0,0,17,-0.1,0,0],
    [2,0,-1,0,1,16,0,-8,0],
    [-2,2,0,2,2,-16,0.1,7,0],
    [0,1,0,0,1,-15,0,9,0],
    [-2,0,1,0,1,-13,0,7,0],
    [0,-1,0,0,1,-12,0,6,0],
    [0,0,2,-2,0,11,0,0,0],
    [2,0,-1,2,1,-10,0,5,0],
    [2,0,1,2,2,-8,0,3,0],
    [0,1,0,2,2,7,0,-3,0],
    [-2,1,1,0,0,-7,0,0,0],
    [0,-1,0,2,2,-7,0,3,0],
    [2,0,0,2,1,-7,0,3,0],
    [2,0,1,0,0,6,0,0,0],
    [-2,0,2,2,2,6,0,-3,0],
    [-2,0,1,2,1,6,0,-3,0],
    [2,0,-2,0,1,-6,0,3,0],
    [2,0,0,0,1,-6,0,3,0],
    [0,-1,1,0,0,5,0,0,0],
    [-2,-1,0,2,1,-5,0,3,0],
    [-2,0,0,0,1,-5,0,3,0],
    [0,0,2,2,1,-5,0,3,0],
    [-2,0,2,0,1,4,0,0,0],
    [-2,1,0,2,1,4,0,0,0],
    [0,0,1,-2,0,4,0,0,0],
    [-1,0,1,0,0,-4,0,0,0],
    [-2,1,0,0,0,-4,0,0,0],
    [1,0,0,0,0,-4,0,0,0],
    [0,0,1,2,0,3,0,0,0],
    [0,0,-2,2,2,-3,0,0,0],
    [-1,-1,1,0,0,-3,0,0,0],
    [0,1,1,0,0,-3,0,0,0],
    [0,-1,1,2,2,-3,0,0,0],
    [2,-1,-1,2,2,-3,0,0,0],
    [0,0,3,2,2,-3,0,0,0],
    [2,-1,0,2,2,-3,0,0,0]
  ];

  function nutation(T) {
    var D = 297.85036 + 445267.111480 * T - 0.0019142 * T * T + T * T * T / 189474;
    var M = 357.52772 + 35999.050340 * T - 0.0001603 * T * T - T * T * T / 300000;
    var Mp = 134.96298 + 477198.867398 * T + 0.0086972 * T * T + T * T * T / 56250;
    var F = 93.27191 + 483202.017538 * T - 0.0036825 * T * T + T * T * T / 327270;
    var Om = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
    var dPsi = 0, dEps = 0;
    for (var i = 0; i < NUT.length; i++) {
      var r = NUT[i];
      var arg = r[0] * D + r[1] * M + r[2] * Mp + r[3] * F + r[4] * Om;
      var s = sind(arg), c = cosd(arg);
      dPsi += (r[5] + r[6] * T) * s;
      dEps += (r[7] + r[8] * T) * c;
    }
    return { dPsi: dPsi / 36000000, dEps: dEps / 36000000, omega: norm360(Om) };
  }

  function meanObliquity(T) {
    var U = T / 100;
    return 23.43929111
      - 4680.93 / 3600 * U - 1.55 / 3600 * U * U + 1999.25 / 3600 * Math.pow(U, 3)
      - 51.38 / 3600 * Math.pow(U, 4) - 249.67 / 3600 * Math.pow(U, 5)
      - 39.05 / 3600 * Math.pow(U, 6) + 7.12 / 3600 * Math.pow(U, 7)
      + 27.87 / 3600 * Math.pow(U, 8) + 5.79 / 3600 * Math.pow(U, 9)
      + 2.45 / 3600 * Math.pow(U, 10);
  }

  /* --- VSOP87 --- */

  function sumSeries(series, tau) {
    if (!series) return 0;
    var total = 0;
    for (var i = series.length - 1; i >= 0; i--) {
      var s = 0, terms = series[i];
      for (var j = 0; j < terms.length; j++) {
        s += terms[j][0] * Math.cos(terms[j][1] + terms[j][2] * tau);
      }
      total = total * tau + s;
    }
    return total * 1e-8;
  }

  // Coordenadas heliocentricas VSOP87D (equinoccio de la fecha) en grados y UA.
  function heliocentric(planet, jde) {
    var tau = (jde - 2451545.0) / 365250.0;
    var p = V[planet];
    return {
      L: norm360(sumSeries(p.L, tau) * R2D),
      B: sumSeries(p.B, tau) * R2D,
      R: sumSeries(p.R, tau)
    };
  }

  /* Aberracion anual en coordenadas eclipticas (Meeus 33.4). */
  function annualAberration(lon, lat, T) {
    var ecc = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
    var pi = 102.93735 + 1.71946 * T + 0.00046 * T * T;
    var L0sun = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var Msun = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sind(Msun)
      + (0.019993 - 0.000101 * T) * sind(2 * Msun) + 0.000289 * sind(3 * Msun);
    var sunLon = L0sun + C;
    var k = 20.49552 / 3600;
    return {
      dLon: (-k * cosd(sunLon - lon) + ecc * k * cosd(pi - lon)) / cosd(lat),
      dLat: -k * sind(lat) * (sind(sunLon - lon) - ecc * sind(pi - lon))
    };
  }

  /* Geocentrica aparente de un planeta: corrige tiempo-luz iterando y aplica
     aberracion anual por el metodo de Meeus (cap. 33). */
  function planetGeocentric(planet, jde) {
    var e = heliocentric('earth', jde);
    var x0 = e.R * cosd(e.B) * cosd(e.L),
        y0 = e.R * cosd(e.B) * sind(e.L),
        z0 = e.R * sind(e.B);
    var tauLight = 0, x = 0, y = 0, z = 0, dist = 0;
    for (var it = 0; it < 4; it++) {
      var p = heliocentric(planet, jde - tauLight);
      x = p.R * cosd(p.B) * cosd(p.L) - x0;
      y = p.R * cosd(p.B) * sind(p.L) - y0;
      z = p.R * sind(p.B) - z0;
      dist = Math.sqrt(x * x + y * y + z * z);
      tauLight = 0.0057755183 * dist;
    }
    var lon = norm360(Math.atan2(y, x) * R2D);
    var lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * R2D;

    var T = (jde - 2451545.0) / 36525.0;
    var ab = annualAberration(lon, lat, T);
    lon = norm360(lon + ab.dLon);
    lat = lat + ab.dLat;

    var nut = nutation(T);
    return { lon: norm360(lon + nut.dPsi), lat: lat, dist: dist };
  }

  /* Sol aparente: es la Tierra vista desde el Sol, mas 180 grados. */
  function sun(jde) {
    var T = (jde - 2451545.0) / 36525.0;
    var e = heliocentric('earth', jde);
    var lon = norm360(e.L + 180), lat = -e.B;
    // Conversion FK5 y aberracion.
    var lambdaP = lon - 1.397 * T - 0.00031 * T * T;
    lon += (-0.09033 / 3600);
    lat += (0.03916 / 3600) * (cosd(lambdaP) - sind(lambdaP));
    var aberration = -20.4898 / 3600 / e.R;
    lon += aberration;
    var nut = nutation(T);
    return { lon: norm360(lon + nut.dPsi), lat: lat, dist: e.R };
  }

  /* --- Luna: ELP-2000/82 truncado, tablas 47.A y 47.B de Meeus --- */

  var MOON_LR = [
    [0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],
    [0,0,2,0,213618,-569925],[0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],
    [2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],[2,0,1,0,53322,-170733],
    [2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],
    [0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],
    [0,0,1,-2,10980,79661],[4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],
    [4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],[2,1,0,0,-6766,30824],
    [1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],
    [2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],
    [0,1,-2,0,-2689,-7003],[2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],
    [1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884],[0,1,2,0,-2120,5751],
    [0,2,0,0,-2069,0],[2,-2,-1,0,2048,-4950],[2,0,1,-2,-1773,4130],
    [2,0,0,2,-1595,0],[4,-1,-1,0,1215,-3958],[0,0,2,2,-1110,0],
    [3,0,-1,0,-892,3258],[2,1,1,0,-810,2616],[4,-1,-2,0,759,-1897],
    [0,2,-1,0,-713,-2117],[2,2,-1,0,-700,2354],[2,1,-2,0,691,0],
    [2,-1,0,-2,596,0],[4,0,1,0,549,-1423],[0,0,4,0,537,-1117],
    [4,-1,0,0,520,-1571],[1,0,-2,0,-487,-1739],[2,1,0,-2,-399,0],
    [0,0,2,-2,-381,-4421],[1,1,1,0,351,0],[3,0,-2,0,-340,0],
    [4,0,-3,0,330,0],[2,-1,2,0,327,0],[0,2,1,0,-323,1165],
    [1,1,-1,0,299,0],[2,0,3,0,294,0],[2,0,-1,-2,0,8752]
  ];

  var MOON_B = [
    [0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],
    [2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],
    [2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],
    [2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],
    [2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],
    [0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],
    [0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],
    [4,0,0,-1,1021],[4,0,-1,1,833],[0,0,1,-3,777],[4,0,-2,1,671],
    [2,0,0,-3,607],[2,0,2,-1,596],[2,-1,1,-1,491],[2,0,-2,1,-451],
    [0,0,3,-1,439],[2,0,2,1,422],[2,0,-3,-1,421],[2,1,-1,1,-366],
    [2,1,0,1,-351],[4,0,0,1,331],[2,-1,1,1,315],[2,-2,0,-1,302],
    [0,0,1,3,-283],[2,1,1,-1,-229],[1,1,0,-1,223],[1,1,0,1,223],
    [0,1,-2,-1,-220],[2,1,-1,-1,-220],[1,0,1,1,-185],[2,-1,-2,-1,181],
    [0,1,2,1,-177],[4,0,-2,-1,176],[4,-1,-1,-1,166],[1,0,1,-1,-164],
    [4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,-1,115],[2,-2,0,1,107]
  ];

  function moon(jde) {
    var T = (jde - 2451545.0) / 36525.0;
    var Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + Math.pow(T, 3) / 538841 - Math.pow(T, 4) / 65194000;
    var D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + Math.pow(T, 3) / 545868 - Math.pow(T, 4) / 113065000;
    var M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + Math.pow(T, 3) / 24490000;
    var Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + Math.pow(T, 3) / 69699 - Math.pow(T, 4) / 14712000;
    var F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - Math.pow(T, 3) / 3526000 + Math.pow(T, 4) / 863310000;
    var A1 = 119.75 + 131.849 * T;
    var A2 = 53.09 + 479264.290 * T;
    var A3 = 313.45 + 481266.484 * T;
    var E = 1 - 0.002516 * T - 0.0000074 * T * T;

    var sumL = 0, sumR = 0, sumB = 0, i, r, arg, ecc;
    for (i = 0; i < MOON_LR.length; i++) {
      r = MOON_LR[i];
      arg = r[0] * D + r[1] * M + r[2] * Mp + r[3] * F;
      ecc = Math.abs(r[1]) === 1 ? E : (Math.abs(r[1]) === 2 ? E * E : 1);
      sumL += r[4] * ecc * sind(arg);
      sumR += r[5] * ecc * cosd(arg);
    }
    for (i = 0; i < MOON_B.length; i++) {
      r = MOON_B[i];
      arg = r[0] * D + r[1] * M + r[2] * Mp + r[3] * F;
      ecc = Math.abs(r[1]) === 1 ? E : (Math.abs(r[1]) === 2 ? E * E : 1);
      sumB += r[4] * ecc * sind(arg);
    }
    sumL += 3958 * sind(A1) + 1962 * sind(Lp - F) + 318 * sind(A2);
    sumB += -2235 * sind(Lp) + 382 * sind(A3) + 175 * sind(A1 - F)
      + 175 * sind(A1 + F) + 127 * sind(Lp - Mp) - 115 * sind(Lp + Mp);

    var nut = nutation(T);
    return {
      lon: norm360(Lp + sumL / 1000000 + nut.dPsi),
      lat: sumB / 1000000,
      dist: 385000.56 + sumR / 1000
    };
  }

  /* Nodo lunar. El medio es la formula polinomica; el verdadero suma los
     terminos periodicos principales (Meeus cap. 47). */
  function lunarNode(jde, trueNode) {
    var T = (jde - 2451545.0) / 36525.0;
    var Om = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T
      + Math.pow(T, 3) / 467441 - Math.pow(T, 4) / 60616000;
    if (!trueNode) return norm360(Om);
    var D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + Math.pow(T, 3) / 545868;
    var M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
    var Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + Math.pow(T, 3) / 69699;
    var F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - Math.pow(T, 3) / 3526000;
    Om += -1.4979 * sind(2 * (D - F))
      - 0.1500 * sind(M)
      - 0.1226 * sind(2 * D)
      + 0.1176 * sind(2 * F)
      - 0.0801 * sind(2 * (Mp - F));
    return norm360(Om);
  }

  /* --- Pluton: serie de Meeus cap. 37, valida ~1885-2099 --- */

  var PLUTO = [
    [0,0,1,-19799805,19850055,-5452852,-14974862,66865439,68951812],
    [0,0,2,897144,-4954829,3527812,1672790,-11827535,-332538],
    [0,0,3,611149,1211027,-1050748,327647,1593179,-1438890],
    [0,0,4,-341243,-189585,178690,-292153,-18444,483220],
    [0,0,5,129287,-34992,18650,100340,-65977,-85431],
    [0,0,6,-38164,30893,-30697,-25823,31174,-6032],
    [0,1,-1,20442,-9987,4878,11248,-5794,22161],
    [0,1,0,-4063,-5071,226,-64,4601,4032],
    [0,1,1,-6016,-3336,2030,-836,-1729,234],
    [0,1,2,-3956,3039,69,-604,-415,702],
    [0,1,3,-667,3572,-247,-567,239,723],
    [0,2,-2,1276,501,-57,1,67,-67],
    [0,2,-1,1152,-917,-122,175,1034,-451],
    [0,2,0,630,-1277,-49,-164,-129,504],
    [1,-1,0,2571,-459,-197,199,480,-231],
    [1,-1,1,899,-1449,-25,217,2,-441],
    [1,0,-3,-1016,1043,589,-248,-3359,265],
    [1,0,-2,-2343,-1012,-269,711,7856,-7832],
    [1,0,-1,7042,788,185,193,36,45901],
    [1,0,0,1199,-338,315,807,8663,8547],
    [1,0,1,418,-67,-130,-43,-809,-769],
    [1,0,2,120,-274,5,3,263,-144],
    [1,0,3,-60,-159,2,17,-126,32],
    [1,0,4,-82,-29,2,5,-35,-16],
    [1,1,-3,-36,-29,2,3,-19,-4],
    [1,1,-2,-40,7,3,1,-15,8],
    [1,1,-1,-14,22,2,-1,-4,12],
    [1,1,0,4,13,1,-1,5,6],
    [1,1,1,5,2,0,-1,3,1],
    [1,1,3,-1,0,0,0,6,-2],
    [2,0,-6,2,0,0,-2,2,2],
    [2,0,-5,-4,5,2,2,-2,-2],
    [2,0,-4,4,-7,-7,0,14,13],
    [2,0,-3,14,24,10,-8,-63,13],
    [2,0,-2,-49,-34,-3,20,136,-236],
    [2,0,-1,163,-48,6,5,273,1065],
    [2,0,0,9,-24,14,17,251,149],
    [2,0,1,-4,1,-2,0,-25,-9],
    [2,0,2,-3,1,0,0,9,-2],
    [2,0,3,1,3,0,0,-8,7],
    [3,0,-2,-3,-1,0,1,2,-10],
    [3,0,-1,5,-3,0,0,19,35],
    [3,0,0,0,0,1,0,10,3]
  ];

  // Heliocentrica de Pluton, en el equinoccio J2000.
  function plutoHeliocentric(jde) {
    var T = (jde - 2451545.0) / 36525.0;
    var J = 34.35 + 3034.9057 * T;
    var S = 50.08 + 1222.1138 * T;
    var P = 238.96 + 144.9600 * T;
    var sl = 0, sb = 0, sr = 0;
    for (var i = 0; i < PLUTO.length; i++) {
      var t = PLUTO[i];
      var a = t[0] * J + t[1] * S + t[2] * P;
      var sa = sind(a), ca = cosd(a);
      sl += t[3] * sa + t[4] * ca;
      sb += t[5] * sa + t[6] * ca;
      sr += t[7] * sa + t[8] * ca;
    }
    return {
      L: norm360(238.958116 + 144.96 * T + sl * 1e-6),
      B: -3.908239 + sb * 1e-6,
      R: 40.7241346 + sr * 1e-7
    };
  }

  function plutoGeocentric(jde) {
    // La serie esta en J2000; la Tierra se pide en J2000 para restar en el mismo marco.
    var T = (jde - 2451545.0) / 36525.0;
    var e = heliocentric('earth', jde);
    // Precesion de la Tierra de la fecha a J2000 (Meeus cap. 21, forma ecliptica).
    var eJ2000 = eclipticToJ2000(e.L, e.B, T);
    var x0 = e.R * cosd(eJ2000.lat) * cosd(eJ2000.lon),
        y0 = e.R * cosd(eJ2000.lat) * sind(eJ2000.lon),
        z0 = e.R * sind(eJ2000.lat);
    var tauLight = 0, x = 0, y = 0, z = 0, dist = 0;
    for (var it = 0; it < 3; it++) {
      var p = plutoHeliocentric(jde - tauLight);
      x = p.R * cosd(p.B) * cosd(p.L) - x0;
      y = p.R * cosd(p.B) * sind(p.L) - y0;
      z = p.R * sind(p.B) - z0;
      dist = Math.sqrt(x * x + y * y + z * z);
      tauLight = 0.0057755183 * dist;
    }
    var lon = norm360(Math.atan2(y, x) * R2D);
    var lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * R2D;
    // De J2000 al equinoccio de la fecha, luego aberracion anual y nutacion.
    var d = eclipticFromJ2000(lon, lat, T);
    var ab = annualAberration(d.lon, d.lat, T);
    var nut = nutation(T);
    return { lon: norm360(d.lon + ab.dLon + nut.dPsi), lat: d.lat + ab.dLat, dist: dist };
  }

  /* Precesion en coordenadas eclipticas (Meeus 21.5/21.6). */
  function eclipticFromJ2000(lon, lat, T) {
    var eta = (47.0029 * T - 0.03302 * T * T + 0.000060 * T * T * T) / 3600;
    var Pi = 174.876384 + (3289.4789 * T + 0.60622 * T * T) / 3600;
    var p = (5029.0966 * T + 1.11113 * T * T - 0.000006 * T * T * T) / 3600;
    var A = cosd(lat) * sind(Pi - lon);
    var B = cosd(eta) * cosd(lat) * cosd(Pi - lon) - sind(eta) * sind(lat);
    var C = cosd(eta) * sind(lat) + sind(eta) * cosd(lat) * cosd(Pi - lon);
    return { lon: norm360(p + Pi - Math.atan2(A, B) * R2D), lat: Math.asin(C) * R2D };
  }

  function eclipticToJ2000(lon, lat, T) {
    var eta = (47.0029 * T - 0.03302 * T * T + 0.000060 * T * T * T) / 3600;
    var Pi = 174.876384 - (869.8089 * T + 0.03536 * T * T) / 3600;
    var p = (5029.0966 * T + 1.11113 * T * T - 0.000006 * T * T * T) / 3600;
    var A = cosd(lat) * sind(Pi + p - lon);
    var B = cosd(eta) * cosd(lat) * cosd(Pi + p - lon) + sind(eta) * sind(lat);
    var C = cosd(eta) * sind(lat) - sind(eta) * cosd(lat) * cosd(Pi + p - lon);
    return { lon: norm360(Pi - Math.atan2(A, B) * R2D), lat: Math.asin(C) * R2D };
  }

  /* Tiempo sideral aparente en Greenwich, en grados (Meeus cap. 12). */
  function siderealTime(jdUT, T, nut, eps) {
    var theta = 280.46061837 + 360.98564736629 * (jdUT - 2451545.0)
      + 0.000387933 * T * T - T * T * T / 38710000;
    return norm360(theta + nut.dPsi * cosd(eps));
  }

  /* --- API publica --- */

  // Devuelve las longitudes eclipticas aparentes de todos los cuerpos.
  // jdUT: dia juliano en tiempo universal.
  function positions(jdUT, year, month) {
    var dt = deltaT(year, month);
    var jde = jdUT + dt / 86400;
    var T = (jde - 2451545.0) / 36525.0;
    var nut = nutation(T);
    var eps = meanObliquity(T) + nut.dEps;

    var out = {};
    out.sun = sun(jde);
    out.moon = moon(jde);
    var planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    for (var i = 0; i < planets.length; i++) {
      out[planets[i]] = planetGeocentric(planets[i], jde);
    }
    out.pluto = plutoGeocentric(jde);
    out.northNode = { lon: lunarNode(jde, true), lat: 0, dist: 0 };
    out.southNode = { lon: norm360(out.northNode.lon + 180), lat: 0, dist: 0 };
    // Lilith (apogeo lunar medio), muy usada en carta natal.
    out.lilith = { lon: meanApogee(T), lat: 0, dist: 0 };

    out._meta = { jde: jde, jdUT: jdUT, T: T, obliquity: eps, nutation: nut, deltaT: dt };
    return out;
  }

  function meanApogee(T) {
    // Perigeo medio + 180 grados (Meeus cap. 47, argumento del perigeo).
    var Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
    var Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
    return norm360(Lp - Mp + 180);
  }

  // Velocidad aparente en longitud (grados/dia) por diferencias centradas.
  // Sirve para detectar retrogradacion, que en astrologia cambia el juicio.
  function speed(body, jdUT, year, month) {
    var h = 0.5;
    var a = positions(jdUT - h, year, month)[body].lon;
    var b = positions(jdUT + h, year, month)[body].lon;
    var d = b - a;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d / (2 * h);
  }

  return {
    julianDay: julianDay,
    calendarFromJD: calendarFromJD,
    deltaT: deltaT,
    nutation: nutation,
    meanObliquity: meanObliquity,
    siderealTime: siderealTime,
    heliocentric: heliocentric,
    planetGeocentric: planetGeocentric,
    plutoHeliocentric: plutoHeliocentric,
    sun: sun,
    moon: moon,
    lunarNode: lunarNode,
    positions: positions,
    speed: speed,
    norm360: norm360
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = Ephemeris; }
