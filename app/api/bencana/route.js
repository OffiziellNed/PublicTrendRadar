import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
export const dynamic = 'force-dynamic';

function getCleanLink(raw) {
  try {
    if (!raw) return '#';
    if (typeof raw === 'string' && raw.startsWith('http')) return raw.replace(/&amp;/g,'&').trim();
    const str = JSON.stringify(raw);
    const m = str.match(/https?:\/\/[^\s"'\\]+/);
    if (m) return m[0].replace(/\\"/g,'').replace(/&amp;/g,'&').replace(/["']+$/, '');
  } catch {}
  return '#';
}

async function fetchRSS(query, hours) {
  let whenClause = hours ? ` when:${hours}h` : '';
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query + whenClause)}&hl=id&gl=ID&ceid=ID:id`;
  try {
    const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 60 }, cache: 'no-store' });
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items = [];
    $('item').each((i, el) => {
      const titleFull = $(el).find('title').text();
      const linkRaw = $(el).find('link').text();
      const pubDate = $(el).find('pubDate').text();
      const source = $(el).find('source').text() || titleFull.split(' - ').pop() || 'BMKG';
      const desc = $(el).find('description').text();
      const cleanTitle = titleFull.split(' - ')[0];
      items.push({
        topik: cleanTitle, title: cleanTitle, articleTitle: cleanTitle,
        articleDesc: cheerio.load(desc).text().slice(0, 300),
        pubDate, source, kategori: 'Bencana',
        link: getCleanLink(linkRaw), url: getCleanLink(linkRaw),
      });
    });
    return items;
  } catch { return []; }
}

async function fetchBMKG() {
  try {
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { next: { revalidate: 60 } });
    const json = await res.json();
    const info = json?.Infogempa?.gempa;
    if (!info) return [];
    return [{
      topik: `Gempa M ${info.Magnitude} ${info.Wilayah}`,
      title: `Gempa M ${info.Magnitude} ${info.Wilayah}`,
      articleTitle: `Gempa M ${info.Magnitude} ${info.Wilayah}`,
      articleDesc: `Kedalaman ${info.Kedalaman}, ${info.Potensi}, Lintang ${info.Lintang} Bujur ${info.Bujur}`,
      pubDate: `${info.Tanggal} ${info.Jam} WIB`,
      source: 'BMKG', kategori: 'Bencana',
      link: 'https://www.bmkg.go.id', url: 'https://www.bmkg.go.id',
    }];
  } catch { return []; }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const hoursParam = searchParams.get('hours');
  const hours = hoursParam ? parseInt(hoursParam) : null;
  const mode = searchParams.get('mode');

  // Kalau tanpa hours (bencana page utama) kasih BMKG dulu
  let data = [];
  if (!hours) {
    const bmkg = await fetchBMKG();
    const rss = await fetchRSS('bencana alam OR gempa OR banjir bandang', 24);
    data = [...bmkg, ...rss];
  } else {
    data = await fetchRSS('bencana alam OR gempa OR banjir OR longsor', hours);
    if (mode !== 'terkini') {
      const bmkg = await fetchBMKG();
      data = [...bmkg, ...data];
    }
  }
  return NextResponse.json({ success: true, data });
}
