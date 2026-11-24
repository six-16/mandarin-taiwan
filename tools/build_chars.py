# Régénère chars.js (données de tracé) : npm install hanzi-writer-data, puis python3 tools/build_chars.py
import json
chars = json.load(open('tools/chars.json', encoding='utf-8'))
base = 'node_modules/hanzi-writer-data/'
data = {c: json.load(open(base + c + '.json', encoding='utf-8')) for c in chars}
open('chars.js', 'w', encoding='utf-8').write('window.CHARDATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
