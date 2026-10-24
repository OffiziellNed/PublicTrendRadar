import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

// V5 ANTI 522 + GOOGLE NEWS RESOLVER - COPY DARI PORTAL LAMA YANG UDAH JALAN
const isErrorPage = (text) => {
  if (!text) return true;
  const low = text.toLowerCase();
  return low.includes('cloudflare') || low.includes('just a moment') || low.includes('error 522') || low.includes('error 1020') || low.includes('attention required') || low.includes('ddos protection');
};

async function resolveGoogleNewsUrl(googleUrl) {
  try {
    if (!googleUrl.includes('news.google.com')) return googleUrl;
    // Google News CBM link biasanya redirect 2x
    const res = await fetch(googleUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36' },
      redirect: 'follow',
    });
    if (res.url && !res.url.includes('news.google.com')) {
      return res.url;
    }
    // Fallback parse HTML
    const html = await res.text();
    const $ = cheerio.load(html);
    const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
    if (metaRefresh) {
      const m = metaRefresh.match(/url='([^']+)'/i) || metaRefresh.match(/url="([^"]+)"/i);
      if (m) return m[1];
    }
    const firstLink = $('a').first().attr('href');
    if (firstLink && firstLink.startsWith('http')) return firstLink;
    return googleUrl;
  } catch {
    return googleUrl;
  }
}

async function tryFetchDirect(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id,en-US;q=0.9,en;q=0.8',
      'Referer': 'https://www.google.com/',
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Direct fail ${res.status}`);
  const html = await res.text();
  if (isErrorPage(html)) throw new Error('Cloudflare 522 detected on direct');
  return html;
}

async function tryFetchProxies(url) {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    `https://cc.bingj.com/cache.aspx?d=465&m=1&w=7&u=${encodeURIComponent(url)}`,
  ];
  for (const pUrl of proxies) {
    try {
      const res = await fetch(pUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 0 },
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (isErrorPage(html)) continue;
      if (html.length < 1000) continue;
      return html;
    } catch { continue; }
  }
  throw new Error('All proxies failed');
}

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ status: 'error', error: 'URL kosong' }, { status: 400 });

    let realUrl = url;
    // 1. Resolve Google News dulu (logic lama lo)
    if (url.includes('news.google.com')) {
      realUrl = await resolveGoogleNewsUrl(url);
    }

    let html = '';
    try {
      html = await tryFetchDirect(realUrl);
    } catch (e) {
      console.log('Direct fail, coba proxy:', e.message);
      html = await tryFetchProxies(realUrl);
    }

    const $ = cheerio.load(html);
    $('script, style, noscript, iframe, header, footer, nav').remove();

    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || $('h1').first().text() || 'Tanpa Judul';
    const ogImage = $('meta[property="og:image"]').attr('content') || $('article img').first().attr('src') || $('img').first().attr('src') || '';
    let imageUrl = ogImage;
    if (imageUrl && !imageUrl.startsWith('http')) {
      try { imageUrl = new URL(imageUrl, realUrl).href; } catch {}
    }

    // Ambil paragraf seperti portal lama
    let paragraphs = [];
    $('article p, .content p, .detail p, .read__content p, #content p, p').each((i, el) => {
      const t = $(el).text().trim();
      if (t.length > 60 && !isErrorPage(t)) paragraphs.push(t);
    });
    paragraphs = paragraphs.slice(0, 10);
    const fullText = paragraphs.join('\n\n');

    let hostname = '';
    try { hostname = new URL(realUrl).hostname.replace('www.', ''); } catch {}

    if (!fullText || fullText.length < 100) {
      return NextResponse.json({
        status: 'success',
        title: title.trim(),
        description: `Isi berita dari ${hostname} tidak bisa diambil full karena proteksi Cloudflare. Silakan pakai deskripsi RSS.`,
        text: `Isi berita dari ${hostname} tidak bisa diambil full karena proteksi. Judul: ${title}`,
        sumber: `Sumber Berita: ${hostname}`,
        real_url: realUrl,
        gambar_url: imageUrl,
        prompt: `${title}\n\nSumber: ${hostname}\nLink: ${realUrl}`,
        raw_length: 0,
      });
    }

    const prompt = `${fullText}\n\n---\nSumber: ${hostname}\nLink: ${realUrl}`;

    return NextResponse.json({
      status: 'success',
      title: title.trim(),
      description: fullText.slice(0, 5000),
      text: fullText.slice(0, 8000),
      sumber: `Sumber Berita: ${hostname}`,
      real_url: realUrl,
      gambar_url: imageUrl,
      prompt: prompt.slice(0, 8000),
      raw_length: fullText.length,
    });

  } catch (err) {
    console.error('tarik-berita error', err);
    return NextResponse.json({ status: 'error', error: err.message, message: err.message }, { status: 500 });
  }
}
