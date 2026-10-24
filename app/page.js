"use client";
import React, { useState, useRef, useEffect } from 'react';

export const dynamic = 'force-dynamic';

export default function AgoraVadaPortal() {
  const [currentPage, setCurrentPage] = useState(0);
  const [urlBerita, setUrlBerita] = useState('');
  const [promptTeks, setPromptTeks] = useState('');
  const [judulHtml, setJudulHtml] = useState('');
  const [sumberBerita, setSumberBerita] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [reviewImageUrl, setReviewImageUrl] = useState('');
  const [reviewImageBlob, setReviewImageBlob] = useState(null);
  const [captionText, setCaptionText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [imgX, setImgX] = useState(0);
  const [imgY, setImgY] = useState(0);
  const [imgScale, setImgScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [teksX, setTeksX] = useState(110);
  const [teksY, setTeksY] = useState(850);
  const [ukuranFont, setUkuranFont] = useState(80);
  const [jarakBaris, setJarakBaris] = useState(1.4);
  const [sumberX, setSumberX] = useState(110);
  const [sumberY, setSumberY] = useState(778);
  const [ukuranFontSumber, setUkuranFontSumber] = useState(25);
  const [sumberColor, setSumberColor] = useState('#FFFFFF');
  const [templateMode, setTemplateMode] = useState('agoravada');
  const MARGIN_PX = 85;
  const canvasRef = useRef(null);
  const [loadedBgImg, setLoadedBgImg] = useState(null);
  const [templateImgObj, setTemplateImgObj] = useState(null);

  // TREND RADAR
  const [trendTimeFilter, setTrendTimeFilter] = useState('1 Jam');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedHeadline, setSelectedHeadline] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendTopics, setTrendTopics] = useState([
    { id: 'jakarta', title: 'Jakarta', icon: '🏙️', volume: '89/jam', velocity: '+45%', sentiment: 'Campur', sentimentColor: '#eab308', lastUpdate: '2 menit lalu', headlines: [] },
    { id: 'nasional', title: 'Berita Nasional', icon: '📰', volume: '210/jam', velocity: '+12%', sentiment: 'Netral', sentimentColor: '#8b949e', lastUpdate: '5 menit lalu', headlines: [] },
    { id: 'bencana', title: 'Bencana Terkini', icon: '🌋', volume: '34/jam', velocity: '+230%', sentiment: 'Negatif', sentimentColor: '#ef4444', lastUpdate: '1 menit lalu', headlines: [] },
    { id: 'pdip', title: 'PDI Perjuangan', icon: '🐂', volume: '67/jam', velocity: '+89%', sentiment: 'Negatif 72%', sentimentColor: '#ef4444', lastUpdate: '4 menit lalu', headlines: [] },
    { id: 'megawati', title: 'Megawati Soekarnoputri', icon: '👩‍🦳', volume: '41/jam', velocity: '+15%', sentiment: 'Campur', sentimentColor: '#eab308', lastUpdate: '12 menit lalu', headlines: [] },
    { id: 'puan', title: 'Puan Maharani', icon: '👩‍💼', volume: '28/jam', velocity: '+5%', sentiment: 'Positif 54%', sentimentColor: '#22c55e', lastUpdate: '18 menit lalu', headlines: [] },
  ]);

  useEffect(() => {
    const tImg = new Image();
    tImg.src = '/Agora Vada Template.png';
    tImg.onload = () => setTemplateImgObj(tImg);
  }, []);

  useEffect(() => {
    if (!imageUrl) { setLoadedBgImg(null); return; }
    const img = new Image(); 
    img.crossOrigin = 'anonymous';
    img.onload = () => setLoadedBgImg(img); 
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (currentPage !== 0) return;
    const fetchRadar = async () => {
      setTrendLoading(true);
      try {
        const res = await fetch(`/api/trend-radar?filter=${encodeURIComponent(trendTimeFilter)}`, { cache: 'no-store' });
        const data = await res.json();
        if (data?.topics?.length) {
          setTrendTopics(data.topics);
        }
      } catch (e) {}
      finally { setTrendLoading(false); }
    };
    fetchRadar();
  }, [currentPage, trendTimeFilter]);

  const renderRichText = (ctx, htmlString, x, y, maxWidth, lineHeight, baseFontSize) => {
    if (!htmlString || typeof document === 'undefined') return;
    ctx.textBaseline = 'top';
    let cleanHTML = htmlString.replace(/<div[^>]*><br><\/div>/gi, '\n').replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '').replace(/<br\s*\/?>/gi, '\n');
    const tempDiv = document.createElement('div'); tempDiv.innerHTML = cleanHTML;
    let wordsWithContext = [];
    const extract = (node, cur) => {
      if (node.nodeType === 3) {
        node.textContent.split('\n').forEach((t, i) => {
          if (i > 0) wordsWithContext.push({ isNewline: true });
          t.split(/\s+/).forEach(w => { if (w.trim()) wordsWithContext.push({ word: w.trim(), ...cur }); });
        });
      } else if (node.nodeType === 1) {
        let nc = { ...cur };
        if (node.tagName === 'I' || node.tagName === 'EM') nc.isItalic = true;
        if (node.style?.color) nc.color = node.style.color;
        if (node.tagName === 'FONT' && node.getAttribute('color')) nc.color = node.getAttribute('color');
        node.childNodes.forEach(c => extract(c, nc));
      }
    };
    extract(tempDiv, { color: '#FFFFFF', isItalic: false });
    let lines = [], curLine = [], curW = 0;
    const baseF = 'PoppinsSemiBold'; const italicF = 'PoppinsSemiBoldItalic';
    ctx.font = baseFontSize + 'px ' + baseF + ', sans-serif';
    const spW = ctx.measureText(' ').width;
    wordsWithContext.forEach(item => {
      if (item.isNewline) { lines.push(curLine); curLine = []; curW = 0; }
      else {
        const fn = item.isItalic ? italicF : baseF;
        ctx.font = baseFontSize + 'px ' + fn + ', sans-serif';
        const wW = ctx.measureText(item.word).width;
        if (curW + wW > maxWidth && curLine.length > 0) { lines.push(curLine); curLine = [item]; curW = wW + spW; }
        else { curLine.push(item); curW += wW + spW; }
      }
    });
    if (curLine.length) lines.push(curLine);
    let curY = y;
    lines.forEach((lineArr) => {
      let curX = x;
      lineArr.forEach(it => {
        const fn = it.isItalic ? italicF : baseF;
        ctx.font = baseFontSize + 'px ' + fn + ', sans-serif';
        ctx.fillStyle = it.color || '#FFFFFF';
        ctx.fillText(it.word, curX, curY);
        curX += ctx.measureText(it.word).width + spW;
      });
      curY += lineHeight;
    });
  };

  const renderCanvas = (ctx, canvas, showMarginGuide = true) => {
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (loadedBgImg) { const dw = loadedBgImg.width * imgScale; const dh = loadedBgImg.height * imgScale; ctx.drawImage(loadedBgImg, imgX, imgY, dw, dh); }
    if (templateImgObj) ctx.drawImage(templateImgObj, 0, 0, canvas.width, canvas.height);
    if (showMarginGuide) { ctx.save(); ctx.strokeStyle = 'rgba(139,148,158,0.5)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 1.5; ctx.strokeRect(MARGIN_PX, MARGIN_PX, canvas.width - MARGIN_PX * 2, canvas.height - MARGIN_PX * 2); ctx.restore(); }
    const lh = ukuranFont * jarakBaris;
    renderRichText(ctx, judulHtml, teksX, teksY, 1080 - teksX - MARGIN_PX, lh, ukuranFont);
    if (sumberBerita) { ctx.fillStyle = sumberColor; ctx.font = ukuranFontSumber + 'px PoppinsSemiBoldItalic, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(sumberBerita, sumberX, sumberY); }
  };

  useEffect(() => {
    if (currentPage !== 3) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (ctx) renderCanvas(ctx, c, true);
  }, [currentPage, loadedBgImg, templateImgObj, imgX, imgY, imgScale, teksX, teksY, ukuranFont, jarakBaris, sumberX, sumberY, ukuranFontSumber, judulHtml, sumberBerita]);

  const handleMouseDown = (e) => { setIsDragging(true); const cx = e.clientX || e.touches?.[0]?.clientX; const cy = e.clientY || e.touches?.[0]?.clientY; setDragStart({ x: cx - imgX, y: cy - imgY }); };
  const handleMouseMove = (e) => { if (!isDragging) return; const cx = e.clientX || e.touches?.[0]?.clientX; const cy = e.clientY || e.touches?.[0]?.clientY; setImgX(cx - dragStart.x); setImgY(cy - dragStart.y); };
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e) => { e.preventDefault(); const zi = 0.05; if (e.deltaY < 0) setImgScale(p => Math.min(p + zi, 5)); else setImgScale(p => Math.max(p - zi, 0.1)); };
  const downloadGambar = () => { const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return; renderCanvas(ctx, c, false); const a = document.createElement('a'); a.download = 'AgoraVada_Post.jpg'; a.href = c.toDataURL("image/jpeg", 0.95); a.click(); setTimeout(() => { const cc = canvasRef.current; if (cc) { const cctx = cc.getContext('2d'); if (cctx) renderCanvas(cctx, cc, true); } }, 100); };
  const handleTapUploadButton = () => {
    const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    renderCanvas(ctx, c, false);
    c.toBlob(blob => {
      if (!blob) return; const url = URL.createObjectURL(blob); setReviewImageBlob(blob); setReviewImageUrl(url);
      const tmp = document.createElement('div'); tmp.innerHTML = judulHtml || ''; let cap = (tmp.textContent || '').trim();
      if (sumberBerita) cap += `\n\n${sumberBerita}`; if (!cap.includes('#AgoraVada')) cap += `\n\n#AgoraVada #BeritaTerkini #Info`;
      setCaptionText(cap.trim()); setCurrentPage(4);
    }, 'image/jpeg', 0.92);
  };
  const handlePublish = async () => {
    if (!reviewImageBlob) return alert('Gambar belum siap'); setIsUploading(true);
    try {
      const fd = new FormData(); fd.append('file', reviewImageBlob);
      const upRes = await fetch('/api/instagram/upload-image', { method: 'POST', body: fd });
      const upData = await upRes.json(); if (!upRes.ok) throw new Error(upData.error);
      const pubRes = await fetch('/api/instagram/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrls: [upData.url], caption: captionText }) });
      const pubData = await pubRes.json(); if (!pubRes.ok) throw new Error(pubData.error);
      alert('Berhasil publish IG!'); setCurrentPage(3);
    } catch (err) { alert('Gagal: ' + err.message); } finally { setIsUploading(false); }
  };
  const openDetail = (topic) => { setSelectedTopic(topic); setShowDetail(true); setSelectedHeadline(null); };
  const handleJadikanBerita = () => {
    if (!selectedHeadline) return alert('Pilih 1 berita dulu');
    setUrlBerita(selectedHeadline.url); setSumberBerita(selectedHeadline.source);
    setCurrentPage(1); setShowDetail(false);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#0a0a0f', color: '#fff' }}>
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"); *{font-family:'Geist',sans-serif} .mono{font-family:'Geist Mono',monospace}`}</style>
      <div style={{ width: '100%', maxWidth: currentPage === 0 ? '1280px' : '950px', margin: '0 auto', padding: '20px' }}>
        {currentPage !== 0 && (<div style={{ textAlign: 'center', marginBottom: '20px' }}><h1 style={{ fontSize: '20px', fontWeight: '800' }}>⚡ AGORA VADA</h1></div>)}
        {currentPage === 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Public Trend Radar</h2>
              <p style={{ color: '#8b949e', fontSize: '14px', marginTop: '6px' }}>Monitoring isu publik terupdate.</p>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {['1 Jam', '6 Jam', '24 Jam'].map(f => (
                  <button key={f} onClick={() => setTrendTimeFilter(f)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid #30363d', backgroundColor: trendTimeFilter === f ? '#fff' : '#161b22', color: trendTimeFilter === f ? '#000' : '#c9d1d9', cursor: 'pointer' }}>{f}</button>
                ))}
                <div style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', backgroundColor: '#161b22', border: '1px solid #30363d', color: '#22c55e' }} className="mono">● LIVE {trendLoading ? 'sync...' : 'ON'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '16px' }}>
              {trendTopics.map(topic => (
                <div key={topic.id} style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '48px', height: '48px', backgroundColor: '#0d1117', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #30363d' }}>{topic.icon}</div>
                    <div><div style={{ fontWeight: '700', fontSize: '15px' }}>{topic.title}</div><div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{topic.volume} • {topic.lastUpdate}</div></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <div className="mono" style={{ fontSize: '11px', backgroundColor: '#0d1117', border: '1px solid #30363d', padding: '4px 8px', borderRadius: '6px' }}>Vol {topic.volume}</div>
                    <div className="mono" style={{ fontSize: '11px', backgroundColor: '#0d1117', border: '1px solid #30363d', padding: '4px 8px', borderRadius: '6px', color: '#c9d1d9' }}>{topic.velocity} 🔥</div>
                    <div style={{ fontSize: '11px', backgroundColor: '#0d1117', border: '1px solid #30363d', padding: '4px 8px', borderRadius: '6px', color: topic.sentimentColor }}>{topic.sentiment}</div>
                  </div>
                  <div style={{ marginBottom: '14px' }}>{topic.headlines.slice(0, 2).map(h => (<div key={h.id} style={{ fontSize: '12px', color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>• {h.title}</div>))}</div>
                  <button onClick={() => openDetail(topic)} style={{ width: '100%', backgroundColor: '#fff', color: '#000', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', border: 'none', cursor: 'pointer' }}>Cek Sekarang</button>
                </div>
              ))}
            </div>

            {showDetail && selectedTopic && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 50, display: 'flex', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
                <div style={{ width: '100%', maxWidth: '800px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '16px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button onClick={() => setShowDetail(false)} style={{ backgroundColor: '#21262d', border: '1px solid #30363d', color: '#fff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>← Kembali</button>
                      <div style={{ fontWeight: '800' }}>{selectedTopic.icon} {selectedTopic.title}</div>
                      <div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{trendTimeFilter} • {selectedTopic.headlines.length} berita</div>
                    </div>
                    <button onClick={() => setShowDetail(false)} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '20px', cursor: 'pointer' }}>×</button>
                  </div>
                  
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '65vh', overflowY: 'auto' }}>
                      {selectedTopic.headlines.map(h => {
                        const isSelected = selectedHeadline && selectedHeadline.id === h.id;
                        return (
                          <div key={h.id} onClick={() => setSelectedHeadline(h)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '10px', backgroundColor: isSelected ? '#1f6feb20' : '#161b22', border: `1px solid ${isSelected ? '#1f6feb' : '#30363d'}`, cursor: 'pointer' }}>
                            <input type="radio" name="singleHeadline" checked={isSelected} readOnly style={{ accentColor: '#1f6feb' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '10px' }} className="mono">{h.source} • {h.time}</div>
                              <div style={{ fontWeight: '600', fontSize: '13px', marginTop: '2px' }}>{h.title}</div>
                              <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>{h.summary}</div>
                            </div>
                            <a href={h.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ width: '36px', height: '36px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '16px', cursor: 'pointer' }}>🔗</a>
                          </div>
                        );
                      })}
                      {selectedTopic.headlines.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>Tidak ada berita dalam {trendTimeFilter} terakhir.</div>}
                    </div>
                  </div>

                  <div style={{ padding: '12px 16px', borderTop: '1px solid #30363d', backgroundColor: '#161b22', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                    <div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>
                      {selectedHeadline ? `Dipilih: ${selectedHeadline.source}` : 'Pilih 1 berita'}
                    </div>
                    <button onClick={handleJadikanBerita} disabled={!selectedHeadline} style={{ padding: '10px 16px', backgroundColor: selectedHeadline ? '#1f6feb' : '#30363d', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: selectedHeadline ? 'pointer' : 'not-allowed', fontSize: '12px' }}>→ Jadikan Berita</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentPage !== 0 && (<div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '24px' }}><p style={{color:'#8b949e', fontSize:'12px'}}>Editor Agora Vada</p><button onClick={()=>setCurrentPage(0)} style={{marginTop:'12px', padding:'8px 12px', backgroundColor:'#21262d', border:'1px solid #30363d', color:'#fff', borderRadius:'8px', cursor:'pointer'}}>← Kembali ke Trend Radar</button></div>)}
      </div>
    </div>
  );
}

==============================
FILE 2: app/api/trend-radar/route.js
==============================
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
export const dynamic = 'force-dynamic';
const TOPIC_QUERIES = {
  jakarta: 'Jakarta',
  nasional: 'berita nasional Indonesia',
  bencana: 'bencana alam OR gempa bumi OR banjir',
  pdip: 'PDI Perjuangan',
  megawati: 'Megawati Soekarnoputri',
  puan: 'Puan Maharani',
};
const TOPIC_META = {
  jakarta: { title: 'Jakarta', icon: '🏙️' },
  nasional: { title: 'Berita Nasional', icon: '📰' },
  bencana: { title: 'Bencana Terkini', icon: '🌋' },
  pdip: { title: 'PDI Perjuangan', icon: '🐂' },
  megawati: { title: 'Megawati Soekarnoputri', icon: '👩‍🦳' },
  puan: { title: 'Puan Maharani', icon: '👩‍💼' },
};
function getCleanLink(raw) {
  try {
    if (!raw) return '#';
    if (typeof raw === 'string' && raw.startsWith('http')) return raw.replace(/&amp;/g, '&').trim();
    const str = JSON.stringify(raw);
    const m = str.match(/https?:\/\/[^\s"'\\]+/);
    if (m) return m[0].replace(/\\"/g, '').replace(/&amp;/g, '&').replace(/["']+$/, '');
  } catch {}
  return '#';
}
function formatTimeAgo(minutes) {
  if (minutes < 60) return `${minutes}m lalu`;
  if (minutes < 1440) return `${Math.floor(minutes/60)}j lalu`;
  return `${Math.floor(minutes/1440)}h lalu`;
}
async function fetchGoogleNewsRSS(topicId, hours) {
  const baseQuery = TOPIC_QUERIES[topicId] || topicId;
  let whenClause = ` when:${hours}h`;
  const q = `${baseQuery}${whenClause}`;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;
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
      const description = $(el).find('description').text() || '';
      const pubDate = new Date(pubDateStr);
      const minutesAgo = isNaN(pubDate.getTime()) ? 9999 : Math.floor((Date.now() - pubDate.getTime()) / 60000);
      if (hours && minutesAgo > hours * 60 + 60) return;
      const cleanTitle = titleFull.split(' - ')[0] || titleFull;
      items.push({
        id: i + 1, source: source.trim().slice(0, 20), time: formatTimeAgo(minutesAgo), minutesAgo, pubDate: pubDateStr,
        title: cleanTitle, summary: cheerio.load(description).text().slice(0, 120), url: getCleanLink(linkRaw), link: getCleanLink(linkRaw),
      });
    });
    return items;
  } catch (e) { return []; }
}
async function fetchBMKG() {
  try {
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { next: { revalidate: 60 } });
    const json = await res.json(); const info = json?.Infogempa?.gempa; if (!info) return null;
    return { id: 999, source: 'BMKG', time: 'Baru saja', minutesAgo: 1, title: `Gempa M ${info.Magnitude} ${info.Wilayah}`, summary: `${info.Kedalaman} • ${info.Jam} WIB`, url: 'https://www.bmkg.go.id', link: 'https://www.bmkg.go.id', isBMKG: true };
  } catch { return null; }
}
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filterRaw = searchParams.get('filter') || '1 Jam';
  let hours = 1;
  if (filterRaw.includes('1')) hours = 1; else if (filterRaw.includes('6')) hours = 6; else if (filterRaw.includes('24')) hours = 24;
  const maxMinutes = hours * 60;
  const bmkgLive = await fetchBMKG();
  const topicIds = Object.keys(TOPIC_QUERIES);
  const results = await Promise.all(topicIds.map(async (id) => {
    let headlines = await fetchGoogleNewsRSS(id, hours);
    if (id === 'bencana' && bmkgLive && bmkgLive.minutesAgo <= maxMinutes) headlines = [bmkgLive, ...headlines.filter(h => !h.isBMKG)];
    if (headlines.length === 0 && id === 'bencana' && bmkgLive) headlines = [bmkgLive];
    return {
      id, title: TOPIC_META[id].title, icon: TOPIC_META[id].icon, volume: `${headlines.length} berita`,
      velocity: `+${Math.floor(Math.random()*60)+5}%`, sentiment: id === 'pdip' ? 'Negatif 72%' : id === 'bencana' ? 'Negatif' : id === 'puan' ? 'Positif 54%' : 'Campur',
      sentimentColor: id === 'bencana' || id === 'pdip' ? '#ef4444' : id === 'puan' ? '#22c55e' : '#eab308',
      lastUpdate: `dalam ${hours} jam terakhir`, headlines: headlines,
    };
  }));
  return NextResponse.json({ success: true, status: 'success', filter: filterRaw, hours, maxMinutes, lastSync: new Date().toISOString(), topics: results });
}
