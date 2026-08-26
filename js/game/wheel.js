/* Dibujo de la rueda natal en SVG, a partir de la carta calculada.
   El Ascendente va a la izquierda y las longitudes crecen en sentido
   antihorario, como en cualquier carta impresa. */
var Wheel = (function () {
  'use strict';

  var C = (typeof Chart !== 'undefined') ? Chart : require('../astro/chart.js');
  var D2R = Math.PI / 180;

  var SIZE = 520, CX = 260, CY = 260;
  var R_OUT = 250;        // borde exterior
  var R_SIGN = 218;       // anillo de signos
  var R_HOUSE = 176;      // anillo de casas
  var R_PLANET = 150;     // orbita de los planetas
  var R_INNER = 118;      // circulo de aspectos

  function pt(lon, r, ascLon) {
    var th = (180 + (lon - ascLon)) * D2R;
    return [CX + r * Math.cos(th), CY - r * Math.sin(th)];
  }
  function f(n) { return Math.round(n * 100) / 100; }

  var ELEM_CLASS = ['fuego', 'tierra', 'aire', 'agua'];

  function render(chart, opts) {
    opts = opts || {};
    var asc = chart.angles.asc.lon;
    var s = [];
    var i, p, a, b;

    s.push('<svg viewBox="0 0 ' + SIZE + ' ' + SIZE + '" class="wheel" ' +
      'xmlns="http://www.w3.org/2000/svg" role="img" ' +
      'aria-label="Rueda natal">');

    // Sectores de signos, coloreados por elemento.
    for (i = 0; i < 12; i++) {
      var s0 = i * 30, s1 = s0 + 30;
      var p0 = pt(s0, R_SIGN, asc), p1 = pt(s1, R_SIGN, asc);
      var q0 = pt(s0, R_OUT, asc), q1 = pt(s1, R_OUT, asc);
      s.push('<path class="sec sec-' + ELEM_CLASS[i % 4] + '" d="' +
        'M' + f(p0[0]) + ' ' + f(p0[1]) +
        ' A' + R_SIGN + ' ' + R_SIGN + ' 0 0 0 ' + f(p1[0]) + ' ' + f(p1[1]) +
        ' L' + f(q1[0]) + ' ' + f(q1[1]) +
        ' A' + R_OUT + ' ' + R_OUT + ' 0 0 1 ' + f(q0[0]) + ' ' + f(q0[1]) + ' Z"/>');
      var gl = pt(s0 + 15, (R_SIGN + R_OUT) / 2, asc);
      s.push('<text class="glyph-sign" x="' + f(gl[0]) + '" y="' + f(gl[1]) +
        '">' + C.GLYPHS[i] + '</text>');
    }

    // Circulos guia.
    [R_OUT, R_SIGN, R_HOUSE, R_INNER].forEach(function (r) {
      s.push('<circle class="ring" cx="' + CX + '" cy="' + CY + '" r="' + r + '"/>');
    });

    // Marcas de grado, cada cinco.
    for (i = 0; i < 72; i++) {
      var deg = i * 5;
      var largo = (deg % 30 === 0) ? 10 : 5;
      a = pt(deg, R_SIGN, asc); b = pt(deg, R_SIGN - largo, asc);
      s.push('<line class="tick' + (deg % 30 === 0 ? ' tick-major' : '') +
        '" x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) + '"/>');
    }

    // Cuspides de casa y su numero.
    for (i = 1; i <= 12; i++) {
      var cusp = chart.houses[i];
      var esAngular = (i === 1 || i === 4 || i === 7 || i === 10);
      a = pt(cusp, R_HOUSE, asc); b = pt(cusp, R_INNER, asc);
      s.push('<line class="cusp' + (esAngular ? ' cusp-angular' : '') +
        '" x1="' + f(a[0]) + '" y1="' + f(a[1]) + '" x2="' + f(b[0]) + '" y2="' + f(b[1]) + '"/>');
      var next = chart.houses[i === 12 ? 1 : i + 1];
      var mid = cusp + C.norm360(next - cusp) / 2;
      var np = pt(mid, (R_HOUSE + R_INNER) / 2, asc);
      s.push('<text class="house-num" x="' + f(np[0]) + '" y="' + f(np[1]) + '">' + i + '</text>');
    }

    // Lineas de aspecto dentro del circulo chico.
    (chart.aspects || []).forEach(function (asp) {
      if (asp.kind === 'menor') return;
      var pa = pt(chart.bodies[asp.a].lon, R_INNER, asc);
      var pb = pt(chart.bodies[asp.b].lon, R_INNER, asc);
      s.push('<line class="asp asp-' + asp.kind + '" x1="' + f(pa[0]) + '" y1="' + f(pa[1]) +
        '" x2="' + f(pb[0]) + '" y2="' + f(pb[1]) +
        '" style="opacity:' + f(0.25 + 0.55 * asp.exactness) + '"/>');
    });

    // Planetas, separados cuando caen demasiado juntos para leerse.
    var lista = (opts.bodies || ['sun', 'moon', 'mercury', 'venus', 'mars',
      'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'northNode'])
      .filter(function (k) { return chart.bodies[k]; })
      .map(function (k) { return { key: k, lon: chart.bodies[k].lon, body: chart.bodies[k] }; })
      .sort(function (x, y) {
        return C.norm360(x.lon - asc) - C.norm360(y.lon - asc);
      });

    var MIN_SEP = 7.5;
    for (i = 1; i < lista.length; i++) {
      var prev = C.norm360(lista[i - 1].lon - asc);
      var cur = C.norm360(lista[i].lon - asc);
      if (cur - prev < MIN_SEP) lista[i].shift = prev + MIN_SEP - cur;
    }
    lista.forEach(function (item) {
      var drawLon = item.lon + (item.shift || 0);
      var pp = pt(drawLon, R_PLANET, asc);
      var tickA = pt(item.lon, R_HOUSE, asc);
      var tickB = pt(item.lon, R_HOUSE - 8, asc);
      s.push('<line class="planet-tick" x1="' + f(tickA[0]) + '" y1="' + f(tickA[1]) +
        '" x2="' + f(tickB[0]) + '" y2="' + f(tickB[1]) + '"/>');
      s.push('<g class="planet' + (item.body.retrograde ? ' retro' : '') +
        (item.body.viaCombusta ? ' combusta' : '') + '">');
      s.push('<title>' + item.body.label + ' ' + item.body.text +
        ' · casa ' + item.body.house + (item.body.retrograde ? ' · retrógrado' : '') + '</title>');
      s.push('<text class="glyph-planet" x="' + f(pp[0]) + '" y="' + f(pp[1]) + '">' +
        item.body.glyph + '</text>');
      var dp = pt(drawLon, R_PLANET - 20, asc);
      s.push('<text class="planet-deg" x="' + f(dp[0]) + '" y="' + f(dp[1]) + '">' +
        Math.floor(item.body.degInSign) + (item.body.retrograde ? '℞' : '') + '</text>');
      s.push('</g>');
    });

    // Ejes principales, rotulados.
    [['asc', 'AC'], ['mc', 'MC'], ['dsc', 'DC'], ['ic', 'IC']].forEach(function (t) {
      var ang = chart.angles[t[0]];
      var e = pt(ang.lon, R_OUT + 0, asc);
      var l = pt(ang.lon, R_OUT - 16, asc);
      s.push('<text class="axis-label" x="' + f(l[0]) + '" y="' + f(l[1]) + '">' + t[1] + '</text>');
    });

    // Tramo de Via Combusta marcado sobre el anillo exterior.
    var vcA = pt(C.VIA_COMBUSTA.start, R_OUT - 3, asc);
    var vcB = pt(C.VIA_COMBUSTA.end, R_OUT - 3, asc);
    s.push('<path class="via-combusta" d="M' + f(vcA[0]) + ' ' + f(vcA[1]) +
      ' A' + (R_OUT - 3) + ' ' + (R_OUT - 3) + ' 0 0 0 ' + f(vcB[0]) + ' ' + f(vcB[1]) + '"/>');

    s.push('</svg>');
    return s.join('');
  }

  return { render: render };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = Wheel; }
