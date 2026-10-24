import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// 9 MENU + AUTO CLUSTERING BERITA MIRIP - NO CHEERIO
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

function formatTimeAgo(minutes) {
  if (minutes < 60) return `${minutes}m lalu`;
  if (minutes < 1440) return `${Math.floor(minutes/60)}j lalu`;
  return `${Math.floor(minutes/1440)}h lalu`;
}

function parseRSS(xml) {
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

// --- CLUSTERING LOGIC ---
const STOPWORDS = new Set(['dan','di','yang','untuk','dari','dengan','pada','ke','ini','itu','adalah','akan','bisa','jadi','soal','tentang','dalam','secara','oleh','sebagai','saat','tengah','juga','sudah','telah','buka','ada','jadi','jika','atau','oleh','para','sebuah','tersebut','agar','hingga','bahwa','karena','dalam','kepada','namun','tetapi']);
function normalizeWords(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
    .filter(w => !/^\d+$/.test(w) || w.length === 4); // keep year like 2029
}
function jaccardSimilarity(aTitle, bTitle) {
  const aWords = new Set(normalizeWords(aTitle));
  const bWords = new Set(normalizeWords(bTitle));
  if (aWords.size === 0 || bWords.size === 0) return 0;
  let inter = 0;
  for (const w of aWords) if (bWords.has(w)) inter++;
  const union = aWords.size + bWords.size - inter;
  return union === 0 ? 0 : inter / union;
}

function clusterHeadlines(headlines, threshold = 0.38) {
  const clusters = [];
  // sort by time first - newest first biar jadi representative
  const sorted = [...headlines].sort((a,b) => a.minutesAgo - b.minutesAgo);
  for (const h of sorted) {
    let found = false;
    for (const cluster of clusters) {
      const rep = cluster[0];
      const sim = jaccardSimilarity(h.title, rep.title);
      // bonus kalau ada tahun sama dan keyword MK/Prabowo/Jokowi sama
      const sameYear = (h.title.match(/2029|2024|2025/) && rep.title.match(/2029|2024|2025/));
      if (sim >= threshold || (sim >= 0.28 && sameYear)) {
        cluster.push(h);
        // keep cluster sorted by time
        cluster.sort((a,b) => a.minutesAgo - b.minutesAgo);
        found = true;
        break;
      }
    }
    if (!found) clusters.push([h]);
  }
  // transform to grouped object
  return clusters.map((cluster, idx) => {
    const main = cluster[0]; // newest
    const allSources = [...new Set(cluster.map(c => c.source))];
    return {
      id: `cluster-${idx}`,
      isCluster: cluster.length > 1,
      count: cluster.length,
      title: main.title,
      mainUrl: main.url,
      time: main.time,
      minutesAgo: main.minutesAgo,
      sources: allSources,
      headlines: cluster, // all variants
      source: cluster.length > 1 ? `${allSources.length} sumber` : main.source,
    };
  });
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
      const t = cleanTitle.toLowerCase();
      if (topicId === 'jakarta' && !(t.includes('jakarta') || t.includes('dki'))) continue;
      if (topicId === 'megawati' && !t.includes('megawati') && !t.includes('mega')) continue;
      if (topicId === 'puan' && !t.includes('puan')) continue;
      items.push({
        id: `${topicId}-${i}`,
        source: (source || 'Google News').slice(0, 30),
        time: formatTimeAgo(minutesAgo),
        minutesAgo,
        title: cleanTitle,
        url: linkRaw.replace(/&amp;/g, '&'),
        link: linkRaw.replace(/&amp;/g, '&'),
      });
    }
    items.sort((a,b) => a.minutesAgo - b.minutesAgo);
    return items.slice(0, 60);
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

    const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi'];

    const results = await Promise.all(topicOrder.map(async (id) => {
      const headlines = await fetchRSS(id, hours);
      const clustered = clusterHeadlines(headlines);
      return {
        id,
        title: TOPIC_META[id].title,
        icon: TOPIC_META[id].icon,
        volume: `${headlines.length} berita • ${clustered.length} isu`,
        lastUpdate: `dalam ${hours} jam terakhir • auto group mirip`,
        headlines: headlines, // raw
        clusters: clustered, // grouped
      };
    }));

    return NextResponse.json({ success: true, filter: filterRaw, hours, lastSync: new Date().toISOString(), topics: results }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e), topics: [] }, { status: 200 });
  }
}
