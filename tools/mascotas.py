"""Personajes propios de streamlogics, dibujados con codigo (sin derechos de terceros).

Mismo arte que las inspiraciones (3D tierno de peluche, arcilla y vidrio), pero
disenos nuevos. Cada pieza se dibuja plana y se "infla" con su mascara difuminada,
asi sale volumen 3D de cualquier forma. El peluche lleva pelo con ruido.

Uso: python3 tools/mascotas.py   (escribe en public/media/ejemplos/)
"""
import numpy as np
from PIL import Image, ImageDraw

OUT = "public/media/ejemplos/"
RNG = np.random.default_rng(7)
LIGHT = np.array([-0.5, -0.65, 0.58]); LIGHT /= np.linalg.norm(LIGHT)


def blur(a, s):
    """Desenfoque gaussiano con FFT (sin scipy)."""
    h, w = a.shape
    fy, fx = np.fft.fftfreq(h)[:, None], np.fft.fftfreq(w)[None, :]
    g = np.exp(-2 * (np.pi * s) ** 2 * (fx ** 2 + fy ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g))


def bg(w, h, top, bot):
    t = np.linspace(0, 1, h)[:, None, None]
    c = np.array(top, float) * (1 - t) + np.array(bot, float) * t
    img = np.repeat(c, w, axis=1)
    # vineta suave de estudio
    yy, xx = np.mgrid[0:h, 0:w]
    v = 1 - 0.18 * (((xx - w / 2) / w) ** 2 + ((yy - h * 0.45) / h) ** 2) * 2.2
    return img * v[..., None]


class Pic:
    def __init__(self, w, h, top, bot):
        self.w, self.h = w, h
        self.px = bg(w, h, top, bot)

    def mask(self, draw_fn):
        m = Image.new("L", (self.w, self.h), 0)
        draw_fn(ImageDraw.Draw(m))
        return np.asarray(m, float) / 255

    def shadow(self, cx, cy, rx, ry, k=0.35):
        m = self.mask(lambda d: d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255))
        m = blur(m, rx * 0.18)
        self.px *= (1 - k * np.clip(m, 0, 1))[..., None]

    def part(self, draw_fn, color, puff=None, fur=0.0, gloss=0.08, glass=False, grain=0.0):
        m = self.mask(draw_fn)
        if m.max() == 0:
            return
        area = m.sum() ** 0.5
        puff = puff or area * 0.16
        hgt = blur(m, puff)
        gy, gx = np.gradient(hgt)
        k = puff * 2.2
        n = np.dstack([-gx * k, -gy * k, np.ones_like(hgt)])
        n /= np.linalg.norm(n, axis=2, keepdims=True)
        diff = np.clip(n @ LIGHT, 0, 1)
        nz = n[..., 2]
        col = np.array(color, float)
        # luz difusa + rebote calido + sombra en los bordes (oclusion)
        shade = 0.42 + 0.7 * diff
        ao = np.clip(blur(m, puff * 0.5) * 1.15, 0, 1) ** 0.6
        rim = (1 - nz) ** 2.5 * 0.35
        c = col[None, None, :] * (shade * (0.78 + 0.22 * ao))[..., None]
        c += np.array([255, 236, 220]) * rim[..., None] * 0.35
        refl = np.array([0, 0, 1.0]) - 2 * nz[..., None] * n * -1  # brillo especular aproximado
        spec = np.clip(n @ (LIGHT + np.array([0, 0, 1])) / np.linalg.norm(LIGHT + np.array([0, 0, 1])), 0, 1)
        c += 255 * (spec ** (60 if glass else 28) * gloss)[..., None]
        alpha = m.copy()
        if fur > 0:
            # pelo: ruido fino estirado; rompe el borde y da textura
            noise = RNG.random((self.h, self.w))
            strands = blur(noise, 0.7) - blur(noise, 3)
            strands = strands / (np.abs(strands).max() + 1e-6)
            c *= (1 + strands * 0.5 * fur)[..., None]
            soft = blur(m, 2.5 + 6 * fur)
            alpha = np.clip((soft - 0.5) * 3 + 0.5 + strands * 0.9 * fur, 0, 1)
        if grain:
            c *= (1 + (RNG.random((self.h, self.w)) - 0.5) * grain)[..., None]
        if glass:
            alpha = alpha * (0.55 + 0.45 * (1 - nz) ** 1.2)
            c = c * 0.6 + self.px * 0.4 * (1 + diff[..., None] * 0.3)
        a = alpha[..., None]
        self.px = self.px * (1 - a) + np.clip(c, 0, 255) * a

    def eyes(self, cx, cy, r, gap, look=(0.15, 0.05), lids=0.0, lid_col=None):
        for s in (-1, 1):
            ex = cx + s * gap
            self.part(lambda d: d.ellipse([ex - r, cy - r * 1.08, ex + r, cy + r * 1.08], fill=255), (246, 246, 242), puff=r * 0.5, gloss=0.5, glass=False)
            pr = r * 0.48
            px, py = ex + look[0] * r, cy + look[1] * r
            self.part(lambda d: d.ellipse([px - pr, py - pr, px + pr, py + pr], fill=255), (24, 26, 28), puff=pr * 0.4, gloss=0.2)
            hr = pr * 0.32
            self.part(lambda d: d.ellipse([px - pr * 0.5 - hr, py - pr * 0.5 - hr, px - pr * 0.5 + hr, py - pr * 0.5 + hr], fill=255), (255, 255, 255), puff=1)
            if lids:
                y2 = cy - r * 1.1 + 2 * r * 1.08 * lids
                self.part(lambda d: d.chord([ex - r * 1.06, cy - r * 1.16, ex + r * 1.06, cy + r * 1.16], 180, 360, fill=255) if lids >= 0.5 else d.rectangle([0, 0, 0, 0]), lid_col or (120, 120, 120), puff=r * 0.4)

    def line(self, pts, color, width, curve=None):
        m = Image.new("L", (self.w, self.h), 0)
        d = ImageDraw.Draw(m)
        if curve:
            d.arc(curve[0], curve[1], curve[2], fill=255, width=width)
        else:
            d.line(pts, fill=255, width=width, joint="curve")
        a = blur(np.asarray(m, float) / 255, 0.8)[..., None]
        self.px = self.px * (1 - a) + np.array(color, float) * a

    def save(self, name, size=None, alpha_from_bg=None):
        img = Image.fromarray(np.clip(self.px, 0, 255).astype("uint8"))
        if size:
            img = img.resize(size, Image.LANCZOS)
        img.save(OUT + name + ".webp", quality=88)
        return img


def ell(cx, cy, rx, ry):
    return lambda d: d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)


def rrect(x0, y0, x1, y1, r):
    return lambda d: d.rounded_rectangle([x0, y0, x1, y1], r, fill=255)


def poly(*pts):
    return lambda d: d.polygon(list(pts), fill=255)


# ═══ Personajes ═══ (se dibujan al doble y se reducen)

def peluche_lila(name, W=800, H=1400, bgc=((92, 122, 134), (134, 164, 174))):
    """Monstruito lila de peluche con cuernos (estilo peluche, diseno propio)."""
    p = Pic(W, H, *bgc)
    cx, cy, r = W / 2, H * 0.52, W * 0.3
    p.shadow(cx, cy + r * 1.05, r * 0.85, r * 0.16)
    for s in (-1, 1):
        p.part(poly((cx + s * r * 0.45, cy - r * 0.62), (cx + s * r * 0.82, cy - r * 0.78), (cx + s * r * 0.95, cy - r * 1.25)), (236, 176, 96), puff=r * 0.08, gloss=0.15)
    for s in (-1, 1):
        p.part(ell(cx + s * r * 0.32, cy + r * 0.98, r * 0.2, r * 0.12), (150, 120, 180), fur=0.6)
    p.part(ell(cx, cy, r, r * 0.98), (164, 136, 198), fur=1.0)
    p.eyes(cx, cy - r * 0.12, r * 0.2, r * 0.3)
    p.line(None, (60, 40, 70), 6, curve=([cx - r * 0.13, cy + r * 0.1, cx + r * 0.13, cy + r * 0.3], 20, 160))
    return p


def peluche_rojo(name, W=800, H=1400, bgc=((155, 134, 107), (185, 166, 142)), wave=True):
    """Peluche rojo alargado con panza clara que saluda."""
    p = Pic(W, H, *bgc)
    cx, cy, rx, ry = W / 2, H * 0.55, W * 0.26, W * 0.36
    p.shadow(cx, cy + ry * 1.0, rx * 0.9, rx * 0.16)
    for s in (-1, 1):
        p.part(rrect(cx + s * rx * 0.25 - 10, cy - ry * 1.3, cx + s * rx * 0.25 + 10, cy - ry * 0.8, 10), (60, 40, 40), puff=6)
    p.part(ell(cx - rx * 1.0, cy + ry * 0.1, rx * 0.2, rx * 0.34), (206, 92, 74), fur=0.7)
    if wave:
        p.part(ell(cx + rx * 1.05, cy - ry * 0.45, rx * 0.2, rx * 0.36), (206, 92, 74), fur=0.7)
    p.part(ell(cx, cy, rx, ry), (214, 98, 78), fur=0.9)
    p.part(ell(cx, cy + ry * 0.35, rx * 0.62, ry * 0.5), (238, 222, 200), fur=0.9)
    p.eyes(cx, cy - ry * 0.35, rx * 0.17, rx * 0.3)
    p.line(None, (70, 30, 30), 6, curve=([cx - rx * 0.4, cy - ry * 0.25, cx + rx * 0.4, cy + ry * 0.0], 20, 160))
    return p


def peluche_rojo_alto(W=800, H=1000, bgc=((236, 242, 236), (206, 222, 211))):
    """Monstruo rojo peludo alto con cuernos oscuros y cara clara (protagonista de /MONSTER)."""
    p = Pic(W, H, *bgc)
    cx, cy, rx, ry = W / 2, H * 0.56, W * 0.3, H * 0.34
    p.shadow(cx, cy + ry * 1.0, rx * 0.85, rx * 0.14)
    for s in (-1, 1):
        p.part(poly((cx + s * rx * 0.35, cy - ry * 0.8), (cx + s * rx * 0.7, cy - ry * 0.72), (cx + s * rx * 0.95, cy - ry * 1.12)), (50, 50, 56), puff=8, gloss=0.2)
        p.part(ell(cx + s * rx * 0.35, cy + ry * 0.98, rx * 0.16, rx * 0.08), (90, 40, 40), fur=0.4)
        p.part(ell(cx + s * rx * 0.98, cy + ry * 0.15, rx * 0.16, rx * 0.4), (190, 64, 58), fur=1.0)
    p.part(ell(cx, cy, rx, ry), (200, 70, 62), fur=1.2)
    p.part(ell(cx, cy - ry * 0.3, rx * 0.42, ry * 0.26), (240, 222, 206), puff=rx * 0.1, grain=0.08)
    p.eyes(cx, cy - ry * 0.32, rx * 0.08, rx * 0.13, look=(0, 0))
    return p


def vidrio_pez(W=800, H=1400, bgc=((206, 150, 216), (138, 108, 196))):
    """Pez de vidrio con ojo grande (estilo vidrio, diseno propio)."""
    p = Pic(W, H, *bgc)
    cx, cy, r = W / 2, H * 0.5, W * 0.3
    p.shadow(cx, cy + r * 1.25, r * 0.7, r * 0.1, k=0.2)
    p.part(poly((cx - r * 0.9, cy), (cx - r * 1.5, cy - r * 0.45), (cx - r * 1.4, cy + r * 0.4)), (190, 120, 200), puff=r * 0.1, glass=True, gloss=0.4)
    p.part(ell(cx, cy, r, r * 0.9), (170, 200, 236), glass=True, gloss=0.6)
    p.part(ell(cx + r * 0.1, cy + r * 0.35, r * 0.75, r * 0.45), (210, 150, 200), puff=r * 0.2, gloss=0.1)
    p.part(ell(cx - r * 0.2, cy + r * 0.1, r * 0.3, r * 0.18), (150, 150, 220), puff=r * 0.08, glass=True, gloss=0.4)
    p.eyes(cx + r * 0.35, cy - r * 0.15, r * 0.3, 0, look=(0.35, -0.1))
    for i, (bx, by, br) in enumerate([(cx + r * 0.9, cy - r * 1.1, r * 0.1), (cx + r * 1.1, cy - r * 1.4, r * 0.06)]):
        p.part(ell(bx, by, br, br), (220, 220, 250), glass=True, gloss=0.8)
    return p


def arcilla(name_col, W, H, bgc, body, shape="bean", horns=None, stripes=None, lids=0.0, ears=False, arms=None, hair=None):
    """Personaje de arcilla mate (forma de frijol, caja o gota)."""
    p = Pic(W, H, *bgc)
    cx, cy = W / 2, H * 0.53
    r = min(W, H) * 0.3
    p.shadow(cx, cy + r * 1.05, r * 0.85, r * 0.14)
    if horns:
        for s in (-1, 1):
            hx = cx + s * r * 0.85
            p.part(lambda d, hx=hx, s=s: d.line([(hx, cy - r * 0.3), (hx + s * r * 0.4, cy - r * 0.6), (hx + s * r * 0.35, cy - r * 1.05)], fill=255, width=int(r * 0.22), joint="curve"), horns, puff=r * 0.08, gloss=0.2)
            if stripes:
                for t in (0.35, 0.65):
                    sx = hx + s * r * 0.4 * t * 1.6
                    p.part(ell(min(sx, hx + s * r * 0.4), cy - r * 0.3 - r * 0.3 * t * 1.6, r * 0.12, r * 0.06), stripes, puff=r * 0.03)
    if ears:
        for s in (-1, 1):
            p.part(ell(cx + s * r * 0.7, cy - r * 0.75, r * 0.22, r * 0.18), tuple(v * 0.9 for v in body), puff=r * 0.08)
    if arms:
        for s in (-1, 1):
            p.part(rrect(cx + s * r * 0.95 - r * 0.12, cy - r * 0.05, cx + s * r * 0.95 + r * 0.12, cy + r * 0.75, r * 0.12), arms, puff=r * 0.06, grain=0.06)
    for s in (-1, 1):
        p.part(rrect(cx + s * r * 0.35 - r * 0.1, cy + r * 0.6, cx + s * r * 0.35 + r * 0.1, cy + r * 1.05, r * 0.08), tuple(v * 0.85 for v in body), puff=r * 0.05)
    if shape == "box":
        p.part(rrect(cx - r, cy - r * 0.8, cx + r, cy + r * 0.75, r * 0.45), body, puff=r * 0.28, grain=0.05, gloss=0.06)
    elif shape == "drop":
        p.part(lambda d: (d.ellipse([cx - r * 0.75, cy - r * 0.45, cx + r * 0.75, cy + r * 0.9], fill=255), d.polygon([(cx - r * 0.55, cy - r * 0.1), (cx + r * 0.55, cy - r * 0.1), (cx, cy - r * 1.05)], fill=255)), body, puff=r * 0.3, grain=0.05)
    else:
        p.part(lambda d: d.ellipse([cx - r, cy - r * 0.85, cx + r * 0.95, cy + r * 0.8], fill=255), body, puff=r * 0.3, grain=0.05, gloss=0.1)
    if hair:
        for i in range(-5, 6):
            a = i * 0.16
            x0, y0 = cx + np.sin(a) * r * 0.4, cy - r * 0.7
            p.part(lambda d, x0=x0, y0=y0, a=a: d.line([(x0, y0), (x0 + np.sin(a) * r * 0.7, y0 - np.cos(a) * r * 0.7)], fill=255, width=int(r * 0.12)), hair, puff=r * 0.04, gloss=0.12)
    lid = tuple(v * 0.92 for v in body) if lids else None
    p.eyes(cx, cy - r * 0.15, r * 0.2, r * 0.38, lids=lids, lid_col=lid)
    p.line(None, (40, 40, 40), max(4, int(r * 0.03)), curve=([cx - r * 0.12, cy + r * 0.1, cx + r * 0.12, cy + r * 0.28], 20, 160))
    return p


def oveja(W=820, H=820, bgc=((120, 160, 180), (86, 126, 148))):
    """Bolita de lana flotando (peluche blanco, diseno propio)."""
    p = Pic(W, H, *bgc)
    cx, cy, r = W / 2, H * 0.48, W * 0.3
    p.shadow(cx, cy + r * 1.35, r * 0.6, r * 0.08, k=0.18)
    for s in (-0.45, -0.15, 0.2, 0.5):
        p.part(rrect(cx + s * r - r * 0.09, cy + r * 0.7, cx + s * r + r * 0.09, cy + r * 1.1, r * 0.09), (232, 212, 196), fur=0.4)
    p.part(ell(cx, cy, r, r * 0.88), (244, 240, 234), fur=1.4)
    p.part(ell(cx + r * 0.55, cy - r * 0.15, r * 0.36, r * 0.32), (236, 214, 198), puff=r * 0.12, grain=0.1)
    for s in (-1, 1):
        p.part(ell(cx + r * 0.55 + s * r * 0.38, cy - r * 0.48, r * 0.16, r * 0.1), (232, 206, 190), puff=r * 0.05)
    for s in (-1, 1):
        p.part(ell(cx + r * 0.55 + s * r * 0.13, cy - r * 0.22, r * 0.04, r * 0.05), (30, 30, 30), puff=2)
    return p


def caja_azul(W=920, H=920):
    return arcilla(None, W, H, ((44, 74, 166), (30, 50, 128)), (72, 104, 204), shape="box", lids=0.55, arms=(236, 176, 50), horns=None)


def run():
    peluche_rojo_alto().save("rojo", (600, 750))
    # version recortada para la escena y la oferta: mismo dibujo sobre fondo plano y mascara por color
    q = peluche_rojo_alto(bgc=((0, 255, 0), (0, 255, 0)))
    img = Image.fromarray(np.clip(q.px, 0, 255).astype("uint8")).resize((600, 750), Image.LANCZOS)
    a = np.asarray(img).astype(int)
    green = (a[..., 1] - np.maximum(a[..., 0], a[..., 2]))
    alpha = np.clip(255 - (green - 40) * 3, 0, 255).astype("uint8")
    rgb = a.copy(); rgb[..., 1] = np.minimum(rgb[..., 1], np.maximum(rgb[..., 0], rgb[..., 2]) + 30)
    Image.fromarray(np.dstack([rgb.astype("uint8"), alpha]), "RGBA").save(OUT + "rojo-cut.webp", quality=90)

    peluche_lila("monstruo").save("monstruo", (400, 700))
    peluche_rojo("peludo").save("peludo", (400, 700))
    vidrio_pez().save("pez", (400, 700))
    arcilla(None, 800, 1400, ((14, 132, 104), (20, 168, 150)), (232, 196, 160), shape="bean", ears=True, hair=(244, 244, 240)).save("barba", (400, 700))
    arcilla(None, 1120, 1320, ((214, 216, 232), (186, 192, 218)), (120, 150, 224), shape="bean", arms=(110, 140, 214)).save("saludo", (560, 660))
    arcilla(None, 940, 1420, ((120, 210, 220), (240, 176, 146)), (240, 150, 96), shape="drop", hair=(232, 120, 70)).save("banco", (470, 710))
    caja_azul().save("caja", (460, 460))
    oveja().save("oveja", (410, 410))
    arcilla(None, 1020, 1020, ((70, 40, 110), (48, 28, 90)), (110, 210, 168), shape="bean", horns=(84, 60, 140), stripes=(240, 196, 40)).save("frijol", (510, 510))
    arcilla(None, 800, 800, ((236, 226, 214), (220, 206, 190)), (240, 156, 90), shape="drop", hair=(226, 112, 60)).save("fideos", (400, 400))
    arcilla(None, 600, 600, ((216, 224, 232), (196, 206, 216)), (110, 142, 176), shape="drop").save("gota", (300, 300))


if __name__ == "__main__":
    run()
