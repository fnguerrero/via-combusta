/* Pruebas de cada casa, generadas desde la carta real de quien juega.
   Ninguna respuesta esta escrita a mano: todas salen de calcular la carta.
   Cada prueba deja una explicacion, asi errar tambien ensena algo. */
var Puzzles = (function () {
  'use strict';

  var C = (typeof Chart !== 'undefined') ? Chart : require('../astro/chart.js');
  var D = (typeof Dignities !== 'undefined') ? Dignities : require('../astro/dignities.js');
  var S = (typeof Story !== 'undefined') ? Story : require('./story.js');

  var PLANETS7 = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

  /* Generador con semilla: la misma carta en el mismo dia da la misma partida,
     y al dia siguiente cambia. */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }
  function shuffle(rand, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  // Arma opciones a partir de la correcta mas distractores, sin repetir.
  function options(rand, correct, pool, labelFn) {
    var others = pool.filter(function (x) { return x !== correct; });
    var chosen = shuffle(rand, others).slice(0, 3);
    return shuffle(rand, chosen.concat([correct])).map(function (x) {
      return { value: x, label: labelFn(x), correct: x === correct };
    });
  }

  // pl() lleva articulo, para el texto corrido: "y la Luna en...".
  // plain() va sin articulo, que es como se leen mejor las opciones de respuesta.
  function pl(k) { return S.lbl(k); }
  function plain(k) { return S.name(k); }
  // Con articulo, para cuando el planeta abre la frase: "El Sol esta en...".
  function Pl(k) {
    var t = pl(k);
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  // Grados y minutos, sin el redondeo que empuja 29.96 a "30.0".
  function gm(deg) {
    var d = Math.floor(deg), m = Math.floor((deg - d) * 60);
    return d + '°' + (m < 10 ? '0' : '') + m + "'";
  }

  /* --- Casa I: regente del Ascendente --- */
  function houseI(ctx, rand) {
    var asc = ctx.chart.angles.asc;
    var correct = D.rulerOfSign(asc.sign);
    return {
      prompt: 'Tu Ascendente está en ' + asc.text + ', o sea en ' + asc.signName +
        '. ¿Qué planeta gobierna esa puerta?',
      hint: 'Regencia tradicional: los siete planetas visibles, sin transpersonales.',
      options: options(rand, correct, PLANETS7, plain),
      explain: function (ok) {
        var rb = ctx.chart.bodies[correct];
        return (ok ? 'Bien. ' : 'Era ' + pl(correct) + '. ') +
          'En regencia tradicional ' + asc.signName + ' es de ' + pl(correct) + ', ' +
          'así que ' + pl(correct) + ' es el regente de tu carta entera. ' +
          'Está en ' + rb.signName + ', en la casa ' + S.roman(rb.house) +
          (rb.retrograde ? ', retrógrado' : '') + ': ahí es donde tu vida ' +
          'te lleva a resolver las cosas.';
      }
    };
  }

  /* --- Casa II: cual planeta tiene mas dignidad esencial --- */
  function houseII(ctx, rand) {
    var prof = D.profile(ctx.chart);
    var ranked = PLANETS7.slice().sort(function (a, b) {
      return prof[b].essential.score - prof[a].essential.score;
    });
    var correct = ranked[0];
    // Los tres peores como distractores, para que la diferencia sea clara.
    var distractors = ranked.slice(-3);
    var opts = shuffle(rand, distractors.concat([correct])).map(function (x) {
      return {
        value: x,
        label: plain(x) + ' en ' + ctx.chart.bodies[x].signName,
        correct: x === correct
      };
    });
    return {
      prompt: 'La balanza pesa dignidad esencial. De estos cuatro, ¿cuál es el ' +
        'que de verdad sostiene?',
      hint: 'Domicilio +5, exaltación +4, triplicidad +3, término +2, face +1. ' +
        'Exilio −5, caída −4.',
      options: opts,
      explain: function (ok) {
        var e = prof[correct].essential;
        var lista = e.dignities.map(function (d) {
          return d.kind + ' ' + (d.value > 0 ? '+' : '') + d.value;
        }).join(', ') || 'ninguna';
        var peor = ranked[ranked.length - 1];
        return (ok ? 'Exacto. ' : 'Era ' + pl(correct) + '. ') +
          Pl(correct) + ' en ' + ctx.chart.bodies[correct].signName + ' suma ' +
          e.score + ' (' + lista + '). El más flojo de tu carta es ' + pl(peor) +
          ' en ' + ctx.chart.bodies[peor].signName + ', con ' +
          prof[peor].essential.score + '.';
      }
    };
  }

  /* --- Casa III: nombrar un aspecto real de la carta --- */
  function houseIII(ctx, rand) {
    var asp = ctx.chart.aspects.filter(function (a) {
      return ['conjunción', 'oposición', 'trígono', 'cuadratura', 'sextil'].indexOf(a.aspect) >= 0;
    });
    if (!asp.length) return houseI(ctx, rand);
    var a = pick(rand, asp.slice(0, Math.min(6, asp.length)));
    var pool = ['conjunción', 'oposición', 'trígono', 'cuadratura', 'sextil', 'quincuncio'];
    var sep = C.separation(ctx.chart.bodies[a.a].lon, ctx.chart.bodies[a.b].lon);
    return {
      prompt: Pl(a.a) + ' está en ' + ctx.chart.bodies[a.a].text + ' y ' +
        pl(a.b) + ' en ' + ctx.chart.bodies[a.b].text + '. ' +
        'Los separan ' + sep.toFixed(1) + '°. ¿Qué aspecto forman?',
      hint: 'Conjunción 0°, sextil 60°, cuadratura 90°, trígono 120°, oposición 180°.',
      options: options(rand, a.aspect, pool, function (x) { return x; }),
      explain: function (ok) {
        return (ok ? 'Sí. ' : 'Era ' + a.aspect + '. ') +
          sep.toFixed(1) + '° cae en ' + a.aspect + ' (' + a.angle + '°) con un ' +
          'orbe de ' + a.orb.toFixed(1) + '°' +
          (a.applying === true ? ', y está aplicando: todavía se están acercando.'
            : a.applying === false ? ', y está separando: el encuentro exacto ya pasó.' : '.');
      }
    };
  }

  /* --- Casa V: dueno del decanato --- */
  function houseV(ctx, rand) {
    var body = pick(rand, PLANETS7.filter(function (p) { return p !== 'moon'; }));
    var lon = ctx.chart.bodies[body].lon;
    var correct = D.faceRuler(lon);
    var decan = Math.floor(C.degInSign(lon) / 10) + 1;
    return {
      prompt: Pl(body) + ' está en ' + ctx.chart.bodies[body].text + ', o sea en ' +
        'el decanato ' + decan + ' de ' + ctx.chart.bodies[body].signName +
        '. ¿De quién es esa face?',
      hint: 'Orden caldeo, de diez en diez grados desde 0° de Aries: ' +
        'Marte, Sol, Venus, Mercurio, Luna, Saturno, Júpiter, y vuelta a empezar.',
      options: options(rand, correct, PLANETS7, plain),
      explain: function (ok) {
        var idx = Math.floor(C.norm360(lon) / 10);
        return (ok ? 'Bien. ' : 'Era ' + pl(correct) + '. ') +
          'Contando decanatos desde 0° Aries, este es el número ' + (idx + 1) +
          '. La rueda caldea da ' + pl(correct) + '. La face es la dignidad más ' +
          'débil (+1): alcanza para no ser peregrino, poco más.';
      }
    };
  }

  /* --- Casa VI: el planeta mas afligido --- */
  function houseVI(ctx, rand) {
    var prof = D.profile(ctx.chart);
    var ranked = PLANETS7.slice().sort(function (a, b) {
      return prof[a].total - prof[b].total;
    });
    var correct = ranked[0];
    var opts = shuffle(rand, ranked.slice(-3).concat([correct])).map(function (x) {
      var f = prof[x].accidental.flags.filter(function (s) {
        return s !== 'angular' && s !== 'sucedente' && s !== 'cadente';
      });
      return {
        value: x,
        label: plain(x) + ' en ' + ctx.chart.bodies[x].signName +
          (f.length ? ' (' + f.join(', ') + ')' : ''),
        correct: x === correct
      };
    });
    return {
      prompt: 'Seis camas ocupadas. ¿Cuál de estos cuatro está peor, sumando ' +
        'dignidad esencial y condición accidental?',
      hint: 'Combusto −5, retrógrado −5, bajo los rayos −4, Vía Combusta −3, ' +
        'cadente −2. Angular suma +4.',
      options: opts,
      explain: function (ok) {
        var p = prof[correct];
        return (ok ? 'Correcto. ' : 'Era ' + pl(correct) + '. ') +
          Pl(correct) + ' queda en ' + p.total + ': ' + p.essential.score +
          ' de dignidad esencial y ' + p.accidental.score + ' de accidental (' +
          p.accidental.flags.join(', ') + '). En casa ' + S.roman(p.house) + '.';
      }
    };
  }

  /* --- Casa VII: encontrar la oposicion --- */
  function houseVII(ctx, rand) {
    var opp = ctx.chart.aspects.filter(function (a) { return a.aspect === 'oposición'; });
    var pares, correct, es;
    if (opp.length) {
      correct = opp[0];
      es = 'oposición';
    } else {
      // Sin oposiciones planetarias: se usa el eje de la carta, que siempre existe.
      var dsc = ctx.chart.angles.dsc;
      return {
        prompt: 'Tu carta no tiene ninguna oposición entre planetas, así que el ' +
          'eje lo marcan los ángulos. Tu Ascendente está en ' +
          ctx.chart.angles.asc.text + '. ¿Qué signo tenés enfrente, en el Descendente?',
        hint: 'El Descendente es siempre el signo opuesto al Ascendente.',
        options: options(rand, dsc.signName, C.SIGNS, function (x) { return x; }),
        explain: function (ok) {
          return (ok ? 'Sí. ' : 'Era ' + dsc.signName + '. ') +
            'El Descendente cae en ' + dsc.text + ', regido por ' +
            pl(D.rulerOfSign(dsc.sign)) + '. Es la casa VII: el otro, el socio, ' +
            'el enemigo declarado.';
        }
      };
    }
    // Se pregunta cual de los cuatro pares esta realmente en oposicion.
    var real = plain(correct.a) + ' y ' + plain(correct.b);
    var fakes = [];
    var guard = 0;
    while (fakes.length < 3 && guard++ < 60) {
      var x = pick(rand, PLANETS7), y = pick(rand, PLANETS7);
      if (x === y) continue;
      var sep = C.separation(ctx.chart.bodies[x].lon, ctx.chart.bodies[y].lon);
      if (Math.abs(sep - 180) <= 12) continue;          // seria casi oposicion
      var s = plain(x) + ' y ' + plain(y);
      if (s === real || fakes.indexOf(s) >= 0) continue;
      fakes.push(s);
    }
    var opts = shuffle(rand, fakes.concat([real])).map(function (s) {
      return { value: s, label: s, correct: s === real };
    });
    return {
      prompt: '¿Qué par de tu carta está realmente en oposición?',
      hint: 'Oposición: 180° de separación, con hasta 8° de orbe (10° si hay luminaria).',
      options: opts,
      explain: function (ok) {
        var sep = C.separation(ctx.chart.bodies[correct.a].lon, ctx.chart.bodies[correct.b].lon);
        return (ok ? 'Ahí está. ' : 'Era ' + real + '. ') +
          Pl(correct.a) + ' en ' + ctx.chart.bodies[correct.a].text + ' contra ' +
          pl(correct.b) + ' en ' + ctx.chart.bodies[correct.b].text + ': ' +
          sep.toFixed(1) + '° de separación, orbe ' + correct.orb.toFixed(1) + '°.';
      }
    };
  }

  /* --- Casa VIII: termino egipcio --- */
  function houseVIII(ctx, rand) {
    var body = pick(rand, PLANETS7);
    var lon = ctx.chart.bodies[body].lon;
    var correct = D.termRuler(lon);
    var sign = C.signOf(lon), deg = C.degInSign(lon);
    var tramos = D.TERMS[sign].map(function (t, i) {
      var desde = i === 0 ? 0 : D.TERMS[sign][i - 1][1];
      return desde + '–' + t[1] + '° ' + pl(t[0]);
    }).join(' · ');
    return {
      prompt: Pl(body) + ' está a ' + gm(deg) + ' de ' + C.SIGNS[sign] +
        '. ¿En el término de quién cae?',
      hint: 'Términos egipcios de ' + C.SIGNS[sign] + ': ' + tramos,
      options: options(rand, correct, PLANETS7.filter(function (p) {
        return p !== 'sun' && p !== 'moon';
      }).concat([correct]), plain),
      explain: function (ok) {
        return (ok ? 'Bien. ' : 'Era ' + pl(correct) + '. ') +
          'Los términos parten cada signo en cinco tramos desiguales, y el Sol y ' +
          'la Luna no reciben ninguno: solo los cinco planetas restantes. ' +
          gm(deg) + ' de ' + C.SIGNS[sign] + ' cae en el término de ' +
          pl(correct) + ' (+2 de dignidad para quien esté ahí).';
      }
    };
  }

  /* --- Casa IX: triplicidad segun secta --- */
  function houseIX(ctx, rand) {
    var body = pick(rand, PLANETS7);
    var lon = ctx.chart.bodies[body].lon;
    var tri = D.triplicityRuler(lon, ctx.chart.diurnal);
    var correct = tri.ruler;
    return {
      prompt: 'Tu carta es <strong>' + ctx.chart.sect + '</strong> (el Sol está ' +
        (ctx.chart.diurnal ? 'sobre' : 'bajo') + ' el horizonte). ' +
        Pl(body) + ' está en ' + ctx.chart.bodies[body].signName + ', signo de ' +
        tri.element + '. ¿Quién gobierna esa triplicidad ' +
        (ctx.chart.diurnal ? 'de día' : 'de noche') + '?',
      hint: 'Doroteo: fuego Sol/Júpiter, tierra Venus/Luna, aire Saturno/Mercurio, ' +
        'agua Venus/Marte. El primero manda de día, el segundo de noche.',
      options: options(rand, correct, PLANETS7, plain),
      explain: function (ok) {
        var t = D.TRIPLICITIES[tri.element];
        return (ok ? 'Exacto. ' : 'Era ' + pl(correct) + '. ') +
          'La triplicidad de ' + tri.element + ' es de ' + pl(t.day) + ' de día y ' +
          pl(t.night) + ' de noche, con ' + pl(t.participating) + ' de participante. ' +
          'Tu carta es ' + ctx.chart.sect + ', así que manda ' + pl(correct) + '. ' +
          'Por eso la secta no es un detalle: cambia quién tiene autoridad.';
      }
    };
  }

  /* --- Casa X: almuten del Medio Cielo --- */
  function houseX(ctx, rand) {
    var mc = ctx.chart.angles.mc;
    var alm = D.almuten(mc.lon, ctx.chart.diurnal);
    return {
      prompt: 'Tu Medio Cielo está en ' + mc.text + '. ¿Qué planeta es el almutén ' +
        'de ese grado, o sea el que más dignidad esencial suma ahí?',
      hint: 'Se suman domicilio, exaltación, triplicidad, término y face en ese ' +
        'grado exacto. Gana el que más junta.',
      options: options(rand, alm.planet, PLANETS7, pl),
      explain: function (ok) {
        var e = D.essentialDignity(alm.planet, mc.lon, ctx.chart.diurnal);
        var lista = e.dignities.map(function (d) { return d.kind; }).join(' + ') || 'ninguna';
        var reg = D.rulerOfSign(mc.sign);
        return (ok ? 'Bien. ' : 'Era ' + pl(alm.planet) + '. ') +
          Pl(alm.planet) + ' suma ' + alm.score + ' en ese grado (' + lista + '). ' +
          (reg === alm.planet
            ? 'Coincide con el regente del signo, que no siempre pasa.'
            : 'Ojo: el regente de ' + mc.signName + ' es ' + pl(reg) + ', pero en ' +
              'ese grado exacto pesa más ' + pl(alm.planet) + '.');
      }
    };
  }

  /* --- Casa XI: transitos reales de hoy --- */
  function houseXI(ctx, rand) {
    var t = ctx.transits;
    var modo = Math.floor(rand() * 2);
    if (modo === 0) {
      var casa = C.houseOf(t.sun.lon, ctx.chart.houses);
      var pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      return {
        prompt: 'El Sol de hoy está en ' + t.sun.text + '. ¿En qué casa de <em>tu</em> ' +
          'carta natal está cayendo ahora mismo?',
        hint: 'Un tránsito se lee sobre las casas de tu carta, no sobre las del cielo de hoy.',
        options: options(rand, casa, pool, function (x) { return 'Casa ' + S.roman(x); }),
        explain: function (ok) {
          return (ok ? 'Sí. ' : 'Era la casa ' + S.roman(casa) + '. ') +
            'Tu casa ' + S.roman(casa) + ' arranca en ' + C.formatLon(ctx.chart.houses[casa]) +
            ' y el Sol de hoy está en ' + t.sun.text + '. Ahí es donde tenés ' +
            'la atención puesta este mes.';
        }
      };
    }
    var lunaSigno = t.moon.signName;
    return {
      prompt: 'La Luna de hoy está a ' + t.moon.text + ' y se mueve alrededor de ' +
        t.moon.speed.toFixed(1) + '° por día. ¿En qué signo está?',
      hint: 'La Luna cambia de signo cada dos días y pico.',
      options: options(rand, lunaSigno, C.SIGNS, function (x) { return x; }),
      explain: function (ok) {
        var casa = C.houseOf(t.moon.lon, ctx.chart.houses);
        return (ok ? 'Bien. ' : 'Era ' + lunaSigno + '. ') +
          'Hoy transita tu casa ' + S.roman(casa) + '. Y tu Luna natal está en ' +
          ctx.chart.bodies.moon.signName + ': cada mes, cuando la Luna de tránsito ' +
          'pasa por ahí, se te vuelve a poner el cuerpo en ese lugar.';
      }
    };
  }

  /* --- Casa XII: el enfrentamiento, en tres pasos --- */
  function houseXII(ctx, rand) {
    var moon = ctx.chart.bodies.moon;
    return [
      {
        prompt: 'Está a tres pasos. Lo primero que hace un astrólogo con algo que ' +
          'no entiende es levantarle la carta. ¿Qué dato le falta para tener una?',
        hint: 'Sin uno de estos tres no hay carta posible. Pero hay uno que ' +
          'directamente hace imposible a los otros dos.',
        options: shuffle(rand, [
          { value: 'hora', label: 'La hora exacta de nacimiento', correct: false },
          { value: 'lugar', label: 'El lugar de nacimiento', correct: false },
          { value: 'nacer', label: 'El hecho de haber nacido', correct: true },
          { value: 'nombre', label: 'El nombre completo', correct: false }
        ]),
        explain: function (ok) {
          return (ok ? 'Ahí está. ' : 'Era el hecho de haber nacido. ') +
            'La hora y el lugar son datos de un nacimiento. Si no hubo nacimiento ' +
            'no hay momento que levantar, y sin momento no hay Ascendente, ni ' +
            'casas, ni regente. No es que le falte un dato: le falta el hecho.';
        }
      },
      {
        prompt: 'Sin domicilio, sin exaltación, sin triplicidad, sin término y sin ' +
          'face, en ningún grado de los 360. ¿Cómo se llama esa condición?',
        hint: 'Es el término técnico para un planeta que no tiene ninguna dignidad ' +
          'esencial donde está.',
        options: shuffle(rand, [
          { value: 'peregrino', label: 'Peregrino', correct: true },
          { value: 'combusto', label: 'Combusto', correct: false },
          { value: 'caida', label: 'En caída', correct: false },
          { value: 'retro', label: 'Retrógrado', correct: false }
        ]),
        explain: function (ok) {
          return (ok ? 'Correcto. ' : 'Era peregrino. ') +
            'Peregrino es el que está de paso en todos lados y no es dueño de ' +
            'ninguno. Combusto, caído o retrógrado son planetas que están mal, ' +
            'pero <em>están</em>. Peregrino en los 360 grados no está en ninguna parte.';
        }
      },
      {
        prompt: 'Última. Te ofreció quedarte adentro mientras él usa tu carta: que ' +
          'sigas funcionando por fuera y apagada por dentro. ¿Con qué se lo negás?',
        hint: 'Pensá qué hiciste en la casa IV y por qué él no pudo entrar ahí.',
        options: shuffle(rand, [
          { value: 'pelear', label: 'Peleando: es un enemigo y se lo enfrenta', correct: false },
          { value: 'ignorar', label: 'Ignorándolo hasta que se aburra y se vaya', correct: false },
          { value: 'nombrar', label: 'Diciendo en voz alta lo que es, que es lo que hacés con toda carta que leés', correct: true },
          { value: 'huir', label: 'Saliendo de la vía combusta lo más rápido posible', correct: false }
        ]),
        explain: function (ok) {
          return (ok ? 'Eso. ' : 'Era nombrarlo. ') +
            'A la casa IV no pudo entrar porque ahí estabas siendo mirada y ' +
            'cuidada. Lo que no soporta es ser visto y dicho. Leer una carta es ' +
            'exactamente eso: mirar algo de frente y ponerle nombre. Tu Luna en ' +
            moon.signName + ' te enseñó a hacerlo antes de que supieras que se llamaba así.';
        }
      }
    ];
  }

  var BUILDERS = {
    1: houseI, 2: houseII, 3: houseIII, 5: houseV, 6: houseVI,
    7: houseVII, 8: houseVIII, 9: houseIX, 10: houseX, 11: houseXI
  };

  /* La casa IV no tiene prueba: es refugio y devuelve luz. */
  function forHouse(house, ctx, seed) {
    if (house === 4) return null;
    var rand = rng(seed + house * 7919);
    if (house === 12) return houseXII(ctx, rand);
    var b = BUILDERS[house];
    return b ? [b(ctx, rand)] : null;
  }

  return { forHouse: forHouse, rng: rng };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = Puzzles; }
