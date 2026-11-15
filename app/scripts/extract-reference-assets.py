"""Extract supplied artwork and icons only; no account or transaction UI captures."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/reference'
OUT.mkdir(parents=True, exist_ok=True)
TEMP = Path('C:/Users/cpp/AppData/Local/Temp')
SOURCES = {
    'loan': '46d8ad1b-4a15-4559-add9-26e9336fe25d.png',
    'finance': 'b6324e11-72a0-40b5-85a9-4f74ffa644da.png',
    'home': '72ec5a28-b901-4ed9-99c0-1fc3d0bfcd48.png',
    'profile': '1ff331fd-9e87-48de-862d-8d7b2af10d4f.png',
    'login': '8fde8dfa-0c78-46d2-b254-022e5ff8b6ad.png',
    'account': 'f38e4229-5314-49f5-91c3-aa4b244fea80.png',
    'bill': 'cbce4887-b6db-42fb-9897-fe2ae5274f1d.jpg',
    'loans': '7bffcaf0-896d-4b7e-bb21-92af6aa01bc1.jpg',
    'loan-signed': '8b5890cb-8c3c-4806-8b10-5c99c62be020.jpg',
}
images = {key: Image.open(TEMP / ('codex-clipboard-' + filename)).convert('RGB') for key, filename in SOURCES.items()}
manifest = []

def crop(name, source, box, description, css_width=None):
    asset = images[source].crop(box)
    asset.save(OUT / (name + '.png'))
    manifest.append({
        'name': name,
        'path': '/assets/reference/' + name + '.png',
        'source': 'codex-clipboard-' + SOURCES[source],
        'crop': list(box),
        'dimensions': list(asset.size),
        'description': description,
        **({'suggestedCssWidth': css_width} if css_width else {}),
    })

# Promotional images: artwork text belongs to the original image.
crop('home-hero', 'home', (0, 563, 1290, 1014), 'Primary blue promotional illustration', 430)
crop('home-promotion', 'home', (48, 1727, 1243, 2039), 'Secondary blue promotional banner', 398)
crop('home-civic', 'home', (76, 2184, 1215, 2544), 'Civic services promotion', 380)
crop('loan-creditcard-face', 'loan', (90, 1276, 316, 1415), 'Red credit card face', 76)
crop('loan-creditcard-face-silver', 'loan-signed', (90, 1267, 314, 1406), 'Silver credit card face', 76)
crop('loan-promotion', 'loans', (52, 1875, 1228, 2142), 'Loan record promotional banner', 398)
crop('account-social-card', 'account', (96, 456, 312, 589), 'Social security card artwork', 72)
crop('account-electronic-card', 'account', (96, 924, 312, 1055), 'Electronic account card artwork', 72)
crop('profile-monthly-bill', 'bill', (95, 1957, 1185, 2194), 'Monthly bill decorative banner', 364)
crop('profile-avatar', 'profile', (48, 300, 217, 470), 'Generic profile avatar', 56)
crop('login-avatar', 'login', (554, 365, 736, 547), 'Generic gold login avatar', 60)
crop('profile-avatar-gold', 'login', (554, 365, 736, 547), 'Generic gold login avatar alias', 60)
crop('credit-card-background', 'loan', (553, 1132, 583, 1786), 'Unobstructed red credit promotion texture strip')
crop('login-weibo', 'login', (299, 2556, 388, 2647), 'Weibo sign-in artwork', 30)
crop('login-wechat', 'login', (602, 2556, 691, 2647), 'WeChat sign-in artwork', 30)
crop('login-apple', 'login', (901, 2556, 990, 2647), 'Apple sign-in artwork', 30)

# Source texture strips, captured without system or app text.
crop('loan-top-background', 'loan', (0, 118, 1290, 180), 'Gold header source texture strip')
crop('profile-top-background', 'profile', (0, 116, 1290, 168), 'Red header source texture strip')
crop('finance-top-background', 'finance', (0, 118, 1290, 175), 'Red finance header source texture strip')

# White primary actions from the home header.
for name, box in {
    'scan': (146, 372, 248, 483),
    'pay': (440, 372, 548, 483),
    'travel': (741, 369, 852, 483),
    'wallet': (1041, 375, 1150, 485),
}.items():
    crop('home-' + name, 'home', box, 'Home header action icon', 34)

# Source hand-drawn line icons. Files include the source surface color.
home_icons = {
    'transfer': (105, 1073, 224, 1184),
    'account': (350, 1073, 466, 1184),
    'deposit': (590, 1073, 706, 1184),
    'payment': (833, 1073, 949, 1184),
    'loan': (1074, 1073, 1190, 1184),
    'wealth': (105, 1324, 224, 1432),
    'card': (350, 1324, 466, 1432),
    'outlet': (590, 1324, 706, 1432),
    'activity': (832, 1306, 1000, 1432),
}
for name, box in home_icons.items():
    crop('icon-' + name, 'home', box, 'Home service icon', 36)

loan_icons = {
    'my-loan': (132, 735, 228, 836),
    'loan-card': (369, 735, 457, 822),
    'subsidy': (600, 732, 690, 824),
    'contract': (836, 731, 922, 824),
    'loan-all': (1074, 731, 1164, 824),
    'activate': (686, 1173, 777, 1259),
    'progress': (684, 1407, 779, 1500),
    'recommend': (685, 1642, 778, 1736),
}
for name, box in loan_icons.items():
    crop('icon-' + name, 'loan', box, 'Loan service icon', 30)

finance_icons = {
    'finance-transfer': (99, 395, 218, 508),
    'agency': (347, 395, 467, 508),
    'withdrawal': (593, 395, 710, 508),
    'signing': (837, 395, 955, 508),
    'finance-wealth': (1083, 395, 1203, 508),
    'finance-deposit': (97, 638, 217, 750),
    'debit-application-badge': (347, 621, 508, 749),
    'fund': (591, 646, 707, 750),
    'identity': (836, 644, 953, 747),
    'finance-all': (1083, 644, 1202, 748),
}
for name, box in finance_icons.items():
    crop('icon-' + name, 'finance', box, 'Finance service icon', 37)

# Badge-free aliases for compact service grids.
crop('icon-all', 'finance', finance_icons['finance-all'], 'All services icon without badge', 37)
crop('icon-debit-application', 'loan', loan_icons['loan-card'], 'Bank card icon without badge', 30)
crop('icon-all-badge', 'home', (1082, 1306, 1240, 1432), 'All services icon with complete hot badge', 50)

# Profile account actions and account management service icons.
for name, box in {
    'profile-account': (155, 575, 239, 663),
    'gift': (452, 574, 544, 662),
    'coupon': (748, 573, 831, 661),
    'points': (1043, 574, 1136, 663),
}.items():
    crop('icon-' + name, 'profile', box, 'Profile service icon', 30)
for name, box in {
    'buy-deposit': (154, 1508, 240, 1594),
    'manage-account': (451, 1518, 544, 1594),
    'export-bill': (749, 1518, 842, 1597),
    'social-security': (1043, 1518, 1137, 1595),
}.items():
    crop('icon-' + name, 'account', box, 'Account service icon', 30)

# All bottom navigation artwork is captured without tab text.
for name, source, box in [
    ('home', 'loan', (95, 2564, 163, 2637)),
    ('finance', 'loan', (347, 2563, 427, 2637)),
    ('loan', 'finance', (607, 2565, 683, 2635)),
    ('life', 'loan', (863, 2563, 941, 2641)),
    ('profile', 'loan', (1122, 2563, 1199, 2640)),
    ('home-active', 'home', (69, 2564, 190, 2686)),
    ('finance-active', 'finance', (349, 2564, 426, 2638)),
    ('loan-active', 'loan', (608, 2565, 684, 2638)),
    ('profile-active', 'profile', (1124, 2564, 1200, 2638)),
]:
    crop('nav-' + name, source, box, 'Bottom navigation icon', 26 if name != 'home-active' else 38)

(OUT / 'assets-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

# Compact contact sheet for human inspection; do not use as an app asset.
icons = [entry for entry in manifest if entry['name'].startswith(('icon-', 'nav-'))]
cols, cell_w, cell_h = 8, 150, 150
sheet = Image.new('RGB', (cols * cell_w, ((len(icons) + cols - 1) // cols) * cell_h), '#eee')
draw = ImageDraw.Draw(sheet)
for index, entry in enumerate(icons):
    asset = Image.open(OUT / (entry['name'] + '.png'))
    asset.thumbnail((100, 100))
    x, y = index % cols * cell_w, index // cols * cell_h
    sheet.paste(asset, (x + (cell_w - asset.width) // 2, y + 6))
    draw.text((x + 4, y + 115), entry['name'], fill='#111')
sheet.save(ROOT / 'reference-icons-contact-sheet.png')
print(f'Extracted {len(manifest)} assets into {OUT}')
