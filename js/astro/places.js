/* Lugares y husos horarios.
   El Ascendente cambia un grado cada cuatro minutos: si la hora de nacimiento
   entra mal, la carta entera se corre. Argentina cambio de huso muchas veces
   entre 1894 y 2009, asi que va la tabla completa de transiciones reales. */
var Places = (function () {
  'use strict';

  /* Transiciones horarias de Argentina, en hora local efectiva (la que marcaba
     el reloj de pared). Cada entrada es [anio, mes, dia, offset en horas].
     Vigente desde esa fecha hasta la siguiente. */
  var ARG_TRANSITIONS = [
    [1894, 10, 31, -4.2827778],   // CMT, -4h16m48s
    [1920, 5, 1, -4],
    [1930, 12, 1, -3], [1931, 4, 1, -4],
    [1931, 10, 15, -3], [1932, 3, 1, -4],
    [1932, 11, 1, -3], [1933, 3, 1, -4],
    [1933, 11, 1, -3], [1934, 3, 1, -4],
    [1934, 11, 1, -3], [1935, 3, 1, -4],
    [1935, 11, 1, -3], [1936, 3, 1, -4],
    [1936, 11, 1, -3], [1937, 3, 1, -4],
    [1937, 11, 1, -3], [1938, 3, 1, -4],
    [1938, 11, 1, -3], [1939, 3, 1, -4],
    [1939, 11, 1, -3], [1940, 3, 1, -4],
    [1940, 7, 1, -3], [1941, 6, 15, -4],
    [1941, 10, 15, -3], [1943, 8, 1, -4],
    [1943, 10, 15, -3], [1944, 3, 1, -4],
    [1944, 10, 15, -3], [1945, 3, 1, -4],
    [1945, 10, 15, -3], [1946, 3, 1, -4],
    [1946, 10, 1, -3],            // queda en -3 durante diecisiete anios
    [1963, 10, 1, -4],
    [1963, 12, 15, -3], [1964, 3, 1, -4],
    [1964, 10, 15, -3], [1965, 3, 1, -4],
    [1965, 10, 15, -3], [1966, 3, 1, -4],
    [1966, 10, 15, -3], [1967, 4, 2, -4],
    [1967, 10, 1, -3], [1968, 4, 7, -4],
    [1968, 10, 6, -3], [1969, 4, 6, -4],
    [1969, 10, 5, -3],            // el huso base pasa a -3 y ya no vuelve
    [1974, 1, 23, -2], [1974, 5, 1, -3],
    [1988, 12, 1, -2], [1989, 3, 5, -3],
    [1989, 10, 15, -2], [1990, 3, 4, -3],
    [1990, 10, 21, -2], [1991, 3, 3, -3],
    [1991, 10, 20, -2], [1992, 3, 1, -3],
    [1992, 10, 18, -2], [1993, 3, 7, -3],
    // Entre 1999-10-03 y 2000-03-03 el huso base bajo a -4 y se sumo una hora
    // de verano: el reloj de pared no se movio, siguio marcando -3.
    [2007, 12, 30, -2], [2008, 3, 16, -3],
    [2008, 10, 19, -2], [2009, 3, 15, -3]
  ];

  function argentinaOffset(year, month, day) {
    var key = year * 10000 + month * 100 + day;
    var off = -4.2827778;
    for (var i = 0; i < ARG_TRANSITIONS.length; i++) {
      var t = ARG_TRANSITIONS[i];
      if (t[0] * 10000 + t[1] * 100 + t[2] <= key) off = t[3]; else break;
    }
    return off;
  }

  /* Si la fecha cae dentro de un periodo de horario de verano, conviene
     avisarlo: es la fuente de error mas comun al levantar una hora de nacimiento. */
  function argentinaNote(year, month, day) {
    var off = argentinaOffset(year, month, day);
    if (year >= 1969 && off === -2) {
      return 'Esa fecha cae en horario de verano (UTC-2). Si el dato viene de una ' +
        'partida de nacimiento, la hora ya está en horario de verano y está bien así.';
    }
    if (year < 1969 && off === -3) {
      return 'Antes de octubre de 1969 el huso base era UTC-4; esa fecha cae en un ' +
        'período de horario de verano (UTC-3).';
    }
    return null;
  }

  /* Ciudades. tz: 'AR' usa la tabla historica; un numero es un offset fijo.
     Longitud positiva al este, negativa al oeste. */
  var CITIES = [
    // Argentina
    { name: 'Ciudad de Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816, tz: 'AR' },
    { name: 'La Plata', country: 'Argentina', lat: -34.9215, lon: -57.9545, tz: 'AR' },
    { name: 'Mar del Plata', country: 'Argentina', lat: -38.0055, lon: -57.5426, tz: 'AR' },
    { name: 'Bahía Blanca', country: 'Argentina', lat: -38.7183, lon: -62.2663, tz: 'AR' },
    { name: 'Rosario', country: 'Argentina', lat: -32.9442, lon: -60.6505, tz: 'AR' },
    { name: 'Santa Fe', country: 'Argentina', lat: -31.6333, lon: -60.7000, tz: 'AR' },
    { name: 'Córdoba', country: 'Argentina', lat: -31.4201, lon: -64.1888, tz: 'AR' },
    { name: 'Río Cuarto', country: 'Argentina', lat: -33.1307, lon: -64.3499, tz: 'AR' },
    { name: 'Mendoza', country: 'Argentina', lat: -32.8895, lon: -68.8458, tz: 'AR' },
    { name: 'San Juan', country: 'Argentina', lat: -31.5375, lon: -68.5364, tz: 'AR' },
    { name: 'San Luis', country: 'Argentina', lat: -33.3017, lon: -66.3378, tz: 'AR' },
    { name: 'San Miguel de Tucumán', country: 'Argentina', lat: -26.8083, lon: -65.2176, tz: 'AR' },
    { name: 'Salta', country: 'Argentina', lat: -24.7821, lon: -65.4232, tz: 'AR' },
    { name: 'Jujuy', country: 'Argentina', lat: -24.1858, lon: -65.2995, tz: 'AR' },
    { name: 'Santiago del Estero', country: 'Argentina', lat: -27.7951, lon: -64.2615, tz: 'AR' },
    { name: 'Catamarca', country: 'Argentina', lat: -28.4696, lon: -65.7852, tz: 'AR' },
    { name: 'La Rioja', country: 'Argentina', lat: -29.4131, lon: -66.8558, tz: 'AR' },
    { name: 'Resistencia', country: 'Argentina', lat: -27.4514, lon: -58.9867, tz: 'AR' },
    { name: 'Corrientes', country: 'Argentina', lat: -27.4692, lon: -58.8306, tz: 'AR' },
    { name: 'Posadas', country: 'Argentina', lat: -27.3671, lon: -55.8961, tz: 'AR' },
    { name: 'Formosa', country: 'Argentina', lat: -26.1775, lon: -58.1781, tz: 'AR' },
    { name: 'Paraná', country: 'Argentina', lat: -31.7333, lon: -60.5297, tz: 'AR' },
    { name: 'Neuquén', country: 'Argentina', lat: -38.9516, lon: -68.0591, tz: 'AR' },
    { name: 'General Roca', country: 'Argentina', lat: -39.0333, lon: -67.5833, tz: 'AR' },
    { name: 'Viedma', country: 'Argentina', lat: -40.8135, lon: -62.9967, tz: 'AR' },
    { name: 'Comodoro Rivadavia', country: 'Argentina', lat: -45.8641, lon: -67.4966, tz: 'AR' },
    { name: 'Rawson', country: 'Argentina', lat: -43.3002, lon: -65.1023, tz: 'AR' },
    { name: 'Río Gallegos', country: 'Argentina', lat: -51.6230, lon: -69.2168, tz: 'AR' },
    { name: 'Ushuaia', country: 'Argentina', lat: -54.8019, lon: -68.3030, tz: 'AR' },
    // Region
    { name: 'Montevideo', country: 'Uruguay', lat: -34.9011, lon: -56.1645, tz: -3 },
    { name: 'Santiago', country: 'Chile', lat: -33.4489, lon: -70.6693, tz: -4 },
    { name: 'Asunción', country: 'Paraguay', lat: -25.2637, lon: -57.5759, tz: -4 },
    { name: 'La Paz', country: 'Bolivia', lat: -16.4897, lon: -68.1193, tz: -4 },
    { name: 'Lima', country: 'Perú', lat: -12.0464, lon: -77.0428, tz: -5 },
    { name: 'Bogotá', country: 'Colombia', lat: 4.7110, lon: -74.0721, tz: -5 },
    { name: 'Quito', country: 'Ecuador', lat: -0.1807, lon: -78.4678, tz: -5 },
    { name: 'Caracas', country: 'Venezuela', lat: 10.4806, lon: -66.9036, tz: -4 },
    { name: 'São Paulo', country: 'Brasil', lat: -23.5505, lon: -46.6333, tz: -3 },
    { name: 'Río de Janeiro', country: 'Brasil', lat: -22.9068, lon: -43.1729, tz: -3 },
    { name: 'Ciudad de México', country: 'México', lat: 19.4326, lon: -99.1332, tz: -6 },
    { name: 'La Habana', country: 'Cuba', lat: 23.1136, lon: -82.3666, tz: -5 },
    // Resto del mundo
    { name: 'Nueva York', country: 'Estados Unidos', lat: 40.7128, lon: -74.0060, tz: -5 },
    { name: 'Los Ángeles', country: 'Estados Unidos', lat: 34.0522, lon: -118.2437, tz: -8 },
    { name: 'Miami', country: 'Estados Unidos', lat: 25.7617, lon: -80.1918, tz: -5 },
    { name: 'Madrid', country: 'España', lat: 40.4168, lon: -3.7038, tz: 1 },
    { name: 'Barcelona', country: 'España', lat: 41.3874, lon: 2.1686, tz: 1 },
    { name: 'Roma', country: 'Italia', lat: 41.9028, lon: 12.4964, tz: 1 },
    { name: 'París', country: 'Francia', lat: 48.8566, lon: 2.3522, tz: 1 },
    { name: 'Londres', country: 'Reino Unido', lat: 51.5074, lon: -0.1278, tz: 0 },
    { name: 'Berlín', country: 'Alemania', lat: 52.5200, lon: 13.4050, tz: 1 },
    { name: 'Lisboa', country: 'Portugal', lat: 38.7223, lon: -9.1393, tz: 0 },
    { name: 'Atenas', country: 'Grecia', lat: 37.9838, lon: 23.7275, tz: 2 },
    { name: 'El Cairo', country: 'Egipto', lat: 30.0444, lon: 31.2357, tz: 2 },
    { name: 'Estambul', country: 'Turquía', lat: 41.0082, lon: 28.9784, tz: 3 },
    { name: 'Moscú', country: 'Rusia', lat: 55.7558, lon: 37.6173, tz: 3 },
    { name: 'Tel Aviv', country: 'Israel', lat: 32.0853, lon: 34.7818, tz: 2 },
    { name: 'Bombay', country: 'India', lat: 19.0760, lon: 72.8777, tz: 5.5 },
    { name: 'Tokio', country: 'Japón', lat: 35.6762, lon: 139.6503, tz: 9 },
    { name: 'Pekín', country: 'China', lat: 39.9042, lon: 116.4074, tz: 8 },
    { name: 'Sídney', country: 'Australia', lat: -33.8688, lon: 151.2093, tz: 10 }
  ];

  function offsetFor(city, year, month, day) {
    if (!city) return -3;
    return city.tz === 'AR' ? argentinaOffset(year, month, day) : city.tz;
  }

  function noteFor(city, year, month, day) {
    if (!city) return null;
    if (city.tz === 'AR') return argentinaNote(year, month, day);
    return 'Para lugares fuera de Argentina se usa el huso estándar (UTC' +
      (city.tz >= 0 ? '+' : '') + city.tz + '). Si nació en horario de verano, ' +
      'ajustá la hora una hora hacia atrás.';
  }

  function find(name) {
    var n = (name || '').toLowerCase().trim();
    for (var i = 0; i < CITIES.length; i++) {
      if (CITIES[i].name.toLowerCase() === n) return CITIES[i];
    }
    return null;
  }

  function search(q) {
    var n = (q || '').toLowerCase().trim();
    if (!n) return CITIES.slice(0, 12);
    return CITIES.filter(function (c) {
      return c.name.toLowerCase().indexOf(n) >= 0 ||
        c.country.toLowerCase().indexOf(n) >= 0;
    }).slice(0, 12);
  }

  return {
    CITIES: CITIES,
    argentinaOffset: argentinaOffset,
    argentinaNote: argentinaNote,
    offsetFor: offsetFor,
    noteFor: noteFor,
    find: find,
    search: search
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = Places; }
