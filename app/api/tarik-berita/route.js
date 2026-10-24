import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// DATA DENGAN TIMESTAMP - seperti kode lama lo yang pakai minutesAgo
const BASE_TOPICS = [
  { id: 'jakarta', title: 'Jakarta', icon: '🏙️', baseVolume: 89 },
  { id: 'nasional', title: 'Berita Nasional', icon: '📰', baseVolume: 210 },
  { id: 'bencana', title: 'Bencana Terkini', icon: '🌋', baseVolume: 34, isBencana: true },
  { id: 'pdip', title: 'PDI Perjuangan', icon: '🐂', baseVolume: 67 },
  { id: 'megawati', title: 'Megawati Soekarnoputri', icon: '👩‍🦳', baseVolume: 41 },
  { id: 'puan', title: 'Puan Maharani', icon: '👩‍💼', baseVolume: 28 },
];

const HEADLINES_DB = {
  jakarta: [
    { id:1, source:'DETIK', time:'12m lalu', minutesAgo:12, sentiment:'neg', title:'Banjir Rob Pluit, Pompa Ancol Tak Berfungsi Maksimal', summary:'Ketinggian air 60cm di Muara Angke.', url:'https://news.detik.com/jakarta/banjir-rob-pluit', tags:['#Banjir'] },
    { id:2, source:'KOMPAS', time:'45m lalu', minutesAgo:45, sentiment:'neu', title:'Demo Ojol di Balai Kota Tuntut Aturan Tarif Baru', summary:'Ratusan driver ojol aksi.', url:'https://megapolitan.kompas.com/read/2024/demo-ojol', tags:['#Ojol'] },
    { id:3, source:'TEMPO', time:'3j lalu', minutesAgo:180, sentiment:'neg', title:'Kebijakan PSN Jakarta Utara Disoal Warga', summary:'Warga Marunda protes.', url:'https://tempo.co/jakarta/psn', tags:['#PSN'] },
    { id:4, source:'CNN', time:'8j lalu', minutesAgo:480, sentiment:'neg', title:'Macet Parah Sudirman - Thamrin Akibat Proyek MRT', summary:'Antrean kendaraan mengular.', url:'https://cnnindonesia.com/jakarta/macet-sudirman', tags:['#Macet'] },
    { id:5, source:'KOMPAS', time:'20j lalu', minutesAgo:1200, sentiment:'neu', title:'DKI Resmikan Taman Baru di Tebet', summary:'Taman seluas 2 hektar.', url:'https://megapolitan.kompas.com/taman-tebet', tags:['#Taman'] },
  ],
  nasional: [
    { id:1, source:'CNN', time:'20m lalu', minutesAgo:20, sentiment:'neu', title:'APBN 2025 Fokus ke Makan Bergizi Gratis dan IKN', summary:'Menkeu paparkan alokasi.', url:'https://cnnindonesia.com/nasional/apbn-2025', tags:['#APBN'] },
    { id:2, source:'KOMPAS', time:'5j lalu', minutesAgo:300, sentiment:'neu', title:'KPU Siapkan Tahapan Pilkada Serentak', summary:'Jadwal logistik disiapkan.', url:'https://nasional.kompas.com/pilkada', tags:['#Pilkada'] },
    { id:3, source:'TEMPO', time:'18j lalu', minutesAgo:1080, sentiment:'neu', title:'Presiden Resmikan Tol Baru di Jawa Tengah', summary:'Tol sepanjang 40km.', url:'https://tempo.co/nasional/tol-baru', tags:['#Tol'] },
  ],
  bencana: [
    { id:1, source:'BMKG', time:'3m lalu', minutesAgo:3, sentiment:'neg', title:'Gempa M 5.2 Halmahera, Kedalaman 10km - Tidak Berpotensi Tsunami', summary:'Dirasakan hingga Ternate.', url:'https://www.bmkg.go.id/gempabumi/gempabumi-dirasakan.bmkg', tags:['#Gempa'], isBMKG:true },
    { id:2, source:'BNPB', time:'25m lalu', minutesAgo:25, sentiment:'neg', title:'BNPB: Banjir Bandang di Wamena, 2 Warga Hilang', summary:'Hujan deras picu banjir.', url:'https://bnpb.go.id/berita/banjir-wamena', tags:['#BanjirBandang'] },
    { id:3, source:'BMKG', time:'2j lalu', minutesAgo:120, sentiment:'neu', title:'Peringatan Cuaca Ekstrem Jawa-Bali 24 Jam', summary:'Potensi hujan lebat.', url:'https://www.bmkg.go.id/cuaca/cuaca-ekstrem', tags:['#CuacaEkstrem'] },
    { id:4, source:'BASARNAS', time:'10j lalu', minutesAgo:600, sentiment:'neg', title:'Longsor di Puncak Bogor, Jalur Tertutup', summary:'Evakuasi masih berlangsung.', url:'https://basarnas.go.id/longsor-puncak', tags:['#Longsor'] },
  ],
  pdip: [
    { id:1, source:'TEMPO', time:'20m lalu', minutesAgo:20, sentiment:'neg', title:'Isu Konflik Internal PDIP Menguat Jelang Rakernas', summary:'Sumber internal sebut perbedaan sikap.', url:'https://tempo.co/politik/konflik-pdip', tags:['#PDIP'] },
    { id:2, source:'DETIK', time:'55m lalu', minutesAgo:55, sentiment:'neg', title:'Hasto Tanggapi Isu Perpecahan: Solid!', summary:'Sekjen bantah pecah.', url:'https://news.detik.com/politik/hasto-solid', tags:['#Hasto'] },
    { id:3, source:'KOMPAS', time:'7j lalu', minutesAgo:420, sentiment:'neg', title:'PDIP Evaluasi Kinerja Legislator di Daerah', summary:'Evaluasi jelang 2029.', url:'https://nasional.kompas.com/pdip-evaluasi', tags:['#PDIP'] },
  ],
  megawati: [
    { id:1, source:'KOMPAS', time:'40m lalu', minutesAgo:40, sentiment:'neu', title:'Pidato Megawati Soekarnoputri di Rakernas: Ingatkan Kader Jangan Lupa Akar Rumput', summary:'Megawati tekankan ideologi.', url:'https://nasional.kompas.com/megawati-rakernas', tags:['#Megawati'] },
    { id:2, source:'CNN', time:'6j lalu', minutesAgo:360, sentiment:'neu', title:'Megawati Soekarnoputri Bertemu Relawan di Jakarta', summary:'Pertemuan tertutup.', url:'https://cnnindonesia.com/megawati-relawan', tags:['#Megawati'] },
    { id:3, source:'TEMPO', time:'22j lalu', minutesAgo:1320, sentiment:'neu', title:'Megawati Soekarnoputri Hadiri Haul Bung Karno di Blitar', summary:'Ziarah ke makam.', url:'https://tempo.co/megawati-haul', tags:['#Megawati'] },
  ],
  puan: [
    { id:1, source:'DPR RI', time:'2j lalu', minutesAgo:120, sentiment:'pos', title:'Puan Maharani Pimpin Sidang Paripurna, Sahkan 3 RUU', summary:'Sidang kondusif.', url:'https://www.dpr.go.id/berita/puan-sahkan-ruu', tags:['#DPR'], hasYT:true },
    { id:2, source:'DETIK', time:'9j lalu', minutesAgo:540, sentiment:'pos', title:'Puan Maharani Tinjau Program Makan Gratis di Solo', summary:'Tinjau dapur umum.', url:'https://news.detik.com/puan-makan-gratis', tags:['#Puan'] },
  ],
};

async function fetchBMKG() {
  try {
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    const info = json?.Infogempa?.gempa;
    if (!info) return null;
    return {
      id: 999, source: 'BMKG', time: 'Baru saja', minutesAgo: 2, sentiment: 'neg',
      title: `Gempa M ${info.Magnitude} ${info.Wilayah} - ${info.Potensi}`,
      summary: `${info.Kedalaman} • ${info.Jam} WIB`,
      url: 'https://www.bmkg.go.id/gempabumi/gempabumi-dirasakan.bmkg',
      tags: ['#Gempa'], isBMKG: true,
    };
  } catch { return null; }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || '1 Jam';

  let maxMinutes = 99999;
  if (filter === '1 Jam') maxMinutes = 60;
  else if (filter === '6 Jam') maxMinutes = 360;
  else if (filter === '24 Jam') maxMinutes = 1440;

  const bmkgLive = await fetchBMKG();

  const topics = BASE_TOPICS.map(t => {
    let headlines = [...(HEADLINES_DB[t.id] || [])];
    if (t.id === 'bencana' && bmkgLive) {
      headlines = [bmkgLive, ...headlines.filter(h => !h.isBMKG)];
    }
    // FILTER SEPERTI KODE LAMA: berdasarkan minutesAgo
    const filtered = headlines.filter(h => h.minutesAgo <= maxMinutes);
    // Jika filter 1 jam tapi nggak ada berita, tetap tampilkan kosong biar user tau (bukan fallback)
    
    return {
      id: t.id,
      title: t.title,
      icon: t.icon,
      volume: `${filtered.length} berita`,
      velocity: t.isBencana ? `+${150 + Math.floor(Math.random()*80)}%` : `+${Math.floor(Math.random()*60)+5}%`,
      sentiment: t.id === 'pdip' ? 'Negatif 72%' : t.id === 'bencana' ? 'Negatif' : t.id === 'puan' ? 'Positif 54%' : 'Campur',
      sentimentColor: t.id === 'bencana' || t.id === 'pdip' ? '#ef4444' : t.id === 'puan' ? '#22c55e' : '#eab308',
      hot: t.id === 'bencana' || t.id === 'pdip' || filtered.length >= 2,
      lastUpdate: filter === '1 Jam' ? 'dalam 1 jam terakhir' : filter === '6 Jam' ? 'dalam 6 jam terakhir' : filter === '24 Jam' ? 'dalam 24 jam terakhir' : 'semua waktu',
      headlines: filtered,
      hooks: [`${t.title}: Sisi yang Tidak Diceritakan Media`, `Hook Investigatif ${t.title}`, `Hook Human Interest ${t.title}`],
      keywords: [{k:'#'+t.title.split(' ')[0], v:`↑${Math.floor(Math.random()*200)+10}%`}],
    };
  });

  return NextResponse.json({
    status: 'success',
    filter,
    maxMinutes,
    lastSync: new Date().toISOString(),
    topics,
  });
}
