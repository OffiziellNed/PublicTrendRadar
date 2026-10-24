"use client";
import React, { useState, useRef, useEffect } from 'react';
export const dynamic = 'force-dynamic';
export default function AgoraVadaPortal() {
  const [currentPage, setCurrentPage] = useState(0);
  const [urlBerita, setUrlBerita] = useState('');
  const [judulHtml, setJudulHtml] = useState('');
  const [sumberBerita, setSumberBerita] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [reviewImageUrl, setReviewImageUrl] = useState('');
  const [reviewImageBlob, setReviewImageBlob] = useState(null);
  const [captionText, setCaptionText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
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
    { id: 'jakarta', title: 'Jakarta', icon: '🏙️', volume: '0 berita', lastUpdate: '-', headlines: [] },
    { id: 'nasional', title: 'Berita Nasional', icon: '📰', volume: '0 berita', lastUpdate: '-', headlines: [] },
    { id: 'bencana', title: 'Bencana Terkini', icon: '🌋', volume: '0 berita', lastUpdate: '-', headlines: [] },
    { id: 'pdip', title: 'PDI Perjuangan', icon: '🐂', volume: '0 berita', lastUpdate: '-', headlines: [] },
    { id: 'megawati', title: 'Megawati Soekarnoputri', icon: '👩‍🦳', volume: '0 berita', lastUpdate: '-', headlines: [] },
    { id: 'puan', title: 'Puan Maharani', icon: '👩‍💼', volume: '0 berita', lastUpdate: '-', headlines: [] },
    { id: 'kritik_publik', title: 'Kritik Publik', icon: '📢', volume: '0 berita', lastUpdate: '-', headlines: [] },
    { id: 'dedi_mulyadi', title: 'Dedi Mulyadi / KDM', icon: '🌾', volume: '0 berita', lastUpdate: '-', headlines: [] },
    { id: 'keluarga_jokowi', title: 'Keluarga Jokowi', icon: '👨‍👩‍👧‍👦', volume: '0 berita', lastUpdate: '-', headlines: [] },
    { id: 'homeless_media', title: 'Homeless Media', icon: '🏴‍☠️', volume: '0 berita', lastUpdate: '-', headlines: [] },
  ]);

  useEffect(() => {
    const tImg = new Image();
    tImg.src = '/Agora Vada Template.png';
    tImg.onload = () => setTemplateImgObj(tImg);
  }, []);
  useEffect(() => {
    if (!imageUrl) { setLoadedBgImg(null); return; }
    const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => setLoadedBgImg(img); img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (currentPage !== 0) return;
    const fetchRadar = async () => {
      setTrendLoading(true);
      try {
        const res = await fetch(`/api/trend-radar?filter=${encodeURIComponent(trendTimeFilter)}`, { cache: 'no-store' });
        const data = await res.json();
        if (data?.topics?.length) {
          const order = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','homeless_media'];
          const sortedData = [...data.topics].sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id));
          const sortedTopics = sortedData.map(t => ({
            ...t,
            headlines: [...(t.headlines || [])].sort((a,b) => (a.minutesAgo||9999) - (b.minutesAgo||9999)).slice(0,200)
          }));
          setTrendTopics(sortedTopics);
        }
      } catch (e) {}
      finally { setTrendLoading(false); }
    };
    fetchRadar();
  }, [currentPage, trendTimeFilter]);

  const openDetail = (topic) => { 
    const sorted = [...(topic.headlines||[])].sort((a,b)=> (a.minutesAgo||9999)-(b.minutesAgo||9999)).slice(0,200);
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
        @import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap");
      `}</style>
      <div style={{ width: '100%', maxWidth: currentPage === 0 ? '1280px' : '950px', margin: '0 auto', padding: '20px', backgroundColor: '#0a0a0f', minHeight: '100vh' }}>
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
            {/* GRID NORMAL 3 KOLOM - SEMUA BOARD SAMA UKURAN */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', backgroundColor: '#0a0a0f', alignItems: 'stretch' }}>
              {trendTopics.map(topic => {
                const sortedPreview = [...(topic.headlines||[])].sort((a,b)=> (a.minutesAgo||9999)-(b.minutesAgo||9999));
                const isHomeless = topic.id === 'homeless_media';
                return (
                  <div key={topic.id} style={{ 
                    backgroundColor: '#161b22', 
                    border: '1px solid #30363d', 
                    borderRadius: '16px', 
                    padding: '18px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minHeight: '210px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '48px', height: '48px', backgroundColor: '#0d1117', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #30363d' }}>{topic.icon}</div>
                      <div><div style={{ fontWeight: '700', fontSize: '15px' }}>{topic.title}</div><div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{topic.volume} • {topic.lastUpdate}</div></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <div className="mono" style={{ fontSize: '11px', backgroundColor: '#0d1117', border: '1px solid #30363d', padding: '4px 8px', borderRadius: '6px', color: '#c9d1d9' }}>{topic.volume}</div>
                      {isHomeless && <div className="mono" style={{ fontSize: '10px', backgroundColor: '#f97316', color: '#000', padding: '4px 8px', borderRadius: '6px', fontWeight:'700' }}>IG SCRAPE</div>}
                    </div>
                    <div style={{ marginBottom: '14px', minHeight: '44px', flex: 1 }}>
                      {sortedPreview.length > 0 ? sortedPreview.slice(0, 2).map(h => (
                        <div key={h.id} style={{ fontSize: '12px', color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>• {h.title} <span className="mono" style={{fontSize:'10px', color:'#58a6ff'}}>({h.time})</span></div>
                      )) : <div style={{ fontSize: '12px', color: '#484f58', fontStyle: 'italic' }}>Tidak ada berita dalam {trendTimeFilter} terakhir</div>}
                    </div>
                    <button onClick={() => openDetail(topic)} style={{ width: '100%', backgroundColor: '#fff', color: '#000', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', border: 'none', cursor: 'pointer', marginTop: 'auto' }}>Cek Sekarang</button>
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
                      <div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{trendTimeFilter} • {selectedTopic.headlines.length} berita</div>
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
                              <div style={{ fontSize: '12px', fontWeight:'600' }} className="mono">{h.source} • {h.time}</div>
                              <div style={{ fontWeight: '600', fontSize: '13px', marginTop: '4px' }}>{h.title}</div>
                            </div>
                            <a href={h.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ width: '36px', height: '36px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '16px', cursor: 'pointer', flexShrink:0 }}>🔗</a>
                          </div>
                        );
                      })}
                      {selectedTopic.headlines.length===0 && <div style={{padding:'30px', textAlign:'center', color:'#8b949e', fontSize:'13px'}}>Tidak ada berita yang relevan dalam {trendTimeFilter} terakhir</div>}
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #30363d', backgroundColor: '#161b22', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink:0, borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                    <div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{selectedHeadline ? `${selectedHeadline.source} • ${selectedHeadline.time}` : 'Pilih 1 berita'}</div>
                    <button onClick={handleJadikanBerita} disabled={!selectedHeadline} style={{ padding: '10px 16px', backgroundColor: selectedHeadline ? '#1f6feb' : '#30363d', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: selectedHeadline ? 'pointer' : 'not-allowed', fontSize: '12px' }}>→ Jadikan Berita</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
