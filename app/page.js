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
  const [trendTimeFilter, setTrendTimeFilter] = useState('1 Jam');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedHeadline, setSelectedHeadline] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendTopics, setTrendTopics] = useState([
    { id: 'jakarta', title: 'Jakarta', icon: '🏙️', volume: '0 berita', velocity: '+0%', sentiment: 'Campur', sentimentColor: '#eab308', lastUpdate: '-', headlines: [] },
    { id: 'nasional', title: 'Berita Nasional', icon: '📰', volume: '0 berita', velocity: '+0%', sentiment: 'Netral', sentimentColor: '#8b949e', lastUpdate: '-', headlines: [] },
    { id: 'bencana', title: 'Bencana Terkini', icon: '🌋', volume: '0 berita', velocity: '+0%', sentiment: 'Negatif', sentimentColor: '#ef4444', lastUpdate: '-', headlines: [] },
    { id: 'pdip', title: 'PDI Perjuangan', icon: '🐂', volume: '0 berita', velocity: '+0%', sentiment: 'Negatif', sentimentColor: '#ef4444', lastUpdate: '-', headlines: [] },
    { id: 'megawati', title: 'Megawati Soekarnoputri', icon: '👩‍🦳', volume: '0 berita', velocity: '+0%', sentiment: 'Campur', sentimentColor: '#eab308', lastUpdate: '-', headlines: [] },
    { id: 'puan', title: 'Puan Maharani', icon: '👩‍💼', volume: '0 berita', velocity: '+0%', sentiment: 'Positif', sentimentColor: '#22c55e', lastUpdate: '-', headlines: [] },
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
          // SORT TERBARU DI ATAS
          const sortedTopics = data.topics.map(t => ({
            ...t,
            headlines: [...(t.headlines || [])].sort((a,b) => (a.minutesAgo||9999) - (b.minutesAgo||9999))
          }));
          setTrendTopics(sortedTopics);
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
  const openDetail = (topic) => { 
    const sorted = [...(topic.headlines||[])].sort((a,b)=> (a.minutesAgo||9999)-(b.minutesAgo||9999));
    setSelectedTopic({...topic, headlines: sorted}); 
    setShowDetail(true); 
    setSelectedHeadline(null); 
  };
  const handleJadikanBerita = () => {
    if (!selectedHeadline) return alert('Pilih 1 berita dulu');
    setUrlBerita(selectedHeadline.url); setSumberBerita(selectedHeadline.source);
    setCurrentPage(1); setShowDetail(false);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#0a0a0f', color: '#fff' }}>
      <style>{`
        html, body { background-color: #0a0a0f !important; margin:0; padding:0; overscroll-behavior: none; }
        * { font-family: 'Geist', sans-serif; scrollbar-width: thin; scrollbar-color: #30363d #0a0a0f; }
        .mono{font-family:'Geist Mono',monospace}
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }
        @import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap");
      `}</style>
      <div style={{ width: '100%', maxWidth: currentPage === 0 ? '1280px' : '950px', margin: '0 auto', padding: '20px', backgroundColor: '#0a0a0f', minHeight: '100vh' }}>
        {currentPage !== 0 && (<div style={{ textAlign: 'center', marginBottom: '20px' }}><h1 style={{ fontSize: '20px', fontWeight: '800' }}>⚡ AGORA VADA</h1></div>)}
        {currentPage === 0 && (
          <div style={{ backgroundColor: '#0a0a0f' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Public Trend Radar</h2>
              <p style={{ color: '#8b949e', fontSize: '14px', marginTop: '6px' }}>Monitoring isu publik terupdate.</p>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {['1 Jam', '6 Jam', '24 Jam'].map(f => (
                  <button key={f} onClick={() => setTrendTimeFilter(f)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid #30363d', backgroundColor: trendTimeFilter === f ? '#fff' : '#161b22', color: trendTimeFilter === f ? '#000' : '#c9d1d9', cursor: 'pointer' }}>{f}</button>
                ))}
                <div style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', backgroundColor: '#161b22', border: '1px solid #30363d', color: '#22c55e' }} className="mono">● LIVE {trendLoading ? 'sync...' : 'ON'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '16px', backgroundColor: '#0a0a0f' }}>
              {trendTopics.map(topic => {
                const sortedPreview = [...(topic.headlines||[])].sort((a,b)=> (a.minutesAgo||9999)-(b.minutesAgo||9999));
                return (
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
                    <div style={{ marginBottom: '14px' }}>
                      {sortedPreview.slice(0, 2).map(h => (
                        <div key={h.id} style={{ fontSize: '12px', color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                          • {h.title} <span className="mono" style={{fontSize:'10px', color:'#58a6ff'}}>({h.time})</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => openDetail(topic)} style={{ width: '100%', backgroundColor: '#fff', color: '#000', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', border: 'none', cursor: 'pointer' }}>Cek Sekarang</button>
                  </div>
                );
              })}
            </div>

            {showDetail && selectedTopic && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,10,15,0.92)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', overflowY: 'auto' }}>
                <div style={{ width: '100%', maxWidth: '720px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '16px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', flexShrink: 0, backgroundColor: '#0d1117' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button onClick={() => setShowDetail(false)} style={{ backgroundColor: '#21262d', border: '1px solid #30363d', color: '#fff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>← Kembali</button>
                      <div style={{ fontWeight: '800' }}>{selectedTopic.icon} {selectedTopic.title}</div>
                      <div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{trendTimeFilter} • {selectedTopic.headlines.length} berita • terbaru di atas</div>
                    </div>
                    <button onClick={() => setShowDetail(false)} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '20px', cursor: 'pointer' }}>×</button>
                  </div>
                  
                  <div style={{ padding: '16px', flex: 1, overflowY: 'auto', backgroundColor: '#0d1117' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedTopic.headlines.map(h => {
                        const isSelected = selectedHeadline && selectedHeadline.id === h.id;
                        return (
                          <div key={h.id} onClick={() => setSelectedHeadline(h)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '10px', backgroundColor: isSelected ? '#1f6feb20' : '#161b22', border: `1px solid ${isSelected ? '#1f6feb' : '#30363d'}`, cursor: 'pointer' }}>
                            <input type="radio" name="singleHeadline" checked={isSelected} readOnly style={{ accentColor: '#1f6feb' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '10px', display:'flex', gap:'8px' }} className="mono">
                                <span style={{color:'#58a6ff'}}>{h.time}</span>
                                <span style={{color:'#8b949e'}}>{h.source}</span>
                                <span style={{color: h.minutesAgo < 30 ? '#22c55e' : '#8b949e'}}>{h.minutesAgo < 30 ? '● BARU' : ''}</span>
                              </div>
                              <div style={{ fontWeight: '600', fontSize: '13px', marginTop: '4px' }}>{h.title}</div>
                              <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>{h.summary}</div>
                            </div>
                            <a href={h.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ width: '36px', height: '36px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '16px', cursor: 'pointer', flexShrink:0 }}>🔗</a>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ padding: '12px 16px', borderTop: '1px solid #30363d', backgroundColor: '#161b22', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink:0, borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                    <div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{selectedHeadline ? `Dipilih: ${selectedHeadline.time} - ${selectedHeadline.source}` : 'Pilih 1 berita'}</div>
                    <button onClick={handleJadikanBerita} disabled={!selectedHeadline} style={{ padding: '10px 16px', backgroundColor: selectedHeadline ? '#1f6feb' : '#30363d', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: selectedHeadline ? 'pointer' : 'not-allowed', fontSize: '12px' }}>→ Jadikan Berita</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {currentPage !== 0 && (<div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '24px' }}><button onClick={()=>setCurrentPage(0)} style={{ padding: '8px 12px', backgroundColor: '#21262d', border: '1px solid #30363d', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>← Kembali ke Trend Radar</button></div>)}
      </div>
    </div>
  );
}
