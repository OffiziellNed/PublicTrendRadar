"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, LayoutGrid, Flame, ExternalLink, Share2, ChevronDown, ChevronUp, ChevronLeft, WifiOff } from 'lucide-react';

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

const FILTER_ORDER = ['hot', 'potensi', 'positif', 'kutipan'];

// ---------- Editor Agora Vada ----------
// Isi ENV NEXT_PUBLIC_EDITOR_URL di Vercel (project Radar), contoh: https://agoravada.vercel.app
const EDITOR_URL = (process.env.NEXT_PUBLIC_EDITOR_URL || '').replace(/\/+$/, '');
function editorLink(url, judul) {
  if (!EDITOR_URL || !url) return null;
  return `${EDITOR_URL}/?url=${encodeURIComponent(url)}&judul=${encodeURIComponent(judul || '')}`;
}

function EditorIcon({ size = 18 }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: 5, background: '#f0883e', color: '#000', fontWeight: 800, fontSize: Math.round(size * 0.68), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}>A</span>
  );
}

// Tombol "A": buka editor & otomatis tarik berita
function EditorButton({ url, judul, onMissing, compact }) {
  const href = editorLink(url, judul);
  const label = compact ? null : <span>Editor</span>;
  if (!href) {
    return <button onClick={onMissing} aria-label="Buka di editor Agora Vada"><EditorIcon size={compact ? 22 : 18} />{label}</button>;
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Buka di editor Agora Vada"><EditorIcon size={compact ? 22 : 18} />{label}</a>;
}
const AUTO_REFRESH_MS = 5 * 60 * 1000; // refresh otomatis tiap 5 menit saat aplikasi dibuka

// ---------- Filter & urutan (dipakai di detail topik dan tab Paling Panas) ----------
function applyFilter(list, filter) {
  let out = list;
  if (filter === 'hot') out = out.filter(c => c.kategori === 'hot');
  if (filter === 'potensi') out = out.filter(c => c.kategori === 'potensi');
  if (filter === 'positif') out = out.filter(c => c.sentiment === 'positif');
  if (filter === 'kutipan') {
    out = out.filter(c => c.isKutipan).map(c => ({
      ...c,
      title: c.quoteHeadline.title,
      mainUrl: c.quoteHeadline.url,
      time: c.quoteHeadline.time,
      source: c.quoteHeadline.source,
    }));
  }
  return out;
}
function sortClusters(list, filter, byHeat) {
  const heatFirst = byHeat || filter === 'hot' || filter === 'potensi';
  return [...list].sort((a, b) => heatFirst ? (b.heat - a.heat) || (a.minutesAgo - b.minutesAgo) : a.minutesAgo - b.minutesAgo);
}

// ---------- Gaya ----------
const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap");
:root {
  --bg: #0a0a0f; --surface: #12161d; --surface-2: #0d1117; --line: #252b35; --line-soft: #1b2028;
  --text: #e6edf3; --muted: #8b949e; --faint: #4b535d; --blue: #58a6ff; --green: #22c55e; --red: #f87171;
  --safe-top: env(safe-area-inset-top, 0px); --safe-bottom: env(safe-area-inset-bottom, 0px);
}
html, body { background: var(--bg) !important; color: var(--text); margin: 0; padding: 0; overscroll-behavior-y: auto; -webkit-tap-highlight-color: transparent; }
* { box-sizing: border-box; font-family: 'Geist', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
.mono { font-family: 'Geist Mono', ui-monospace, Menlo, monospace; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }

.app { min-height: 100dvh; background: var(--bg); padding-bottom: calc(76px + var(--safe-bottom)); }

/* Top bar */
.topbar { position: sticky; top: 0; z-index: 20; background: rgba(10,10,15,0.94); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--line-soft); padding: calc(10px + var(--safe-top)) 16px 12px; }
.topbar-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; max-width: 1120px; margin: 0 auto; }
.brand { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; }
.sync { font-size: 11px; color: var(--muted); margin-top: 3px; display: flex; align-items: center; gap: 6px; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); flex-shrink: 0; }
.dot.err { background: var(--red); } .dot.wait { background: #eab308; }
.icon-btn { width: 44px; height: 44px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: var(--surface); border: 1px solid var(--line); color: var(--text); flex-shrink: 0; }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; max-width: 1120px; margin: 12px auto 0; }
.seg button { height: 36px; border-radius: 9px; font-size: 13px; font-weight: 700; color: var(--muted); }
.seg button[aria-pressed="true"] { background: var(--text); color: #000; }

.main { max-width: 1120px; margin: 0 auto; padding: 14px 16px 24px; }
.banner { padding: 12px 14px; border-radius: 12px; border: 1px solid #7f1d1d; background: rgba(127,29,29,0.22); color: #fca5a5; font-size: 13px; margin-bottom: 12px; display: flex; gap: 8px; align-items: center; }

/* Ringkasan */
.summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.stat { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 10px 6px; text-align: center; min-height: 64px; }
.stat-num { font-size: 20px; font-weight: 800; line-height: 1.1; margin-top: 2px; }
.stat-label { font-size: 10.5px; color: var(--muted); margin-top: 2px; }

.section-title { font-size: 13px; font-weight: 700; color: var(--muted); margin: 0 2px 10px; }

/* Kartu topik */
.topics { display: grid; grid-template-columns: 1fr; gap: 10px; }
@media (min-width: 720px) { .topics { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1040px) { .topics { grid-template-columns: repeat(3, 1fr); } }
.topic { width: 100%; text-align: left; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.topic:active { background: #161b24; }
.topic[disabled] { opacity: 0.55; cursor: default; }
.topic.err { border-color: #7f1d1d; }
.topic-head { display: flex; gap: 12px; align-items: center; }
.topic-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; font-size: 21px; flex-shrink: 0; }
.topic-name { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.topic-meta { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
.topic-counts { display: flex; gap: 12px; font-size: 12px; }
.topic-counts .off { color: var(--faint); }
.topic-preview { font-size: 13px; color: #c9d1d9; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* Chips filter */
.chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 2px 16px 2px; margin: 0 -16px; }
.chips::-webkit-scrollbar { display: none; }
.chip { flex-shrink: 0; height: 36px; padding: 0 14px; border-radius: 18px; background: var(--surface); border: 1px solid var(--line); font-size: 13px; font-weight: 600; color: #c9d1d9; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.chip .n { font-size: 11px; color: var(--muted); font-weight: 700; }
.chip[aria-pressed="true"] { color: #000; }
.chip[aria-pressed="true"] .n { color: rgba(0,0,0,0.65); }
.filter-desc { font-size: 12px; color: var(--muted); margin-top: 8px; line-height: 1.45; }

/* Kartu isu */
.list { display: flex; flex-direction: column; gap: 10px; }
.isu { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
.isu.hot { border-color: #7c2d12; }
.isu-body { padding: 14px 14px 10px; }
.isu-meta { font-size: 11.5px; color: var(--muted); display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.isu-topic { color: #c9d1d9; font-weight: 600; }
.isu-title { font-size: 15px; font-weight: 650; line-height: 1.42; margin-top: 6px; }
.badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; border: 1px solid var(--line); white-space: nowrap; }
.actions { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--line-soft); }
.actions > * { height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; font-size: 12px; font-weight: 600; color: #c9d1d9; text-decoration: none; white-space: nowrap; }
.actions > * + * { border-left: 1px solid var(--line-soft); }
.actions .disabled { color: var(--faint); }
.sources { border-top: 1px solid var(--line-soft); background: var(--surface-2); }
.source-row { display: flex; gap: 6px; align-items: center; padding: 6px 8px 6px 14px; border-bottom: 1px solid var(--line-soft); }
.source-link { flex: 1; min-width: 0; display: flex; gap: 10px; align-items: center; padding: 4px 0; text-decoration: none; color: inherit; }
.source-row .mini { width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.source-row .mini > a, .source-row .mini > button { width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; }
.source-row:last-child { border-bottom: 0; }
.source-title { font-size: 13px; color: #c9d1d9; margin-top: 2px; line-height: 1.4; }
.empty { padding: 28px 16px; text-align: center; color: var(--muted); font-size: 13px; border: 1px dashed var(--line); border-radius: 16px; background: var(--surface); line-height: 1.5; }

/* Sheet detail */
.sheet { position: fixed; inset: 0; z-index: 40; background: var(--bg); display: flex; flex-direction: column; }
@media (min-width: 760px) { .sheet { background: rgba(10,10,15,0.9); align-items: center; padding: 24px; } .sheet-inner { max-width: 720px; border: 1px solid var(--line); border-radius: 18px; } }
.sheet-inner { width: 100%; height: 100%; display: flex; flex-direction: column; background: var(--bg); overflow: hidden; }
.sheet-head { padding: calc(10px + var(--safe-top)) 16px 12px; border-bottom: 1px solid var(--line-soft); }
.sheet-title { display: flex; align-items: center; gap: 10px; min-width: 0; }
.sheet-title .t { font-size: 17px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sheet-sub { font-size: 11.5px; color: var(--muted); }
.toggle { margin-top: 10px; height: 32px; padding: 0 12px; border-radius: 16px; font-size: 12px; font-weight: 600; border: 1px solid var(--line); color: var(--muted); background: var(--surface); }
.toggle[aria-pressed="true"] { border-color: var(--blue); color: var(--blue); background: rgba(88,166,255,0.12); }
.sheet-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 14px 16px calc(24px + var(--safe-bottom)); }

/* Navigasi bawah */
.bottomnav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; background: rgba(13,17,23,0.96); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-top: 1px solid var(--line-soft); padding-bottom: var(--safe-bottom); display: grid; grid-template-columns: 1fr 1fr; }
.bottomnav button { height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 11px; font-weight: 600; color: var(--muted); }
.bottomnav button[aria-current="page"] { color: var(--text); }
.bottomnav .pill { width: 52px; height: 28px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
.bottomnav button[aria-current="page"] .pill { background: #1f2630; }

.toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(84px + var(--safe-bottom)); z-index: 60; background: var(--text); color: #000; font-size: 13px; font-weight: 600; padding: 10px 16px; border-radius: 12px; }
`;

const BADGE_STYLE = {
  hot: { background: 'rgba(255,69,0,0.15)', color: '#ff8a5c', borderColor: '#9a3412' },
  potensi: { background: 'rgba(250,204,21,0.12)', color: '#fde047', borderColor: '#854d0e' },
  positif: { background: 'rgba(225,29,72,0.12)', color: '#fb7185', borderColor: '#9f1239' },
  kutipan: { background: 'rgba(167,139,250,0.12)', color: '#c4b5fd', borderColor: '#5b21b6' },
  negatif: { background: 'transparent', color: '#f87171' },
  campur: { background: 'transparent', color: '#c9d1d9' },
  info: { background: 'transparent', color: '#8b949e' },
};

function IsuBadges({ c }) {
  return (
    <div className="badges">
      {c.kategori === 'hot' && <span className="badge" style={BADGE_STYLE.hot}>🔥 Hot</span>}
      {c.kategori === 'potensi' && <span className="badge" style={BADGE_STYLE.potensi}>⚡ Potensi</span>}
      {c.sentiment === 'positif' && <span className="badge" style={BADGE_STYLE.positif}>❤️ Positif</span>}
      {c.isKutipan && <span className="badge" style={BADGE_STYLE.kutipan}>💬 Kutipan</span>}
      {c.sentiment === 'negatif' && <span className="badge" style={BADGE_STYLE.negatif}>Negatif</span>}
      {c.sentiment === 'campur' && <span className="badge" style={BADGE_STYLE.campur}>Campur</span>}
      <span className="badge" style={BADGE_STYLE.info}>{c.sourceCount} media{c.sources60 > 0 ? ` • ${c.sources60} dalam 1 jam` : ''}</span>
    </div>
  );
}

function IsuCard({ c, expanded, onToggle, onShare, showTopic, onEditorMissing }) {
  return (
    <article className={`isu${c.kategori === 'hot' ? ' hot' : ''}`}>
      <div className="isu-body">
        <div className="isu-meta mono">
          {showTopic && <span className="isu-topic">{c.topicIcon} {c.topicTitle}</span>}
          <span>{c.source}</span><span>•</span><span>{c.time}</span>
        </div>
        <div className="isu-title">{c.title}</div>
        <IsuBadges c={c} />
      </div>
      <div className="actions">
        <a href={c.mainUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Buka</a>
        <EditorButton url={c.mainUrl} judul={c.title} onMissing={onEditorMissing} />
        <button onClick={() => onShare(c)}><Share2 size={16} /> Bagikan</button>
        {c.isCluster
          ? <button onClick={onToggle} aria-expanded={!!expanded}>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {c.count}</button>
          : <span className="disabled">1 berita</span>}
      </div>
      {c.isCluster && expanded && (
        <div className="sources">
          {c.headlines.map(h => (
            <div key={h.id} className="source-row">
              <a className="source-link" href={h.url} target="_blank" rel="noopener noreferrer">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>{h.source} • {h.time}</div>
                  <div className="source-title">{h.title}</div>
                </div>
                <ExternalLink size={15} color="var(--muted)" />
              </a>
              <span className="mini"><EditorButton url={h.url} judul={h.title} onMissing={onEditorMissing} compact /></span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function FilterChips({ active, onChange, counts, allLabel }) {
  return (
    <div className="chips" role="toolbar" aria-label="Filter isu">
      {allLabel && (
        <button className="chip" aria-pressed={!active} onClick={() => onChange(null)} style={!active ? { background: 'var(--text)', borderColor: 'var(--text)' } : undefined}>
          {allLabel}
        </button>
      )}
      {FILTER_ORDER.map(key => {
        const f = FILTERS[key];
        const on = active === key;
        return (
          <button key={key} className="chip" aria-pressed={on} title={f.desc}
            onClick={() => onChange(on && !allLabel ? null : key)}
            style={on ? { background: f.color, borderColor: f.border } : undefined}>
            <span>{f.icon}</span><span>{f.label}</span><span className="n">{counts?.[key] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Page() {
  const [trendTimeFilter, setTrendTimeFilter] = useState('3 Jam');
  const [trendTopics, setTrendTopics] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [tab, setTab] = useState('topik');
  const [feedFilter, setFeedFilter] = useState('hot');
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [groupSimilar, setGroupSimilar] = useState(true);
  const [expandedClusters, setExpandedClusters] = useState({});
  const [toast, setToast] = useState('');
  const lastFetchRef = useRef(0);

  // ---------- Ambil data ----------
  const fetchRadar = useCallback(async () => {
    setTrendLoading(true);
    try {
      const res = await fetch(`/api/trend-radar?filter=${encodeURIComponent(trendTimeFilter)}`);
      const data = await res.json();
      if (data?.topics) {
        setTrendTopics(data.topics);
        setFetchError(false);
        setLastSync(data.lastSync ? new Date(data.lastSync) : new Date());
      } else setFetchError(true);
    } catch { setFetchError(true); }
    finally {
      setTrendLoading(false);
      lastFetchRef.current = Date.now();
      setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    }
  }, [trendTimeFilter]);

  useEffect(() => { fetchRadar(); }, [fetchRadar]);

  // Refresh otomatis + saat aplikasi dibuka lagi dari background
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > AUTO_REFRESH_MS) fetchRadar(); };
    const id = setInterval(tick, 60 * 1000);
    document.addEventListener('visibilitychange', tick);
    const onOnline = () => { setOffline(false); fetchRadar(); };
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [fetchRadar]);

  // Service worker (dibutuhkan supaya bisa di-install sebagai aplikasi)
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  // ---------- Tombol "kembali" Android menutup detail, bukan keluar aplikasi ----------
  useEffect(() => {
    const onPop = () => setShowDetail(false);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openDetail = (id) => {
    setSelectedTopicId(id);
    setActiveFilter(null);
    setExpandedClusters({});
    setShowDetail(true);
    window.history.pushState({ sheet: true }, '');
  };
  const closeDetail = () => {
    if (window.history.state?.sheet) window.history.back();
    else setShowDetail(false);
  };

  useEffect(() => {
    document.body.style.overflow = showDetail ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showDetail]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  // ---------- Olah data ----------
  const analyzedTopics = useMemo(() => trendTopics.map(analyzeTopic), [trendTopics]);
  const selectedTopic = useMemo(() => analyzedTopics.find(t => t.id === selectedTopicId) || null, [analyzedTopics, selectedTopicId]);

  const totals = useMemo(() => {
    const t = { hot: 0, potensi: 0, positif: 0, kutipan: 0 };
    analyzedTopics.forEach(tp => FILTER_ORDER.forEach(k => { t[k] += tp.counts[k]; }));
    return t;
  }, [analyzedTopics]);

  // Semua isu dari semua topik, digabung kalau isunya sama
  const allIsu = useMemo(() => {
    const map = new Map();
    analyzedTopics.forEach(tp => tp.analyzed.forEach(c => {
      const key = c.title.toLowerCase();
      const item = { ...c, topicTitle: tp.title, topicIcon: tp.icon };
      const prev = map.get(key);
      if (!prev || item.heat > prev.heat) map.set(key, item);
    }));
    return [...map.values()];
  }, [analyzedTopics]);

  const feedCounts = useMemo(() => ({
    hot: allIsu.filter(c => c.kategori === 'hot').length,
    potensi: allIsu.filter(c => c.kategori === 'potensi').length,
    positif: allIsu.filter(c => c.sentiment === 'positif').length,
    kutipan: allIsu.filter(c => c.isKutipan).length,
  }), [allIsu]);

  const feedList = useMemo(() => sortClusters(applyFilter(allIsu, feedFilter), feedFilter, true).slice(0, 60), [allIsu, feedFilter]);

  const detailList = useMemo(() => {
    if (!selectedTopic) return [];
    const list = sortClusters(applyFilter(selectedTopic.analyzed, activeFilter), activeFilter, false);
    if (groupSimilar) return list;
    return list.flatMap(c => c.headlines
      .filter(h => activeFilter !== 'kutipan' || isQuoteTitle(h.title))
      .map(h => ({ ...c, id: `single-${h.id}`, isCluster: false, count: 1, title: h.title, mainUrl: h.url, time: h.time, minutesAgo: h.minutesAgo, source: h.source, headlines: [h] })));
  }, [selectedTopic, activeFilter, groupSimilar]);

  const editorMissing = () => setToast('Isi NEXT_PUBLIC_EDITOR_URL di Vercel dulu');
  const toggleExpand = (id) => setExpandedClusters(prev => ({ ...prev, [id]: !prev[id] }));

  const shareIsu = async (c) => {
    const text = `${c.title}\n${c.source} • ${c.time}`;
    try {
      if (navigator.share) { await navigator.share({ title: c.title, text, url: c.mainUrl }); return; }
      await navigator.clipboard.writeText(`${text}\n${c.mainUrl}`);
      setToast('Disalin ke clipboard');
    } catch (e) {
      if (e?.name !== 'AbortError') setToast('Gagal membagikan');
    }
  };

  const syncLabel = trendLoading ? 'Memperbarui…'
    : offline ? 'Offline • data terakhir'
    : fetchError ? 'Gagal sync'
    : lastSync ? `Diperbarui ${lastSync.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
    : 'Memuat…';
  const dotClass = trendLoading ? 'dot wait' : (fetchError || offline) ? 'dot err' : 'dot';

  return (
    <div className="app">
      <style>{CSS}</style>

      <header className="topbar">
        <div className="topbar-row">
          <div style={{ minWidth: 0 }}>
            <div className="brand">Trend Radar</div>
            <div className="sync mono"><span className={dotClass} />{syncLabel}</div>
          </div>
          <button className="icon-btn" onClick={fetchRadar} disabled={trendLoading} aria-label="Perbarui data">
            <RefreshCw size={19} className={trendLoading ? 'spin' : ''} />
          </button>
        </div>
        <div className="seg" role="group" aria-label="Rentang waktu">
          {['3 Jam', '6 Jam', '24 Jam'].map(f => (
            <button key={f} aria-pressed={trendTimeFilter === f} onClick={() => setTrendTimeFilter(f)}>{f}</button>
          ))}
        </div>
      </header>

      <main className="main">
        {offline && (
          <div className="banner"><WifiOff size={16} /> Tidak ada koneksi. Yang tampil adalah data terakhir yang tersimpan.</div>
        )}
        {fetchError && !offline && !trendLoading && (
          <div className="banner">Data radar tidak bisa diambil. Tekan tombol perbarui di kanan atas untuk mencoba lagi.</div>
        )}

        {tab === 'topik' && (
          <>
            <div className="summary">
              {FILTER_ORDER.map(k => (
                <button key={k} className="stat" title={FILTERS[k].desc} onClick={() => { setFeedFilter(k); setTab('panas'); window.scrollTo(0, 0); }}>
                  <div style={{ fontSize: '16px' }}>{FILTERS[k].icon}</div>
                  <div className="stat-num" style={{ color: totals[k] ? 'var(--text)' : 'var(--faint)' }}>{totals[k]}</div>
                  <div className="stat-label">{FILTERS[k].label}</div>
                </button>
              ))}
            </div>

            <div className="section-title">Topik • {trendTimeFilter} terakhir</div>
            <div className="topics">
              {analyzedTopics.length === 0 && trendLoading && <div className="empty">Mengambil berita terbaru…</div>}
              {analyzedTopics.map(topic => {
                const total = topic.headlines?.length || 0;
                const isEmpty = total === 0;
                const isError = !!topic.error;
                const top = [...topic.analyzed].sort((a, b) => b.heat - a.heat)[0];
                return (
                  <button key={topic.id} className={`topic${isError ? ' err' : ''}`} disabled={isEmpty} onClick={() => openDetail(topic.id)}>
                    <div className="topic-head">
                      <div className="topic-icon">{topic.icon}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="topic-name">{topic.title}</div>
                        <div className="topic-meta mono" style={isError ? { color: 'var(--red)' } : undefined}>
                          {isError ? 'Gagal ambil data' : isEmpty ? `Belum ada berita dalam ${trendTimeFilter}` : `${total} berita • ${topic.analyzed.length} isu`}
                          {topic.partialError && !isError ? ' • sebagian gagal' : ''}
                        </div>
                      </div>
                    </div>
                    {!isEmpty && (
                      <>
                        <div className="topic-counts mono">
                          {FILTER_ORDER.map(k => (
                            <span key={k} className={topic.counts[k] ? '' : 'off'}>{FILTERS[k].icon} {topic.counts[k]}</span>
                          ))}
                        </div>
                        {top && <div className="topic-preview">{top.kategori === 'hot' ? '🔥 ' : top.kategori === 'potensi' ? '⚡ ' : ''}{top.title}</div>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tab === 'panas' && (
          <>
            <FilterChips active={feedFilter} onChange={setFeedFilter} counts={feedCounts} allLabel="Semua" />
            <div className="filter-desc">
              {feedFilter ? FILTERS[feedFilter].desc : 'Semua isu dari semua topik, diurutkan dari yang paling ramai.'}
            </div>
            <div className="list" style={{ marginTop: '14px' }}>
              {feedList.map(c => (
                <IsuCard key={c.id} c={c} showTopic expanded={expandedClusters[c.id]} onToggle={() => toggleExpand(c.id)} onShare={shareIsu} onEditorMissing={editorMissing} />
              ))}
              {feedList.length === 0 && (
                <div className="empty">
                  {feedFilter ? `Belum ada isu ${FILTERS[feedFilter].label} dalam ${trendTimeFilter}.` : `Belum ada isu dalam ${trendTimeFilter}.`}
                  <br />Coba rentang waktu yang lebih panjang.
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <nav className="bottomnav" aria-label="Navigasi utama">
        <button aria-current={tab === 'topik' ? 'page' : undefined} onClick={() => { setTab('topik'); window.scrollTo(0, 0); }}>
          <span className="pill"><LayoutGrid size={20} /></span>Topik
        </button>
        <button aria-current={tab === 'panas' ? 'page' : undefined} onClick={() => { setTab('panas'); window.scrollTo(0, 0); }}>
          <span className="pill"><Flame size={20} /></span>Paling Panas
        </button>
      </nav>

      {showDetail && selectedTopic && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label={selectedTopic.title}>
          <div className="sheet-inner">
            <div className="sheet-head">
              <div className="sheet-title">
                <button className="icon-btn" onClick={closeDetail} aria-label="Kembali"><ChevronLeft size={20} /></button>
                <div style={{ minWidth: 0 }}>
                  <div className="t">{selectedTopic.icon} {selectedTopic.title}</div>
                  <div className="sheet-sub mono">{selectedTopic.headlines.length} berita • {selectedTopic.analyzed.length} isu • {trendTimeFilter}</div>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <FilterChips active={activeFilter} onChange={setActiveFilter} counts={selectedTopic.counts} />
              </div>
              {activeFilter && <div className="filter-desc">{FILTERS[activeFilter].desc}</div>}
              <button className="toggle" aria-pressed={groupSimilar} onClick={() => setGroupSimilar(!groupSimilar)}>
                {groupSimilar ? `✓ Gabung berita mirip • ${detailList.length} isu` : `Per judul • ${detailList.length} berita`}
              </button>
            </div>
            <div className="sheet-body">
              <div className="list">
                {detailList.map(c => (
                  <IsuCard key={c.id} c={c} expanded={expandedClusters[c.id]} onToggle={() => toggleExpand(c.id)} onShare={shareIsu} onEditorMissing={editorMissing} />
                ))}
                {detailList.length === 0 && (
                  <div className="empty">
                    {activeFilter ? `Belum ada isu ${FILTERS[activeFilter].label} di topik ini dalam ${trendTimeFilter}.` : `Tidak ada berita dalam ${trendTimeFilter}.`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
