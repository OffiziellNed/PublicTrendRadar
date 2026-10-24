"use client";
import React, { useState, useEffect } from 'react';
export const dynamic = 'force-dynamic';
export default function AgoraVadaPortal() {
  const [trendTimeFilter, setTrendTimeFilter] = useState('24 Jam');
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
      } catch {}
      finally { setTrendLoading(false); }
    };
    fetchRadar();
  }, [trendTimeFilter]);

  const openDetail = (topic) => { 
    const sorted = [...(topic.headlines||[])].sort((a,b)=> (a.minutesAgo||9999)-(b.minutesAgo||9999)).slice(0,200);
    setSelectedTopic({...topic, headlines: sorted}); 
    setShowDetail(true); 
    setSelectedHeadline(null); 
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#0a0a0f', color: '#fff', overflowX: 'hidden' }}>
      <style>{`
        html, body { background-color: #0a0a0f !important; margin:0; padding:0; overscroll-behavior: none; overflow-x: hidden; box-sizing: border-box; }
        *, *::before, *::after { box-sizing: border-box; }
        * { font-family: 'Geist', sans-serif; }
        .mono{font-family:'Geist Mono',monospace}
        @import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap");
      `}</style>

      <div style={{ width: '100%', maxWidth: '1120px', margin: '0 auto', padding: '20px 16px', backgroundColor: '#0a0a0f', overflowX: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Public Trend Radar</h2>
          <p style={{ color: '#8b949e', fontSize: '13px', marginTop: '6px' }}>Porsi besar: Megawati • Puan • Kritik Publik | Jakarta dipangkas</p>
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {['1 Jam', '6 Jam', '24 Jam'].map(f => (
              <button key={f} onClick={() => setTrendTimeFilter(f)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid #30363d', backgroundColor: trendTimeFilter === f ? '#fff' : '#161b22', color: trendTimeFilter === f ? '#000' : '#c9d1d9', cursor: 'pointer' }}>{f}</button>
            ))}
            <div style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', backgroundColor: '#161b22', border: '1px solid #30363d', color: '#22c55e' }} className="mono">● LIVE {trendLoading ? 'sync...' : 'ON'}</div>
          </div>
        </div>

        {/* 4 BARIS RAPI DITENGAH - 320px FIX */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', width: '100%', maxWidth: '1080px', margin: '0 auto' }}>
          {trendTopics.map(topic => {
            const sortedPreview = [...(topic.headlines||[])].sort((a,b)=> (a.minutesAgo||9999)-(b.minutesAgo||9999));
            const isPriority = ['megawati','puan','kritik_publik'].includes(topic.id);
            const isJakarta = topic.id === 'jakarta';
            return (
              <div key={topic.id} style={{ 
                width: isPriority ? '360px' : '320px',
                maxWidth: '100%',
                backgroundColor: '#161b22', 
                border: `1px solid ${isPriority ? '#facc15' : isJakarta ? '#30363d' : '#30363d'}`, 
                borderRadius: '16px', 
                padding: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                minHeight: isPriority ? '230px' : '200px',
                flexShrink: 0,
                boxShadow: isPriority ? '0 0 0 1px rgba(250,204,21,0.2), 0 4px 20px rgba(250,204,21,0.1)' : 'none',
                opacity: isJakarta ? 0.7 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '42px', height: '42px', backgroundColor: isPriority ? '#facc1520' : '#0d1117', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: `1px solid ${isPriority ? '#facc15' : '#30363d'}`, flexShrink:0 }}>{topic.icon}</div>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', display:'flex', gap:'6px', alignItems:'center' }}>
                      {topic.title}
                      {isPriority && <span style={{ fontSize:'9px', backgroundColor:'#facc15', color:'#000', padding:'2px 5px', borderRadius:'4px', fontWeight:'800' }}>PRIORITY</span>}
                      {isJakarta && <span style={{ fontSize:'9px', backgroundColor:'#30363d', color:'#8b949e', padding:'2px 5px', borderRadius:'4px' }}>PANGKAS</span>}
                    </div>
                    <div className="mono" style={{ fontSize: '10px', color: isPriority ? '#facc15' : '#8b949e' }}>{topic.volume} • {topic.lastUpdate}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap:'wrap' }}>
                  <div className="mono" style={{ fontSize: '10px', backgroundColor: isPriority ? '#facc1520' : '#0d1117', border: `1px solid ${isPriority ? '#facc15' : '#30363d'}`, padding: '3px 7px', borderRadius: '6px', color: isPriority ? '#facc15' : '#c9d1d9', fontWeight: isPriority ? '700' : '400' }}>{topic.volume}</div>
                  {isPriority && <div className="mono" style={{ fontSize: '9px', backgroundColor: '#facc15', color: '#000', padding: '3px 7px', borderRadius: '6px', fontWeight:'700' }}>BOOST 24JAM</div>}
                </div>
                <div style={{ marginBottom: '12px', minHeight: '40px', flex: 1 }}>
                  {sortedPreview.length > 0 ? sortedPreview.slice(0, isPriority ? 3 : 2).map(h => (
                    <div key={h.id} style={{ fontSize: '11px', color: isPriority ? '#c9d1d9' : '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px', fontWeight: isPriority ? '500' : '400' }}>• {h.title}</div>
                  )) : <div style={{ fontSize: '11px', color: '#484f58', fontStyle: 'italic' }}>Tidak ada berita</div>}
                </div>
                <button onClick={() => openDetail(topic)} style={{ width: '100%', backgroundColor: isPriority ? '#facc15' : '#fff', color: '#000', padding: '9px', borderRadius: '9px', fontWeight: '800', fontSize: '11px', border: 'none', cursor: 'pointer', marginTop: 'auto' }}>Cek Sekarang</button>
              </div>
            );
          })}
        </div>

        {showDetail && selectedTopic && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,10,15,0.92)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', overflowY: 'auto' }}>
            <div style={{ width: '100%', maxWidth: '680px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '16px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', backgroundColor: '#0d1117' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button onClick={() => setShowDetail(false)} style={{ backgroundColor: '#21262d', border: '1px solid #30363d', color: '#fff', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px' }}>← Kembali</button>
                  <div style={{ fontWeight: '800', fontSize:'14px' }}>{selectedTopic.icon} {selectedTopic.title}</div>
                  <div className="mono" style={{ fontSize: '10px', color: '#8b949e' }}>{selectedTopic.headlines.length} berita</div>
                </div>
                <button onClick={() => setShowDetail(false)} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '20px', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '14px', flex: 1, overflowY: 'auto', backgroundColor: '#0d1117' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedTopic.headlines.map(h => {
                    const isSelected = selectedHeadline && selectedHeadline.id === h.id;
                    return (
                      <div key={h.id} onClick={() => setSelectedHeadline(h)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '9px', backgroundColor: isSelected ? '#1f6feb20' : '#161b22', border: `1px solid ${isSelected ? '#1f6feb' : '#30363d'}`, cursor: 'pointer' }}>
                        <input type="radio" checked={isSelected} readOnly style={{ accentColor: '#1f6feb' }} />
                        <div style={{ flex: 1, minWidth:0 }}>
                          <div className="mono" style={{ fontSize: '11px' }}>{h.source} • {h.time}</div>
                          <div style={{ fontWeight: '600', fontSize: '12px', marginTop: '3px' }}>{h.title}</div>
                        </div>
                        <a href={h.url} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()} style={{ width: '32px', height: '32px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '14px' }}>🔗</a>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid #30363d', backgroundColor: '#161b22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="mono" style={{ fontSize: '10px', color: '#8b949e' }}>{selectedHeadline ? selectedHeadline.source : 'Pilih 1 berita'}</div>
                <button onClick={()=>{if(selectedHeadline){alert('Jadikan berita: '+selectedHeadline.title); setShowDetail(false)}}} disabled={!selectedHeadline} style={{ padding: '8px 14px', backgroundColor: selectedHeadline ? '#1f6feb' : '#30363d', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: '700', fontSize: '11px' }}>→ Jadikan Berita</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
