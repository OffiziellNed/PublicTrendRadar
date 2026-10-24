import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// 11 MENU - FAIR SCRAPING - SOSIAL & KRIMINAL DIJAMIN GAK CUMA 1 LAGI
const TOPIC_QUERIES = {
  jakarta: ['Jakarta', 'DKI Jakarta'],
  nasional: ['berita nasional'],
  bencana: ['gempa OR banjir OR longsor'],
  pdip: ['PDIP OR PDI Perjuangan'],
  megawati: ['Megawati Soekarnoputri OR Ketua Umum PDIP'],
  puan: ['Puan Maharani'],
  kritik_publik: ['kritik pemerintah OR demo OR unjuk rasa'],
  dedi_mulyadi: ['Dedi Mulyadi OR KDM'],
  keluarga_jokowi: ['Jokowi OR Gibran OR Keluarga Jokowi'],
  // SOSIAL & VIRAL - 10 KRITERIA FAIR
  sosial: [
    'viral',
    'fenomena sosial',
    'curhatan netizen',
    'video viral',
    'kisah haru OR kisah mengharukan',
    'cerita unik',
    'fenomena aneh OR anomali',
    'inspiratif OR kisah inspiratif',
    'tiktok viral OR viral medsos',
    'kejadian lucu OR tradisi unik OR nenek viral'
  ],
  // KRIMINAL - 10 KRITERIA FAIR
  kriminal: [
    'kriminal',
    'pembunuhan',
    'narkoba OR sabu OR ganja',
    'curanmor OR maling OR pencurian',
    'KDRT OR kekerasan rumah tangga',
    'perampokan OR begal OR jambret',
    'pemerkosaan OR pelecehan seksual',
    'penganiayaan OR pengeroyokan OR pembacokan',
    'penipuan OR penggelapan',
    'mayat ditemukan OR mutilasi OR tawuran'
  ],
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
  sosial: { title: 'Sosial & Viral', icon: '💬' },
  kriminal: { title: 'Kriminal', icon: '🦹' },
};

function formatTimeAgo(minutes) {
  if (minutes < 60) return `${minutes}m lalu`;
  if (minutes < 1440) return `${Math.floor(minutes/60)}j lalu`;
  return `${Math.floor(minutes/1440)}h lalu`;
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const getTag = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i');
      const m = itemXml.match(r);
      return m ? m[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') : '';
    };
    items.push({ titleFull: getTag('title'), linkRaw: getTag('link'), pubDateStr: getTag('pubDate'), source: getTag('source') });
  }
  return items;
}

const STOPWORDS = new Set(['dan','di','yang','untuk','dari','dengan','pada','ke','ini','itu','adalah','akan','bisa','jadi','soal','tentang','dalam','secara','oleh','sebagai','saat','tengah','juga','sudah','telah','buka','ada','jadi','jika','atau','oleh','para','sebuah','tersebut','agar','hingga','bahwa','karena','dalam','kepada','namun','tetapi']);
function normalizeWords(title) { return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w)); }
function jaccardSimilarity(a,b){ const aW=new Set(normalizeWords(a)), bW=new Set(normalizeWords(b)); if(!aW.size||!bW.size) return 0; let inter=0; for(const w of aW) if(bW.has(w)) inter++; const union=aW.size+bW.size-inter; return union===0?0:inter/union; }
function clusterHeadlines(headlines, threshold=0.38){
  const clusters=[]; const sorted=[...headlines].sort((a,b)=>a.minutesAgo-b.minutesAgo);
  for(const h of sorted){ let found=false; for(const cluster of clusters){ const rep=cluster[0]; const sim=jaccardSimilarity(h.title, rep.title); const sameYear=(h.title.match(/2029|2024|2025/) && rep.title.match(/2029|2024|2025/)); if(sim>=threshold || (sim>=0.28 && sameYear)){ cluster.push(h); cluster.sort((a,b)=>a.minutesAgo-b.minutesAgo); found=true; break; } } if(!found) clusters.push([h]); }
  return clusters.map((cluster, idx)=>{ const main=cluster[0]; const allSources=[...new Set(cluster.map(c=>c.source))]; return { id:`cluster-${idx}`, isCluster:cluster.length>1, count:cluster.length, title:main.title, mainUrl:main.url, time:main.time, minutesAgo:main.minutesAgo, sources:allSources, headlines:cluster }; });
}

async function fetchSingleQuery(q, hours){
  try{
    const fullQ = `${q} when:${hours}h`;
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(fullQ)}&hl=id&gl=ID&ceid=ID:id`;
    const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
    if(!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml);
  }catch{ return []; }
}

async function fetchRSS(topicId, hours){
  try{
    const queries = TOPIC_QUERIES[topicId] || [topicId];
    let allRaw = [];

    // FAIR: untuk semua topic, fetch semua sub-query terus gabung
    const promises = queries.map(q => fetchSingleQuery(q, hours));
    const results = await Promise.all(promises);
    results.forEach(r => { allRaw = allRaw.concat(r); });

    // dedup by title
    const seen = new Set();
    const items=[];
    for(let i=0;i<allRaw.length;i++){
      const { titleFull, linkRaw, pubDateStr, source } = allRaw[i];
      const pubDate = new Date(pubDateStr);
      const minutesAgo = isNaN(pubDate.getTime()) ? 9999 : Math.floor((Date.now()-pubDate.getTime())/60000);
      if(minutesAgo > hours*60 + 180) continue;
      const cleanTitle = (titleFull.split(' - ')[0] || titleFull).trim();
      if(!cleanTitle) continue;
      const key = cleanTitle.toLowerCase();
      if(seen.has(key)) continue;
      seen.add(key);
      const t = cleanTitle.toLowerCase();

      // FIX MEGAWATI ATLET
      if(topicId==='megawati'){
        const atletKeywords = ['voli','volley','pevoli','hangestri','red sparks','megatron','proliga','timnas voli','atlet voli','voli putri','megawati hangestri'];
        if(atletKeywords.some(k => t.includes(k))) continue;
      }
      if(topicId==='jakarta' && !(t.includes('jakarta')||t.includes('dki'))) continue;
      if(topicId==='puan' && !t.includes('puan')) continue;

      items.push({ id:`${topicId}-${i}-${Math.random().toString(36).slice(2,6)}`, source:(source||'Google News').slice(0,30), time:formatTimeAgo(minutesAgo), minutesAgo, title:cleanTitle, url:linkRaw.replace(/&amp;/g,'&'), link:linkRaw.replace(/&amp;/g,'&') });
    }
    items.sort((a,b)=>a.minutesAgo-b.minutesAgo);
    // FAIR: max 20 biar semua menu balance, gak ada yang 40 vs 1
    return items.slice(0,20);
  }catch{ return []; }
}

export async function GET(req){
  try{
    const { searchParams } = new URL(req.url);
    const filterRaw = searchParams.get('filter') || '3 Jam';
    let hours = 3;
    if(filterRaw.includes('6')) hours = 6;
    else if(filterRaw.includes('24')) hours = 24;
    else if(filterRaw.includes('3')) hours = 3;

    const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','sosial','kriminal'];

    const results = await Promise.all(topicOrder.map(async (id)=>{
      const headlines = await fetchRSS(id, hours);
      const clustered = clusterHeadlines(headlines);
      return {
        id,
        title: TOPIC_META[id].title,
        icon: TOPIC_META[id].icon,
        volume: `${headlines.length} berita • ${clustered.length} isu`,
        lastUpdate: `dalam ${hours} jam - FAIR REAL`,
        headlines,
        clusters: clustered,
      };
    }));

    return NextResponse.json({ success:true, filter:filterRaw, hours, lastSync:new Date().toISOString(), topics: results }, { status:200 });
  }catch(e){
    return NextResponse.json({ success:false, error:String(e), topics:[] }, { status:200 });
  }
}
