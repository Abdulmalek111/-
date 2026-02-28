import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Home, 
  Fingerprint, 
  BookOpen, 
  Settings, 
  Bell, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Share2, 
  Copy, 
  RotateCcw, 
  Volume2, 
  Vibrate,
  VolumeX,
  Moon,
  Sun,
  Clock,
  Menu,
  Compass,
  MapPin,
  Calendar,
  Quote,
  Search,
  MoreVertical,
  ArrowRight,
  Sparkles,
  Library,
  LayoutGrid,
  Droplets,
  Bed,
  Plane,
  Heart,
  Smile,
  PlusSquare,
  Sunrise,
  Sunset,
  Leaf,
  Palette,
  Type,
  Globe,
  LogOut,
  ChevronDown
} from "lucide-react";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import { cn, MORNING_DHIKR, EVENING_DHIKR, PRAYER_NAMES, DhikrItem } from "./lib/utils";
import { SURAHS } from "./lib/quranData";
import { GoogleGenAI, Modality } from "@google/genai";

type View = "home" | "dhikr" | "subha" | "settings" | "qibla" | "quran" | "calendar";

export default function App() {
  const [activeView, setActiveView] = useState<View>("home");
  const [showSplash, setShowSplash] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayer, setNextPrayer] = useState<string>("");
  const [timeToNext, setTimeToNext] = useState<string>("");
  const [notificationMode, setNotificationMode] = useState<'sound' | 'vibrate' | 'silent'>('sound');
  const [lastNotifiedPrayer, setLastNotifiedPrayer] = useState<string | null>(null);

  // Global Settings
  const [primaryColor, setPrimaryColor] = useState("#0bda84");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    // Apply primary color globally
    document.documentElement.style.setProperty('--color-brand-primary', primaryColor);
    // Apply text scale globally (base is 16px)
    document.documentElement.style.setProperty('--text-scale', (fontSize / 16).toString());
    // Apply dark mode
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [primaryColor, fontSize, isDarkMode]);

  useEffect(() => {
    const coords = new Coordinates(55.7558, 37.6173);
    const params = CalculationMethod.MuslimWorldLeague();
    const date = new Date();
    const pt = new PrayerTimes(coords, date, params);
    setPrayerTimes(pt);

    const updateTimer = () => {
      const next = pt.nextPrayer();
      setNextPrayer(next);
      if (next !== "none") {
        const nextTime = pt.timeForPrayer(next);
        if (nextTime) {
          const diff = nextTime.getTime() - new Date().getTime();
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeToNext(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerNotification = async () => {
    if (notificationMode === 'silent') return;

    // Vibrate for both 'vibrate' and 'sound' modes
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    if (notificationMode === 'sound') {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: 'الله أكبر، الله أكبر' }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
          audio.play();
        }
      } catch (error) {
        console.error("TTS Error:", error);
      }
    }
  };

  useEffect(() => {
    if (!prayerTimes) return;

    const checkPrayer = () => {
      const now = new Date();
      const currentPrayer = prayerTimes.currentPrayer();
      
      // If we just entered a new prayer time
      if (currentPrayer !== "none" && currentPrayer !== "sunrise" && currentPrayer !== lastNotifiedPrayer) {
        const prayerTime = prayerTimes.timeForPrayer(currentPrayer);
        if (prayerTime) {
          const diff = Math.abs(now.getTime() - prayerTime.getTime());
          // If we are within 5 seconds of the actual prayer time
          if (diff < 5000) {
            triggerNotification();
            setLastNotifiedPrayer(currentPrayer);
          }
        }
      }
    };

    const interval = setInterval(checkPrayer, 1000);
    return () => clearInterval(interval);
  }, [prayerTimes, lastNotifiedPrayer, notificationMode]);

  const cycleNotificationMode = () => {
    setNotificationMode(prev => {
      if (prev === 'sound') return 'vibrate';
      if (prev === 'vibrate') return 'silent';
      return 'sound';
    });
  };

  useEffect(() => {
    if (showSplash) {
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setShowSplash(false), 800);
            return 100;
          }
          // Increment by 1 every 100ms for exactly 10 seconds total
          return Math.min(prev + 1, 100);
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [showSplash]);

  const getPrayerNameArabic = (p: string) => {
    const names: Record<string, string> = {
      fajr: "صلاة الفجر",
      sunrise: "شروق الشمس",
      dhuhr: "صلاة الظهر",
      asr: "صلاة العصر",
      maghrib: "صلاة المغرب",
      isha: "صلاة العشاء",
      none: "لا يوجد"
    };
    return names[p] || p;
  };

  const formatPrayerTime = (date: Date | undefined) => {
    if (!date) return "--:--";
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (showSplash) {
    return <SplashScreen progress={loadingProgress} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] max-w-[400px] mx-auto bg-brand-dark overflow-hidden relative shadow-2xl border-x border-brand-border" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2 text-brand-primary">
          <Leaf size={20} />
          <h1 className="text-base font-bold">طُمأنينة</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary border border-brand-border">
            <Bell size={16} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-20">
        <AnimatePresence mode="wait">
          {activeView === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Prayer Card */}
              <div className="prayer-gradient p-5 rounded-[28px] shadow-lg shadow-brand-primary/10 relative overflow-hidden">
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-white">
                      {nextPrayer !== "none" && prayerTimes ? formatPrayerTime(prayerTimes.timeForPrayer(nextPrayer)) : "--:--"}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-white/80 font-medium mb-0.5">الصلاة القادمة</p>
                    <h2 className="text-2xl font-bold text-white">{getPrayerNameArabic(nextPrayer)}</h2>
                    <p className="text-[9px] text-white/70 mt-0.5">موسكو، الولايات المتحدة الروسية</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-5 bg-white/10 backdrop-blur-sm rounded-xl p-2.5">
                  <button 
                    onClick={cycleNotificationMode}
                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {notificationMode === 'sound' && <Volume2 size={16} className="text-white" />}
                    {notificationMode === 'vibrate' && <Vibrate size={16} className="text-white" />}
                    {notificationMode === 'silent' && <VolumeX size={16} className="text-white" />}
                  </button>
                  <div className="flex items-center gap-1.5 text-white text-[10px] font-medium">
                    <span>الوقت المتبقي: {timeToNext}</span>
                    <Clock size={12} />
                  </div>
                </div>
              </div>

              {/* All Prayer Times List */}
              {prayerTimes && (
                <div className="glass-card p-4 grid grid-cols-5 gap-2">
                  {[
                    { id: 'fajr', label: 'فجر' },
                    { id: 'dhuhr', label: 'ظهر' },
                    { id: 'asr', label: 'عصر' },
                    { id: 'maghrib', label: 'مغرب' },
                    { id: 'isha', label: 'عشاء' }
                  ].map((p) => (
                    <div key={p.id} className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                      nextPrayer === p.id ? "bg-brand-primary/20 border border-brand-primary/30" : "bg-white/5"
                    )}>
                      <span className="text-[8px] text-white/60 font-bold">{p.label}</span>
                      <span className="text-[10px] text-white font-bold">
                        {prayerTimes.timeForPrayer(p.id)?.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Main Sections Header */}
              <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-main">الأقسام الرئيسية</h3>
                <button className="text-[10px] text-brand-primary font-medium">عرض الكل</button>
              </div>

              {/* Main Sections Grid */}
              <div className="grid grid-cols-2 gap-3">
                <SectionButton 
                  icon={<Sun />} 
                  title="الأذكار" 
                  subtitle="جميع الأذكار" 
                  onClick={() => setActiveView("dhikr")}
                />
                <SectionButton 
                  icon={<BookOpen />} 
                  title="الأدعية" 
                  subtitle="أدعية مأثورة" 
                />
                <SectionButton 
                  icon={<Calendar />} 
                  title="التقويم" 
                  subtitle="بالهجري" 
                  onClick={() => setActiveView("calendar")}
                />
                <SectionButton 
                  icon={<BookOpen />} 
                  title="القرآن" 
                  subtitle="تلاوة وتفسير" 
                  onClick={() => setActiveView("quran")}
                />
              </div>

              {/* Hadith of the Day */}
              <div className="dashed-card p-5 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Quote size={14} className="text-brand-primary rotate-180" />
                    <h3 className="text-brand-primary font-bold text-xs">حديث اليوم</h3>
                  </div>
                  <Quote size={14} className="text-brand-primary" />
                </div>
                <p className="text-xs leading-relaxed text-white/90 text-center font-medium">
                  "إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى"
                </p>
                <p className="text-[9px] text-white/40 mt-3 text-left">— رواه البخاري</p>
              </div>

              {/* Extra Services */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm">خدمات إضافية</h3>
                <div className="grid grid-cols-3 gap-2">
                  <ServiceIcon icon={<Compass size={18} />} label="القبلة" />
                  <ServiceIcon icon={<MapPin size={18} />} label="المساجد" />
                  <ServiceIcon icon={<Calendar size={18} />} label="التقويم" onClick={() => setActiveView("calendar")} />
                </div>
              </div>
            </motion.div>
          )}

          {activeView === "dhikr" && <DhikrView onBack={() => setActiveView("home")} />}
          {activeView === "subha" && <SubhaView onBack={() => setActiveView("home")} />}
          {activeView === "quran" && <QuranView onBack={() => setActiveView("home")} />}
          {activeView === "calendar" && <CalendarView onBack={() => setActiveView("home")} />}
          {activeView === "settings" && (
            <SettingsView 
              onBack={() => setActiveView("home")} 
              settings={{ primaryColor, isDarkMode, fontSize }}
              onUpdate={(key, value) => {
                if (key === 'primaryColor') setPrimaryColor(value as string);
                if (key === 'isDarkMode') setIsDarkMode(value as boolean);
                if (key === 'fontSize') setFontSize(value as number);
              }}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[400px] mx-auto bg-brand-surface/90 backdrop-blur-xl border-t border-brand-border px-6 py-3 flex justify-between items-center z-50">
        <NavButton active={activeView === "home"} icon={<Home size={22} />} label="الرئيسية" onClick={() => setActiveView("home")} />
        <NavButton active={activeView === "dhikr"} icon={<BookOpen size={22} />} label="الأذكار" onClick={() => setActiveView("dhikr")} />
        <NavButton active={activeView === "subha"} icon={<Fingerprint size={22} />} label="المسبحة" onClick={() => setActiveView("subha")} />
        <NavButton active={activeView === "settings"} icon={<Settings size={22} />} label="الإعدادات" onClick={() => setActiveView("settings")} />
      </nav>
    </div>
  );
}

function SectionButton({ icon, title, subtitle, onClick }: { icon: React.ReactNode, title: string, subtitle: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="glass-card p-4 flex flex-col items-center text-center hover:bg-brand-card transition-all active:scale-95 group w-full"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-3 text-brand-primary group-hover:scale-110 transition-transform">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 20 }) : icon}
      </div>
      <h4 className="font-bold text-xs mb-0.5">{title}</h4>
      <p className="text-[9px] text-text-muted">{subtitle}</p>
    </button>
  );
}

function ServiceIcon({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group">
      <div className="w-12 h-12 rounded-xl bg-brand-surface flex items-center justify-center text-brand-primary border border-brand-border group-hover:border-brand-primary/30 transition-all active:scale-90">
        {icon}
      </div>
      <span className="text-[9px] text-text-muted group-hover:text-text-main transition-colors">{label}</span>
    </button>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 transition-all active:scale-90",
        active ? "text-brand-primary" : "text-text-muted/40"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function DhikrView({ onBack }: { onBack: () => void }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  if (activeCategory === "morning" || activeCategory === "evening") {
    return <DhikrDetailView category={activeCategory} onBack={() => setActiveCategory(null)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="text-white/60">
            <MoreVertical size={20} />
          </button>
          <button className="text-white/60">
            <Search size={20} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-text-main">جميع الأذكار</h2>
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary">
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input 
          type="text" 
          placeholder="ابحث عن ذكر أو دعاء..." 
          className="w-full bg-brand-card/40 border border-white/5 rounded-2xl py-3 px-10 text-sm text-right focus:outline-none focus:border-brand-primary/30 transition-colors"
        />
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary" />
      </div>

      {/* Basic Dhikr */}
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2 text-brand-primary">
          <h3 className="font-bold">الأذكار الأساسية</h3>
          <Sparkles size={18} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <DhikrImageCard 
            title="أذكار الصباح" 
            image="https://picsum.photos/seed/morning/400/300" 
            onClick={() => setActiveCategory("morning")}
          />
          <DhikrImageCard 
            title="أذكار المساء" 
            image="https://picsum.photos/seed/evening/400/300" 
            onClick={() => setActiveCategory("evening")}
          />
        </div>
      </div>

      {/* Sahih Bukhari & Muslim */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button className="text-xs text-brand-primary font-medium">عرض الكل</button>
          <div className="flex items-center gap-2 text-brand-primary">
            <h3 className="font-bold">صحيح البخاري ومسلم</h3>
            <Library size={18} />
          </div>
        </div>
        <div className="space-y-3">
          <DhikrListItem 
            icon={<Sunrise size={20} />} 
            title="أذكار الاستيقاظ" 
            subtitle="ما يقوله المسلم عند القيام من النوم" 
          />
          <DhikrListItem 
            icon={<Home size={20} />} 
            title="أذكار الصلاة" 
            subtitle="أدعية الاستفتاح والركوع والسجود" 
          />
        </div>
      </div>

      {/* Additional Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2 text-brand-primary">
          <h3 className="font-bold">تصنيفات إضافية</h3>
          <LayoutGrid size={18} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CategorySmallCard icon={<Home size={18} />} title="أذكار المنزل" />
          <CategorySmallCard icon={<Plane size={18} />} title="أذكار السفر" />
          <CategorySmallCard icon={<Bed size={18} />} title="أذكار النوم" />
          <CategorySmallCard icon={<BookOpen size={18} />} title="أدعية قرآنية" />
          <CategorySmallCard icon={<Smile size={18} />} title="أذكار الفرح" />
          <CategorySmallCard icon={<PlusSquare size={18} />} title="أدعية المريض" />
        </div>
      </div>
    </motion.div>
  );
}

function DhikrImageCard({ title, image, onClick }: { title: string, image: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="relative aspect-[4/3] rounded-3xl overflow-hidden group active:scale-95 transition-all"
    >
      <img src={image} alt={title} className="w-full h-full object-cover brightness-50 group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 to-transparent" />
      <div className="absolute bottom-4 right-4 text-right">
        <span className="bg-brand-primary/20 text-brand-primary text-[8px] font-bold px-2 py-0.5 rounded-full mb-1 inline-block">يومي</span>
        <h4 className="text-text-main font-bold text-sm">{title}</h4>
      </div>
    </button>
  );
}

function DhikrListItem({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle: string }) {
  return (
    <button className="w-full glass-card p-4 flex items-center justify-between hover:bg-brand-card transition-colors group">
      <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex-1 text-right px-4">
        <h4 className="text-text-main font-bold text-sm mb-0.5">{title}</h4>
        <p className="text-[10px] text-text-muted">{subtitle}</p>
      </div>
      <ChevronLeft size={14} className="text-text-muted/20" />
    </button>
  );
}

function CategorySmallCard({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <button className="glass-card p-4 flex flex-col items-center gap-2 hover:bg-brand-card transition-all active:scale-95 group">
      <div className="text-brand-primary group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-xs font-bold text-text-main/80">{title}</span>
    </button>
  );
}

function DhikrCard({ item }: { item: DhikrItem }) {
  const [currentCount, setCurrentCount] = useState(0);

  const handleIncrement = () => {
    if (currentCount < item.count) {
      setCurrentCount(prev => prev + 1);
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      {item.source && (
        <span className="inline-block px-2 py-1 rounded bg-brand-primary/10 text-brand-primary text-[10px] font-bold">
          {item.source}
        </span>
      )}
      <p className="text-lg leading-relaxed text-right font-medium">
        {item.text}
      </p>
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <button 
          onClick={handleIncrement}
          className={cn(
            "px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
            currentCount === item.count 
              ? "bg-brand-primary/20 text-brand-primary/50 cursor-default" 
              : "bg-brand-primary text-brand-dark active:scale-95"
          )}
        >
          <span>التكرار</span>
          <span className="font-mono">{currentCount} / {item.count}</span>
        </button>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg bg-brand-surface text-white/40 hover:text-brand-primary transition-colors">
            <Copy size={18} />
          </button>
          <button className="p-2 rounded-lg bg-brand-surface text-white/40 hover:text-brand-primary transition-colors">
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DhikrDetailView({ category, onBack }: { category: string, onBack: () => void }) {
  const items = category === "morning" ? MORNING_DHIKR : EVENING_DHIKR;
  const title = category === "morning" ? "أذكار الصباح" : "أذكار المساء";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-10" />
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onBack} className="p-2 rounded-full bg-brand-surface text-text-muted/60">
          <ArrowRight size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>
            <DhikrCard item={item} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function QuranView({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState("surahs");
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  
  const handleNextSurah = () => {
    if (selectedSurahId && selectedSurahId < 114) {
      setSelectedSurahId(selectedSurahId + 1);
    }
  };

  const handlePrevSurah = () => {
    if (selectedSurahId && selectedSurahId > 1) {
      setSelectedSurahId(selectedSurahId - 1);
    }
  };

  if (selectedSurahId) {
    const surah = SURAHS.find(s => s.id === selectedSurahId);
    return (
      <SurahDetailView 
        surahId={selectedSurahId} 
        surahName={surah?.name || ""} 
        onBack={() => setSelectedSurahId(null)}
        onNextSurah={handleNextSurah}
        onPrevSurah={handlePrevSurah}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary border border-white/5"
        >
          <ArrowRight size={18} />
        </button>
        <h2 className="text-xl font-bold text-text-main">المصحف الشريف</h2>
        <button className="w-9 h-9 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary border border-white/5">
          <Bell size={18} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input 
          type="text" 
          placeholder="ابحث عن سورة، آية أو جزء" 
          className="w-full bg-brand-card/40 border border-white/5 rounded-2xl py-3 px-10 text-sm text-right focus:outline-none focus:border-brand-primary/30 transition-colors"
        />
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary" />
      </div>

      {/* Last Read Card */}
      <div className="relative overflow-hidden bg-brand-surface rounded-3xl p-6 border border-brand-border">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-brand-primary mb-4">
            <BookOpen size={14} />
            <span className="text-[10px] font-bold">آخر قراءة</span>
          </div>
          <h3 className="text-2xl font-bold text-text-main mb-1">سورة البقرة</h3>
          <p className="text-[10px] text-text-muted mb-6">آية رقم: 155 • الجزء 2</p>
          <button className="bg-brand-primary text-brand-dark px-6 py-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2 active:scale-95 transition-all">
            <span>متابعة القراءة</span>
            <ArrowRight size={14} className="rotate-180" />
          </button>
        </div>
        <div className="absolute -left-4 -bottom-4 opacity-10">
          <BookOpen size={160} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-white/5 px-2">
        <button 
          onClick={() => setActiveTab("surahs")}
          className={cn(
            "pb-3 text-xs font-bold transition-all relative",
            activeTab === "surahs" ? "text-brand-primary" : "text-white/40"
          )}
        >
          السور
          {activeTab === "surahs" && <motion.div layoutId="quran-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />}
        </button>
        <button 
          onClick={() => setActiveTab("juz")}
          className={cn(
            "pb-3 text-xs font-bold transition-all relative",
            activeTab === "juz" ? "text-brand-primary" : "text-white/40"
          )}
        >
          الأجزاء
          {activeTab === "juz" && <motion.div layoutId="quran-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />}
        </button>
        <button 
          onClick={() => setActiveTab("bookmarks")}
          className={cn(
            "pb-3 text-xs font-bold transition-all relative",
            activeTab === "bookmarks" ? "text-brand-primary" : "text-white/40"
          )}
        >
          العلامات المرجعية
          {activeTab === "bookmarks" && <motion.div layoutId="quran-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />}
        </button>
      </div>

      {/* Surah List */}
      <div className="space-y-1">
        {SURAHS.map((surah) => (
          <button 
            key={surah.id} 
            onClick={() => setSelectedSurahId(surah.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-brand-hover transition-colors group border-b border-brand-border last:border-0"
          >
            <div className="flex items-center gap-4">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 text-brand-primary/20 group-hover:text-brand-primary/40 transition-colors">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                    <path d="M12 2L14.85 8.65L22 9.24L16.5 13.97L18.18 21L12 17.27L5.82 21L7.5 13.97L2 9.24L9.15 8.65L12 2Z" />
                  </svg>
                </div>
                <span className="relative text-[10px] font-bold text-brand-primary">{surah.id}</span>
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-text-main mb-0.5">{surah.name}</h4>
                <p className="text-[9px] text-text-muted uppercase tracking-wider">
                  {surah.type === "MECCAN" ? "مكية" : "مدنية"} • {surah.verses} آية
                </p>
              </div>
            </div>
            <ChevronLeft size={16} className="text-text-muted/20" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function SurahDetailView({ surahId, surahName, onBack, onNextSurah, onPrevSurah }: { 
  surahId: number, 
  surahName: string, 
  onBack: () => void,
  onNextSurah?: () => void,
  onPrevSurah?: () => void
}) {
  const [pages, setPages] = useState<Record<number, any[]>>({});
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [surahInfo, setSurahInfo] = useState<any>(null);

  useEffect(() => {
    const fetchSurah = async () => {
      try {
        setLoading(true);
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}/ar.alafasy`);
        const data = await response.json();
        if (data.code === 200) {
          const ayahs = data.data.ayahs;
          setSurahInfo(data.data);
          
          // Group ayahs by page
          const grouped: Record<number, any[]> = {};
          ayahs.forEach((ayah: any) => {
            if (!grouped[ayah.page]) grouped[ayah.page] = [];
            grouped[ayah.page].push(ayah);
          });
          
          setPages(grouped);
          const sortedPages = Object.keys(grouped).map(Number).sort((a, b) => a - b);
          setPageNumbers(sortedPages);
          setCurrentPageIndex(0);
        }
      } catch (error) {
        console.error("Error fetching surah:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSurah();
  }, [surahId]);

  const handleNextPage = () => {
    if (currentPageIndex < pageNumbers.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    } else if (onNextSurah) {
      onNextSurah();
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    } else if (onPrevSurah) {
      onPrevSurah();
    }
  };

  const currentPage = pageNumbers[currentPageIndex];
  const currentAyahs = pages[currentPage] || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-brand-dark text-text-main overflow-hidden"
    >
      {/* Header */}
      <header className="p-3 flex items-center justify-between border-b border-white/5 z-20">
        <button onClick={onBack} className="text-text-muted/60">
          <ArrowRight size={20} />
        </button>
        <div className="text-center">
          <span className="text-[9px] text-brand-primary font-bold tracking-widest uppercase">
            صفحة {currentPage} من 604
          </span>
        </div>
        <div className="w-5" /> {/* Spacer */}
      </header>

      {/* Content Area with Swiping Simulation */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-0 flex flex-col p-4 overflow-hidden"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                // In RTL: dragging left (negative x) goes to NEXT page
                // dragging right (positive x) goes to PREVIOUS page
                if (info.offset.x > 100) handlePrevPage();
                else if (info.offset.x < -100) handleNextPage();
              }}
            >
              {/* Surah Decorative Header (Only on the first page of the surah) */}
              {currentAyahs[0]?.numberInSurah === 1 && (
                <div className="flex flex-col items-center mb-6 mt-2 gap-4">
                  <div className="relative mx-auto w-fit px-10 py-2 border border-brand-primary/30 rounded-full flex items-center justify-center">
                    <div className="absolute left-3 w-1 h-1 bg-brand-primary rounded-full" />
                    <h2 className="text-xl font-bold text-brand-primary font-serif">سورة {surahName}</h2>
                    <div className="absolute right-3 w-1 h-1 bg-brand-primary rounded-full" />
                  </div>
                  
                  {/* Basmala centered below Surah Name */}
                  {surahId !== 9 && (
                    <p className="text-3xl font-serif text-text-main/90">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                  )}
                </div>
              )}

              {/* Verses Grid/Flow - Reduced font size and line height to fit without scrolling */}
              <div className="text-center leading-[2.2] text-lg font-medium text-text-main/90 space-x-reverse space-x-1 overflow-hidden">
                {currentAyahs.map((ayah, index) => {
                  let text = ayah.text;
                  // Remove Basmala from the text if present (it's often prefixed in the first ayah)
                  // We do this for all surahs to ensure the header basmala is the only one shown
                  text = text.replace("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "").trim();
                  
                  // Special case for Al-Fatiha where Basmala is the first verse
                  // If we already showed it in the header, we might want to hide the first verse if it's just Basmala
                  // But usually people want to see the verse number. 
                  // If text is empty after replacement, it means it was just Basmala.
                  if (!text && surahId === 1) text = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
                  if (!text) return null;

                  return (
                    <React.Fragment key={ayah.number}>
                      <span className="inline leading-relaxed">{text}</span>
                      <span className="inline-flex items-center justify-center mx-1 text-brand-primary/60 font-serif text-base">
                        ﴿{ayah.numberInSurah}﴾
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Surah Footer Info (Only on the first page) */}
              {currentAyahs[0]?.numberInSurah === 1 && (
                <div className="mt-auto pt-12 text-center border-t border-white/5">
                  <p className="text-[10px] text-white/40 font-bold">
                    {surahInfo?.numberOfAyahs} آيات • {surahInfo?.revelationType === "Meccan" ? "مكية" : "مدنية"}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Hints */}
      {!loading && pageNumbers.length > 0 && (
        <div className="p-3 flex justify-between items-center text-[9px] font-bold text-text-muted/20 uppercase tracking-widest border-t border-brand-border">
          <button 
            onClick={handlePrevPage} 
            disabled={currentPageIndex === 0 && !onPrevSurah}
            className="disabled:opacity-0 flex items-center gap-2"
          >
            <ChevronRight size={14} />
            السابق
          </button>
          
          <div className="text-brand-primary font-bold">
            صفحة {currentPage}
          </div>

          <button 
            onClick={handleNextPage} 
            disabled={currentPageIndex === pageNumbers.length - 1 && !onNextSurah}
            className="disabled:opacity-0 flex items-center gap-2"
          >
            التالي
            <ChevronLeft size={14} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

function SettingsView({ 
  onBack, 
  settings, 
  onUpdate 
}: { 
  onBack: () => void, 
  settings: { primaryColor: string, isDarkMode: boolean, fontSize: number },
  onUpdate: (key: string, value: string | boolean | number) => void
}) {
  const colors = [
    { name: "primary", value: "#0bda84" },
    { name: "blue", value: "#3b82f6" },
    { name: "amber", value: "#f59e0b" },
    { name: "rose", value: "#f43f5e" },
    { name: "purple", value: "#a855f7" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-brand-dark border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf size={28} className="text-brand-primary" />
          <h1 className="text-xl font-bold text-brand-primary">طُمأنينة</h1>
        </div>
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-brand-hover transition-colors text-text-muted"
        >
          <ArrowRight size={24} />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-6">
        {/* Title */}
        <div className="pt-8 pb-4">
          <h2 className="text-2xl font-bold text-text-main">الإعدادات</h2>
          <p className="text-text-muted text-sm mt-1">قم بتخصيص تجربة تطبيق طُمأنينة الخاصة بك</p>
        </div>

        {/* Appearance Section */}
        <section className="mt-6">
          <div className="mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Palette size={20} className="text-brand-primary" />
              المظهر
            </h3>
          </div>
          <div className="p-4 rounded-xl bg-brand-surface border border-brand-border space-y-6">
            {/* Color Swatches */}
            <div>
              <p className="text-sm mb-3 text-text-muted">لون التطبيق الأساسي</p>
              <div className="flex flex-wrap gap-4">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => onUpdate('primaryColor', color.value)}
                    className={cn(
                      "w-10 h-10 rounded-full transition-all relative ring-offset-2 ring-offset-brand-dark",
                      settings.primaryColor === color.value && "ring-2 ring-brand-primary"
                    )}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Moon size={20} />
                </div>
                <span className="font-medium text-text-main">الوضع الليلي</span>
              </div>
              <button 
                onClick={() => onUpdate('isDarkMode', !settings.isDarkMode)}
                className={cn(
                  "w-11 h-6 rounded-full relative transition-colors",
                  settings.isDarkMode ? "bg-brand-primary" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                  settings.isDarkMode ? "left-6" : "left-1"
                )} />
              </button>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="mt-8">
          <div className="mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Settings size={20} className="text-brand-primary" />
              التفضيلات العامة
            </h3>
          </div>
          <div className="rounded-xl bg-brand-surface border border-white/5 divide-y divide-white/5">
            {/* Font Size */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Type size={20} />
                </div>
                <span className="font-medium text-text-main">حجم الخط</span>
              </div>
              <div className="px-2">
                <input 
                  type="range" 
                  min="12" 
                  max="24" 
                  value={settings.fontSize}
                  onChange={(e) => onUpdate('fontSize', parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
                <div className="flex justify-between mt-2 text-xs text-text-muted">
                  <span>صغير</span>
                  <span>متوسط</span>
                  <span>كبير</span>
                </div>
              </div>
            </div>

            {/* Language Selection */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Globe size={20} />
                </div>
                <span className="font-medium text-text-main">اللغة</span>
              </div>
              <select className="bg-transparent border-none text-brand-primary font-medium focus:ring-0 cursor-pointer text-sm outline-none">
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>

            {/* Notifications */}
            <button className="w-full p-4 flex items-center justify-between hover:bg-brand-hover transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Bell size={20} />
                </div>
                <span className="font-medium text-text-main">التنبيهات</span>
              </div>
              <ChevronLeft size={20} className="text-text-muted/20" />
            </button>
          </div>
        </section>

        {/* Account Section */}
        <section className="mt-8">
          <button className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center gap-2 font-bold transition-colors hover:bg-red-500/20">
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </section>
      </div>
    </motion.div>
  );
}

function SubhaView({ onBack }: { onBack: () => void }) {
  const [count, setCount] = useState(0);
  const [isVibrate, setIsVibrate] = useState(true);
  const [isSound, setIsSound] = useState(true);

  const handleTap = () => {
    setCount(prev => prev + 1);
    if (isVibrate && navigator.vibrate) navigator.vibrate(50);
  };

  const handleReset = () => {
    setCount(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col h-full bg-brand-dark"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <button onClick={handleReset} className="text-brand-primary">
          <RotateCcw size={22} />
        </button>
        <h2 className="text-lg font-bold text-text-main">المسبحة الرقمية</h2>
        <button onClick={onBack} className="text-brand-primary">
          <Menu size={22} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        {/* Counter Section */}
        <div className="text-center space-y-1">
          <p className="text-[10px] text-brand-primary font-medium">الجلسة الحالية</p>
          <h3 className="text-7xl font-bold text-text-main tracking-tighter">{count}</h3>
        </div>

        {/* Tap Button */}
        <button 
          onClick={handleTap}
          className="relative w-48 h-48 rounded-full bg-brand-primary flex flex-col items-center justify-center text-brand-dark shadow-[0_0_40px_rgba(0,210,147,0.3)] active:scale-95 transition-all group"
        >
          <div className="absolute inset-0 rounded-full border-4 border-white/10 scale-105 group-active:scale-100 transition-transform" />
          <Fingerprint size={48} strokeWidth={1.5} />
          <span className="font-bold text-base mt-1">اضغط</span>
       </button>

        {/* Control Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={() => setIsVibrate(!isVibrate)}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90",
              isVibrate ? "bg-brand-primary/20 text-brand-primary" : "bg-brand-surface text-text-muted/20"
            )}
          >
            <Vibrate size={20} />
          </button>
          <button 
            onClick={() => setIsSound(!isSound)}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90",
              isSound ? "bg-brand-primary/20 text-brand-primary" : "bg-brand-surface text-text-muted/20"
            )}
          >
            <Volume2 size={20} />
          </button>
          <button 
            onClick={handleReset}
            className="w-12 h-12 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary transition-all active:scale-90"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SubhaControl({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
      <div className="w-12 h-12 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary border border-white/5 group-hover:border-brand-primary/50 transition-colors">
        {icon}
      </div>
      <span className="text-[10px] font-bold text-text-muted group-hover:text-brand-primary transition-colors">{label}</span>
    </button>
  );
}

function CalendarView({ onBack }: { onBack: () => void }) {
  const events = [
    { title: "يوم عرفة", date: "9 ذو الحجة 1445 هـ", daysLeft: "بعد 4 أيام", icon: <Moon size={18} /> },
    { title: "عيد الأضحى المبارك", date: "10 ذو الحجة 1445 هـ", daysLeft: "بعد 5 أيام", icon: <Sparkles size={18} /> },
    { title: "رأس السنة الهجرية", date: "1 محرم 1446 هـ", daysLeft: "بعد 25 يوم", icon: <Home size={18} /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary border border-white/5"
        >
          <ArrowRight size={18} />
        </button>
        <h2 className="text-xl font-bold text-text-main">التقويم الهجري</h2>
        <button className="w-9 h-9 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary border border-white/5">
          <Share2 size={18} />
        </button>
      </div>

      {/* Month Selector */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-8">
          <button className="text-white/40 hover:text-brand-primary transition-colors">
            <ChevronRight size={20} />
          </button>
          <h3 className="text-2xl font-bold text-brand-primary">ذو الحجة 1445 هـ</h3>
          <button className="text-white/40 hover:text-brand-primary transition-colors">
            <ChevronLeft size={20} />
          </button>
        </div>
        <p className="text-[10px] text-white/40 font-medium">يونيو - يوليو 2024 م</p>
      </div>

      {/* Calendar Grid */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-7 gap-y-6 text-center">
          {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(day => (
            <span key={day} className="text-[10px] font-bold text-brand-primary/60">{day}</span>
          ))}
          
          {/* Empty cells for padding if needed, but for this specific month we'll just mock the numbers */}
          {[...Array(5)].map((_, i) => <div key={`empty-${i}`} />)}
          
          {[
            { h: 1, g: 7 }, { h: 2, g: 8 }, { h: 3, g: 9 }, { h: 4, g: 10 },
            { h: 5, g: 11 }, { h: 6, g: 12 }, { h: 7, g: 13 }, { h: 8, g: 14 }, { h: 9, g: 15 }, { h: 10, g: 16 },
            { h: 11, g: 17, active: true }, { h: 12, g: 18 }, { h: 13, g: 19 }, { h: 14, g: 20 }, { h: 15, g: 21 }, { h: 16, g: 22 }, { h: 17, g: 23 },
            { h: 18, g: 24 }, { h: 19, g: 25 }
          ].map((day) => (
            <div key={day.h} className="flex flex-col items-center gap-1 relative">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                day.active ? "bg-brand-primary text-brand-dark shadow-[0_0_15px_rgba(11,218,132,0.4)]" : "text-white"
              )}>
                <span className="text-sm font-bold">{day.h}</span>
              </div>
              <span className={cn("text-[8px] font-medium", day.active ? "text-brand-primary" : "text-white/20")}>{day.g}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="space-y-4">
                <h3 className="text-sm font-bold text-text-main">المناسبات الإسلامية القادمة</h3>
        <div className="space-y-3">
          {events.map((event, idx) => (
            <div key={idx} className="glass-card p-4 flex items-center justify-between group hover:bg-brand-hover transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  {event.icon}
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-bold text-white mb-0.5">{event.title}</h4>
                  <p className="text-[9px] text-white/40">{event.date}</p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-brand-primary">{event.daysLeft}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function SplashScreen({ progress }: { progress: number }) {
  return (
    <div className="flex flex-col h-[100dvh] max-w-[400px] mx-auto bg-[#041c14] overflow-hidden relative shadow-2xl items-center justify-between py-16" dir="rtl">
      {/* Aesthetic Background Touches */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-brand-primary/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-brand-primary/5 rounded-full blur-[100px]" />
      
      <div className="flex-1 flex flex-col items-center justify-center w-full px-10 gap-12 relative z-10">
        {/* Logo & Text with Animation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-3 text-white">
            <motion.div
              animate={{ 
                rotate: [0, 5, 0, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Leaf size={40} strokeWidth={1.5} className="text-brand-primary" />
            </motion.div>
            <h1 className="text-4xl font-bold tracking-tight">طُمأنينة</h1>
          </div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-brand-primary text-sm font-medium"
          >
            مرحباً بك في طُمأنينة
          </motion.p>
        </motion.div>

        {/* Loading Bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="w-full space-y-4"
        >
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-brand-primary">{progress}%</span>
            <span className="text-white/40">جاري التحميل...</span>
          </div>
          <div className="w-full h-1 bg-brand-hover rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-brand-primary shadow-[0_0_10px_rgba(0,210,147,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex items-center gap-2 text-text-muted/20 text-[10px] font-bold tracking-[0.2em] uppercase"
      >
        <span>SPIRITUALITY & PEACE</span>
        <div className="w-4 h-4 rounded-full bg-brand-primary/10 flex items-center justify-center">
          <Sparkles size={8} className="text-brand-primary" />
        </div>
      </motion.div>
    </div>
  );
}
