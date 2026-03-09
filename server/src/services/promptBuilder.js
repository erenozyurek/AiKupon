const BET_TYPES = [
  'MS 1 (Ev Sahibi Kazanır)',
  'MS 0 (Beraberlik)',
  'MS 2 (Deplasman Kazanır)',
  'KG Var (Karşılıklı Gol Var)',
  'KG Yok (Karşılıklı Gol Yok)',
  'Alt 2.5 Gol',
  'Üst 2.5 Gol',
  'Alt 3.5 Gol',
  'Üst 3.5 Gol',
  'Çifte Şans 1X',
  'Çifte Şans X2',
  'Çifte Şans 12',
  'İlk Yarı Üst 0.5 Gol',
  'İlk Yarı Alt 0.5 Gol',
  'İlk Yarı Üst 1.5 Gol',
  'İlk Yarı Alt 1.5 Gol',
  'İY/MS 1/1',
  'İY/MS 1/0',
  'İY/MS 1/2',
  'İY/MS 0/1',
  'İY/MS 0/0',
  'İY/MS 0/2',
  'İY/MS 2/1',
  'İY/MS 2/0',
  'İY/MS 2/2',
  'Handikap -1.5 Ev',
  'Handikap +1.5 Dep',
  'Handikap -2.5 Ev',
  'Handikap +2.5 Dep',
  'Korner Üst 9.5',
  'Korner Alt 9.5',
  'Korner Üst 10.5',
  'Korner Alt 10.5',
  'Toplam Kart Üst 3.5',
  'Toplam Kart Alt 3.5',
  'Her İki Takım da Kart Görür',
  'Ev Sahibi İlk Golü Atar',
  'Deplasman İlk Golü Atar',
  'Golsüz Maç (0-0)',
];

const CRITERIA = [
  '1. Form Durumu: Son 5 maçtaki galibiyet/yenilgi/beraberlik trendi, gol sayıları ve performans eğrisi',
  '2. Saha Avantajı: Ev sahibi/deplasman istatistikleri, evinde/dışarıda gol ortalaması, puan farkı',
  '3. Sakatlık & Ceza: Eksik oyuncular, kilit oyuncuların durumu, cezalı oyuncular ve takıma etkisi',
  '4. Sosyal Medya Etkisi: Takım morali, transfer söylentileri, soyunma odası atmosferi',
  '5. Motivasyon & Hırs: Şampiyonluk yarışı, küme düşme tehlikesi, kupa hedefi, seri koruma',
  '6. H2H Rekabeti: Son karşılaşma geçmişi, ev/deplasman H2H istatistikleri, gol ortalamaları',
  '7. Gol Üretimi: Maç başına atılan gol ortalaması, şut isabeti, penaltı kazanma oranı',
  '8. Defans Sağlamlığı: Maç başına yenilen gol, clean sheet sayısı, defansif aksiyonlar',
  '9. xG Analizi: Beklenen gol (xG) ve beklenen yenilen gol (xGA) verileri, performans sapması',
  '10. Rotasyon & Yorgunluk: Son maçlar arası gün, hafta içi maç yoğunluğu, kadro rotasyonu',
  '11. Hava & Zemin: Maç günü hava durumu, saha zemini kalitesi, iklim etkisi',
  '12. Teknik Direktör: Taktik tercihler, rakibe karşı tarihsel başarı, oyun felsefesi',
  '13. Finansal Baskı: Kulüp bütçesi, transfer harcamaları, ekonomik baskı ve motivasyon etkisi',
  '14. Kadro Kalitesi: Piyasa değeri karşılaştırması, yıldız oyuncu sayısı, derinlik analizi',
  '15. İstatistik Derinliği: Top hakimiyeti, pas başarısı, ikili mücadele oranları',
  '16. Maç Temposu: Takımların oyun hızı, pres yoğunluğu, kontra atak eğilimi',
  '17. Psikolojik Baskı: Derbi etkisi, seyirci baskısı, kritik maç tecrübesi',
  '18. Disiplin Skoru: Sarı/kırmızı kart ortalamaları, faul sayıları, hakem profili',
  '19. Korner Trendi: Maç başına korner ortalamaları, korner verimi, set piece gücü',
  '20. Taraftar Atmosferi: Stadyum doluluk oranı, taraftar desteği, 12. adam etkisi',
  '21. Oran Hareketleri: Bahis oranlarındaki değişim trendi, piyasa beklentisi',
  '22. Oyuncu Uyumu: Kilit oyuncu kombinasyonları, birlikte oynama süresi, kimya',
  '23. Milli Takım Arası Etkisi: Milli takım arası dönüş, oyuncu yorgunluğu, sakatlık riski',
];

/**
 * Maç verilerini formatlayarak Claude'a gönderilecek prompt oluşturur
 */
const buildAnalysisPrompt = (matches, matchDataMap) => {
  let matchDetails = '';

  for (const match of matches) {
    const data = matchDataMap[match.fixture_id];
    matchDetails += formatMatchData(match, data);
  }

  return `Sen dünya çapında 20+ yıl deneyimli, profesyonel bir futbol analisti, istatistik uzmanı ve bahis stratejistisin. Aşağıdaki kuponda yer alan her maçı 23 farklı kriter üzerinden derinlemesine analiz edecek, 3 farklı risk seviyesinde kupon stratejisi oluşturacak ve detaylı bir yazılı analiz raporu sunacaksın.

SEN KİMSİN:
- Avrupa'nın top 5 ligini, Türk futbolunu ve uluslararası turnuvaları yakından takip eden elit bir analist
- xG, xGA, PPDA, top ilerleme, progresif pas gibi ileri düzey metrikleri kullanan veri bilimci
- Takımların taktik yapılarını, oyun modellerini ve rakibe göre değişen stratejilerini anlayan taktik uzmanı
- Bahis piyasasındaki oran hareketlerinin arkasındaki mantığı okuyan deneyimli bir profesyonel
- Her maç için en olası senaryoyu ve sürpriz ihtimalini hesaplayan risk analisti

═══════════════════════════════════════
KUPON MAÇ LİSTESİ
═══════════════════════════════════════
${matchDetails}

═══════════════════════════════════════
ANALİZ KRİTERLERİ (23 Kriter — Her biri 1-10 puan)
═══════════════════════════════════════
${CRITERIA.join('\n')}

═══════════════════════════════════════
BAHİS TİPLERİ (Seçim Havuzu)
═══════════════════════════════════════
${BET_TYPES.join(', ')}

═══════════════════════════════════════
GÖREV — ÇOK ÖNEMLİ
═══════════════════════════════════════

ADIM 1: Her maç için 23 kriteri tek tek değerlendir. Sahip olduğun güncel futbol bilgisiyle, formasyonları, son transfer haberlerini, sakatlık durumlarını, teknik direktör yaklaşımlarını, takımların sezon hedeflerini ve psikolojik faktörleri göz önünde bulundur.

ADIM 2: Bu değerlendirmeler ışığında 3 farklı risk stratejisi oluştur:

1. DÜŞÜK RİSK (risk_type: "low")
   - En güvenli, en olası sonuçlara odaklan
   - Güçlü formda olan favori takımları tercih et
   - Düşük oran, yüksek tutma olasılığı
   - Hedef güven: %65-85

2. DENGELİ (risk_type: "balanced")
   - Risk ve getiri arasında optimal denge kur
   - Değer bahisleri (value bet) bul — oranların gerçek olasılığın altında olduğu yerleri tespit et
   - Orta düzey oran, makul tutma olasılığı
   - Hedef güven: %45-65

3. YÜKSEK RİSK (risk_type: "high")
   - Yüksek getiri potansiyeli olan cesur seçimler yap
   - Sürpriz potansiyeli taşıyan maçları belirle
   - Alt/Üst gol, korner veya handikap gibi alternatif pazarları değerlendir
   - Hedef güven: %25-45

ADIM 3: Kuponda yer alan her maç için ayrı ayrı detaylı yazılı analiz yaz. Bu analiz, 23 kriteri doğal bir dille açıklayan, maçın gidişatını tahmin eden, olası skor senaryolarını tartışan ve en mantıklı bahis tercihini gerekçelendiren profesyonel düzeyde bir rapor olmalı.

ZORUNLU JSON FORMATI:

\`\`\`json
{
  "strategies": [
    {
      "risk_type": "low",
      "strategy_name": "Güvenli Seçim Kuponu",
      "total_confidence": 72,
      "estimated_odds": 2.8,
      "reasoning": "Bu strateji şu mantıkla oluşturuldu: ...",
      "matches": [
        {
          "fixture_id": 12345,
          "home_team": "Takım A",
          "away_team": "Takım B",
          "selected_bet": "MS 1",
          "odds_estimate": 1.45,
          "confidence": 78,
          "analysis": {
            "key_factors": ["En az 3 güçlü faktör"],
            "risk_factors": ["En az 2 risk faktörü"],
            "criteria_scores": {
              "form": 8,
              "home_advantage": 9,
              "injuries": 6,
              "social_media": 5,
              "motivation": 8,
              "h2h": 7,
              "goals": 7,
              "defense": 8,
              "xg": 7,
              "rotation": 6,
              "weather": 5,
              "coach": 7,
              "financial": 5,
              "squad_quality": 8,
              "stats_depth": 7,
              "tempo": 6,
              "psychology": 7,
              "discipline": 6,
              "corners": 5,
              "fans": 8,
              "odds_movement": 6,
              "player_chemistry": 7,
              "international_break": 5
            },
            "verdict": "En az 2-3 cümlelik özet karar açıklaması"
          }
        }
      ]
    },
    { "risk_type": "balanced", "...": "aynı format" },
    { "risk_type": "high", "...": "aynı format" }
  ],
  "detailed_analysis": "Burada tüm maçlar için uzun, detaylı, doğal dilde yazılmış profesyonel analiz raporu yer alacak. Her maç için ayrı paragraflar halinde yazılacak. Minimum 500 kelime."
}
\`\`\`

KRİTİK KURALLAR:
- Cevabını YALNIZCA yukarıdaki JSON formatında ver, JSON dışında hiçbir metin ekleme
- Her 3 strateji için kuponda yer alan TÜM maçları analiz et — hiçbir maçı atlama
- criteria_scores her zaman 1-10 arası tamsayı puan olsun
- confidence her zaman 0-100 arası tamsayı yüzde olsun
- selected_bet değerleri MUTLAKA bahis tipleri listesinden seçilsin
- key_factors en az 3, risk_factors en az 2 madde içersin
- verdict en az 2-3 cümle olsun
- reasoning her strateji için stratejiyi açıklayan en az 2 cümle olsun
- "detailed_analysis" alanı Türkçe, doğal bir dille yazılmış, her maçı ayrı ayrı analiz eden en az 500 kelimelik profesyonel bir rapor olsun. Paragraflar halinde, başlıklar kullanarak yaz. Her maç için olası skor tahminini de belirt. Sonunda genel kupon değerlendirmesi yap.
- Tüm açıklamalar Türkçe olsun`;

};

/**
 * Tek bir maçın verilerini formatlar (Unified Football Service formatı)
 */
const formatMatchData = (match, data) => {
  let section = `
───────────────────────────────────────
⚽ ${match.home_team} vs ${match.away_team}
📅 ${new Date(match.match_date).toLocaleDateString('tr-TR')} | 🏟️ ${match.league}
🔢 Fixture ID: ${match.fixture_id}
`;

  if (!data) {
    section += '📊 Detaylı veri alınamadı — genel bilgilerle analiz yap\n';
    return section;
  }

  // Fixture details (yeni unified format)
  if (data.fixture) {
    const f = data.fixture;
    if (f.venue) {
      section += `🏟️ Stadyum: ${f.venue}${f.city ? ` (${f.city})` : ''}\n`;
    }
    if (f.importance) {
      section += `🔥 Önem: ${f.importance}\n`;
    }

    // Ev sahibi bilgileri
    if (f.homeTeam) {
      const ht = f.homeTeam;
      section += `\n🏠 Ev Sahibi: ${ht.name}`;
      if (ht.position) section += ` (Sıralama: ${ht.position}.)`;
      section += '\n';
      if (ht.form?.length) section += `   Form: ${ht.form.join('')}\n`;
      if (ht.record) section += `   Rekor: ${ht.record}\n`;
      if (ht.goalsScored != null) section += `   Gol: ${ht.goalsScored} attı / ${ht.goalsConceded} yedi\n`;
    }

    // Deplasman bilgileri
    if (f.awayTeam) {
      const at = f.awayTeam;
      section += `\n✈️ Deplasman: ${at.name}`;
      if (at.position) section += ` (Sıralama: ${at.position}.)`;
      section += '\n';
      if (at.form?.length) section += `   Form: ${at.form.join('')}\n`;
      if (at.record) section += `   Rekor: ${at.record}\n`;
      if (at.goalsScored != null) section += `   Gol: ${at.goalsScored} attı / ${at.goalsConceded} yedi\n`;
    }
  }

  // H2H (yeni unified format)
  if (data.h2h) {
    const h = data.h2h;
    section += `\n📊 H2H: Ev ${h.homeWins}G - ${h.draws}B - ${h.awayWins}G Dep\n`;
    if (h.lastMatches?.length > 0) {
      section += '   Son Karşılaşmalar:\n';
      for (const m of h.lastMatches.slice(0, 5)) {
        const dateStr = m.date ? new Date(m.date).toLocaleDateString('tr-TR') : '?';
        section += `     ${dateStr}: ${m.score}${m.home ? ` (${m.home} vs ${m.away})` : ''}\n`;
      }
    }
  }

  // Standings (puan durumu özet)
  if (data.standings?.length > 0) {
    section += '\n📋 Puan Durumu (İlk 6):\n';
    for (const s of data.standings.slice(0, 6)) {
      section += `   ${s.position}. ${s.teamName} - ${s.points}p (${s.played}m ${s.wins}G ${s.draws}B ${s.losses}M) GF:${s.goalsFor} GA:${s.goalsAgainst}\n`;
    }
  }

  return section;
};

module.exports = { buildAnalysisPrompt, BET_TYPES, CRITERIA };
