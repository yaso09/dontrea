# 🛡️ Dontrea

**Dontrea**, web tabanlı uygulamalarınızı, oyunlarınızı ve JavaScript kaynak kodlarınızı tersine mühendisliğe (reverse engineering) ve korsanlığa (piracy) karşı korumak için geliştirilmiş, **Denuvo** mantığıyla çalışan agresif bir güvenlik ve pipeline otomasyon aracıdır.

## 🚀 Çalışma Anatomisi

Dontrea, kaynak kodunuzu korumak için 5 katmanlı sarmal bir mimari kullanır:

1. **JS Extraction:** Hedef HTML içerisindeki tüm inline `<script>` bloklarını ayıklar.
2. **Advanced Obfuscation:** Ayıklanan JavaScript'i kontrol akışı düzleştirme, ölü kod enjeksiyonu ve anti-devtools tuzaklarıyla anlamsal olarak tanınmaz hale getirir.
3. **JS-to-Wasm Compilation:** Karıştırılan JavaScript kodunu **Porffor AOT derleyicisi** kullanarak tarayıcının doğrudan işlemci seviyesinde çalıştıracağı bir WebAssembly (`.wasm`) binary array'ine dönüştürür.
4. **Denuvo-style Code Distribution:** Üretilen şifreli byte verilerini belirlediğiniz sayıda parçaya böler ve HTML içindeki rastgele üretilmiş `id` ve `data-*` niteliklerine sahip gizli elementlerin (`div`, `span`, `p`) içerisine serpiştirir.
5. **HTML Minification & Final Lock:** Kodları runtime'da birleştiren bootstrap yükleyiciyi ekledikten sonra tüm HTML dosyasını minify ederek tek satırlık aşırı karmaşık bir yapıya dönüştürür.

---

## 📦 Kurulum

Proje dizininde bağımlılıkları yüklemek ve `dontrea` komutunu terminalinize tanımlamak için:

```bash
# Bağımlılıkları yükleyin
npm install

# Komut satırına global olarak bağlayın
npm link
```

---

## 🛠️ Kullanım ve Parametreler

Sistemi en temel düzeyde çalıştırmak için:

```bash
dontrea --input index.html --output dist/protected.html --parts 8
```

### Tüm Parametre Listesi

| Parametre | Kısa Yol | Varsayılan | Açıklama |
| :--- | :--- | :--- | :--- |
| `--input` | `-i` | *Zorunlu* | Şifrelenecek kaynak HTML dosyasının yolu. |
| `--output` | `-o` | `protected.html` | Çıktı olarak üretilecek korumalı HTML dosyasının yolu. |
| `--parts` | `-p` | `5` | Kodun HTML içerisine kaç parçaya bölünerek dağıtılacağı. |
| `--control-flow-flattening` | - | `false` | Kod akış karmaşıklığını açar (Performansı etkileyebilir). |
| `--control-flow-flattening-threshold` | - | `0.75` | Akış düzleştirme uygulanma olasılık oranı (0.0 - 1.0). |
| `--dead-code-injection` | - | `false` | Kodun arasına çalışmayan sahte/ölü kodlar ekler. |
| `--debug-protection` | - | `false` | F12 / Geliştirici araçları açıldığında tarayıcıyı kilitler. |
| `--debug-protection-interval` | - | `2000` | Anti-DevTools tarama sıklığı (milisaniye cinsinden). |
| `--self-defending` | - | `false` | Kod beautify edilirse (biçimlendirilirse) kendini kilitler. |
| `--domain-lock` | - | - | Kodun sadece belirli alan adlarında çalışmasını sağlar (örn: `site.com`). |

### Maksimum Güvenlik Örneği (Agresif Mod)

```bash
dontrea -i index.html -o target.html -p 12   --control-flow-flattening true   --control-flow-flattening-threshold 1.0   --dead-code-injection true   --debug-protection true   --debug-protection-interval 1000   --self-defending true   --domain-lock orneksite.com www.orneksite.com
```

---

## ⚠️ Önemli Notlar (Savunma Perspektifi)

* **DOM Kısıtlamaları:** Porffor derleyicisi deneysel aşamadadır. Yoğun pencere ve DOM manipülasyonu yapan JS kodlarında derleme hatası verirse, `dontrea` otomatik olarak güvenli moda (Safe-Fallback) geçer. Bu modda kodunuz Wasm yerine maksimum ayarlarda obfuscate edilmiş JS string'i olarak parçalanır ve korunur.
* **Performans Dengesi:** `--control-flow-flattening` ve `--dead-code-injection` özellikleri işlemci maliyetini artırır. Çok büyük web projelerinde sadece kritik iş/lisans lojiklerinizi bu araca beslemeniz önerilir.
