"use client";
import React, { useState, useEffect } from 'react';

export default function Page() {
  const [trendTimeFilter, setTrendTimeFilter] = useState('1 Jam');
  const [trendTopics, setTrendTopics] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const fetchRadar = async () => {
      setTrendLoading(true);
      try {
        const res = await fetch(`/api/trend-radar?filter=${encodeURIComponent(trendTimeFilter)}`, { cache: 'no-store' });
        const data = await res.json();
        if (data?.topics) setTrendTopics(data.topics);
      } catch {}
      finally { setTrendLoading(false); }
    };
    fetchRadar();
  }, [trendTimeFilter]);

  // Lock body scroll pas modal kebuka, balikin pas tutup
  useEffect(() => {
    if (showDetail) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [showDetail]);

  return (
    <div style={{ width: '100%', minHeight: '100dvh', backgroundColor: '#0a0a0f', color: '#fff' }}>
      <style>{`
        html, body { 
          background-color: #0a0a0f !important; 
          margin:0; 
          padding:0; 
          width: 100%;
          height: auto;
          min-height: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
          overscroll-behavior-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #30363d #0a0a0f;
        }
        * { 
          font-family: 'Geist', sans-serif; 
          box-sizing: border-box;
        }
        .mono{font-family:'Geist Mono',monospace}
        
        /* DARK SCROLLBAR - DESKTOP */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }
        ::-webkit-scrollbar-corner { background: #0a0a0f; }

        /* MOBILE FIX - BIAR BISA SCROLL */
        @media (max-width: 768px) {
          html, body {
            overflow-y: auto !important;
            height: auto !important;
            position: relative !important;
          }
          #main-container {
            overflow: visible !important;
            height: auto !important;
          }
        }

        @import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap");
      `}</style>
      
      <div id="main-container" style={{ width: '100%', maxWidth: '1080px', margin: '0 auto', padding: '20px 16px 80px 16px', backgroundColor: '#0a0a0f', minHeight: '100dvh' }}>
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

        {/* 9 MENU - MOBILE BISA SCROLL ATAS BAWAH */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', paddingBottom: '40px' }}>
          {trendTopics.map(topic => (
            <div key={topic.id} style={{ width: '320px', maxWidth: '100%', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', minHeight: '210px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: '#0d1117', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #30363d', flexShrink: 0 }}>{topic.icon}</div>
                <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: '700', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic.title}</div><div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{topic.volume} • {topic.lastUpdate}</div></div>
              </div>
              <div style={{ marginBottom: '14px', flex: 1, minHeight: '44px' }}>
                {topic.headlines?.slice(0,2).map(h => (
                  <div key={h.id} style={{ fontSize: '12px', color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>• {h.title}</div>
                ))}
                {(!topic.headlines || topic.headlines.length===0) && <div style={{ fontSize: '12px', color: '#484f58', fontStyle: 'italic' }}>Tidak ada berita dalam {trendTimeFilter} terakhir</div>}
              </div>
              <button onClick={() => { setSelectedTopic(topic); setShowDetail(true); }} style={{ width: '100%', backgroundColor: '#fff', color: '#000', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', border: 'none', cursor: 'pointer', marginTop: 'auto' }}>Cek Sekarang</button>
            </div>
          ))}
        </div>
      </div>

      {showDetail && selectedTopic && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,10,15,0.92)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          <div style={{ width: '100%', maxWidth: '720px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '16px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', flexShrink: 0, backgroundColor: '#0d1117' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={() => setShowDetail(false)} style={{ backgroundColor: '#21262d', border: '1px solid #30363d', color: '#fff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>← Kembali</button>
                <div style={{ fontWeight: '800' }}>{selectedTopic.icon} {selectedTopic.title}</div>
              </div>
              <button onClick={() => setShowDetail(false)} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ padding: '16px', flex: 1, overflowY: 'auto', backgroundColor: '#0d1117', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedTopic.headlines?.map(h => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '10px', backgroundColor: '#161b22', border: '1px solid #30363d' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{h.source} • {h.time}</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px', lineHeight: '1.4' }}>{h.title}</div>
                    </div>
                    <a href={h.url} target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '16px', cursor: 'pointer', flexShrink: 0 }}>🔗</a>
                  </div>
                ))}
                {(!selectedTopic.headlines || selectedTopic.headlines.length===0) && <div style={{ padding: '30px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>Tidak ada berita dalam {trendTimeFilter} terakhir</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
