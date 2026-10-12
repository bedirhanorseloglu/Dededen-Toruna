import React, { useState } from 'react';
import { 
    Printer, 
    Wifi, 
    CheckCircle2, 
    AlertCircle, 
    Save, 
    Play, 
    Radio, 
    HelpCircle, 
    Server, 
    Zap,
    Monitor,
    Layers,
    ArrowRight
} from 'lucide-react';

export default function AdminPrinterSettings({
    printerSettings,
    savePrinterSettings,
    handleTestPrintTicket,
    showToast
}) {
    const [ipInput, setIpInput] = useState(printerSettings?.ip || '');
    const [portInput, setPortInput] = useState(printerSettings?.port || '9100');
    const [modeInput, setModeInput] = useState(printerSettings?.mode || 'rawbt');
    const [autoPrint, setAutoPrint] = useState(printerSettings?.autoPrintKitchen !== false);
    const [isSaving, setIsSaving] = useState(false);

    const hasConfiguredIp = !!ipInput.trim();

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            await savePrinterSettings({
                ip: ipInput.trim(),
                port: portInput.trim() || '9100',
                mode: modeInput,
                autoPrintKitchen: autoPrint,
                paperWidth: '80mm',
                printerName: 'Xprinter XP-Q805K Mutfak'
            });
            showToast('Yazıcı ayarları başarıyla kaydedildi ve tüm cihazlara uygulandı!', 'success');
        } catch (err) {
            console.error(err);
            showToast('Yazıcı ayarları kaydedilirken hata oluştu.', 'danger');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Üst Canlı Durum Kartı (Live Status Banner) */}
            <div style={{
                background: hasConfiguredIp 
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.8))'
                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(15, 23, 42, 0.8))',
                border: hasConfiguredIp 
                    ? '1px solid rgba(16, 185, 129, 0.35)'
                    : '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: 'var(--radius-lg)',
                padding: '22px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: 'var(--shadow-soft)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: hasConfiguredIp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        border: `1px solid ${hasConfiguredIp ? '#10b981' : 'var(--brand-gold)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: hasConfiguredIp ? '#10b981' : 'var(--brand-gold)'
                    }}>
                        <Printer size={26} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: 'white' }}>
                                Merkezi Mutfak Termal Yazıcısı
                            </h2>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: hasConfiguredIp ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                                color: hasConfiguredIp ? '#10b981' : 'var(--brand-gold)',
                                border: `1px solid ${hasConfiguredIp ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                            }}>
                                {hasConfiguredIp ? '● AĞ BAĞLANTISI HAZIR' : '○ IP BEKLENİYOR'}
                            </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                            Buraya girilen IP adresi tüm garson tablet ve telefonlarına <strong>anında ve otomatik olarak dağıtılır</strong>.
                        </p>
                    </div>
                </div>

                <div style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: hasConfiguredIp ? '#38bdf8' : 'var(--text-muted)'
                }}>
                    {hasConfiguredIp ? `${ipInput}:${portInput}` : 'Henüz IP Kayıtlı Değil'}
                </div>
            </div>

            {/* Bağlantı Parametreleri Form Kartı */}
            <form onSubmit={handleSave} style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                boxShadow: 'var(--shadow-soft)',
                display: 'flex',
                flexDirection: 'column',
                gap: '22px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-card)', paddingBottom: '14px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Wifi size={18} className="text-amber-400" />
                        Bağlantı & Ağ Parametreleri
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ESC/POS 80mm Standart</span>
                </div>

                {/* IP & Port Giriş Alanları */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '16px'
                }}>
                    {/* IP Adresi */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Mutfak Yazıcısı IP Adresi:
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                value={ipInput}
                                onChange={(e) => setIpInput(e.target.value)}
                                placeholder="Örn: 192.168.1.199"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px 12px 40px',
                                    background: 'var(--bg-surface-elevated)',
                                    border: '1px solid var(--border-card)',
                                    borderRadius: 'var(--radius-md)',
                                    color: '#38bdf8',
                                    fontFamily: 'monospace',
                                    fontSize: '15px',
                                    fontWeight: 800
                                }}
                            />
                            <Server size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                            Modeminizin yazıcıya atadığı yerel ağ IP adresi (Xprinter vb.).
                        </span>
                    </div>

                    {/* Port */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Port Numarası (Varsayılan 9100):
                        </label>
                        <input
                            type="text"
                            value={portInput}
                            onChange={(e) => setPortInput(e.target.value)}
                            placeholder="9100"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: 'var(--bg-surface-elevated)',
                                border: '1px solid var(--border-card)',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                fontFamily: 'monospace',
                                fontSize: '15px',
                                fontWeight: 800
                            }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                            Termal fiş yazıcılarının standart RAW ESC/POS portu 9100'dür.
                        </span>
                    </div>
                </div>

                {/* Otomatik Baskı Switch */}
                <div style={{
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    cursor: 'pointer'
                }} onClick={() => setAutoPrint(!autoPrint)}>
                    <div>
                        <div style={{ fontWeight: 800, color: 'white', fontSize: '14px' }}>
                            Otomatik Mutfak Fişi Çıktısı
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Garson sipariş onayladığında mutfak fişi otomatik olarak termal yazıcıya gönderilsin.
                        </div>
                    </div>
                    <div style={{
                        width: '46px',
                        height: '26px',
                        borderRadius: '99px',
                        background: autoPrint ? '#10b981' : 'rgba(255, 255, 255, 0.15)',
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                    }}>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'white',
                            position: 'absolute',
                            top: '3px',
                            left: autoPrint ? '23px' : '3px',
                            transition: 'all 0.2s ease'
                        }} />
                    </div>
                </div>

                {/* Yazdırma Modu Seçim Kartları */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Yazdırma Entegrasyon Modu:
                    </label>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: '12px'
                    }}>
                        {/* 1. Direkt Ağ / RawBT Modu */}
                        <div
                            onClick={() => setModeInput('rawbt')}
                            style={{
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                border: modeInput === 'rawbt' ? '2px solid #10b981' : '1px solid var(--border-card)',
                                background: modeInput === 'rawbt' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface-elevated)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontWeight: 800, color: modeInput === 'rawbt' ? '#10b981' : 'white', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Zap size={16} /> Direkt Baskı (Önerilen)
                                </span>
                                {modeInput === 'rawbt' && <CheckCircle2 size={16} color="#10b981" />}
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                                Yeni sekme veya önizleme açılmaz. Fiş sessizce doğrudan termal yazıcıdan fırlar.
                            </p>
                        </div>

                        {/* 2. Sistem Penceresi Modu */}
                        <div
                            onClick={() => setModeInput('browser')}
                            style={{
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                border: modeInput === 'browser' ? '2px solid #3b82f6' : '1px solid var(--border-card)',
                                background: modeInput === 'browser' ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface-elevated)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontWeight: 800, color: modeInput === 'browser' ? '#3b82f6' : 'white', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Monitor size={16} /> Sistem Yazdırma Penceresi
                                </span>
                                {modeInput === 'browser' && <CheckCircle2 size={16} color="#3b82f6" />}
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                                Cihazın standart yazdırma diyaloğu açılır. Bilgisayardan USB yazıcıyla basıyorsanız kullanın.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Aksiyon Butonları */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--border-card)'
                }}>
                    <button
                        type="button"
                        onClick={handleTestPrintTicket}
                        className="btn-outline"
                        style={{
                            padding: '12px 18px',
                            fontSize: '13px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#38bdf8',
                            borderColor: 'rgba(56, 189, 248, 0.4)'
                        }}
                    >
                        <Play size={15} />
                        Deneme / Test Fişi Bas
                    </button>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="btn-primary"
                        style={{
                            padding: '12px 24px',
                            fontSize: '14px',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
                        }}
                    >
                        <Save size={16} />
                        {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet ve Tüm Cihazlara Uygula'}
                    </button>
                </div>
            </form>

            {/* Adım Adım Kurulum Rehberi */}
            <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                boxShadow: 'var(--shadow-soft)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold)' }}>
                        <HelpCircle size={18} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'white' }}>
                            Adım Adım Kurulum Rehberi (Xprinter XP-Q805K)
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                            Yazıcı elinize ulaştığında 2 dakikada bağlantıyı kurma rehberi
                        </p>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '14px'
                }}>
                    {/* Adım 1 */}
                    <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900 }}>1</span>
                            <span style={{ fontWeight: 800, color: 'white', fontSize: '13px' }}>Kablo Bağlantısı</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                            Yazıcıyı mutfağa yerleştirin, güç adaptörünü prize takın ve Ethernet (LAN) kablosunu restoranınızın modemine bağlayın.
                        </p>
                    </div>

                    {/* Adım 2 */}
                    <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--brand-gold)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900 }}>2</span>
                            <span style={{ fontWeight: 800, color: 'white', fontSize: '13px' }}>IP Adresi (Self-Test)</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                            Yazıcı kapalıyken <strong>FEED tuşuna basılı tutarak</strong> açma düğmesini açın. 3 saniye sonra bırakın; test fişinde <code>IP: 192.168.1.xxx</code> yazar.
                        </p>
                    </div>

                    {/* Adım 3 */}
                    <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900 }}>3</span>
                            <span style={{ fontWeight: 800, color: 'white', fontSize: '13px' }}>Sisteme Kaydet</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                            Fişte çıkan IP'yi yukarıdaki <strong>IP Adresi</strong> alanına yazıp yeşil <strong>"Ayarları Kaydet"</strong> butonuna basın.
                        </p>
                    </div>

                    {/* Adım 4 */}
                    <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900 }}>4</span>
                            <span style={{ fontWeight: 800, color: 'white', fontSize: '13px' }}>Kusursuz Otomasyon</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                            Artık hiçbir garson tabletinde IP girmenize gerek yoktur. Sipariş verildiği an mutfak yazıcısı tıkır tıkır fiş basar!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
