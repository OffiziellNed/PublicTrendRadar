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
function formatDateTime(dateStr) {
  if (!dateStr) return { date: '-', time: '-' };
  let str = String(dateStr);
  let strLower = str.toLowerCase();
  let datePart = str;
  let timePart = '-';
  let pukulIdx = strLower.indexOf('pukul');
  if (pukulIdx !== -1) {
    datePart = str.substring(0, pukulIdx).trim();
    if (datePart.endsWith(',')) datePart = datePart.substring(0, datePart.length-1);
    let afterPukul = strLower.substring(pukulIdx+5).split('wib').join('').split('wita').join('').split('wit').join('');
    timePart = afterPukul.trim().split('.').join(':');
  } else if (str.indexOf(':') !== -1) {
    let parts = str.split(' ');
    for (let i=0;i<parts.length;i++) {
      if (parts[i].indexOf(':') !== -1) {
        timePart = parts[i];
        datePart = str.replace(timePart,'').trim();
        if (datePart.endsWith(',')) datePart = datePart.substring(0, datePart.length-1);
        break;
      }
    }
  }
  let cleanDate = datePart.toLowerCase().split('wib').join('').split('wita').join('').split('wit').join('').trim();
  return { date: cleanDate || '-', time: timePart };
}

async function fetchRSS(query, hours) {
  let whenClause = hours ? ` when:${hours}h` : '';
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query + whenClause)}&hl=id&gl=ID&ceid=ID:id`;
  try {
    const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 60 }, cache: 'no-store' });
    if (!res.ok) throw new Error('fail');
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items = [];
    $('item').each((i, el) => {
      const titleFull = $(el).find('title').text();
      const linkRaw = $(el).find('link').text();
      const pubDate = $(el).find('pubDate').text();
      const source = $(el).find('source').text() || titleFull.split(' - ').pop() || 'Google News';
      const desc = $(el).find('description').text();
      const cleanTitle = titleFull.split(' - ')[0];
      const { date, time } = formatDateTime(pubDate);
      items.push({
        topik: cleanTitle,
        title: cleanTitle,
        articleTitle: cleanTitle,
        articleDesc: cheerio.load(desc).text().slice(0, 300),
        pubDate,
        date,
        time,
        source,
        kategori: 'Nasional',
        link: getCleanLink(linkRaw),
        url: getCleanLink(linkRaw),
        guid: getCleanLink(linkRaw),
      });
    });
    return items;
  } catch { return []; }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const hoursParam = searchParams.get('hours');
  const hours = hoursParam ? parseInt(hoursParam) : null;
  
  // QUERY sesuai portal lama
  const data = await fetchRSS('berita nasional Indonesia', hours);
  return NextResponse.json({ success: true, data });
}
