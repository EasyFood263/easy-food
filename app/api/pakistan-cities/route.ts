import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PBS_PDF = 'https://www.pbs.gov.pk/wp-content/uploads/census_tables/tables/table_2_national.pdf';

const cleanCity = (raw: string) => {
  let name = raw.replace(/\s+/g, ' ').replace(/\s*\([^)]*\)/g, '').trim();

  if (/^DISTRICT MUNICIPAL CORPORATION\s+/i.test(name)) return 'Karachi';
  if (/^LAHORE METROPOLITAN CORPORATION/i.test(name)) return 'Lahore';
  if (/^QUETTA METROPOLITAN CORPORATION/i.test(name)) return 'Quetta';
  if (/^HYDERABAD MUNICIPAL CORPORATION/i.test(name)) return 'Hyderabad';

  name = name
    .replace(/\s+METROPOLITAN CORPORATION$/i, '')
    .replace(/\s+MUNICIPAL CORPORATION$/i, '')
    .replace(/\s+MUNICIPAL COMMITTEE$/i, '')
    .replace(/\s+MUNICIPAL CORPORATION$/i, '')
    .replace(/\s+CANTONMENT$/i, '')
    .replace(/\s+MC$/i, '')
    .replace(/\s+TC$/i, '')
    .trim();

  return name.replace(/\s+/g, ' ');
};

const parseCities = (text: string) => {
  const normalized = text.replace(/\r/g, '').replace(/\u00a0/g, ' ');
  const lines = normalized.split('\n').map(x => x.trim()).filter(Boolean);
  const rows: string[] = [];
  let current = '';

  const endPattern = /(?:-|[\d,]+)\s+(?:-|[\d,]+)\s+(?:-|[\d,]+)\s+(?:-|[\d,]+)\s+(?:-|[\d,]+(?:\.\d+)?)\s+(?:-|[\d,]+(?:\.\d+)?)$/;

  for (const line of lines) {
    if (/^(ALL SEXES|MALE|FEMALE|T\.GEN|DER|NAME OF ADMINISTRATIVE UNIT|NAME OF DISTRICT|POPULATION|ANNUAL|G\.RATE|AVG\.|H\.HOLD|SIZE|CENSUS -|500,000 AND ABOVE|200,000 - 499,999|100,000 - 199,999|50,000 - 99,999|25,000 - 49,999|10,000 - 24,999|5,000 - 9,999|BELOW 5,000)$/i.test(line)) continue;
    if (/^\d+\s+\d+\s+\d+/.test(line)) continue;

    current = current ? `${current} ${line}` : line;
    if (endPattern.test(current)) {
      rows.push(current);
      current = '';
    }
  }

  const cities = new Set<string>();
  for (const row of rows) {
    const match = row.match(/^(.*?)\s+(?:-|[\d,]+)\s+(?:-|[\d,]+)\s+(?:-|[\d,]+)\s+(?:-|[\d,]+)\s+(?:-|[\d,]+)\s+(?:-|[\d,]+(?:\.\d+)?)\s+(?:-|[\d,]+(?:\.\d+)?)$/);
    if (!match) continue;

    let prefix = match[1].replace(/\s+/g, ' ').trim();
    const districtIndex = prefix.search(/\s+[A-Z][A-Z .'-]+ DISTRICT(?:\s|$)/);
    if (districtIndex > 0) prefix = prefix.slice(0, districtIndex).trim();
    else prefix = prefix.replace(/\s+[A-Z][A-Z .'-]+ AREA$/i, '').trim();

    const city = cleanCity(prefix);
    if (!city || city.length < 2 || /^(DISTRICT|NAME|POPULATION|TABLE|ALL SEXES)$/i.test(city)) continue;
    cities.add(city.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
  }

  return [...cities].sort((a, b) => a.localeCompare(b, 'en'));
};

let cache: { cities: string[]; at: number } | null = null;

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ source: PBS_PDF, census: 2023, count: cache.cities.length, cities: cache.cities, cached: true });
    }

    const response = await fetch(PBS_PDF, { cache: 'no-store' });
    if (!response.ok) throw new Error(`PBS returned ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    const cities = parseCities(result.text);
    if (cities.length < 100) throw new Error(`PBS parser returned only ${cities.length} city names`);

    cache = { cities, at: Date.now() };
    return NextResponse.json({ source: PBS_PDF, census: 2023, count: cities.length, cities, cached: false });
  } catch (error) {
    console.error('Pakistan city sync failed:', error);
    return NextResponse.json({ error: 'Unable to load the official Pakistan city list right now.' }, { status: 503 });
  }
}
