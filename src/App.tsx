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
  ArrowLeft,
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
import { translations, Language } from "./translations";

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
  const [language, setLanguage] = useState<Language>("ar");

  const t = translations[language];

  useEffect(() => {
    // Apply primary color globally
    document.documentElement.style.setProperty('--color-brand-primary', primaryColor);
    // Create a slightly darker version for the gradient secondary color
    const darken = (hex: string, amount: number) => {
      const num = parseInt(hex.slice(1), 16);
      let r = (num >> 16) - amount;
      let g = ((num >> 8) & 0x00FF) - amount;
      let b = (num & 0x0000FF) - amount;
      
      r = r < 0 ? 0 : r;
      g = g < 0 ? 0 : g;
      b = b < 0 ? 0 : b;
      
      return `#${(b | (g << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
    };
    
    const secondaryColor = primaryColor.startsWith('#') ? darken(primaryColor, 20) : primaryColor;
    document.documentElement.style.setProperty('--secondary', secondaryColor);
    document.documentElement.style.setProperty('--primary', primaryColor);
    
    // Set RGB components for dynamic shadows
    if (primaryColor.startsWith('#')) {
      const num = parseInt(primaryColor.slice(1), 16);
      const r = (num >> 16);
      const g = ((num >> 8) & 0x00FF);
      const b = (num & 0x0000FF);
      document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
    }

    // Apply dark mode
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [primaryColor, isDarkMode]);

  useEffect(() => {
    const coords = new Coordinates(55.7558, 37.6173);
    const params = CalculationMethod.MuslimWorldLeague();

    const updateTimer = () => {
      const now = new Date();
      const pt = new PrayerTimes(coords, now, params);
      
      let next = pt.nextPrayer();
      let nextTime = pt.timeForPrayer(next);

      if (next === "none" || next === "sunrise") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const ptTomorrow = new PrayerTimes(coords, tomorrow, params);
        next = "fajr";
        nextTime = ptTomorrow.fajr;
        setPrayerTimes(ptTomorrow);
      } else {
        setPrayerTimes(pt);
      }

      setNextPrayer(next);
      
      if (nextTime) {
        const diff = nextTime.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeToNext(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
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
            setTimeout(() => setShowSplash(false), 500);
            return 100;
          }
          // Faster increment: 5% every 50ms = 1 second total for progress
          return Math.min(prev + 5, 100);
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [showSplash]);

  const getPrayerName = (p: string) => {
    return t.prayerNames[p as keyof typeof t.prayerNames] || p;
  };

  const formatPrayerTime = (date: Date | undefined) => {
    if (!date) return "--:--";
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (showSplash) {
    return <SplashScreen progress={loadingProgress} language={language} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] max-w-[400px] mx-auto bg-brand-dark overflow-hidden relative shadow-2xl border-x border-brand-border" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2 text-brand-primary">
          <Leaf size={20} />
          <h1 className="text-base font-bold">{t.appName}</h1>
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
              <div className="prayer-gradient p-5 rounded-[28px] shadow-xl shadow-[rgba(var(--primary-rgb),0.2)] relative overflow-hidden">
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-white">
                      {nextPrayer !== "none" && prayerTimes ? formatPrayerTime(prayerTimes.timeForPrayer(nextPrayer)) : "--:--"}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-white/80 font-medium mb-0.5">{t.nextPrayer}</p>
                    <h2 className="text-2xl font-bold text-white">{getPrayerName(nextPrayer)}</h2>
                    <p className="text-[9px] text-white/70 mt-0.5">موسكو، روسيا</p>
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
                    <span>{t.timeLeft}: {timeToNext}</span>
                    <Clock size={12} />
                  </div>
                </div>
              </div>

              {/* All Prayer Times List */}
              {prayerTimes && (
                <div className="glass-card p-4 grid grid-cols-5 gap-2">
                  {[
                    { id: 'fajr', label: t.prayerNames.fajr },
                    { id: 'dhuhr', label: t.prayerNames.dhuhr },
                    { id: 'asr', label: t.prayerNames.asr },
                    { id: 'maghrib', label: t.prayerNames.maghrib },
                    { id: 'isha', label: t.prayerNames.isha }
                  ].map((p) => (
                    <div key={p.id} className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                      nextPrayer === p.id ? "bg-brand-primary/20 border border-brand-primary/30" : "bg-brand-surface/50"
                    )}>
                      <span className={cn("text-[8px] font-bold", nextPrayer === p.id ? "text-brand-primary" : "text-text-muted")}>{p.label}</span>
                      <span className="text-[10px] text-text-main font-bold">
                        {prayerTimes.timeForPrayer(p.id)?.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Main Sections Header */}
              <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-main">{t.mainSections}</h3>
                <button className="text-[10px] text-brand-primary font-medium">{t.viewAll}</button>
              </div>

              {/* Main Sections Grid */}
              <div className="grid grid-cols-2 gap-3">
                <SectionButton 
                  icon={<Sun />} 
                  title={t.dhikr} 
                  subtitle={t.allDhikr} 
                  onClick={() => setActiveView("dhikr")}
                />
                <SectionButton 
                  icon={<BookOpen />} 
                  title={t.supplications} 
                  subtitle={t.supplications} 
                />
                <SectionButton 
                  icon={<Calendar />} 
                  title={t.calendar} 
                  subtitle={t.hijriCalendar} 
                  onClick={() => setActiveView("calendar")}
                />
                <SectionButton 
                  icon={<BookOpen />} 
                  title={t.quran} 
                  subtitle={t.quranTafsir} 
                  onClick={() => setActiveView("quran")}
                />
              </div>

              {/* Hadith of the Day */}
              <div className="dashed-card p-5 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Quote size={14} className="text-brand-primary rotate-180" />
                    <h3 className="text-brand-primary font-bold text-xs">{t.hadithToday}</h3>
                  </div>
                  <Quote size={14} className="text-brand-primary" />
                </div>
                <p className="text-xs leading-relaxed text-text-main/90 text-center font-medium">
                  "إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى"
                </p>
                <p className="text-[9px] text-text-muted mt-3 text-left">— رواه البخاري</p>
              </div>

              {/* Extra Services */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm">{t.extraServices}</h3>
                <div className="grid grid-cols-3 gap-2">
                  <ServiceIcon icon={<Compass size={18} />} label={t.qibla} onClick={() => setActiveView("qibla")} />
                  <ServiceIcon icon={<MosqueIcon size={18} />} label={t.mosques} />
                  <ServiceIcon icon={<Calendar size={18} />} label={t.calendar} onClick={() => setActiveView("calendar")} />
                </div>
              </div>
            </motion.div>
          )}

          {activeView === "dhikr" && <DhikrView onBack={() => setActiveView("home")} language={language} />}
          {activeView === "subha" && <SubhaView onBack={() => setActiveView("home")} language={language} />}
          {activeView === "quran" && <QuranView onBack={() => setActiveView("home")} language={language} />}
          {activeView === "calendar" && <CalendarView onBack={() => setActiveView("home")} language={language} />}
          {activeView === "qibla" && <QiblaView onBack={() => setActiveView("home")} language={language} />}
          {activeView === "settings" && (
            <SettingsView 
              onBack={() => setActiveView("home")} 
              settings={{ primaryColor, isDarkMode, language }}
              onUpdate={(key, value) => {
                if (key === 'primaryColor') setPrimaryColor(value as string);
                if (key === 'isDarkMode') setIsDarkMode(value as boolean);
                if (key === 'language') setLanguage(value as Language);
              }}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[400px] mx-auto bg-brand-surface/90 backdrop-blur-xl border-t border-brand-border px-6 py-3 flex justify-between items-center z-50">
        <NavButton active={activeView === "home"} icon={<Home size={22} />} label={t.home} onClick={() => setActiveView("home")} />
        <NavButton active={activeView === "dhikr"} icon={<BookOpen size={22} />} label={t.dhikr} onClick={() => setActiveView("dhikr")} />
        <NavButton active={activeView === "subha"} icon={<Fingerprint size={22} />} label={t.subha} onClick={() => setActiveView("subha")} />
        <NavButton active={activeView === "settings"} icon={<Settings size={22} />} label={t.settings} onClick={() => setActiveView("settings")} />
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

const MosqueIcon = ({ size = 18 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M2 20h20" />
    <path d="M7 20v-5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5" />
    <path d="M12 11V7" />
    <path d="M12 7a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4" />
    <path d="M12 7a3 3 0 0 1 3-3 3 3 0 0 1 3 3v4" />
    <circle cx="12" cy="3" r="1" />
  </svg>
);

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
        active ? "text-brand-primary" : "text-text-muted/60"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function DhikrView({ onBack, language }: { onBack: () => void, language: Language }) {
  const t = translations[language];
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  if (activeCategory === "morning" || activeCategory === "evening") {
    return <DhikrDetailView category={activeCategory} onBack={() => setActiveCategory(null)} language={language} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4 pb-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="w-10" />
        <h2 className="text-xl font-bold text-text-main">{t.allDhikr}</h2>
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary border border-brand-border">
          {language === 'ar' ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </button>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        <DhikrListItem 
          title={t.morningDhikr} 
          subtitle="أذكار الصباح اليومية" 
          onClick={() => setActiveCategory("morning")}
        />
        <DhikrListItem 
          title={t.eveningDhikr} 
          subtitle="أذكار المساء اليومية" 
          onClick={() => setActiveCategory("evening")}
        />
        <DhikrListItem 
          title="أذكار الاستيقاظ" 
          subtitle="ما يقوله المسلم عند القيام من النوم" 
        />
        <DhikrListItem 
          title="أذكار الصلاة" 
          subtitle="أدعية الاستفتاح والركوع والسجود" 
        />
        <DhikrListItem 
          title="أذكار النوم" 
          subtitle="ما يقرأه المسلم قبل النوم" 
        />
        <DhikrListItem 
          title="أذكار السفر" 
          subtitle="أدعية السفر والترحال" 
        />
        <DhikrListItem 
          title="أدعية قرآنية" 
          subtitle="أدعية من القرآن الكريم" 
        />
        <DhikrListItem 
          title="أذكار الفرح" 
          subtitle="ما يقوله المسلم عند السرور" 
        />
        <DhikrListItem 
          title="أدعية المريض" 
          subtitle="أدعية الشفاء والرقية" 
        />
      </div>
    </motion.div>
  );
}


function DhikrListItem({ title, subtitle, onClick }: { title: string, subtitle: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-[#0a120e] border border-white/5 rounded-[40px] p-6 flex items-center justify-center text-center hover:bg-[#0f1a14] transition-all group"
    >
      <div className="flex-1">
        <h4 className="text-white font-bold text-lg mb-1">{title}</h4>
        <p className="text-white/50 text-sm">{subtitle}</p>
      </div>
    </button>
  );
}


function DhikrCard({ item, language }: { item: DhikrItem, language: string }) {
  const [currentCount, setCurrentCount] = useState(0);

  const handleIncrement = () => {
    if (currentCount < item.count) {
      setCurrentCount(prev => prev + 1);
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  const handleReset = () => {
    setCurrentCount(0);
  };

  return (
    <div className="bg-[#0a120e] border border-white/5 rounded-[32px] p-6 space-y-6">
      <div className="flex items-center justify-between">
        {item.source && (
          <span className="inline-block px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-bold">
            {item.source}
          </span>
        )}
        <button 
          onClick={handleReset}
          className="p-2 rounded-xl bg-white/5 text-white/20 hover:text-brand-primary transition-colors"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <p className="text-xl leading-relaxed text-right font-medium text-white">
        {item.text}
      </p>
      <div className="flex items-center justify-between pt-6 border-t border-white/5">
        <button 
          onClick={handleIncrement}
          className={cn(
            "px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-3",
            currentCount === item.count 
              ? "bg-brand-primary/10 text-brand-primary/30 cursor-default" 
              : "bg-brand-primary text-brand-dark active:scale-95 shadow-lg shadow-brand-primary/20"
          )}
        >
          <span className="text-sm">{language === 'ar' ? 'التكرار' : (language === 'ru' ? 'Повтор' : 'Repeat')}</span>
          <span className="font-mono text-lg">{currentCount} / {item.count}</span>
        </button>
        <div className="flex gap-3">
          <button className="p-3 rounded-xl bg-white/5 text-white/40 hover:text-brand-primary transition-colors">
            <Copy size={20} />
          </button>
          <button className="p-3 rounded-xl bg-white/5 text-white/40 hover:text-brand-primary transition-colors">
            <Share2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DhikrDetailView({ category, onBack, language }: { category: string, onBack: () => void, language: Language }) {
  const t = translations[language];
  const items = category === "morning" ? MORNING_DHIKR : EVENING_DHIKR;
  const title = category === "morning" ? t.morningDhikr : t.eveningDhikr;

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
          {language === 'ar' ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id}>
            <DhikrCard item={item} language={language} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function QuranView({ onBack, language }: { onBack: () => void, language: Language }) {
  const t = translations[language];
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
          className="w-9 h-9 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary border border-brand-border"
        >
          {language === 'ar' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
        </button>
        <h2 className="text-xl font-bold text-text-main">{t.quran}</h2>
        <button className="w-9 h-9 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary border border-brand-border">
          <Bell size={18} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input 
          type="text" 
          placeholder="ابحث عن سورة، آية أو جزء" 
          className="w-full bg-brand-card/40 border border-brand-border rounded-2xl py-3 px-10 text-sm text-right focus:outline-none focus:border-brand-primary/30 transition-colors"
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
      <div className="flex items-center justify-between border-b border-brand-border px-2">
        <button 
          onClick={() => setActiveTab("surahs")}
          className={cn(
            "pb-3 text-xs font-bold transition-all relative",
            activeTab === "surahs" ? "text-brand-primary" : "text-text-muted/40"
          )}
        >
          السور
          {activeTab === "surahs" && <motion.div layoutId="quran-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />}
        </button>
        <button 
          onClick={() => setActiveTab("juz")}
          className={cn(
            "pb-3 text-xs font-bold transition-all relative",
            activeTab === "juz" ? "text-brand-primary" : "text-text-muted/40"
          )}
        >
          الأجزاء
          {activeTab === "juz" && <motion.div layoutId="quran-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />}
        </button>
        <button 
          onClick={() => setActiveTab("bookmarks")}
          className={cn(
            "pb-3 text-xs font-bold transition-all relative",
            activeTab === "bookmarks" ? "text-brand-primary" : "text-text-muted/40"
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
  const [ayahs, setAyahs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [surahInfo, setSurahInfo] = useState<any>(null);

  useEffect(() => {
    const fetchSurah = async () => {
      try {
        setLoading(true);
        // Fetch both Simple text and Muyassar Tafsir
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}/editions/quran-simple,ar.muyassar`);
        const data = await response.json();
        
        if (data.code === 200) {
          const simpleAyahs = data.data[0].ayahs;
          const tafsirAyahs = data.data[1].ayahs;
          
          const combined = simpleAyahs.map((ayah: any, index: number) => ({
            ...ayah,
            tafsir: tafsirAyahs[index].text
          }));
          
          setSurahInfo(data.data[0]);
          setAyahs(combined);
        }
      } catch (error) {
        console.error("Error fetching surah:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSurah();
  }, [surahId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-brand-dark text-text-main overflow-hidden"
    >
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-brand-border z-20 bg-brand-dark/80 backdrop-blur-md sticky top-0">
        <button onClick={onBack} className="text-text-muted/60 hover:text-brand-primary transition-colors">
          <ArrowRight size={22} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-brand-primary">سورة {surahName}</h2>
          <p className="text-[10px] text-text-muted uppercase tracking-widest">
            {surahInfo?.numberOfAyahs} آيات • {surahInfo?.revelationType === "Meccan" ? "مكية" : "مدنية"}
          </p>
        </div>
        <div className="w-5" />
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scroll-smooth">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-10">
            {/* Basmala */}
            {surahId !== 9 && (
              <div className="text-center py-4">
                <p className="text-3xl font-serif text-text-main/90">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
              </div>
            )}

            {ayahs.map((ayah) => {
              let text = ayah.text;
              // Remove Basmala from the first ayah of all surahs except Al-Fatiha
              if (surahId !== 1 && ayah.numberInSurah === 1) {
                // Use a more inclusive regex that handles both standard Alef and Alef Wasla (ٱ)
                // This targets the specific Basmala pattern returned by the API
                const basmalaRegex = /^بِسْمِ\s+[\u0600-\u06FF\s]*?[ٱا]لرَّحِيمِ\s*/;
                text = text.replace(basmalaRegex, "").trim();
              }
              
              if (!text && ayah.numberInSurah === 1 && surahId !== 9) {
                // If text becomes empty (rare), we might want to show something or handle it
                // But usually there's more text after Basmala in the first ayah
              }
              
              if (!text) return null;

              return (
                <div key={ayah.number} className="space-y-4 group">
                  {/* Ayah Text */}
                  <div className="relative p-6 rounded-3xl bg-brand-surface border border-brand-border group-hover:border-brand-primary/30 transition-all shadow-sm">
                    <div className="absolute -top-3 right-6 bg-brand-primary text-brand-dark text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                      آية {ayah.numberInSurah}
                    </div>
                    
                    <p className="text-2xl leading-[2] text-right font-medium text-text-main/95 font-serif">
                      {text}
                      <span className="inline-flex items-center justify-center mr-3 text-brand-primary/60 font-serif text-xl">
                        ﴿{ayah.numberInSurah}﴾
                      </span>
                    </p>
                  </div>

                  {/* Tafsir (Explanation) */}
                  <div className="pr-6 pl-4 py-2 border-r-2 border-brand-primary/20">
                    <div className="flex items-center gap-2 text-brand-primary mb-2">
                      <Sparkles size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">التفسير الميسر</span>
                    </div>
                    <p className="text-xs leading-relaxed text-text-muted text-right">
                      {ayah.tafsir}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Navigation Buttons at bottom */}
            <div className="pt-10 pb-20 flex items-center justify-between gap-4">
              {onPrevSurah && surahId > 1 && (
                <button 
                  onClick={onPrevSurah}
                  className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl bg-brand-surface border border-brand-border text-xs font-bold hover:bg-brand-hover transition-all"
                >
                  <ChevronRight size={16} />
                  السورة السابقة
                </button>
              )}
              {onNextSurah && surahId < 114 && (
                <button 
                  onClick={onNextSurah}
                  className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl bg-brand-primary text-brand-dark text-xs font-bold hover:opacity-90 transition-all"
                >
                  السورة التالية
                  <ChevronLeft size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SettingsView({ 
  onBack, 
  settings, 
  onUpdate 
}: { 
  onBack: () => void, 
  settings: { primaryColor: string, isDarkMode: boolean, language: Language },
  onUpdate: (key: string, value: string | boolean | number) => void
}) {
  const t = translations[settings.language];
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
      <header className="sticky top-0 z-10 bg-brand-dark/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-brand-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Settings size={18} />
          </div>
          <h1 className="text-lg font-bold text-text-main">{t.settings}</h1>
        </div>
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-brand-hover transition-colors text-text-muted"
        >
          {settings.language === 'ar' ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-6 space-y-8 pt-6">
        {/* Appearance Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-4 bg-brand-primary rounded-full" />
            <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">{t.appearance}</h3>
          </div>
          
          <div className="grid gap-4">
            {/* Color Swatches Card */}
            <div className="p-5 rounded-3xl bg-brand-surface border border-brand-border">
              <div className="flex items-center gap-3 mb-5">
                <Palette size={18} className="text-brand-primary" />
                <span className="text-sm font-bold text-text-main">{t.appColor}</span>
              </div>
              <div className="flex flex-wrap gap-4">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => onUpdate('primaryColor', color.value)}
                    className={cn(
                      "w-12 h-12 rounded-2xl transition-all relative flex items-center justify-center",
                      settings.primaryColor === color.value ? "ring-2 ring-brand-primary ring-offset-4 ring-offset-brand-dark scale-110 shadow-lg" : "hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                  >
                    {settings.primaryColor === color.value && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Dark Mode Card */}
            <button 
              onClick={() => onUpdate('isDarkMode', !settings.isDarkMode)}
              className="p-5 rounded-3xl bg-brand-surface border border-brand-border flex items-center justify-between group hover:border-brand-primary/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
                  {settings.isDarkMode ? <Moon size={22} /> : <Sun size={22} />}
                </div>
                <div className={settings.language === 'ar' ? "text-right" : "text-left"}>
                  <span className="block text-sm font-bold text-text-main">{t.darkMode}</span>
                  <span className="text-[10px] text-text-muted">{t.appearance}</span>
                </div>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full relative transition-colors p-1",
                settings.isDarkMode ? "bg-brand-primary" : "bg-white/10"
              )}>
                <motion.div 
                  animate={{ x: settings.isDarkMode ? (settings.language === 'ar' ? -24 : 24) : 0 }}
                  className="w-4 h-4 rounded-full bg-white shadow-sm" 
                />
              </div>
            </button>
          </div>
        </section>

        {/* Preferences Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-4 bg-brand-primary rounded-full" />
            <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">{t.appLanguage}</h3>
          </div>
          
          <div className="p-5 rounded-3xl bg-brand-surface border border-brand-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Globe size={22} />
              </div>
              <div className={settings.language === 'ar' ? "text-right" : "text-left"}>
                <span className="block text-sm font-bold text-text-main">{t.appLanguage}</span>
                <span className="text-[10px] text-text-muted">{t.search}</span>
              </div>
            </div>
            <select 
              value={settings.language}
              onChange={(e) => onUpdate('language', e.target.value)}
              className="bg-brand-dark/40 border border-brand-border rounded-xl px-4 py-2 text-brand-primary font-bold text-xs outline-none focus:border-brand-primary/30 transition-colors cursor-pointer"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
          </div>
        </section>

        {/* Info Section */}
        <section className="pt-4">
          <div className="p-6 rounded-3xl bg-brand-primary/5 border border-brand-primary/10 text-center">
            <Leaf size={32} className="text-brand-primary mx-auto mb-3 opacity-50" />
            <h4 className="text-sm font-bold text-text-main mb-1">{t.appName}</h4>
            <p className="text-[10px] text-text-muted leading-relaxed">
              {t.welcome}
            </p>
            <p className="text-[9px] text-brand-primary/40 mt-4 font-mono">{t.version} 1.0.0</p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

function SubhaView({ onBack, language }: { onBack: () => void, language: Language }) {
  const t = translations[language];
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
        <h2 className="text-lg font-bold text-text-main">{t.subha}</h2>
        <button onClick={onBack} className="text-brand-primary">
          {language === 'ar' ? <ArrowRight size={22} /> : <ArrowLeft size={22} />}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        {/* Counter Section */}
        <div className="text-center space-y-1">
          <p className="text-[10px] text-brand-primary font-medium">{language === 'ar' ? 'الجلسة الحالية' : (language === 'ru' ? 'Текущая сессия' : 'Current Session')}</p>
          <h3 className="text-7xl font-bold text-text-main tracking-tighter">{count}</h3>
        </div>

        {/* Tap Button */}
        <button 
          onClick={handleTap}
          className="relative w-48 h-48 rounded-full bg-brand-primary flex flex-col items-center justify-center text-brand-dark shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)] active:scale-95 transition-all group"
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

function CalendarView({ onBack, language }: { onBack: () => void, language: Language }) {
  const t = translations[language];
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
          className="w-9 h-9 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary border border-brand-border"
        >
          {language === 'ar' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
        </button>
        <h2 className="text-xl font-bold text-text-main">{t.calendar}</h2>
        <button className="w-9 h-9 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary border border-brand-border">
          <Share2 size={18} />
        </button>
      </div>

      {/* Month Selector */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-8">
          <button className="text-text-muted/40 hover:text-brand-primary transition-colors">
            {language === 'ar' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          <h3 className="text-2xl font-bold text-brand-primary">{language === 'ar' ? 'ذو الحجة 1445 هـ' : (language === 'ru' ? 'Зуль-хиджа 1445 г.х.' : 'Dhul-Hijjah 1445 AH')}</h3>
          <button className="text-text-muted/40 hover:text-brand-primary transition-colors">
            {language === 'ar' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
        <p className="text-[10px] text-text-muted/40 font-medium">{language === 'ar' ? 'يونيو - يوليو 2024 م' : (language === 'ru' ? 'Июнь - Июль 2024 г.' : 'June - July 2024 AD')}</p>
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
                day.active ? "bg-brand-primary text-brand-dark shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]" : "bg-brand-surface border border-brand-border text-text-main"
              )}>
                <span className="text-sm font-bold">{day.h}</span>
              </div>
              <span className={cn("text-[8px] font-medium", day.active ? "text-brand-primary" : "text-text-muted/20")}>{day.g}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="space-y-4">
                <h3 className="text-sm font-bold text-text-main">{t.upcomingEvents}</h3>
        <div className="space-y-3">
          {events.map((event, idx) => (
            <div key={idx} className="glass-card p-4 flex items-center justify-between group hover:bg-brand-hover transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  {event.icon}
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-bold text-text-main mb-0.5">{event.title}</h4>
                  <p className="text-[9px] text-text-muted">{event.date}</p>
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

function QiblaView({ onBack, language }: { onBack: () => void, language: Language }) {
  const t = translations[language];
  const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError(language === 'ar' ? 'الموقع الجغرافي غير مدعوم' : 'Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        
        // Calculate Qibla
        const kaabaLat = 21.42247 * (Math.PI / 180);
        const kaabaLng = 39.82621 * (Math.PI / 180);
        const myLat = latitude * (Math.PI / 180);
        const myLng = longitude * (Math.PI / 180);
        
        const y = Math.sin(kaabaLng - myLng);
        const x = Math.cos(myLat) * Math.tan(kaabaLat) - Math.sin(myLat) * Math.cos(kaabaLng - myLng);
        let qibla = Math.atan2(y, x) * (180 / Math.PI);
        qibla = (qibla + 360) % 360;
        setQiblaDirection(qibla);

        // Calculate Distance (Haversine)
        const R = 6371; // km
        const dLat = kaabaLat - myLat;
        const dLon = kaabaLng - myLng;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(myLat) * Math.cos(kaabaLat) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        setDistance(Math.round(R * c));
      },
      (err) => {
        setError(language === 'ar' ? 'فشل الحصول على الموقع' : 'Failed to get location');
        console.error(err);
      }
    );

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // @ts-ignore
      const heading = e.webkitCompassHeading || (360 - (e.alpha || 0));
      setCompassHeading(heading);
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [language]);

  const isAligned = qiblaDirection !== null && Math.abs((compassHeading + qiblaDirection) % 360) < 5;
  // Note: The rotation logic is: compass rotates -heading, qibla is at qiblaDirection.
  // So when heading == qiblaDirection, the qibla indicator is at 0 (top).
  const relativeQibla = qiblaDirection !== null ? (qiblaDirection - compassHeading + 360) % 360 : 0;
  const aligned = Math.abs(relativeQibla) < 5 || Math.abs(relativeQibla - 360) < 5;

  const requestPermission = () => {
    // @ts-ignore
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      // @ts-ignore
      DeviceOrientationEvent.requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', (e) => {
               // @ts-ignore
              const heading = e.webkitCompassHeading || (360 - (e.alpha || 0));
              setCompassHeading(heading);
            }, true);
          }
        })
        .catch(console.error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-8 pb-10 flex flex-col items-center"
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-brand-surface flex items-center justify-center text-brand-primary border border-brand-border"
        >
          {language === 'ar' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
        </button>
        <h2 className="text-xl font-bold text-text-main">{t.qibla}</h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12 py-8">
        {/* Compass Container */}
        <div className="relative w-72 h-72">
          {/* Outer Ring */}
          <div className={`absolute inset-0 rounded-full border-4 transition-colors duration-500 ${aligned ? 'border-brand-primary shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)]' : 'border-brand-surface shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]'}`} />
          
          {/* Compass Card */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            animate={{ rotate: -compassHeading }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          >
            {/* Cardinal Points */}
            <span className="absolute top-4 font-bold text-brand-primary">N</span>
            <span className="absolute bottom-4 font-bold text-text-muted/40">S</span>
            <span className="absolute right-4 font-bold text-text-muted/40">E</span>
            <span className="absolute left-4 font-bold text-text-muted/40">W</span>
            
            {/* Degree Marks */}
            {[...Array(36)].map((_, i) => (
              <div 
                key={i} 
                className={`absolute w-0.5 ${i % 9 === 0 ? 'h-3 bg-brand-primary' : 'h-1.5 bg-text-muted/20'}`} 
                style={{ transform: `rotate(${i * 10}deg) translateY(-130px)` }} 
              />
            ))}

            {/* Qibla Indicator (Kaaba Icon) */}
            {qiblaDirection !== null && (
              <div 
                className="absolute flex flex-col items-center"
                style={{ transform: `rotate(${qiblaDirection}deg) translateY(-110px)` }}
              >
                <motion.div 
                  animate={{ scale: aligned ? 1.2 : 1 }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-300 ${aligned ? 'bg-brand-primary text-brand-dark' : 'bg-brand-dark text-brand-primary border border-brand-primary/30'}`}
                >
                  <MosqueIcon size={20} />
                </motion.div>
                <div className={`w-1 h-24 mt-2 transition-opacity duration-300 ${aligned ? 'bg-brand-primary opacity-40' : 'bg-brand-primary opacity-10'}`} />
              </div>
            )}
          </motion.div>

          {/* Center Needle (Fixed) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-1 h-32 rounded-full shadow-lg transition-colors duration-300 ${aligned ? 'bg-brand-primary' : 'bg-brand-primary/40'}`} />
            <div className="w-5 h-5 rounded-full bg-brand-primary border-4 border-brand-dark shadow-xl" />
          </div>

          {/* Alignment Glow */}
          {aligned && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full bg-brand-primary blur-3xl -z-10"
            />
          )}
        </div>

        {/* Info & Controls */}
        <div className="text-center space-y-6">
          {error ? (
            <p className="text-red-400 text-sm font-medium bg-red-400/10 px-4 py-2 rounded-lg">{error}</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-text-muted text-[10px] font-bold uppercase tracking-[0.2em]">
                  {language === 'ar' ? 'اتجاه القبلة' : 'Qibla Direction'}
                </p>
                <h3 className={`text-4xl font-bold font-mono transition-colors duration-300 ${aligned ? 'text-brand-primary' : 'text-text-main'}`}>
                  {qiblaDirection ? `${Math.round(qiblaDirection)}°` : '--°'}
                </h3>
              </div>
              
              {distance && (
                <div className="flex items-center justify-center gap-2 text-text-muted/60">
                  <span className="text-xs font-medium">
                    {language === 'ar' ? `تبعد الكعبة ${distance.toLocaleString()} كم` : `${distance.toLocaleString()} km to Kaaba`}
                  </span>
                </div>
              )}

              {aligned && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-brand-primary text-sm font-bold animate-pulse"
                >
                  {language === 'ar' ? 'أنت باتجاه القبلة الآن' : 'You are facing Qibla'}
                </motion.p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button 
              onClick={requestPermission}
              className="px-8 py-3 rounded-2xl bg-brand-primary text-brand-dark text-xs font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all active:scale-95"
            >
              {language === 'ar' ? 'معايرة البوصلة' : 'Calibrate Compass'}
            </button>
            
            {location && (
              <p className="text-[10px] text-text-muted/30 font-mono tracking-widest">
                {location.lat.toFixed(4)}°N / {location.lng.toFixed(4)}°E
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SplashScreen({ progress, language }: { progress: number, language: Language }) {
  const t = translations[language];
  return (
    <div className="flex flex-col h-[100dvh] max-w-[400px] mx-auto bg-brand-dark overflow-hidden relative shadow-2xl items-center justify-between py-16" dir={language === 'ar' ? 'rtl' : 'ltr'}>
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
          <div className="flex items-center justify-center gap-3 text-text-main">
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
            {t.welcome}
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
            <span className="text-text-muted/40">{t.loading}</span>
          </div>
          <div className="w-full h-1 bg-brand-hover rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-brand-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
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
