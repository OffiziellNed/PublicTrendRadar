import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
export const dynamic = 'force-dynamic';

// 10 MENU - KRITIK PUBLIK REVISI + HOMELESS MEDIA
const TOPIC_QUERIES = {
  jakarta: 'Jakarta',
  nasional: 'berita nasional Indonesia',
  bencana: 'bencana alam OR gempa bumi OR banjir',
  pdip: 'PDI Perjuangan',
  megawati: 'Megawati Soekarnoputri',
  puan: 'Puan Maharani',
  kritik_publik: 'kritik pemerintah OR kritik kebijakan OR demo mahasiswa OR aksi demo OR unjuk rasa OR DPR kritik pemerintah OR DPRD kritik pemerintah OR mahasiswa protes OR protes kebijakan',
  dedi_mulyadi: 'Dedi Mulyadi OR KDM OR Gubernur Jawa Barat OR Gubernur Jabar OR Kang Dedi Mulyadi',
  keluarga_jokowi: 'Jokowi OR Joko Widodo OR Gibran Rakabuming OR Bobby Nasution OR Kahiyang Ayu OR Kaesang Pangarep OR Keluarga Jokowi',
  homeless_media: 'totalpolitik OR pinterpolitik OR asumsico OR narasi.tv OR matanarasi OR watchdoc OR mojok OR tirto.id OR katadata OR projectmultatuli OR magdaleneid OR konde.co OR mongabay OR vice indonesia OR folkative OR volkxmedia OR ussfeed OR context.id OR historia.id OR politiksantuy OR bijakpolitik OR lambe turah OR ferry irwandi OR malakaproject OR kompas.com OR detik.com OR cnnindonesia OR kumparan OR tempo.co',
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
  homeless_media: { title: 'Homeless Media', icon: '🏴‍☠️' },
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

function isRelevant(title, topicId) {
  const t = title.toLowerCase();

  if (topicId === 'megawati') {
    return (
      t.includes('megawati') ||
      t.includes('ketua umum pdi perjuangan') ||
      t.includes('ketum pdi perjuangan') ||
      t.includes('ketua umum pdip') ||
      t.includes('ketum pdip') ||
      t.includes('bu mega') ||
      (t.includes('ketum') && (t.includes('pdi') || t.includes('pdip'))) ||
      (t.includes('ketua umum') && (t.includes('pdi') || t.includes('pdip')))
    );
  }
  if (topicId === 'puan') return t.includes('puan');
  if (topicId === 'pdip') return t.includes('pdip') || t.includes('pdi perjuangan');
  if (topicId === 'jakarta') return t.includes('jakarta') || t.includes('dki');
  if (topicId === 'bencana') return t.includes('gempa') || t.includes('banjir') || t.includes('bencana') || t.includes('erupsi') || t.includes('longsor') || t.includes('bmkg');

  if (topicId === 'kritik_publik') {
    const hasKritik = t.includes('kritik') || t.includes('kecam') || t.includes('protes') || t.includes('demo') || t.includes('unjuk rasa') || t.includes('aksi') || t.includes('soroti') || t.includes('desak') || t.includes('pertanyakan') || t.includes('tolak');
    const hasTarget = t.includes('pemerintah') || t.includes('kebijakan') || t.includes('politik') || t.includes('sosial') || t.includes('dpr') || t.includes('dprd') || t.includes('mahasiswa') || t.includes('menteri') || t.includes('presiden') || t.includes('negara') || t.includes('publik') || t.includes('rakyat');
    return hasKritik && hasTarget;
  }
  if (topicId === 'dedi_mulyadi') {
    return t.includes('dedi mulyadi') || t.includes('kdm') || t.includes('gubernur jawa barat') || t.includes('gubernur jabar') || t.includes('kang dedi');
  }
  if (topicId === 'keluarga_jokowi') {
    return t.includes('jokowi') || t.includes('joko widodo') || t.includes('gibran') || t.includes('bobby nasution') || t.includes('bobby') && t.includes('nasution') || t.includes('kahiyang') || t.includes('kaesang') || t.includes('jan ethes') || t.includes('keluarga jokowi') || t.includes('psi');
  }
  if (topicId === 'homeless_media') {
    // Karena ini scraping IG via Google, kita anggap semua hasil dari query tersebut relevan
    // Tapi tetap filter biar gak nyangkut berita random
    const keywords = ['totalpolitik','pinterpolitik','asumsi','narasi','matanajwa','watchdoc','mojok','tirto','katadata','multatuli','magdalene','konde','mongabay','vice','folkative','volkx','ussfeed','context','historia','geotimes','rembuk','politiksantuy','bijakpolitik','memepolitik','lambe','bintang emon','ferry irwandi','malaka','pandji','tajukmiring','kompas','detik','cnn indonesia','kumparan','tempo','liputan6','idntimes','tribunnews','inilah','asumsi','narasi'];
    return keywords.some(k => t.includes(k)) || true; // true = lolos semua dari query, biar banyak
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
  const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','homeless_media'];

  const results = await Promise.all(topicOrder.map(async (id) => {
    let headlines = await fetchGoogleNewsRSS(id, hours);
    if (id === 'bencana' && bmkgLive) headlines = [bmkgLive, ...headlines.filter(h => !h.isBMKG)].slice(0,200);
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

