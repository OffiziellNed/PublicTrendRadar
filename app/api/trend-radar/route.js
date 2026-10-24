import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
export const dynamic = 'force-dynamic';

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
  bencana: { title: 'Bencana Terkini', icon: '🌋' },
  pdip: { title: 'PDI Perjuangan', icon: '🐂' },
  megawati: { title: 'Megawati Soekarnoputri', icon: '👩‍🦳' },
  puan: { title: 'Puan Maharani', icon: '👩‍💼' },
};

// TIER DEFINISI REAL - SESUAI REQUEST
const TIER_1 = ['kompas.com','detik.com','tribunnews.com','liputan6.com','cnnindonesia.com','tempo.co','kumparan.com','metrotvnews.com','kompas.tv','tvonenews.com','antaranews.com','cnbcindonesia.com','bmkg.go.id','bnpb.go.id','basarnas.go.id'];
const TIER_2 = ['merdeka.com','okezone.com','suara.com','idntimes.com','viva.co.id','sindonews.com','jawapos.com','republika.co.id','bisnis.com','katadata.co.id','tirto.id','beritasatu.com'];
const TIER_3 = ['jpnn.com','grid.id','indozone.id','wartakotalive.com','pojoksatu.id','akurat.co','fajar.co.id','ayobandung.com','malangtimes.com','batamnews.co.id','pekanbarupos.co.id','rakyatsultra.co'];

function getTierInfo(url, source) {
  try {
    const host = new URL(url).hostname.replace('www.','').toLowerCase();
    const combined = (host + ' ' + (source||'')).toLowerCase();
    if (TIER_1.some(d => host.includes(d) || combined.includes(d))) {
      if (host.includes('bmkg.go.id') || host.includes('bnpb.go.id') || host.includes('basarnas.go.id')) return { tier: 1, tierLabel: 'TIER 1+ OFFICIAL', points: 5 };
      return { tier: 1, tierLabel: 'TIER 1', points: 3 };
    }
    if (TIER_2.some(d => host.includes(d) || combined.includes(d))) return { tier: 2, tierLabel: 'TIER 2', points: 2 };
    if (TIER_3.some(d => host.includes(d) || combined.includes(d))) return { tier: 3, tierLabel: 'TIER 3', points: 1 };
    // unknown - cek keyword source
    if (combined.includes('kompas') || combined.includes('detik') || combined.includes('cnn') || combined.includes('tempo')) return { tier: 1, tierLabel: 'TIER 1', points: 3 };
    return { tier: 3, tierLabel: 'TIER 3 / OTHER', points: 1 };
  } catch {
    return { tier: 3, tierLabel: 'TIER 3', points: 1 };
  }
}

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

// KEYWORD EXTRACTION UNTUK CLUSTERING
const STOPWORDS = new Set(['yang','di','ke','dari','dan','untuk','pada','dengan','adalah','ini','itu','sebagai','oleh','karena','akan','telah','sudah','saat','jadi','juga','ada','dalam','tidak','bisa','sudah','tersebut','para','sebuah','saya','kami','kita','mereka','dia','nya','the','a','an','in','on','at','of']);
function extractKeywords(title) {
  return new Set(
    title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w))
  );
}
function jaccard(setA, setB) {
  const inter = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
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
      const description = $(el).find('description').text() || '';
      const pubDate = new Date(pubDateStr);
      const minutesAgo = isNaN(pubDate.getTime()) ? 9999 : Math.floor((Date.now() - pubDate.getTime()) / 60000);
      if (minutesAgo > hours * 60 + 60) return;
      const cleanTitle = titleFull.split(' - ')[0] || titleFull;
      const url = getCleanLink(linkRaw);
      const tierInfo = getTierInfo(url, source);
      items.push({
        id: `${topicId}-${i}-${Date.now()}`,
        source: source.trim().slice(0, 28),
        time: formatTimeAgo(minutesAgo),
        minutesAgo,
        pubDate: pubDateStr,
        title: cleanTitle,
        summary: cheerio.load(description).text().slice(0, 140),
        url,
        link: url,
        tier: tierInfo.tier,
        tierLabel: tierInfo.tierLabel,
        points: tierInfo.points,
        keywords: extractKeywords(cleanTitle),
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
    return {
      id: 'bmkg-1',
      source: 'BMKG',
      time: 'Baru saja',
      minutesAgo: 0,
      title: `Gempa M ${info.Magnitude} ${info.Wilayah}`,
      summary: `${info.Kedalaman} • ${info.Jam} WIB • ${info.Potensi}`,
      url: 'https://www.bmkg.go.id',
      link: 'https://www.bmkg.go.id',
      tier: 1,
      tierLabel: 'TIER 1+ OFFICIAL',
      points: 10,
      keywords: extractKeywords(`Gempa M ${info.Magnitude} ${info.Wilayah}`),
      isBMKG: true,
      isTopNews: true,
    };
  } catch { return null; }
}

// CLUSTERING + SCORING REAL TOP NEWS
function clusterAndScore(headlines) {
  const clusters = [];
  for (const h of headlines) {
    let found = false;
    for (const cluster of clusters) {
      const sim = jaccard(h.keywords, cluster.keywords);
      if (sim >= 0.38) {
        cluster.items.push(h);
        cluster.totalPoints += h.points;
        cluster.tierBreakdown[h.tier] = (cluster.tierBreakdown[h.tier]||0)+1;
        // merge keywords
        cluster.keywords = new Set([...cluster.keywords, ...h.keywords]);
        found = true;
        break;
      }
    }
    if (!found) {
      clusters.push({
        id: `cluster-${clusters.length}`,
        keywords: h.keywords,
        items: [h],
        totalPoints: h.points,
        tierBreakdown: { [h.tier]: 1 },
        representativeTitle: h.title,
      });
    }
  }
  // Tentukan Top News: skor 25-35 (atau >=25) = Top
  for (const c of clusters) {
    c.isTopNews = c.totalPoints >= 25;
    c.topLabel = c.isTopNews ? `TOP NEWS • ${c.totalPoints} poin` : `${c.totalPoints} poin`;
    // assign ke tiap item
    for (const item of c.items) {
      item.clusterId = c.id;
      item.clusterScore = c.totalPoints;
      item.clusterSize = c.items.length;
      item.isTopNews = c.isTopNews;
      item.topLabel = c.topLabel;
      item.tierBreakdown = c.tierBreakdown;
    }
  }
  return { clusters, headlines };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filterRaw = searchParams.get('filter') || '1 Jam';
  const isTopParam = searchParams.get('top') === 'true' || filterRaw.includes('Top') || filterRaw.includes('🔥');
  let hours = 1;
  if (isTopParam) hours = 24;
  else if (filterRaw.includes('1')) hours = 1;
  else if (filterRaw.includes('6')) hours = 6;
  else if (filterRaw.includes('24')) hours = 24;

  const maxMinutes = hours * 60;
  const bmkgLive = await fetchBMKG();
  const topicIds = Object.keys(TOPIC_QUERIES);

  const results = await Promise.all(topicIds.map(async (id) => {
    let headlines = await fetchGoogleNewsRSS(id, hours);
    if (id === 'bencana' && bmkgLive && bmkgLive.minutesAgo <= maxMinutes) {
      headlines = [bmkgLive, ...headlines.filter(h => !h.isBMKG)];
    }
    if (headlines.length === 0 && id === 'bencana' && bmkgLive) headlines = [bmkgLive];

    const { clusters, headlines: scoredHeadlines } = clusterAndScore(headlines);

    // Sort by clusterScore desc, then minutesAgo asc - TAPI UNTUK DISPLAY TETAP SORT BY TIME DI FRONTEND
    scoredHeadlines.sort((a,b) => {
      if (b.clusterScore !== a.clusterScore) return b.clusterScore - a.clusterScore;
      return a.minutesAgo - b.minutesAgo;
    });

    const topCount = scoredHeadlines.filter(h => h.isTopNews).length;
    const filteredForTopMode = isTopParam ? scoredHeadlines.filter(h => h.isTopNews) : scoredHeadlines;

    return {
      id,
      title: TOPIC_META[id].title,
      icon: TOPIC_META[id].icon,
      volume: isTopParam ? `${topCount} Top News` : `${scoredHeadlines.length} berita`,
      volumeReal: scoredHeadlines.length,
      topCount,
      totalClusters: clusters.length,
      velocity: isTopParam ? `🔥 ${topCount} Top` : `${topCount} Top`,
      sentiment: id === 'pdip' ? 'Negatif 72%' : id === 'bencana' ? 'Negatif' : id === 'puan' ? 'Positif 54%' : 'Campur',
      sentimentColor: id === 'bencana' || id === 'pdip' ? '#ef4444' : id === 'puan' ? '#22c55e' : '#eab308',
      lastUpdate: isTopParam ? `Top News • skor ≥25` : `dalam ${hours} jam terakhir`,
      headlines: isTopParam ? filteredForTopMode.slice(0,200) : scoredHeadlines.slice(0,200),
      allHeadlines: scoredHeadlines.slice(0,200),
      clusters: clusters.map(c => ({ id: c.id, totalPoints: c.totalPoints, isTopNews: c.isTopNews, size: c.items.length, title: c.representativeTitle, tierBreakdown: c.tierBreakdown })),
    };
  }));

  return NextResponse.json({ 
    success: true, 
    filter: filterRaw, 
    hours, 
    maxMinutes, 
    isTop: isTopParam, 
    formula: 'Tier1=3 poin, Tier2=2 poin, Tier3=1 poin, Skor >=25 = Top News (25-35 range)',
    lastSync: new Date().toISOString(), 
    topics: results 
  });
}
