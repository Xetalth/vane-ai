# VaneAI — Autonomous Canary Guardrail Engine

VaneAI, modern bulut mimarilerinde kademeli dağıtımları (canary deployments) izleyen, anormallikleri tespit eden ve geleneksel APM araçlarının aksine mühendisin yerine geçip **otonom kod yaması (hotfix) uygulayan** AI-native bir platformdur.

---

### 1. Hedef Firma, SaaS ve Kanıt Linki
* **Hedef Firma:** Hulu (The Walt Disney Company)
* **Klonlanan SaaS:** LaunchDarkly (Continuous Delivery & Feature Management)
* **Tahmini Yıllık SaaS Maliyeti:** Fortune 500 ölçeğinde ~1.200.000 $ – 2.000.000 $ / yıl (koltuk sayısı + aylık milyonlarca flag evaluation isteği).
* **Kullanım Kanıtı:** 
  * [LaunchDarkly Case Study: How Hulu Scales Feature Flags](https://launchdarkly.com/customers/hulu/)
  * *(Hulu mühendislik ekipleri oturma odası 4K istemcilerinde ve canlı yayınlarda kademeli canary rollout için LaunchDarkly altyapısını kullanmaktadır.)*

---

### 2. Klonlanan 3+ Temel İş Akışı (85 Puan Çekirdeği)
1. **Dinamik Bayrak Yönetimi ve Kademeli Canary Rollout:**
   * Bayrakların canlı trafik dağılımını kademeli ölçekleme (%5 → %20 → %50 → %100) ve acil durdurma (Kill-Switch).
2. **Canlı Telemetri ve SLO Eşiği Takibi:**
   * Üretim ortamındaki mikroservislerden gelen p99 gecikme (latency), hata oranı (error rate) ve anlık çökme (crash) metriklerinin canlı paneli.
3. **Mikroservis Kaynak Kodu Entegrasyonu:**
   * Canlı çalışan mikroservisin hedef kod bloğunun (`app/service.py`) doğrudan arayüzde görüntülenmesi ve GitHub deposuyla bağlanması.

---

### 3. AI-Native Katman: "Kullanılabilir Pas" (100+ Puan Farkı)
Geleneksel SaaS araçları (LaunchDarkly, Datadog) yalnızca alarm çalar veya trafiği körlemesine keser; sorunun nedenini bulup düzeltmeyi mühendise bırakır. 

VaneAI ise pasif bir chatbot veya dashboard değildir; iş akışını şu şekilde devralır:
* **Sarı Seviye (Otonom Self-Healing):**
  * P99 gecikme veya bellek şişmesi algılandığında (`_GLOBAL_AUDIT_LOG`), mühendisi gece uykusundan uyandırmaz. 
  * Arka planda kodu optimize edilmiş bounded buffer ile dinamik olarak yamalar, GitHub dalına sessizce commit atar ve dağıtımı kesintiye uğratmadan sürdürür.
* **Kırmızı Seviye (Devre Kesici + Hazır Yama):**
  * Kritik bir çöküş (`ZeroDivisionError`) algılandığında devre kesici devreye girer, dağıtımı anında dondurur.
  * LLM motoru çöküş loglarını analiz eder, hatayı gideren diff yamasını üretir ve mühendisin önüne **"Approve & Deploy Hotfix PR"** butonuyla atar. Mühendis tek tıkla GitHub üzerinde Pull Request açar.

---

### 4. Metrik Tablosu
> *"Metrik yoksa iddia da yoktur. Biz mühendisiz."*

| Metrik | Değer |
| :--- | :--- |
| **Toplam Token Maliyeti ($)** | $0.84 |
| **Toplam Çalışma Süresi (saat)** | 16.5 Saat |
| **Toplam Satır Sayısı (LOC)** | ~2,250 Satır (Next.js + Rails 8 API) |
| **Kullanılan Model(ler)** | Groq / LLaMA-3, Claude 3.5 Sonnet |
| **Kullanılan Coding Agent(lar)** | Cursor IDE (Composer), Claude Code |
| **Agent Oturum Sayısı** | 9 Oturum |

---

### 5. Canlı Bağlantılar
* **Canlı Frontend (Web):** `https://vane-ai-nu.vercel.app`
* **Canlı Backend (Rails API):** `https://vane-ai.onrender.com`
* **GitHub Deposu:** `https://github.com/Xetalth/vane-ai`