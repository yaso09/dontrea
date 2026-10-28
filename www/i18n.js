(() => {
  const copy = {
    tr: {
      title: 'Dontrea — Web kodunu koru',
      description: 'Dontrea, web uygulamalarındaki satır içi JavaScript kodunu dönüştürüp HTML çıktınıza yerleştiren bir komut satırı aracıdır.',
      languageLabel: 'Dil', footerCredit: 'by <a href="https://yasireymen.com" target="_blank" rel="noreferrer">Yasir Eymen</a>',
      homeNav: 'Canlı demoyu görün <span>↗</span>', demoButton: 'Canlı demoyu görün <span>↗</span>',
      heroTitle: 'Kodunuz sizin.<br><span>Kontrolü de öyle.</span>',
      copyLabel: 'npm i -g github:yaso09/dontrea komutunu kopyala', copied: 'Kopyalandı', copyFailed: 'Kopyalanamadı',
      lead: 'Dontrea, web uygulamanızdaki satır içi JavaScript’i dönüştürür, parçalara ayırır ve tek bir HTML çıktısına yerleştirir. Üretim öncesi koruma akışınızı tek komutla çalıştırın.',
      openSource: 'AÇIK KAYNAK', mit: 'MIT LİSANSI',
      demoLabel: 'DONTREA / UÇTAN UCA', demoTitle: 'Kurulumdan<br><em>korunan çıktıya.</em>', demoIntro: 'Komutları ve koruma seçeneklerini, terminalde adım adım izleyin.',
      demoAria: 'Dontrea kurulum ve özellik anlatımı',
      demoLabels: ['KURULUM / GEREKSİNİMLER', 'TEK DOSYA', 'PROJE YAPILANDIRMASI', 'JAVASCRIPT KORUMASI', 'WASM / SAFE-FALLBACK', 'PAKETLEME / ÇIKTI'],
      demoTitles: ['Önce çalışma<br>ortamını hazırlayın.', 'Kaynağı seçin,<br>çıktıyı belirleyin.', 'Birden fazla sayfayı<br>tek seferde derleyin.', 'Koruma katmanlarını<br>ihtiyacınıza göre seçin.', 'Motor çalışma<br>kodunuza uyum sağlar.', 'Tek HTML dosyası,<br>dağıtıma hazır.'],
      demoCopy: [
        'Dontrea, Node.js 18 veya üzeriyle çalışır. Projeyi klonlayıp bağımlılıkları kurun; <code>npm link</code> komutuyla <code>dontrea</code> komutunu terminalden erişilebilir yapın. WebAssembly derlemesi için Javy isteğe bağlıdır.',
        '<code>-i</code> giriş HTML’ini, <code>-o</code> korunan çıktı yolunu belirtir. <code>-p</code> payload’ı kaç gizli parçaya böleceğini ayarlar. Komut satırı parametreleriyle tek sayfayı hemen derleyebilirsiniz.',
        '<code>dontrea config add</code>, dosya başına giriş, çıktı ve koruma ayarlarını <code>dontrea.json</code> içine kaydeder. Yapılandırma yoksa oluşturur. Sonra <code>dontrea build</code> listedeki bütün HTML dosyalarını sırayla işler.',
        'Kontrol akışı düzleştirme, ölü kod enjeksiyonu, self-defending ve geliştirici aracı korumasını açın. <code>--domain-lock</code> ile kodun çalışacağı alan adlarını sınırlayın; parçalama sayısını ve eşikleri ayarlayın.',
        'Javy kullanılabiliyorsa Dontrea JavaScript’i WebAssembly’e derleyebilir. Canvas ve ses gibi tarayıcı API’lerini saptadığında otomatik olarak Safe-Fallback JS modunu seçer. İsterseniz <code>--force-wasm</code> ile derlemeyi zorlayın ya da <code>--no-wasm</code> ile Wasm’ı kapatın.',
        'Dontrea kodu HTML içine parçalı olarak yerleştirir ve yapıyı sıkıştırır. <code>--dynamic</code> Javy’nin dinamik sağlayıcısını seçer; <code>--wasm-binary</code> önceden derlenmiş bir Wasm dosyasını gömer. Sonuç, belirlediğiniz konuma yazılan tek HTML çıktısıdır.'
      ],
      setupTerminal: 'TERMINAL — KURULUM', singleTerminal: 'TERMINAL — TEK DOSYA', projectTerminal: 'TERMINAL — PROJE DERLEMESİ', shieldTerminal: 'TERMINAL — KOD KORUMASI', runtimeTerminal: 'TERMINAL — ÇALIŞMA MODU', outputTerminal: 'TERMINAL — ÇIKTI',
      installAria: 'Dontrea kurulum komutları', singleAria: 'Tek HTML dosyasını koruma terminal örneği', configAria: 'dontrea.json oluşturma ve toplu derleme terminal örneği', obfuscationAria: 'JavaScript koruma seçenekleri terminal örneği', runtimeAria: 'Wasm ve Safe-Fallback çalışma modları terminal örneği', outputAria: 'Wasm seçenekleri ve korunan çıktı terminal örneği',
      ctaLabel: 'DONTREA / PLAYGROUND', ctaTitle: 'Kendi HTML’inizde<br><em>hemen deneyin.</em>', ctaCopy: 'Bir HTML dosyası yükleyin. Dontrea’nın WebAssembly çekirdeği satır içi JavaScript’i tarayıcınızda dönüştürsün.', ctaButton: 'Playground’u aç <span>↗</span>',
      footerHome: 'Yasireymen.com ana sayfa',
      playgroundTitle: 'Playground — Dontrea', playgroundDescription: 'Dontrea Playground ile HTML dosyanızdaki satır içi JavaScript’i tarayıcınızda WebAssembly kullanarak dönüştürün.',
      homeLabel: 'Dontrea ana sayfa', back: '← Ana sayfaya dön', pageTitle: 'Korumanızı<br><em>burada deneyin.</em>',
      pageIntro: 'HTML dosyanızı seçin; satır içi JavaScript, Dontrea’nın WebAssembly çekirdeği tarafından tarayıcınızda dönüştürülsün. Dosyanız hiçbir sunucuya yüklenmez.',
      workbench: 'HTML koruma playground’ı', chooseFile: 'DOSYANIZI SEÇİN', engineTag: 'LOCAL / WEBASSEMBLY', dropFile: 'HTML dosyanızı buraya bırakın', browse: 'veya göz atmak için tıklayın · HTML / HTM',
      options: 'Koruma seçenekleri', parts: 'Payload parçaları', domain: 'Alan adı kilidi <small>(isteğe bağlı)</small>', control: 'Kontrol akışı düzleştirme', dead: 'Ölü kod enjeksiyonu', debug: 'Geliştirici aracı koruması', self: 'Kendini koruyan yapı',
      initialMessage: 'Hazır olduğunda HTML dosyanızı seçin.', build: 'HTML’i koru <span>↗</span>', resultLabel: 'BUILD / TAMAMLANDI', resultTitle: 'Çıktınız hazır.', download: 'HTML’i indir <span>↓</span>',
      scriptsTransformed: 'satır içi script dönüştürüldü', sizeDifference: 'boyut farkı', processedLocally: 'İşlem tarayıcınızda yapıldı', preview: 'Korunan HTML’i görüntüle',
      privacy: 'Kaynak HTML’iniz cihazınızdan ayrılmaz. Bu playground JavaScript dönüşümünü yerel WebAssembly motorunda çalıştırır.', privacyLabel: 'WASM / CLIENT-SIDE',
      statusLoading: 'WASM MOTORU YÜKLENİYOR', statusReady: 'WASM MOTORU HAZIR', statusError: 'WASM MOTORU YÜKLENEMEDİ', statusBuildError: 'BUILD TAMAMLANAMADI',
      copyFileSize: (size) => `${size} KB · dosya cihazınızda işlenecek.`, invalidFile: 'Lütfen .html veya .htm dosyası seçin.',
      loadingMessage: 'Dosya tarayıcınızda işleniyor; büyük HTML dosyaları biraz daha uzun sürebilir.', noScripts: 'HTML dosyasında dönüştürülecek satır içi JavaScript bulunamadı.',
      buildError: 'Build sırasında bir hata oluştu.', completed: (count) => `${count} satır içi script Wasm motoruyla dönüştürüldü.`,
      wasmMissing: 'WebAssembly paketi dosyası boş.', wasmUnavailable: 'WebAssembly paketi yüklenemedi. Sayfayı bir web sunucusundan açıp yeniden deneyin.',
      gzipUnavailable: 'Bu tarayıcı gzip açmayı desteklemiyor; güncel bir tarayıcıyla yeniden deneyin.', transformFailed: 'Wasm dönüşümü başarısız oldu.'
    },
    en: {
      title: 'Dontrea — Protect your web code',
      description: 'Dontrea transforms inline JavaScript in web applications and packages it into a single HTML output.',
      languageLabel: 'Language', footerCredit: 'by <a href="https://yasireymen.com" target="_blank" rel="noreferrer">Yasir Eymen</a>',
      homeNav: 'Try the live demo <span>↗</span>', demoButton: 'Try the live demo <span>↗</span>',
      heroTitle: 'Your code.<br><span>Your control.</span>',
      copyLabel: 'Copy npm i -g github:yaso09/dontrea command', copied: 'Copied', copyFailed: 'Could not copy',
      lead: 'Dontrea transforms inline JavaScript in your web app, splits it into fragments, and embeds it in a single HTML output. Run your pre-production protection workflow with one command.',
      openSource: 'OPEN SOURCE', mit: 'MIT LICENSE',
      demoLabel: 'DONTREA / END TO END', demoTitle: 'From setup to<br><em>protected output.</em>', demoIntro: 'Follow the commands and protection options step by step in the terminal.',
      demoAria: 'Dontrea installation and feature walkthrough',
      demoLabels: ['INSTALL / REQUIREMENTS', 'SINGLE FILE', 'PROJECT CONFIGURATION', 'JAVASCRIPT PROTECTION', 'WASM / SAFE FALLBACK', 'PACKAGING / OUTPUT'],
      demoTitles: ['Prepare your<br>environment first.', 'Choose your source,<br>set the output.', 'Build multiple pages<br>in one run.', 'Choose the protection<br>layers you need.', 'The engine adapts<br>to your code.', 'One HTML file,<br>ready to ship.'],
      demoCopy: [
        'Dontrea runs on Node.js 18 or later. Clone the project and install dependencies; run <code>npm link</code> to make the <code>dontrea</code> command available in your terminal. Javy is optional for WebAssembly builds.',
        '<code>-i</code> sets the input HTML and <code>-o</code> sets the protected output path. <code>-p</code> controls how many hidden fragments hold the payload. Build a single page with command-line options.',
        '<code>dontrea config add</code> saves per-file input, output, and protection settings to <code>dontrea.json</code>, creating the file if needed. Then <code>dontrea build</code> processes every listed HTML file in sequence.',
        'Enable control-flow flattening, dead-code injection, self-defending, and developer-tools protection. Use <code>--domain-lock</code> to restrict where the code runs, and tune the fragment count and thresholds.',
        'When Javy is available, Dontrea can compile JavaScript to WebAssembly. It automatically switches to Safe-Fallback JS when it detects browser APIs such as Canvas or audio. Use <code>--force-wasm</code> to force compilation or <code>--no-wasm</code> to disable Wasm.',
        'Dontrea embeds code in HTML fragments and compresses the document. <code>--dynamic</code> selects Javy’s dynamic provider; <code>--wasm-binary</code> embeds a precompiled Wasm file. The result is a single HTML file at your chosen path.'
      ],
      setupTerminal: 'TERMINAL — SETUP', singleTerminal: 'TERMINAL — SINGLE FILE', projectTerminal: 'TERMINAL — PROJECT BUILD', shieldTerminal: 'TERMINAL — CODE PROTECTION', runtimeTerminal: 'TERMINAL — RUNTIME', outputTerminal: 'TERMINAL — OUTPUT',
      installAria: 'Dontrea installation commands', singleAria: 'Terminal example for protecting a single HTML file', configAria: 'Terminal example for creating dontrea.json and building multiple files', obfuscationAria: 'Terminal example for JavaScript protection options', runtimeAria: 'Terminal example for Wasm and Safe-Fallback modes', outputAria: 'Terminal example for Wasm options and protected output',
      ctaLabel: 'DONTREA / PLAYGROUND', ctaTitle: 'Try it with your<br><em>own HTML.</em>', ctaCopy: 'Upload an HTML file and let Dontrea’s WebAssembly core transform its inline JavaScript in your browser.', ctaButton: 'Open playground <span>↗</span>',
      footerHome: 'Yasireymen.com home page',
      playgroundTitle: 'Playground — Dontrea', playgroundDescription: 'Transform inline JavaScript in your HTML file in the browser with Dontrea Playground and WebAssembly.',
      homeLabel: 'Dontrea home page', back: '← Back to home', pageTitle: 'Try your protection<br><em>right here.</em>',
      pageIntro: 'Choose an HTML file and let Dontrea’s WebAssembly core transform its inline JavaScript in your browser. Your file is never uploaded to a server.',
      workbench: 'HTML protection playground', chooseFile: 'SELECT A FILE', engineTag: 'LOCAL / WEBASSEMBLY', dropFile: 'Drop your HTML file here', browse: 'or click to browse · HTML / HTM',
      options: 'Protection options', parts: 'Payload fragments', domain: 'Domain lock <small>(optional)</small>', control: 'Control-flow flattening', dead: 'Dead-code injection', debug: 'Developer-tools protection', self: 'Self-defending structure',
      initialMessage: 'Select an HTML file when you’re ready.', build: 'Protect HTML <span>↗</span>', resultLabel: 'BUILD / COMPLETE', resultTitle: 'Your output is ready.', download: 'Download HTML <span>↓</span>',
      scriptsTransformed: 'inline scripts transformed', sizeDifference: 'size change', processedLocally: 'Processed in your browser', preview: 'View protected HTML',
      privacy: 'Your source HTML stays on your device. This playground runs JavaScript transformation in a local WebAssembly engine.', privacyLabel: 'WASM / CLIENT-SIDE',
      statusLoading: 'LOADING WASM ENGINE', statusReady: 'WASM ENGINE READY', statusError: 'WASM ENGINE FAILED TO LOAD', statusBuildError: 'BUILD FAILED',
      copyFileSize: (size) => `${size} KB · processed on your device.`, invalidFile: 'Please select an .html or .htm file.',
      loadingMessage: 'Processing in your browser. Large HTML files may take a little longer.', noScripts: 'No inline JavaScript found to transform in this HTML file.',
      buildError: 'Something went wrong while building.', completed: (count) => `${count} inline scripts transformed with the Wasm engine.`,
      wasmMissing: 'The WebAssembly bundle is empty.', wasmUnavailable: 'Could not load the WebAssembly bundle. Open this page from a web server and try again.',
      gzipUnavailable: 'This browser does not support gzip decompression. Please try a recent browser.', transformFailed: 'Wasm transformation failed.'
    },
    ar: {
      title: 'دونتريا — احمِ كود الويب',
      description: 'تحوّل دونتريا جافاسكريبت المضمّنة في تطبيقات الويب وتضمّنها في ملف HTML واحد.',
      languageLabel: 'اللغة', footerCredit: 'بواسطة <a href="https://yasireymen.com" target="_blank" rel="noreferrer">ياسر أيمن</a>',
      homeNav: 'جرّب العرض المباشر <span>↗</span>', demoButton: 'جرّب العرض المباشر <span>↗</span>',
      heroTitle: 'كودك لك.<br><span>والتحكّم لك أيضًا.</span>',
      copyLabel: 'انسخ الأمر npm i -g github:yaso09/dontrea', copied: 'تم النسخ', copyFailed: 'تعذّر النسخ',
      lead: 'تحوّل دونتريا جافاسكريبت المضمّنة في تطبيق الويب، وتقسّمها إلى أجزاء، وتضمّنها في ملف HTML واحد. شغّل مسار الحماية قبل الإنتاج بأمر واحد.',
      openSource: 'مفتوح المصدر', mit: 'رخصة MIT',
      demoLabel: 'دونتريا / من البداية إلى النهاية', demoTitle: 'من الإعداد إلى<br><em>الملف المحمي.</em>', demoIntro: 'تابع الأوامر وخيارات الحماية خطوة بخطوة في الطرفية.',
      demoAria: 'شرح تثبيت دونتريا وميزاته',
      demoLabels: ['التثبيت / المتطلبات', 'ملف واحد', 'إعداد المشروع', 'حماية جافاسكريبت', 'WASM / الوضع البديل الآمن', 'التجميع / الإخراج'],
      demoTitles: ['جهّز بيئة العمل<br>أولًا.', 'اختر ملف المصدر،<br>وحدّد الإخراج.', 'ابنِ عدة صفحات<br>في تشغيل واحد.', 'اختر طبقات الحماية<br>التي تحتاجها.', 'يتكيّف المحرك<br>مع كودك.', 'ملف HTML واحد،<br>جاهز للنشر.'],
      demoCopy: [
        'تعمل دونتريا مع Node.js 18 أو أحدث. استنسخ المشروع وثبّت الاعتماديات، ثم شغّل <code>npm link</code> لإتاحة الأمر <code>dontrea</code> في الطرفية. Javy اختياري لبناء WebAssembly.',
        'يحدّد <code>-i</code> ملف HTML المُدخل، ويحدّد <code>-o</code> مسار الملف المحمي. يضبط <code>-p</code> عدد الأجزاء المخفية التي تحتوي الحمولة. ابنِ صفحة واحدة بخيارات سطر الأوامر.',
        'يحفظ <code>dontrea config add</code> إعدادات الإدخال والإخراج والحماية لكل ملف في <code>dontrea.json</code>، وينشئ الملف عند الحاجة. ثم يعالج <code>dontrea build</code> كل ملفات HTML المدرجة بالتتابع.',
        'فعّل تسطيح تدفق التحكم وحقن الشيفرة الميتة والحماية الذاتية وحماية أدوات المطور. استخدم <code>--domain-lock</code> لتقييد النطاقات التي يعمل عليها الكود، واضبط عدد الأجزاء والحدود.',
        'عند توفر Javy، تستطيع دونتريا ترجمة جافاسكريبت إلى WebAssembly. تنتقل تلقائيًا إلى وضع Safe-Fallback عند اكتشاف واجهات المتصفح مثل Canvas أو الصوت. استخدم <code>--force-wasm</code> لفرض الترجمة أو <code>--no-wasm</code> لتعطيل Wasm.',
        'تضمّن دونتريا الكود في أجزاء داخل HTML وتضغط المستند. يختار <code>--dynamic</code> مزوّد Javy الديناميكي، بينما يضمّن <code>--wasm-binary</code> ملف Wasm مُسبق الترجمة. الناتج ملف HTML واحد في المسار الذي تحدده.'
      ],
      setupTerminal: 'الطرفية — الإعداد', singleTerminal: 'الطرفية — ملف واحد', projectTerminal: 'الطرفية — بناء المشروع', shieldTerminal: 'الطرفية — حماية الكود', runtimeTerminal: 'الطرفية — بيئة التشغيل', outputTerminal: 'الطرفية — الإخراج',
      installAria: 'أوامر تثبيت دونتريا', singleAria: 'مثال طرفية لحماية ملف HTML واحد', configAria: 'مثال طرفية لإنشاء dontrea.json وبناء عدة ملفات', obfuscationAria: 'مثال طرفية لخيارات حماية جافاسكريبت', runtimeAria: 'مثال طرفية لوضعي Wasm وSafe-Fallback', outputAria: 'مثال طرفية لخيارات Wasm والملف المحمي',
      ctaLabel: 'دونتريا / ساحة التجربة', ctaTitle: 'جرّبها على ملف<br><em>HTML الخاص بك.</em>', ctaCopy: 'ارفع ملف HTML ودع نواة دونتريا المبنية على WebAssembly تحوّل جافاسكريبت المضمّنة في متصفحك.', ctaButton: 'افتح ساحة التجربة <span>↗</span>',
      footerHome: 'الصفحة الرئيسية لموقع Yasireymen.com',
      playgroundTitle: 'ساحة التجربة — دونتريا', playgroundDescription: 'حوّل جافاسكريبت المضمّنة في ملف HTML باستخدام WebAssembly داخل المتصفح عبر ساحة تجربة دونتريا.',
      homeLabel: 'الصفحة الرئيسية لدونتريا', back: '→ العودة إلى الصفحة الرئيسية', pageTitle: 'جرّب الحماية<br><em>هنا مباشرة.</em>',
      pageIntro: 'اختر ملف HTML ودع نواة دونتريا المبنية على WebAssembly تحوّل جافاسكريبت المضمّنة في متصفحك. لا يُرفع ملفك إلى أي خادم.',
      workbench: 'ساحة تجربة حماية HTML', chooseFile: 'اختر ملفًا', engineTag: 'محلي / WEBASSEMBLY', dropFile: 'أفلت ملف HTML هنا', browse: 'أو انقر لاختيار ملف · HTML / HTM',
      options: 'خيارات الحماية', parts: 'أجزاء الحمولة', domain: 'تقييد النطاق <small>(اختياري)</small>', control: 'تسطيح تدفق التحكم', dead: 'حقن الشيفرة الميتة', debug: 'الحماية من أدوات المطور', self: 'بنية ذاتية الحماية',
      initialMessage: 'اختر ملف HTML عندما تكون مستعدًا.', build: 'احمِ ملف HTML <span>↗</span>', resultLabel: 'اكتمل البناء', resultTitle: 'ملفك جاهز.', download: 'نزّل ملف HTML <span>↓</span>',
      scriptsTransformed: 'نصوص مضمّنة تم تحويلها', sizeDifference: 'تغيّر الحجم', processedLocally: 'تمت المعالجة في متصفحك', preview: 'اعرض ملف HTML المحمي',
      privacy: 'يبقى ملف HTML الأصلي على جهازك. تحوّل ساحة التجربة جافاسكريبت باستخدام محرك WebAssembly محلي.', privacyLabel: 'WASM / داخل المتصفح',
      statusLoading: 'جارٍ تحميل محرك WASM', statusReady: 'محرك WASM جاهز', statusError: 'تعذّر تحميل محرك WASM', statusBuildError: 'فشل البناء',
      copyFileSize: (size) => `${size} كيلوبايت · ستتم المعالجة على جهازك.`, invalidFile: 'اختر ملفًا بامتداد .html أو .htm.',
      loadingMessage: 'تتم معالجة الملف في متصفحك. قد تستغرق ملفات HTML الكبيرة وقتًا أطول قليلًا.', noScripts: 'لا توجد شيفرة جافاسكريبت مضمّنة للتحويل في هذا الملف.',
      buildError: 'حدث خطأ أثناء البناء.', completed: (count) => `تم تحويل ${count} من النصوص المضمّنة بواسطة محرك Wasm.`,
      wasmMissing: 'حزمة WebAssembly فارغة.', wasmUnavailable: 'تعذّر تحميل حزمة WebAssembly. افتح الصفحة من خادم ويب ثم حاول مجددًا.',
      gzipUnavailable: 'هذا المتصفح لا يدعم فك ضغط gzip. جرّب متصفحًا حديثًا.', transformFailed: 'فشل تحويل Wasm.'
    }
  };

  const isPlayground = document.body.classList.contains('playground-page');
  const savedLanguage = localStorage.getItem('dontrea-language');
  const browserLanguage = navigator.languages?.[0] || navigator.language || 'tr';
  const browserLocale = browserLanguage.toLowerCase();
  const detectedLanguage = browserLocale.startsWith('ar') ? 'ar' : browserLocale.startsWith('en') ? 'en' : 'tr';
  let language = Object.hasOwn(copy, savedLanguage) ? savedLanguage : detectedLanguage;
  const dict = () => copy[language];
  const setHtml = (selector, value, root = document) => {
    const element = root.querySelector(selector);
    if (element && value !== undefined) element.innerHTML = value;
  };
  const setText = (selector, value, root = document) => {
    const element = root.querySelector(selector);
    if (element && value !== undefined) element.textContent = value;
  };

  function applyLanguage() {
    const t = dict();
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = isPlayground ? t.playgroundTitle : t.title;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = isPlayground ? t.playgroundDescription : t.description;
    const languageSelect = document.querySelector('#language-select');
    if (languageSelect) {
      languageSelect.value = language;
      languageSelect.setAttribute('aria-label', t.languageLabel);
      languageSelect.parentElement?.querySelector('.visually-hidden')?.replaceChildren(t.languageLabel);
    }
    setHtml('.footer-credit', t.footerCredit);
    setHtml('.nav-playground', t.homeNav);
    setHtml('.actions .primary', t.demoButton);
    if (!isPlayground) {
      setHtml('.hero h1', t.heroTitle);
      const copyControl = document.querySelector('.hero-install');
      copyControl?.setAttribute('aria-label', t.copyLabel);
      setText('.copy-toast', t.copied);
      setText('.lead', t.lead);
      const meta = document.querySelectorAll('.meta-item');
      if (meta[0]) meta[0].lastChild.textContent = t.openSource;
      if (meta[1]) meta[1].lastChild.textContent = t.mit;
      setText('.demo-intro .story-label', t.demoLabel);
      setHtml('.demo-intro h2', t.demoTitle);
      setText('.demo-intro>p:last-child', t.demoIntro);
      document.querySelector('.demo-steps')?.setAttribute('aria-label', t.demoAria);
      document.querySelectorAll('.demo-step').forEach((panel, index) => {
        setText('.demo-copy .story-label', t.demoLabels[index], panel);
        setHtml('.demo-copy h3', t.demoTitles[index], panel);
        setHtml('.demo-copy>div>p:last-child', t.demoCopy[index], panel);
        const ariaKey = ['installAria', 'singleAria', 'configAria', 'obfuscationAria', 'runtimeAria', 'outputAria'][index];
        panel.querySelector('.demo-terminal')?.setAttribute('aria-label', t[ariaKey]);
        const terminalKey = ['setupTerminal', 'singleTerminal', 'projectTerminal', 'shieldTerminal', 'runtimeTerminal', 'outputTerminal'][index];
        setText('.terminal-title', t[terminalKey], panel);
      });
      setText('.playground-cta .story-label', t.ctaLabel);
      setHtml('.playground-cta h2', t.ctaTitle);
      setText('.playground-cta p:not(.story-label)', t.ctaCopy);
      setHtml('.playground-cta .button', t.ctaButton);
    } else {
      document.querySelector('.brand')?.setAttribute('aria-label', t.homeLabel);
      setText('.back-link', t.back);
      setHtml('.playground-heading h1', t.pageTitle);
      setText('.playground-heading>p:last-child', t.pageIntro);
      document.querySelector('.workbench')?.setAttribute('aria-label', t.workbench);
      setText('#engine-status', t.chooseFile);
      setText('.engine-tag', t.engineTag);
      setText('#file-name', t.dropFile);
      setText('.upload-zone>span:last-child', t.browse);
      setText('.options summary', t.options);
      setText('.field:first-child>span', t.parts);
      setHtml('.field:nth-child(2)>span', t.domain);
      setText('.check-field:nth-child(3)>span', t.control);
      setText('.check-field:nth-child(4)>span', t.dead);
      setText('.check-field:nth-child(5)>span', t.debug);
      setText('.check-field:nth-child(6)>span', t.self);
      setText('#build-message', t.initialMessage);
      setHtml('#build-button', t.build);
      setText('.result-heading .story-label', t.resultLabel);
      setText('.result-heading h2', t.resultTitle);
      setHtml('#download-link', t.download);
      const scriptCount = document.querySelector('#script-count');
      if (scriptCount?.parentElement) scriptCount.parentElement.innerHTML = `<strong id="script-count">${scriptCount.textContent}</strong> ${t.scriptsTransformed}`;
      const sizeReduction = document.querySelector('#size-reduction');
      if (sizeReduction?.parentElement) sizeReduction.parentElement.innerHTML = `<strong id="size-reduction">${sizeReduction.textContent}</strong> ${t.sizeDifference}`;
      setText('.result-stats>span:nth-child(3)', t.processedLocally);
      setText('.preview summary', t.preview);
      setHtml('.playground-note', `<span>${t.privacyLabel}</span> ${t.privacy}`);
      document.querySelector('.home-link')?.setAttribute('aria-label', t.footerHome);
    }
    window.dispatchEvent(new CustomEvent('dontrea:languagechange', { detail: { language } }));
  }

  window.DontreaI18n = {
    get language() { return language; },
    t(key, ...args) { const value = dict()[key]; return typeof value === 'function' ? value(...args) : (value ?? key); }
  };
  document.querySelector('#language-select')?.addEventListener('change', (event) => {
    language = Object.hasOwn(copy, event.currentTarget.value) ? event.currentTarget.value : 'tr';
    localStorage.setItem('dontrea-language', language);
    applyLanguage();
  });
  applyLanguage();
})();
