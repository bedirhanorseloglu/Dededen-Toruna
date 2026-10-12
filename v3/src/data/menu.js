// Dededen Toruna - Menü Verisi ve Kategori Tanımları
export const MENU_CATEGORIES = [
    { id: "kahvalti", name: "Kahvaltılar", sort: 10, icon: "🍳" },
    { id: "tost", name: "Tost Çeşitleri", sort: 20, icon: "🥪" },
    { id: "gozleme", name: "Gözleme Çeşitleri", sort: 30, icon: "🥟" },
    { id: "tavuk", name: "Tavuk Çeşitleri", sort: 40, icon: "🍗" },
    { id: "et", name: "Et Çeşitleri", sort: 50, icon: "🥩" },
    { id: "hamburger", name: "Hamburger", sort: 60, icon: "🍔" },
    { id: "makarna", name: "Makarnalar", sort: 70, icon: "🍝" },
    { id: "salata", name: "Salatalar", sort: 80, icon: "🥗" },
    { id: "gunun-menusu", name: "Günün Menüsü", sort: 90, icon: "🍲" },
    { id: "tatlilar", name: "Tatlılar", sort: 100, icon: "🍮" },
    { id: "icecekler", name: "İçecekler", sort: 110, icon: "🥤" }
];

export const MENU_PRODUCTS = [
    // 1. Kahvaltılar
    { id: "p1", category_id: "kahvalti", name: "Serpme Kahvaltı", price: 1200, active: true },
    { id: "p2", category_id: "kahvalti", name: "Kahvaltı Tabağı", price: 450, active: true },
    { id: "p3", category_id: "kahvalti", name: "Menemen", price: 250, active: true },
    { id: "p4", category_id: "kahvalti", name: "Kuymak", price: 300, active: true },
    { id: "p5", category_id: "kahvalti", name: "Kaygana", price: 200, active: true },
    { id: "p6", category_id: "kahvalti", name: "Sahanda Yumurta", price: 200, active: true },
    { id: "p7", category_id: "kahvalti", name: "Sucuklu Yumurta", price: 250, active: true },
    { id: "p8", category_id: "kahvalti", name: "Peynirli Omlet", price: 250, active: true },
    { id: "p9", category_id: "kahvalti", name: "Omlet", price: 150, active: true },
    { id: "p10", category_id: "kahvalti", name: "Sigara Böreği", price: 200, active: true },

    // 2. Tost Çeşitleri
    { id: "p11", category_id: "tost", name: "Karışık Tost", price: 260, active: true },
    { id: "p12", category_id: "tost", name: "Kaşarlı Tost", price: 250, active: true },
    { id: "p13", category_id: "tost", name: "Sucuklu Tost", price: 260, active: true },
    { id: "p14", category_id: "tost", name: "Akdeniz Tost", price: 250, active: true },
    { id: "p15", category_id: "tost", name: "Tost Burger", price: 270, active: true },

    // 3. Gözleme Çeşitleri
    { id: "p16", category_id: "gozleme", name: "Peynirli Gözleme", price: 320, active: true },
    { id: "p17", category_id: "gozleme", name: "Karışık Gözleme", price: 340, active: true },
    { id: "p18", category_id: "gozleme", name: "Patatesli Gözleme", price: 320, active: true },

    // 4. Tavuk Çeşitleri
    { id: "p27", category_id: "tavuk", name: "Tavuk Sote", price: 400, active: true },
    { id: "p28", category_id: "tavuk", name: "Mantarlı Tavuk Sote", price: 400, active: true },
    { id: "p29", category_id: "tavuk", name: "Tavuk Izgara", price: 400, active: true },
    { id: "p30", category_id: "tavuk", name: "Şinitzel", price: 400, active: true },
    { id: "p31", category_id: "tavuk", name: "K. Mantar Soslu Şinitzel", price: 420, active: true },
    { id: "p32", category_id: "tavuk", name: "Tavuk Wrap", price: 420, active: true },
    { id: "p33", category_id: "tavuk", name: "Soya Soslu Piliç", price: 400, active: true },
    { id: "p34", category_id: "tavuk", name: "Köri Soslu Tavuk", price: 420, active: true },

    // 5. Et Çeşitleri
    { id: "p23", category_id: "et", name: "Sac Kavurma", price: 550, active: true },
    { id: "p24", category_id: "et", name: "Köfte", price: 500, active: true },
    { id: "p25", category_id: "et", name: "Et Sote", price: 550, active: true },
    { id: "p26", category_id: "et", name: "Et Wrap", price: 550, active: true },

    // 6. Hamburger
    { id: "p19", category_id: "hamburger", name: "Hamburger", price: 300, active: true },
    { id: "p20", category_id: "hamburger", name: "Cheese Burger", price: 320, active: true },
    { id: "p21", category_id: "hamburger", name: "Chicken Burger", price: 275, active: true },
    { id: "p22", category_id: "hamburger", name: "Cips", price: 200, active: true },

    // 7. Makarnalar
    { id: "p35", category_id: "makarna", name: "Fettucine Bolognese", price: 380, active: true },
    { id: "p36", category_id: "makarna", name: "Fettucine Napoletana", price: 350, active: true },
    { id: "p37", category_id: "makarna", name: "Fettucine Alfredo", price: 360, active: true },

    // 8. Salatalar
    { id: "p38", category_id: "salata", name: "Mevsim Salata", price: 250, active: true },
    { id: "p39", category_id: "salata", name: "Akdeniz Salata", price: 320, active: true },
    { id: "p40", category_id: "salata", name: "Sezar Salata", price: 360, active: true },
    { id: "p41", category_id: "salata", name: "Ton Balıklı Salata", price: 360, active: true },

    // 9. Günün Menüsü
    { id: "p42", category_id: "gunun-menusu", name: "Günün Çorbası", price: 100, active: true },
    { id: "p43", category_id: "gunun-menusu", name: "Günün Menüsü", price: 300, active: true },

    // 10. Tatlılar (Müşteri Kuralı: Doğrudan tezgahtan verilir, mutfak fişine gitmez)
    { id: "p44", category_id: "tatlilar", name: "Hamsiköy Sütlaç", price: 120, active: true },
    { id: "p45", category_id: "tatlilar", name: "Dondurmalı Sütlaç", price: 170, active: true },
    { id: "p46", category_id: "tatlilar", name: "Meyveli Sütlaç", price: 170, active: true },
    { id: "p47", category_id: "tatlilar", name: "Ballı Sütlaç", price: 170, active: true },
    { id: "p48", category_id: "tatlilar", name: "Atom Sütlaç", price: 290, active: true },
    { id: "p49", category_id: "tatlilar", name: "Kadayıf", price: 200, active: true },
    { id: "p50", category_id: "tatlilar", name: "Kadayıf + Sütlaç", price: 220, active: true },
    { id: "p51", category_id: "tatlilar", name: "Kadayıf + Dondurma", price: 250, active: true },
    { id: "p52", category_id: "tatlilar", name: "Dondurma", price: 50, active: true },

    // 11. İçecekler (Müşteri Kuralı: Doğrudan verilir, mutfak fişine gitmez)
    { id: "p53", category_id: "icecekler", name: "Çay", price: 30, active: true },
    { id: "p54", category_id: "icecekler", name: "Fincan Çay", price: 50, active: true },
    { id: "p55", category_id: "icecekler", name: "Semaver Çay", price: 300, active: true },
    { id: "p56", category_id: "icecekler", name: "Türk Kahvesi", price: 100, active: true },
    { id: "p57", category_id: "icecekler", name: "Nescafe", price: 150, active: true },
    { id: "p58", category_id: "icecekler", name: "Bitki Çayı", price: 150, active: true },
    { id: "p59", category_id: "icecekler", name: "Salep", price: 150, active: true },
    { id: "p60", category_id: "icecekler", name: "Sıcak Çikolata", price: 150, active: true },
    { id: "p61", category_id: "icecekler", name: "Su", price: 25, active: true },
    { id: "p62", category_id: "icecekler", name: "Soda", price: 60, active: true },
    { id: "p63", category_id: "icecekler", name: "Ayran", price: 60, active: true },
    { id: "p64", category_id: "icecekler", name: "Kola", price: 80, active: true },
    { id: "p65", category_id: "icecekler", name: "Fanta", price: 80, active: true },
    { id: "p66", category_id: "icecekler", name: "Meyve Suyu", price: 80, active: true }
];

// 17 Masa Tanımı
export const DEFAULT_TABLES = Array.from({ length: 17 }, (_, i) => ({
    id: String(i + 1),
    table_no: i + 1,
    active: true
}));

export function formatMoney(val) {
    const num = Number(val) || 0;
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

export function getProductCategoryId(product) {
    if (!product) return 'kahvalti';
    if (product.category_id) return product.category_id;
    const name = (product.name || '').toLocaleLowerCase('tr-TR');
    
    // Sıcak mutfak ürünleri
    if (name.includes('tost')) return 'tost';
    if (name.includes('gözleme')) return 'gozleme';
    if (name.includes('burger') || name.includes('cips')) return 'hamburger';
    if (name.includes('tavuk') || name.includes('şinitzel') || name.includes('piliç')) return 'tavuk';
    if (name.includes('sac kavurma') || name.includes('köfte') || name.includes('et sote') || name.includes('et wrap') || name.includes('kavurma')) return 'et';
    if (name.includes('fettucine') || name.includes('makarna')) return 'makarna';
    if (name.includes('salata')) return 'salata';
    if (name.includes('günün') || name.includes('çorba')) return 'gunun-menusu';
    if (name.includes('kahvaltı') || name.includes('menemen') || name.includes('kuymak') || name.includes('kaygana') || 
        name.includes('yumurta') || name.includes('omlet') || name.includes('börek') || name.includes('sucuk')) return 'kahvalti';

    // Tatlılar (Tezgah)
    if (name.includes('sütlaç') || name.includes('kadayıf') || name.includes('dondurma') || name.includes('atom')) return 'tatlilar';

    // İçecekler (Tezgah) - DİKKAT: 'su' kelimesi tam kelime eşleşmeli, 'sucuk' vb. kelimelerle karışmamalıdır!
    if (name.includes('çay') || name.includes('kahve') || name.includes('nescafe') || name.includes('salep') || 
        name.includes('çikolata') || name.includes('soda') || name.includes('ayran') || 
        name.includes('cola') || name.includes('kola') || name.includes('fanta') || name.includes('meyve suyu') || name.includes('semaver') ||
        name === 'su' || /(^|\s)su(\s|$)/.test(name)) return 'icecekler';

    return 'kahvalti';
}

/**
 * Müşteri Kuralı: Yalnızca tatlı ve içecek kategorisi direkt tezgahtan verilir.
 * Tost, yumurta, sucuk, köfte gibi sıcak mutfak ürünleri ASLA tezgah olamaz, mutfakta hazırlanır!
 */
export function isInstantDeliveryCategory(categoryId, productName = '') {
    // 1) Eğer kategori doğrudan mutfak kategorisi ise kesinlikle TEZGAH DEĞİLDİR:
    const kitchenCategories = ['kahvalti', 'tost', 'gozleme', 'tavuk', 'et', 'hamburger', 'makarna', 'salata', 'gunun-menusu'];
    if (categoryId && kitchenCategories.includes(categoryId)) {
        return false;
    }

    // 2) Eğer kategori tatlılar veya içecekler ise doğrudan tezgahtan verilir:
    if (categoryId === 'tatlilar' || categoryId === 'icecekler') {
        return true;
    }

    // 3) Kategori belirtilmemişse ürün adına göre kontrol:
    const lower = (productName || '').toLocaleLowerCase('tr-TR').trim();
    if (!lower) return false;

    // Sıcak mutfak ürünleri (sucuk, tost, yumurta vb.) kesinlikle mutfaktır
    if (lower.includes('sucuk') || lower.includes('tost') || lower.includes('yumurta') || 
        lower.includes('omlet') || lower.includes('menemen') || lower.includes('kuymak') || 
        lower.includes('kaygana') || lower.includes('börek') || lower.includes('köfte') || 
        lower.includes('tavuk') || lower.includes('burger') || lower.includes('gözleme') || 
        lower.includes('kavurma') || lower.includes('makarna') || lower.includes('salata')) {
        return false;
    }

    // Tatlılar
    if (lower.includes('sütlaç') || lower.includes('kadayıf') || lower.includes('dondurma') || lower.includes('atom')) {
        return true;
    }

    // İçecekler (su kontrolü kelime bazlı, sucuklu ile ASLA eşleşmemeli!)
    if (lower.includes('çay') || lower.includes('kahve') || lower.includes('nescafe') || 
        lower.includes('salep') || lower.includes('çikolata') || lower.includes('soda') || 
        lower.includes('cola') || lower.includes('kola') || lower.includes('fanta') || lower.includes('ayran') || 
        lower.includes('meyve suyu') || lower.includes('semaver') ||
        lower === 'su' || /(^|\s)su(\s|$)/.test(lower)) {
        return true;
    }

    return false;
}
