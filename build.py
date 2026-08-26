#!/usr/bin/env python3
"""Empaqueta Via Combusta en un solo archivo, sin dependencias externas.

Genera dos salidas:
  dist/index.html    documento completo, para GitHub Pages o abrir local
  dist/artifact.html fragmento sin <html>/<head>/<body>, para publicar como Artifact

Uso:  py -3 build.py
"""
import io
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(BASE, 'dist')

FONTS = ('https://fonts.googleapis.com/css2?'
         'family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400'
         '&family=IBM+Plex+Mono:wght@400;500&display=swap')

TITLE = 'Vía Combusta'
DESC = ('Una historia de terror en doce casas, jugada sobre una carta natal '
        'real y calculada.')

# El orden importa: cada modulo usa los anteriores.
SCRIPTS = [
    'js/astro/vsop87.js',
    'js/astro/ephemeris.js',
    'js/astro/chart.js',
    'js/astro/dignities.js',
    'js/astro/places.js',
    'js/game/story.js',
    'js/game/puzzles.js',
    'js/game/wheel.js',
    'js/game/engine.js',
]
STYLES = ['css/style.css']


def read(rel):
    with io.open(os.path.join(BASE, rel), encoding='utf-8') as f:
        return f.read()


def strip_cjs(src):
    """Saca la cola de CommonJS, que solo sirve para correr los tests en Node."""
    src = re.sub(
        r"\n?if \(typeof module !== 'undefined' && module\.exports\) \{[^}]*\}\n?",
        '\n', src)
    # En el navegador los modulos ya estan como globales, asi que el require()
    # de respaldo nunca se evalua; se deja el lado global del operador.
    src = re.sub(
        r"\(typeof (\w+) !== 'undefined'\) \? \1 : require\([^)]*\)",
        r"\1", src)
    return src


def bundle_js():
    partes = []
    for s in SCRIPTS:
        partes.append('/* ===== %s ===== */\n%s' % (s, strip_cjs(read(s)).strip()))
    return '\n\n'.join(partes)


def bundle_css():
    return '\n\n'.join(read(s).strip() for s in STYLES)


def main():
    if not os.path.isdir(DIST):
        os.makedirs(DIST)

    css = bundle_css()
    js = bundle_js()

    cuerpo = (
        '<div id="app"></div>\n'
        '<script>\n%s\n\nGame.init(document.getElementById("app"));\n</script>\n'
        % js
    )

    completo = (
        '<!DOCTYPE html>\n<html lang="es">\n<head>\n'
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<title>%s</title>\n'
        '<meta name="description" content="%s">\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link href="%s" rel="stylesheet">\n'
        '<style>\n%s\n</style>\n'
        '</head>\n<body>\n%s</body>\n</html>\n'
        % (TITLE, DESC, FONTS, css, cuerpo)
    )

    # El Artifact envuelve el fragmento; el <title> tiene que entrar en los
    # primeros 8 KB, asi que va antes del CSS.
    artifact = (
        '<title>%s</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link href="%s" rel="stylesheet">\n'
        '<style>\n%s\n</style>\n%s'
        % (TITLE, FONTS, css, cuerpo)
    )

    for nombre, contenido in (('index.html', completo), ('artifact.html', artifact)):
        ruta = os.path.join(DIST, nombre)
        with io.open(ruta, 'w', encoding='utf-8') as f:
            f.write(contenido)
        print('%-16s %7.1f KB' % (nombre, len(contenido.encode('utf-8')) / 1024.0))


if __name__ == '__main__':
    main()
