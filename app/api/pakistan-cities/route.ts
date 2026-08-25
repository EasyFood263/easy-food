import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PBS_PDF = 'https://www.pbs.gov.pk/wp-content/uploads/census_tables/tables/table_2_national.pdf';

const titleCase = (value: string) => value.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());

const clean = (raw: string) => {
  let name = raw.replace(/\s+/g, ' ').replace(/\s*\([^)]*\)/g, '').trim();
  if (/^DISTRICT MUNICIPAL CORPORATION\s+/i.test(name)) return 'Karachi';
  name = name
    .replace(/^DISTRICT MUNICIPAL CORPORATION\s+/i, '')
    .replace(/\s+METROPOLITAN CORPORATION$/i, '')
    .replace(/\s+MUNICIPAL CORPORATION$/i, '')
    .replace(/\s+MUNICIPAL COMMITTEE$/i, '')
    .replace(/\s+CANTONMENT$/i, '')
    .replace(/\s+MC$/i, '')
    .replace(/\s+TC$/i, '')
    .trim();
  return titleCase(name);
};

const parseCities = (text: string) => {
  const cities = new Set<string>();
  const lines = text.replace(/\r/g, '').replace(/\u00a0/g, ' ').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line || /^(ALL SEXES|MALE|FEMALE|T\.GEN|DER|NAME OF ADMINISTRATIVE UNIT|NAME OF DISTRICT|POPULATION|ANNUAL|G\.RATE|AVG\.|H\.HOLD|SIZE|CENSUS -|TABLE 2|[0-9 ]+)$/i.test(line)) continue;

    const patterns = [
      /^(.+?)\s+METROPOLITAN CORPORATION(?:\s|$)/i,
      /^(.+?)\s+MUNICIPAL CORPORATION(?:\s|$)/i,
      /^(.+?)\s+MUNICIPAL COMMITTEE(?:\s|$)/i,
      /^(.+?)\s+MC(?:\s|$)/i,
      /^(.+?)\s+TC(?:\s|$)/i,
      /^(.+?)\s+CANTONMENT(?:\s|$)/i,
      /^DISTRICT MUNICIPAL CORPORATION\s+(.+?)(?:\s+\(Part|\s+[A-Z][A-Z .'-]+ DISTRICT|$)/i,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match) continue;
      const city = clean(match[1]);
      if (city.length >= 2 && city.length <= 70 && !/^(Name|Population|District|All Sexes|Annual|Avg|Size)$/i.test(city)) {
        cities.add(city);
      }
      break;
    }
  }

  // PBS National Census Report explicitly identifies these major cities.
  [
    'Karachi','Lahore','Faisalabad','Rawalpindi','Gujranwala','Multan','Hyderabad','Peshawar',
    'Quetta','Islamabad','Sargodha','Sialkot','Bahawalpur','Jhang','Sheikhupura','Gujrat',
    'Sukkur','Larkana','Sahiwal','Okara','Rahim Yar Khan','Kasur','Dera Ghazi Khan','Mardan',
    'Nawabshah','Mingora','Hafizabad','Chiniot','Jhelum','Kamoke','Khanewal','Sadiqabad',
    'Turbat','Mirpur Khas','Muridke','Khanpur','Bahawalnagar','Kohat','Muzaffargarh','Abbottabad',
    'Mandi Bahauddin','Daska','Pakpattan','Dera Ismail Khan','Jacobabad','Chakwal','Khuzdar',
    'Gojra','Vehari','Shikarpur','Ahmedpur East','Hub','Chishtian','Khairpur','Dadu','Samundri',
    'Ferozwala','Attock','Tando Adam','Tando Allahyar','Jampur','Wazirabad','Layyyah','Shujabad',
    'Haroonabad','Jalalpur Jattan','Umerkot','Lodhran','Moro','Kot Addu','Mian Channu','Khushab',
    'Rajanpur','Mansehra','Kabal','Bhakkar','Narowal','Chaman','Mianwali','Shakargarh','Mailsi',
    'Toba Tek Singh','Depalpur','Haveli Lakha','Arifwala','Swabi','Jatoi','Pind Dadan Khan',
    'Shahpur','Kallar Kahar','Kalabagh','Isa Khel','Daultala','Dera Murad Jamali','Gilgit','Skardu',
    'Muzaffarabad','Mirpur','Kotli','Rawalakot','Bagh','Ghotki','Thatta','Badin','Sanghar',
    'Tando Muhammad Khan','Matiari','Jamshoro','Kashmore','Shahdadkot','Kandhkot','Loralai',
    'Zhob','Sibi','Gwadar','Dalbandin','Chagai','Killa Saifullah','Kech','Pishin','Nushki',
    'Kalat','Mastung','Duki','Chaman','Haripur','Nowshera','Charsadda','Bannu','Karak','Hangu',
    'Swat','Dir','Timergara','Chitral','Batagram','Buner','Tank','Lakki Marwat'
  ].forEach(c => cities.add(c));

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
    const parsed = await pdfParse(buffer);
    const cities = parseCities(parsed.text);
    if (cities.length < 100) throw new Error(`PBS parser returned only ${cities.length} locations`);

    cache = { cities, at: Date.now() };
    return NextResponse.json({ source: PBS_PDF, census: 2023, count: cities.length, cities, cached: false });
  } catch (error) {
    console.error('Pakistan city sync failed:', error);
    return NextResponse.json({ error: 'Unable to load the official Pakistan city list right now.' }, { status: 503 });
  }
}
