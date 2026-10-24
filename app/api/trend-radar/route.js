import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// SUPER STABLE - NO CHEERIO - NO FETCH - CUMA DUMMY DATA BIAR PAGE GAK CRASH
// Kalau ini aja masih error, berarti page.js yang error, bukan route.js

const TOPIC_META = {
  jakarta: { title: 'Jakarta', icon: '🏙️' },
  nasional: { title: 'Berita Nasional', icon: '📰' },
  bencana: { title: 'Bencana Terkini', icon: '🌋' },
  pdip: { title: 'PDI Perjuangan', icon: '🐂' },
  megawati: { title: 'Megawati Soekarnoputri', icon: '👩‍🦳' },
  puan: { title: 'Puan Maharani', icon: '👩‍💼' },
  kritik_publik: { title: 'Kritik Publik', icon: '📢' },
  dedi_mulyadi: { title: 'Dedi Mulyadi / KDM', icon: '🌾' },
  keluarga_jokowi: { title: 'Keluarga Jokowi', icon: '👨‍👩‍👧‍👦' },
  homeless_media: { title: 'Homeless Media', icon: '🏴‍☠️' },
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filterRaw = searchParams.get('filter') || '1 Jam';
    let hours = 1;
    if (filterRaw.includes('6')) hours = 6;
    else if (filterRaw.includes('24')) hours = 24;

    const topicOrder = ['jakarta','nasional','bencana','pdip','megawati','puan','kritik_publik','dedi_mulyadi','keluarga_jokowi','homeless_media'];

    const results = topicOrder.map((id) => {
      // HOMELESS MEDIA HANYA DI 24 JAM
      if (id === 'homeless_media' && hours !== 24) {
        return {
          id,
          title: TOPIC_META[id].title,
          icon: TOPIC_META[id].icon,
          volume: `0 berita`,
          lastUpdate: `hanya di 24 jam terakhir`,
          headlines: [],
        };
      }

      // Dummy headlines biar page ke-render, bukan fetch asli
      const dummyCount = id === 'homeless_media' ? (hours === 24 ? 5 : 0) : 8;
      const headlines = Array.from({ length: dummyCount }, (_, i) => ({
        id: `${id}-${i}`,
        source: id === 'homeless_media' ? 'Instagram • totalpolitikcom' : 'Dummy Source',
        time: `${i+1}j lalu`,
        minutesAgo: i * 10,
        title: id === 'homeless_media' ? `Postingan IG @totalpolitikcom #${i+1} - dummy test anti crash` : `Judul dummy ${TOPIC_META[id].title} #${i+1} untuk test`,
        url: 'https://instagram.com/totalpolitikcom',
        link: 'https://instagram.com/totalpolitikcom',
      }));

      return {
        id,
        title: TOPIC_META[id].title,
        icon: TOPIC_META[id].icon,
        volume: `${headlines.length} berita`,
        lastUpdate: id === 'homeless_media' ? `IG @totalpolitikcom via Google • 24 jam (DUMMY)` : `dalam ${hours} jam terakhir (DUMMY)`,
        headlines,
      };
    });

    return NextResponse.json({ 
      success: true, 
      filter: filterRaw, 
      hours, 
      lastSync: new Date().toISOString(), 
      topics: results 
    }, { status: 200 });

  } catch (e) {
    // JANGAN PERNAH RETURN 500
    return NextResponse.json({ 
      success: false, 
      error: String(e),
      topics: []
    }, { status: 200 });
  }
}
