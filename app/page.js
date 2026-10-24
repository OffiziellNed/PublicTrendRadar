import { NextResponse } from 'next/server';

// /api/trend-radar - Real-time monitoring for AgoraVada Public Trend Radar
// Query: ?filter=1 Jam|6 Jam|24 Jam|Semua&topic=jakarta (optional)

const MOCK_TOPICS = [
  {
    id: 'jakarta',
    title: 'Jakarta',
    icon: '🏙️',
    keywords: ['jakarta banjir', 'demo balai kota', 'psn jakarta'],
    baseVolume: 89,
  },
  {
    id: 'nasional',
    title: 'Berita Nasional',
    icon: '📰',
    keywords: ['apbn 2025', 'pilkada serentak'],
    baseVolume: 210,
  },
  {
    id: 'bencana',
    title: 'Bencana Terkini',
    icon: '🌋',
    keywords: ['gempa', 'bnpb', 'bmkg cuaca ekstrem'],
    baseVolume: 34,
    isBencana: true,
  },
  {
    id: 'pdip',
    title: 'PDI Perjuangan',
    icon: '🐂',
    keywords: ['pdi perjuangan', 'hasto', 'rakernas pdip'],
    baseVolume: 67,
  },
  {
    id: 'megawati',
    title: 'Megawati',
    icon: '👩‍🦳',
    keywords: ['megawati soekarnoputri'],
    baseVolume: 41,
  },
  {
    id: 'puan',
    title: 'Puan Maharani',
    icon: '👩‍💼',
    keywords: ['puan maharani', 'dpr ri'],
    baseVolume: 28,
  },
];

async function fetchBMKG() {
  try {
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { next: { revalidate: 120 } });
    if (!res.ok) throw new Error('BMKG fail');
    const json = await res.json();
    const info = json?.Infogempa?.gempa;
    if (!info) return null;
    return {
      id: 999,
      source: 'BMKG',
      time: info.Jam + ' WIB',
      sentiment: 'neg',
      title: `Gempa M ${info.Magnitude} ${info.Wilayah}, Kedalaman ${info.Kedalaman} - ${info.Potensi}`,
      summary: `Lintang ${info.Lintang} Bujur ${info.Bujur} - Dirasa ${info.Dirasakan}`,
      url: 'https://bmkg.go.id',
      tags: ['#Gempa', `#${info.Wilayah?.split(' ')[0] || 'BMKG'}`],
      isBMKG: true,
    };
  } catch (e) {
    console.log('BMKG fetch error', e.message);
    return null;
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || '1 Jam';
  const topicFilter = searchParams.get('topic');

  // Fetch BMKG real data
  const bmkgData = await fetchBMKG();

  const topics = MOCK_TOPICS.filter(t => !topicFilter || t.id === topicFilter).map(t => {
    // Simulasi velocity naik turun random biar kerasa live
    const velocityRand = Math.floor(Math.random() * 40) + 5;
    const isHot = t.baseVolume < 80 && velocityRand > 30 ? true : t.id === 'bencana' || t.id === 'pdip';
    const velocity = `+${velocityRand + (t.isBencana ? 150 : 0)}%`;
    
    let headlines = [];
    if (t.id === 'bencana' && bmkgData) {
      headlines = [bmkgData,
        { id:2, source:'BNPB', time:'15m lalu', sentiment:'neg', title:'BNPB: Banjir Bandang Wamena, 2 Warga Hilang', summary:'Hujan deras picu banjir.', url:'https://bnpb.go.id', tags:['#BanjirBandang'] },
        { id:3, source:'BMKG', time:'28m lalu', sentiment:'neu', title:'Peringatan Cuaca Ekstrem Jawa-Bali 24 Jam', summary:'Potensi hujan lebat.', url:'https://bmkg.go.id', tags:['#CuacaEkstrem'] },
      ];
    } else if (t.id === 'jakarta') {
      headlines = [
        { id:1, source:'DETIK', time:'12m lalu', sentiment:'neg', title:'Banjir Rob Pluit, Pompa Ancol Tak Berfungsi Maksimal', summary:'Ketinggian air 60cm di Muara Angke.', url:'https://news.detik.com', tags:['#Banjir','#Pluit'] },
        { id:2, source:'KOMPAS', time:'23m lalu', sentiment:'neu', title:'Demo Ojol di Balai Kota Tuntut Aturan Tarif', summary:'Ratusan driver ojol aksi.', url:'https://kompas.com', tags:['#Ojol'] },
      ];
    } else if (t.id === 'pdip') {
      headlines = [
        { id:1, source:'TEMPO', time:'20m lalu', sentiment:'neg', title:'Isu Konflik Internal PDIP Menguat Jelang Rakernas', summary:'Sumber internal sebut perbedaan sikap.', url:'https://tempo.co', tags:['#PDIP'] },
      ];
    } else {
      // Generic mock
      headlines = [
        { id:1, source:'CNN', time:'8m lalu', sentiment:'neu', title:`Update Terbaru ${t.title} - ${filter}`, summary:'Ringkasan berita terkini dari berbagai sumber.', url:'https://cnnindonesia.com', tags:[`#${t.title.replace(/\s+/g,'')}`] },
      ];
    }

    return {
      id: t.id,
      title: t.title,
      icon: t.icon,
      volume: `${t.baseVolume + Math.floor(Math.random()*10)}/jam`,
      velocity,
      sentiment: t.id === 'pdip' ? 'Negatif 72%' : t.id === 'bencana' ? 'Negatif' : t.id === 'puan' ? 'Positif 54%' : 'Campur',
      sentimentColor: t.id === 'bencana' || t.id === 'pdip' ? '#ef4444' : t.id === 'puan' ? '#22c55e' : '#eab308',
      hot: isHot,
      lastUpdate: `${Math.floor(Math.random()*10)+1} menit lalu`,
      headlines,
      hooks: t.id === 'bencana' ? ['BREAKING: Gempa Halmahera 5.2', 'BMKG Warning Jawa-Bali', 'BNPB Lambat?'] : [`${t.title}: Sisi yang Tidak Diceritakan Media`, `Hook Investigatif ${t.title}`, `Hook Human Interest ${t.title}`],
      keywords: t.keywords.map(k=>({k:'#'+k.split(' ')[0], v:`↑${Math.floor(Math.random()*200)+10}%`})),
    };
  });

  return NextResponse.json({
    status: 'success',
    filter,
    lastSync: new Date().toISOString(),
    topics,
    source: {
      bmkg: bmkgData ? 'live' : 'mock-fallback',
      news: 'rss-detilk+kompas (mock now, ganti dengan cheerio fetch)',
    }
  });
}
