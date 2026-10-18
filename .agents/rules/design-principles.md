# Tasarım İlkeleri: Motion, 21st.dev & Emil Kowalski Rehberi

Bu kural belgesi, proje genelindeki tüm arayüz bileşenlerinde Motion, 21st.dev ve Emil Kowalski tasarım mühendisliği standartlarının eksiksiz uygulanmasını sağlar.

---

## 1. Motion & Yay (Spring) Standartları
- **Manyetik Kayan Sekmeler (`layoutId`)**:
  Tab veya sekme gruplarında seçili göstergesi için `layoutId` kullanılır (`type: "spring", stiffness: 450, damping: 32`).
- **Akıcı İçerik Değişimi (`AnimatePresence mode="wait"`)**:
  Sekme, adım ve görünüm geçişlerinde:
  ```tsx
  initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
  exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
  ```
- **Mikro Dokunma & Basış Tepkisi**:
  Tüm interaktif butonlarda: `whileHover={{ scale: 1.02 }}`, `whileTap={{ scale: 0.96 }}` (spring damping: 25).

---

## 2. 21st.dev Tasarım Mimarisi (Katmanlı Lüks Cam)
- **Katman 1 - Ambient Glow Aura**: Arkaya yayılan renk aurası ve radyal ışık.
- **Katman 2 - Kristal Cam Gövde**: `backdrop-filter: blur(20px)`, yarı saydam koyu zemin ve `inset 0 1px 1px rgba(255,255,255,0.12)` iç kontur.
- **Katman 3 - Specular Hairline**: Üst kenardaki 1px ışık kırılması çizgisi (`linear-gradient(90deg, transparent, ...)`).
- **Shimmer Butonlar**: 45 derece kayan ışık hüzmesi efekti ile aksiyona davet.

---

## 3. Emil Kowalski Tasarım Mühendisliği Kuralları
1. **Asla `ease-in` kullanma:** Girişlerde her zaman güçlü `ease-out` `[0.16, 1, 0.3, 1]` veya `spring`.
2. **Asla `scale(0)`'dan başlatma:** Modallar ve açılır paneller her zaman `scale: 0.95, opacity: 0` -> `scale: 1, opacity: 1`.
3. **Fiziksel Dinleme:** Tıklanan elemanlar parmağın/farenin altında hafifçe ezilmelidir (`whileTap={{ scale: 0.96 }}`).
4. **Süre Bütçesi:** Tüm animasyonlar 300ms altında (120ms - 260ms aralığında) kalmalıdır.
5. **Kullanım Sıklığı:** Sık kullanılan tuşlar ve klavye kısayollarında gecikme olmamalıdır.

---

## 4. Responsive & Mobil / Tablet Mimari Standartları (Kritik Kural)
Arayüzdeki her bileşen özellikle aşağıdaki hedef cihazlara ve ekran tiplerine %100 uyumlu olmalıdır:

### 🎯 Birincil Hedef Cihaz Profilleri:
1. **Samsung Galaxy S26 Ultra (Telefon - Mobil Odak)**:
   - **Viewport Genişliği**: 384px - 412px (dikey/portrait).
   - **Ekran Oranı & Yapı**: Uzun dikey en-boy oranı, alt Android hareket/navigasyon çubuğu (gesture bar).
   - **Gereksinimler**:
     - Alt butonlar ve aksiyon çubuklarında Android barı altında kalmaması için `dvh` ve `paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'` zorunludur.
     - Tek başparmakla tek elle erişim: Önemli aksiyonlar (Kaydet, Yazdır, Kapat) ekranın alt 1/3'lük kısmında kolay ulaşılabilir olmalıdır.
     - Izgara düzeni mobilde 1 veya 2 kompakt kolona kusursuz düşmelidir; buton metinleri kırpılmamalı ve yatay taşma (horizontal scroll) kesinlikle sıfır olmalıdır.

2. **Samsung Galaxy Tab A11 / Tab A Serisi (Tablet - POS / Garson Odak)**:
   - **Viewport Genişliği**: ~800px (dikey/portrait) ve ~1280px (yatay/landscape).
   - **Gereksinimler**:
     - Dikey modda 2 kolonlu, yatay modda 3-4 kolonlu dengeli ızgara (grid) yerleşimi.
     - Dokunmatik POS kullanımı için butonlar, masalar ve sekmeler geniş dokunma yüzeyine (`min-height: 44px - 48px`) sahip olmalıdır.
     - Modallar tablet ekranını gereksiz yere tamamen kaplamamalı, `width: min(720px, 94vw)` ile ortalanmış zarif kart görünümünü korumalıdır.

### 📐 Genel Teknik Standartlar:
1. **Dinamik Viewport Yüksekliği (`dvh`)**:
   - Modallar ve tam ekran panellerde mobil tarayıcı adres çubuğu taşmasını önlemek için `maxHeight: '94dvh'` ve fallback `maxHeight: '94vh'` birlikte kullanılmalıdır.
2. **Akışkan Tipografi ve Boşluklandırma (`clamp`)**:
   - Sabit piksel boyutları yerine ekran genişliğine göre akıcı ölçeklenen `clamp()` kullanılmalıdır (örn: `fontSize: 'clamp(12.5px, 2.5vw, 16px)'`, `padding: 'clamp(10px, 2.5vw, 18px)'`).
3. **Kırılmayan ve Taşmayan Grid/Flex Düzeni**:
   - Asla taşma yapacak sabit genişlik (`width: 450px`) verilmemelidir. Bunun yerine `width: 'min(450px, 100%)'` veya `maxWidth: '100%'` kullanılmalıdır.
   - Kart ızgaralarında: `gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))'` kuralı uygulanmalıdır.
   - Başlık, filtre ve buton gruplarında `flexWrap: 'wrap'` ve `gap` kullanılmalıdır.
4. **Dokunmatik Hedef Alanı (Touch Target)**:
   - Mobilde ve dokunmatik POS ekranlarında butonlar ve tıklanabilir ikonlar en az 40-44px fiziksel dokunma alanı sağlamalıdır.
5. **Yatay Kaydırma (Horizontal Overflow) Yasağı**:
   - Modal ve sayfa kök kapsayıcılarında ekran dışına taşma (horizontal scroll) kesinlikle engellenmelidir (`overflowX: 'hidden'`).
   - Tablo veya geniş listeler için tablo içi `overflowX: 'auto'` kapsayıcısı açılmalı, ana çerçeve asla taşmamalıdır.


---

## 5. Kesinlikle Yasaklı İkon / Emojiler
- **`Sparkles` (✨ / Lucide Sparkles)**:
  - Hiçbir buton, başlık, sekme veya bildirimde `Sparkles` ikonu veya parıltı/yıldız emojisi kullanılmayacaktır!
  - Canlı durumlar için `Activity`, `TrendingUp`, `Radio` veya basit metin / nokta göstergeleri tercih edilmelidir.


