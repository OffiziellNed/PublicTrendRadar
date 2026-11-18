"use client";
import React, { useState, useEffect, useMemo } from 'react';

// ============================================================
// PUBLIC TREND RADAR - page.js (versi klasifikasi per isu)
// 🔥 Hot News     : isu yang SUDAH ramai diliput media
// ⚡ Potensi Hot  : isu baru (≤ 2 jam) yang mulai diliput beberapa media
// ❤️ Positif      : isu dengan nada positif (tanpa kata negatif)
// 💬 Kutipan      : isu yang memuat pernyataan/omongan tokoh
// Semua dinilai per ISU (cluster), bukan per judul.
// ============================================================

// ---------- Ambang batas (silakan di-tuning) ----------
const HOT_MIN_SOURCES = 5;          // 🔥 kalau diliput ≥ 5 media berbeda
const HOT_MIN_SOURCES_60M = 3;      // 🔥 atau ≥ 3 media berbeda dalam 60 menit terakhir
const POTENSI_MAX_AGE_MIN = 120;    // ⚡ isu pertama kali muncul ≤ 2 jam lalu
const POTENSI_MIN_SOURCES = 2;      // ⚡ sudah diliput ≥ 2 media berbeda

// ---------- Keyword (dicocokkan per kata utuh) ----------
const NEGATIVE_KEYWORDS = [
  'bongkar','dibongkar','korupsi','koruptor','skandal','kecam','dikecam','mengecam','kecaman','desak mundur','gagal','kegagalan','ngamuk','mengamuk','kecewa','bocor','kebocoran','fiktif','mangkrak','bohong','berbohong','heboh','kontroversi','kontroversial',
  'dituding','tuding','digugat','gugat','dilaporkan','ditangkap','ott','suap','disuap','pungli','markup','mark up','bansos disunat','pajak naik','utang','jebol','bobol','dibobol','ambruk','pecat','dipecat','mundur','lawan','melawan','vs',
  'sindir','disindir','menyindir','diserang','menyerang','serangan','bantah','membantah','ancam','diancam','mengancam','ancaman','cekcok','bentrok','bentrokan','demo','demonstrasi','ricuh','kericuhan','brutal','maling','rampok','dirampok','mafia','kartel',
  'dinasti','oligarki','cawe-cawe','ijazah palsu','anggaran jumbo','proyek mangkrak','buzzer','ternak','fufufafa','cuci uang','pencucian uang','cuan haram','dikritik','kritik','tuai kritik','dihujat','polemik','blunder','tolak','menolak','protes'
];
const POSITIVE_KEYWORDS = [
  'apresiasi','diapresiasi','dukung','didukung','mendukung','dukungan','prestasi','berprestasi','resmikan','diresmikan','meresmikan','bantuan','sejahtera','haru','terharu','mengharukan','nangis','peluk','memeluk','gratis','digratiskan','gratiskan','cair','dicairkan','lunas','dilunasi',
  'sukses','berhasil','menang','juara','solusi','tegas','sigap','gercep','selamatkan','diselamatkan','menyelamatkan','bantu','membantu','dibantu','donasi','blusukan','turun langsung','bagi-bagi','sembuh','bangkit','salut','inspiratif','dermawan','ikhlas','merakyat','sederhana','jujur','amanah','tulus','gotong royong','keren','mantap','bahagia'
];
const BOOSTER_KEYWORDS = [
  'rp','miliar','triliun','viral','video','rekaman','detik-detik','live','blak-blakan','ngaku','mengaku','terungkap','ini faktanya','kocak','parah','menangis','geger','ramai','heboh','bikin geram','geram','murka'
];

// Kata kerja yang biasanya menandai pernyataan tokoh di judul berita
const QUOTE_VERBS = [
  'kata','katanya','sebut','menyebut','ujar','klaim','mengklaim','akui','mengakui','ngaku','mengaku','bilang','janji','berjanji','sesumbar',
  'dalih','berdalih','tegaskan','menegaskan','singgung','menyinggung','jawab','menjawab','tanggapi','menanggapi','respons','sentil','menyentil','curhat','blak-blakan','buka suara'
];

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function buildMatcher(keywords) {
  const parts = [...new Set(keywords.map(k => k.trim().toLowerCase()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);
  return new RegExp(`(?:^|[^a-z0-9])(?:${parts.join('|')})(?=$|[^a-z0-9])`);
}
const NEG_MATCHER = buildMatcher(NEGATIVE_KEYWORDS);
const POS_MATCHER = buildMatcher(POSITIVE_KEYWORDS);
const BOOST_MATCHER = buildMatcher(BOOSTER_KEYWORDS);
const QUOTE_VERB_MATCHER = buildMatcher(QUOTE_VERBS);

// Label rubrik media yang memakai titik dua tapi BUKAN kutipan ("VIDEO: ...", "Update: ...")
const QUOTE_LABEL_PREFIX = /^(update|video|foto|breaking|breaking news|live|live update|infografis|opini|terkini|berita terkini|cek fakta|hoaks|viral|jadwal|link|daftar|kronologi|fakta|simak|klarifikasi|eksklusif|analisis|editorial)\b/;

// Judul dianggap kutipan kalau:
// 1) ada tanda kutip ganda ("...", “...”), atau
// 2) ada kutip tunggal yang membungkus ≥ 2 kata ('...'), atau
// 3) pola "Tokoh: isi omongan" (bagian sebelum titik dua maksimal 4 kata), atau
// 4) ada kata kerja pernyataan (kata, sebut, klaim, akui, ...)
function isQuoteTitle(title) {
  if (!title) return false;
  if (/["“”]/.test(title)) return true;
  if (/['‘’][^'‘’]+\s[^'‘’]+['‘’]/.test(title)) return true;
  const colon = title.indexOf(':');
  if (colon > 0 && colon < title.length - 5 && !/\d/.test(title[colon + 1] || '')) {
    const beforeText = title.slice(0, colon).trim();
    const before = beforeText.split(/\s+/);
    if (before.length <= 4 && !QUOTE_LABEL_PREFIX.test(beforeText.toLowerCase())) return true;
  }
  return QUOTE_VERB_MATCHER.test(title.toLowerCase());
}

// ---------- Clustering ----------
const STOPWORDS = new Set(['dan','di','yang','untuk','dari','dengan','pada','ke','ini','itu','adalah','akan','bisa','jadi','soal','tentang','dalam','secara','oleh','sebagai','saat','tengah','juga','sudah','telah','buka','ada','jika','atau','para','sebuah','tersebut','agar','hingga','bahwa','karena','kepada','namun','tetapi']);
const YEAR_REGEX = /\b20\d{2}\b/;

function normalizeWords(title) { return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w)); }
function jaccardSimilarity(a, b) {
  const aW = new Set(normalizeWords(a)), bW = new Set(normalizeWords(b));
  if (!aW.size || !bW.size) return 0;
  let inter = 0;
  for (const w of aW) if (bW.has(w)) inter++;
  const union = aW.size + bW.size - inter;
  return union === 0 ? 0 : inter / union;
}
function clusterHeadlines(headlines, threshold = 0.38) {
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
      id: `cluster-${idx}-${main.id}`,
      isCluster: cluster.length > 1,
      count: cluster.length,
      title: main.title,
      mainUrl: main.url,
      time: main.time,
      minutesAgo: main.minutesAgo,
      sources: [...new Set(cluster.map(c => c.source))],
      headlines: cluster,
      source: main.source,
    };
  });
}

// ---------- Klasifikasi per isu ----------
function classifyIsu(cluster) {
  const hs = cluster.headlines;
  const sourceCount = new Set(hs.map(h => h.source)).size;
  const sources60 = new Set(hs.filter(h => h.minutesAgo <= 60).map(h => h.source)).size;
  const firstSeen = Math.max(...hs.map(h => h.minutesAgo)); // artikel tertua = kapan isu mulai muncul

  let negCount = 0, posCount = 0, boostCount = 0;
  for (const h of hs) {
    const t = (h.title || '').toLowerCase();
    if (NEG_MATCHER.test(t)) negCount++;
    if (POS_MATCHER.test(t)) posCount++;
    if (BOOST_MATCHER.test(t)) boostCount++;
  }

  let sentiment = 'netral';
  if (negCount > 0 && negCount >= posCount) sentiment = 'negatif';
  else if (posCount > 0 && negCount === 0) sentiment = 'positif';
  else if (posCount > 0 && negCount > 0) sentiment = 'campur';

  let kategori = null;
  if (sourceCount >= HOT_MIN_SOURCES || sources60 >= HOT_MIN_SOURCES_60M) kategori = 'hot';
  else if (firstSeen <= POTENSI_MAX_AGE_MIN && sourceCount >= POTENSI_MIN_SOURCES && (negCount > 0 || boostCount > 0)) kategori = 'potensi';

  const quoteHeadline = hs.find(h => isQuoteTitle(h.title)) || null;

  const heat = sourceCount * 2 + sources60 * 3 + (boostCount > 0 ? 1 : 0) + (negCount > 0 ? 1 : 0);

  return { kategori, sentiment, sourceCount, sources60, firstSeen, heat, isKutipan: !!quoteHeadline, quoteHeadline };
}

function analyzeTopic(topic) {
  const clusters = clusterHeadlines(topic.headlines || []).map(c => ({ ...c, ...classifyIsu(c) }));
  return {
    ...topic,
    analyzed: clusters,
    counts: {
      hot: clusters.filter(c => c.kategori === 'hot').length,
      potensi: clusters.filter(c => c.kategori === 'potensi').length,
      positif: clusters.filter(c => c.sentiment === 'positif').length,
      kutipan: clusters.filter(c => c.isKutipan).length,
    },
  };
}

const FILTERS = {
  hot: { icon: '🔥', label: 'Hot News', color: '#ff4500', border: '#ff6a33', desc: `Diliput ≥ ${HOT_MIN_SOURCES} media berbeda, atau ≥ ${HOT_MIN_SOURCES_60M} media dalam 1 jam terakhir` },
  potensi: { icon: '⚡', label: 'Potensi Hot', color: '#facc15', border: '#fde047', desc: `Muncul ≤ ${POTENSI_MAX_AGE_MIN / 60} jam lalu, sudah ≥ ${POTENSI_MIN_SOURCES} media, judul bernada negatif/clickbait` },
  positif: { icon: '❤️', label: 'Positif', color: '#e11d48', border: '#fb7185', desc: 'Ada kata positif dan tidak ada kata negatif di semua judul isu ini' },
  kutipan: { icon: '💬', label: 'Kutipan', color: '#a78bfa', border: '#c4b5fd', desc: 'Isu yang memuat pernyataan tokoh: tanda kutip, pola "Tokoh: ...", atau kata seperti kata, sebut, klaim, akui' },
};

// ---------- Tombol "A": buka editor Agora Vada & otomatis tarik berita ----------
// Isi ENV NEXT_PUBLIC_EDITOR_URL di Vercel (project Radar), contoh: https://agoravada.vercel.app
const EDITOR_URL = (process.env.NEXT_PUBLIC_EDITOR_URL || '').replace(/\/+$/, '');

function EditorLink({ url, judul, size = 36, radius = 8, bg = '#0d1117', fontSize = 16 }) {
  const style = { width: size, height: size, backgroundColor: bg, border: '1px solid #30363d', borderRadius: radius, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize, fontWeight: 800, color: '#f0883e', cursor: 'pointer', flexShrink: 0, padding: 0 };
  if (!EDITOR_URL || !url) {
    return <button type="button" title="Buka di editor Agora Vada" aria-label="Buka di editor Agora Vada" onClick={() => alert('Isi NEXT_PUBLIC_EDITOR_URL di Vercel (project Radar) dulu, lalu Redeploy.')} style={style}>A</button>;
  }
  const href = `${EDITOR_URL}/?url=${encodeURIComponent(url)}&judul=${encodeURIComponent(judul || '')}`;
  return <a href={href} target="_blank" rel="noopener noreferrer" title="Buka di editor Agora Vada" aria-label="Buka di editor Agora Vada" style={style}>A</a>;
}

function Badge({ bg, color, border, children, title }) {
  return (
    <span title={title} style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', backgroundColor: bg, color, border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{children}</span>
  );
}

function IsuBadges({ c }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
      {c.kategori === 'hot' && <Badge bg="rgba(255,69,0,0.15)" color="#ff8a5c" border="#ff4500">🔥 Hot</Badge>}
      {c.kategori === 'potensi' && <Badge bg="rgba(250,204,21,0.12)" color="#fde047" border="#a68a0a">⚡ Potensi</Badge>}
      {c.sentiment === 'positif' && <Badge bg="rgba(225,29,72,0.12)" color="#fb7185" border="#9f1239">❤️ Positif</Badge>}
      {c.isKutipan && <Badge bg="rgba(167,139,250,0.12)" color="#c4b5fd" border="#5b21b6">💬 Kutipan</Badge>}
      {c.sentiment === 'negatif' && <Badge bg="#161b22" color="#f87171" border="#30363d">Negatif</Badge>}
      {c.sentiment === 'campur' && <Badge bg="#161b22" color="#c9d1d9" border="#30363d">Campur</Badge>}
      <Badge bg="#0d1117" color="#8b949e" border="#30363d" title="Jumlah media berbeda yang meliput isu ini">{c.sourceCount} media{c.sources60 > 0 ? ` • ${c.sources60} dalam 1 jam` : ''}</Badge>
    </div>
  );
}

export default function Page() {
  const [trendTimeFilter, setTrendTimeFilter] = useState('3 Jam');
  const [trendTopics, setTrendTopics] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [groupSimilar, setGroupSimilar] = useState(true);
  const [expandedClusters, setExpandedClusters] = useState({});

  useEffect(() => {
    const fetchRadar = async () => {
      setTrendLoading(true);
      try {
        const res = await fetch(`/api/trend-radar?filter=${encodeURIComponent(trendTimeFilter)}`);
        const data = await res.json();
        if (data?.topics) { setTrendTopics(data.topics); setFetchError(false); }
        else setFetchError(true);
      } catch { setFetchError(true); }
      finally { setTrendLoading(false); }
    };
    fetchRadar();
  }, [trendTimeFilter]);

  useEffect(() => {
    if (showDetail) document.body.style.overflow = 'hidden';
    else { document.body.style.overflow = 'auto'; setActiveFilter(null); }
    return () => { document.body.style.overflow = 'auto'; };
  }, [showDetail]);

  useEffect(() => { setActiveFilter(null); setExpandedClusters({}); }, [selectedTopicId]);

  const analyzedTopics = useMemo(() => trendTopics.map(analyzeTopic), [trendTopics]);
  const selectedTopic = useMemo(() => analyzedTopics.find(t => t.id === selectedTopicId) || null, [analyzedTopics, selectedTopicId]);

  const displayClusters = useMemo(() => {
    if (!selectedTopic) return [];
    let list = selectedTopic.analyzed;
    if (activeFilter === 'hot') list = list.filter(c => c.kategori === 'hot');
    if (activeFilter === 'potensi') list = list.filter(c => c.kategori === 'potensi');
    if (activeFilter === 'positif') list = list.filter(c => c.sentiment === 'positif');
    if (activeFilter === 'kutipan') {
      // Tampilkan judul yang berisi kutipan sebagai judul utama isu
      list = list.filter(c => c.isKutipan).map(c => ({
        ...c,
        title: c.quoteHeadline.title,
        mainUrl: c.quoteHeadline.url,
        time: c.quoteHeadline.time,
        source: c.quoteHeadline.source,
      }));
    }

    list = [...list].sort((a, b) => (activeFilter === 'hot' || activeFilter === 'potensi') ? (b.heat - a.heat) || (a.minutesAgo - b.minutesAgo) : a.minutesAgo - b.minutesAgo);

    if (groupSimilar) return list;
    // Mode tanpa grup: tampilkan per judul, tapi label tetap mengikuti isunya
    return list.flatMap(c => c.headlines
      .filter(h => activeFilter !== 'kutipan' || isQuoteTitle(h.title))
      .map(h => ({
      ...c,
      id: `single-${h.id}`,
      isCluster: false,
      count: 1,
      title: h.title,
      mainUrl: h.url,
      time: h.time,
      minutesAgo: h.minutesAgo,
      source: h.source,
      headlines: [h],
    })));
  }, [selectedTopic, activeFilter, groupSimilar]);

  const filterButton = (key) => {
    const f = FILTERS[key];
    const active = activeFilter === key;
    const count = selectedTopic?.counts?.[key] ?? 0;
    return (
      <button
        key={key}
        onClick={() => setActiveFilter(active ? null : key)}
        title={`${f.label}: ${f.desc}`}
        aria-pressed={active}
        style={{ height: '36px', padding: '0 10px', backgroundColor: active ? f.color : '#161b22', border: active ? `1px solid ${f.border}` : '1px solid #30363d', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '16px', cursor: 'pointer', color: active ? '#000' : '#c9d1d9' }}
      >
        <span>{f.icon}</span><span style={{ fontSize: '11px', fontWeight: '700' }}>{count}</span>
      </button>
    );
  };

  return (
    <div style={{ width: '100%', minHeight: '100dvh', backgroundColor: '#0a0a0f', color: '#fff' }}>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap");
        html, body { background-color: #0a0a0f !important; margin:0; padding:0; width: 100%; height: auto; min-height: 100%; overflow-x: hidden; overflow-y: auto; -webkit-overflow-scrolling: touch; touch-action: pan-y; scrollbar-width: thin; scrollbar-color: #30363d #0a0a0f; }
        * { font-family: 'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif; box-sizing: border-box; }
        .mono{font-family:'Geist Mono', ui-monospace, Menlo, monospace}
        button:focus-visible, a:focus-visible { outline: 2px solid #58a6ff; outline-offset: 2px; }
        ::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-track { background: #0a0a0f; } ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '1120px', margin: '0 auto', padding: '20px 16px 80px 16px', backgroundColor: '#0a0a0f', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Public Trend Radar</h2>
          <p style={{ color: '#8b949e', fontSize: '14px', marginTop: '6px' }}>Monitoring isu publik terupdate - REAL TIME.</p>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {['3 Jam', '6 Jam', '24 Jam'].map(f => (
              <button key={f} onClick={() => setTrendTimeFilter(f)} style={{ padding: '7px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', border: '1px solid #30363d', backgroundColor: trendTimeFilter === f ? '#fff' : '#161b22', color: trendTimeFilter === f ? '#000' : '#c9d1d9', cursor: 'pointer' }}>{f}</button>
            ))}
            <div style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', backgroundColor: '#161b22', border: '1px solid #30363d', color: fetchError ? '#f87171' : '#22c55e' }} className="mono">
              ● {trendLoading ? 'sync...' : fetchError ? 'Gagal sync' : 'LIVE ON'}
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '11px', color: '#8b949e' }}>
            {Object.values(FILTERS).map(f => <span key={f.label} title={f.desc}>{f.icon} {f.label}</span>)}
          </div>
        </div>

        {fetchError && !trendLoading && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', border: '1px solid #7f1d1d', backgroundColor: 'rgba(127,29,29,0.2)', color: '#fca5a5', fontSize: '13px', textAlign: 'center' }}>
            Data radar tidak bisa diambil. Coba ganti filter waktu atau muat ulang halaman.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', paddingBottom: '40px', alignItems: 'stretch' }}>
          {analyzedTopics.map(topic => {
            const totalBerita = topic.headlines?.length || 0;
            const isuCount = topic.analyzed.length;
            const isEmpty = totalBerita === 0;
            const isError = !!topic.error;
            const preview = [...topic.analyzed].sort((a, b) => b.heat - a.heat).slice(0, 2);
            return (
              <div key={topic.id} style={{ backgroundColor: '#161b22', border: isError ? '1px solid #7f1d1d' : isEmpty ? '1px dashed #30363d' : '1px solid #30363d', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', minHeight: '240px', opacity: isEmpty && !isError ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '48px', height: '48px', backgroundColor: '#0d1117', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #30363d', flexShrink: 0 }}>{topic.icon}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic.title}</div>
                    <div className="mono" style={{ fontSize: '11px', color: isError ? '#f87171' : isEmpty ? '#484f58' : '#8b949e' }}>
                      {isError ? 'Gagal ambil data' : isEmpty ? `0 berita dalam ${trendTimeFilter}` : `${totalBerita} berita • ${isuCount} isu`}
                      {topic.partialError && !isError ? ' • sebagian gagal' : ''}
                    </div>
                  </div>
                </div>

                {!isEmpty && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', fontSize: '12px' }} className="mono">
                    <span title={FILTERS.hot.desc} style={{ color: topic.counts.hot ? '#ff8a5c' : '#484f58' }}>🔥 {topic.counts.hot}</span>
                    <span title={FILTERS.potensi.desc} style={{ color: topic.counts.potensi ? '#fde047' : '#484f58' }}>⚡ {topic.counts.potensi}</span>
                    <span title={FILTERS.positif.desc} style={{ color: topic.counts.positif ? '#fb7185' : '#484f58' }}>❤️ {topic.counts.positif}</span>
                    <span title={FILTERS.kutipan.desc} style={{ color: topic.counts.kutipan ? '#c4b5fd' : '#484f58' }}>💬 {topic.counts.kutipan}</span>
                  </div>
                )}

                <div style={{ marginBottom: '14px', flex: 1, minHeight: '44px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  {!isEmpty && preview.map(c => (
                    <div key={c.id} style={{ fontSize: '12px', color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                      {c.kategori === 'hot' ? '🔥' : c.kategori === 'potensi' ? '⚡' : '•'} {c.title}
                    </div>
                  ))}
                  {isEmpty && !isError && <div style={{ fontSize: '12px', color: '#484f58', fontStyle: 'italic' }}>Tidak ada berita dalam {trendTimeFilter}</div>}
                  {isError && <div style={{ fontSize: '12px', color: '#f87171' }}>Google News tidak merespons untuk topik ini. Coba lagi beberapa menit lagi.</div>}
                </div>

                <button onClick={() => { if (!isEmpty) { setSelectedTopicId(topic.id); setShowDetail(true); } }} disabled={isEmpty} style={{ width: '100%', backgroundColor: isEmpty ? '#21262d' : '#fff', color: isEmpty ? '#484f58' : '#000', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', border: 'none', cursor: isEmpty ? 'not-allowed' : 'pointer', marginTop: 'auto' }}>
                  {isError ? 'Gagal sync' : isEmpty ? 'Kosong' : 'Cek Sekarang'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {showDetail && selectedTopic && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,10,15,0.92)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '12px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ width: '100%', maxWidth: '720px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '16px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginTop: '10px' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #30363d', backgroundColor: '#0d1117', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                  <button onClick={() => setShowDetail(false)} aria-label="Kembali" style={{ backgroundColor: '#21262d', border: '1px solid #30363d', color: '#fff', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>←</button>
                  <div style={{ fontWeight: '800', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}><span>{selectedTopic.icon}</span><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedTopic.title}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  {filterButton('hot')}
                  {filterButton('potensi')}
                  {filterButton('positif')}
                  {filterButton('kutipan')}
                  <button onClick={() => setShowDetail(false)} aria-label="Tutup" style={{ width: '36px', height: '36px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '10px', color: '#8b949e', fontSize: '18px', cursor: 'pointer', marginLeft: '2px' }}>×</button>
                </div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setGroupSimilar(!groupSimilar)} className="mono" style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '20px', border: groupSimilar ? '1px solid #58a6ff' : '1px solid #30363d', backgroundColor: groupSimilar ? 'rgba(88,166,255,0.15)' : '#161b22', color: groupSimilar ? '#58a6ff' : '#8b949e', cursor: 'pointer' }}>
                  {groupSimilar ? `✓ Grup mirip ON • ${displayClusters.length} isu` : `Grup mirip OFF • ${displayClusters.length} judul`}
                </button>
                {activeFilter && (
                  <>
                    <div className="mono" style={{ fontSize: '11px', color: '#8b949e', backgroundColor: '#161b22', border: '1px solid #30363d', padding: '4px 10px', borderRadius: '20px' }}>{FILTERS[activeFilter].icon} {FILTERS[activeFilter].label}</div>
                    <button onClick={() => setActiveFilter(null)} style={{ fontSize: '11px', backgroundColor: '#21262d', border: '1px solid #30363d', color: '#c9d1d9', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer' }}>Reset ✕</button>
                  </>
                )}
              </div>
              {activeFilter && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#8b949e' }}>{FILTERS[activeFilter].desc}</div>
              )}
            </div>

            <div style={{ padding: '14px', flex: 1, overflowY: 'auto', backgroundColor: '#0d1117', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {displayClusters.map(cluster => {
                  const isExpanded = expandedClusters[cluster.id];
                  return (
                    <div key={cluster.id} style={{ borderRadius: '12px', backgroundColor: '#161b22', border: cluster.kategori === 'hot' ? '1px solid #7c2d12' : '1px solid #30363d', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{cluster.source} • {cluster.time}</div>
                          <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px', lineHeight: '1.4' }}>{cluster.title}</div>
                          <IsuBadges c={cluster} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <a href={cluster.mainUrl} target="_blank" rel="noopener noreferrer" aria-label="Buka berita" style={{ width: '36px', height: '36px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '16px', cursor: 'pointer' }}>🔗</a>
                          <EditorLink url={cluster.mainUrl} judul={cluster.title} />
                          {cluster.isCluster && (
                            <button onClick={() => setExpandedClusters(prev => ({ ...prev, [cluster.id]: !prev[cluster.id] }))} aria-expanded={!!isExpanded} style={{ minWidth: '36px', height: '22px', backgroundColor: isExpanded ? '#21262d' : '#0d1117', border: '1px solid #30363d', borderRadius: '20px', color: isExpanded ? '#58a6ff' : '#8b949e', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: '0 8px' }}>{isExpanded ? '−' : `${cluster.count}`}</button>
                          )}
                        </div>
                      </div>
                      {cluster.isCluster && isExpanded && (
                        <div style={{ borderTop: '1px solid #21262d', backgroundColor: '#0d1117', padding: '8px' }}>
                          <div className="mono" style={{ fontSize: '10px', color: '#484f58', padding: '4px 8px 8px' }}>{cluster.count} berita dari {cluster.sourceCount} media untuk isu ini:</div>
                          {cluster.headlines.map(h => (
                            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', borderBottom: '1px solid #161b22' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="mono" style={{ fontSize: '10px', color: '#8b949e' }}>{h.source} • {h.time}</div>
                                <div style={{ fontSize: '12px', color: '#c9d1d9', marginTop: '2px' }}>{h.title}</div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <a href={h.url} target="_blank" rel="noopener noreferrer" aria-label="Buka berita" style={{ width: '30px', height: '30px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '12px', flexShrink: 0 }}>🔗</a>
                                <EditorLink url={h.url} judul={h.title} size={30} radius={6} bg="#161b22" fontSize={13} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {displayClusters.length === 0 && (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#8b949e', fontSize: '13px', backgroundColor: '#161b22', border: '1px dashed #30363d', borderRadius: '12px' }}>
                    {activeFilter
                      ? `Belum ada isu ${FILTERS[activeFilter].label} dalam ${trendTimeFilter}. Coba filter waktu yang lebih panjang.`
                      : `Tidak ada berita dalam ${trendTimeFilter}.`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
