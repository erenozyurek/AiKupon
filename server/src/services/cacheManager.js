/**
 * Gelişmiş önbellekleme yöneticisi
 * TTL bazlı in-memory cache + fallback desteği
 */
class CacheManager {
  constructor() {
    this.store = new Map();
    // Fallback: Son başarılı verileri saklayarak API çöktüğünde kullanır
    this.fallbackStore = new Map();
  }

  /**
   * Cache key oluştur
   * @param {string} source - Kaynak (espn, football-data)
   * @param {string} endpoint - Endpoint adı
   * @param {object|string} params - Parametreler
   */
  key(source, endpoint, params = '') {
    const paramStr = typeof params === 'object' ? JSON.stringify(params) : params;
    return `${source}:${endpoint}:${paramStr}`;
  }

  get(cacheKey) {
    const entry = this.store.get(cacheKey);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(cacheKey);
      return null;
    }
    return entry.value;
  }

  set(cacheKey, value, ttlSeconds) {
    this.store.set(cacheKey, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
    // Fallback store'a da kaydet (TTL yok, her zaman mevcut)
    this.fallbackStore.set(cacheKey, value);
  }

  /**
   * Fallback verisini döndür (cache expired veya API down olduğunda)
   */
  getFallback(cacheKey) {
    return this.fallbackStore.get(cacheKey) || null;
  }

  delete(cacheKey) {
    this.store.delete(cacheKey);
  }

  clear() {
    this.store.clear();
  }
}

// TTL sabitleri (saniye)
const CACHE_TTL = {
  FIXTURES: 1800,     // 30 dakika
  STANDINGS: 3600,    // 1 saat
  H2H: 86400,         // 24 saat
  LEAGUES: 86400,     // 24 saat
  EVENT_DETAIL: 1800, // 30 dakika
};

const cacheManager = new CacheManager();

module.exports = { cacheManager, CACHE_TTL };
