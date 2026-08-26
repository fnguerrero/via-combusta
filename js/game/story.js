/* Narrativa de Via Combusta.
   Doce capitulos, uno por casa. Cada texto se arma con la carta real de quien
   juega: los signos, los regentes y los planetas que aparecen son los suyos.
   La Luna es la madre y es refugio: nunca amenaza, nunca se la enfrenta. */
var Story = (function () {
  'use strict';

  var C = (typeof Chart !== 'undefined') ? Chart : require('../astro/chart.js');
  var D = (typeof Dignities !== 'undefined') ? Dignities : require('../astro/dignities.js');

  var LABEL = {
    sun: 'el Sol', moon: 'la Luna', mercury: 'Mercurio', venus: 'Venus',
    mars: 'Marte', jupiter: 'Júpiter', saturn: 'Saturno', uranus: 'Urano',
    neptune: 'Neptuno', pluto: 'Plutón'
  };
  function lbl(k) { return LABEL[k] || k; }
  // Nombre sin articulo, para arrancar frases.
  function name(k) { return (LABEL[k] || k).replace(/^(el|la) /, ''); }

  var HOUSE_TITLES = [
    null,
    'La puerta',            // I
    'Lo que sostiene',      // II
    'Las calles cortas',    // III
    'La casa de tu madre',  // IV
    'Lo que hacés',         // V
    'El cuarto de atrás',   // VI
    'El que espera',        // VII
    'Lo que se hereda',     // VIII
    'El camino largo',      // IX
    'La obra',              // X
    'Los que quedan',       // XI
    'Vía Combusta'          // XII
  ];

  var HOUSE_SUBTITLE = [
    null,
    'Casa I · el cuerpo, el umbral',
    'Casa II · los recursos, lo propio',
    'Casa III · lo cercano, la palabra',
    'Casa IV · las raíces, el origen',
    'Casa V · la creación, el juego',
    'Casa VI · el trabajo, la enfermedad',
    'Casa VII · el otro, el enemigo declarado',
    'Casa VIII · la muerte, lo heredado',
    'Casa IX · el viaje, la doctrina',
    'Casa X · la vocación, lo que se ve',
    'Casa XI · los amigos, la esperanza',
    'Casa XII · lo oculto, lo que no tiene nombre'
  ];

  /* --- Prologo --- */

  function prologue(ctx) {
    var n = ctx.name;
    return [
      'Hacía cuatro noches que ' + n + ' no dormía de verdad.',

      'Dormía a pedazos, como quien se distrae de estar despierta. Se acostaba ' +
      'con la ropa puesta y se levantaba a las tres de la mañana a hacer cosas ' +
      'que no hacían falta: ordenar los libros por altura, limpiar una hornalla ' +
      'que ya estaba limpia, mirar el teléfono sin abrirlo.',

      'Los proyectos estaban ahí, en la mesa, tal como los había dejado. Las ' +
      'cartas a medio levantar. Las consultas sin responder. Todo esperando a ' +
      'alguien que en ese momento no era ella.',

      'Esa noche salió a caminar sin decidirlo. Bajó por la calle de siempre y ' +
      'siguió de largo, y después siguió un poco más, hasta la parte donde las ' +
      'luces están cada dos cuadras y el ruido de la ciudad queda atrás como un ' +
      'motor que se aleja.',

      'Fue ahí que el teléfono vibró.',

      'Un mensaje sin número. Sin nombre. Sin hora de envío: el renglón donde ' +
      'iba la hora estaba en blanco, y ' + n + ' se quedó mirando ese blanco un ' +
      'rato largo, porque un mensaje sin hora es un mensaje que no ocurrió.',

      'Decía:',

      '<em>Estoy bien. Estoy mejor de lo que te imaginás.<br>' +
      'Lo que me duele es verte así.<br>' +
      'Seguí con tus cosas, mi amor. Todo lo que sabés hacer, hacelo.<br>' +
      'No lo heredaste de mí para guardarlo.</em>',

      'Levantó la cabeza.',

      'La calle no era la calle. Era la misma vereda, los mismos árboles, la ' +
      'misma persiana rota de la esquina, pero el cielo se había abierto de una ' +
      'manera que ' + n + ' conocía muy bien. No de haberlo visto: de haberlo ' +
      'dibujado. Mil veces. En papel.',

      'Doce sectores. Doce puertas. La rueda entera desplegada sobre la ciudad, ' +
      'y ella parada exactamente en el punto que sube por el este.',

      'Su Ascendente en ' + ctx.chart.angles.asc.signName + '. ' +
      ctx.chart.angles.asc.text + '. El grado exacto en el que había empezado.',

      'Y del otro lado de la rueda, en el sector más lejano, algo esperaba que ' +
      'ella caminara los doce.'
    ];
  }

  function briefing(ctx) {
    var moon = ctx.chart.bodies.moon;
    return [
      'Hay una sola regla y ' + ctx.name + ' la entendió antes de que nadie se la dijera:',
      '<strong>para cruzar una casa hay que leerla bien.</strong>',
      'No adivinarla. Leerla. Como se lee una carta de verdad, mirando quién ' +
      'gobierna, quién está fuerte, quién está roto, quién mira a quién.',
      'Cada error le cuesta luz. Cuando la luz se termina, la rueda se cierra ' +
      'y ella queda del lado de adentro.',
      'Su Luna está en ' + moon.signName + ', en la casa ' + roman(moon.house) +
      '. En astrología la Luna es la madre.',
      'Va a aparecer. No siempre cuando ' + ctx.name + ' quiera, pero siempre ' +
      'cuando haga falta.'
    ];
  }

  function roman(n) {
    return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] || String(n);
  }

  /* --- El antagonista ---
     No tiene carta. No nacio en ninguna parte, a ninguna hora, y por eso no
     tiene regente, ni dignidad, ni casa propia: es peregrino absoluto. Lo que
     busca es una carta prestada. */

  function threatLine(ctx, house) {
    var lines = [
      'Algo camina la rueda al mismo tiempo que ella, en sentido contrario.',
      'No hace ruido. Lo que hace es al revés: donde pasa, el ruido se va.',
      'No tiene signo. Lo probó a los doce años, cuando aprendió a levantar cartas ' +
      'y quiso levantar la de todo lo que se le cruzaba. De esto no salía nada. ' +
      'No hay hora. No hay lugar. No hay cielo detrás.',
      'Un cuerpo sin carta no está vivo ni muerto: está sin empezar.',
      'Y lo que está sin empezar tiene una sola hambre.',
      'Lo esperó en la doce, que es donde se esconde lo que no quiere ser mirado.',
      'Cada casa que ' + ctx.name + ' cruza, él la cruza también.',
      'No corre. Nunca corrió. Le alcanza con que ella se equivoque.'
    ];
    return lines[house % lines.length];
  }

  /* --- Capitulos ---
     Cada uno recibe ctx = { name, chart, transits, state } y devuelve
     los parrafos de entrada. La prueba concreta la arma puzzles.js. */

  var CHAPTERS = {

    1: function (ctx) {
      var asc = ctx.chart.angles.asc;
      var ruler = D.rulerOfSign(asc.sign);
      var rb = ctx.chart.bodies[ruler];
      return [
        'La puerta de la casa I es el punto donde el cielo empieza a subir, y ' +
        'para ' + ctx.name + ' ese punto es ' + asc.text + '.',
        'No es una puerta con marco. Es un lugar de la vereda donde el aire ' +
        'cambia de temperatura, y del otro lado la calle sigue igual pero está ' +
        'un poco más oscura de lo que debería a esta hora.',
        'Se para en el borde. Sabe que no se entra a la casa I sin permiso de ' +
        'quien la gobierna, y quien gobierna una casa es el regente de su signo.',
        rb ? ('Lo siente antes de verlo: está en ' + rb.signName + ', en la casa ' +
          roman(rb.house) + (rb.retrograde ? ', retrógrado' : '') + '.') :
          'Lo siente antes de verlo.',
        '<em>Decí mi nombre</em>, dice la puerta. <em>El de verdad. No el del ' +
        'planeta que te gustaría que fuera.</em>'
      ];
    },

    2: function (ctx) {
      return [
        'La casa II es un sótano largo con estanterías, y en las estanterías ' +
        'está todo lo que ' + ctx.name + ' tiene: no las cosas, sino lo que ' +
        'las cosas le dan.',
        'Hay frascos con años adentro. Hay una caja con la letra de su madre en ' +
        'la tapa. Hay un estante entero vacío que ' + ctx.name + ' prefiere no mirar.',
        'Al fondo, una balanza vieja de dos platos.',
        '<em>Acá se pesa</em>, dice el sótano. <em>Y acá lo único que pesa es la ' +
        'dignidad. Un planeta en su propio signo vale. Un planeta caído no ' +
        'sostiene nada, por más lindo que se vea.</em>',
        'La balanza espera. Hay que poner arriba al que de verdad aguanta.'
      ];
    },

    3: function (ctx) {
      return [
        'La casa III son las cuadras que ' + ctx.name + ' caminó toda la vida ' +
        'sin mirar: el kiosco, la esquina, la casa de la vecina que siempre ' +
        'barría a las siete.',
        'Está todo, pero corrido unos centímetros. Las puertas dan a donde no ' +
        'daban. El kiosco tiene la persiana baja y adentro hay luz.',
        'En el medio de la calle, dos figuras paradas a cierta distancia una de ' +
        'la otra. No se hablan. Se miran.',
        'Y la distancia entre las dos no es casual: es exactamente el ángulo que ' +
        'forman en su carta.',
        '<em>Todo lo que se dice acá</em>, dice la calle, <em>se dice a través de ' +
        'un ángulo. Nombralo.</em>'
      ];
    },

    4: function (ctx) {
      var moon = ctx.chart.bodies.moon;
      return [
        'La casa IV no la tiene que abrir. Ya está abierta.',
        'Es la cocina. La de siempre, la de verdad, con la luz de la campana ' +
        'prendida y la mesa puesta para dos, y el ruido chiquito de algo que se ' +
        'está haciendo a fuego bajo.',
        ctx.name + ' se queda en el marco de la puerta sin poder entrar del todo.',
        '—Sentate —dice su madre, sin darse vuelta—. Estás caminando hace horas.',
        'Y ' + ctx.name + ' se sienta, porque hay voces a las que el cuerpo le ' +
        'hace caso antes que la cabeza.',
        'Nadie le explica nada. Le ponen algo caliente adelante y le corren el ' +
        'pelo de la cara, y recién ahí, con esa mano ahí, ' + ctx.name + ' se da ' +
        'cuenta de cuánto le pesaba la cabeza.',
        '—No vine a decirte que sigas —dice su madre—. Eso ya lo sabés. Vine ' +
        'porque estabas cansada y nadie te estaba mirando.',
        'Su Luna está en ' + moon.signName + ', a ' + moon.text + '. Ahí estuvo ' +
        'siempre, desde el minuto en que nació. No es una aparición. Es una ' +
        'posición. Y las posiciones no se van.',
        '—Ahora andá. Y escuchame bien: lo que te sigue no puede entrar acá. ' +
        'Ni acá ni a ningún lugar donde estés siendo cuidada. Fijate qué te dice ' +
        'eso de lo que es.'
      ];
    },

    5: function (ctx) {
      return [
        'La casa V es un teatro sin butacas, con el escenario iluminado y todo ' +
        'lo demás negro.',
        'Sobre las tablas hay cosas que ' + ctx.name + ' hizo: cartas que ' +
        'levantó, gente a la que le dijo algo que le cambió el año, cuadernos ' +
        'enteros de una letra chiquita que ya no usa.',
        'Y hay cosas que todavía no hizo, que están ahí igual, en cajas cerradas ' +
        'con su nombre.',
        'El escenario está dividido en tres franjas de diez grados.',
        '<em>Los decanatos</em>, dice el teatro. <em>Cada diez grados tiene un ' +
        'dueño, y el orden es el viejo, el de los caldeos, el que va del más ' +
        'lento al más rápido y vuelve a empezar. Decime de quién es esta franja.</em>'
      ];
    },

    6: function (ctx) {
      return [
        'La casa VI es el cuarto de atrás de una casa que ' + ctx.name + ' no ' +
        'conoce, con olor a remedio viejo y una ventana que da a un pozo de aire.',
        'Hay siete camas. En seis hay alguien acostado.',
        'Los reconoce uno por uno: son los planetas de su carta, cada uno con lo ' +
        'que le tocó. Uno tiene la cara cerca del fuego y no puede abrir los ojos. ' +
        'Otro camina para atrás sin darse cuenta de que camina para atrás.',
        'Ninguno se queja. Es peor que se quejen.',
        '<em>Acá no se cura nada</em>, dice el cuarto. <em>Acá se diagnostica. ' +
        'Decime cuál está peor, y decilo bien, porque si señalás al que no es, ' +
        'el que está mal se queda solo.</em>'
      ];
    },

    7: function (ctx) {
      return [
        'La casa VII es la vereda de enfrente.',
        'Toda la vida estuvo ahí. ' + ctx.name + ' cruzó esa calle miles de ' +
        'veces sin pensar que del otro lado había una casa que la miraba.',
        'Hoy hay alguien parado en el umbral, a ciento ochenta grados exactos de ' +
        'donde está ella. No se mueve. No amenaza. Espera, que es lo que hacen ' +
        'los enemigos declarados: los declarados esperan de frente.',
        'La oposición es el único aspecto que se ve entero. Todo lo demás en una ' +
        'carta se sugiere; esto se planta.',
        '<em>No podés pasar mirando el piso</em>, dice la calle. <em>Decime quién ' +
        'está enfrente de quién.</em>'
      ];
    },

    8: function (ctx) {
      var n = ctx.name;
      return [
        'La casa VIII es la que ' + n + ' venía esquivando desde la primera.',
        'Es un pasillo con puertas a los dos lados y ninguna tiene picaporte de ' +
        'este lado. Al fondo hay una mesa con papeles.',
        'Son papeles de sucesión. ' + n + ' los conoce: los firmó hace poco, en ' +
        'una oficina con luz de tubo, mientras una mujer amable le explicaba ' +
        'cosas que no le entraban.',
        'Pero estos dicen otra cosa. En el renglón donde iba una cuenta bancaria ' +
        'dice: <em>lo que sabe hacer</em>. En el renglón de los bienes dice: ' +
        '<em>la mano para leer a la gente</em>. Y más abajo, con la misma letra ' +
        'de la tapa de la caja del sótano: <em>esto no se liquida, se usa</em>.',
        'La casa VIII es la muerte, sí. Pero en la tradición es también todo lo ' +
        'que pasa de una mano a otra cuando alguien se va. Lo heredado. Lo que ' +
        'queda funcionando.',
        'Para firmar hay que saber en qué término del signo estás parada. Los ' +
        'términos egipcios: cada signo partido en cinco tramos desiguales, cada ' +
        'tramo con su dueño.',
        '<em>Nadie hereda sin saber dónde está parado</em>, dice el pasillo.'
      ];
    },

    9: function (ctx) {
      return [
        'La casa IX es una ruta de noche, recta, sin banquina, con el cielo ' +
        'entero encima y ni un auto en las dos direcciones.',
        ctx.name + ' camina por el medio del asfalto porque no hay motivo para ' +
        'no hacerlo.',
        'Acá arriba se ve mejor que en la ciudad. Se ven los cuatro elementos ' +
        'repartidos, cada uno con sus tres signos, y cada grupo con sus dueños: ' +
        'uno manda de día, otro manda de noche.',
        'Su carta es ' + ctx.chart.sect + '. Eso no es un detalle decorativo: ' +
        'cambia quién tiene autoridad sobre qué.',
        '<em>La doctrina no es lo que creés</em>, dice la ruta. <em>Es lo que ' +
        'sabés aplicar a la hora que es. Decime quién gobierna acá, ahora, con ' +
        'esta luz.</em>'
      ];
    },

    10: function (ctx) {
      var mc = ctx.chart.angles.mc;
      return [
        'La casa X es lo más alto del cielo y se llega subiendo.',
        'Una escalera de servicio, de las de afuera, de un edificio que ' +
        ctx.name + ' no reconoce. Sube muchos pisos. Abajo, la rueda entera ' +
        'girando despacio sobre la ciudad.',
        'Arriba de todo hay una terraza y en el medio de la terraza está su Medio ' +
        'Cielo: ' + mc.text + '. El punto exacto donde su carta culmina.',
        'Es el grado que la gente ve cuando la ve trabajar. El que aparece cuando ' +
        'alguien dice su nombre en una habitación donde ella no está.',
        'Y todo grado del zodíaco tiene un dueño: no el regente del signo nomás, ' +
        'sino el que suma más dignidad en ese punto exacto. El almutén.',
        '<em>Este grado es tuyo</em>, dice la terraza, <em>pero alguien te lo ' +
        'presta. Decime quién.</em>'
      ];
    },

    11: function (ctx) {
      var t = ctx.transits;
      return [
        'La casa XI está llena de gente y ' + ctx.name + ' tarda en entender ' +
        'que son los que quedaron.',
        'Están los amigos. Está la gente a la que le leyó la carta y volvió. ' +
        'Está la que le escribió estos días sin saber qué poner y puso cualquier ' +
        'cosa con tal de poner algo.',
        'Nadie la mira con lástima. Eso es lo que la desarma.',
        'En el techo del salón, en vez de luces, están los planetas de hoy. No ' +
        'los de su nacimiento: los de esta noche, moviéndose de verdad, ahora ' +
        'mismo, mientras ella respira.',
        'El Sol de hoy está en ' + t.sun.text + '. La Luna de hoy en ' + t.moon.text + '.',
        '<em>La casa XI es el buen daimon</em>, dice el salón. <em>Lo que te ' +
        'llega de afuera y te ayuda. Pero para recibirlo tenés que estar mirando ' +
        'el cielo de hoy, no el de tu nacimiento. Fijate qué está pasando ahora.</em>'
      ];
    },

    12: function (ctx) {
      var n = ctx.name;
      return [
        'La casa XII no tiene puerta. Se entra porque se terminaron las otras once.',
        'Y adentro no está oscuro. Ese es el problema. Está esa claridad rara de ' +
        'las cinco de la mañana, cuando todavía no amaneció pero ya se ve, y todo ' +
        'lo que se ve se ve mal.',
        'Es un tramo de camino quemado. Treinta grados exactos, de la mitad de ' +
        'Libra a la mitad de Escorpio. Los viejos lo llamaron <em>vía combusta</em>: ' +
        'la vía quemada. Decían que un planeta que cae acá queda afligido, y que ' +
        'una pregunta hecha con la Luna acá no se contesta.',
        'No es una metáfora del alma. Es un tramo del zodíaco. Está en los libros. ' +
        n + ' lo enseñó.',
        'En el medio del camino hay una figura.',
        'Tiene forma de persona de la manera en que una silla tiene forma de ' +
        'persona: porque está hecha para que alguien se siente adentro.',
        '—Nunca te tuve miedo —dice ' + n + ', y le sale la voz más firme de lo ' +
        'que esperaba.',
        '—No —contesta—. Vos me tenés lástima. Es peor para vos.',
        'Y por primera vez en toda la rueda, habla:',
        '<em>Yo no nací. No hay hora en la que yo haya empezado. No hay lugar. ' +
        'Nadie levantó el cielo el minuto en que aparecí, porque no hubo minuto. ' +
        'No tengo signo, no tengo regente, no tengo casa. Soy peregrino en los ' +
        'trescientos sesenta grados.</em>',
        '<em>Y vos tenés una carta preciosa.</em>',
        'Da un paso.',
        '<em>No te la quiero robar. La quiero usar. Vos seguí adentro. Ni te vas ' +
        'a dar cuenta. La gente que te quiere tampoco.</em>',
        'Y ' + n + ' entiende, con una claridad que le hiela las manos, que esto ' +
        'es exactamente lo que pasa cuando alguien se apaga de a poco y sigue ' +
        'yendo a trabajar.'
      ];
    }
  };

  /* Cierre de cada capitulo cuando la prueba salio bien. */
  var CHAPTER_OUTRO = {
    1: function (ctx, r) {
      return ['La puerta no se abre: se corre, como una cortina.',
        'Del otro lado, la casa I entera, que es su propio cuerpo visto desde ' +
        'afuera por primera vez.'];
    },
    2: function () {
      return ['El plato baja con un peso honesto.',
        'En la estantería del fondo, el estante vacío sigue vacío. Pero ahora ' +
        'tiene una etiqueta, y la etiqueta dice <em>en uso</em>.'];
    },
    3: function () {
      return ['Las dos figuras giran la cabeza al mismo tiempo, hacia ella.',
        'Y se corren, sin dejar de mirarse entre sí, para dejarle la calle libre.'];
    },
    4: function () {
      return ['La puerta de la cocina queda abierta atrás suyo.',
        'No se cierra en toda la noche.'];
    },
    5: function () {
      return ['Las luces del escenario bajan a la franja correcta y ahí se quedan.',
        'Una de las cajas cerradas hace un ruido chiquito, de algo que se acomoda ' +
        'adentro.'];
    },
    6: function (ctx, r) {
      return ['El que está peor abre los ojos cuando ' + ctx.name + ' lo nombra.',
        'No dice gracias. Los que están así nunca dicen gracias. Pero se corre un ' +
        'poco en la cama, que es lo mismo.'];
    },
    7: function () {
      return ['El del umbral de enfrente asiente una vez, despacio.',
        'Y entra a su casa, y cierra, como quien termina un asunto viejo.'];
    },
    8: function (ctx) {
      return ['Los papeles se ordenan solos.',
        'En el último renglón, donde iba la firma de quien recibe, ya está escrito ' +
        'el nombre de ' + ctx.name + '. Con su letra. De antes.'];
    },
    9: function () {
      return ['La ruta se termina de golpe en una loma y desde arriba se ve todo.',
        'La ciudad, la rueda, y los once sectores que quedaron atrás.'];
    },
    10: function (ctx) {
      return ['La terraza aguanta.',
        'Desde acá arriba, por primera vez, ' + ctx.name + ' ve la casa XII ' +
        'entera. Y lo que hay adentro la ve a ella.'];
    },
    11: function () {
      return ['Alguien le pone una campera sobre los hombros sin decir nada.',
        'Cuando se da vuelta no hay nadie, pero la campera sigue ahí.'];
    },
    12: null   // el final tiene su propio texto
  };

  function chapterFailText(ctx, house) {
    var n = ctx.name;
    var texts = {
      1: 'La puerta no se mueve. Y algo, atrás, a media cuadra, se detiene también.',
      2: 'El plato sube de golpe. Lo que había puesto no pesaba nada.',
      3: 'Las dos figuras siguen mirándose. La calle se estira un poco más.',
      5: 'Las luces se van a la franja de al lado y la caja con su nombre queda a oscuras.',
      6: 'El que ' + n + ' señaló abre los ojos, ve que no es a él, y vuelve a cerrarlos. En otra cama, alguien se hunde un poco más.',
      7: 'El del umbral no se mueve. Espera. Es lo único que sabe hacer y lo hace muy bien.',
      8: 'La lapicera no marca. Los papeles saben que todavía no.',
      9: 'La ruta se hace más larga. Arriba, los elementos se corren de lugar.',
      10: 'Un escalón cede. ' + n + ' se agarra del barandal con las dos manos y no mira abajo.',
      11: 'Las luces del techo parpadean. Por un segundo, el salón está vacío.',
      12: 'La figura se acerca un paso más y ' + n + ' no puede retroceder, porque atrás está el camino quemado.'
    };
    return texts[house] || 'La casa se cierra un poco sobre ella.';
  }

  /* --- Final --- */

  function ending(ctx, won) {
    var n = ctx.name;
    var moon = ctx.chart.bodies.moon;
    if (!won) {
      return {
        title: 'La rueda se cerró',
        paragraphs: [
          'A ' + n + ' se le apagó la luz en la mitad del camino quemado.',
          'No pasó nada dramático. Eso es lo peor de esta clase de finales: no ' +
          'pasa nada. Simplemente al día siguiente se levantó, y contestó los ' +
          'mensajes con la cantidad justa de palabras, y no volvió a abrir los ' +
          'cuadernos.',
          'Todo el mundo dijo que estaba bien. Ella también lo dijo.',
          'Pero en la cocina de la casa IV la mesa sigue puesta para dos, y la ' +
          'luz de la campana sigue prendida, y alguien todavía la está esperando ' +
          'con algo caliente.',
          'Esa puerta no se cierra nunca. Se puede volver a entrar.'
        ],
        again: 'Volver a caminar la rueda'
      };
    }
    return {
      title: 'Levantar la carta',
      paragraphs: [
        n + ' no le pegó. No se puede pegarle a algo que no empezó.',
        'Hizo lo único que sabía hacer, que es lo que hizo toda la vida y lo que ' +
        'su madre le enseñó a hacer antes de que tuviera edad para entenderlo.',
        'Levantó la carta.',
        'Sacó el cuaderno, y ahí parada en el medio de la vía combusta, con la ' +
        'mano firme, empezó a anotar: hora, no hay. Lugar, no hay. Ascendente, ' +
        'no hay. Regente, no hay. Dignidad, ninguna. Peregrino en los trescientos ' +
        'sesenta grados.',
        'Y cuando terminó de escribirlo, lo dijo en voz alta, que es lo que hace ' +
        'un astrólogo con lo que ve: <strong>vos no sos una amenaza. Sos un vacío ' +
        'con buenos modales.</strong>',
        'La figura no gritó ni se deshizo. Se quedó ahí, expuesta, que para algo ' +
        'que vive de no ser mirado es exactamente lo mismo.',
        n + ' pasó por al lado y siguió caminando, y el camino quemado se terminó ' +
        'a las tres cuadras, como se terminan todos los tramos: porque el zodíaco ' +
        'sigue.',
        '···',
        'Amaneció en la vereda de su casa, con el teléfono en la mano.',
        'El mensaje seguía ahí. Sin número, sin nombre, sin hora.',
        'Arriba, donde tendría que haber estado la hora, ahora había algo escrito. ' +
        'Un solo dato:',
        '<em>' + moon.text + ' · casa ' + roman(moon.house) + '</em>',
        'Su Luna. La posición exacta que tiene desde el minuto en que nació y que ' +
        'va a tener siempre, esté quien esté y no esté quien no esté.',
        n + ' se quedó sentada en el cordón hasta que se hizo de día del todo.',
        'Después subió, se hizo un café, y abrió los cuadernos.'
      ],
      again: 'Volver a caminar la rueda'
    };
  }

  return {
    HOUSE_TITLES: HOUSE_TITLES,
    HOUSE_SUBTITLE: HOUSE_SUBTITLE,
    CHAPTERS: CHAPTERS,
    CHAPTER_OUTRO: CHAPTER_OUTRO,
    prologue: prologue,
    briefing: briefing,
    threatLine: threatLine,
    chapterFailText: chapterFailText,
    ending: ending,
    roman: roman,
    lbl: lbl,
    name: name
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = Story; }
