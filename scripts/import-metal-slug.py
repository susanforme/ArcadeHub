"""Extract Unity sprite rectangles. Usage: python3 scripts/import-metal-slug.py <upstream checkout>.
Requires Pillow. Runtime assets are checked in; builds do not need Python/Unity.
"""
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageOps

root = Path(sys.argv[1])
out = Path(__file__).resolve().parents[1] / 'src/games/metal-slug/assets'
sprites = root / 'Assets/Sprites'
records = []


def read_frames(path):
    text = Path(str(path) + '.meta').read_text()
    result = {}
    for block in re.split(r'    - serializedVersion:', text)[1:]:
        name = re.search(r'      name: (.+)', block)
        rect = re.search(r'        x: (.+)\n        y: (.+)\n        width: (.+)\n        height: (.+)', block)
        if name and rect:
            result[name[1]] = tuple(int(float(v)) for v in rect.groups())
    return result


def source(path):
    records.append({'path': str(path.relative_to(root)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    return Image.open(path).convert('RGBA')


# Keep Unity's named animation frames, converting its bottom-left rect origin.
selections = [
    ('marco', 'Characters/Marco/marco.gif', r'(idle_pistol|legs_idle|pistol_walking|legs_walking|fire_pistol|pistol_up|pistol_up_firing|jump_pistol|legs_jump|crouch_idle|crouch_walking|crouch_firing|death_animation|meele_attack|throwing_granate|idle_heavymachine|fire_heavymachine|heavymachine_up)_\d+'),
    ('soldier', 'Characters/Enemies/SimpleSoldier/simpleSoldier.png', r'soldier_(idle|running|attacking|dying)_\d+'),
    ('crab', 'Characters/Enemies/Crab/greencrab.gif', r'greencrab_eating_[1-8]'),
    ('heli', 'Characters/Enemies/Heli/Neo Geo NGCD - Metal Slug 3 - MH-6J Masknell.png', r'.*_[0-5]'),
    ('boss1', 'Characters/Enemies/Boss/HugeErmit/hugeermit.png', r'hugeermit_idle_([1-9]|1[0-2])'),
    ('boss2', 'Characters/Enemies/Boss/Monoeyes/ufo.png', r'ufo_([2-6]|attack_[1-6])'),
    ('boss3', 'Characters/Enemies/Boss/SolDae/Neo Geo NGCD - Metal Slug 3 - Sol Dae Rokker.png', r'(.*_(35|36|37|38|39|40|41)|attack_[1-6])'),
    ('explosion', 'Explosions/EXPLOSIONSANDGRANATE.png', r'(granate_explosion|throw_granate)_\d+'),
]
atlas = Image.new('RGBA', (2048, 4096))
frames = {}
x = y = row = 0
for group, rel, pattern in selections:
    path = sprites / rel
    im = source(path)
    for name, (left, bottom, width, height) in read_frames(path).items():
        if not re.fullmatch(pattern, name):
            continue
        if x + width + 2 > atlas.width:
            x = 0
            y += row + 2
            row = 0
        assert y + height < atlas.height
        atlas.paste(im.crop((left, im.height - bottom - height, left + width, im.height - bottom)), (x, y))
        frames[f'{group}/{name}'] = [x, y, width, height]
        x += width + 2
        row = max(row, height)
atlas.crop((0, 0, 2048, y + row + 2)).save(out / 'actors.png', optimize=True)
(out / 'frames.json').write_text('{\n' + ',\n'.join(f'  {json.dumps(k)}: {json.dumps(v)}' for k, v in frames.items()) + '\n}' + '\n')

maps = [
    ('beach', 'Missions/Mission1/foreground.png', 'foreground_0'),
    ('forest', 'Missions/Mission1/foreground.png', 'foreground_cloud_forest'),
    ('night', 'Missions/Mission2/foreground.png', 'background _2'),
    ('snow', 'Missions/Mission2/foreground.png', 'foreground_0'),
    ('temple', 'Missions/Mission3/Neo Geo NGCD - Metal Slug 3 - Mission 4-4B.png', 'Neo Geo NGCD - Metal Slug 3 - Mission 4-4B_0'),
]
for name, rel, frame in maps:
    path = sprites / rel
    im = source(path)
    left, bottom, width, height = read_frames(path)[frame]
    im.crop((left, im.height - bottom - height, left + width, im.height - bottom)).save(out / f'{name}.png', optimize=True)

# Crop opaque cloud and sand regions for seamless backdrops and ground surfaces.
Image.open(out / 'forest.png').crop((0, 65, 700, 220)).save(out / 'sky.png', optimize=True)
sand = Image.open(out / 'beach.png').crop((700, 180, 956, 221))
ground = Image.new('RGBA', (512, 41))
ground.paste(sand, (0, 0))
ground.paste(ImageOps.mirror(sand), (256, 0))
ground.resize((512, 58), Image.Resampling.NEAREST).save(out / 'sand.png', optimize=True)
source(sprites / 'gemslug-logo.png').save(out / 'cover.png')
for name, original in [('shot', 'mslug3-84-normal-shot'), ('heavy', 'metal-slug-77-heavy-shot'), ('explosion', 'mslu3-grenade-hit'), ('pickup', 'mslug3-93-collectible-grab'), ('death', 'marco-death')]:
    path = root / f'Assets/Audio/Effects/{original}.mp3'
    records.append({'path': str(path.relative_to(root)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    shutil.copyfile(path, out / f'{name}.mp3')
shutil.copyfile(root / 'README.md', out / 'UPSTREAM-README.md')
(out / 'SOURCE.json').write_text(json.dumps({
    'repository': 'https://github.com/giacoballoccu/MetalSlugClone',
    'commit': subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True).strip(),
    'license': 'No root license file provided by upstream. Original game artwork/audio retain their respective owners rights.',
    'conversion': 'Unity sprite rectangles cropped and packed, GIF transparency preserved; C# gameplay rewritten in TypeScript.',
    'files': list({v['path']: v for v in records}.values()),
}, indent=2) + '\n')
print(f'Extracted {len(frames)} actor frames and {len(maps)} backgrounds')
