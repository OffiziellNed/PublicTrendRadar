import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
export const dynamic = 'force-dynamic';

// BALANCE SEMUA MENU - TIDAK ADA YANG DI-BOOST / DIPANGKAS EKSTREM
const TOPIC_QUERIES = {
  jakarta: 'Pemprov DKI Jakarta OR Gubernur DKI Jakarta OR DPRD DKI',
  nasional: 'berita nasional Indonesia',
  bencana: 'bencana alam OR gempa bumi OR banjir OR erupsi gunung',
  pdip: 'PDI Perjuangan OR PDIP',
  megawati: 'Megawati Soekarnoputri OR Ketua Umum PDIP OR Bu Mega',
  puan: 'Puan Maharani OR Ketua DPR RI',
  kritik_publik: 'kritik pemerintah OR demo mahasiswa OR unjuk rasa OR protes kebijakan OR DPRD kritik pemerintah',
  dedi_mulyadi: 'Dedi Mulyadi OR Gubernur Jawa Barat OR Gubernur Jabar',
  keluarga_jokowi: 'Jokowi OR Gibran Rakabuming OR Bobby Nasution OR Kaesang Pangarep OR Keluarga Jokowi OR PSI',
  homeless_media: 'totalpolitik OR pinterpolitik OR asumsico OR narasi.tv OR watchdoc OR mojok.co OR tirto.id OR katadata OR kompas.com OR detik.com',
};

const TOPIC_META = {
  jakarta: { title: 'Jakarta', icon: '🏙' },
  nasional: { title: 'Berita Nasional', icon: '📰' },
  bencana: { title: 'Bencana Terkini', icon: '🌋' },
  pdip: { title: 'PDI Perjuangan', icon: '🐂' },
  megawati: { title: 'Megawati Soekarnoputri', icon: '👩🦳' },
  puan: { title: 'Puan Maharani', icon: '👩💼' },
  kritik_publik: { title: 'Kritik Publik', icon: '📢' },
  dedi_mulyadi: { title: 'Dedi Mulyadi / KDM', icon: '🌾' },
  keluarga_jokowi: { title: 'Keluarga Jokowi', icon: '👨👩👧👦' },
  homeless_media: { title: 'Homeless Media', icon: '🏴☠️' },
};

function getCleanLink(raw) {
  try {
    if (!raw) return '#';
    if (typeof raw === 'string' && raw.startsWith('http')) return raw.replace(/&amp;/g, '&').trim();
    const str = JSON.stringify(raw);
    const m = str.match(/https?:\/\/[^\s"'\\]+/);
    if (m) return m[0].replace(/\\"/g, '').replace(/&amp;/g, '&').replace(/["']+$/, '');
  } catch { return '#'; }
}
function formatTimeAgo(minutes) {
  if (minutes < 60) return `${minutes}m lalu`;
  if (minutes < 1440) return `${Math.floor(minutes/60)}j lalu`;
  return `${Math.floor(minutes/1440)}h lalu`;
}

function isRelevant(title, topicId) {
  const t = title.toLowerCase();
  if (topicId === 'jakarta') return t.includes('jakarta') || t.includes('dki');
  if (topicId === 'megawati') return t.includes('megawati') || t.includes('ketum pdip') || t.includes('ketua umum pdi') || t.includes('bu mega');
  if (topicId === 'puan') return t.includes('puan') || t.includes('puan maharani') || t.includes('ketua dpr');
  if (topicId === 'pdip') return t.includes('pdip') || t.includes('pdi perjuangan');
  if (topicId === 'bencana') return t.includes('gempa') || t.includes('banjir') || t.includes('bencana') || t.includes('erupsi') || t.includes('longsor') || t.includes('bmkg');
  if (topicId === 'kritik_publik') {
    return (t.includes('kritik') || t.includes('demo') || t.includes('unjuk rasa') || t.includes('protes') || t.includes('kecam') || t.includes('soroti') || t.includes('tolak')) &&
           (t.includes('pemerintah') || t.includes('kebijakan') || t.includes('dpr') || t.includes('dprd') || t.includes('mahasiswa') || t.includes('publik') || t.includes('rakyat') || t.includes('politik'));
  }
  if (topicId === 'dedi_mulyadi') return t.includes('dedi mulyadi') || t.includes('kdm') || t.includes('gubernur jawa barat') || t.includes('gubernur jabar') || t.includes('kang dedi');
  if (topicId === 'keluarga_jokowi') return t.includes('jokowi') || t.includes('gibran') || t.includes('bobby') || t.includes('kahiyang') || t.includes('kaesang') || t.includes('psi');
  if (topicId === 'homeless_media') return true;
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
    // BALANCE - SEMUA MENU MAX 50, TIDAK ADA YANG 15 ATAU 200
    return items.slice(0,50);
  } catch (e) { return []; }
}

async function fetchBMKG() {
  try {
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { next: { revalidate: 60 } });
    const json = await res.json();
    const info = json?.Infogempa?.gempa;
    if (!info) return null;
    return { id: 'bmkg-1', source: 'BMKG', time: 'Baru saja', minutesAgo: 0, title: `Gempa M ${info.Magnitude} ${info.Wilayah}`, url: 'https://www.bmkg.go.id', link: 'https://www.bmkg.go.id' };
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
  const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','homeless_media'];

  const results = await Promise.all(topicOrder.map(async (id) => {
    let headlines = await fetchGoogleNewsRSS(id, hours);
    if (id === 'bencana' && bmkgLive) headlines = [bmkgLive, ...headlines.filter(h => !h.isBMKG)].slice(0,50);
    headlines.sort((a,b) => (a.minutesAgo||9999) - (b.minutesAgo||9999));
    return {
      id,
      title: TOPIC_META[id].title,
      icon: TOPIC_META[id].icon,
      volume: `${headlines.length} berita`,
      lastUpdate: `dalam ${hours} jam terakhir`,
      headlines: headlines.slice(0,50),
    };
  }));

  return NextResponse.json({ success: true, filter: filterRaw, hours, lastSync: new Date().toISOString(), topics: results });
}
