# 🔥❄️ Kombi & Klima Servis Takip Programı

Kombi ve klima teknik servis ustaları ve işletmeleri için geliştirilmiş, hızlı, pratik ve mobil uyumlu teknik servis ve müşteri yönetim yazılımı.

---

## 🚀 Hızlı Başlangıç (Nasıl Açılır?)

Bu uygulama hiçbir karmaşık kurulum, sunucu veya veritabanı ayarı gerektirmez.

1. `C:\Users\Pc\.gemini\antigravity\scratch\kombi-klima-servis` klasörünü açın.
2. `index.html` dosyasına çift tıklayın.
3. Uygulama varsayılan internet tarayıcınızda (Google Chrome, Microsoft Edge vb.) anında açılacaktır!

### 💡 Masaüstü Kısayolu Oluşturma (Tek Tıkla Açmak İçin):
- `index.html` dosyasına sağ tıklayın.
- **Gönder > Masaüstü (Kısayol Oluştur)** seçeneğini seçin.
- Artık masaüstünüzdeki kısayola tıklayarak doğrudan uygulamaya girebilirsiniz.

### 📱 Google Chrome / Edge ile Masaüstü Uygulaması Gibi Kullanma:
1. `index.html` dosyasını Chrome veya Edge tarayıcısında açın.
2. Tarayıcının sağ üst köşesindeki üç noktaya (menü) tıklayın.
3. **Uygulamalar (Apps) > Bu siteyi uygulama olarak yükle** (veya Diğer Araçlar > Kısayol Oluştur) seçeneğine tıklayın.
4. Artık bağımsız bir Windows programı penceresi gibi çalışacaktır.

---

## 🌟 Temel Özellikler

1. **Müşteri & Cihaz Yönetimi:**
   - Müşteri adı, telefonu, ilçe/mahalle ve açık adres kaydı.
   - Tek tıkla **Doğrudan Arama**, **WhatsApp Sohbeti Açma** ve **Google Haritalarda Konum Görme**.
   - Müşterinin kombi ve klima cihazlarını marka, model, seri no ve montaj yılıyla kaydetme.
   - Müşterinin tüm eski servis geçmişini tek ekranda görme.

2. **Servis & Arıza Kayıtları (İş Emirleri):**
   - Arıza şikayeti ve hata kodları (Örn: F4 ateşleme arızası, gaz kaçağı, sıcak su dalgalanması, üfleme zayıf vb.).
   - Yapılan işlemler ve değişen yedek parça listesi.
   - İşçilik + Parça ücreti otomatik hesaplama.
   - Kasa ve borç takibi: Tahsil edilen miktar ve kalan alacak.
   - Durum takibi: *Randevu Verildi*, *İşlemde*, *Parça Bekliyor*, *Tamamlandı*, *İptal*.

3. **Resmi Servis Fişi / Makbuz:**
   - Müşteriye vermek için A4 veya fiş formatında resmi servis formu.
   - İşletme başlığı, müşteri bilgisi, cihaz seri no, yapılan işlem dökümü ve garanti şartları.
   - Müşteri imza ve teknisyen kaşe/imza alanı.
   - **Yazdır / PDF Kaydet** butonu ile tek tıkla çıktı alma.

4. **Tek Tıkla WhatsApp Entegrasyonu:**
   - Servis bittiğinde müşteriye tek tıkla hazır formatlı servis bilgi mesajı gönderebilirsiniz.
   - Servis no, yapılan işlemler, toplam tutar ve garanti bilgisi otomatik mesaj formatında hazırlanır.

5. **Yıllık Bakım Hatırlatıcısı:**
   - 1 yılı dolan kombi kış bakımları ve klima yaz bakımları otomatik listelenir.
   - Müşteriye tek tıkla WhatsApp'tan bakım hatırlatma mesajı gönderebilir ve yeni randevu oluşturabilirsiniz.

6. **Kasa & Finans:**
   - Günlük/aylık ciro, tahsil edilen ve müşterilerde kalan toplam borç/alacak takibi.

7. **Yedekleme & Güvenlik:**
   - Tüm kayıtlarınızı **Ayarlar & Yedek** sekmesinden tek tuşla bilgisayarınıza dosya (.json) olarak indirebilir, istediğiniz zaman geri yükleyebilirsiniz.

---

## 🛠️ Klasör Yapısı

- `index.html` — Uygulamanın ana ekranı, formlar ve yazdırma şablonu.
- `app.js` — Veritabanı (LocalStorage), hesaplamalar, WhatsApp ve filtreleme mantığı.
- `style.css` — Yazıcı (baskı) formatı ve görsel stiller.
- `mock-data.js` — İlk açılış için örnek gerçekçi kombi/klima kayıtları.
