/* Motor del juego: pantallas, estado y avance por las doce casas. */
var Game = (function () {
  'use strict';

  var LIGHT_MAX = 5;
  var SAVE_KEY = 'viacombusta.save.v1';

  var state = null;
  var root = null;

  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  /* --- Persistencia --- */

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        name: state.name, birth: state.birth, system: state.system,
        house: state.house, light: state.light, step: state.step,
        seed: state.seed, done: state.done
      }));
    } catch (e) { /* modo privado: se juega igual, sin guardar */ }
  }
  function loadSaved() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
  }

  /* --- Construccion del estado --- */

  function buildChart(birth, system) {
    return Chart.build(birth, { system: system || 'placidus' });
  }

  function buildTransits() {
    var now = new Date();
    var jd = Ephemeris.julianDay(
      now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
      now.getUTCHours() + now.getUTCMinutes() / 60
    );
    var p = Ephemeris.positions(jd, now.getUTCFullYear(), now.getUTCMonth() + 1);
    var out = {};
    ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn',
      'uranus', 'neptune', 'pluto'].forEach(function (k) {
        var sp = Ephemeris.speed(k, jd, now.getUTCFullYear(), now.getUTCMonth() + 1);
        out[k] = {
          lon: p[k].lon, speed: sp, retrograde: sp < 0,
          signName: Chart.SIGNS[Chart.signOf(p[k].lon)],
          text: Chart.formatLon(p[k].lon)
        };
      });
    out.date = now;
    return out;
  }

  // Semilla del dia: la misma carta juega igual durante toda la jornada.
  function todaySeed(birth) {
    var d = new Date();
    var base = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return (base + birth.year * 31 + birth.month * 17 + birth.day * 7 +
      Math.round(birth.hour * 60 + birth.minute)) >>> 0;
  }

  function ctx() {
    return {
      name: state.name, chart: state.chart,
      transits: state.transits, state: state
    };
  }

  /* --- Pantallas --- */

  function show(node) {
    root.innerHTML = '';
    root.appendChild(node);
    root.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function screenTitle() {
    var v = el('div', 'screen screen-title');
    v.innerHTML =
      '<div class="title-art">' +
      '<div class="title-glyphs">♎ ♏</div>' +
      '<h1>Vía Combusta</h1>' +
      '<p class="subtitle">De 15° de Libra a 15° de Escorpio,<br>el tramo que los ' +
      'antiguos llamaron el camino quemado.</p>' +
      '</div>' +
      '<div class="title-body">' +
      '<p>Una historia de terror en doce casas, que se juega sobre una carta ' +
      'natal real y calculada.</p>' +
      '<p class="fine">Las posiciones planetarias se computan con VSOP87 y ' +
      'ELP-2000, con casas de Placidus y dignidades tradicionales. No hay ' +
      'aproximaciones decorativas: lo que ves es lo que hay en el cielo.</p>' +
      '</div>';
    var acts = el('div', 'actions');
    var b = el('button', 'btn btn-primary', 'Empezar');
    b.onclick = function () { screenSetup(); };
    acts.appendChild(b);

    var saved = loadSaved();
    if (saved && !saved.done && saved.house > 1) {
      var r = el('button', 'btn', 'Seguir donde quedé (casa ' + Story.roman(saved.house) + ')');
      r.onclick = function () { resume(saved); };
      acts.appendChild(r);
    }
    v.appendChild(acts);
    return v;
  }

  function screenSetup() {
    var v = el('div', 'screen screen-setup');
    v.innerHTML =
      '<h2>La carta</h2>' +
      '<p class="lead">El juego se arma con tus datos de nacimiento. Si la hora ' +
      'no es exacta, el Ascendente se corre: un grado cada cuatro minutos.</p>';

    var form = el('form', 'form');
    form.innerHTML =
      '<label class="field"><span>Nombre</span>' +
      '<input name="nombre" type="text" value="Bel" autocomplete="off" required></label>' +

      '<div class="row3">' +
      '<label class="field"><span>Día</span>' +
      '<input name="dia" type="number" min="1" max="31" value="14" required></label>' +
      '<label class="field"><span>Mes</span>' +
      '<input name="mes" type="number" min="1" max="12" value="7" required></label>' +
      '<label class="field"><span>Año</span>' +
      '<input name="anio" type="number" min="1900" max="2030" value="1989" required></label>' +
      '</div>' +

      '<div class="row2">' +
      '<label class="field"><span>Hora</span>' +
      '<input name="hora" type="number" min="0" max="23" value="4" required></label>' +
      '<label class="field"><span>Minutos</span>' +
      '<input name="min" type="number" min="0" max="59" value="25" required></label>' +
      '</div>' +

      '<label class="field"><span>Lugar</span>' +
      '<select name="lugar"></select></label>' +

      '<label class="field"><span>Sistema de casas</span>' +
      '<select name="sistema">' +
      '<option value="placidus">Placidus</option>' +
      '<option value="whole">Signos enteros</option>' +
      '<option value="porphyry">Porfirio</option>' +
      '<option value="equal">Iguales</option>' +
      '</select></label>' +

      '<p class="tz-note" id="tzNote"></p>';

    var sel = form.querySelector('select[name=lugar]');
    Places.CITIES.forEach(function (c, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = c.name + ' · ' + c.country;
      sel.appendChild(o);
    });

    function refreshNote() {
      var d = form.elements;
      var city = Places.CITIES[parseInt(d.lugar.value, 10)];
      var y = parseInt(d.anio.value, 10) || 1989;
      var m = parseInt(d.mes.value, 10) || 1;
      var day = parseInt(d.dia.value, 10) || 1;
      var off = Places.offsetFor(city, y, m, day);
      var note = Places.noteFor(city, y, m, day);
      form.querySelector('#tzNote').innerHTML =
        'Huso aplicado: <strong>UTC' + (off >= 0 ? '+' : '') +
        (Math.round(off * 100) / 100) + '</strong>' +
        (note ? '<br>' + note : '');
    }
    ['lugar', 'anio', 'mes', 'dia'].forEach(function (n) {
      form.elements[n].addEventListener('change', refreshNote);
      form.elements[n].addEventListener('input', refreshNote);
    });

    v.appendChild(form);

    var acts = el('div', 'actions');
    var go = el('button', 'btn btn-primary', 'Levantar la carta');
    go.onclick = function (e) {
      e.preventDefault();
      var d = form.elements;
      var city = Places.CITIES[parseInt(d.lugar.value, 10)];
      var birth = {
        year: parseInt(d.anio.value, 10),
        month: parseInt(d.mes.value, 10),
        day: parseInt(d.dia.value, 10),
        hour: parseInt(d.hora.value, 10),
        minute: parseInt(d.min.value, 10),
        lat: city.lat, lon: city.lon,
        utcOffset: Places.offsetFor(city, parseInt(d.anio.value, 10),
          parseInt(d.mes.value, 10), parseInt(d.dia.value, 10)),
        place: city.name
      };
      start((d.nombre.value || 'Bel').trim(), birth, d.sistema.value);
    };
    acts.appendChild(go);

    var back = el('button', 'btn btn-ghost', 'Volver');
    back.onclick = function () { show(screenTitle()); };
    acts.appendChild(back);
    v.appendChild(acts);

    show(v);
    refreshNote();
    return v;
  }

  function start(name, birth, system) {
    state = {
      name: name, birth: birth, system: system,
      chart: buildChart(birth, system),
      transits: buildTransits(),
      house: 1, step: 0, light: LIGHT_MAX,
      seed: todaySeed(birth), done: false, won: false
    };
    save();
    screenNarrative(Story.prologue(ctx()), 'El mensaje', function () {
      screenNarrative(Story.briefing(ctx()), 'Las reglas', function () {
        screenChapter();
      });
    });
  }

  function resume(saved) {
    state = {
      name: saved.name, birth: saved.birth, system: saved.system,
      chart: buildChart(saved.birth, saved.system),
      transits: buildTransits(),
      house: saved.house, step: saved.step || 0,
      light: saved.light, seed: saved.seed,
      done: false, won: false
    };
    screenChapter();
  }

  /* Pantalla de texto corrido con un boton al final. */
  function screenNarrative(paragraphs, heading, next, cls) {
    var v = el('div', 'screen screen-narrative ' + (cls || ''));
    if (heading) v.appendChild(el('h2', null, heading));
    var body = el('div', 'prose');
    paragraphs.forEach(function (p) { body.appendChild(el('p', null, p)); });
    v.appendChild(body);
    var acts = el('div', 'actions');
    var b = el('button', 'btn btn-primary', 'Seguir');
    b.onclick = next;
    acts.appendChild(b);
    v.appendChild(acts);
    show(v);
  }

  /* --- Barra de estado y panel de carta --- */

  function pipsHTML() {
    var glyphs = '<span class="label">Luz</span>';
    for (var i = 0; i < LIGHT_MAX; i++) {
      glyphs += '<span class="pip' + (i < state.light ? ' on' : '') + '">✦</span>';
    }
    return glyphs;
  }

  /* Repinta la luz en la barra que ya esta en pantalla. Sin esto, el jugador
     erra y la barra sigue mostrando el valor anterior hasta la pantalla siguiente. */
  function refreshLight() {
    var luz = document.querySelector('.statusbar .light');
    if (!luz) return;
    luz.innerHTML = pipsHTML();
    luz.classList.remove('flicker');
    void luz.offsetWidth;          // reinicia la animacion
    luz.classList.add('flicker');
  }

  function statusBar() {
    var bar = el('div', 'statusbar');
    var luz = el('div', 'light');
    luz.innerHTML = pipsHTML();
    bar.appendChild(luz);

    var casa = el('div', 'house-indicator',
      'Casa ' + Story.roman(state.house) + ' de XII');
    bar.appendChild(casa);

    var btn = el('button', 'btn btn-small', 'Ver mi carta');
    btn.onclick = openChart;
    bar.appendChild(btn);
    return bar;
  }

  function openChart() {
    var ov = el('div', 'overlay');
    var box = el('div', 'chart-box');
    var c = state.chart;

    var head = el('div', 'chart-head');
    head.innerHTML = '<h3>' + state.name + '</h3>' +
      '<p>' + c.birth.day + '/' + c.birth.month + '/' + c.birth.year + ' · ' +
      String(c.birth.hour).padStart(2, '0') + ':' + String(c.birth.minute).padStart(2, '0') +
      ' · ' + (c.birth.place || '') + '</p>' +
      '<p class="fine">Carta ' + c.sect + ' · casas ' + c.houseSystem +
      (c.houseFallback ? ' (Placidus no existe en esa latitud)' : '') + '</p>';
    box.appendChild(head);

    box.appendChild(el('div', 'wheel-wrap', Wheel.render(c)));

    var tabla = el('div', 'chart-tables');
    var t1 = '<table class="tbl"><thead><tr><th></th><th>Posición</th><th>Casa</th><th>Dign.</th></tr></thead><tbody>';
    ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn',
      'uranus', 'neptune', 'pluto', 'northNode'].forEach(function (k) {
        var b = c.bodies[k];
        var dg = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'].indexOf(k) >= 0
          ? Dignities.essentialDignity(k, b.lon, c.diurnal).score : '';
        t1 += '<tr><td class="g">' + b.glyph + ' ' + b.label + '</td><td>' + b.text +
          (b.retrograde ? ' <span class="rx">℞</span>' : '') +
          (b.viaCombusta ? ' <span class="vc">vc</span>' : '') +
          '</td><td>' + b.house + '</td><td>' + (dg === '' ? '—' : (dg > 0 ? '+' + dg : dg)) + '</td></tr>';
      });
    t1 += '</tbody></table>';

    var t2 = '<table class="tbl"><thead><tr><th>Ángulos y casas</th><th></th></tr></thead><tbody>';
    ['asc', 'mc', 'dsc', 'ic'].forEach(function (k) {
      t2 += '<tr><td class="g">' + c.angles[k].glyph + ' ' + c.angles[k].label +
        '</td><td>' + c.angles[k].text + '</td></tr>';
    });
    for (var h = 1; h <= 12; h++) {
      t2 += '<tr><td>Casa ' + h + '</td><td>' + Chart.formatLon(c.houses[h]) +
        ' <span class="fine">· rige ' + Story.lbl(Dignities.rulerOfHouse(c, h)) + '</span></td></tr>';
    }
    t2 += '</tbody></table>';

    var t3 = '<table class="tbl"><thead><tr><th>Tránsitos de hoy</th><th></th></tr></thead><tbody>';
    ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'].forEach(function (k) {
      var t = state.transits[k];
      t3 += '<tr><td class="g">' + Chart.BODY_GLYPHS[k] + ' ' + Chart.LABELS[k] + '</td><td>' +
        t.text + (t.retrograde ? ' <span class="rx">℞</span>' : '') +
        ' <span class="fine">· casa ' + Chart.houseOf(t.lon, c.houses) + '</span></td></tr>';
    });
    t3 += '</tbody></table>';

    tabla.innerHTML = t1 + t2 + t3;
    box.appendChild(tabla);

    var close = el('button', 'btn btn-primary', 'Cerrar');
    close.onclick = function () { document.body.removeChild(ov); };
    box.appendChild(close);

    ov.appendChild(box);
    ov.onclick = function (e) { if (e.target === ov) document.body.removeChild(ov); };
    document.body.appendChild(ov);
  }

  /* --- Capitulos --- */

  function screenChapter() {
    var h = state.house;
    var v = el('div', 'screen screen-chapter');
    v.appendChild(statusBar());

    var head = el('header', 'chapter-head');
    head.innerHTML = '<p class="chapter-sub">' + Story.HOUSE_SUBTITLE[h] + '</p>' +
      '<h2>' + Story.HOUSE_TITLES[h] + '</h2>';
    v.appendChild(head);

    var prose = el('div', 'prose');
    Story.CHAPTERS[h](ctx()).forEach(function (p) {
      prose.appendChild(el('p', null, p));
    });
    if (h !== 4) {
      prose.appendChild(el('p', 'threat', Story.threatLine(ctx(), h)));
    }
    v.appendChild(prose);

    var acts = el('div', 'actions');
    if (h === 4) {
      var heal = el('button', 'btn btn-primary',
        state.light < LIGHT_MAX ? 'Quedarse un rato' : 'Seguir');
      heal.onclick = function () {
        var before = state.light;
        state.light = LIGHT_MAX;
        refreshLight();
        save();
        var texto = before < LIGHT_MAX
          ? ['Cuando se levanta de la mesa tiene la luz entera otra vez.',
             'No porque le hayan dado algo. Porque se acordó de que la tenía.']
          : ['Se queda igual un rato más, aunque no le haga falta.',
             'Hay lugares a los que se entra por gusto.'];
        screenNarrative(texto.concat(Story.CHAPTER_OUTRO[4]()), null, nextHouse, 'refuge');
      };
      acts.appendChild(heal);
    } else {
      var go = el('button', 'btn btn-primary', 'Leer la casa');
      go.onclick = function () { state.step = 0; screenPuzzle(); };
      acts.appendChild(go);
    }
    v.appendChild(acts);
    show(v);
  }

  function screenPuzzle() {
    var h = state.house;
    var set = Puzzles.forHouse(h, ctx(), state.seed);
    if (!set) { nextHouse(); return; }
    var p = set[state.step];
    if (!p) { chapterCleared(); return; }

    var v = el('div', 'screen screen-puzzle');
    v.appendChild(statusBar());

    var head = el('header', 'chapter-head');
    head.innerHTML = '<p class="chapter-sub">' + Story.HOUSE_SUBTITLE[h] + '</p>' +
      '<h2>' + Story.HOUSE_TITLES[h] + '</h2>';
    v.appendChild(head);

    if (set.length > 1) {
      v.appendChild(el('p', 'step-count',
        'Paso ' + (state.step + 1) + ' de ' + set.length));
    }

    v.appendChild(el('div', 'prompt', p.prompt));
    if (p.hint) v.appendChild(el('p', 'hint', p.hint));

    var opts = el('div', 'options');
    p.options.forEach(function (o) {
      var b = el('button', 'opt', o.label);
      b.onclick = function () { answer(p, o, opts, v); };
      opts.appendChild(b);
    });
    v.appendChild(opts);

    var help = el('p', 'help',
      'Todo lo que necesitás está en tu carta. Podés abrirla cuando quieras.');
    v.appendChild(help);

    show(v);
  }

  function answer(p, chosen, optsNode, v) {
    Array.prototype.forEach.call(optsNode.children, function (b, i) {
      b.disabled = true;
      if (p.options[i].correct) b.classList.add('correct');
      else if (p.options[i] === chosen) b.classList.add('wrong');
    });

    var ok = !!chosen.correct;
    if (!ok) { state.light -= 1; refreshLight(); }
    save();

    var fb = el('div', 'feedback ' + (ok ? 'good' : 'bad'));
    fb.appendChild(el('p', 'verdict', ok ? 'Leíste bien.' : 'No era esa.'));
    fb.appendChild(el('p', 'explain', p.explain(ok)));
    if (!ok) {
      fb.appendChild(el('p', 'story-fail', Story.chapterFailText(ctx(), state.house)));
    }
    v.appendChild(fb);

    var acts = el('div', 'actions');
    var b = el('button', 'btn btn-primary', 'Seguir');
    b.onclick = function () {
      if (state.light <= 0) { finish(false); return; }
      state.step += 1;
      var set = Puzzles.forHouse(state.house, ctx(), state.seed);
      if (state.step < set.length) screenPuzzle();
      else chapterCleared();
    };
    acts.appendChild(b);
    v.appendChild(acts);
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function chapterCleared() {
    var h = state.house;
    if (h === 12) { finish(true); return; }
    var outro = Story.CHAPTER_OUTRO[h];
    if (outro) screenNarrative(outro(ctx()), null, nextHouse);
    else nextHouse();
  }

  function nextHouse() {
    state.house += 1;
    state.step = 0;
    save();
    if (state.house > 12) { finish(true); return; }
    screenChapter();
  }

  function finish(won) {
    state.done = true;
    state.won = won;
    clearSave();
    var e = Story.ending(ctx(), won);
    var v = el('div', 'screen screen-ending ' + (won ? 'won' : 'lost'));
    v.appendChild(el('h2', null, e.title));
    var prose = el('div', 'prose');
    e.paragraphs.forEach(function (p) {
      prose.appendChild(el('p', p === '···' ? 'sep' : null, p));
    });
    v.appendChild(prose);

    var acts = el('div', 'actions');
    var again = el('button', 'btn btn-primary', e.again);
    again.onclick = function () {
      state.house = 1; state.step = 0; state.light = LIGHT_MAX;
      state.done = false; state.seed = (state.seed + 104729) >>> 0;
      save();
      screenChapter();
    };
    acts.appendChild(again);

    var chart = el('button', 'btn', 'Ver mi carta');
    chart.onclick = openChart;
    acts.appendChild(chart);

    var home = el('button', 'btn btn-ghost', 'Volver al principio');
    home.onclick = function () { clearSave(); show(screenTitle()); };
    acts.appendChild(home);

    v.appendChild(acts);
    show(v);
  }

  function init(mount) {
    root = mount;
    show(screenTitle());
  }

  return { init: init };
})();
