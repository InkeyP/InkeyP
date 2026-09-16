"""Rebuild the self-contained SVG headers from the owner's Astro blog.

Requires fonttools[woff]. Usage: python scripts/build-profile.py F:/OneDrive/Astro
No network requests; the blog is read-only. Text becomes paths for portable fonts.
"""

import base64
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

blog = Path(sys.argv[1])
output = Path(__file__).resolve().parents[1] / 'assets'
output.mkdir(exist_ok=True)
latin = TTFont(blog / 'public/fonts/chillax/chillax-600.woff2')


def font_for(char):
    code = ord(char)
    if code in latin.getBestCmap():
        return latin
    raise ValueError(f'Missing glyph: {char}')


def lettering(text, x, y, size, fill, tracking=0):
    result = []
    for char in text:
        font = font_for(char)
        glyphs = font.getGlyphSet()
        glyph = glyphs[font.getBestCmap()[ord(char)]]
        pen = SVGPathPen(glyphs)
        glyph.draw(pen)
        scale = size / font['head'].unitsPerEm
        if pen.getCommands():
            result.append(f'<path d="{pen.getCommands()}" transform="translate({x:.3f} {y}) scale({scale:.6f} {-scale:.6f})" fill="{fill}"/>')
        x += glyph.width * scale + tracking
    return '\n'.join(result)


def data_image(path):
    return 'data:image/webp;base64,' + base64.b64encode(path.read_bytes()).decode()


for theme in ('light', 'dark'):
    dark = theme == 'dark'
    bg, ink, muted, accent = ('#0a0c14', '#f2f5fb', '#cdd3e0', '#91d5e3') if dark else ('#e9edf5', '#171a26', '#3a4054', '#256b83')
    panel = '#121622' if dark else '#ffffff'
    wallpaper = blog / 'public/img' / ('wallpaper-fallback.webp' if dark else 'wallpaper-light.webp')
    words = '\n'.join([
        lettering('Hello, World!', 66, 77, 23, muted),
        lettering("I'm Inkey", 64, 158, 54, ink),
        lettering('CTF Player', 68, 203, 21, muted),
        lettering('Pwn /bin/sh', 68, 260, 19, accent),
        lettering('Heap & Stack Master', 68, 291, 18, muted),
    ])
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="960" height="340" viewBox="0 0 960 340" role="img" aria-labelledby="title desc">
  <title id="title">Hello, World! 👋 I'm Inkey</title>
  <desc id="desc">CTF Player 🚩 · Pwn /bin/sh 💥 · Heap &amp; Stack Master</desc>
  <defs>
    <clipPath id="frame"><rect width="960" height="340" rx="30"/></clipPath>
    <linearGradient id="fade"><stop stop-color="{bg}"/><stop offset=".46" stop-color="{bg}" stop-opacity=".75"/><stop offset="1" stop-color="{bg}" stop-opacity="0"/></linearGradient>
    <linearGradient id="rim" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".85"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".12"/><stop offset="1" stop-color="#ffffff" stop-opacity=".45"/></linearGradient>
    <linearGradient id="avatar-ring" x2="1" y2="1"><stop stop-color="#90d3e0"/><stop offset="1" stop-color="#a4dfc6"/></linearGradient>
    <clipPath id="avatar"><circle cx="394" cy="78" r="24"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="960" height="340" fill="{bg}"/>
    <image x="265" y="-32" width="720" height="405" preserveAspectRatio="xMidYMid slice" xlink:href="{data_image(wallpaper)}"/>
    <rect width="960" height="340" fill="url(#fade)"/>
    <rect x="28" y="24" width="428" height="292" rx="26" fill="{panel}" fill-opacity="{'.64' if dark else '.65'}" stroke="url(#rim)"/>
    <path d="M68 231 H414" stroke="{ink}" stroke-opacity=".12"/>
    <circle cx="394" cy="78" r="28" fill="url(#avatar-ring)"/>
    <image x="370" y="54" width="48" height="48" clip-path="url(#avatar)" xlink:href="{data_image(blog / 'public/img/avatar.webp')}"/>
    {words}
    <g font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif" font-size="22">
      <text x="226" y="77">👋</text>
      <text x="196" y="203">🚩</text>
      <text x="183" y="260">💥</text>
    </g>
  </g>
</svg>
'''
    target = output / f'profile-{theme}.svg'
    target.write_text(svg, encoding='utf-8')
    print(f'{target.name}: {target.stat().st_size:,} bytes')
