"""Personajes propios de streamlogics: bolitas 3D suaves dibujadas con codigo.
Sin derechos de terceros. Uso: python3 tools/mascotas.py  (escribe en public/media/ejemplos/)"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = "public/media/ejemplos/"
S = 2  # se dibuja al doble y se reduce para suavizar bordes


def grad(w, h, top, bot):
    t = np.linspace(0, 1, h)[:, None, None]
    a = np.array(top)[None, None, :] * (1 - t) + np.array(bot)[None, None, :] * t
    return Image.fromarray(np.repeat(a, w, axis=1).astype("uint8"), "RGB")


def blob(img, cx, cy, rx, ry, col, horns=None, ears=False, mouth="smile", blush=True, arms=False):
    W, H = img.size
    d = ImageDraw.Draw(img, "RGBA")
    # sombra en el suelo
    sh = Image.new("L", img.size, 0)
    ImageDraw.Draw(sh).ellipse([cx - rx * 0.9, cy + ry * 0.86, cx + rx * 0.9, cy + ry * 1.08], fill=110)
    sh = sh.filter(ImageFilter.GaussianBlur(rx * 0.12))
    img.paste(Image.new("RGB", img.size, (20, 40, 34)), (0, 0), sh)
    col = np.array(col, float)
    dark = col * 0.62
    # cuernos / orejas detras del cuerpo
    if horns:
        for s in (-1, 1):
            bx = cx + s * rx * 0.5
            d.polygon([(bx - rx * 0.16, cy - ry * 0.78), (bx + rx * 0.16, cy - ry * 0.84), (bx + s * rx * 0.22, cy - ry * 1.32)], fill=tuple(int(v) for v in horns))
    if ears:
        for s in (-1, 1):
            d.ellipse([cx + s * rx * 0.62 - rx * 0.2, cy - ry * 0.98, cx + s * rx * 0.62 + rx * 0.2, cy - ry * 0.55], fill=tuple(int(v) for v in dark * 1.15))
    if arms:
        for s in (-1, 1):
            d.ellipse([cx + s * rx * 0.92 - rx * 0.16, cy + ry * 0.05, cx + s * rx * 0.92 + rx * 0.16, cy + ry * 0.42], fill=tuple(int(v) for v in dark * 1.2))
    # cuerpo con luz arriba a la izquierda
    yy, xx = np.mgrid[0:H, 0:W]
    nx, ny = (xx - cx) / rx, (yy - cy) / ry
    r2 = nx ** 2 + ny ** 2
    inside = r2 <= 1
    nz = np.sqrt(np.clip(1 - r2, 0, 1))
    L = np.array([-0.45, -0.6, 0.66]); L /= np.linalg.norm(L)
    diff = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    rim = np.clip(1 - nz, 0, 1) ** 3 * 0.25
    shade = 0.5 + 0.62 * diff + rim
    spec = np.clip(diff, 0, 1) ** 40 * 0.55
    body = np.clip(col[None, None, :] * shade[..., None] + 255 * spec[..., None], 0, 255)
    arr = np.array(img).astype(float)
    a = np.clip((1 - r2) * rx * 0.9, 0, 1)[..., None]  # borde suave
    arr = arr * (1 - a) + body * a
    img.paste(Image.fromarray(arr.astype("uint8")))
    d = ImageDraw.Draw(img, "RGBA")
    # ojos
    er = rx * 0.15
    for s in (-1, 1):
        ex, ey = cx + s * rx * 0.3, cy - ry * 0.12
        d.ellipse([ex - er, ey - er * 1.15, ex + er, ey + er * 1.15], fill=(252, 252, 248))
        pr = er * 0.55
        d.ellipse([ex - pr + er * 0.12, ey - pr, ex + pr + er * 0.12, ey + pr * 1.1], fill=(28, 34, 32))
        d.ellipse([ex - pr * 0.1, ey - pr * 0.75, ex + pr * 0.45, ey - pr * 0.2], fill=(255, 255, 255))
    if blush:
        for s in (-1, 1):
            bx, by = cx + s * rx * 0.52, cy + ry * 0.12
            d.ellipse([bx - er * 0.9, by - er * 0.45, bx + er * 0.9, by + er * 0.45], fill=(255, 140, 140, 70))
    w = max(3, int(rx * 0.035))
    if mouth == "smile":
        d.arc([cx - rx * 0.14, cy + ry * 0.04, cx + rx * 0.14, cy + ry * 0.26], 15, 165, fill=(40, 40, 38), width=w)
    elif mouth == "o":
        d.ellipse([cx - rx * 0.06, cy + ry * 0.12, cx + rx * 0.06, cy + ry * 0.26], fill=(60, 30, 34))
    else:
        d.line([cx - rx * 0.1, cy + ry * 0.16, cx + rx * 0.1, cy + ry * 0.16], fill=(40, 40, 38), width=w)
    return img


def make(name, size, bg, col, cy=0.55, scale=0.34, **kw):
    W, H = size[0] * S, size[1] * S
    img = grad(W, H, *bg)
    r = min(W, H) * scale
    blob(img, W / 2, H * cy, r, r * 0.95, col, **kw)
    img = img.resize(size, Image.LANCZOS)
    img.save(OUT + name + ".webp", quality=88)
    return img


SAGE = ((236, 242, 236), (206, 222, 211))
# Tarjetas de clip de la portada (verticales)
make("barba", (400, 700), ((14, 132, 104), (20, 168, 150)), (236, 190, 150), cy=0.48, ears=True)
make("pez", (400, 700), ((196, 140, 208), (138, 108, 196)), (150, 200, 235), cy=0.48, mouth="o")
make("monstruo", (400, 700), ((92, 122, 134), (134, 164, 174)), (168, 140, 196), cy=0.48, horns=(240, 200, 120))
make("peludo", (400, 700), ((155, 134, 107), (185, 166, 142)), (222, 108, 84), cy=0.48, arms=True)
# Escena (streamer) y oferta: el rojo con cuernos, con fondo y recortado
make("rojo", (600, 800), SAGE, (214, 82, 74), cy=0.56, scale=0.36, horns=(60, 60, 64), arms=True)
cut = make("rojo-cut", (600, 800), ((255, 255, 255), (255, 255, 255)), (214, 82, 74), cy=0.56, scale=0.36, horns=(60, 60, 64), arms=True)
a = np.array(cut.convert("RGB")).astype(int)
alpha = (255 - np.clip((a.min(axis=2) - 236) * 14, 0, 255)).astype("uint8")
rgba = Image.fromarray(np.dstack([a.astype("uint8"), alpha]), "RGBA")
rgba.save(OUT + "rojo-cut.webp", quality=90)
# Pasos (retrato), paquetes y flotantes (cuadrados)
make("saludo", (560, 660), ((214, 216, 232), (190, 196, 220)), (120, 150, 220), arms=True)
make("banco", (470, 710), ((120, 210, 220), (240, 170, 140)), (238, 140, 90), ears=True, mouth="line")
make("caja", (460, 460), ((40, 70, 160), (30, 50, 130)), (70, 100, 200), mouth="line", arms=True)
make("oveja", (410, 410), ((120, 160, 180), (90, 130, 150)), (246, 242, 236), ears=True)
make("frijol", (510, 510), ((70, 40, 110), (50, 30, 90)), (110, 210, 170), horns=(240, 196, 40), mouth="line")
make("fideos", (400, 400), ((236, 226, 214), (220, 206, 190)), (240, 150, 80), mouth="o", horns=(240, 150, 80))
make("gota", (300, 300), ((216, 224, 232), (196, 206, 216)), (110, 140, 170), mouth="o")
