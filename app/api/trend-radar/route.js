import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
export const dynamic = 'force-dynamic';

// PORSI BESAR DI MEGA, PUAN, KRITIK - JAKARTA DIPANGKAS
const TOPIC_QUERIES = {
  jakarta: 'Pemprov DKI Jakarta OR Gubernur DKI Jakarta OR DPRD DKI Jakarta OR Balai Kota DKI',
  nasional: 'berita nasional Indonesia',
  bencana: 'bencana alam OR gempa bumi OR banjir',
  pdip: 'PDI Perjuangan',
  megawati: 'Megawati Soekarnoputri OR Megawati Soekarno Putri OR Ketua Umum PDI Perjuangan OR Ketum PDIP OR Bu Mega OR Ibu Mega OR Megawati',
  puan: 'Puan Maharani OR Ketua DPR Puan Maharani OR Puan Ketua DPR OR Ketua DPR RI',
  kritik_publik: 'kritik pemerintah OR kritik kebijakan OR demo mahasiswa OR aksi demo OR unjuk rasa OR DPR kritik pemerintah OR DPRD kritik OR protes pemerintah OR kecam pemerintah OR soroti pemerintah OR tolak kebijakan OR aksi massa OR mahasiswa protes',
  dedi_mulyadi: 'Dedi Mulyadi OR KDM OR Gubernur Jawa Barat OR Gubernur Jabar',
  keluarga_jokowi: 'Jokowi OR Joko Widodo OR Gibran Rakabuming OR Bobby Nasution OR Kahiyang Ayu OR Kaesang Pangarep',
  homeless_media: 'totalpolitik OR pinterpolitik OR asumsico OR narasi.tv OR matanarasi OR watchdoc OR mojok OR tirto.id OR katadata OR projectmultatuli OR kompas.com OR detik.com OR cnnindonesia',
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
  if (topicId === 'jakarta') {
    // PANGKAS JAKARTA - harus ada unsur pemerintahan DKI, bukan sekedar nyebut Jakarta
    return t.includes('jakarta') && (
      t.includes('pemprov') || t.includes('dki') || t.includes('gubernur') || t.includes('dprd') || 
      t.includes('balai kota') || t.includes('walikota') || t.includes('pemkot') || t.includes('pramono') ||
      t.includes('dinas') || t.includes('dishub') || t.includes('disdik') || t.includes('satpol pp')
    );
  }
  if (topicId === 'megawati') {
    // BOOST MEGA - longgarin
    return t.includes('megawati') || t.includes('bu mega') || t.includes('ibu mega') || 
           t.includes('ketum pdip') || t.includes('ketua umum pdi') || t.includes('ketum pdi') ||
           t.includes('megawati soekarno') || t.includes('megawati soekarno putri');
  }
  if (topicId === 'puan') {
    // BOOST PUAN - longgarin
    return t.includes('puan') || t.includes('puan maharani') || 
           (t.includes('ketua dpr') && (t.includes('puan') || true)) || // ketua DPR pasti Puan
           t.includes('ketua dpr ri');
  }
  if (topicId === 'kritik_publik') {
    // BOOST KRITIK - demo, unjuk rasa, protes semua masuk
    const hasAksi = t.includes('kritik') || t.includes('demo') || t.includes('unjuk rasa') || t.includes('unjukrasa') ||
                    t.includes('protes') || t.includes('kecam') || t.includes('soroti') || t.includes('tolak') ||
                    t.includes('desak') || t.includes('aksi massa') || t.includes('aksi');
    // target gak wajib ketat, tapi kalau ada aksi udah cukup
    return hasAksi;
  }
  if (topicId === 'pdip') return t.includes('pdip') || t.includes('pdi perjuangan');
  if (topicId === 'bencana') return t.includes('gempa') || t.includes('banjir') || t.includes('bencana') || t.includes('erupsi') || t.includes('longsor') || t.includes('bmkg');
  if (topicId === 'dedi_mulyadi') return t.includes('dedi mulyadi') || t.includes('kdm') || t.includes('gubernur jawa barat') || t.includes('gubernur jabar') || t.includes('kang dedi');
  if (topicId === 'keluarga_jokowi') return t.includes('jokowi') || t.includes('gibran') || t.includes('bobby nasution') || t.includes('kahiyang') || t.includes('kaesang') || t.includes('psi');
  if (topicId === 'homeless_media') return true;
  return true;
}

async function fetchGoogleNewsRSS(topicId, hours) {
  // JAKARTA DIPANGKAS JAMNYA, MEGA/PUAN/KRITIK DI-BOOST JAMNYA
  let hoursForTopic = hours;
  if (topicId === 'jakarta') hoursForTopic = 1; // Jakarta selalu 1 jam aja biar kecil
  if (['megawati','puan','kritik_publik'].includes(topicId)) hoursForTopic = 24; // 3 menu ini selalu 24 jam biar gede

  const baseQuery = TOPIC_QUERIES[topicId] || topicId;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(baseQuery + ` when:${hoursForTopic}h`)}&hl=id&gl=ID&ceid=ID:id`;
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
      if (minutesAgo > hoursForTopic * 60 + 60) return;
      const cleanTitle = titleFull.split(' - ')[0] || titleFull;
      if (!isRelevant(cleanTitle, topicId)) return;
      items.push({
        id: `${topicId}-${i}`,
        source: source.trim().slice(0, 30),
        time: formatTimeAgo(minutesAgo),
        minutesAgo,
        title: cleanTitle,
        url: getCleanLink(linkRaw),
        link: getCleanLink(linkRaw),
      });
    });
    items.sort((a,b) => a.minutesAgo - b.minutesAgo);
    
    // PANGKAS JAKARTA MAX 15, YANG LAIN BOLEH 200
    if (topicId === 'jakarta') return items.slice(0,15);
    if (['megawati','puan','kritik_publik'].includes(topicId)) return items.slice(0,200);
    return items.slice(0,60);
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
    let headlines = await fetchGoogleNewsRSS(id, hours);
    if (id === 'bencana' && bmkgLive) headlines = [bmkgLive, ...headlines.filter(h => !h.isBMKG)].slice(0,200);
    headlines.sort((a,b) => (a.minutesAgo||9999) - (b.minutesAgo||9999));
    return {
      id,
      title: TOPIC_META[id].title,
      icon: TOPIC_META[id].icon,
      volume: `${headlines.length} berita`,
      lastUpdate: id === 'jakarta' ? 'dipangkas max 15' : (['megawati','puan','kritik_publik'].includes(id) ? `dalam 24 jam (boost)` : `dalam ${hours} jam terakhir`),
      headlines: headlines.slice(0,200),
      isPriority: ['megawati','puan','kritik_publik'].includes(id),
    };
  }));

  return NextResponse.json({ success: true, filter: filterRaw, hours, lastSync: new Date().toISOString(), topics: results });
}
