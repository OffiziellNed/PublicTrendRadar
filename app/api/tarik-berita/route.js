import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// /api/tarik-berita - Improved scraper for AgoraVada
// POST { url: string }

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ status: 'error', error: 'URL kosong' }, { status: 400 });

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'id,en;q=0.9',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) throw new Error(`Gagal fetch ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    // Bersihkan script
    $('script, style, noscript, iframe').remove();

    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || $('h1').first().text() || 'Judul tidak ditemukan';
    const gambar_url = $('meta[property="og:image"]').attr('content') || $('article img').first().attr('src') || '';
    const sumber = new URL(url).hostname.replace('www.', '');
    
    // Ambil paragraf
    let paragraphs = [];
    $('article p, .content p, .detail p, p').each((i, el) => {
      const t = $(el).text().trim();
      if (t.length > 60) paragraphs.push(t);
    });
    paragraphs = paragraphs.slice(0, 8);

    const fullText = paragraphs.join('\n\n');
    const prompt = `${fullText}\n\n---\nSumber: ${sumber}\nLink: ${url}`;

    return NextResponse.json({
      status: 'success',
      judul: title.trim(),
      sumber,
      gambar_url: gambar_url.startsWith('http') ? gambar_url : '',
      prompt: prompt.slice(0, 8000), // batasi biar nggak kepanjangan
      raw_length: fullText.length,
    });

  } catch (err) {
    console.error('tarik-berita error', err);
    return NextResponse.json({ status: 'error', error: err.message }, { status: 500 });
  }
}
