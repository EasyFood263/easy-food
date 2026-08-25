from pathlib import Path
import re

PAGE = Path('app/page.tsx')
TEXT = PAGE.read_text(encoding='utf-8')
PDF_TEXT = Path('/tmp/pbs-table2.txt').read_text(encoding='utf-8', errors='ignore')

names = set()
patterns = [
    r'^(.+?)\s+METROPOLITAN CORPORATION(?:\s*\(.*)?(?:\s+[A-Z][A-Z .-]+ DISTRICT.*)?$',
    r'^(.+?)\s+MUNICIPAL CORPORATION(?:\s*\(.*)?(?:\s+[A-Z][A-Z .-]+ DISTRICT.*)?$',
    r'^(.+?)\s+MC(?:\s+[A-Z][A-Z .-]+ DISTRICT.*)?$',
    r'^(.+?)\s+TC(?:\s+[A-Z][A-Z .-]+ DISTRICT.*)?$',
    r'^(.+?)\s+CANTONMENT(?:\s*\(.*)?(?:\s+[A-Z][A-Z .-]+ DISTRICT.*)?$',
]

for raw in PDF_TEXT.splitlines():
    line = re.sub(r'\s+', ' ', raw).strip()
    if not line or 'DISTRICT MUNICIPAL CORPORATION' in line:
        continue
    for pattern in patterns:
        m = re.match(pattern, line)
        if m:
            name = m.group(1).strip(' -')
            name = re.sub(r'\s*\(Part.*$', '', name).strip()
            name = re.sub(r'\s+(?:MC|TC)$', '', name).strip()
            if 2 <= len(name) <= 80 and not any(x in name for x in ['NAME OF ', 'POPULATION', 'ALL SEXES', 'ANNUAL', 'HOUSEHOLD']):
                names.add(name.title())
            break

# PBS table is an urban-locality register, not a list of only standalone metropolitan cities.
# Keep the official locality names, plus the major city names explicitly identified by PBS.
major = {
    'Abbottabad','Bahawalpur','Faisalabad','Gujranwala','Gujrat','Hyderabad','Islamabad',
    'Jhang','Karachi','Lahore','Larkana','Multan','Okara','Peshawar','Quetta','Rahim Yar Khan',
    'Rawalpindi','Sahiwal','Sargodha','Sheikhupura','Sialkot','Sukkur','Chiniot','Kasur','Mardan',
    'Mirpur Khas','Mingora','Muzaffarabad','Dera Ismail Khan','Dera Ghazi Khan','Turbat','Khuzdar'
}
names.update(major)

cities = sorted(names, key=lambda x: x.casefold())

out = "// Generated from Pakistan Bureau of Statistics Census-2023 Table 2.\n// Do not edit manually; run scripts/sync-pbs-cities.py to refresh.\nexport const pakistanCities = " + repr(cities).replace("'", '"') + " as const;\n"
Path('app/pakistan-cities.ts').write_text(out, encoding='utf-8')

# Make the selector use the generated list instead of the old five-city hardcode.
if "import { pakistanCities } from './pakistan-cities';" not in TEXT:
    TEXT = TEXT.replace("import { useEffect, useMemo, useState } from 'react';", "import { useEffect, useMemo, useState } from 'react';\nimport { pakistanCities } from './pakistan-cities';")
TEXT = re.sub(r"type City='Lahore'\|'Karachi'\|'Islamabad'\|'Rawalpindi'\|'Peshawar';", "type City=string;", TEXT)
TEXT = re.sub(r"const cities:City\[\]=\['Lahore','Karachi','Islamabad','Rawalpindi','Peshawar'\];", "const cities:City[]=pakistanCities as unknown as City[];", TEXT)

# Replace the old modal with a real searchable A-Z selector.
start = TEXT.index('function CityModal(')
end = TEXT.index('function Drawer(', start)
modal = '''function CityModal({choose}:{choose:(c:City)=>void}){\n const [query,setQuery]=useState('');\n const filtered=useMemo(()=>cities.filter(c=>c.toLowerCase().includes(query.trim().toLowerCase())),[query]);\n return <div className="shade"><div className="cityModal"><div className="cityTop"><span className="ef">EF</span><span className="eyebrow">EASY FOOD • PAKISTAN</span></div><h2>Where should we deliver?</h2><p>Select your city or urban locality. Search works across the complete Pakistan Census-2023 locality list.</p><div className="citySearch">⌕<input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search city..."/><span>{filtered.length}</span></div><div className="cityGrid">{filtered.map(c=><button key={c} onClick={()=>choose(c)}>📍 <b>{c}</b><small>Restaurants & delivery</small></button>)}</div>{filtered.length===0&&<div className="empty">No city found. Try another spelling.</div>}</div></div>}\n'''
TEXT = TEXT[:start] + modal + TEXT[end:]
PAGE.write_text(TEXT, encoding='utf-8')

# Add CSS for the centered searchable city selector.
css = PAGE.read_text(encoding='utf-8')
needle = '.cityModal{width:min(620px,92vw);padding:35px}'
replacement = '.cityModal{width:min(760px,94vw);max-height:88vh;overflow:auto;padding:35px}.cityTop{display:flex;align-items:center;gap:10px}.citySearch{height:52px;display:flex;align-items:center;gap:10px;background:#f7f9fc;border:1px solid #dfe6ee;border-radius:13px;padding:0 14px;margin:20px 0}.citySearch input{border:0;outline:0;background:transparent;flex:1;font-size:15px}.citySearch span{font-size:10px;color:var(--muted);background:#fff;border:1px solid var(--line);padding:5px 8px;border-radius:8px}'
css = css.replace(needle, replacement)
PAGE.write_text(css, encoding='utf-8')
print(f'Generated {len(cities)} Pakistan urban localities/cities.')
