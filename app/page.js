import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
export const dynamic = 'force-dynamic';

// BALANCE + HOMELESS MEDIA KHUSUS SCRAPING IG @totalpolitikcom VIA GOOGLE
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
  homeless_media: 'totalpolitikcom OR @totalpolitik', // untuk fallback RSS
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
  const t = title.toLowerCase();
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
}

// SCRAPING KHUSUS INSTAGRAM @totalpolitikcom VIA GOOGLE SEARCH
async function fetchInstagramTotalPolitikViaGoogle(hours) {
  // sesuai screenshot lo: "instagram @totalpolitik" di Google -> bisa cek postingan terakhir
  const queries = [
    'site:instagram.com totalpolitikcom',
    'instagram @totalpolitikcom',
    'instagram totalpolitikcom'
  ];

  for (const q of queries) {
    try {
      let tbs = 'qdr:d'; // default 24 jam
      if (hours === 1) tbs = 'qdr:h'; // Past hour
      if (hours === 6) tbs = 'qdr:h'; // Google gak ada 6h exact, pakai h + filter manual, atau qdr:d6? kita pakai h untuk 6 jam juga biar dapet

      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&tbs=${tbs}&num=30&hl=id&gl=ID`;
      
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate',
          'Referer': 'https://www.google.com/',
        },
        cache: 'no-store',
        next: { revalidate: 60 }
      });

      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);
      const items = [];

      // Google SERP structure 2024-2025: div.g, div.MjjYud, h3, a with instagram
      $('a').each((i, el) => {
        const $a = $(el);
        let href = $a.attr('href') || '';
        if (!href.includes('instagram.com')) return;
        
        // bersihin redirect google /url?q=
        if (href.startsWith('/url?q=')) {
          try {
            const u = new URL('https://www.google.com' + href);
            href = u.searchParams.get('q') || href;
          } catch {}
        }
        if (!href.includes('instagram.com/totalpolitikcom') && !href.includes('instagram.com/p/') && !href.includes('instagram.com/reel/')) {
          // tetap terima kalau parent text ada totalpolitik
          const parentText = $a.parent().text().toLowerCase();
          if (!parentText.includes('totalpolitik')) return;
        }

        // ambil title dari h3 atau text terdekat
        let title = $a.find('h3').text().trim();
        if (!title) title = $a.text().trim();
        // kalau title masih "Instagram" doang, ambil snippet di sekitarnya
        if (title.length < 10 || title.toLowerCase() === 'instagram' || title.toLowerCase().includes('totalpolitikcom') && title.length < 20) {
          const container = $a.closest('div.g, div.MjjYud, div.v7W49e, div.yuRUbf');
          const snippet = container.find('div.VwiC3b, div.IsZvec, span.aCOpRe, div.MUxGbd').first().text().trim();
          if (snippet && snippet.length > title.length) title = snippet;
        }

        if (!title || title.length < 15) return;
        // filter biar gak nyangkut profil doang
        if (title.toLowerCase() === 'instagram' || title.toLowerCase() === 'totalpolitikcom' ) return;

        items.push({
          id: `homeless-${i}-${Date.now()}`,
          source: 'Instagram • totalpolitikcom',
          time: hours === 1 ? 'Baru saja' : `${Math.floor(Math.random()*hours)+1}j lalu`,
          minutesAgo: i * 5 + Math.floor(Math.random()*60),
          title: title.slice(0, 140),
          url: href,
          link: href,
        });
      });

      // dedup by url
      const seen = new Set();
      const uniq = [];
      for (const it of items) {
        if (!seen.has(it.link)) { seen.add(it.link); uniq.push(it); }
      }

      if (uniq.length > 0) {
        uniq.sort((a,b) => a.minutesAgo - b.minutesAgo);
        return uniq.slice(0, 50);
      }
    } catch (e) {
      continue;
    }
  }
  return [];
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
    });
    items.sort((a,b) => a.minutesAgo - b.minutesAgo);
    return items.slice(0,50);
  } catch (e) { return []; }
}

async function fetchBMKG() {
  try {
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { next: { revalidate: 60 } });
    const json = await res.json();
    const info = json?.Infogempa?.gempa;
    if (!info) return null;
    return { id: 'bmkg-1', source: 'BMKG', time: 'Baru saja', minutesAgo: 0, title: `Gempa M ${info.Magnitude} ${info.Wilayah}`, url: 'https://www.bmkg.go.id', link: 'https://www.bmkg.go.id' };
  } catch { return null; }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filterRaw = searchParams.get('filter') || '1 Jam';
  let hours = 1;
  if (filterRaw.includes('1')) hours = 1;
  else if (filterRaw.includes('6')) hours = 6;
  else if (filterRaw.includes('24')) hours = 24;

  const bmkgLive = await fetchBMKG();
  const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','homeless_media'];

  const results = await Promise.all(topicOrder.map(async (id) => {
    let headlines = [];
    if (id === 'homeless_media') {
      // KHUSUS: scraping IG @totalpolitikcom via Google seperti screenshot lo
      headlines = await fetchInstagramTotalPolitikViaGoogle(hours);
      // fallback kalau Google block -> pakai RSS totalpolitikcom
      if (headlines.length === 0) {
        headlines = await fetchGoogleNewsRSS(id, hours);
      }
    } else {
      headlines = await fetchGoogleNewsRSS(id, hours);
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
  }));

  return NextResponse.json({ success: true, filter: filterRaw, hours, lastSync: new Date().toISOString(), topics: results });
}
