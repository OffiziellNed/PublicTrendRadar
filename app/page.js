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

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#0a0a0f', color: '#fff', overflowX: 'hidden' }}>
      <style>{`
        html, body { background-color: #0a0a0f !important; margin:0; padding:0; overflow-x: hidden; }
        * { font-family: 'Geist', sans-serif; box-sizing: border-box; }
        .mono{font-family:'Geist Mono',monospace}
        @import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap");
      `}</style>
      <div style={{ width: '100%', maxWidth: '1080px', margin: '0 auto', padding: '20px 16px' }}>
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

        {/* 9 MENU - 3 KOLOM RAPI DITENGAH - 320px FIX - ANTI GESER */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
          {trendTopics.map(topic => (
            <div key={topic.id} style={{ width: '320px', maxWidth: '100%', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', minHeight: '210px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: '#0d1117', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #30363d' }}>{topic.icon}</div>
                <div><div style={{ fontWeight: '700', fontSize: '15px' }}>{topic.title}</div><div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{topic.volume} • {topic.lastUpdate}</div></div>
              </div>
              <div style={{ marginBottom: '14px', flex: 1 }}>
                {topic.headlines?.slice(0,2).map(h => (
                  <div key={h.id} style={{ fontSize: '12px', color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>• {h.title}</div>
                ))}
                {(!topic.headlines || topic.headlines.length===0) && <div style={{ fontSize: '12px', color: '#484f58', fontStyle: 'italic' }}>Tidak ada berita dalam {trendTimeFilter} terakhir</div>}
              </div>
              <button onClick={() => { setSelectedTopic(topic); setShowDetail(true); }} style={{ width: '100%', backgroundColor: '#fff', color: '#000', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', border: 'none', cursor: 'pointer', marginTop: 'auto' }}>Cek Sekarang</button>
            </div>
          ))}
        </div>

        {showDetail && selectedTopic && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,10,15,0.92)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', overflowY: 'auto' }}>
            <div style={{ width: '100%', maxWidth: '720px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '16px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button onClick={() => setShowDetail(false)} style={{ backgroundColor: '#21262d', border: '1px solid #30363d', color: '#fff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>← Kembali</button>
                  <div style={{ fontWeight: '800' }}>{selectedTopic.icon} {selectedTopic.title}</div>
                </div>
                <button onClick={() => setShowDetail(false)} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '20px', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
                {selectedTopic.headlines?.map(h => (
                  <div key={h.id} style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#161b22', border: '1px solid #30363d', marginBottom: '8px' }}>
                    <div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{h.source} • {h.time}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>{h.title}</div>
                    <a href={h.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#58a6ff', marginTop: '4px', display: 'inline-block' }}>Buka berita →</a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
