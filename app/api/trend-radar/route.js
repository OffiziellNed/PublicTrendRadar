import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
export const dynamic = 'force-dynamic';

// FIX CRASH - HOMELESS MEDIA VIA GOOGLE TAPI ANTI ERROR
const TOPIC_QUERIES = {
  jakarta: 'Pemprov DKI Jakarta OR Gubernur DKI Jakarta OR DPRD DKI',
  nasional: 'berita nasional Indonesia',
  bencana: 'bencana alam OR gempa bumi OR banjir OR erupsi gunung',
  pdip: 'PDI Perjuangan OR PDIP',
  megawati: 'Megawati Soekarnoputri OR Ketua Umum PDIP OR Bu Mega',
  puan: 'Puan Maharani OR Ketua DPR RI',
  kritik_publik: 'kritik pemerintah OR demo mahasiswa OR unjuk rasa OR protes kebijakan OR DPRD kritik pemerintah',
  dedi_mulyadi: 'Dedi Mulyadi OR Gubernur Jawa Barat OR Gubernur Jabar',
  keluarga_jokowi: 'Jokowi OR Gibran Rakabuming OR Bobby Nasution OR Kaesang Pangarep OR Keluarga Jokowi OR PSI',
  homeless_media: 'totalpolitikcom',
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
  homeless_media: { title: 'Homeless Media', icon: '🏴‍☠️' },
};

function getCleanLink(raw) {
  try {
    if (!raw) return '#';
    if (typeof raw === 'string' && raw.startsWith('http')) return raw.replace(/&amp;/g, '&').trim();
    const str = JSON.stringify(raw);
    const m = str.match(/https?:\/\/[^\s"'\\]+/);
    if (m) return m[0].replace(/\\"/g, '').replace(/&amp;/g, '&').replace(/["']+$/, '');
  } catch { return '#'; }
}
function formatTimeAgo(minutes) {
  if (minutes < 60) return `${minutes}m lalu`;
  if (minutes < 1440) return `${Math.floor(minutes/60)}j lalu`;
  return `${Math.floor(minutes/1440)}h lalu`;
}

function isRelevant(title, topicId) {
  try {
    const t = (title || '').toLowerCase();
    if (topicId === 'jakarta') return t.includes('jakarta') || t.includes('dki');
    if (topicId === 'megawati') return t.includes('megawati') || t.includes('ketum pdip') || t.includes('ketua umum pdi') || t.includes('bu mega');
    if (topicId === 'puan') return t.includes('puan') || t.includes('ketua dpr');
    if (topicId === 'pdip') return t.includes('pdip') || t.includes('pdi perjuangan');
    if (topicId === 'bencana') return t.includes('gempa') || t.includes('banjir') || t.includes('bencana') || t.includes('erupsi') || t.includes('bmkg');
    if (topicId === 'kritik_publik') {
      return (t.includes('kritik') || t.includes('demo') || t.includes('unjuk rasa') || t.includes('protes') || t.includes('kecam') || t.includes('soroti') || t.includes('tolak')) &&
             (t.includes('pemerintah') || t.includes('kebijakan') || t.includes('dpr') || t.includes('dprd') || t.includes('mahasiswa') || t.includes('publik'));
    }
    if (topicId === 'dedi_mulyadi') return t.includes('dedi mulyadi') || t.includes('kdm') || t.includes('gubernur jawa barat') || t.includes('gubernur jabar');
    if (topicId === 'keluarga_jokowi') return t.includes('jokowi') || t.includes('gibran') || t.includes('bobby') || t.includes('kaesang') || t.includes('psi');
    return true;
  } catch { return true; }
}

// SCRAPING IG @totalpolitikcom VIA GOOGLE - VERSI AMAN ANTI CRASH
async function fetchInstagramTotalPolitikViaGoogleSafe(hours) {
  // Timeout 4 detik biar gak bikin Vercel timeout 10 detik
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    // Coba 1 query aja yang paling stabil, sesuai screenshot lo: "instagram @totalpolitik"
    const q = 'instagram @totalpolitikcom';
    let tbs = 'qdr:d';
    if (hours === 1) tbs = 'qdr:h';
    if (hours === 6) tbs = 'qdr:h';

    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&tbs=${tbs}&num=20&hl=id&gl=ID`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'id-ID,id;q=0.9',
      },
      signal: controller.signal,
      cache: 'no-store',
      next: { revalidate: 60 }
    });

    clearTimeout(timeout);

    if (!res.ok) return [];
    const html = await res.text();
    if (!html || html.length < 1000) return [];
    // Kalau Google ngasih CAPTCHA page, langsung return []
    if (html.includes('Our systems have detected unusual traffic') || html.includes('unusual traffic') || html.includes('recaptcha')) {
      return [];
    }

    const $ = cheerio.load(html);
    const items = [];

    $('a[href*="instagram.com"]').each((i, el) => {
      try {
        let href = $(el).attr('href') || '';
        if (!href) return;
        if (href.startsWith('/url?q=')) {
          try {
            const u = new URL('https://www.google.com' + href);
            href = u.searchParams.get('q') || href;
          } catch {}
        }
        if (!href.includes('instagram.com')) return;
        if (!href.includes('totalpolitikcom')) {
          const txt = $(el).text().toLowerCase();
          if (!txt.includes('totalpolitik')) return;
        }

        let title = $(el).find('h3').text().trim() || $(el).text().trim();
        if (title.length < 15) {
          const parent = $(el).closest('div.g');
          const snippet = parent.find('div.VwiC3b, div.IsZvec').first().text().trim();
          if (snippet.length > title.length) title = snippet;
        }
        if (title.length < 15) return;

        items.push({
          id: `homeless-${i}-${Date.now()}`,
          source: 'Instagram • totalpolitikcom',
          time: 'Baru saja',
          minutesAgo: i * 3,
          title: title.slice(0, 130),
          url: href,
          link: href,
        });
      } catch {}
    });

    // dedup
    const seen = new Set();
    const uniq = [];
    for (const it of items) {
      if (!seen.has(it.link)) { seen.add(it.link); uniq.push(it); }
    }
    return uniq.slice(0, 30);
  } catch (e) {
    clearTimeout(timeout);
    return []; // JANGAN THROW, BIAR GAK CRASH PAGE
  }
}

async function fetchGoogleNewsRSSSafe(topicId, hours) {
  try {
    const baseQuery = TOPIC_QUERIES[topicId] || topicId;
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(baseQuery + ` when:${hours}h`)}&hl=id&gl=ID&ceid=ID:id`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(rssUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0' }, 
      signal: controller.signal,
      next: { revalidate: 60 }, 
      cache: 'no-store' 
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items = [];
    $('item').each((i, el) => {
      try {
        const titleFull = $(el).find('title').text() || '';
        const linkRaw = $(el).find('link').text() || '';
        const pubDateStr = $(el).find('pubDate').text() || '';
        const source = $(el).find('source').text() || titleFull.split(' - ').pop() || 'Google News';
        const pubDate = new Date(pubDateStr);
        const minutesAgo = isNaN(pubDate.getTime()) ? 9999 : Math.floor((Date.now() - pubDate.getTime()) / 60000);
        if (minutesAgo > hours * 60 + 60) return;
        const cleanTitle = titleFull.split(' - ')[0] || titleFull;
        if (topicId !== 'homeless_media' && !isRelevant(cleanTitle, topicId)) return;
        items.push({
          id: `${topicId}-${i}`,
          source: topicId === 'homeless_media' ? 'Instagram • totalpolitikcom' : source.trim().slice(0, 30),
          time: formatTimeAgo(minutesAgo),
          minutesAgo,
          title: cleanTitle,
          url: getCleanLink(linkRaw),
          link: getCleanLink(linkRaw),
        });
      } catch {}
    });
    items.sort((a,b) => a.minutesAgo - b.minutesAgo);
    return items.slice(0,50);
  } catch (e) {
    return [];
  }
}

async function fetchBMKG() {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { signal: controller.signal, next: { revalidate: 60 } });
    const json = await res.json();
    const info = json?.Infogempa?.gempa;
    if (!info) return null;
    return { id: 'bmkg-1', source: 'BMKG', time: 'Baru saja', minutesAgo: 0, title: `Gempa M ${info.Magnitude} ${info.Wilayah}`, url: 'https://www.bmkg.go.id', link: 'https://www.bmkg.go.id' };
  } catch { return null; }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filterRaw = searchParams.get('filter') || '1 Jam';
    let hours = 1;
    if (filterRaw.includes('1')) hours = 1;
    else if (filterRaw.includes('6')) hours = 6;
    else if (filterRaw.includes('24')) hours = 24;

    const bmkgLive = await fetchBMKG().catch(() => null);
    const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','homeless_media'];

    // Pakai allSettled biar 1 topic error gak bikin semua crash
    const results = await Promise.all(topicOrder.map(async (id) => {
      try {
        let headlines = [];
        if (id === 'homeless_media') {
          // Coba Google dulu (kayak screenshot lo), kalau gagal fallback ke RSS
          headlines = await fetchInstagramTotalPolitikViaGoogleSafe(hours);
          if (headlines.length === 0) {
            headlines = await fetchGoogleNewsRSSSafe(id, hours);
          }
          // Kalau masih 0, coba tanpa filter jam (24 jam)
          if (headlines.length === 0 && hours !== 24) {
            headlines = await fetchGoogleNewsRSSSafe(id, 24);
          }
        } else {
          headlines = await fetchGoogleNewsRSSSafe(id, hours);
        }
        if (id === 'bencana' && bmkgLive) headlines = [bmkgLive, ...headlines.filter(h => !h.isBMKG)].slice(0,50);
        headlines.sort((a,b) => (a.minutesAgo||9999) - (b.minutesAgo||9999));
        return {
          id,
          title: TOPIC_META[id].title,
          icon: TOPIC_META[id].icon,
          volume: `${headlines.length} berita`,
          lastUpdate: id === 'homeless_media' ? `IG @totalpolitikcom via Google • ${hours}j` : `dalam ${hours} jam terakhir`,
          headlines: headlines.slice(0,50),
        };
      } catch (e) {
        // JANGAN THROW, return kosong biar page tetap load
        return {
          id,
          title: TOPIC_META[id].title,
          icon: TOPIC_META[id].icon,
          volume: `0 berita`,
          lastUpdate: `dalam ${hours} jam terakhir`,
          headlines: [],
        };
      }
    }));

    return NextResponse.json({ success: true, filter: filterRaw, hours, lastSync: new Date().toISOString(), topics: results });
  } catch (e) {
    // Global fallback biar gak pernah "This page couldn't load"
    return NextResponse.json({ 
      success: false, 
      error: e.message, 
      topics: Object.keys(TOPIC_META).map(id => ({
        id,
        title: TOPIC_META[id].title,
        icon: TOPIC_META[id].icon,
        volume: '0 berita',
        lastUpdate: 'error, coba reload',
        headlines: []
      }))
    }, { status: 200 }); // return 200 bukan 500 biar gak trigger Next.js error boundary
  }
}
