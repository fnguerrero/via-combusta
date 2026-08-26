#!/usr/bin/env python3
"""Genera el icono del juego: la rueda con el tramo quemado marcado en rojo.

El motivo tiene que leerse a 16 px, asi que se reduce a lo minimo: anillo
dorado, marcas de los doce signos, y el arco de la via combusta en rojo.

Uso:  py -3 tools/make_icon.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(BASE, 'viacombusta.ico')

FONDO = (10, 9, 14, 255)
ORO = (201, 162, 39, 255)
ORO_TENUE = (138, 108, 20, 255)
SANGRE = (214, 62, 74, 255)
BRASA = (255, 122, 92, 255)

# La via combusta va de 15 Libra a 15 Escorpio: 195 a 225 grados de longitud.
VC_INICIO, VC_FIN = 195, 225


def dibujar(px):
    """Dibuja el icono a resolucion px, con 4x de supermuestreo.

    A tamano de escritorio hay poco lugar, asi que el dibujo se reduce a tres
    cosas: el anillo del zodiaco, el tramo quemado y el centro. Nada mas entra.
    """
    S = 4
    n = px * S
    c = n / 2.0
    r_ext = n * 0.45
    r_int = r_ext * 0.60          # anillo ancho, para que el rojo tenga lugar

    def caja(r):
        return [c - r, c - r, c + r, c + r]

    # El resplandor va en su propia capa, para poder desenfocarlo aparte.
    brillo = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    ImageDraw.Draw(brillo).pieslice(
        caja(r_ext * 1.06), start=-VC_FIN, end=-VC_INICIO, fill=BRASA)
    brillo = brillo.filter(ImageFilter.GaussianBlur(n * 0.035))

    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Disco de fondo.
    d.ellipse(caja(r_ext), fill=FONDO)

    # Tramo quemado: se pinta el sector entero y se tapa el centro, asi queda
    # un pedazo de anillo y no una cuna. En PIL el angulo cero apunta al este y
    # crece en sentido horario; la longitud ecliptica crece al reves.
    d.pieslice(caja(r_ext), start=-VC_FIN, end=-VC_INICIO, fill=SANGRE)
    d.ellipse(caja(r_int), fill=FONDO)

    # Bordes del anillo.
    grosor = max(S, int(n * 0.032))
    d.ellipse(caja(r_ext), outline=ORO, width=grosor)
    d.ellipse(caja(r_int), outline=ORO_TENUE, width=max(S, grosor // 2))

    # Las doce divisiones, solo dentro del anillo.
    ancho = max(S, int(n * 0.016))
    for i in range(12):
        ang = math.radians(i * 30)
        x1, y1 = c + r_int * math.cos(ang), c - r_int * math.sin(ang)
        x2, y2 = c + r_ext * math.cos(ang), c - r_ext * math.sin(ang)
        d.line([x1, y1, x2, y2], fill=ORO_TENUE, width=ancho)

    # Centro.
    r_c = n * 0.075
    d.ellipse(caja(r_c), fill=ORO)

    img = Image.alpha_composite(brillo, img)
    return img.resize((px, px), Image.LANCZOS)


def main():
    tamanos = [256, 128, 64, 48, 32, 24, 16]
    capas = [dibujar(t) for t in tamanos]
    capas[0].save(SALIDA, format='ICO',
                  sizes=[(t, t) for t in tamanos],
                  append_images=capas[1:])
    print('icono: %s (%d bytes, tamanos %s)'
          % (SALIDA, os.path.getsize(SALIDA), tamanos))

    # Vista previa grande, para revisar el trazo.
    dibujar(256).save(os.path.join(BASE, 'tools', 'icono-preview.png'))


if __name__ == '__main__':
    main()
