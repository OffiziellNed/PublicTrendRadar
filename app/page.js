"use client";
import React, { useState, useRef, useEffect } from 'react';

// FIX FOR VERCEL: Jangan prerender halaman canvas ini
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

  const PROMPT_TEMPLATES = {
    homeless: `Tolong buat 10 judul berita menggunakan hook dan copywriter handal untuk media alternatif "AgoraVada", serta buatkan caption untuk instagram, normatif saja dan informatif. Pastikan diakhiri oleh sumber berita dan 3 hastag (wajib ada #AgoraVada sisanya disesuaikan dengan kata kunci subjek dan topik yang dibahas).`,
    threads: `Tolong identifikasi isu, paparkan fakta penting, berikan 10 perspektif 5 opini Pro dan 5 Opini Kontra untuk X atau Threads, Jika kontra boleh gunakan Bahasa satir, sarkas, tajam. Pastikan singkat singkat saja`
  };

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
  const [teksAlign, setTeksAlign] = useState('left');
  const MARGIN_PX = 85;
  const TEMPLATE_DEFAULTS = {
    agoravada: { teksX: 110, teksY: 850, ukuranFont: 80, jarakBaris: 1.4, sumberX: 110, sumberY: 778, ukuranFontSumber: 25 },
    agentlondo: { teksX: 110, teksY: 593, ukuranFont: 45, jarakBaris: 1.4, sumberX: 110, sumberY: 700, ukuranFontSumber: 20 }
  };
  const canvasRef = useRef(null);
  const [loadedBgImg, setLoadedBgImg] = useState(null);
  const [templateImgObj, setTemplateImgObj] = useState(null);

  // TREND RADAR STATES
  const [trendTimeFilter, setTrendTimeFilter] = useState('1 Jam');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedHeadlines, setSelectedHeadlines] = useState([]);
  const [activeTab, setActiveTab] = useState('Headlines');
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendTopics, setTrendTopics] = useState([
    {
      id: 'jakarta', title: 'Jakarta', icon: '🏙️', volume: '89/jam', velocity: '+45%', sentiment: 'Campur', sentimentColor: '#eab308', hot: false, lastUpdate: '2 menit lalu',
      headlines: [
        { id:1, source:'DETIK', time:'12m lalu', sentiment:'neg', title:'Banjir Rob Pluit, Pompa Ancol Tak Berfungsi Maksimal', summary:'Ketinggian air 60cm di Muara Angke, warga evakuasi mandiri.', url:'https://news.detik.com/jakarta', tags:['#Banjir','#Pluit'] },
        { id:2, source:'KOMPAS', time:'23m lalu', sentiment:'neu', title:'Demo Ojol di Balai Kota Tuntut Aturan Tarif Baru', summary:'Ratusan driver ojol gelar aksi di depan Balai Kota DKI.', url:'https://megapolitan.kompas.com', tags:['#Ojol','#BalaiKota'] },
        { id:3, source:'TEMPO', time:'41m lalu', sentiment:'neg', title:'Kebijakan PSN Jakarta Utara Disoal Warga', summary:'Warga Marunda protes soal penggusuran.', url:'https://tempo.co/jakarta', tags:['#PSN','#Gusuran'] },
      ],
      hooks: ['URGENT: Pluit Tenggelam Lagi, Warga Tanya Janji Pemprov Mana?', 'HUMAN: Cerita Ibu di Pluit: Air Masuk Jam 2 Pagi', 'INVESTIGATIVE: Kenapa Pompa Ancol Gagal? Data BMKG vs PUPR'],
      keywords: [{k:'#BanjirRob', v:'↑210%'}, {k:'#BalaiKota', v:'↑45%'}, {k:'#Drainase', v:'↑18%'}]
    },
    {
      id: 'nasional', title: 'Berita Nasional', icon: '📰', volume: '210/jam', velocity: '+12%', sentiment: 'Netral', sentimentColor: '#8b949e', hot: false, lastUpdate: '5 menit lalu',
      headlines: [
        { id:1, source:'CNN', time:'8m lalu', sentiment:'neu', title:'APBN 2025 Fokus ke Makan Bergizi Gratis dan IKN', summary:'Menkeu paparkan alokasi anggaran.', url:'https://cnnindonesia.com', tags:['#APBN'] },
        { id:2, source:'KOMPAS', time:'18m lalu', sentiment:'neu', title:'KPU Siapkan Tahapan Pilkada Serentak', summary:'Jadwal dan logistik mulai disiapkan.', url:'https://nasional.kompas.com', tags:['#Pilkada'] },
      ],
      hooks: ['APBN 2025: Janji Makan Gratis vs Utang Negara', 'Pilkada Serentak: Siapa Untung?', 'Data APBN Bocor, Benarkah Defisit Membengkak?'],
      keywords: [{k:'#APBN2025', v:'↑120%'}, {k:'#Pilkada', v:'↑80%'}]
    },
    {
      id: 'bencana', title: 'Bencana Terkini', icon: '🌋', volume: '34/jam', velocity: '+230%', sentiment: 'Negatif', sentimentColor: '#ef4444', hot: true, lastUpdate: '1 menit lalu',
      headlines: [
        { id:1, source:'BMKG', time:'3m lalu', sentiment:'neg', title:'Gempa M 5.2 Halmahera, Kedalaman 10km - Tidak Berpotensi Tsunami', summary:'Gempa dirasakan hingga Ternate.', url:'https://bmkg.go.id', tags:['#Gempa','#Halmahera'], isBMKG:true },
        { id:2, source:'BNPB', time:'15m lalu', sentiment:'neg', title:'BNPB: Banjir Bandang di Wamena, 2 Warga Hilang', summary:'Hujan deras picu banjir.', url:'https://bnpb.go.id', tags:['#BanjirBandang'] },
      ],
      hooks: ['BREAKING: Gempa Halmahera 5.2 - Warga Panik', 'BMKG Warning: Jawa-Bali Siaga Cuaca Ekstrem', 'BNPB Lambat? Data Bencana vs Respon'],
      keywords: [{k:'#GempaHalmahera', v:'↑450%'}, {k:'#CuacaEkstrem', v:'↑200%'}]
    },
    {
      id: 'pdip', title: 'PDI Perjuangan', icon: '🐂', volume: '67/jam', velocity: '+89%', sentiment: 'Negatif 72%', sentimentColor: '#ef4444', hot: true, lastUpdate: '4 menit lalu',
      headlines: [
        { id:1, source:'TEMPO', time:'20m lalu', sentiment:'neg', title:'Isu Konflik Internal PDIP Menguat Jelang Rakernas', summary:'Sumber internal sebut ada perbedaan sikap.', url:'https://tempo.co/politik', tags:['#PDIP','#Rakernas'] },
        { id:2, source:'DETIK', time:'55m lalu', sentiment:'neg', title:'Hasto Tanggapi Isu Perpecahan: Solid!', summary:'Sekjen PDIP bantah isu pecah.', url:'https://detik.com', tags:['#Hasto'] },
      ],
      hooks: ['PDIP Retak? Sinyal Konflik Jelang 2029', 'Hasto vs Realita: Solid di Luar, Gejolak di Dalam?', 'Rakernas PDIP: Panggung Rekonsiliasi?'],
      keywords: [{k:'#RakernasPDIP', v:'↑89%'}, {k:'#Hasto', v:'↑34%'}]
    },
    {
      id: 'megawati', title: 'Megawati', icon: '👩‍🦳', volume: '41/jam', velocity: '+15%', sentiment: 'Campur', sentimentColor: '#eab308', hot: false, lastUpdate: '12 menit lalu',
      headlines: [{ id:1, source:'KOMPAS', time:'1j lalu', sentiment:'neu', title:'Pidato Megawati di Rakernas: Ingatkan Kader Jangan Lupa Akar Rumput', summary:'Megawati tekankan ideologi.', url:'https://kompas.com', tags:['#Megawati'] }],
      hooks: ['Megawati: Jangan Jadi Kader Kutu Loncat', 'Pesan Megawati: Akar Rumput vs Elit?'],
      keywords: [{k:'#Megawati', v:'↑15%'}]
    },
    {
      id: 'puan', title: 'Puan Maharani', icon: '👩‍💼', volume: '28/jam', velocity: '+5%', sentiment: 'Positif 54%', sentimentColor: '#22c55e', hot: false, lastUpdate: '18 menit lalu',
      headlines: [{ id:1, source:'DPR RI', time:'2j lalu', sentiment:'pos', title:'Puan Pimpin Sidang Paripurna, Sahkan 3 RUU', summary:'Sidang berjalan kondusif.', url:'https://dpr.go.id', tags:['#DPR','#Puan'], hasYT:true }],
      hooks: ['Puan di DPR: Politisi atau Negarawan?', '3 RUU Disahkan, Apa Dampak ke Rakyat Kecil?'],
      keywords: [{k:'#PuanMaharani', v:'↑5%'}]
    },
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
        const res = await fetch(`/api/trend-radar?filter=${encodeURIComponent(trendTimeFilter)}`);
        const data = await res.json();
        if (data?.topics?.length) setTrendTopics(data.topics);
      } catch (e) { console.log('radar offline, pakai mock'); }
      finally { setTrendLoading(false); }
    };
    fetchRadar();
    const iv = setInterval(fetchRadar, 60000);
    return () => clearInterval(iv);
  }, [currentPage, trendTimeFilter]);

  const handleFormat = (command, value = null) => {
    if (typeof document === 'undefined') return;
    document.execCommand(command, false, value);
    const editor = document.getElementById('judul-editor');
    if (editor) setJudulHtml(editor.innerHTML);
  };

  const renderRichText = (ctx, htmlString, x, y, maxWidth, lineHeight, baseFontSize, align = 'left') => {
    if (!htmlString || typeof document === 'undefined') return;
    ctx.textBaseline = 'top';
    // FIXED REGEX - ini yang bikin build fail kemarin
    let cleanHTML = htmlString
      .replace(/<div[^>]*><br><\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHTML;
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
    const baseF = templateMode === 'agentlondo' ? 'IBMPlexMono-SemiBold' : 'PoppinsSemiBold';
    const italicF = templateMode === 'agentlondo' ? 'IBMPlexMono-SemiBoldItalic' : 'PoppinsSemiBoldItalic';
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
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (loadedBgImg) {
      const dw = loadedBgImg.width * imgScale;
      const dh = loadedBgImg.height * imgScale;
      ctx.drawImage(loadedBgImg, imgX, imgY, dw, dh);
    }
    if (templateImgObj) ctx.drawImage(templateImgObj, 0, 0, canvas.width, canvas.height);
    if (showMarginGuide) {
      ctx.save();
      ctx.strokeStyle = 'rgba(139,148,158,0.5)';
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(MARGIN_PX, MARGIN_PX, canvas.width - MARGIN_PX * 2, canvas.height - MARGIN_PX * 2);
      ctx.restore();
    }
    const lh = ukuranFont * jarakBaris;
    const clampedX = Math.max(MARGIN_PX, Math.min(teksX, 1080 - MARGIN_PX - 100));
    const clampedY = Math.max(MARGIN_PX, Math.min(teksY, 1350 - MARGIN_PX - 100));
    const aw = 1080 - clampedX - MARGIN_PX;
    const mw = Math.max(100, Math.min(950, aw));
    renderRichText(ctx, judulHtml, clampedX, clampedY, mw, lh, ukuranFont, teksAlign);
    if (sumberBerita) {
      ctx.fillStyle = sumberColor || '#FFFFFF';
      const sf = templateMode === 'agentlondo' ? 'IBMPlexMono-SemiBoldItalic' : 'PoppinsSemiBoldItalic';
      ctx.font = ukuranFontSumber + 'px ' + sf + ', sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(sumberBerita, sumberX, sumberY);
    }
  };

  useEffect(() => {
    if (currentPage !== 3) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (ctx) renderCanvas(ctx, c, true);
  }, [currentPage, loadedBgImg, templateImgObj, imgX, imgY, imgScale, teksX, teksY, ukuranFont, jarakBaris, sumberX, sumberY, ukuranFontSumber, judulHtml, sumberBerita, sumberColor, templateMode, teksAlign]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const cx = e.clientX || e.touches?.[0]?.clientX;
    const cy = e.clientY || e.touches?.[0]?.clientY;
    setDragStart({ x: cx - imgX, y: cy - imgY });
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const cx = e.clientX || e.touches?.[0]?.clientX;
    const cy = e.clientY || e.touches?.[0]?.clientY;
    setImgX(cx - dragStart.x);
    setImgY(cy - dragStart.y);
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e) => {
    e.preventDefault();
    const zi = 0.05;
    if (e.deltaY < 0) setImgScale(p => Math.min(p + zi, 5));
    else setImgScale(p => Math.max(p - zi, 0.1));
  };
  const handleUploadFoto = (e) => { const file = e.target.files[0]; if (file) setImageUrl(URL.createObjectURL(file)); };
  const handleUploadTemplate = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const img = new Image(); const ou = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width !== 1080 || img.height !== 1350) {
        if (!confirm('Ukuran template ' + img.width + ' x ' + img.height + ', bukan 1080 x 1350. Tetap pakai?')) { URL.revokeObjectURL(ou); return; }
      }
      setTemplateImgObj(img);
    };
    img.onerror = () => alert('Gagal load template');
    img.src = ou;
  };
  const downloadGambar = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    renderCanvas(ctx, c, false);
    const a = document.createElement('a');
    a.download = 'AgoraVada_Post.jpg';
    a.href = c.toDataURL("image/jpeg", 0.95);
    a.click();
    setTimeout(() => { const cc = canvasRef.current; if (cc) { const cctx = cc.getContext('2d'); if (cctx) renderCanvas(cctx, cc, true); } }, 100);
  };
  const handleTapUploadButton = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    renderCanvas(ctx, c, false);
    c.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setReviewImageBlob(blob);
      setReviewImageUrl(url);
      const tmp = document.createElement('div'); tmp.innerHTML = judulHtml || '';
      let cap = (tmp.textContent || '').trim();
      if (sumberBerita) cap += `\n\n${sumberBerita}`;
      if (!cap.includes('#AgoraVada')) cap += `\n\n#AgoraVada #BeritaTerkini #Info`;
      setCaptionText(cap.trim());
      setCurrentPage(4);
    }, 'image/jpeg', 0.92);
  };
  const handlePublish = async () => {
    if (!reviewImageBlob) return alert('Gambar belum siap');
    setIsUploading(true);
    try {
      const fd = new FormData(); fd.append('file', reviewImageBlob);
      const upRes = await fetch('/api/instagram/upload-image', { method: 'POST', body: fd });
      const upData = await upRes.json(); if (!upRes.ok) throw new Error(upData.error);
      const pubRes = await fetch('/api/instagram/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrls: [upData.url], caption: captionText }) });
      const pubData = await pubRes.json(); if (!pubRes.ok) throw new Error(pubData.error || JSON.stringify(pubData));
      alert('Berhasil publish IG!'); setCurrentPage(3);
    } catch (err) { alert('Gagal: ' + err.message); }
    finally { setIsUploading(false); }
  };
  const handleCopyPrompt = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(promptTeks);
      setIsCopied(true); setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const openDetail = (topic) => { setSelectedTopic(topic); setShowDetail(true); setSelectedHeadlines([]); setActiveTab('Headlines'); };
  const toggleHeadline = (h) => { setSelectedHeadlines(prev => prev.find(x => x.id === h.id) ? prev.filter(x => x.id !== h.id) : [...prev, h]); };
  const handleJadikanBerita = () => {
    if (!selectedHeadlines.length) return alert('Pilih minimal 1 berita dulu');
    const first = selectedHeadlines[0];
    setUrlBerita(first.url);
    setSumberBerita(first.source);
    setPromptTeks(PROMPT_TEMPLATES.homeless + "\n\nKonteks trending: " + selectedTopic.title + " - " + first.title);
    setCurrentPage(1);
    setShowDetail(false);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#0a0a0f', color: '#fff' }}>
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"); *{font-family:'Geist',sans-serif} .mono{font-family:'Geist Mono',monospace}`}</style>
      <div style={{ width: '100%', maxWidth: currentPage === 0 ? '1280px' : currentPage === 3 ? '950px' : currentPage === 4 ? '900px' : '480px', margin: '0 auto', padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}><h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '1px' }}>⚡ AGORA VADA</h1></div>

        {currentPage === 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Public Trend Radar</h2>
              <p style={{ color: '#8b949e', fontSize: '14px', marginTop: '6px' }}>Monitoring isu publik terupdate secara real-time.</p>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {['1 Jam', '6 Jam', '24 Jam', 'Semua'].map(f => (
                  <button key={f} onClick={() => setTrendTimeFilter(f)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid #30363d', backgroundColor: trendTimeFilter === f ? '#fff' : '#161b22', color: trendTimeFilter === f ? '#000' : '#c9d1d9', cursor: 'pointer' }}>{f}</button>
                ))}
                <div style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', backgroundColor: '#161b22', border: '1px solid #30363d', color: '#22c55e' }} className="mono">● LIVE {trendLoading ? 'sync...' : 'ON'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '16px' }}>
              {trendTopics.map(topic => (
                <div key={topic.id} style={{ backgroundColor: '#161b22', border: `1px solid ${topic.hot ? '#f85149' : '#30363d'}`, borderRadius: '16px', padding: '18px', position: 'relative' }}>
                  {topic.hot && <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', backgroundColor: '#f85149', color: '#fff', padding: '3px 8px', borderRadius: '10px', fontWeight: '700' }} className="mono">HOT +{topic.velocity}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '48px', height: '48px', backgroundColor: '#0d1117', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid #30363d' }}>{topic.icon}</div>
                    <div><div style={{ fontWeight: '700', fontSize: '15px' }}>{topic.title}</div><div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{topic.volume} • {topic.lastUpdate}</div></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <div className="mono" style={{ fontSize: '11px', backgroundColor: '#0d1117', border: '1px solid #30363d', padding: '4px 8px', borderRadius: '6px' }}>Vol {topic.volume}</div>
                    <div className="mono" style={{ fontSize: '11px', backgroundColor: topic.hot ? '#f8514920' : '#0d1117', border: `1px solid ${topic.hot ? '#f85149' : '#30363d'}`, padding: '4px 8px', borderRadius: '6px', color: topic.hot ? '#f85149' : '#c9d1d9' }}>{topic.velocity} 🔥</div>
                    <div style={{ fontSize: '11px', backgroundColor: '#0d1117', border: '1px solid #30363d', padding: '4px 8px', borderRadius: '6px', color: topic.sentimentColor }}>{topic.sentiment}</div>
                  </div>
                  <div style={{ marginBottom: '14px' }}>{topic.headlines.slice(0, 2).map(h => (<div key={h.id} style={{ fontSize: '12px', color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>• {h.title}</div>))}</div>
                  <button onClick={() => openDetail(topic)} style={{ width: '100%', backgroundColor: '#fff', color: '#000', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', border: 'none', cursor: 'pointer' }}>Q Cek Sekarang</button>
                </div>
              ))}
            </div>

            {showDetail && selectedTopic && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 50, display: 'flex', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
                <div style={{ width: '100%', maxWidth: '1100px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '16px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button onClick={() => setShowDetail(false)} style={{ backgroundColor: '#21262d', border: '1px solid #30363d', color: '#fff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>← Kembali</button>
                      <div style={{ fontWeight: '800' }}>{selectedTopic.icon} {selectedTopic.title}</div>
                    </div>
                    <button onClick={() => setShowDetail(false)} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '20px', cursor: 'pointer' }}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr' }}>
                    <div style={{ borderRight: '1px solid #30363d', padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        {['Headlines', 'Framing', 'Peta'].map(tab => (
                          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid #30363d', backgroundColor: activeTab === tab ? '#fff' : '#161b22', color: activeTab === tab ? '#000' : '#c9d1d9' }}>{tab}</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedTopic.headlines.map(h => (
                          <div key={h.id} style={{ display: 'flex', gap: '10px', padding: '12px', borderRadius: '10px', backgroundColor: selectedHeadlines.find(x => x.id === h.id) ? '#1f6feb20' : '#161b22', border: `1px solid ${selectedHeadlines.find(x => x.id === h.id) ? '#1f6feb' : '#30363d'}`, cursor: 'pointer' }} onClick={() => toggleHeadline(h)}>
                            <input type="checkbox" checked={!!selectedHeadlines.find(x => x.id === h.id)} readOnly />
                            <div><div style={{ fontSize: '10px' }} className="mono">{h.source} • {h.time}</div><div style={{ fontWeight: '600', fontSize: '13px' }}>{h.title}</div><div style={{ fontSize: '11px', color: '#8b949e' }}>{h.summary}</div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding: '16px', backgroundColor: '#161b22' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#a371f7', marginBottom: '10px' }}>🤖 AI HOOK</div>
                      {selectedTopic.hooks.map((hook, i) => (<div key={i} style={{ padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', marginBottom: '8px', fontSize: '12px', cursor: 'pointer' }} onClick={() => setJudulHtml(hook)}>{hook}</div>))}
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #30363d', backgroundColor: '#161b22', display: 'flex', justifyContent: 'space-between' }}>
                    <div className="mono" style={{ fontSize: '11px', color: '#8b949e' }}>{selectedHeadlines.length} dipilih</div>
                    <button onClick={handleJadikanBerita} style={{ padding: '10px 16px', backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>→ Jadikan Berita AgoraVada</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '24px', display: currentPage === 0 ? 'none' : 'block' }}>
          {currentPage === 1 && (
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: '#c9d1d9', borderBottom: '1px solid #30363d', paddingBottom: '8px' }}>1. Masukkan Link Berita</h2>
              <input type="text" placeholder="https://news.com/..." style={{ width: '100%', backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '14px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }} value={urlBerita} onChange={(e) => setUrlBerita(e.target.value)} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{ width: '50%', backgroundColor: '#21262d', color: '#c9d1d9', padding: '12px', borderRadius: '10px', fontWeight: '600', fontSize: '13px', border: '1px solid #30363d', cursor: 'pointer' }} onClick={async () => { if (!urlBerita) return alert("Masukkan link dulu!"); setPromptTeks("Menyedot data dari web, tunggu sebentar..."); try { const res = await fetch("/api/tarik-berita", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: urlBerita }) }); const data = await res.json(); if (data.status === "success") { setPromptTeks(PROMPT_TEMPLATES.homeless + "\n\n" + data.prompt); setSumberBerita(data.sumber || ""); if (data.gambar_url) setImageUrl(data.gambar_url); setCurrentPage(2); } else { alert("Gagal: " + (data.error || "Terhalang")); } } catch { alert("Gagal konek API"); } }}>Tarik Data 🔄</button>
                <button style={{ width: '50%', backgroundColor: '#238636', color: '#fff', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', border: 'none', cursor: 'pointer' }} onClick={() => setCurrentPage(3)}>Langsung ke Editor ➔</button>
              </div>
              <button onClick={() => setCurrentPage(0)} style={{ marginTop: '12px', width: '100%', backgroundColor: 'transparent', border: '1px dashed #30363d', color: '#8b949e', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px' }}>← Kembali ke Trend Radar</button>
            </div>
          )}
          {currentPage === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #30363d', paddingBottom: '8px' }}><h2 style={{ fontSize: '15px', fontWeight: '700', color: '#c9d1d9', margin: 0 }}>2. Prompt Manual</h2><button onClick={handleCopyPrompt} style={{ backgroundColor: isCopied ? '#238636' : '#21262d', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', border: '1px solid #30363d' }}>{isCopied ? "✅ Tersalin!" : "📋 Copy Prompt"}</button></div>
              <textarea style={{ width: '100%', backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', padding: '12px', borderRadius: '10px', fontSize: '13px', minHeight: '280px', boxSizing: 'border-box' }} value={promptTeks} onChange={(e) => setPromptTeks(e.target.value)} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}><button style={{ width: '35%', backgroundColor: '#21262d', color: '#c9d1d9', padding: '12px', borderRadius: '10px', border: '1px solid #30363d' }} onClick={() => setCurrentPage(1)}>⬅ Kembali</button><button style={{ width: '65%', backgroundColor: '#1f6feb', color: '#fff', padding: '12px', borderRadius: '10px', border: 'none' }} onClick={() => setCurrentPage(3)}>Ke Visual Editor ➔</button></div>
            </div>
          )}
          {currentPage === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#8b949e' }}>LIVE PREVIEW (1080 x 1350)</h2>
                    <div style={{ border: '2px dashed #30363d', borderRadius: '10px', padding: '8px', backgroundColor: '#161b22' }}>
                      <canvas ref={canvasRef} width="1080" height="1350" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp} onWheel={handleWheel} style={{ width: '280px', height: 'auto', borderRadius: '6px', display: 'block', touchAction: 'none' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ backgroundColor: '#0d1117', padding: '16px', borderRadius: '12px', border: '1px solid #30363d' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#a371f7', display: 'block', marginBottom: '10px' }}>📝 EDIT JUDUL</label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <button onClick={() => handleFormat('foreColor', '#E7E820')} style={{ backgroundColor: '#E7E820', color: '#000', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: 'none' }}>Kuning</button>
                      <button onClick={() => handleFormat('italic')} style={{ backgroundColor: '#21262d', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', border: '1px solid #30363d' }}>I</button>
                    </div>
                    <div id="judul-editor" contentEditable onInput={(e) => setJudulHtml(e.currentTarget.innerHTML)} style={{ width: '100%', backgroundColor: '#161b22', border: '1px solid #30363d', color: '#fff', padding: '12px', borderRadius: '8px', fontSize: '14px', minHeight: '110px', outline: 'none' }} />
                  </div>
                  <div style={{ backgroundColor: '#0d1117', padding: '16px', borderRadius: '12px', border: '1px solid #30363d' }}><label style={{ fontSize: '11px', fontWeight: '700', color: '#f78166', display: 'block', marginBottom: '10px' }}>🔗 SUMBER BERITA</label><input type="text" style={{ width: '100%', backgroundColor: '#161b22', border: '1px solid #30363d', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '13px' }} value={sumberBerita} onChange={(e) => setSumberBerita(e.target.value)} /></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ backgroundColor: '#0d1117', padding: '12px 16px', borderRadius: '12px', border: '1px solid #30363d' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#3fb950', display: 'block', marginBottom: '8px' }}>🖼️ KONTROL GAMBAR</label>
                    <div>Zoom <input type="range" min="0.2" max="3" step="0.05" value={imgScale} onChange={(e) => setImgScale(parseFloat(e.target.value))} style={{ width: '100%' }} /></div>
                    <div>Geser X <input type="range" min="-1000" max="1000" step="10" value={imgX} onChange={(e) => setImgX(parseInt(e.target.value))} style={{ width: '100%' }} /></div>
                    <div>Geser Y <input type="range" min="-1000" max="1000" step="10" value={imgY} onChange={(e) => setImgY(parseInt(e.target.value))} style={{ width: '100%' }} /></div>
                  </div>
                  <div style={{ backgroundColor: '#0d1117', padding: '12px 16px', borderRadius: '12px', border: '1px solid #30363d' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#a371f7', display: 'block', marginBottom: '8px' }}>✨ KONTROL JUDUL</label>
                    <div>Ukuran <input type="range" min="30" max="150" value={ukuranFont} onChange={(e) => setUkuranFont(parseInt(e.target.value))} style={{ width: '100%' }} /></div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #30363d' }}>
                      <button style={{ width: '30%', backgroundColor: '#21262d', color: '#c9d1d9', padding: '12px', borderRadius: '8px', border: '1px solid #30363d' }} onClick={() => setCurrentPage(2)}>⬅</button>
                      <button style={{ width: '35%', backgroundColor: '#238636', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '700' }} onClick={downloadGambar}>📥 Download</button>
                      <button style={{ width: '35%', backgroundColor: '#1f6feb', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '700' }} onClick={handleTapUploadButton}>☁️ Upload</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {currentPage === 4 && (
            <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '20px' }}>
              <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#8b949e', marginBottom: '10px' }}>PREVIEW TANPA GARIS</div>
                {reviewImageUrl ? <img src={reviewImageUrl} alt="review" style={{ width: '100%', display: 'block' }} /> : <div style={{ padding: '80px', textAlign: 'center', color: '#6e7681' }}>No image</div>}
              </div>
              <div>
                <div style={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '14px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#58a6ff', marginBottom: '10px' }}>CAPTION</div>
                  <textarea value={captionText} onChange={e => setCaptionText(e.target.value)} style={{ width: '100%', minHeight: '320px', backgroundColor: '#161b22', border: '1px solid #30363d', color: '#fff', padding: '14px', borderRadius: '10px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginTop: '14px' }}>
                  <button onClick={() => setCurrentPage(3)} style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#21262d', border: '1px solid #30363d', color: '#fff' }}>← Kembali</button>
                  <button onClick={handlePublish} disabled={isUploading} style={{ padding: '14px', borderRadius: '10px', backgroundColor: isUploading ? '#30363d' : '#238636', color: '#fff', border: 'none', fontWeight: '800' }}>{isUploading ? '⏳ Uploading...' : '🚀 Publish ke Instagram'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
