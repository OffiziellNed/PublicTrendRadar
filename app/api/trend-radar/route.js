import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
export const dynamic = 'force-dynamic';

// 9 MENU - SESUAI REQUEST TERBARU
const TOPIC_QUERIES = {
  jakarta: 'Jakarta',
  nasional: 'berita nasional Indonesia',
  bencana: 'bencana alam OR gempa bumi OR banjir',
  pdip: 'PDI Perjuangan',
  megawati: 'Megawati Soekarnoputri',
  puan: 'Puan Maharani',
  kritik_publik: 'kritik pemerintah OR kritik kebijakan OR kritik politik OR kritik sosial OR protes kebijakan pemerintah',
  dedi_mulyadi: 'Dedi Mulyadi OR KDM OR Gubernur Jawa Barat OR Gubernur Jabar',
  keluarga_jokowi: 'Jokowi OR Joko Widodo OR Gibran Rakabuming OR Bobby Nasution OR Kahiyang Ayu OR Kaesang Pangarep OR Keluarga Jokowi OR PSI Kaesang',
};

const TOPIC_META = {
  jakarta: { title: 'Jakarta', icon: '🏙️' },
  nasional: { title: 'Berita Nasional', icon: '📰' },
  bencana: { title: 'Bencana Terkini', icon: '🌋' },
  pdip: { title: 'PDI Perjuangan', icon: '🐂' },
  megawati: { title: 'Megawati Soekarnoputri', icon: '👩‍🦳' },
  puan: { title: 'Puan Maharani', icon: '👩‍💼' },
  kritik_publik: { title: 'Kritik Publik', icon: '📢' },
  dedi_mulyadi: { title: 'Dedi Mulyadi / KDM', icon: '🌾' },
  keluarga_jokowi: { title: 'Keluarga Jokowi', icon: '👨‍👩‍👧‍👦' },
};

function getCleanLink(raw) {
  try {
    if (!raw) return '#';
    if (typeof raw === 'string' && raw.startsWith('http')) return raw.replace(/&amp;/g, '&').trim();
    const str = JSON.stringify(raw);
    const m = str.match(/https?:\/\/[^\s"'\\]+/);
    if (m) return m[0].replace(/\\"/g, '').replace(/&amp;/g, '&').replace(/["']+$/, '');
  } catch {}
  return '#';
}
function formatTimeAgo(minutes) {
  if (minutes < 60) return `${minutes}m lalu`;
  if (minutes < 1440) return `${Math.floor(minutes/60)}j lalu`;
  return `${Math.floor(minutes/1440)}h lalu`;
}

// FILTER KETAT PER MENU
function isRelevant(title, topicId) {
  const t = title.toLowerCase();

  if (topicId === 'megawati') {
    return (
      t.includes('megawati') ||
      t.includes('ketua umum pdi perjuangan') ||
      t.includes('ketum pdi perjuangan') ||
      t.includes('ketua umum pdip') ||
      t.includes('ketum pdip') ||
      t.includes('ketua umum pdi') ||
      t.includes('ketum pdi') ||
      t.includes('bu mega') ||
      (t.includes('ketum') && (t.includes('pdi') || t.includes('pdip'))) ||
      (t.includes('ketua umum') && (t.includes('pdi') || t.includes('pdip')))
    );
  }
  if (topicId === 'puan') {
    return t.includes('puan') || t.includes('puan maharani');
  }
  if (topicId === 'pdip') {
    return t.includes('pdip') || t.includes('pdi perjuangan') || t.includes('pdi-p') || t.includes('pdi p');
  }
  if (topicId === 'jakarta') {
    return t.includes('jakarta') || t.includes('dki');
  }
  if (topicId === 'bencana') {
    return t.includes('gempa') || t.includes('banjir') || t.includes('bencana') || t.includes('erupsi') || t.includes('longsor') || t.includes('tsunami') || t.includes('meletus') || t.includes('bmkg') || t.includes('bnpb');
  }
  if (topicId === 'kritik_publik') {
    const hasKritik = t.includes('kritik') || t.includes('kecam') || t.includes('protes') || t.includes('soroti') || t.includes('desak') || t.includes('pertanyakan');
    const hasTarget = t.includes('pemerintah') || t.includes('kebijakan') || t.includes('politik') || t.includes('sosial') || t.includes('negara') || t.includes('publik') || t.includes('rakyat') || t.includes('menteri') || t.includes('dpr') || t.includes('presiden') || t.includes('pejabat');
    return hasKritik && hasTarget;
  }
  if (topicId === 'dedi_mulyadi') {
    return (
      t.includes('dedi mulyadi') ||
      t.includes('kdm') ||
      t.includes('gubernur jawa barat') ||
      t.includes('gubernur jabar') ||
      (t.includes('gubernur') && (t.includes('jawa barat') || t.includes('jabar') || t.includes('kdm'))) ||
      t.includes('kang dedi')
    );
  }
  if (topicId === 'keluarga_jokowi') {
    return (
      t.includes('jokowi') ||
      t.includes('joko widodo') ||
      t.includes('gibran') ||
      t.includes('bobby nasution') ||
      t.includes('bobby') && t.includes('nasution') ||
      t.includes('kahiyang') ||
      t.includes('kaesang') ||
      t.includes('keluarga jokowi') ||
      t.includes('anak jokowi') ||
      t.includes('jan ethes') ||
      (t.includes('wakil presiden') && (t.includes('gibran') || t.includes('jokowi'))) ||
      (t.includes('wapres') && (t.includes('gibran') || t.includes('jokowi'))) ||
      (t.includes('psi') && (t.includes('kaesang') || t.includes('jokowi') || t.includes('gibran'))) ||
      t.includes('psi') // sesuai request lo: PSI masuk Keluarga Jokowi
    );
  }
  return true;
}

async function fetchGoogleNewsRSS(topicId, hours) {
  const baseQuery = TOPIC_QUERIES[topicId] || topicId;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(baseQuery + ` when:${hours}h`)}&hl=id&gl=ID&ceid=ID:id`;
  try {
    const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 60 }, cache: 'no-store' });
    if (!res.ok) throw new Error('RSS fail');
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items = [];
    $('item').each((i, el) => {
      const titleFull = $(el).find('title').text() || '';
      const linkRaw = $(el).find('link').text() || '';
      const pubDateStr = $(el).find('pubDate').text() || '';
      const source = $(el).find('source').text() || titleFull.split(' - ').pop() || 'Google News';
      const pubDate = new Date(pubDateStr);
      const minutesAgo = isNaN(pubDate.getTime()) ? 9999 : Math.floor((Date.now() - pubDate.getTime()) / 60000);
      if (minutesAgo > hours * 60 + 60) return;
      const cleanTitle = titleFull.split(' - ')[0] || titleFull;
      if (!isRelevant(cleanTitle, topicId)) return;
      items.push({
        id: `${topicId}-${i}`,
        source: source.trim().slice(0, 30),
        time: formatTimeAgo(minutesAgo),
        minutesAgo,
        title: cleanTitle,
        url: getCleanLink(linkRaw),
        link: getCleanLink(linkRaw),
      });
    });
    items.sort((a,b) => a.minutesAgo - b.minutesAgo);
    return items.slice(0,200);
  } catch (e) { return []; }
}

async function fetchBMKG() {
  try {
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { next: { revalidate: 60 } });
    const json = await res.json();
    const info = json?.Infogempa?.gempa;
    if (!info) return null;
    return { id: 'bmkg-1', source: 'BMKG', time: 'Baru saja', minutesAgo: 0, title: `Gempa M ${info.Magnitude} ${info.Wilayah}`, url: 'https://www.bmkg.go.id', link: 'https://www.bmkg.go.id', isBMKG: true };
  } catch { return null; }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filterRaw = searchParams.get('filter') || '1 Jam';
  let hours = 1;
  if (filterRaw.includes('1')) hours = 1;
  else if (filterRaw.includes('6')) hours = 6;
  else if (filterRaw.includes('24')) hours = 24;

  const bmkgLive = await fetchBMKG();
  // URUTAN SESUAI REQUEST: 6 LAMA DI ATAS, 3 BARU DI BAWAH PDI, MEGA, PUAN
  const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi'];

  const results = await Promise.all(topicOrder.map(async (id) => {
    let headlines = await fetchGoogleNewsRSS(id, hours);
    if (id === 'bencana' && bmkgLive) {
      headlines = [bmkgLive, ...headlines.filter(h => !h.isBMKG)].slice(0,200);
    }
    if (headlines.length === 0 && id === 'bencana' && bmkgLive) headlines = [bmkgLive];
    headlines.sort((a,b) => (a.minutesAgo||9999) - (b.minutesAgo||9999));
    return {
      id,
      title: TOPIC_META[id].title,
      icon: TOPIC_META[id].icon,
      volume: `${headlines.length} berita`,
      lastUpdate: `dalam ${hours} jam terakhir`,
      headlines: headlines.slice(0,200),
    };
  }));

  return NextResponse.json({ success: true, filter: filterRaw, hours, lastSync: new Date().toISOString(), topics: results });
}
