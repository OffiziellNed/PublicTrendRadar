import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// 12 MENU - SERPER API UNTUK HOMELESS MEDIA IG @totalpolitikcom
// API KEY: dari user - 111b30b25adda0acef69489c7a9ada6b1715b48b
// SET DI VERCEL ENV: SERPER_API_KEY
const SERPER_KEY = process.env.SERPER_API_KEY || '111b30b25adda0acef69489c7a9ada6b1715b48b';

const TOPIC_QUERIES = {
  jakarta: ['Pemprov DKI Jakarta OR Gubernur DKI'],
  nasional: ['berita nasional Indonesia'],
  bencana: ['bencana alam OR gempa bumi OR banjir'],
  pdip: ['PDI Perjuangan OR PDIP'],
  megawati: ['Megawati Soekarnoputri OR Ketua Umum PDIP'],
  puan: ['Puan Maharani'],
  kritik_publik: [
    'kritik pemerintah OR kritik kebijakan OR kritik presiden OR kritik menteri',
    'demo OR unjuk rasa OR aksi massa OR aksi unjuk rasa OR demo mahasiswa OR demo buruh OR demo ojol',
    'tuai kritik OR banjir kritik OR panen kritik OR tuai kecaman OR dihujat OR dikecam OR kecaman publik OR viral kecam',
    'desak mundur OR tuntut mundur OR desak copot OR tuntut copot OR mosi tidak percaya OR lengser',
    'tolak RUU OR tolak kenaikan OR tolak pajak OR tolak Tapera OR protes kebijakan OR polemik OR kontroversi OR blunder',
    'DPR kritik OR DPRD kritik OR anggota dewan kritik OR legislator kritik OR interpelasi OR hak angket OR DPR kecam',
    'boikot OR petisi OR tagar protes OR suara rakyat OR keluhan warga OR aspirasi rakyat',
    'pengamat kritik OR pakar kritik OR aktivis kritik OR LSM kritik OR soroti kebijakan OR sindir OR sentil'
  ],
  dedi_mulyadi: ['Dedi Mulyadi OR Gubernur Jawa Barat'],
  keluarga_jokowi: ['Jokowi OR Gibran OR Keluarga Jokowi'],
  sosial: [
    'viral OR video viral OR tiktok viral OR viral medsos',
    'fenomena sosial OR curhatan netizen OR curhat viral OR netizen heboh',
    'kisah haru OR kisah mengharukan OR kisah inspiratif OR terharu OR bikin haru OR mengharukan',
    'cerita unik OR kejadian unik OR tradisi unik OR ritual unik OR fenomena aneh OR anomali',
    'di luar nalar OR gak masuk akal OR diluar nalar OR kejadian aneh OR ajaib OR absurd OR nyeleneh',
    'kejadian lucu OR tingkah lucu OR kelakuan lucu OR aksi kocak OR kocak OR ngakak OR bikin ngakak OR lawak OR humor warga',
    'emak-emak OR bapak-bapak OR bocil OR bocah OR kakek viral OR nenek viral OR ojol OR ojek online OR warga +62',
    'kelakuan warga OR tingkah warga OR potret warga OR prank OR usil OR jahil OR hajatan OR arisan OR gotong royong',
    'terharu OR syok OR kejutan OR kejutan ulang tahun OR ultah OR ulang tahun OR mengharukan',
    'klarifikasi OR ramai diperbincangkan OR media sosial OR OB OR office boy OR renovasi OR cari kerja OR transjakarta OR seleb tiktok OR romantis banget OR tak sengaja'
  ],
  kriminal: [
    'pembunuhan OR pembunuhan sadis',
    'narkoba OR sabu OR ganja OR ekstasi',
    'curanmor OR maling OR pencurian OR perampokan OR begal',
    'KDRT OR penganiayaan OR pengeroyokan OR pembacokan',
    'pemerkosaan OR penipuan OR mayat ditemukan OR mutilasi OR tawuran'
  ],
  homeless_media: ['site:instagram.com/totalpolitikcom'],
};

const TOPIC_FILTERS = {
  jakarta: ['jakarta','dki'],
  nasional: ['nasional','indonesia'],
  bencana: ['bencana','gempa','banjir','longsor','erupsi'],
  pdip: ['pdip','pdi perjuangan','pdi-p'],
  megawati: ['megawati','mega soekarnoputri','ketua umum pdip','bu mega'],
  puan: ['puan maharani','puan'],
  kritik_publik: ['kritik','kecam','demo','unjuk rasa','protes','desak','tuntut','tolak','polemik','kontroversi','dpr kritik','boikot','petisi','suara rakyat','pengamat kritik'],
  dedi_mulyadi: ['dedi mulyadi','kdm','gubernur jawa barat','kang dedi'],
  keluarga_jokowi: ['jokowi','gibran','kaesang','keluarga jokowi'],
  sosial: ['viral','fenomena sosial','kisah haru','cerita unik','fenomena aneh','lucu','kocak','ngakak','emak-emak','bapak-bapak','bocil','warga','nyeleneh','absurd','terharu','syok','kejutan','klarifikasi','ramai diperbincangkan','ob','renovasi'],
  kriminal: ['kriminal','bunuh','narkoba','curanmor','maling','kdrt','aniaya','perkosa','mayat'],
  homeless_media: ['totalpolitik','instagram','totalpolitikcom'], // loose karena udah spesifik
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
  homeless_media: { title: 'Homeless Media', icon: '📸' },
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

// ===== SERPER KHUSUS HOMELESS MEDIA - SCRAPING GOOGLE VIA API =====
async function fetchSerperHomeless(hours){
  try{
    if(!SERPER_KEY) return [];

    // Mapping hours ke tbs Google
    let tbs = 'qdr:d'; // default 24h
    if(hours <= 1) tbs = 'qdr:h';
    else if(hours <= 3) tbs = 'qdr:h3';
    else if(hours <= 6) tbs = 'qdr:h6';
    else tbs = 'qdr:d';

    // Query khusus IG Total Politik dari Google
    const body = {
      q: 'site:instagram.com/totalpolitikcom',
      gl: 'id',
      hl: 'id',
      num: 20,
      tbs: tbs
    };

    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), 5000);

    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeout);

    if(!res.ok){
      const txt = await res.text().catch(()=> '');
      console.log('Serper error', res.status, txt);
      return [];
    }

    const data = await res.json();
    const organic = data.organic || [];

    const items = [];
    let idx = 0;

    for(const r of organic){
      const link = r.link || '';
      const title = r.title || '';
      // Hanya ambil yang beneran instagram.com/totalpolitikcom
      if(!link.includes('instagram.com/totalpolitikcom')) continue;
      // Skip profile page doang, ambil post /p/ atau /reel/
      // Tapi profile page juga boleh biar gak kosong
      let minutesAgo = hours <= 1 ? 30 : hours <= 3 ? 90 : hours <= 6 ? 180 : 360;
      // Coba parse tanggal dari Serper jika ada
      if(r.date){
        const d = new Date(r.date);
        if(!isNaN(d.getTime())){
          minutesAgo = Math.floor((Date.now() - d.getTime())/60000);
        }
      }

      // Bersihkan title dari " - Instagram"
      const cleanTitle = title.replace(/ - Instagram.*$/i,'').replace(/Instagram.*$/i,'').trim().slice(0,130) || `Instagram @totalpolitikcom - ${link.split('/p/')[1]?.slice(0,20) || 'Post'}`;

      items.push({
        id: `homeless-serper-${idx}`,
        source: 'Instagram @totalpolitikcom',
        time: formatTimeAgo(minutesAgo),
        minutesAgo: minutesAgo,
        title: cleanTitle,
        url: link,
        link: link
      });
      idx++;
      if(items.length >= 25) break;
    }

    // Kalau Serper return 0 karena tbs terlalu ketat, coba lagi tanpa tbs (all time)
    if(items.length === 0){
      const retryBody = { q: 'site:instagram.com/totalpolitikcom', gl: 'id', hl: 'id', num: 20 };
      const res2 = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(retryBody),
        cache: 'no-store'
      });
      if(res2.ok){
        const data2 = await res2.json();
        const organic2 = data2.organic || [];
        for(const r of organic2){
          const link = r.link || '';
          if(!link.includes('instagram.com/totalpolitikcom')) continue;
          items.push({
            id: `homeless-serper-retry-${items.length}`,
            source: 'Instagram @totalpolitikcom',
            time: formatTimeAgo(720),
            minutesAgo: 720,
            title: (r.title || 'Instagram @totalpolitikcom').replace(/ - Instagram.*$/i,'').slice(0,130),
            url: link,
            link: link
          });
          if(items.length >= 25) break;
        }
      }
    }

    items.sort((a,b)=>a.minutesAgo-b.minutesAgo);
    return items;

  }catch(e){
    console.log('Serper exception', String(e));
    return [];
  }
}

async function fetchSingleQuery(q, hours){
  try{
    const fullQ = `${q} when:${hours}h`;
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(fullQ)}&hl=id&gl=ID&ceid=ID:id`;
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), 4000);
    const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    if(!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml);
  }catch{ return []; }
}

async function fetchRSS(topicId, hours){
  try{
    // HOMELESS MEDIA PAKAI SERPER
    if(topicId === 'homeless_media'){
      const serperItems = await fetchSerperHomeless(hours);
      if(serperItems.length > 0) return serperItems;
      // Fallback kalau Serper kosong / key belum set
      const fallback = await fetchSingleQuery('totalpolitikcom', 24);
      const items=[];
      for(let i=0;i<fallback.length;i++){
        const {titleFull,linkRaw,pubDateStr} = fallback[i];
        const pubDate = new Date(pubDateStr);
        const minutesAgo = isNaN(pubDate.getTime()) ? 120 : Math.floor((Date.now()-pubDate.getTime())/60000);
        if(minutesAgo > 24*60+180) continue;
        const cleanTitle = (titleFull.split(' - ')[0]||titleFull).trim();
        items.push({id:`hm-fb-${i}`,source:'Total Politik (Fallback)',time:formatTimeAgo(minutesAgo),minutesAgo,title:cleanTitle,url:linkRaw.replace(/&amp;/g,'&'),link:linkRaw.replace(/&amp;/g,'&')});
      }
      return items.slice(0,25);
    }

    const queries = TOPIC_QUERIES[topicId] || [topicId];
    let allRaw=[];
    const results = await Promise.allSettled(queries.map(q=>fetchSingleQuery(q, hours)));
    results.forEach(r=>{ if(r.status==='fulfilled' && Array.isArray(r.value)) allRaw=allRaw.concat(r.value); });
    const seen=new Set(); const items=[]; const requiredKeywords=TOPIC_FILTERS[topicId]||[];
    for(let i=0;i<allRaw.length;i++){
      const {titleFull,linkRaw,pubDateStr,source}=allRaw[i];
      const pubDate=new Date(pubDateStr);
      const minutesAgo=isNaN(pubDate.getTime())?9999:Math.floor((Date.now()-pubDate.getTime())/60000);
      if(minutesAgo>hours*60+180){ if(!(topicId==='sosial'||topicId==='kriminal'||topicId==='kritik_publik')||minutesAgo>24*60+180) continue; }
      const cleanTitle=(titleFull.split(' - ')[0]||titleFull).trim(); if(!cleanTitle) continue;
      const key=cleanTitle.toLowerCase(); if(seen.has(key)) continue; seen.add(key);
      const t=key;
      if(requiredKeywords.length>0){ if(!requiredKeywords.some(k=>t.includes(k))) continue; }
      if(topicId==='megawati'){ const atlet=['voli','volley','pevoli','hangestri','red sparks','megatron','proliga','timnas voli','atlet voli','voli putri']; if(atlet.some(k=>t.includes(k))) continue; }
      items.push({id:`${topicId}-${i}`,source:(source||'Google News').slice(0,30),time:formatTimeAgo(minutesAgo),minutesAgo,title:cleanTitle,url:linkRaw.replace(/&amp;/g,'&'),link:linkRaw.replace(/&amp;/g,'&')});
    }
    items.sort((a,b)=>a.minutesAgo-b.minutesAgo);
    return items.slice(0,25);
  }catch{ return []; }
}

export async function GET(req){
  try{
    const { searchParams } = new URL(req.url);
    const filterRaw = searchParams.get('filter') || '3 Jam';
    let hours=3; if(filterRaw.includes('6')) hours=6; else if(filterRaw.includes('24')) hours=24; else if(filterRaw.includes('3')) hours=3;
    const topicOrder=['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','sosial','kriminal','homeless_media'];
    const results = await Promise.all(topicOrder.map(async (id)=>{
      const headlines = await fetchRSS(id, hours);
      const clustered = clusterHeadlines(headlines);
      return { id, title: TOPIC_META[id].title, icon: TOPIC_META[id].icon, volume: `${headlines.length} berita • ${clustered.length} isu`, lastUpdate: `dalam ${id==='homeless_media'?hours:hours} jam - ${id==='homeless_media'?'SERPER IG':''}`, headlines, clusters: clustered };
    }));
    return NextResponse.json({ success:true, filter:filterRaw, hours, lastSync:new Date().toISOString(), topics: results }, { status:200 });
  }catch(e){
    return NextResponse.json({ success:false, error:String(e), topics:[] }, { status:200 });
  }
}
