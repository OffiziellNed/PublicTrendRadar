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
async function fetchGoogleNewsRSS(topicId, hours) {
  const baseQuery = TOPIC_QUERIES[topicId] || topicId;
  let whenClause = ` when:${hours}h`;
  const q = `${baseQuery}${whenClause}`;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;
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
      if (hours && minutesAgo > hours * 60 + 60) return;
      const cleanTitle = titleFull.split(' - ')[0] || titleFull;
      items.push({
        id: i + 1, source: source.trim().slice(0, 20), time: formatTimeAgo(minutesAgo), minutesAgo, pubDate: pubDateStr,
        title: cleanTitle, summary: cheerio.load(description).text().slice(0, 120), url: getCleanLink(linkRaw), link: getCleanLink(linkRaw),
      });
    });
    return items;
  } catch (e) { return []; }
}
async function fetchBMKG() {
  try {
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { next: { revalidate: 60 } });
    const json = await res.json(); const info = json?.Infogempa?.gempa; if (!info) return null;
    return { id: 999, source: 'BMKG', time: 'Baru saja', minutesAgo: 1, title: `Gempa M ${info.Magnitude} ${info.Wilayah}`, summary: `${info.Kedalaman} • ${info.Jam} WIB`, url: 'https://www.bmkg.go.id', link: 'https://www.bmkg.go.id', isBMKG: true };
  } catch { return null; }
}
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filterRaw = searchParams.get('filter') || '1 Jam';
  let hours = 1;
  if (filterRaw.includes('1')) hours = 1; else if (filterRaw.includes('6')) hours = 6; else if (filterRaw.includes('24')) hours = 24;
  const maxMinutes = hours * 60;
  const bmkgLive = await fetchBMKG();
  const topicIds = Object.keys(TOPIC_QUERIES);
  const results = await Promise.all(topicIds.map(async (id) => {
    let headlines = await fetchGoogleNewsRSS(id, hours);
    if (id === 'bencana' && bmkgLive && bmkgLive.minutesAgo <= maxMinutes) headlines = [bmkgLive, ...headlines.filter(h => !h.isBMKG)];
    if (headlines.length === 0 && id === 'bencana' && bmkgLive) headlines = [bmkgLive];
    return {
      id, title: TOPIC_META[id].title, icon: TOPIC_META[id].icon, volume: `${headlines.length} berita`,
      velocity: `+${Math.floor(Math.random()*60)+5}%`, sentiment: id === 'pdip' ? 'Negatif 72%' : id === 'bencana' ? 'Negatif' : id === 'puan' ? 'Positif 54%' : 'Campur',
      sentimentColor: id === 'bencana' || id === 'pdip' ? '#ef4444' : id === 'puan' ? '#22c55e' : '#eab308',
      lastUpdate: `dalam ${hours} jam terakhir`, headlines: headlines,
    };
  }));
  return NextResponse.json({ success: true, status: 'success', filter: filterRaw, hours, maxMinutes, lastSync: new Date().toISOString(), topics: results });
}
