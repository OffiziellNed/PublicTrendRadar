import { NextResponse } from 'next/server';

// ============================================================
// PUBLIC TREND RADAR - trend-radar/route.js (versi perbaikan)
// - Limit per topik bisa diatur (MAX_PER_TOPIC)
// - Filter waktu ketat (3 Jam = benar-benar 3 jam)
// - Pencocokan keyword per kata utuh (puan != perempuan)
// - Cache 5 menit (hemat request ke Google News)
// - Flag error per topik (bedain "kosong" vs "gagal fetch")
// ============================================================

const MAX_PER_TOPIC = 100;     // maksimal berita per topik (sebelumnya 25)
const FETCH_TIMEOUT_MS = 8000; // batas waktu tiap request ke Google News
const CACHE_SECONDS = 300;     // data di-refresh tiap 5 menit

const TOPIC_QUERIES = {
  jakarta: ['Pemprov DKI Jakarta OR Gubernur DKI'],
  nasional: ['berita nasional Indonesia'],
  bencana: ['bencana alam OR gempa bumi OR banjir'],
  pdip: ['PDI Perjuangan OR PDIP'],
  megawati: ['Megawati Soekarnoputri OR Ketua Umum PDIP'],
  puan: ['Puan Maharani OR Ketua DPR'],
  kritik_publik: [
    'kritik pemerintah OR kritik kebijakan OR kritik presiden OR kritik menteri OR kritik pejabat',
    'demo OR unjuk rasa OR aksi massa OR aksi unjuk rasa OR demo mahasiswa OR demo buruh OR demo tolak kebijakan',
    'tuai kritik OR banjir kritik OR panen kritik OR tuai kecaman OR dihujat OR dikecam OR kecaman publik OR viral dikecam',
    'desak mundur OR tuntut mundur OR desak copot OR tuntut copot OR mosi tidak percaya OR lengser',
    'tolak RUU OR tolak kebijakan OR tolak kenaikan OR protes kebijakan OR polemik OR kontroversi OR blunder OR boikot kebijakan',
    'DPR kritik OR DPRD kritik OR anggota dewan kritik OR legislator kritik OR interpelasi OR hak angket OR DPR kecam',
    'boikot OR petisi OR tagar protes OR suara rakyat OR keluhan warga OR aspirasi rakyat OR kritik kebijakan',
    'pengamat kritik OR pakar kritik OR aktivis kritik OR LSM kritik OR soroti kebijakan OR sindir OR sentil OR kecam kebijakan'
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
    'klarifikasi OR ramai diperbincangkan OR media sosial OR OB OR office boy OR renovasi OR cari kerja OR transjakarta OR seleb tiktok OR romantis banget OR tak sengaja',
    'guru viral OR murid viral OR sekolah viral OR siswa viral OR dosen viral OR murid dihukum OR guru honorer viral',
    'ojol viral OR driver ojol viral OR kurir viral OR satpam viral OR satpol pp viral OR parkir liar viral OR pungli viral OR sound horeg OR joget viral',
    'tetangga viral OR kos viral OR kontrakan viral OR kelakuan tetangga OR warung viral OR minimarket viral OR minta maaf viral OR spill viral OR kepergok viral'
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

// Keyword dicocokkan PER KATA UTUH, jadi bentuk turunan perlu ditulis eksplisit
// (contoh: 'bunuh' tidak lagi otomatis menangkap 'pembunuhan').
const TOPIC_FILTERS = {
  jakarta: ['jakarta','dki'],
  nasional: ['nasional','indonesia','ri'],
  bencana: ['bencana','gempa','banjir','longsor','tanah longsor','erupsi','banjir bandang','puting beliung','kebakaran hutan','karhutla','tsunami'],
  pdip: ['pdip','pdi perjuangan','pdi-p'],
  megawati: ['megawati','mega soekarnoputri','ketua umum pdip','bu mega'],
  puan: ['puan maharani','puan','ketua dpr'],
  kritik_publik: [
    'kritik','kritikan','mengkritik','dikritik','kecam','mengecam','mengkecam','dikecam','kecaman','soroti','menyoroti','disoroti','sentil','menyentil','disentil','sindir','menyindir','disindir',
    'demo','demonstrasi','unjuk rasa','aksi massa','protes','memprotes','diprotes',
    'desak','mendesak','didesak','tuntut','menuntut','dituntut','mosi','lengser','copot','dicopot','pecat','dipecat','mundur',
    'tolak','menolak','ditolak','penolakan','polemik','kontroversi','kontroversial','blunder',
    'tuai kritik','banjir kritik','dihujat','hujat','hujatan',
    'interpelasi','hak angket',
    'boikot','petisi','suara rakyat','keluhan warga','aspirasi','pengamat','pakar'
  ],
  dedi_mulyadi: ['dedi mulyadi','kdm','gubernur jawa barat','gubernur jabar','kang dedi'],
  keluarga_jokowi: ['jokowi','gibran','kaesang','bobby nasution','keluarga jokowi'],
  sosial: [
    'viral','viralkan','video viral','tiktok','fenomena sosial','curhatan','curhat','netizen','warganet','kisah haru','haru','mengharukan','inspiratif','cerita unik','kejadian unik','tradisi unik','fenomena aneh','anomali','aneh',
    'lucu','kocak','ngakak','bikin ngakak','lawak','humor','tingkah','kelakuan','aksi kocak','emak-emak','bapak-bapak','bocil','bocah','kakek','nenek','ojol','ojek','warga','warga +62','kelakuan warga','tingkah warga','potret warga',
    'nyeleneh','absurd','ajaib','nyentrik','prank','usil','jahil','hajatan','arisan','gotong royong','di luar nalar','diluar nalar','gak masuk akal','meme',
    'terharu','syok','kejutan','kejutan ulang tahun','ultah','ulang tahun','klarifikasi','ramai diperbincangkan','media sosial','medsos','ob','office boy','renovasi','bikin haru','cari kerja','transjakarta','seleb tiktok','selebgram','tak sengaja','salah kira','romantis','romantis banget','diperbincangkan','makan cat',
    'guru','murid','sekolah','siswa','dosen','murid dihukum','guru honorer',
    'driver ojol','kurir','satpam','satpol pp','parkir liar','pungli','sound horeg','joget','joget tiktok',
    'tetangga','kos','kontrakan','kelakuan tetangga','warung','minimarket','minta maaf','spill','kepergok','klarifikasi minta maaf'
  ],
  kriminal: [
    'kriminal','bunuh','dibunuh','membunuh','pembunuhan','pembunuh','narkoba','sabu','ganja','ekstasi','curanmor','maling','curi','mencuri','dicuri','pencuri','pencurian','rampok','merampok','dirampok','perampok','perampokan','begal','dibegal','pembegalan','jambret','dijambret',
    'kdrt','aniaya','dianiaya','menganiaya','penganiayaan','keroyok','dikeroyok','pengeroyokan','bacok','dibacok','pembacokan','tembak','ditembak','penembakan','perkosa','diperkosa','pemerkosaan','leceh','dilecehkan','pelecehan','tipu','ditipu','menipu','penipuan','penipu','mayat','jasad','mutilasi','tawuran'
  ],
  korupsi_kpk: [
    'korupsi','kpk','ott','kejagung','kejaksaan','kejati','kejari','koruptor','suap','menyuap','disuap','gratifikasi','pungli','tersangka','dakwaan','didakwa','vonis','divonis','sidang korupsi','kasus korupsi','operasi tangkap tangan','tangkap tangan','sita aset','korupsi timah','korupsi pertamina','korupsi bansos','korupsi dana desa','komisi pemberantasan korupsi','tipikor'
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
  korupsi_kpk: { title: 'Korupsi & KPK', icon: '💰' },
};

const TOPIC_ORDER = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','sosial','kriminal','korupsi_kpk'];

const SPORT_BLACKLIST = [
  'motogp','moto gp','pebalap','pembalap','formula 1','f1',
  'liga 1','liga inggris','premier league','serie a','la liga','persib','persija','arema','persebaya',
  'piala dunia','piala asia','timnas','sepak bola','sepakbola','bulutangkis','badminton','bwf','tenis','bola voli','voli putri',
  'marc marquez','valentino rossi','pecco bagnaia','jack miller'
];

// 'palestina', 'israel' & 'inggris' sengaja dihapus: sering muncul di berita demo/kritik domestik.
const FOREIGN_BLACKLIST = [
  'singapura','malaysia','thailand','filipina','vietnam','kamboja','myanmar','laos','brunei',
  'china','tiongkok','amerika serikat','britania raya','australia','jepang','korea selatan','korea utara',
  'rusia','ukraina','iran','irak','suriah','turki','qatar','arab saudi','uni emirat arab','uea'
];

const MEGAWATI_ATLET = ['voli','volley','pevoli','hangestri','red sparks','megatron','proliga','timnas voli','atlet voli','voli putri'];

// ---------- Pencocokan per kata utuh ----------
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function buildMatcher(keywords) {
  const parts = [...new Set(keywords.map(k => k.trim().toLowerCase()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);
  if (!parts.length) return null;
  return new RegExp(`(?:^|[^a-z0-9])(?:${parts.join('|')})(?=$|[^a-z0-9])`);
}

const TOPIC_MATCHERS = Object.fromEntries(Object.entries(TOPIC_FILTERS).map(([id, kws]) => [id, buildMatcher(kws)]));
const SPORT_MATCHER = buildMatcher(SPORT_BLACKLIST);
const FOREIGN_MATCHER = buildMatcher(FOREIGN_BLACKLIST);
const MEGAWATI_ATLET_MATCHER = buildMatcher(MEGAWATI_ATLET);

// ---------- Helpers ----------
function formatTimeAgo(minutes) {
  if (minutes < 60) return `${minutes}m lalu`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}j lalu`;
  return `${Math.floor(minutes / 1440)}h lalu`;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const getTag = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const m = itemXml.match(r);
      return m ? decodeEntities(m[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')) : '';
    };
    items.push({ titleFull: getTag('title'), linkRaw: getTag('link'), pubDateStr: getTag('pubDate'), source: getTag('source') });
  }
  return items;
}

// ---------- Clustering ----------
const STOPWORDS = new Set(['dan','di','yang','untuk','dari','dengan','pada','ke','ini','itu','adalah','akan','bisa','jadi','soal','tentang','dalam','secara','oleh','sebagai','saat','tengah','juga','sudah','telah','buka','ada','jika','atau','para','sebuah','tersebut','agar','hingga','bahwa','karena','kepada','namun','tetapi']);
const YEAR_REGEX = /\b20\d{2}\b/;

function normalizeWords(title) {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
}
function jaccardSimilarity(a, b) {
  const aW = new Set(normalizeWords(a)), bW = new Set(normalizeWords(b));
  if (!aW.size || !bW.size) return 0;
  let inter = 0;
  for (const w of aW) if (bW.has(w)) inter++;
  const union = aW.size + bW.size - inter;
  return union === 0 ? 0 : inter / union;
}
function clusterHeadlines(headlines, topicId, threshold = 0.38) {
  const clusters = [];
  const sorted = [...headlines].sort((a, b) => a.minutesAgo - b.minutesAgo);
  for (const h of sorted) {
    let found = false;
    for (const cluster of clusters) {
      const rep = cluster[0];
      const sim = jaccardSimilarity(h.title, rep.title);
      const sameYear = YEAR_REGEX.test(h.title) && YEAR_REGEX.test(rep.title);
      if (sim >= threshold || (sim >= 0.28 && sameYear)) {
        cluster.push(h);
        cluster.sort((a, b) => a.minutesAgo - b.minutesAgo);
        found = true;
        break;
      }
    }
    if (!found) clusters.push([h]);
  }
  return clusters.map((cluster, idx) => {
    const main = cluster[0];
    return {
      id: `${topicId}-cluster-${idx}`,
      isCluster: cluster.length > 1,
      count: cluster.length,
      title: main.title,
      mainUrl: main.url,
      time: main.time,
      minutesAgo: main.minutesAgo,
      sources: [...new Set(cluster.map(c => c.source))],
      headlines: cluster,
    };
  });
}

// ---------- Fetch ----------
async function fetchSingleQuery(q, hours) {
  const fullQ = `${q} when:${hours}h`;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(fullQ)}&hl=id&gl=ID&ceid=ID:id`;
  try {
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, items: [] };
    const xml = await res.text();
    return { ok: true, items: parseRSS(xml) };
  } catch (e) {
    return { ok: false, reason: e?.name === 'TimeoutError' ? 'timeout' : String(e?.message || e), items: [] };
  }
}

async function fetchTopic(topicId, hours) {
  const queries = TOPIC_QUERIES[topicId] || [topicId];
  const results = await Promise.all(queries.map(q => fetchSingleQuery(q, hours)));

  const failed = results.filter(r => !r.ok);
  const allRaw = results.flatMap(r => r.items);

  const maxMinutes = hours * 60;
  const matcher = TOPIC_MATCHERS[topicId];
  const seen = new Set();
  const items = [];

  for (let i = 0; i < allRaw.length; i++) {
    const { titleFull, linkRaw, pubDateStr, source } = allRaw[i];

    const pubDate = new Date(pubDateStr);
    if (isNaN(pubDate.getTime())) continue;
    const minutesAgo = Math.max(0, Math.floor((Date.now() - pubDate.getTime()) / 60000));
    if (minutesAgo > maxMinutes) continue; // filter waktu KETAT

    const cleanTitle = (titleFull.split(' - ')[0] || titleFull).trim();
    if (!cleanTitle) continue;

    const t = cleanTitle.toLowerCase();
    if (seen.has(t)) continue;
    seen.add(t);

    if (matcher && !matcher.test(t)) continue;

    if (topicId === 'kritik_publik') {
      if (SPORT_MATCHER.test(t)) continue;
      if (FOREIGN_MATCHER.test(t)) continue;
    }
    if (topicId === 'megawati' && MEGAWATI_ATLET_MATCHER.test(t)) continue;

    const url = linkRaw.replace(/&amp;/g, '&');
    items.push({
      id: `${topicId}-${i}`,
      source: (source || 'Google News').slice(0, 30),
      time: formatTimeAgo(minutesAgo),
      minutesAgo,
      title: cleanTitle,
      url,
      link: url,
    });
  }

  items.sort((a, b) => a.minutesAgo - b.minutesAgo);

  return {
    items: items.slice(0, MAX_PER_TOPIC),
    totalQueries: queries.length,
    failedQueries: failed.length,
    failReasons: [...new Set(failed.map(f => f.reason))],
  };
}

// ---------- Handler ----------
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filterRaw = searchParams.get('filter') || '3 Jam';

    let hours = 3;
    if (filterRaw.includes('24')) hours = 24;
    else if (filterRaw.includes('6')) hours = 6;

    const topics = await Promise.all(TOPIC_ORDER.map(async (id) => {
      const { items, totalQueries, failedQueries, failReasons } = await fetchTopic(id, hours);
      const clusters = clusterHeadlines(items, id);
      return {
        id,
        title: TOPIC_META[id].title,
        icon: TOPIC_META[id].icon,
        volume: `${items.length} berita • ${clusters.length} isu`,
        lastUpdate: `dalam ${hours} jam`,
        headlines: items,
        clusters,
        error: failedQueries === totalQueries,          // semua query gagal
        partialError: failedQueries > 0 && failedQueries < totalQueries,
        failReasons,
      };
    }));

    return NextResponse.json(
      { success: true, filter: filterRaw, hours, lastSync: new Date().toISOString(), topics },
      {
        status: 200,
        headers: { 'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}` },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e), topics: [] },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
