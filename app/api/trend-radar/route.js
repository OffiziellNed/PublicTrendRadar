import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// 11 MENU - CHECKED & FAIR - BALIK KE FILE WORK LO + FAIR UNTUK KRIMINAL & SOSIAL + FIX MEGAWATI ATLET
const TOPIC_QUERIES = {
  jakarta: ['Pemprov DKI Jakarta OR Gubernur DKI'],
  nasional: ['berita nasional Indonesia'],
  bencana: ['bencana alam OR gempa bumi OR banjir'],
  pdip: ['PDI Perjuangan OR PDIP'],
  // FIX MEGAWATI: query politik only + filter atlet di bawah
  megawati: ['Megawati Soekarnoputri OR Ketua Umum PDIP OR Bu Mega PDIP'],
  puan: ['Puan Maharani OR Ketua DPR RI'],
  kritik_publik: ['kritik pemerintah OR demo mahasiswa OR unjuk rasa'],
  dedi_mulyadi: ['Dedi Mulyadi OR Gubernur Jawa Barat'],
  keluarga_jokowi: ['Jokowi OR Gibran Rakabuming OR Keluarga Jokowi'],
  // SOSIAL & VIRAL - 4 query kecil sesuai kriteria lo (Fenomena Sosial, Curhatan Netizen, Video Viral, Kisah Haru, Cerita Unik, Fenomena Aneh, Anomali, Inspiratif)
  sosial: [
    'fenomena sosial OR curhatan netizen OR curhat viral',
    'video viral OR tiktok viral OR viral medsos',
    'kisah haru OR cerita unik OR kisah inspiratif OR inspiratif',
    'fenomena aneh OR anomali OR tradisi unik OR kejadian lucu OR nenek kakek viral'
  ],
  // KRIMINAL - 5 query kecil sesuai kriteria lo (Pembunuhan, Narkoba, Curanmor, Maling, KDRT, dll)
  kriminal: [
    'pembunuhan OR pembunuhan sadis',
    'narkoba OR sabu OR ganja OR ekstasi OR pengedaran narkotika',
    'curanmor OR maling OR pencurian OR perampokan OR begal OR jambret',
    'KDRT OR kekerasan rumah tangga OR penganiayaan OR pengeroyokan OR pembacokan OR penembakan',
    'pemerkosaan OR pelecehan seksual OR penipuan OR mayat ditemukan OR mutilasi OR tawuran'
  ],
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
  sosial: { title: 'Sosial & Viral', icon: '💬' },
  kriminal: { title: 'Kriminal', icon: '🦹' },
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
    items.push({ titleFull: getTag('title'), linkRaw: getTag('link'), pubDateStr: getTag('pubDate'), source: getTag('source') });
  }
  return items;
}

const STOPWORDS = new Set(['dan','di','yang','untuk','dari','dengan','pada','ke','ini','itu','adalah','akan','bisa','jadi','soal','tentang','dalam','secara','oleh','sebagai','saat','tengah','juga','sudah','telah','buka','ada','jadi','jika','atau','oleh','para','sebuah','tersebut','agar','hingga','bahwa','karena','dalam','kepada','namun','tetapi']);
function normalizeWords(title) { return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w)); }
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
  const sorted = [...headlines].sort((a,b) => a.minutesAgo - b.minutesAgo);
  for (const h of sorted) {
    let found = false;
    for (const cluster of clusters) {
      const rep = cluster[0];
      const sim = jaccardSimilarity(h.title, rep.title);
      const sameYear = (h.title.match(/2029|2024|2025/) && rep.title.match(/2029|2024|2025/));
      if (sim >= threshold || (sim >= 0.28 && sameYear)) {
        cluster.push(h);
        cluster.sort((a,b) => a.minutesAgo - b.minutesAgo);
        found = true;
        break;
      }
    }
    if (!found) clusters.push([h]);
  }
  return clusters.map((cluster, idx) => {
    const main = cluster[0];
    const allSources = [...new Set(cluster.map(c => c.source))];
    return { id: `cluster-${idx}`, isCluster: cluster.length > 1, count: cluster.length, title: main.title, mainUrl: main.url, time: main.time, minutesAgo: main.minutesAgo, sources: allSources, headlines: cluster };
  });
}

async function fetchSingleQuery(q, hours) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ` when:${hours}h`)}&hl=id&gl=ID&ceid=ID:id`;
  const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseRSS(xml);
}

async function fetchRSS(topicId, hours) {
  try {
    const queries = TOPIC_QUERIES[topicId] || [topicId];
    let allRaw = [];

    // FAIR TAPI TETAP RELEVAN: fetch semua sub-query untuk sosial & kriminal, untuk yang lain cukup 1 query utama
    const promises = queries.map(q => fetchSingleQuery(q, hours));
    const results = await Promise.all(promises);
    results.forEach(r => allRaw = allRaw.concat(r));

    // fallback khusus sosial & kriminal kalau 3 jam kosong -> coba 24 jam broad (biar fair, gak 0)
    if (allRaw.length === 0 && (topicId === 'sosial' || topicId === 'kriminal')) {
      const fallbackQ = topicId === 'sosial' ? 'viral OR unik OR lucu' : 'kriminal OR pembunuhan OR narkoba';
      allRaw = await fetchSingleQuery(fallbackQ, 24);
    }

    const seen = new Set();
    const items = [];
    for (let i = 0; i < allRaw.length; i++) {
      const { titleFull, linkRaw, pubDateStr, source } = allRaw[i];
      const pubDate = new Date(pubDateStr);
      const minutesAgo = isNaN(pubDate.getTime()) ? 9999 : Math.floor((Date.now() - pubDate.getTime()) / 60000);
      if (minutesAgo > hours * 60 + 180) {
        // kalau fallback 24 jam, toleransi lebih longgar
        if (!(topicId === 'sosial' || topicId === 'kriminal') || minutesAgo > 24*60+180) continue;
      }
      const cleanTitle = (titleFull.split(' - ')[0] || titleFull).trim();
      if (!cleanTitle) continue;
      const key = cleanTitle.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const t = cleanTitle.toLowerCase();

      // FILTER MEGAWATI ATLET - JANGAN ADA VOLI
      if (topicId === 'megawati') {
        const atletKeywords = ['voli','volley','pevoli','hangestri','red sparks','megatron','proliga','timnas voli','atlet voli','voli putri','megawati hangestri'];
        if (atletKeywords.some(k => t.includes(k))) continue;
        if (!t.includes('megawati') && !t.includes('mega') && !t.includes('ketua umum')) continue;
      }
      if (topicId === 'jakarta' && !(t.includes('jakarta') || t.includes('dki'))) continue;
      if (topicId === 'puan' && !t.includes('puan')) continue;
      // kriminal & sosial JANGAN filter ketat biar fair, biarin lolos sesuai query

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
    // FAIR: batasi 20 biar gak jomplang 40 vs 1, tapi untuk kriminal & sosial minimal harus ada
    return items.slice(0, 20);
  } catch {
    return [];
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filterRaw = searchParams.get('filter') || '3 Jam';
    let hours = 3;
    if (filterRaw.includes('6')) hours = 6;
    else if (filterRaw.includes('24')) hours = 24;
    else if (filterRaw.includes('3')) hours = 3;

    const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','sosial','kriminal'];

    const results = await Promise.all(topicOrder.map(async (id) => {
      const headlines = await fetchRSS(id, hours);
      const clustered = clusterHeadlines(headlines);
      return {
        id,
        title: TOPIC_META[id].title,
        icon: TOPIC_META[id].icon,
        volume: `${headlines.length} berita • ${clustered.length} isu`,
        lastUpdate: `dalam ${hours} jam - REAL FAIR`,
        headlines,
        clusters: clustered,
      };
    }));

    return NextResponse.json({ success: true, filter: filterRaw, hours, lastSync: new Date().toISOString(), topics: results }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e), topics: [] }, { status: 200 });
  }
}
