"use client";
import React, { useState, useEffect, useMemo } from 'react';

const NEGATIVE_KEYWORDS = "bongkar,korupsi,skandal,kecam,desak mundur,gagal,ngamuk,kecewa,bocor,fiktif,mangkrak,bohong,heboh,kontroversi,dituding,digugat,dilaporkan,ditangkap,ott,suap,pungli,markup,bansos sunat,pajak naik,utang,jebol,bobol,ambruk,pecat,mundur,lawan,vs,sindir,serang,bantah,ancam,cekcok,bentrok,demo,ricuh,brutal,maling,rampok,mafia,kartel,dinasti,oligarki,cawe-cawe,ijazah palsu,anggaran jumbo,proyek mangkrak,buzzer,ternak,fufufafa,cuci uang,cuan haram".split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
const POSITIVE_KEYWORDS = "apresiasi,dukung,prestasi,resmikan,bantuan,sejahtera,haru,nangis,peluk,gratis,cair,lunas,sukses,menang,juara,solusi,tegas,sigap,gercep,selamatkan,bantu,donasi,blusukan,turun langsung,bagi-bagi,sembuh,bangkit,terharu,salut,inspiratif,dermawan,ikhlas,merakyat,sederhana,jujur,amanah,tulus,gotong royong,keren,mantap,gratiskan".split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
const BOOSTER_KEYWORDS = "Rp,miliar,triliun,viral,video,rekaman,detik-detik,live,blak-blakan,ngaku,terungkap,ini faktanya,kocak,parah,auto,menangis".split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);

const STOPWORDS = new Set(['dan','di','yang','untuk','dari','dengan','pada','ke','ini','itu','adalah','akan','bisa','jadi','soal','tentang','dalam','secara','oleh','sebagai','saat','tengah','juga','sudah','telah','buka','ada','jadi','jika','atau','oleh','para','sebuah','tersebut','agar','hingga','bahwa','karena','dalam','kepada','namun','tetapi']);
function normalizeWords(title) { return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w)); }
function jaccardSimilarity(a,b){ const aW=new Set(normalizeWords(a)), bW=new Set(normalizeWords(b)); if(!aW.size||!bW.size) return 0; let inter=0; for(const w of aW) if(bW.has(w)) inter++; const union=aW.size+bW.size-inter; return union===0?0:inter/union; }
function clusterHeadlines(headlines, threshold=0.38){
  const clusters=[]; const sorted=[...headlines].sort((a,b)=>a.minutesAgo-b.minutesAgo);
  for(const h of sorted){ let found=false; for(const cluster of clusters){ const rep=cluster[0]; const sim=jaccardSimilarity(h.title, rep.title); const sameYear=(h.title.match(/2029|2024|2025/) && rep.title.match(/2029|2024|2025/)); if(sim>=threshold || (sim>=0.28 && sameYear)){ cluster.push(h); cluster.sort((a,b)=>a.minutesAgo-b.minutesAgo); found=true; break; } } if(!found) clusters.push([h]); }
  return clusters.map((cluster, idx)=>{ const main=cluster[0]; const allSources=[...new Set(cluster.map(c=>c.source))]; return { id:`cluster-${idx}-${main.id}`, isCluster:cluster.length>1, count:cluster.length, title:main.title, mainUrl:main.url, time:main.time, minutesAgo:main.minutesAgo, sources:allSources, headlines:cluster, source:main.source }; });
}

export default function Page() {
  const [trendTimeFilter, setTrendTimeFilter] = useState('3 Jam');
  const [trendTopics, setTrendTopics] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeNewsFilter, setActiveNewsFilter] = useState(null);
  const [groupSimilar, setGroupSimilar] = useState(true);
  const [expandedClusters, setExpandedClusters] = useState({});

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
    if (showDetail) document.body.style.overflow = 'hidden';
    else { document.body.style.overflow = 'auto'; setActiveNewsFilter(null); }
    return () => { document.body.style.overflow = 'auto'; };
  }, [showDetail]);

  useEffect(() => { setActiveNewsFilter(null); setExpandedClusters({}); }, [selectedTopic]);

  const displayClusters = useMemo(() => {
    if (!selectedTopic?.headlines) return [];
    let list = selectedTopic.headlines;
    if (activeNewsFilter) {
      let keywords = [];
      if (activeNewsFilter === 'api') keywords = NEGATIVE_KEYWORDS;
      if (activeNewsFilter === 'hati') keywords = POSITIVE_KEYWORDS;
      if (activeNewsFilter === 'petir') keywords = BOOSTER_KEYWORDS;
      list = list.filter(h => { const titleLow = (h.title || '').toLowerCase(); return keywords.some(k => titleLow.includes(k)); });
    }
    if (groupSimilar) return clusterHeadlines(list);
    return list.map(h => ({ id: h.id, isCluster: false, count: 1, title: h.title, mainUrl: h.url, time: h.time, minutesAgo: h.minutesAgo, sources: [h.source], headlines: [h], source: h.source }));
  }, [selectedTopic, activeNewsFilter, groupSimilar]);

  return (
    <div style={{ width: '100%', minHeight: '100dvh', backgroundColor: '#0a0a0f', color: '#fff' }}>
      <style>{`
        html, body { background-color: #0a0a0f !important; margin:0; padding:0; width: 100%; height: auto; min-height: 100%; overflow-x: hidden; overflow-y: auto; -webkit-overflow-scrolling: touch; touch-action: pan-y; scrollbar-width: thin; scrollbar-color: #30363d #0a0a0f; }
        * { font-family: 'Geist', sans-serif; box-sizing: border-box; }
        .mono{font-family:'Geist Mono',monospace}
        ::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-track { background: #0a0a0f; } ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
        @import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap");
      `}</style>
      
      <div style={{ width: '100%', maxWidth: '1120px', margin: '0 auto', padding: '20px 16px 80px 16px', backgroundColor: '#0a0a0f', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Public Trend Radar</h2>
          <p style={{ color: '#8b949e', fontSize: '14px', marginTop: '6px' }}>Monitoring isu publik terupdate - REAL TIME.</p>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {['3 Jam', '6 Jam', '24 Jam'].map(f => (
              <button key={f} onClick={() => setTrendTimeFilter(f)} style={{ padding: '7px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', border: '1px solid #30363d', backgroundColor: trendTimeFilter === f ? '#fff' : '#161b22', color: trendTimeFilter === f ? '#000' : '#c9d1d9', cursor: 'pointer' }}>{f}</button>
            ))}
            <div style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', backgroundColor: '#161b22', border: '1px solid #30363d', color: '#22c55e' }} className="mono">● LIVE REAL {trendLoading ? 'sync...' : 'ON'}</div>
          </div>
        </div>

        {/* GRID BALANCE - tinggi sama semua */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', paddingBottom: '40px', alignItems: 'stretch' }}>
          {trendTopics.map(topic => {
            const totalBerita = topic.headlines?.length || 0;
            const isuCount = topic.clusters ? topic.clusters.length : totalBerita;
            const isEmpty = totalBerita === 0;
            return (
              <div key={topic.id} style={{ backgroundColor: '#161b22', border: isEmpty ? '1px dashed #30363d' : '1px solid #30363d', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', minHeight: '220px', opacity: isEmpty ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '48px', height: '48px', backgroundColor: '#0d1117', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #30363d', flexShrink: 0 }}>{topic.icon}</div>
                  <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: '700', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic.title}</div><div className="mono" style={{ fontSize: '11px', color: isEmpty ? '#484f58' : '#8b949e' }}>{isEmpty ? `0 berita dalam ${trendTimeFilter}` : `${totalBerita} berita • ${isuCount} isu`}</div></div>
                </div>
                <div style={{ marginBottom: '14px', flex: 1, minHeight: '44px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  {!isEmpty && (topic.clusters || topic.headlines)?.slice(0,2).map((c) => {
                    const t = c.title || c.headlines?.[0]?.title;
                    return <div key={c.id} style={{ fontSize: '12px', color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>• {t}</div>
                  })}
                  {isEmpty && <div style={{ fontSize: '12px', color: '#484f58', fontStyle: 'italic' }}>Tidak ada berita dalam {trendTimeFilter} - REAL</div>}
                </div>
                <button onClick={() => { if(!isEmpty){ setSelectedTopic(topic); setShowDetail(true); } }} disabled={isEmpty} style={{ width: '100%', backgroundColor: isEmpty ? '#21262d' : '#fff', color: isEmpty ? '#484f58' : '#000', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', border: 'none', cursor: isEmpty ? 'not-allowed' : 'pointer', marginTop: 'auto' }}>{isEmpty ? 'Kosong' : 'Cek Sekarang'}</button>
              </div>
            );
          })}
        </div>
      </div>

      {showDetail && selectedTopic && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,10,15,0.92)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '12px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ width: '100%', maxWidth: '720px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '16px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginTop: '10px' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #30363d', backgroundColor: '#0d1117', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                  <button onClick={() => setShowDetail(false)} style={{ backgroundColor: '#21262d', border: '1px solid #30363d', color: '#fff', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>←</button>
                  <div style={{ fontWeight: '800', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}><span>{selectedTopic.icon}</span><span>{selectedTopic.title}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={() => setActiveNewsFilter(activeNewsFilter === 'api' ? null : 'api')} style={{ width: '36px', height: '36px', backgroundColor: activeNewsFilter === 'api' ? '#ff4500' : '#161b22', border: activeNewsFilter === 'api' ? '1px solid #ff6a33' : '1px solid #30363d', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer' }}>🔥</button>
                  <button onClick={() => setActiveNewsFilter(activeNewsFilter === 'hati' ? null : 'hati')} style={{ width: '36px', height: '36px', backgroundColor: activeNewsFilter === 'hati' ? '#e11d48' : '#161b22', border: activeNewsFilter === 'hati' ? '1px solid #fb7185' : '1px solid #30363d', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer' }}>❤️</button>
                  <button onClick={() => setActiveNewsFilter(activeNewsFilter === 'petir' ? null : 'petir')} style={{ width: '36px', height: '36px', backgroundColor: activeNewsFilter === 'petir' ? '#facc15' : '#161b22', border: activeNewsFilter === 'petir' ? '1px solid #fde047' : '1px solid #30363d', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer' }}>⚡</button>
                  <button onClick={() => setShowDetail(false)} style={{ width: '36px', height: '36px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '10px', color: '#8b949e', fontSize: '18px', cursor: 'pointer', marginLeft: '2px' }}>×</button>
                </div>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setGroupSimilar(!groupSimilar)} className="mono" style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '20px', border: groupSimilar ? '1px solid #58a6ff' : '1px solid #30363d', backgroundColor: groupSimilar ? 'rgba(88,166,255,0.15)' : '#161b22', color: groupSimilar ? '#58a6ff' : '#8b949e', cursor: 'pointer' }}>{groupSimilar ? '✓ Grup mirip ON' : 'Grup mirip OFF'} • {displayClusters.length} isu REAL</button>
                {activeNewsFilter && (<><div className="mono" style={{ fontSize: '11px', color: '#8b949e', backgroundColor: '#161b22', border: '1px solid #30363d', padding: '4px 10px', borderRadius: '20px' }}>{activeNewsFilter === 'api' ? '🔥 Negatif' : activeNewsFilter === 'hati' ? '❤️ Positif' : '⚡ Booster'} • {displayClusters.length}</div><button onClick={() => setActiveNewsFilter(null)} style={{ fontSize: '11px', backgroundColor: '#21262d', border: '1px solid #30363d', color: '#c9d1d9', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer' }}>Reset ✕</button></>)}
              </div>
            </div>
            <div style={{ padding: '14px', flex: 1, overflowY: 'auto', backgroundColor: '#0d1117', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {displayClusters.map(cluster => {
                  const isExpanded = expandedClusters[cluster.id];
                  return (
                    <div key={cluster.id} style={{ borderRadius: '12px', backgroundColor: '#161b22', border: '1px solid #30363d', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{cluster.source} • {cluster.time}</div>
                          <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px', lineHeight: '1.4' }}>{cluster.title}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <a href={cluster.mainUrl} target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '16px', cursor: 'pointer' }}>🔗</a>
                          {cluster.isCluster && (<button onClick={() => setExpandedClusters(prev => ({ ...prev, [cluster.id]: !prev[cluster.id] }))} style={{ minWidth: '36px', height: '22px', backgroundColor: isExpanded ? '#21262d' : '#0d1117', border: '1px solid #30363d', borderRadius: '20px', color: isExpanded ? '#58a6ff' : '#8b949e', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: '0 8px' }}>{isExpanded ? '−' : `${cluster.count}`}</button>)}
                        </div>
                      </div>
                      {cluster.isCluster && isExpanded && (
                        <div style={{ borderTop: '1px solid #21262d', backgroundColor: '#0d1117', padding: '8px' }}>
                          <div className="mono" style={{ fontSize: '10px', color: '#484f58', padding: '4px 8px 8px' }}>{cluster.count} sumber untuk isu ini:</div>
                          {cluster.headlines.map(h => (
                            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', borderBottom: '1px solid #161b22' }}>
                              <div style={{ flex: 1, minWidth: 0 }}><div className="mono" style={{ fontSize: '10px', color: '#8b949e' }}>{h.source} • {h.time}</div><div style={{ fontSize: '12px', color: '#c9d1d9', marginTop: '2px' }}>{h.title}</div></div>
                              <a href={h.url} target="_blank" rel="noopener noreferrer" style={{ width: '30px', height: '30px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '12px', flexShrink: 0 }}>🔗</a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {displayClusters.length === 0 && (<div style={{ padding: '30px', textAlign: 'center', color: '#8b949e', fontSize: '13px', backgroundColor: '#161b22', border: '1px dashed #30363d', borderRadius: '12px' }}>Tidak ada berita dalam {trendTimeFilter} dengan filter ini - REAL</div>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
