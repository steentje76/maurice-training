"""RC0 — Android-app-iconen en splash uit het merkbeeld.

De uitgeleverde Android-resources waren nog de standaard Capacitor-iconen; op het
startscherm en in de Play-listing stond dus niet het Trainingskompas-logo. Dit script
leidt alle Android-resources deterministisch af uit de bestaande merkbestanden in de
repository (icon-512.png en logo-wordmark.png). Er wordt geen nieuw ontwerp gemaakt.
"""
from PIL import Image, ImageDraw
import os

ROOT = os.getcwd()
BRON_ICON = os.path.join(ROOT, 'icon-512.png')
BRON_MARK = os.path.join(ROOT, 'logo-wordmark.png')
RES = os.path.join(ROOT, 'android/app/src/main/res')

def transparant(pad, drempel=242):
    """Maakt de (bijna-)witte achtergrond doorzichtig en snijdt bij tot de inhoud."""
    im = Image.open(pad).convert('RGBA')
    px = im.load()
    b, h = im.size
    for y in range(h):
        for x in range(b):
            r, g, bl, a = px[x, y]
            if r >= drempel and g >= drempel and bl >= drempel:
                px[x, y] = (r, g, bl, 0)
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im

def pas_in(logo, canvas_px, verhouding):
    """Schaalt het logo zodat het binnen `verhouding` van het canvas past, met behoud
    van de beeldverhouding, en centreert het."""
    doel = int(canvas_px * verhouding)
    kopie = logo.copy()
    kopie.thumbnail((doel, doel), Image.LANCZOS)
    laag = Image.new('RGBA', (canvas_px, canvas_px), (0, 0, 0, 0))
    laag.paste(kopie, ((canvas_px - kopie.size[0]) // 2, (canvas_px - kopie.size[1]) // 2), kopie)
    return laag

def afgerond_masker(px, straal_verh=0.18):
    m = Image.new('L', (px, px), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, px - 1, px - 1], radius=int(px * straal_verh), fill=255)
    return m

def rond_masker(px):
    m = Image.new('L', (px, px), 0)
    ImageDraw.Draw(m).ellipse([0, 0, px - 1, px - 1], fill=255)
    return m

logo = transparant(BRON_ICON)
mark = transparant(BRON_MARK)

MIPMAP = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
ACHTERGROND = (255, 255, 255, 255)   # gelijk aan @color/ic_launcher_background

geschreven = []
for dpi, px in MIPMAP.items():
    map_ = os.path.join(RES, 'mipmap-' + dpi)
    os.makedirs(map_, exist_ok=True)

    # 1) klassiek vierkant icoon (API < 26): merkbeeld op een afgeronde witte plaat
    vlak = Image.new('RGBA', (px, px), ACHTERGROND)
    vlak.alpha_composite(pas_in(logo, px, 0.80))
    vlak.putalpha(afgerond_masker(px))
    vlak.save(os.path.join(map_, 'ic_launcher.png')); geschreven.append(map_ + '/ic_launcher.png')

    # 2) rond icoon (launchers die daarom vragen)
    rond = Image.new('RGBA', (px, px), ACHTERGROND)
    rond.alpha_composite(pas_in(logo, px, 0.74))
    rond.putalpha(rond_masker(px))
    rond.save(os.path.join(map_, 'ic_launcher_round.png')); geschreven.append(map_ + '/ic_launcher_round.png')

    # 3) adaptieve voorgrond (API 26+): 108dp-canvas, inhoud binnen de veilige 66dp
    #    (66/108 = 0,61). Doorzichtige achtergrond; de kleur komt uit de adaptive-icon.
    fg_px = int(px * 108 / 48)
    pas_in(logo, fg_px, 0.58).save(os.path.join(map_, 'ic_launcher_foreground.png'))
    geschreven.append(map_ + '/ic_launcher_foreground.png')

# 4) splash — zelfde witte plaat, wordmark gecentreerd, per oriëntatie/dichtheid
SPLASH = {
    'drawable': (480, 320), 'drawable-port-mdpi': (320, 480), 'drawable-port-hdpi': (480, 800),
    'drawable-port-xhdpi': (720, 1280), 'drawable-port-xxhdpi': (960, 1600),
    'drawable-port-xxxhdpi': (1280, 1920), 'drawable-land-mdpi': (480, 320),
    'drawable-land-hdpi': (800, 480), 'drawable-land-xhdpi': (1280, 720),
    'drawable-land-xxhdpi': (1600, 960), 'drawable-land-xxxhdpi': (1920, 1280),
}
for map_naam, (b, h) in SPLASH.items():
    map_ = os.path.join(RES, map_naam)
    os.makedirs(map_, exist_ok=True)
    doek = Image.new('RGBA', (b, h), ACHTERGROND)
    kopie = mark.copy()
    doel = int(min(b, h) * 0.52)
    kopie.thumbnail((doel, doel), Image.LANCZOS)
    doek.paste(kopie, ((b - kopie.size[0]) // 2, (h - kopie.size[1]) // 2), kopie)
    doek.convert('RGB').save(os.path.join(map_, 'splash.png'))
    geschreven.append(map_ + '/splash.png')

print('geschreven bestanden:', len(geschreven))
