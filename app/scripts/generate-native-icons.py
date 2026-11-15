"""Produce launcher density variants from the supplied app icon."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'public/assets/app-icon.png'
image = Image.open(SOURCE).convert('RGB')
res = ROOT / 'android/app/src/main/res'
background = '#ffffff'
outputs = []


def save(img, target):
    img.save(target, optimize=True)
    outputs.append({
        'path': target.relative_to(ROOT).as_posix(),
        'size': list(img.size),
        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    })


for density, scale in [('mdpi', 1), ('hdpi', 1.5), ('xhdpi', 2), ('xxhdpi', 3), ('xxxhdpi', 4)]:
    folder = res / f'mipmap-{density}'
    side = round(48 * scale)
    save(image.resize((side, side), Image.Resampling.LANCZOS), folder / 'ic_launcher.png')

    # Keep the full landscape inside the round launcher mask.
    large = Image.new('RGB', (side * 4, side * 4), background)
    fit = round(side * 4)
    offset = (side * 4 - fit) // 2
    large.paste(image.resize((fit, fit), Image.Resampling.LANCZOS), (offset, offset))
    mask = Image.new('L', large.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, large.width - 1, large.height - 1), fill=255)
    rounded = large.convert('RGBA')
    rounded.putalpha(mask)
    save(rounded.resize((side, side), Image.Resampling.LANCZOS), folder / 'ic_launcher_round.png')

    # A 72dp image keeps the central globe within the adaptive icon safe area.
    canvas_side = round(108 * scale)
    fit = round(72 * scale)
    foreground = Image.new('RGBA', (canvas_side, canvas_side), (0, 0, 0, 0))
    offset = (canvas_side - fit) // 2
    foreground.paste(image.resize((fit, fit), Image.Resampling.LANCZOS).convert('RGBA'), (offset, offset))
    save(foreground, folder / 'ic_launcher_foreground.png')

save(image.resize((1024, 1024), Image.Resampling.LANCZOS),
     ROOT / 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
(res / 'values/ic_launcher_background.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
    f'    <color name="ic_launcher_background">{background}</color>\n</resources>\n', encoding='utf-8')

report = {
    'source': SOURCE.relative_to(ROOT).as_posix(),
    'source_size': list(image.size),
    'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    'adaptive_foreground_dp': 108,
    'adaptive_image_dp': 72,
    'outputs': outputs,
}
(ROOT / 'native-icons-manifest.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')

# Save a native-size visual QA sheet; it is a local validation artifact, not an app asset.
artifacts = ROOT.parent / 'artifacts'
artifacts.mkdir(exist_ok=True)
sheet = Image.new('RGB', (640, 350), '#eeeeee')
draw = ImageDraw.Draw(sheet)
for col, side in enumerate([48, 72, 96, 144]):
    x = col * 160 + (160 - side) // 2
    sheet.paste(image.resize((side, side), Image.Resampling.LANCZOS), (x, 35))
    circle = Image.new('RGBA', (side, side), background)
    fit = side
    circle.paste(image.resize((fit, fit), Image.Resampling.LANCZOS), ((side - fit) // 2,) * 2)
    mask = Image.new('L', (side, side), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, side - 1, side - 1), fill=255)
    circle.putalpha(mask)
    sheet.paste(circle, (x, 190), circle)
    draw.text((col * 160 + 15, 12), f'{side}px / adaptive below', fill='#222222')
sheet.save(artifacts / 'launcher-icons-check.png')
print(json.dumps({'source_sha256': report['source_sha256'], 'generated_icons': len(outputs)}))
