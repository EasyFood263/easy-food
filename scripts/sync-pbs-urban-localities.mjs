import fs from 'node:fs/promises';
import pdf from 'pdf-parse';

const SOURCE = 'https://www.pbs.gov.pk/wp-content/uploads/census_tables/tables/table_2_national.pdf';
const OUT = new URL('../data/pakistan-urban-localities.json', import.meta.url);

function cleanName(value) {
  return value
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(MUNICIPAL CORPORATION|METROPOLITAN CORPORATION|MUNICIPAL COMMITTEE|MUNICIPAL COMMITTEE|MC|TC|CANTONMENT|CORPORATION)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^DISTRICT MUNICIPAL CORPORATION\s+/i, '')
    .replace(/^DISTRICT\s+/i, '')
    .replace(/\s+DISTRICT$/i, '')
    .replace(/\s+CANTONMENT$/i, '')
    .trim();
}

const response = await fetch(SOURCE, { headers: { 'user-agent': 'EasyFood PBS city sync/1.0' } });
if (!response.ok) throw new Error(`PBS download failed: ${response.status}`);
const data = await pdf(Buffer.from(await response.arrayBuffer()));
const lines = data.text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
const found = new Set();
let carry = '';

for (const line of lines) {
  const numeric = /\d[\d,]*\s+\d[\d,]*\s+\d[\d,]*/.test(line);
  const hasDistrict = /DISTRICT\b/i.test(line);
  if (!numeric && !hasDistrict && !/^\d/.test(line)) {
    carry = `${carry} ${line}`.trim();
    continue;
  }
  if (!numeric) continue;

  const candidate = `${carry} ${line}`.replace(/\s+/g, ' ').trim();
  carry = '';
  const beforeNumbers = candidate.split(/\s+\d[\d,]*/)[0];
  const districtAt = beforeNumbers.toUpperCase().lastIndexOf(' DISTRICT');
  const raw = districtAt > 0 ? beforeNumbers.slice(0, districtAt) : beforeNumbers;
  const name = cleanName(raw);
  if (!name || name.length < 2) continue;
  if (/^(ALL SEXES|NAME OF ADMINISTRATIVE UNIT|POPULATION|SIZE|AND ABOVE|DISTRICT)$/i.test(name)) continue;
  found.add(name);
}

const cities = [...found].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
if (cities.length < 500) throw new Error(`PBS sync produced only ${cities.length} localities; refusing to publish an incomplete city list.`);
await fs.mkdir(new URL('../data/', import.meta.url), { recursive: true });
await fs.writeFile(OUT, JSON.stringify({ source: SOURCE, census: '2023', count: cities.length, cities }, null, 2));
console.log(`Easy Food: synced ${cities.length} PBS 2023 urban localities.`);
