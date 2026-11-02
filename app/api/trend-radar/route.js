import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// 12 MENU FINAL - KRITIK PUBLIK FIX POLITIK INDONESIA ONLY (NO SPORT, NO LUAR NEGERI)
// 11 MENU LAIN INTACT DARI SCREENSHOT 453

const TOPIC_QUERIES = {
  jakarta: ['Pemprov DKI Jakarta OR Gubernur DKI'],
  nasional: ['berita nasional Indonesia'],
  bencana: ['bencana alam OR gempa bumi OR banjir'],
  pdip: ['PDI Perjuangan OR PDIP'],
  megawati: ['Megawati Soekarnoputri OR Ketua Umum PDIP'],
  puan: ['Puan Maharani'],
  // KRITIK PUBLIK - 8 QUERY KHUSUS POLITIK INDONESIA + KEBIJAKAN MENTERI/KEPALA DAERAH
  kritik_publik: [
    'kritik pemerintah Indonesia OR kritik kebijakan pemerintah OR kritik presiden Indonesia OR kritik istana negara',
    'kritik menteri OR menteri dikritik OR statement menteri tuai kritik OR kebijakan menteri dikritik OR pernyataan menteri dikecam',
    'kritik kepala daerah OR gubernur dikritik OR bupati dikritik OR wali kota dikritik OR kebijakan kepala daerah dikritik OR pernyataan gubernur dikritik',
    'demo tolak kebijakan pemerintah OR unjuk rasa tolak RUU Indonesia OR aksi massa tolak kebijakan OR demo tolak kebijakan menteri OR demo tolak kebijakan gubernur',
    'DPR kritik pemerintah OR DPR kritik menteri OR DPRD kritik kepala daerah OR anggota dewan kritik kebijakan OR interpelasi menteri OR hak angket kebijakan',
    'desak mundur menteri OR desak mundur pejabat Indonesia OR tuntut mundur kepala daerah OR desak copot menteri OR mosi tidak percaya menteri',
    'tolak RUU politik Indonesia OR tolak kebijakan pemerintah Indonesia OR polemik kebijakan menteri OR kontroversi kebijakan kepala daerah OR blunder kebijakan pemerintah',
    'pengamat politik kritik pemerintah OR pakar kritik kebijakan Indonesia OR aktivis kritik menteri OR boikot kebijakan pemerintah OR petisi tolak kebijakan pemerintah'
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
  korupsi_kpk: [
    'korupsi OR kasus korupsi OR korupsi timah OR korupsi pertamina OR korupsi bansos',
    'OTT KPK OR operasi tangkap tangan OR KPK OTT OR tersangka KPK',
    'Kejagung OR Kejaksaan Agung OR Kejati OR sita aset koruptor OR gratifikasi OR suap',
    'koruptor OR tersangka korupsi OR dakwaan korupsi OR sidang korupsi OR vonis korupsi',
    'KPK OR Komisi Pemberantasan Korupsi OR penyidik KPK OR OTT Bupati OR OTT Wali Kota OR pungli'
  ],
};

const TOPIC_FILTERS = {
  jakarta: ['jakarta','dki'],
  nasional: ['nasional','indonesia'],
  bencana: ['bencana','gempa','banjir','longsor','erupsi'],
  pdip: ['pdip','pdi perjuangan','pdi-p'],
  megawati: ['megawati','mega soekarnoputri','ketua umum pdip','bu mega'],
  puan: ['puan maharani','puan'],
  // FILTER KRITIK PUBLIK - HARUS POLITIK INDONESIA
  kritik_publik: [
    'kritik','mengkritik','dikritik','kecam','mengkecam','dikecam','kecaman','soroti','disoroti','sentil','disentil','sindir','disindir',
    'demo','unjuk rasa','aksi massa','protes','memprotes','diprotes',
    'desak','tuntut','mosi','lengser','copot','pecat','mundur',
    'tolak','penolakan','polemik','kontroversi','blunder',
    'tuai kritik','banjir kritik','dihujat','hujat',
    'dpr kritik','dprd kritik','interpelasi','hak angket',
    'boikot','petisi','suara rakyat','keluhan warga','pengamat kritik','pakar kritik'
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
  korupsi_kpk: ['korupsi','kpk','ott','kejagung','kejaksaan','koruptor','suap','gratifikasi','pungli','tersangka','dakwaan','vonis','sidang korupsi','kasus korupsi','operasi tangkap tangan','tangkap tangan','sita aset','korupsi timah','korupsi pertamina','korupsi bansos','korupsi bupati','korupsi wali kota','korupsi dana desa','kpk ott','komisi pemberantasan korupsi'],
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
  korupsi_kpk: { title: 'Korupsi & KPK', icon: '💰' },
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
    const results = await Promise.all(queries.map(q => fetchSingleQuery(q, hours)));
    results.forEach(r => allRaw = allRaw.concat(r));

    const seen = new Set();
    const items=[];
    const requiredKeywords = TOPIC_FILTERS[topicId] || [];

    // BLACKLIST UNTUK KRITIK PUBLIK - NO SPORT, NO LUAR NEGERI, NO ENTERTAINMENT VIRAL
    const SPORT_BLACKLIST = ['motogp','moto gp','pebalap','pembalap','formula 1','f1 ','liga 1','persib','persija','timnas u-','piala dunia','bulutangkis','badminton','tenis','sepak bola','sepakbola','bola voli','jack miller','marquez','rossi','qatar motogp','motogp qatar','19 pebalap','19 pembalap'];
    const FOREIGN_BLACKLIST = ['singapura','malaysia','thailand','filipina','vietnam','china kritik','tiongkok kritik','amerika serikat kritik',' inggris kritik','australia kritik','jepang kritik','korea selatan','rusia kritik','ukraina kritik','israel kritik',' kritik ke singapura',' kritik singapura',' kritik malaysia'];
    const ENTERTAINMENT_VIRAL_BLACKLIST = ['kiky saputri','rakyat jelata','jet pribadi','video lawas kiky','viral lagi','seruan boikot menguat','pasar modal menjawab kritik','pencekalan tv nasional','dosen ugm media wahyudi','reforma pasar modal'];
    const POLITIK_INDONESIA_MUST = ['pemerintah','presiden','menteri','kebijakan','dpr','dprd','gubernur','bupati','wali kota','walikota','kepala daerah','istana','parlemen','senayan','partai','politik','ruu','pejabat','kementerian','kabinet','pilkada','pajak','ppn','apbn','undang-undang','uu ','kebijakan pemerintah','pernyataan menteri','statement menteri','hashim','prabowo','gibran','jokowi','puan','megawati','pdip','dedi mulyadi','kdm'];

    for(let i=0;i<allRaw.length;i++){
      const { titleFull, linkRaw, pubDateStr, source } = allRaw[i];
      const pubDate = new Date(pubDateStr);
      const minutesAgo = isNaN(pubDate.getTime()) ? 9999 : Math.floor((Date.now()-pubDate.getTime())/60000);
      if(minutesAgo > hours*60 + 180) {
        if(!(topicId==='sosial' || topicId==='kriminal' || topicId==='kritik_publik' || topicId==='korupsi_kpk') || minutesAgo > 24*60+180) continue;
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

      // FILTER KHUSUS KRITIK PUBLIK - POLITIK INDONESIA ONLY
      if(topicId==='kritik_publik'){
        // 1. BLACKLIST SPORT
        if(SPORT_BLACKLIST.some(k => t.includes(k))) continue;
        // 2. BLACKLIST LUAR NEGERI
        if(FOREIGN_BLACKLIST.some(k => t.includes(k))) continue;
        // 3. BLACKLIST ENTERTAINMENT VIRAL YANG GAK ADA HUBUNGAN KEBIJAKAN
        if(ENTERTAINMENT_VIRAL_BLACKLIST.some(k => t.includes(k))) continue;
        // 4. HARUS ADA UNSUR POLITIK INDONESIA
        if(!POLITIK_INDONESIA_MUST.some(k => t.includes(k))) continue;
        // 5. EXCLUDE JUDUL YANG HANYA TENTANG MOTOGP/QATAR TANPA POLITIK
        if(t.includes('motogp') || t.includes('pebalap tolak') || t.includes('pembalap tolak')) continue;
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

    const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','sosial','kriminal','korupsi_kpk'];

    const results = await Promise.all(topicOrder.map(async (id)=>{
      const headlines = await fetchRSS(id, hours);
      const clustered = clusterHeadlines(headlines);
      return { id, title: TOPIC_META[id].title, icon: TOPIC_META[id].icon, volume: `${headlines.length} berita • ${clustered.length} isu`, lastUpdate: `dalam ${hours} jam - REAL`, headlines, clusters: clustered };
    }));

    return NextResponse.json({ success:true, filter:filterRaw, hours, lastSync:new Date().toISOString(), topics: results }, { status:200 });
  }catch(e){
    return NextResponse.json({ success:false, error:String(e), topics:[] }, { status:200 });
  }
}
