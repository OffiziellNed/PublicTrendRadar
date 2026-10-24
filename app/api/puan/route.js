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
      const source = $(el).find('source').text() || titleFull.split(' - ').pop();
      const desc = $(el).find('description').text();
      const cleanTitle = titleFull.split(' - ')[0];
      items.push({
        topik: cleanTitle, title: cleanTitle, articleTitle: cleanTitle,
        articleDesc: cheerio.load(desc).text().slice(0, 300),
        pubDate, source, kategori: 'Politik',
        link: getCleanLink(linkRaw), url: getCleanLink(linkRaw),
      });
    });
    return items;
  } catch { return []; }
}
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const hours = searchParams.get('hours') ? parseInt(searchParams.get('hours')) : null;
  const data = await fetchRSS('Puan Maharani', hours || 12);
  return NextResponse.json({ success: true, data });
}
