/* Dignidades esenciales de la astrologia tradicional.
   Domicilio y exilio, exaltacion y caida, triplicidades de Doroteo,
   terminos egipcios, faces del orden caldeo, y el puntaje de Lilly.
   Los indices de signo van de 0 (Aries) a 11 (Piscis). */
var Dignities = (function () {
  'use strict';

  var C = (typeof Chart !== 'undefined') ? Chart : require('./chart.js');

  // Regentes tradicionales: los siete planetas visibles, dos signos cada uno
  // salvo el Sol y la Luna.
  var RULERS = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury',
    'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];

  // Regentes modernos, para quien trabaje con transpersonales.
  var MODERN_RULERS = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury',
    'venus', 'pluto', 'jupiter', 'saturn', 'uranus', 'neptune'];

  // Exilio: el signo opuesto al domicilio.
  var DETRIMENT = [];
  for (var i = 0; i < 12; i++) DETRIMENT[i] = RULERS[(i + 6) % 12];

  // Exaltaciones con su grado exacto, que es donde la dignidad es maxima.
  var EXALTATIONS = {
    sun: { sign: 0, degree: 19 },        // 19 Aries
    moon: { sign: 1, degree: 3 },        // 3 Tauro
    mercury: { sign: 5, degree: 15 },    // 15 Virgo
    venus: { sign: 11, degree: 27 },     // 27 Piscis
    mars: { sign: 9, degree: 28 },       // 28 Capricornio
    jupiter: { sign: 3, degree: 15 },    // 15 Cancer
    saturn: { sign: 6, degree: 21 },     // 21 Libra
    northNode: { sign: 2, degree: 3 }    // 3 Geminis
  };
  // Caida: el signo opuesto a la exaltacion.
  var FALLS = {};
  Object.keys(EXALTATIONS).forEach(function (p) {
    FALLS[p] = (EXALTATIONS[p].sign + 6) % 12;
  });

  /* Triplicidades segun Doroteo de Sidon: regente de dia, de noche y participante.
     La secta de la carta decide cual manda. */
  var TRIPLICITIES = {
    fuego: { day: 'sun', night: 'jupiter', participating: 'saturn', signs: [0, 4, 8] },
    tierra: { day: 'venus', night: 'moon', participating: 'mars', signs: [1, 5, 9] },
    aire: { day: 'saturn', night: 'mercury', participating: 'jupiter', signs: [2, 6, 10] },
    agua: { day: 'venus', night: 'mars', participating: 'moon', signs: [3, 7, 11] }
  };
  var ELEMENT_OF_SIGN = ['fuego', 'tierra', 'aire', 'agua'];

  /* Terminos egipcios: por signo, lista de [planeta, grado en que termina]. */
  var TERMS = [
    [['jupiter', 6], ['venus', 12], ['mercury', 20], ['mars', 25], ['saturn', 30]],      // Aries
    [['venus', 8], ['mercury', 14], ['jupiter', 22], ['saturn', 27], ['mars', 30]],      // Tauro
    [['mercury', 6], ['jupiter', 12], ['venus', 17], ['mars', 24], ['saturn', 30]],      // Geminis
    [['mars', 7], ['venus', 13], ['mercury', 19], ['jupiter', 26], ['saturn', 30]],      // Cancer
    [['jupiter', 6], ['venus', 11], ['saturn', 18], ['mercury', 24], ['mars', 30]],      // Leo
    [['mercury', 7], ['venus', 17], ['jupiter', 21], ['mars', 28], ['saturn', 30]],      // Virgo
    [['saturn', 6], ['mercury', 14], ['jupiter', 21], ['venus', 28], ['mars', 30]],      // Libra
    [['mars', 7], ['venus', 11], ['mercury', 19], ['jupiter', 24], ['saturn', 30]],      // Escorpio
    [['jupiter', 12], ['venus', 17], ['mercury', 21], ['saturn', 26], ['mars', 30]],     // Sagitario
    [['mercury', 7], ['jupiter', 14], ['venus', 22], ['saturn', 26], ['mars', 30]],      // Capricornio
    [['mercury', 7], ['venus', 13], ['jupiter', 20], ['mars', 25], ['saturn', 30]],      // Acuario
    [['venus', 12], ['jupiter', 16], ['mercury', 19], ['mars', 28], ['saturn', 30]]      // Piscis
  ];

  /* Faces (decanatos): el orden caldeo repetido de a diez grados desde Aries 0. */
  var CHALDEAN = ['mars', 'sun', 'venus', 'mercury', 'moon', 'saturn', 'jupiter'];
  function faceRuler(lon) {
    var decan = Math.floor(C.norm360(lon) / 10);   // 0 a 35
    return CHALDEAN[decan % 7];
  }

  function termRuler(lon) {
    var sign = C.signOf(lon), deg = C.degInSign(lon), t = TERMS[sign];
    for (var i = 0; i < t.length; i++) if (deg < t[i][1]) return t[i][0];
    return t[t.length - 1][0];
  }

  function triplicityRuler(lon, diurnal) {
    var el = ELEMENT_OF_SIGN[C.signOf(lon) % 4];
    var t = TRIPLICITIES[el];
    return { ruler: diurnal ? t.day : t.night, participating: t.participating, element: el };
  }

  /* Puntaje de dignidad esencial segun Lilly:
     domicilio +5, exaltacion +4, triplicidad +3, termino +2, face +1,
     exilio -5, caida -4. Peregrino (sin ninguna) es 0. */
  function essentialDignity(planet, lon, diurnal) {
    var sign = C.signOf(lon), deg = C.degInSign(lon);
    var score = 0, list = [];

    if (RULERS[sign] === planet) { score += 5; list.push({ kind: 'domicilio', value: 5 }); }
    if (DETRIMENT[sign] === planet) { score -= 5; list.push({ kind: 'exilio', value: -5 }); }

    var ex = EXALTATIONS[planet];
    if (ex && ex.sign === sign) {
      score += 4;
      list.push({
        kind: 'exaltación', value: 4,
        exact: Math.abs(deg - ex.degree) < 1,
        degree: ex.degree
      });
    }
    if (FALLS[planet] === sign) { score -= 4; list.push({ kind: 'caída', value: -4 }); }

    var tri = triplicityRuler(lon, diurnal);
    if (tri.ruler === planet) {
      score += 3;
      list.push({ kind: 'triplicidad', value: 3, element: tri.element, sect: diurnal ? 'de día' : 'de noche' });
    } else if (tri.participating === planet) {
      score += 3;
      list.push({ kind: 'triplicidad participante', value: 3, element: tri.element });
    }

    if (termRuler(lon) === planet) { score += 2; list.push({ kind: 'término', value: 2 }); }
    if (faceRuler(lon) === planet) { score += 1; list.push({ kind: 'face', value: 1 }); }

    return {
      planet: planet, score: score, dignities: list,
      peregrine: list.length === 0,
      // Un planeta en su propio signo o exaltacion esta "fuerte"; en exilio o
      // caida, "afligido". Es el juicio que usa la astrologia horaria.
      status: score >= 5 ? 'fuerte' : (score <= -4 ? 'afligido' : (list.length === 0 ? 'peregrino' : 'mixto'))
    };
  }

  /* Condiciones accidentales relevantes para el juego: combustion, cazimi,
     bajo los rayos, retrogradacion y Via Combusta. */
  function accidental(planet, chart) {
    var b = chart.bodies[planet];
    if (!b) return null;
    var sun = chart.bodies.sun;
    var sep = C.separation(b.lon, sun.lon);
    var out = { flags: [], score: 0 };

    if (planet !== 'sun' && planet !== 'moon') {
      if (sep <= 0.2833) { out.flags.push('cazimi'); out.score += 5; }        // 17' del Sol
      else if (sep <= 8.5) { out.flags.push('combusto'); out.score -= 5; }
      else if (sep <= 17) { out.flags.push('bajo los rayos'); out.score -= 4; }
    }
    if (b.retrograde && planet !== 'sun' && planet !== 'moon') {
      out.flags.push('retrógrado'); out.score -= 5;
    }
    if (b.viaCombusta) { out.flags.push('en Vía Combusta'); out.score -= 3; }
    // Angulares (casas 1, 4, 7, 10) fortalecen; cadentes (3, 6, 9, 12) debilitan.
    if ([1, 4, 7, 10].indexOf(b.house) >= 0) { out.flags.push('angular'); out.score += 4; }
    else if ([3, 6, 9, 12].indexOf(b.house) >= 0) { out.flags.push('cadente'); out.score -= 2; }
    else { out.flags.push('sucedente'); out.score += 1; }

    return out;
  }

  /* Almuten de un grado: el planeta con mas dignidad esencial ahi.
     En la tradicion es "el dueno" de ese punto del cielo. */
  function almuten(lon, diurnal) {
    var planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    var best = null, bestScore = -99;
    planets.forEach(function (p) {
      var d = essentialDignity(p, lon, diurnal);
      if (d.score > bestScore) { bestScore = d.score; best = p; }
    });
    return { planet: best, score: bestScore };
  }

  // Perfil completo de dignidad de todos los planetas de una carta.
  function profile(chart) {
    var planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    var out = {};
    planets.forEach(function (p) {
      var ess = essentialDignity(p, chart.bodies[p].lon, chart.diurnal);
      var acc = accidental(p, chart);
      out[p] = {
        essential: ess, accidental: acc,
        total: ess.score + acc.score,
        sign: chart.bodies[p].signName,
        house: chart.bodies[p].house
      };
    });
    return out;
  }

  // Regente de un signo, y por extension regente de una casa.
  function rulerOfSign(sign, modern) {
    return (modern ? MODERN_RULERS : RULERS)[((sign % 12) + 12) % 12];
  }
  function rulerOfHouse(chart, house, modern) {
    return rulerOfSign(C.signOf(chart.houses[house]), modern);
  }

  return {
    RULERS: RULERS, MODERN_RULERS: MODERN_RULERS, DETRIMENT: DETRIMENT,
    EXALTATIONS: EXALTATIONS, FALLS: FALLS, TRIPLICITIES: TRIPLICITIES,
    TERMS: TERMS, CHALDEAN: CHALDEAN,
    faceRuler: faceRuler, termRuler: termRuler, triplicityRuler: triplicityRuler,
    essentialDignity: essentialDignity, accidental: accidental,
    almuten: almuten, profile: profile,
    rulerOfSign: rulerOfSign, rulerOfHouse: rulerOfHouse
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = Dignities; }
