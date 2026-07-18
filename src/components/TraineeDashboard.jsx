import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Lock, Play, ExternalLink, Download, Send, 
  Bell, CheckCircle2, XCircle, Award, Printer, LogOut, BookOpen, AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function TraineeDashboard({ user, onLogout }) {
  const [weeks, setWeeks] = useState([]);
  const [activeWeekNum, setActiveWeekNum] = useState(1);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch Weeks, Submissions and Notifications
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchNotifications, 10000); // Poll notifications every 10s
    return () => clearInterval(interval);
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch Weeks
      const wRes = await fetch('/api/weeks');
      const wData = await wRes.json();
      setWeeks(wData);

      // Set first unlocked or current week as active
      if (user.currentWeek <= wData.length) {
        setActiveWeekNum(user.currentWeek);
      } else {
        setActiveWeekNum(1); // Default
      }

      // Fetch Submissions
      const subRes = await fetch('/api/coach/submissions');
      const subData = await subRes.json();
      // Filter for this user
      const userSubs = subData.filter(s => s.userId === user.id);
      setSubmissions(userSubs);

      // Fetch Notifications
      await fetchNotifications();
    } catch (err) {
      console.error("Error fetching trainee data:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/trainee/notifications/${user.id}`);
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Countdown Timer to Friday 11:59:59 PM
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextFriday = new Date();
      
      // Friday is day 5. Calculate days until next Friday
      const currentDay = now.getDay();
      let daysToAdd = (5 - currentDay + 7) % 7;
      
      // If today is Friday, check if we passed 23:59:59
      if (daysToAdd === 0) {
        const todayDeadline = new Date();
        todayDeadline.setHours(23, 59, 59, 999);
        if (now > todayDeadline) {
          daysToAdd = 7; // Next week's Friday
        }
      }
      
      nextFriday.setDate(now.getDate() + daysToAdd);
      nextFriday.setHours(23, 59, 59, 999);
      
      const difference = nextFriday - now;
      
      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Celebrate Graduation!
  useEffect(() => {
    if (user.currentWeek > 4) {
      // Fire confetti multiple times for graduation feel!
      const duration = 4 * 1000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#f59e0b', '#3b82f6']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#f59e0b', '#3b82f6']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  }, [user.currentWeek]);

  // 4. Mark notifications as read
  const handleMarkNotificationsRead = async () => {
    try {
      await fetch('/api/trainee/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Submit Task
  const handleSubmitTask = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitting(true);

    if (!submissionUrl) {
      setSubmitError('برجاء إدخال رابط التاسك (Google Drive أو YouTube) ⚠️');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/trainee/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          weekNumber: activeWeekNum,
          submissionUrl,
          notes
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء تسليم المهمة.');
      }

      setSubmitSuccess('تم إرسال التاسك للكوتش مينا بنجاح! 🚀🔥 تابع إشعاراتك للتقييم.');
      setSubmissionUrl('');
      setNotes('');
      fetchData(); // Refresh submissions list
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeWeek = weeks.find(w => w.weekNumber === activeWeekNum);
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  // Helper to extract youtube ID
  const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      return url; // fallback if already an embed link or invalid
    }
    return `https://www.youtube.com/embed/${videoId}`;
  };

  // Render Graduation Certificate Screen if they reached week 5 (i.e. completed 4 weeks)
  if (user.currentWeek > 4) {
    return (
      <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-between p-6">
        {/* Navigation */}
        <header className="flex justify-between items-center max-w-6xl w-full mx-auto mb-8 border-b border-stone-850 pb-4">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-400" />
            <h1 className="text-xl font-bold text-white">بوابة التخرج والشهادات 🎓</h1>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white rounded-xl transition-all text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" /> خروج
          </button>
        </header>

        {/* Certificate Container */}
        <main className="flex-1 flex flex-col items-center justify-center max-w-6xl w-full mx-auto gap-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            id="certificate-print"
            className="w-full max-w-4xl aspect-[1.414/1] bg-stone-950 border-[16px] border-double border-amber-500/40 p-12 rounded-3xl shadow-2xl relative flex flex-col justify-between overflow-hidden text-center text-stone-100 print:border-amber-600 print:text-black"
          >
            {/* Background design elements */}
            <div className="absolute -top-1/4 -right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none print:hidden"></div>
            <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none print:hidden"></div>

            {/* Corner Frames */}
            <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-amber-500/50 rounded-tr-md"></div>
            <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-amber-500/50 rounded-tl-md"></div>
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-amber-500/50 rounded-br-md"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-amber-500/50 rounded-bl-md"></div>

            {/* Header */}
            <div>
              <div className="text-amber-400 font-bold text-lg tracking-widest uppercase mb-1">شهادة تخرج واجتياز</div>
              <div className="text-stone-500 text-xs tracking-wider uppercase font-semibold">Vision Team Production</div>
              <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto mt-3"></div>
            </div>

            {/* Body */}
            <div className="space-y-6">
              <p className="text-stone-400 text-sm italic font-light print:text-stone-600">يسر منصة فريق الرؤية وتحت إشراف الكوتش مينا أن تشهد بأن البطل:</p>
              <h2 className="text-4xl font-extrabold text-white tracking-wide border-b border-stone-850 pb-2 inline-block px-12 print:text-stone-900 print:border-stone-300">
                {user.name}
              </h2>
              <p className="text-stone-300 text-sm max-w-xl mx-auto leading-relaxed print:text-stone-800">
                قد أكمل بنجاح المسار التدريبي والعملي المكثف في صناعة المحتوى، هندسة الصوت، والمونتاج الإبداعي. واجتاز كافة الاختبارات والتاسكات الأسبوعية الأربعة تحت التدقيق والمراجعة المباشرة بكفاءة واحترافية عالية.
              </p>
            </div>

            {/* Footer / Signatures */}
            <div className="flex justify-between items-end px-10 pt-4">
              <div className="text-right">
                <div className="text-xs text-stone-500">تاريخ التخرج</div>
                <div className="text-sm font-semibold text-stone-300 print:text-black">
                  {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <Award className="w-16 h-16 text-amber-400/80 mb-2 print:text-amber-600" />
                <span className="text-[10px] text-stone-500 font-mono tracking-widest">VERIFIED GRADUATE</span>
              </div>
              <div className="text-left">
                <div className="text-xs text-stone-500">توقيع كوتش التدريب</div>
                <div className="font-serif italic text-lg text-amber-400 mt-1 print:text-amber-700" style={{ fontFamily: 'Georgia, serif' }}>
                  Mina_Coach
                </div>
                <div className="text-[11px] font-bold text-stone-400 mt-1 print:text-stone-700">مينا (فريق الرؤية)</div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-900/10"
            >
              <Printer className="w-5 h-5" /> طباعة الشهادة أو حفظ كـ PDF 🖨️
            </button>
          </div>
        </main>

        <footer className="text-center text-xs text-stone-600 max-w-6xl w-full mx-auto mt-8 border-t border-stone-850 pt-4">
          منصة تدريب فريق الرؤية - فخورين بمسيرتك وبداية رحلتك الاحترافية يا بطل! 🎓🔥
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      {/* HEADER NAVBAR */}
      <header className="bg-stone-950 border-b border-stone-850 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-md">تدريب فريق الرؤية 🎬</h1>
              <p className="text-[10px] text-stone-400">متدرب: {user.name} ({user.level === 'beginner' ? 'مبتدئ 🟢' : user.level === 'intermediate' ? 'متوسط 🟡' : 'متقدم 🔴'})</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) handleMarkNotificationsRead();
                }}
                className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-all border border-stone-800"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="absolute left-0 mt-2 w-80 bg-stone-950 border border-stone-800 rounded-2xl shadow-xl z-40 overflow-hidden"
                  >
                    <div className="p-3 border-b border-stone-850 flex justify-between items-center bg-stone-900/40">
                      <span className="font-bold text-xs text-white">الإشعارات والتنبيهات 🔔</span>
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className="text-[10px] text-stone-500 hover:text-stone-300"
                      >
                        إغلاق
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-stone-850">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-stone-600">لا توجد إشعارات حالياً.</div>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className={`p-4 transition-all text-right ${!notif.isRead ? 'bg-emerald-500/5' : ''}`}>
                            <div className="font-bold text-xs text-white flex items-center justify-between">
                              <span>{notif.title}</span>
                              <span className="text-[9px] text-stone-500 font-light">
                                {new Date(notif.createdAt).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 rounded-xl transition-all text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" /> تسجيل خروج
            </button>
          </div>
        </div>
      </header>

      {/* COUNTDOWN TIMER HERO PANEL */}
      <section className="bg-gradient-to-b from-stone-950 to-stone-900 border-b border-stone-850 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-right">
            <h2 className="text-lg font-bold text-white flex items-center justify-center md:justify-start gap-2">
              <Clock className="w-5 h-5 text-emerald-400 animate-spin" /> العد التنازلي للتسليم الأسبوعي ⏳
            </h2>
            <p className="text-xs text-stone-400 mt-1">آخر موعد لإرسال مهمتك الحالية هو يوم الجمعة الساعة 11:59 مساءً</p>
          </div>

          {/* Countdown Clock */}
          <div className="flex gap-3 text-center">
            {[
              { label: 'أيام', val: countdown.days, color: 'text-emerald-400' },
              { label: 'ساعات', val: countdown.hours, color: 'text-white' },
              { label: 'دقائق', val: countdown.minutes, color: 'text-white' },
              { label: 'ثواني', val: countdown.seconds, color: 'text-amber-400' }
            ].map((unit, idx) => (
              <div key={idx} className="w-16 py-2 px-1 bg-stone-950 border border-stone-850 rounded-xl shadow-inner">
                <span className={`text-xl font-black block tracking-widest ${unit.color}`}>
                  {String(unit.val).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-stone-500 font-bold block">{unit.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: WEEKS MAP (4 columns width) */}
        <section className="lg:col-span-4 space-y-4">
          <h3 className="font-bold text-sm text-stone-400 flex items-center gap-2 px-1">
            <Calendar className="w-4 h-4 text-emerald-500" /> مسارك التدريبي الأسبوعي
          </h3>

          <div className="space-y-3">
            {weeks.map((week) => {
              const isUnlocked = week.weekNumber <= user.currentWeek;
              const isActive = week.weekNumber === activeWeekNum;
              
              return (
                <button
                  key={week.weekNumber}
                  onClick={() => isUnlocked && setActiveWeekNum(week.weekNumber)}
                  disabled={!isUnlocked}
                  className={`w-full text-right p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                    isActive 
                      ? 'bg-emerald-500/10 border-emerald-500/40 glow-emerald' 
                      : isUnlocked 
                        ? 'bg-stone-950/40 border-stone-850 hover:bg-stone-900/60 hover:border-stone-700' 
                        : 'bg-stone-950/20 border-stone-900 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isActive ? 'text-emerald-400' : 'text-stone-500'}`}>
                      الأسبوع {week.weekNumber}
                    </span>
                    <span className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors block">
                      {week.title}
                    </span>
                  </div>

                  <div>
                    {!isUnlocked ? (
                      <Lock className="w-4 h-4 text-stone-600" />
                    ) : (
                      <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-400 animate-ping' : 'bg-stone-600'}`}></div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* RIGHT COLUMN: WEEK DETAILS, VIDEOS, SUBMISSION (8 columns width) */}
        <section className="lg:col-span-8 space-y-6">
          {activeWeek ? (
            <motion.div
              key={activeWeek.weekNumber}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Week Intro */}
              <div className="glass-panel rounded-3xl p-6 border border-stone-850">
                <h2 className="text-xl font-extrabold text-white mb-2">
                  {activeWeek.title}
                </h2>
                <p className="text-stone-400 text-xs leading-relaxed">
                  {activeWeek.description}
                </p>
                
                {/* Playlist Link (if available) */}
                {activeWeek.playlistUrl && (
                  <a
                    href={activeWeek.playlistUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 mt-4 border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 rounded-xl hover:bg-emerald-500/10 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> مشاهدة قائمة التشغيل بالكامل على يوتيوب 🎬
                  </a>
                )}
              </div>

              {/* Video Lessons Section */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-stone-400 px-1">الدروس التعليمية المتاحة 📹</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeWeek.videos && activeWeek.videos.length > 0 ? (
                    activeWeek.videos.map((vid) => (
                      <button
                        key={vid.id}
                        onClick={() => setSelectedVideo(vid)}
                        className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between group ${
                          selectedVideo?.id === vid.id
                            ? 'bg-stone-900 border-emerald-500/40'
                            : 'bg-stone-950/40 border-stone-850 hover:border-stone-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="font-bold text-xs text-white block group-hover:text-emerald-400 transition-colors">
                            {vid.title}
                          </span>
                          <span className="text-[10px] text-stone-500 block font-semibold">
                            المدة: {vid.duration} دقيقة
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-stone-900 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-400 group-hover:text-stone-950 transition-all border border-stone-800">
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-2 py-6 text-center text-xs text-stone-600 bg-stone-950/20 border border-stone-900 rounded-2xl">
                      لا توجد فيديوهات شرح مرفوعة لهذا الأسبوع بعد.
                    </div>
                  )}
                </div>

                {/* Embedded Video Player */}
                <AnimatePresence>
                  {selectedVideo && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="glass-panel rounded-3xl p-4 border border-stone-800 space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <Play className="w-3.5 h-3.5 fill-current" /> مشغل الفيديو المدمج: {selectedVideo.title}
                        </span>
                        <button
                          onClick={() => setSelectedVideo(null)}
                          className="text-[10px] text-stone-500 hover:text-stone-300"
                        >
                          إغلاق المشغل ×
                        </button>
                      </div>
                      
                      <div className="aspect-video w-full rounded-2xl overflow-hidden border border-stone-850 bg-black">
                        <iframe
                          width="100%"
                          height="100%"
                          src={getYoutubeEmbedUrl(selectedVideo.youtubeUrl)}
                          title={selectedVideo.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Task Details & Materials */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Google Drive Materials (5 cols) */}
                <div className="md:col-span-5 glass-panel rounded-3xl p-5 border border-stone-850 space-y-4 flex flex-col justify-between h-full min-h-[220px]">
                  <div>
                    <h4 className="font-extrabold text-white text-xs mb-1">مواد التدريب والتطبيق 📦</h4>
                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      حمل ملفات الفيديو الخام والسكربت والمؤثرات الصوتية الخاصة بتطبيق هذا الأسبوع من رابط جوجل درايف للبدء بالعمل.
                    </p>
                  </div>
                  
                  {activeWeek.taskMaterialsUrl ? (
                    <a
                      href={activeWeek.taskMaterialsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> تحميل ملفات التاسك ⬇️
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 bg-stone-850 text-stone-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      رابط المواد غير متاح حالياً ⏳
                    </button>
                  )}
                </div>

                {/* Submit Task Box (7 cols) */}
                <div className="md:col-span-7 glass-panel rounded-3xl p-6 border border-stone-850 space-y-4">
                  <div>
                    <h4 className="font-extrabold text-white text-xs mb-1">صندوق تسليم التاسك 🚀</h4>
                    <p className="text-[11px] text-stone-400">
                      ارفع لقطتك النهائية أو الفيديو على Google Drive أو YouTube وضع الرابط وملاحظاتك بالأسفل.
                    </p>
                  </div>

                  {/* Submission Status Alert */}
                  {submissions.some(s => s.weekNumber === activeWeek.weekNumber) && (
                    <div className="p-3 bg-stone-900 border border-stone-850 rounded-xl space-y-2">
                      {submissions
                        .filter(s => s.weekNumber === activeWeek.weekNumber)
                        .map((sub) => (
                          <div key={sub.id} className="text-xs">
                            <span className="font-semibold text-stone-400">حالة التسليم السابق: </span>
                            {sub.status === 'pending' && (
                              <span className="text-amber-400 font-bold">قيد الانتظار والمراجعة ⏳</span>
                            )}
                            {sub.status === 'approved' && (
                              <span className="text-emerald-400 font-bold">مقبول ومجتاز 🎉</span>
                            )}
                            {sub.status === 'rejected' && (
                              <div className="space-y-1 mt-1">
                                <span className="text-red-400 font-bold block">مرفوض للتعديل ❌</span>
                                <span className="text-stone-500 text-[10px] leading-relaxed block bg-stone-950 p-2 rounded-lg border border-stone-900">
                                  توجيهات الكوتش: {sub.rejectionReason}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  <form onSubmit={handleSubmitTask} className="space-y-3">
                    {submitError && (
                      <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{submitError}</span>
                      </div>
                    )}
                    {submitSuccess && (
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{submitSuccess}</span>
                      </div>
                    )}

                    <div>
                      <input
                        type="url"
                        required
                        placeholder="رابط الفيديو (Drive أو YouTube)..."
                        value={submissionUrl}
                        onChange={(e) => setSubmissionUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-850 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 rounded-xl text-stone-100 placeholder-stone-600 text-xs transition-all outline-none"
                      />
                    </div>

                    <div>
                      <textarea
                        rows="2"
                        placeholder="ملاحظاتك الإبداعية، هندسة الصوت والبرودكشن..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-850 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 rounded-xl text-stone-100 placeholder-stone-600 text-xs transition-all outline-none resize-none"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-gradient-to-l from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-stone-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>إرسال التاسك للكوتش مينا 🚀🔥</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

              </div>
            </motion.div>
          ) : (
            <div className="py-12 text-center text-stone-600">
              برجاء الانتظار، جاري تحميل الدروس والتفاصيل...
            </div>
          )}
        </section>

      </main>

      <footer className="bg-stone-950 border-t border-stone-850 py-4 text-center text-xs text-stone-500 mt-auto">
        منصة تدريب فريق الرؤية للإنتاج المرئي 🎬 © {new Date().getFullYear()} - كوتش مينا
      </footer>
    </div>
  );
}
