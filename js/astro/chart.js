/* Carta natal: angulos, sistemas de casas, aspectos y la Via Combusta.
   Placidus por semiarcos, con caida a Porphyry donde Placidus no existe
   (latitudes altas, cuando el punto no llega a cruzar el horizonte). */
var Chart = (function () {
  'use strict';

  var E = (typeof Ephemeris !== 'undefined') ? Ephemeris : require('./ephemeris.js');
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;

  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function sind(x) { return Math.sin(x * D2R); }
  function cosd(x) { return Math.cos(x * D2R); }
  function tand(x) { return Math.tan(x * D2R); }

  var SIGNS = ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
    'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'];
  var GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  var ELEMENTS = ['fuego', 'tierra', 'aire', 'agua'];
  var MODES = ['cardinal', 'fijo', 'mutable'];

  function signOf(lon) { return Math.floor(norm360(lon) / 30); }
  function degInSign(lon) { return norm360(lon) - signOf(lon) * 30; }
  function elementOf(lon) { return ELEMENTS[signOf(lon) % 4]; }
  function modeOf(lon) { return MODES[signOf(lon) % 3]; }

  function formatLon(lon) {
    var s = signOf(lon), d = degInSign(lon);
    var deg = Math.floor(d), min = Math.floor((d - deg) * 60);
    return deg + '°' + (min < 10 ? '0' : '') + min + "' " + GLYPHS[s];
  }
  function formatLonLong(lon) {
    var s = signOf(lon), d = degInSign(lon);
    var deg = Math.floor(d), min = Math.floor((d - deg) * 60);
    return deg + '°' + (min < 10 ? '0' : '') + min + "' de " + SIGNS[s];
  }

  /* --- Angulos --- */

  // Ascendente: interseccion oriental de la ecliptica con el horizonte.
  function ascendant(ramc, eps, lat) {
    var y = cosd(ramc);
    var x = -(sind(ramc) * cosd(eps) + tand(lat) * sind(eps));
    var asc = Math.atan2(y, x) * R2D;
    return norm360(asc);
  }

  // Medio Cielo: interseccion de la ecliptica con el meridiano superior.
  function midheaven(ramc, eps) {
    var mc = Math.atan2(sind(ramc), cosd(ramc) * cosd(eps)) * R2D;
    return norm360(mc);
  }

  // Longitud ecliptica de un punto a partir de su ascension recta (beta = 0).
  function lonFromRA(ra, eps) {
    return norm360(Math.atan2(sind(ra) / cosd(eps), cosd(ra)) * R2D);
  }

  /* Cuspide de Placidus por semiarcos.
     Para un punto de la ecliptica con ascension recta RA vale tan(dec) = sin(RA)*tan(eps),
     y su diferencia ascensional es AD = asin(tan(lat)*tan(dec)). Repartiendo el
     semiarco en tercios sale RA = RAMC + offset + factor*AD, que se resuelve iterando. */
  function placidusCusp(ramc, eps, lat, offset, factor) {
    var ra = ramc + offset;
    for (var i = 0; i < 60; i++) {
      var dec = Math.atan(sind(ra) * tand(eps)) * R2D;
      var x = tand(lat) * tand(dec);
      if (x > 1 || x < -1) return null;           // el punto no cruza el horizonte
      var ad = Math.asin(x) * R2D;
      var next = ramc + offset + factor * ad;
      if (Math.abs(next - ra) < 1e-9) { ra = next; break; }
      ra = next;
    }
    return lonFromRA(norm360(ra), eps);
  }

  // Porphyry: trisecar los cuadrantes entre los angulos. Siempre existe.
  function porphyryCusps(asc, mc) {
    var c = new Array(13);
    c[1] = asc; c[4] = norm360(mc + 180); c[7] = norm360(asc + 180); c[10] = mc;
    var q1 = norm360(c[4] - c[1]), q2 = norm360(c[7] - c[4]);
    c[2] = norm360(c[1] + q1 / 3); c[3] = norm360(c[1] + 2 * q1 / 3);
    c[5] = norm360(c[4] + q2 / 3); c[6] = norm360(c[4] + 2 * q2 / 3);
    c[8] = norm360(c[2] + 180); c[9] = norm360(c[3] + 180);
    c[11] = norm360(c[5] + 180); c[12] = norm360(c[6] + 180);
    return c;
  }

  function houseCusps(system, ramc, eps, lat, asc, mc) {
    var c = new Array(13), i;
    if (system === 'whole') {
      // Casas de signo entero: la casa 1 es todo el signo del Ascendente.
      var start = signOf(asc) * 30;
      for (i = 1; i <= 12; i++) c[i] = norm360(start + (i - 1) * 30);
      return { cusps: c, system: 'whole', fallback: false };
    }
    if (system === 'equal') {
      for (i = 1; i <= 12; i++) c[i] = norm360(asc + (i - 1) * 30);
      return { cusps: c, system: 'equal', fallback: false };
    }
    if (system === 'porphyry') {
      return { cusps: porphyryCusps(asc, mc), system: 'porphyry', fallback: false };
    }
    // Placidus
    var c11 = placidusCusp(ramc, eps, lat, 30, 1 / 3);
    var c12 = placidusCusp(ramc, eps, lat, 60, 2 / 3);
    var c2 = placidusCusp(ramc, eps, lat, 120, 2 / 3);
    var c3 = placidusCusp(ramc, eps, lat, 150, 1 / 3);
    if (c11 === null || c12 === null || c2 === null || c3 === null) {
      return { cusps: porphyryCusps(asc, mc), system: 'porphyry', fallback: true };
    }
    c[1] = asc; c[10] = mc;
    c[11] = c11; c[12] = c12; c[2] = c2; c[3] = c3;
    c[4] = norm360(mc + 180); c[7] = norm360(asc + 180);
    c[5] = norm360(c11 + 180); c[6] = norm360(c12 + 180);
    c[8] = norm360(c2 + 180); c[9] = norm360(c3 + 180);
    return { cusps: c, system: 'placidus', fallback: false };
  }

  // En que casa cae una longitud, dadas las cuspides.
  function houseOf(lon, cusps) {
    lon = norm360(lon);
    for (var h = 1; h <= 12; h++) {
      var a = cusps[h], b = cusps[h === 12 ? 1 : h + 1];
      var span = norm360(b - a), pos = norm360(lon - a);
      if (span === 0) span = 360;
      if (pos < span) return h;
    }
    return 1;
  }

  /* --- Aspectos --- */

  var ASPECTS = [
    { name: 'conjunción', angle: 0, orb: 8, kind: 'neutro', glyph: '☌' },
    { name: 'oposición', angle: 180, orb: 8, kind: 'duro', glyph: '☍' },
    { name: 'trígono', angle: 120, orb: 7, kind: 'blando', glyph: '△' },
    { name: 'cuadratura', angle: 90, orb: 7, kind: 'duro', glyph: '□' },
    { name: 'sextil', angle: 60, orb: 5, kind: 'blando', glyph: '⚹' },
    { name: 'quincuncio', angle: 150, orb: 3, kind: 'duro', glyph: '⚻' },
    { name: 'semisextil', angle: 30, orb: 2, kind: 'menor', glyph: '⚺' },
    { name: 'semicuadratura', angle: 45, orb: 2, kind: 'duro', glyph: '∠' },
    { name: 'sesquicuadratura', angle: 135, orb: 2, kind: 'duro', glyph: '⚼' }
  ];

  // Orbe reducido para cuerpos menores; luminarias mantienen el orbe pleno.
  var LUMINARIES = { sun: 1, moon: 1 };
  function orbFor(aspect, a, b) {
    var orb = aspect.orb;
    if (LUMINARIES[a] || LUMINARIES[b]) orb += 2;
    if (a === 'northNode' || b === 'northNode' || a === 'lilith' || b === 'lilith') orb -= 2;
    return Math.max(1, orb);
  }

  function separation(l1, l2) {
    var d = Math.abs(norm360(l1) - norm360(l2));
    return d > 180 ? 360 - d : d;
  }

  function findAspects(positions, bodies, opts) {
    opts = opts || {};
    var minor = opts.includeMinor !== false;
    var out = [];
    for (var i = 0; i < bodies.length; i++) {
      for (var j = i + 1; j < bodies.length; j++) {
        var a = bodies[i], b = bodies[j];
        if (!positions[a] || !positions[b]) continue;
        var sep = separation(positions[a].lon, positions[b].lon);
        for (var k = 0; k < ASPECTS.length; k++) {
          var asp = ASPECTS[k];
          if (!minor && asp.kind === 'menor') continue;
          var orb = orbFor(asp, a, b);
          var diff = Math.abs(sep - asp.angle);
          if (diff <= orb) {
            out.push({
              a: a, b: b, aspect: asp.name, glyph: asp.glyph, kind: asp.kind,
              angle: asp.angle, orb: diff, exactness: 1 - diff / orb,
              // Aplicativo: el mas rapido todavia se acerca al aspecto exacto.
              applying: isApplying(positions, a, b, asp.angle)
            });
            break;   // un par de planetas forma un solo aspecto
          }
        }
      }
    }
    return out.sort(function (x, y) { return x.orb - y.orb; });
  }

  function isApplying(positions, a, b, angle) {
    var sa = positions[a].speed, sb = positions[b].speed;
    if (sa === undefined || sb === undefined) return null;
    var fast = Math.abs(sa) >= Math.abs(sb) ? a : b;
    var slow = fast === a ? b : a;
    var d = norm360(positions[fast].lon - positions[slow].lon);
    var target1 = angle, target2 = norm360(-angle);
    var rel = positions[fast].speed - positions[slow].speed;
    var to1 = norm360(target1 - d), to2 = norm360(target2 - d);
    var dist = Math.min(to1, to2);
    var distBack = Math.min(norm360(d - target1), norm360(d - target2));
    return rel > 0 ? dist < distBack : distBack < dist;
  }

  /* --- Via Combusta ---
     Tramo de 15 Libra a 15 Escorpio que la tradicion marca como via quemada:
     un planeta ahi se considera afligido y las preguntas horarias, no radicales. */
  var VIA_COMBUSTA = { start: 195, end: 225 };
  function inViaCombusta(lon) {
    lon = norm360(lon);
    return lon >= VIA_COMBUSTA.start && lon < VIA_COMBUSTA.end;
  }

  /* --- Construccion de la carta --- */

  var BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter',
    'saturn', 'uranus', 'neptune', 'pluto', 'northNode', 'lilith'];

  var LABELS = {
    sun: 'Sol', moon: 'Luna', mercury: 'Mercurio', venus: 'Venus', mars: 'Marte',
    jupiter: 'Júpiter', saturn: 'Saturno', uranus: 'Urano', neptune: 'Neptuno',
    pluto: 'Plutón', northNode: 'Nodo Norte', southNode: 'Nodo Sur', lilith: 'Lilith'
  };
  var BODY_GLYPHS = {
    sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃',
    saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
    northNode: '☊', southNode: '☋', lilith: '⚸'
  };

  /* Construye la carta completa.
     birth: { year, month, day, hour, minute, utcOffset, lat, lon }
     utcOffset en horas (Buenos Aires = -3), lon positiva al este. */
  function build(birth, options) {
    options = options || {};
    var system = options.system || 'placidus';

    var hourLocal = birth.hour + (birth.minute || 0) / 60;
    var hourUT = hourLocal - birth.utcOffset;
    var jdUT = E.julianDay(birth.year, birth.month, birth.day, hourUT);

    var pos = E.positions(jdUT, birth.year, birth.month);
    var eps = pos._meta.obliquity;
    var nut = pos._meta.nutation;

    var gst = E.siderealTime(jdUT, pos._meta.T, nut, eps);
    var ramc = norm360(gst + birth.lon);

    var asc = ascendant(ramc, eps, birth.lat);
    var mc = midheaven(ramc, eps);
    // En el hemisferio sur (o si el MC quedara bajo el horizonte) hay que
    // asegurar que el MC este del lado correcto respecto del Ascendente.
    if (norm360(mc - asc) < 180) mc = norm360(mc + 180);

    var houses = houseCusps(system, ramc, eps, birth.lat, asc, mc);

    // Velocidades: definen retrogradacion y si un aspecto aplica o separa.
    var bodies = {};
    for (var i = 0; i < BODIES.length; i++) {
      var b = BODIES[i];
      var sp = E.speed(b, jdUT, birth.year, birth.month);
      bodies[b] = {
        key: b,
        label: LABELS[b],
        glyph: BODY_GLYPHS[b],
        lon: pos[b].lon,
        lat: pos[b].lat,
        speed: sp,
        retrograde: sp < 0,
        sign: signOf(pos[b].lon),
        signName: SIGNS[signOf(pos[b].lon)],
        degInSign: degInSign(pos[b].lon),
        element: elementOf(pos[b].lon),
        mode: modeOf(pos[b].lon),
        house: houseOf(pos[b].lon, houses.cusps),
        viaCombusta: inViaCombusta(pos[b].lon),
        text: formatLon(pos[b].lon)
      };
    }
    // El Nodo Sur va siempre opuesto al Norte.
    bodies.southNode = Object.assign({}, bodies.northNode, {
      key: 'southNode', label: LABELS.southNode, glyph: BODY_GLYPHS.southNode,
      lon: norm360(bodies.northNode.lon + 180)
    });
    bodies.southNode.sign = signOf(bodies.southNode.lon);
    bodies.southNode.signName = SIGNS[bodies.southNode.sign];
    bodies.southNode.degInSign = degInSign(bodies.southNode.lon);
    bodies.southNode.house = houseOf(bodies.southNode.lon, houses.cusps);
    bodies.southNode.text = formatLon(bodies.southNode.lon);

    var angles = {
      asc: { key: 'asc', label: 'Ascendente', glyph: 'AC', lon: asc, sign: signOf(asc), signName: SIGNS[signOf(asc)], degInSign: degInSign(asc), text: formatLon(asc) },
      mc: { key: 'mc', label: 'Medio Cielo', glyph: 'MC', lon: mc, sign: signOf(mc), signName: SIGNS[signOf(mc)], degInSign: degInSign(mc), text: formatLon(mc) },
      dsc: { key: 'dsc', label: 'Descendente', glyph: 'DC', lon: norm360(asc + 180), sign: signOf(asc + 180), signName: SIGNS[signOf(asc + 180)], degInSign: degInSign(asc + 180), text: formatLon(asc + 180) },
      ic: { key: 'ic', label: 'Fondo del Cielo', glyph: 'IC', lon: norm360(mc + 180), sign: signOf(mc + 180), signName: SIGNS[signOf(mc + 180)], degInSign: degInSign(mc + 180), text: formatLon(mc + 180) }
    };

    var aspectBodies = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter',
      'saturn', 'uranus', 'neptune', 'pluto'];
    var aspects = findAspects(bodies, aspectBodies, { includeMinor: false });

    // Aspectos de los planetas a los angulos, que en interpretacion pesan mucho.
    var angleAspects = [];
    ['asc', 'mc'].forEach(function (ak) {
      aspectBodies.forEach(function (bk) {
        var sep = separation(angles[ak].lon, bodies[bk].lon);
        for (var k = 0; k < ASPECTS.length; k++) {
          var asp = ASPECTS[k];
          if (asp.kind === 'menor') continue;
          if (Math.abs(sep - asp.angle) <= 5) {
            angleAspects.push({
              a: ak, b: bk, aspect: asp.name, glyph: asp.glyph,
              kind: asp.kind, orb: Math.abs(sep - asp.angle)
            });
            break;
          }
        }
      });
    });

    // Es carta diurna si el Sol esta sobre el horizonte (casas 7 a 12).
    var sunAboveHorizon = norm360(bodies.sun.lon - asc) >= 180;
    var diurnal = sunAboveHorizon;

    return {
      birth: birth,
      jdUT: jdUT,
      meta: pos._meta,
      ramc: ramc,
      obliquity: eps,
      angles: angles,
      houses: houses.cusps,
      houseSystem: houses.system,
      houseFallback: houses.fallback,
      bodies: bodies,
      aspects: aspects,
      angleAspects: angleAspects,
      diurnal: diurnal,
      sect: diurnal ? 'diurna' : 'nocturna'
    };
  }

  return {
    build: build,
    SIGNS: SIGNS, GLYPHS: GLYPHS, LABELS: LABELS, BODY_GLYPHS: BODY_GLYPHS,
    BODIES: BODIES, ASPECTS: ASPECTS,
    signOf: signOf, degInSign: degInSign, elementOf: elementOf, modeOf: modeOf,
    formatLon: formatLon, formatLonLong: formatLonLong,
    ascendant: ascendant, midheaven: midheaven, lonFromRA: lonFromRA,
    houseCusps: houseCusps, houseOf: houseOf, placidusCusp: placidusCusp,
    findAspects: findAspects, separation: separation,
    inViaCombusta: inViaCombusta, VIA_COMBUSTA: VIA_COMBUSTA,
    norm360: norm360
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = Chart; }
