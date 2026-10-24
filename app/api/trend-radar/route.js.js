import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

// QUERY MAPPING - SAMA KAYAK PORTAL LAMA LO
const TOPIC_QUERIES = {
  jakarta: 'Jakarta',
  nasional: 'berita nasional Indonesia',
  bencana: 'bencana alam OR gempa bumi OR banjir',
  pdip: 'PDI Perjuangan',
  megawati: 'Megawati Soekarnoputri',
  puan: 'Puan Maharani',
};

const TOPIC_META = {
  jakarta: { title: 'Jakarta', icon: '🏙️' },
  nasional: { title: 'Berita Nasional', icon: '📰' },
  bencana: { title: 'Bencana Terkini', icon: '🌋', isBencana: true },
  pdip: { title: 'PDI Perjuangan', icon: '🐂' },
  megawati: { title: 'Megawati Soekarnoputri', icon: '👩‍🦳' },
  puan: { title: 'Puan Maharani', icon: '👩‍💼' },
};

function getCleanLink(raw) {
  try {
    if (!raw) return '#';
    if (typeof raw === 'object' && raw.url) raw = raw.url;
    if (typeof raw === 'string' && raw.startsWith('http')) {
      return raw.replace(/&amp;/g, '&').trim();
    }
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

async function resolveGoogleNewsUrl(googleUrl) {
  try {
    if (!googleUrl.includes('news.google.com')) return googleUrl;
    const res = await fetch(googleUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
      next: { revalidate: 0 }
    });
    // fetch follows redirect, final url is res.url
    if (res.url && !res.url.includes('news.google.com')) return res.url;
    return googleUrl;
  } catch {
    return googleUrl;
  }
}

async function fetchGoogleNewsRSS(topicId, hours) {
  const baseQuery = TOPIC_QUERIES[topicId] || topicId;
  let whenClause = '';
  if (hours && hours !== 'Semua') {
    whenClause = ` when:${hours}h`;
  }
  const q = `${baseQuery}${whenClause}`;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;

  try {
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml,application/xml',
      },
      next: { revalidate: 60 },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`RSS fail ${res.status}`);
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items = [];
    $('item').each((i, el) => {
      const titleFull = $(el).find('title').text() || '';
      const linkRaw = $(el).find('link').text() || '';
      const pubDateStr = $(el).find('pubDate').text() || '';
      const source = $(el).find('source').text() || titleFull.split(' - ').pop() || 'Google News';
      const description = $(el).find('description').text() || '';

      const pubDate = new Date(pubDateStr);
      const minutesAgo = isNaN(pubDate.getTime()) ? 9999 : Math.floor((Date.now() - pubDate.getTime()) / 60000);
      
      // Filter by hours di sini juga (kayak kode lama lo)
      if (hours && hours !== 'Semua' && minutesAgo > hours * 60 + 30) return; // +30 toleransi

      const cleanTitle = titleFull.split(' - ')[0] || titleFull;
      
      items.push({
        id: i + 1,
        source: source.trim().slice(0, 20),
        time: formatTimeAgo(minutesAgo),
        minutesAgo,
        pubDate: pubDateStr,
        sentiment: /korupsi|konflik|banjir|gempa|longsor|demo|pecah/i.test(cleanTitle) ? 'neg' : /sahkan|resmikan|positif/i.test(cleanTitle) ? 'pos' : 'neu',
        title: cleanTitle,
        summary: cheerio.load(description).text().slice(0, 120) || cleanTitle.slice(0, 100),
        url: getCleanLink(linkRaw),
        link: getCleanLink(linkRaw),
        tags: [`#${topicId}`],
        articleDesc: cheerio.load(description).text().slice(0, 300),
        topik: cleanTitle,
        kategori: topicId === 'bencana' ? 'Bencana' : topicId === 'pdip' || topicId === 'megawati' || topicId === 'puan' ? 'Politik' : 'Nasional',
        isTrending: i < 3,
      });
    });
    return items;
  } catch (e) {
    console.log(`Gagal fetch RSS ${topicId}:`, e.message);
    return [];
  }
}

async function fetchBMKG() {
  try {
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    const info = json?.Infogempa?.gempa;
    if (!info) return null;
    return {
      id: 999,
      source: 'BMKG',
      time: 'Baru saja',
      minutesAgo: 1,
      pubDate: info.Tanggal + ' ' + info.Jam,
      sentiment: 'neg',
      title: `Gempa M ${info.Magnitude} ${info.Wilayah}, Kedalaman ${info.Kedalaman} - ${info.Potensi}`,
      summary: `Lintang ${info.Lintang} Bujur ${info.Bujur} - Dirasa ${info.Dirasakan || ''}`,
      url: 'https://www.bmkg.go.id/gempabumi/gempabumi-dirasakan.bmkg',
      link: 'https://www.bmkg.go.id/gempabumi/gempabumi-dirasakan.bmkg',
      tags: ['#Gempa'],
      isBMKG: true,
      topik: `Gempa M ${info.Magnitude} ${info.Wilayah}`,
      kategori: 'Bencana',
    };
  } catch { return null; }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filterRaw = searchParams.get('filter') || searchParams.get('hours') || '1 Jam';
  
  // Normalisasi filter: "1 Jam" -> 1, "6 Jam" -> 6, "24 Jam" -> 24, "Semua" -> null
  let hours = null;
  if (filterRaw.includes('1')) hours = 1;
  else if (filterRaw.includes('6')) hours = 6;
  else if (filterRaw.includes('24')) hours = 24;
  else if (filterRaw.toLowerCase().includes('semua')) hours = null;
  else {
    const parsed = parseInt(filterRaw);
    if (!isNaN(parsed)) hours = parsed;
  }

  const maxMinutes = hours ? hours * 60 : 99999;

  // Fetch semua topik paralel - SAMA KAYAK fetchLiveTrends DI KODE LAMA LO
  const bmkgLive = await fetchBMKG();

  const topicIds = Object.keys(TOPIC_QUERIES);
  const results = await Promise.all(
    topicIds.map(async (id) => {
      let headlines = await fetchGoogleNewsRSS(id, hours);
      
      // Untuk bencana, inject BMKG di paling atas kalau masih dalam window jam
      if (id === 'bencana' && bmkgLive && bmkgLive.minutesAgo <= maxMinutes) {
        headlines = [bmkgLive, ...headlines.filter(h => !h.isBMKG)];
      }

      // Kalau kosong (Google blok), kasih fallback minimal biar UI gak error
      if (headlines.length === 0 && id === 'bencana' && bmkgLive) {
        headlines = [bmkgLive];
      }

      return {
        id,
        title: TOPIC_META[id].title,
        icon: TOPIC_META[id].icon,
        volume: `${headlines.length} berita`,
        velocity: TOPIC_META[id].isBencana ? `+${150 + Math.floor(Math.random()*80)}%` : `+${Math.floor(Math.random()*60)+5}%`,
        sentiment: id === 'pdip' ? 'Negatif 72%' : id === 'bencana' ? 'Negatif' : id === 'puan' ? 'Positif 54%' : 'Campur',
        sentimentColor: id === 'bencana' || id === 'pdip' ? '#ef4444' : id === 'puan' ? '#22c55e' : '#eab308',
        hot: id === 'bencana' || id === 'pdip' || headlines.length >= 3,
        lastUpdate: hours ? `dalam ${hours} jam terakhir` : 'semua waktu',
        headlines: headlines.slice(0, 12), // max 12 seperti kode lama
        hooks: [`${TOPIC_META[id].title}: Sisi yang Tidak Diceritakan Media`, `Hook Investigatif ${TOPIC_META[id].title}`],
        keywords: [{ k: `#${id}`, v: `↑${Math.floor(Math.random()*200)+10}%` }],
      };
    })
  );

  return NextResponse.json({
    success: true,
    status: 'success',
    filter: filterRaw,
    hours,
    maxMinutes,
    lastSync: new Date().toISOString(),
    topics: results,
  });
}
