import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// FINAL STABLE - TANPA CHEERIO - PAKAI REGEX - ANTI CRASH NEXT 16
const TOPIC_QUERIES = {
  jakarta: 'Pemprov DKI Jakarta OR Gubernur DKI',
  nasional: 'berita nasional Indonesia',
  bencana: 'bencana alam OR gempa bumi OR banjir',
  pdip: 'PDI Perjuangan OR PDIP',
  megawati: 'Megawati Soekarnoputri OR Ketua Umum PDIP OR Bu Mega',
  puan: 'Puan Maharani OR Ketua DPR RI',
  kritik_publik: 'kritik pemerintah OR demo mahasiswa OR unjuk rasa',
  dedi_mulyadi: 'Dedi Mulyadi OR Gubernur Jawa Barat',
  keluarga_jokowi: 'Jokowi OR Gibran Rakabuming OR Keluarga Jokowi',
  homeless_media: 'totalpolitikcom',
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

function formatTimeAgo(minutes) {
  if (minutes < 60) return `${minutes}m lalu`;
  if (minutes < 1440) return `${Math.floor(minutes/60)}j lalu`;
  return `${Math.floor(minutes/1440)}h lalu`;
}

function parseRSS(xml) {
  // Parse tanpa cheerio - pakai regex biar gak crash di Next 16
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const getTag = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i');
      const m = itemXml.match(r);
      return m ? m[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') : '';
    };
    items.push({
      titleFull: getTag('title'),
      linkRaw: getTag('link'),
      pubDateStr: getTag('pubDate'),
      source: getTag('source'),
    });
  }
  return items;
}

async function fetchRSS(topicId, hours) {
  try {
    const q = TOPIC_QUERIES[topicId] || topicId;
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ` when:${hours}h`)}&hl=id&gl=ID&ceid=ID:id`;
    const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
    if (!res.ok) return [];
    const xml = await res.text();
    const rawItems = parseRSS(xml);
    const items = [];
    for (let i = 0; i < rawItems.length; i++) {
      const { titleFull, linkRaw, pubDateStr, source } = rawItems[i];
      const pubDate = new Date(pubDateStr);
      const minutesAgo = isNaN(pubDate.getTime()) ? 9999 : Math.floor((Date.now() - pubDate.getTime()) / 60000);
      if (minutesAgo > hours * 60 + 120) continue;
      const cleanTitle = (titleFull.split(' - ')[0] || titleFull).trim();
      if (!cleanTitle) continue;
      // simple relevance - biar balance
      const t = cleanTitle.toLowerCase();
      if (topicId === 'jakarta' && !(t.includes('jakarta') || t.includes('dki'))) continue;
      if (topicId === 'megawati' && !t.includes('megawati') && !t.includes('mega')) continue;
      if (topicId === 'puan' && !t.includes('puan')) continue;
      
      items.push({
        id: `${topicId}-${i}`,
        source: topicId === 'homeless_media' ? 'Instagram • totalpolitikcom' : (source || 'Google News').slice(0, 30),
        time: formatTimeAgo(minutesAgo),
        minutesAgo,
        title: cleanTitle,
        url: linkRaw.replace(/&amp;/g, '&'),
        link: linkRaw.replace(/&amp;/g, '&'),
      });
    }
    items.sort((a,b) => a.minutesAgo - b.minutesAgo);
    return items.slice(0, 50);
  } catch {
    return [];
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filterRaw = searchParams.get('filter') || '1 Jam';
    let hours = 1;
    if (filterRaw.includes('6')) hours = 6;
    else if (filterRaw.includes('24')) hours = 24;

    const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','homeless_media'];

    const results = await Promise.all(topicOrder.map(async (id) => {
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

    return NextResponse.json({ success: true, filter: filterRaw, hours, lastSync: new Date().toISOString(), topics: results }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e), topics: [] }, { status: 200 });
  }
}
