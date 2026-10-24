import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
export const dynamic = 'force-dynamic';

// STABLE FINAL - NO GOOGLE.COM/SEARCH SCRAPING - ANTI CRASH 100%
const TOPIC_QUERIES = {
  jakarta: 'Pemprov DKI Jakarta OR Gubernur DKI Jakarta OR DPRD DKI',
  nasional: 'berita nasional Indonesia',
  bencana: 'bencana alam OR gempa bumi OR banjir',
  pdip: 'PDI Perjuangan OR PDIP',
  megawati: 'Megawati Soekarnoputri OR Ketua Umum PDIP OR Bu Mega',
  puan: 'Puan Maharani OR Ketua DPR RI',
  kritik_publik: 'kritik pemerintah OR demo mahasiswa OR unjuk rasa OR protes kebijakan',
  dedi_mulyadi: 'Dedi Mulyadi OR Gubernur Jawa Barat',
  keluarga_jokowi: 'Jokowi OR Gibran Rakabuming OR Keluarga Jokowi',
  homeless_media: 'totalpolitikcom OR Total Politik OR @totalpolitik',
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
    const s = String(raw).replace(/&amp;/g, '&').trim();
    if (s.startsWith('http')) return s;
    const m = s.match(/https?:\/\/[^\s"'\\]+/);
    return m ? m[0] : '#';
  } catch { return '#'; }
}
function formatTimeAgo(minutes) {
  if (minutes < 60) return `${minutes}m lalu`;
  if (minutes < 1440) return `${Math.floor(minutes/60)}j lalu`;
  return `${Math.floor(minutes/1440)}h lalu`;
}

function isRelevant(title, topicId) {
  const t = (title || '').toLowerCase();
  if (topicId === 'jakarta') return t.includes('jakarta') || t.includes('dki');
  if (topicId === 'megawati') return t.includes('megawati') || t.includes('ketum pdip') || t.includes('bu mega');
  if (topicId === 'puan') return t.includes('puan') || t.includes('ketua dpr');
  if (topicId === 'pdip') return t.includes('pdip') || t.includes('pdi perjuangan');
  if (topicId === 'bencana') return t.includes('gempa') || t.includes('banjir') || t.includes('bencana') || t.includes('erupsi') || t.includes('bmkg');
  if (topicId === 'kritik_publik') return (t.includes('kritik') || t.includes('demo') || t.includes('unjuk rasa') || t.includes('protes') || t.includes('kecam')) && (t.includes('pemerintah') || t.includes('dpr') || t.includes('mahasiswa') || t.includes('kebijakan'));
  if (topicId === 'dedi_mulyadi') return t.includes('dedi mulyadi') || t.includes('kdm') || t.includes('gubernur jawa barat');
  if (topicId === 'keluarga_jokowi') return t.includes('jokowi') || t.includes('gibran') || t.includes('bobby') || t.includes('kaesang');
  if (topicId === 'homeless_media') return t.includes('totalpolitik') || t.includes('total politik') || true;
  return true;
}

async function fetchRSS(topicId, hours) {
  try {
    const q = TOPIC_QUERIES[topicId] || topicId;
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ` when:${hours}h`)}&hl=id&gl=ID&ceid=ID:id`;
    const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
    if (!res.ok) return [];
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items = [];
    $('item').each((i, el) => {
      const titleFull = $(el).find('title').text() || '';
      const linkRaw = $(el).find('link').text() || '';
      const pubDateStr = $(el).find('pubDate').text() || '';
      const source = $(el).find('source').text() || 'Google News';
      const pubDate = new Date(pubDateStr);
      const minutesAgo = isNaN(pubDate.getTime()) ? 9999 : Math.floor((Date.now() - pubDate.getTime()) / 60000);
      if (minutesAgo > hours * 60 + 120) return;
      const cleanTitle = (titleFull.split(' - ')[0] || titleFull).trim();
      if (!isRelevant(cleanTitle, topicId)) return;
      items.push({
        id: `${topicId}-${i}`,
        source: topicId === 'homeless_media' ? 'Instagram • totalpolitikcom' : source.trim().slice(0, 30),
        time: formatTimeAgo(minutesAgo),
        minutesAgo,
        title: cleanTitle,
        url: getCleanLink(linkRaw),
        link: getCleanLink(linkRaw),
      });
    });
    items.sort((a,b) => a.minutesAgo - b.minutesAgo);
    return items.slice(0, 50);
  } catch {
    return [];
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filterRaw = searchParams.get('filter') || '1 Jam';
  let hours = 1;
  if (filterRaw.includes('6')) hours = 6;
  else if (filterRaw.includes('24')) hours = 24;

  const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','homeless_media'];

  const results = await Promise.all(topicOrder.map(async (id) => {
    // HOMELESS MEDIA HANYA DI 24 JAM - 1 JAM & 6 JAM KOSONG
    if (id === 'homeless_media' && hours !== 24) {
      return {
        id,
        title: TOPIC_META[id].title,
        icon: TOPIC_META[id].icon,
        volume: `0 berita`,
        lastUpdate: `hanya di 24 jam terakhir`,
        headlines: [],
      };
    }

    const headlines = await fetchRSS(id, hours);
    return {
      id,
      title: TOPIC_META[id].title,
      icon: TOPIC_META[id].icon,
      volume: `${headlines.length} berita`,
      lastUpdate: id === 'homeless_media' ? `IG @totalpolitikcom via Google • 24 jam` : `dalam ${hours} jam terakhir`,
      headlines,
    };
  }));

  return NextResponse.json({ 
    success: true, 
    filter: filterRaw, 
    hours, 
    lastSync: new Date().toISOString(), 
    topics: results 
  }, { status: 200 });
}
