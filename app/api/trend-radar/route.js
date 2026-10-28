import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// 12 MENU - FIX HOMELESS MEDIA KHUSUS IG @totalpolitikcom VIA GOOGLE.COM/SEARCH
// 11 MENU LAMA INTACT - HOMELESS MEDIA SCRAPING GOOGLE SEARCH INSTAGRAM
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
  // HOMELESS MEDIA - AKUN KHUSUS TOTAL POLITIK IG
  homeless_media: [
    'site:https://www.google.com/search?q=instagram.com/totalpolitikcom&sca_esv=13a7a96266065e97&sxsrf=APpeQnvjKRDD566SgsopyghtwpXE4pRb1g:1793176494559&source=lnt&tbs=qdr:d&sa=X&ved=2ahUKEwiW0ej_ptyXAxUSgGMGHeuTCYkQpwV6BAgIEAc&biw=2133&bih=1012&dpr=0.9',
    'instagram @totalpolitikcom',
    'totalpolitikcom instagram'
  ],
};

const TOPIC_FILTERS = {
  jakarta: ['jakarta','dki'],
  nasional: ['nasional','indonesia'],
  bencana: ['bencana','gempa','banjir','longsor','erupsi'],
  pdip: ['pdip','pdi perjuangan','pdi-p'],
  megawati: ['megawati','mega soekarnoputri','ketua umum pdip','bu mega'],
  puan: ['puan maharani','puan'],
  kritik_publik: [
    'kritik','mengkritik','dikritik','kecam','mengkecam','dikecam','kecaman','soroti','disoroti','sentil','disentil','sindir','disindir',
    'demo','unjuk rasa','aksi massa','aksi unjuk rasa','demo mahasiswa','demo buruh','protes','memprotes','diprotes',
    'desak','tuntut','mosi','lengser','copot','pecat','mundur','desak mundur','tuntut mundur',
    'tolak','penolakan','tolak ruu','tolak kenaikan','polemik','kontroversi','blunder','gagalkan','batalkan',
    'tuai kritik','banjir kritik','panen kritik','tuai kecaman','dihujat','hujat','viral kecam','kecaman publik',
    'dpr kritik','dprd kritik','anggota dewan','legislator','komisi dpr','interpelasi','hak angket','dewan kritik',
    'boikot','petisi','tagar','suara rakyat','keluhan warga','aspirasi rakyat','aspirasi','pengamat kritik','pakar kritik','aktivis kritik','lsm','lsm kritik'
  ],
  dedi_mulyadi: ['dedi mulyadi','kdm','gubernur jawa barat','kang dedi'],
  keluarga_jokowi: ['jokowi','gibran','kaesang','keluarga jokowi'],
  sosial: [
    'viral','video viral','tiktok','fenomena sosial','curhatan','curhat','netizen','kisah haru','mengharukan','inspiratif','cerita unik','kejadian unik','tradisi unik','fenomena aneh','anomali','aneh',
    'lucu','kocak','ngakak','bikin ngakak','lawak','humor','tingkah','kelakuan','aksi kocak','emak-emak','bapak-bapak','bocil','bocah','kakek','nenek','ojol','ojek','warga','warga +62','kelakuan warga','tingkah warga','potret warga',
    'nyeleneh','absurd','ajaib','nyentrik','prank','usil','jahil','hajatan','arisan','gotong royong','di luar nalar','diluar nalar','gak masuk akal','meme',
    'terharu','syok','kejutan','kejutan ulang tahun','ultah','ulang tahun','klarifikasi','ramai diperbincangkan','media sosial','ob','office boy','renovasi','bikin haru','cari kerja','transjakarta','seleb tiktok','selebgram','tak sengaja','salah kira','romantis','romantis banget','viral di medsos','diperbincangkan','makan cat'
  ],
  kriminal: ['kriminal','bunuh','narkoba','sabu','ganja','curanmor','maling','curi','rampok','begal','jambret','kdrt','aniaya','keroyok','bacok','tembak','perkosa','leceh','tipu','mayat','mutilasi','tawuran'],
  // HOMELESS MEDIA - LOOSE FILTER - KARENA UDAH SPESIFIK AKUN
  homeless_media: ['totalpolitik','total politik','instagram','totalpolitikcom'],
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

// KHUSUS HOMELESS MEDIA - SCRAPING GOOGLE.COM/SEARCH SITE:INSTAGRAM.COM/TOTALPOLITIKCOM
async function fetchGoogleInstagram(hours){
  try{
    // Mapping hours ke tbs google: h = past hour, d = past 24h
    let tbs = 'qdr:d'; // default 24h
    if(hours <= 1) tbs = 'qdr:h';
    else if(hours <= 3) tbs = 'qdr:h3'; // google support qdr:h3
    else if(hours <= 6) tbs = 'qdr:h6';
    else tbs = 'qdr:d';

    const queries = [
      `site:instagram.com/totalpolitikcom`,
      `total politik instagram`,
      `@totalpolitikcom instagram`
    ];

    let allItems = [];

    for(const q of queries){
      try{
        const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&tbs=${tbs}&num=20`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.google.com/',
          },
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeout);
        if(!res.ok) continue;
        const html = await res.text();

        // Detect block
        if(html.includes('Our systems have detected unusual traffic') || html.includes('/sorry/') || html.includes('CAPTCHA') || html.length < 1000) continue;

        // Extract titles from h3
        const titles = [];
        const h3Regex = /<h3[^>]*>(.*?)<\/h3>/gi;
        let h3Match;
        while((h3Match = h3Regex.exec(html)) !== null){
          const txt = h3Match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g,' ').trim();
          if(txt && txt.length > 5 && !txt.toLowerCase().includes('people also ask')) titles.push(txt);
        }

        // Extract instagram links - both direct and /url?q=
        const seen = new Set();
        const linkPatterns = [
          /https:\/\/www\.instagram\.com\/totalpolitikcom\/p\/[A-Za-z0-9_-]+/gi,
          /https:\/\/www\.instagram\.com\/totalpolitikcom/gi,
          /\/url\?q=https:\/\/www\.instagram\.com\/totalpolitikcom[^&"]+/gi
        ];

        let linkIdx = 0;
        for(const pat of linkPatterns){
          let m;
          while((m = pat.exec(html)) !== null){
            let rawUrl = m[0];
            // Decode /url?q=
            if(rawUrl.startsWith('/url?q=')){
              rawUrl = decodeURIComponent(rawUrl.replace('/url?q=','').split('&')[0]);
            }
            rawUrl = rawUrl.split('&')[0].split('"')[0];
            if(seen.has(rawUrl)) continue;
            if(!rawUrl.includes('totalpolitikcom')) continue;
            seen.add(rawUrl);

            // Estimate minutesAgo from snippet around link
            const pos = m.index;
            const context = html.slice(Math.max(0, pos-800), pos+800);
            let minutesAgo = hours <=1 ? 30 : hours <=6 ? 180 : 720;
            // Try parse "X menit yang lalu" / "X jam yang lalu" / "X hours ago"
            const timeRegex = /(\d+)\s*(menit|jam|minute|hour|hours)\s*(yang\s*lalu|ago)/i;
            const tm = context.match(timeRegex);
            if(tm){
              const num = parseInt(tm[1]);
              const unit = tm[2].toLowerCase();
              if(unit.includes('menit') || unit.includes('minute')) minutesAgo = num;
              else if(unit.includes('jam') || unit.includes('hour')) minutesAgo = num*60;
            }

            const title = titles[linkIdx] || titles[0] || `Instagram @totalpolitikcom - ${rawUrl.split('/p/')[1]?.slice(0,30) || 'Post'}`;
            linkIdx++;

            allItems.push({
              id: `homeless-${allItems.length}`,
              source: 'Instagram @totalpolitikcom',
              time: formatTimeAgo(minutesAgo),
              minutesAgo: minutesAgo,
              title: title.replace(/ - Instagram.*$/i,'').replace(/Instagram.*$/i,'').trim().slice(0,120),
              url: rawUrl,
              link: rawUrl
            });
            if(allItems.length >= 30) break;
          }
          if(allItems.length >= 30) break;
        }

      }catch(e){ continue; }
    }

    // Deduplicate by url
    const uniq = [];
    const seenUrl = new Set();
    for(const it of allItems){
      if(seenUrl.has(it.url)) continue;
      seenUrl.add(it.url);
      uniq.push(it);
    }
    uniq.sort((a,b)=>a.minutesAgo-b.minutesAgo);
    return uniq.slice(0,25);

  }catch{ return []; }
}

async function fetchSingleQuery(q, hours){
  try{
    const fullQ = `${q} when:${hours}h`;
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(fullQ)}&hl=id&gl=ID&ceid=ID:id`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    if(!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml);
  }catch{ return []; }
}

async function fetchRSS(topicId, hours){
  try{
    // HOMELESS MEDIA PAKAI GOOGLE.COM SEARCH KHUSUS IG
    if(topicId === 'homeless_media'){
      const igItems = await fetchGoogleInstagram(hours);
      if(igItems.length > 0) return igItems;
      // Fallback ke RSS jika Google Search diblock
      const fallback = await fetchSingleQuery('totalpolitikcom', 24);
      const items = [];
      for(let i=0;i<fallback.length;i++){
        const { titleFull, linkRaw, pubDateStr } = fallback[i];
        const pubDate = new Date(pubDateStr);
        const minutesAgo = isNaN(pubDate.getTime()) ? 60 : Math.floor((Date.now()-pubDate.getTime())/60000);
        if(minutesAgo > 24*60+180) continue;
        const cleanTitle = (titleFull.split(' - ')[0] || titleFull).trim();
        if(!cleanTitle.toLowerCase().includes('totalpolitik')) continue;
        items.push({ id:`homeless-${i}`, source:'Instagram @totalpolitikcom', time:formatTimeAgo(minutesAgo), minutesAgo, title:cleanTitle, url:linkRaw.replace(/&amp;/g,'&'), link:linkRaw.replace(/&amp;/g,'&') });
      }
      items.sort((a,b)=>a.minutesAgo-b.minutesAgo);
      return items.slice(0,25);
    }

    const queries = TOPIC_QUERIES[topicId] || [topicId];
    let allRaw = [];
    const results = await Promise.allSettled(queries.map(q => fetchSingleQuery(q, hours)));
    results.forEach(r => { if(r.status==='fulfilled' && Array.isArray(r.value)) allRaw = allRaw.concat(r.value); });

    const seen = new Set();
    const items=[];
    const requiredKeywords = TOPIC_FILTERS[topicId] || [];

    for(let i=0;i<allRaw.length;i++){
      const { titleFull, linkRaw, pubDateStr, source } = allRaw[i];
      const pubDate = new Date(pubDateStr);
      const minutesAgo = isNaN(pubDate.getTime()) ? 9999 : Math.floor((Date.now()-pubDate.getTime())/60000);
      if(minutesAgo > hours*60 + 180) {
        if(!(topicId==='sosial' || topicId==='kriminal' || topicId==='kritik_publik') || minutesAgo > 24*60+180) continue;
      }
      const cleanTitle = (titleFull.split(' - ')[0] || titleFull).trim();
      if(!cleanTitle) continue;
      const key = cleanTitle.toLowerCase();
      if(seen.has(key)) continue;
      seen.add(key);
      const t = key;
      if(requiredKeywords.length > 0){
        if(!requiredKeywords.some(k => t.includes(k))) continue;
      }
      if(topicId==='megawati'){
        const atletKeywords = ['voli','volley','pevoli','hangestri','red sparks','megatron','proliga','timnas voli','atlet voli','voli putri'];
        if(atletKeywords.some(k => t.includes(k))) continue;
      }
      items.push({ id:`${topicId}-${i}`, source:(source||'Google News').slice(0,30), time:formatTimeAgo(minutesAgo), minutesAgo, title:cleanTitle, url:linkRaw.replace(/&amp;/g,'&'), link:linkRaw.replace(/&amp;/g,'&') });
    }
    items.sort((a,b)=>a.minutesAgo-b.minutesAgo);
    return items.slice(0,25);
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

    const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','sosial','kriminal','homeless_media'];

    const results = await Promise.all(topicOrder.map(async (id)=>{
      const headlines = await fetchRSS(id, hours);
      const clustered = clusterHeadlines(headlines);
      return { id, title: TOPIC_META[id].title, icon: TOPIC_META[id].icon, volume: `${headlines.length} berita • ${clustered.length} isu`, lastUpdate: `dalam ${id==='homeless_media' ? hours : hours} jam - IG TOTAL POLITIK`, headlines, clusters: clustered };
    }));

    return NextResponse.json({ success:true, filter:filterRaw, hours, lastSync:new Date().toISOString(), topics: results }, { status:200 });
  }catch(e){
    return NextResponse.json({ success:false, error:String(e), topics:[] }, { status:200 });
  }
}
