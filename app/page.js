"use client";
import React, { useState, useEffect, useMemo } from 'react';

const NEGATIVE_KEYWORDS = "bongkar,korupsi,skandal,kecam,desak mundur,gagal,ngamuk,kecewa,bocor,fiktif,mangkrak,bohong,heboh,kontroversi,dituding,digugat,dilaporkan,ditangkap,ott,suap,pungli,markup,bansos sunat,pajak naik,utang,jebol,bobol,ambruk,pecat,mundur,lawan,vs,sindir,serang,bantah,ancam,cekcok,bentrok,demo,ricuh,brutal,maling,rampok,mafia,kartel,dinasti,oligarki,cawe-cawe,ijazah palsu,anggaran jumbo,proyek mangkrak,buzzer,ternak,fufufafa,cuci uang,cuan haram".split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);

const POSITIVE_KEYWORDS = "apresiasi,dukung,prestasi,resmikan,bantuan,sejahtera,haru,nangis,peluk,gratis,cair,lunas,sukses,menang,juara,solusi,tegas,sigap,gercep,selamatkan,bantu,donasi,blusukan,turun langsung,bagi-bagi,sembuh,bangkit,terharu,salut,inspiratif,dermawan,ikhlas,merakyat,sederhana,jujur,amanah,tulus,gotong royong,keren,mantap,gratiskan".split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);

const BOOSTER_KEYWORDS = "Rp,miliar,triliun,viral,video,rekaman,detik-detik,live,blak-blakan,ngaku,terungkap,ini faktanya,kocak,parah,auto,menangis".split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);

export default function Page() {
  const [trendTimeFilter, setTrendTimeFilter] = useState('1 Jam');
  const [trendTopics, setTrendTopics] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeNewsFilter, setActiveNewsFilter] = useState(null); // null | 'api' | 'hati' | 'petir'

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

  useEffect(() => {
    if (showDetail) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      setActiveNewsFilter(null);
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [showDetail]);

  useEffect(() => {
    setActiveNewsFilter(null);
  }, [selectedTopic]);

  const filteredHeadlines = useMemo(() => {
    if (!selectedTopic?.headlines) return [];
    if (!activeNewsFilter) return selectedTopic.headlines;
    
    let keywords = [];
    if (activeNewsFilter === 'api') keywords = NEGATIVE_KEYWORDS;
    if (activeNewsFilter === 'hati') keywords = POSITIVE_KEYWORDS;
    if (activeNewsFilter === 'petir') keywords = BOOSTER_KEYWORDS;

    return selectedTopic.headlines.filter(h => {
      const titleLow = (h.title || '').toLowerCase();
      return keywords.some(k => titleLow.includes(k));
    });
  }, [selectedTopic, activeNewsFilter]);

  return (
    <div style={{ width: '100%', minHeight: '100dvh', backgroundColor: '#0a0a0f', color: '#fff' }}>
      <style>{`
        html, body { 
          background-color: #0a0a0f !important; 
          margin:0; padding:0; 
          width: 100%; height: auto; min-height: 100%;
          overflow-x: hidden; overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
          overscroll-behavior-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #30363d #0a0a0f;
        }
        * { font-family: 'Geist', sans-serif; box-sizing: border-box; }
        .mono{font-family:'Geist Mono',monospace}
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }
        ::-webkit-scrollbar-corner { background: #0a0a0f; }
        @import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap");
      `}</style>
      
      <div style={{ width: '100%', maxWidth: '1080px', margin: '0 auto', padding: '20px 16px 80px 16px', backgroundColor: '#0a0a0f', minHeight: '100dvh' }}>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,10,15,0.92)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '12px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ width: '100%', maxWidth: '720px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '16px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginTop: '10px' }}>
            
            {/* HEADER + 3 ICON FILTER */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #30363d', backgroundColor: '#0d1117', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                  <button onClick={() => setShowDetail(false)} style={{ backgroundColor: '#21262d', border: '1px solid #30363d', color: '#fff', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>←</button>
                  <div style={{ fontWeight: '800', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{selectedTopic.icon}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedTopic.title}</span>
                  </div>
                </div>

                {/* 3 ICON FILTER DI SAMPING JUDUL */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  <button
                    onClick={() => setActiveNewsFilter(activeNewsFilter === 'api' ? null : 'api')}
                    title="Filter Negatif / Potensi Viral"
                    style={{
                      width: '36px', height: '36px',
                      backgroundColor: activeNewsFilter === 'api' ? '#ff4500' : '#161b22',
                      border: activeNewsFilter === 'api' ? '1px solid #ff6a33' : '1px solid #30363d',
                      borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: activeNewsFilter === 'api' ? '0 0 12px rgba(255,69,0,0.4)' : 'none'
                    }}
                  >🔥</button>
                  <button
                    onClick={() => setActiveNewsFilter(activeNewsFilter === 'hati' ? null : 'hati')}
                    title="Filter Positif"
                    style={{
                      width: '36px', height: '36px',
                      backgroundColor: activeNewsFilter === 'hati' ? '#e11d48' : '#161b22',
                      border: activeNewsFilter === 'hati' ? '1px solid #fb7185' : '1px solid #30363d',
                      borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: activeNewsFilter === 'hati' ? '0 0 12px rgba(225,29,72,0.4)' : 'none'
                    }}
                  >❤️</button>
                  <button
                    onClick={() => setActiveNewsFilter(activeNewsFilter === 'petir' ? null : 'petir')}
                    title="Filter Booster Konten"
                    style={{
                      width: '36px', height: '36px',
                      backgroundColor: activeNewsFilter === 'petir' ? '#facc15' : '#161b22',
                      border: activeNewsFilter === 'petir' ? '1px solid #fde047' : '1px solid #30363d',
                      borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: activeNewsFilter === 'petir' ? '0 0 12px rgba(250,204,21,0.4)' : 'none'
                    }}
                  >⚡</button>
                  <button onClick={() => setShowDetail(false)} style={{ width: '36px', height: '36px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '10px', color: '#8b949e', fontSize: '18px', cursor: 'pointer', marginLeft: '2px' }}>×</button>
                </div>
              </div>

              {/* INFO FILTER AKTIF */}
              {activeNewsFilter && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="mono" style={{ fontSize: '11px', color: '#8b949e', backgroundColor: '#161b22', border: '1px solid #30363d', padding: '4px 10px', borderRadius: '20px' }}>
                    {activeNewsFilter === 'api' && '🔥 Negatif / Potensi Viral'}
                    {activeNewsFilter === 'hati' && '❤️ Positive News'}
                    {activeNewsFilter === 'petir' && '⚡ Booster Konten'}
                    {` • ${filteredHeadlines.length} dari ${selectedTopic.headlines.length}`}
                  </div>
                  <button onClick={() => setActiveNewsFilter(null)} style={{ fontSize: '11px', backgroundColor: '#21262d', border: '1px solid #30363d', color: '#c9d1d9', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer' }}>Reset ✕</button>
                </div>
              )}
            </div>
            
            <div style={{ padding: '14px', flex: 1, overflowY: 'auto', backgroundColor: '#0d1117', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredHeadlines.map(h => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '10px', backgroundColor: '#161b22', border: '1px solid #30363d' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{h.source} • {h.time}</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px', lineHeight: '1.4' }}>{h.title}</div>
                    </div>
                    <a href={h.url} target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '16px', cursor: 'pointer', flexShrink: 0 }}>🔗</a>
                  </div>
                ))}
                {filteredHeadlines.length === 0 && (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#8b949e', fontSize: '13px', backgroundColor: '#161b22', border: '1px dashed #30363d', borderRadius: '12px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{activeNewsFilter === 'api' ? '🔥' : activeNewsFilter === 'hati' ? '❤️' : '⚡'}</div>
                    Tidak ada berita dengan kata kunci <br/>
                    <span className="mono" style={{ fontSize: '11px', color: '#484f58' }}>
                      {activeNewsFilter === 'api' ? 'negatif / viral' : activeNewsFilter === 'hati' ? 'positif' : 'booster'}
                    </span>
                    <br/>dalam filter ini
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
