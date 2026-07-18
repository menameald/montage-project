import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Users, CheckSquare, GraduationCap, Search, Check, X,
  Plus, Edit, Trash, Video, Link, ArrowRight, LogOut, FileText, AlertCircle, Play
} from 'lucide-react';

export default function CoachDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, trainees, reviews, editor
  const [stats, setStats] = useState({ totalTrainees: 0, pendingTasks: 0, totalGraduates: 0, recentSubmissions: [] });
  const [trainees, setTrainees] = useState([]);
  const [searchTrainee, setSearchTrainee] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [expandedTraineeId, setExpandedTraineeId] = useState(null);
  
  // Editor States
  const [editingWeek, setEditingWeek] = useState(null);
  const [newWeekTitle, setNewWeekTitle] = useState('');
  const [newWeekDesc, setNewWeekDesc] = useState('');
  const [newWeekDriveUrl, setNewWeekDriveUrl] = useState('');
  const [newWeekPlaylistUrl, setNewWeekPlaylistUrl] = useState('');
  const [selectedWeekForVideos, setSelectedWeekForVideos] = useState(null);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoDuration, setNewVideoDuration] = useState('');
  const [newVideoYoutube, setNewVideoYoutube] = useState('');

  // Review states
  const [rejectId, setRejectId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchStats();
    fetchTrainees();
    fetchSubmissions();
    fetchWeeks();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/coach/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTrainees = async () => {
    try {
      const res = await fetch(`/api/coach/trainees?search=${searchTrainee}`);
      const data = await res.json();
      setTrainees(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTrainees();
  }, [searchTrainee]);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/coach/submissions');
      const data = await res.json();
      setSubmissions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWeeks = async () => {
    try {
      const res = await fetch('/api/weeks');
      const data = await res.json();
      setWeeks(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Submission Review Functions
  const handleReviewTask = async (id, status, reason = '') => {
    try {
      const res = await fetch(`/api/coach/submissions/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason: reason })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }
      setRejectId(null);
      setRejectionReason('');
      fetchStats();
      fetchSubmissions();
    } catch (err) {
      alert(err.message);
    }
  };

  // Week Editor Functions
  const handleAddWeek = async () => {
    if (!newWeekTitle) return;
    try {
      const res = await fetch('/api/weeks/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newWeekTitle,
          description: newWeekDesc,
          taskMaterialsUrl: newWeekDriveUrl,
          playlistUrl: newWeekPlaylistUrl
        })
      });
      if (res.ok) {
        setNewWeekTitle('');
        setNewWeekDesc('');
        setNewWeekDriveUrl('');
        setNewWeekPlaylistUrl('');
        fetchWeeks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWeek = async (weekNumber) => {
    if (!window.confirm(`هل أنت متأكد من حذف الأسبوع ${weekNumber} بالكامل؟ سيتم إعادة ترتيب باقي الأسابيع.`)) return;
    try {
      const res = await fetch(`/api/weeks/manage/${weekNumber}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchWeeks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditWeek = (week) => {
    setEditingWeek(week);
    setNewWeekTitle(week.title);
    setNewWeekDesc(week.description);
    setNewWeekDriveUrl(week.taskMaterialsUrl);
    setNewWeekPlaylistUrl(week.playlistUrl);
  };

  const handleSaveWeekEdit = async () => {
    if (!editingWeek) return;
    try {
      const res = await fetch(`/api/weeks/manage/${editingWeek.weekNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newWeekTitle,
          description: newWeekDesc,
          taskMaterialsUrl: newWeekDriveUrl,
          playlistUrl: newWeekPlaylistUrl
        })
      });
      if (res.ok) {
        setEditingWeek(null);
        setNewWeekTitle('');
        setNewWeekDesc('');
        setNewWeekDriveUrl('');
        setNewWeekPlaylistUrl('');
        fetchWeeks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Video Management Inside Week
  const handleAddVideo = async () => {
    if (!selectedWeekForVideos || !newVideoTitle || !newVideoYoutube) return;
    
    const week = weeks.find(w => w.weekNumber === selectedWeekForVideos);
    if (!week) return;

    const newVideo = {
      id: `vid_${selectedWeekForVideos}_${Date.now()}`,
      title: newVideoTitle,
      duration: newVideoDuration || '05:00',
      youtubeUrl: newVideoYoutube
    };

    const updatedVideos = [...(week.videos || []), newVideo];

    try {
      const res = await fetch(`/api/weeks/manage/${selectedWeekForVideos}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos: updatedVideos })
      });
      if (res.ok) {
        setNewVideoTitle('');
        setNewVideoDuration('');
        setNewVideoYoutube('');
        fetchWeeks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVideo = async (weekNumber, videoId) => {
    if (!window.confirm('هل تريد حذف هذا الدرس التعليمي؟')) return;
    const week = weeks.find(w => w.weekNumber === weekNumber);
    if (!week) return;

    const updatedVideos = week.videos.filter(v => v.id !== videoId);

    try {
      const res = await fetch(`/api/weeks/manage/${weekNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos: updatedVideos })
      });
      if (res.ok) {
        fetchWeeks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-cairo">
      
      {/* NAVBAR */}
      <header className="bg-stone-950 border-b border-stone-850 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-md">لوحة تحكم الكوتش مينا 👑</h1>
              <p className="text-[10px] text-amber-400">مشرف عام صناع المحتوى والمونتاج</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 rounded-xl transition-all text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" /> تسجيل خروج
          </button>
        </div>
      </header>

      {/* DASHBOARD TAB TOGGLER */}
      <nav className="bg-stone-950 border-b border-stone-850 px-4">
        <div className="max-w-6xl mx-auto flex gap-4 overflow-x-auto py-2">
          {[
            { id: 'overview', label: 'نظرة عامة 📊', icon: TrendingUp },
            { id: 'trainees', label: 'فريق المتدربين 👥', icon: Users },
            { id: 'reviews', label: 'مراجعة التاسكات 🎯', icon: CheckSquare },
            { id: 'editor', label: 'محرر المنهج ✍️', icon: Edit }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setEditingWeek(null); }}
                className={`py-2 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-1">
        
        {/* ========================================== */}
        {/* TAB 1: OVERVIEW                            */}
        {/* ========================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'إجمالي المتدربين المسجلين', val: stats.totalTrainees, color: 'text-blue-400', icon: Users },
                { label: 'تاسكات بانتظار المراجعة والتدقيق', val: stats.pendingTasks, color: 'text-amber-400', icon: CheckSquare, animate: true },
                { label: 'إجمالي المتخرجين الناجحين', val: stats.totalGraduates, color: 'text-emerald-400', icon: GraduationCap }
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div key={idx} className="glass-panel p-6 rounded-3xl border border-stone-850 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-500 block">{card.label}</span>
                      <span className={`text-4xl font-black block mt-2 ${card.color}`}>
                        {card.val}
                      </span>
                    </div>
                    <div className={`p-4 rounded-2xl bg-stone-900 text-stone-400 border border-stone-800 ${card.animate ? 'animate-bounce' : ''}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Tasks List */}
            <div className="glass-panel p-6 rounded-3xl border border-stone-850 space-y-4">
              <h3 className="font-extrabold text-sm text-stone-400 flex items-center gap-2">
                <CheckSquare className="w-4.5 h-4.5 text-amber-500" /> التاسكات الأخيرة المعلقة بانتظار موافقتك
              </h3>

              <div className="divide-y divide-stone-850">
                {stats.recentSubmissions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-600">كل شيء تمام كوتش! لا توجد تاسكات معلقة حالياً 😎🙌</div>
                ) : (
                  stats.recentSubmissions.map((sub) => (
                    <div key={sub.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{sub.userName}</span>
                          <span className="text-[10px] bg-stone-800 text-stone-400 font-bold px-2 py-0.5 rounded-full border border-stone-750">
                            الأسبوع {sub.weekNumber}
                          </span>
                        </div>
                        <p className="text-stone-500 text-xs mt-1">تاريخ الرفع: {new Date(sub.submittedAt).toLocaleDateString('ar-EG')} - {new Date(sub.submittedAt).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>

                      <button
                        onClick={() => setActiveTab('reviews')}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 self-start sm:self-auto transition-all"
                      >
                        مراجعة الآن <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: TRAINEES LIST                       */}
        {/* ========================================== */}
        {activeTab === 'trainees' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
              <h3 className="font-extrabold text-sm text-stone-400">فريق المتدربين المسجلين ({trainees.length})</h3>
              
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  placeholder="بحث سريع باسم المتدرب..."
                  value={searchTrainee}
                  onChange={(e) => setSearchTrainee(e.target.value)}
                  className="w-full pl-4 pr-9 py-2 bg-stone-950 border border-stone-850 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 rounded-xl text-xs text-stone-100 placeholder-stone-600 transition-all outline-none"
                />
              </div>
            </div>

            {/* Trainees Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trainees.length === 0 ? (
                <div className="col-span-3 py-12 text-center text-xs text-stone-600">لا يوجد متدربين مطابقين للبحث.</div>
              ) : (
                trainees.map((t) => {
                  const isExpanded = expandedTraineeId === t.id;
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => setExpandedTraineeId(isExpanded ? null : t.id)}
                      className="glass-panel p-5 rounded-3xl border border-stone-850 space-y-3 relative overflow-hidden cursor-pointer hover:border-amber-500/30 transition-all select-none"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-extrabold text-sm text-white">{t.name}</h4>
                          <span className="text-[10px] text-stone-500">منذ {new Date(t.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                        
                        {/* Level Tag */}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          t.level === 'beginner' 
                            ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' 
                            : t.level === 'intermediate'
                              ? 'bg-amber-500/5 text-amber-400 border-amber-500/20'
                              : 'bg-red-500/5 text-red-400 border-red-500/20'
                        }`}>
                          {t.level === 'beginner' ? 'مبتدئ' : t.level === 'intermediate' ? 'متوسط' : 'متقدم'}
                        </span>
                      </div>

                      <div className="border-t border-stone-850 pt-2.5 flex items-center justify-between text-xs">
                        <span className="text-stone-400 font-semibold">المستوى التدريبي المفتوح:</span>
                        {t.currentWeek > 4 ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">🏆 خريج ناجح</span>
                        ) : (
                          <span className="text-amber-400 font-bold">الأسبوع {t.currentWeek}</span>
                        )}
                      </div>

                      {/* Expandable Course Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            onClick={(e) => e.stopPropagation()} // Prevent closing card when clicking links
                            className="border-t border-stone-850 pt-3 mt-2 space-y-2 text-xs"
                          >
                            <span className="font-bold text-amber-400 block mb-1 text-[10px]">تفاصيل وتقدم مسار المتدرب:</span>
                            <div className="space-y-2">
                              {weeks.map((wk) => {
                                // Find submission for this student and this week
                                const sub = submissions.find(s => s.userId === t.id && s.weekNumber === wk.weekNumber);
                                const isCurrent = wk.weekNumber === t.currentWeek;
                                const isLocked = wk.weekNumber > t.currentWeek;
                                
                                let statusText = "مغلق 🔒";
                                let statusColor = "text-stone-600";
                                let videoLink = null;
                                
                                if (sub) {
                                  videoLink = sub.submissionUrl;
                                  if (sub.status === 'approved') {
                                    statusText = "تم قبول التاسك ✅";
                                    statusColor = "text-emerald-400 font-bold";
                                  } else if (sub.status === 'pending') {
                                    statusText = "تاسك قيد المراجعة ⏳";
                                    statusColor = "text-amber-400 font-bold";
                                  } else if (sub.status === 'rejected') {
                                    statusText = `مرفوض للتعديل ❌`;
                                    statusColor = "text-red-400";
                                  }
                                } else {
                                  if (isCurrent) {
                                    statusText = "يجري العمل عليه حالياً 📖";
                                    statusColor = "text-blue-400 font-bold animate-pulse";
                                  } else if (isLocked) {
                                    statusText = "مغلق 🔒";
                                    statusColor = "text-stone-600";
                                  } else {
                                    statusText = "تخطاه بنجاح 👍";
                                    statusColor = "text-emerald-500/70";
                                  }
                                }

                                return (
                                  <div key={wk.weekNumber} className="flex justify-between items-start py-1 border-b border-stone-900 last:border-b-0">
                                    <div className="max-w-[75%]">
                                      <span className="font-semibold text-stone-200 block text-[11px] leading-tight">
                                        الأسبوع {wk.weekNumber}: {wk.title}
                                      </span>
                                      <span className={`text-[10px] block mt-0.5 ${statusColor}`}>{statusText}</span>
                                      {sub && sub.status === 'rejected' && sub.rejectionReason && (
                                        <span className="text-[9px] text-stone-500 block leading-tight mt-0.5 bg-stone-950 p-1.5 rounded">
                                          توجيه الكوتش: {sub.rejectionReason}
                                        </span>
                                      )}
                                    </div>
                                    {videoLink && (
                                      <a
                                        href={videoLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[9px] bg-stone-950 border border-stone-850 hover:border-stone-700 text-stone-300 hover:text-amber-400 px-2 py-0.5 rounded transition-all shrink-0"
                                      >
                                        الفيديو 🔗
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!isExpanded && (
                        <div className="text-center pt-1 text-[9px] text-stone-500 font-medium">
                          اضغط لعرض تفاصيل تقدم الكورس 🔍
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: SUBMISSIONS REVIEW                  */}
        {/* ========================================== */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <h3 className="font-extrabold text-sm text-stone-400">التاسكات المرفوعة من المتدربين للمراجعة</h3>

            <div className="space-y-4">
              {submissions.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-600 bg-stone-950/20 border border-stone-900 rounded-3xl">لا توجد تسليمات مسجلة في قاعدة البيانات حالياً.</div>
              ) : (
                submissions.map((sub) => {
                  const isPending = sub.status === 'pending';
                  const isRejectingThis = rejectId === sub.id;

                  return (
                    <div key={sub.id} className="glass-panel p-6 rounded-3xl border border-stone-850 space-y-4">
                      {/* Sub Header */}
                      <div className="flex justify-between items-start flex-col sm:flex-row gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-md">{sub.userName}</h4>
                            <span className="text-[10px] bg-stone-800 text-stone-400 font-bold px-2 py-0.5 rounded-full border border-stone-750">
                              الأسبوع {sub.weekNumber}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-500">تم التسليم: {new Date(sub.submittedAt).toLocaleDateString('ar-EG')} - {new Date(sub.submittedAt).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>

                        {/* Status Badge */}
                        <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                          sub.status === 'pending'
                            ? 'bg-amber-500/5 text-amber-400 border-amber-500/20'
                            : sub.status === 'approved'
                              ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/5 text-red-400 border-red-500/20'
                        }`}>
                          {sub.status === 'pending' ? 'قيد المراجعة ⏳' : sub.status === 'approved' ? 'مقبول ومجتاز 🎉' : 'مرفوض للتعديل ❌'}
                        </span>
                      </div>

                      {/* Sub Body / Notes */}
                      <div className="p-4 bg-stone-950/40 border border-stone-850 rounded-2xl space-y-3">
                        <div className="text-xs">
                          <span className="font-bold text-stone-400 block mb-1">ملاحظات الطالب وهندسة الصوت:</span>
                          <p className="text-stone-300 leading-relaxed">{sub.notes || "لا توجد ملاحظات مكتوبة."}</p>
                        </div>
                        
                        <div className="pt-2 border-t border-stone-900 flex justify-between items-center text-xs">
                          <span className="text-stone-400 font-semibold">رابط الفيديو المنجز:</span>
                          <a
                            href={sub.submissionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/5 border border-amber-500/10 px-3 py-1 rounded-lg hover:bg-amber-500/10 transition-all"
                          >
                            مشاهدة الفيديو المرفوع <Link className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Rejection comments from history */}
                      {sub.status === 'rejected' && sub.rejectionReason && (
                        <div className="p-3 bg-red-500/5 border border-red-500/10 text-red-400 text-xs rounded-xl flex items-start gap-1.5">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-bold block">ملاحظات الرفض السابقة:</span>
                            <p className="mt-1">{sub.rejectionReason}</p>
                          </div>
                        </div>
                      )}

                      {/* Review Buttons (Only if pending) */}
                      {isPending && (
                        <div className="space-y-4 pt-2">
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleReviewTask(sub.id, 'approved')}
                              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4" /> موافقة وترقية للأسبوع التالي 👍🚀
                            </button>
                            <button
                              onClick={() => { setRejectId(isRejectingThis ? null : sub.id); setRejectionReason(''); }}
                              className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              <X className="w-4 h-4" /> رفض وإعادته للأسبوع الأول 👎🫣
                            </button>
                          </div>

                          {/* Rejection Feed Drawer */}
                          <AnimatePresence>
                            {isRejectingThis && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 bg-stone-950 p-4 rounded-2xl border border-red-500/20"
                              >
                                <label className="block text-xs font-bold text-red-400">لماذا تم رفض الفيديو؟ اكتب توجيهات التعديل بوضوح 🛠️</label>
                                <textarea
                                  rows="3"
                                  placeholder="اكتب التوجيهات بالتفصيل هنا (مثال: محتاج تظبط القطع في الثانية 12 وتعدل ليفل الصوت...)"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  className="w-full px-3 py-2 bg-stone-900 border border-stone-800 focus:border-red-500/60 focus:ring-1 focus:ring-red-500/60 rounded-xl text-stone-100 placeholder-stone-600 text-xs transition-all outline-none resize-none"
                                ></textarea>
                                
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => { setRejectId(null); setRejectionReason(''); }}
                                    className="px-3 py-1.5 bg-stone-850 hover:bg-stone-800 text-stone-400 rounded-xl text-[11px] font-bold transition-all"
                                  >
                                    إلغاء
                                  </button>
                                  <button
                                    onClick={() => handleReviewTask(sub.id, 'rejected', rejectionReason)}
                                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-bold transition-all"
                                  >
                                    تأكيد الرفض والإرجاع للأسبوع الأول 🔥
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: CURRICULUM WEEKS EDITOR             */}
        {/* ========================================== */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT EDITOR BOX: Form to Add/Edit Weeks (5 cols) */}
            <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-stone-850 space-y-4 sticky top-24">
              <h3 className="font-extrabold text-sm text-stone-400 flex items-center gap-1.5">
                {editingWeek ? <Edit className="w-4 h-4 text-amber-400" /> : <Plus className="w-4 h-4 text-amber-400" />}
                <span>{editingWeek ? `تعديل الأسبوع ${editingWeek.weekNumber}` : 'إضافة أسبوع تدريبي جديد'}</span>
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 mb-1.5">عنوان الأسبوع التدريبي</label>
                  <input
                    type="text"
                    placeholder="مثال: أساسيات تصحيح الألوان..."
                    value={newWeekTitle}
                    onChange={(e) => setNewWeekTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-850 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 rounded-xl text-stone-100 placeholder-stone-600 text-xs transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 mb-1.5">وصف الأسبوع التدريبي</label>
                  <textarea
                    rows="3"
                    placeholder="اكتب أهداف الأسبوع التدريبي والدروس بوضوح..."
                    value={newWeekDesc}
                    onChange={(e) => setNewWeekDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-850 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 rounded-xl text-stone-100 placeholder-stone-600 text-xs transition-all outline-none resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 mb-1.5">رابط مجلد Google Drive (مواد العمل)</label>
                  <input
                    type="url"
                    placeholder="ضع رابط جوجل درايف لتحميل الفيديوهات الخام..."
                    value={newWeekDriveUrl}
                    onChange={(e) => setNewWeekDriveUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-850 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 rounded-xl text-stone-100 placeholder-stone-600 text-xs transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 mb-1.5">رابط قائمة تشغيل يوتيوب (اختياري)</label>
                  <input
                    type="url"
                    placeholder="ضع رابط يوتيوب لسهولة الوصول..."
                    value={newWeekPlaylistUrl}
                    onChange={(e) => setNewWeekPlaylistUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-850 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 rounded-xl text-stone-100 placeholder-stone-600 text-xs transition-all outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  {editingWeek ? (
                    <>
                      <button
                        onClick={handleSaveWeekEdit}
                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs transition-all"
                      >
                        حفظ التعديلات ✅
                      </button>
                      <button
                        onClick={() => {
                          setEditingWeek(null);
                          setNewWeekTitle('');
                          setNewWeekDesc('');
                          setNewWeekDriveUrl('');
                          setNewWeekPlaylistUrl('');
                        }}
                        className="px-4 py-2.5 bg-stone-850 hover:bg-stone-800 text-stone-400 font-bold rounded-xl text-xs transition-all"
                      >
                        إلغاء
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleAddWeek}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> إضافة الأسبوع التدريبي المذكور
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT EDITOR BOX: Weeks List and Video Sub-manager (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <h3 className="font-extrabold text-sm text-stone-400 px-1">الأسابيع الحالية وتعديل محتوى الدروس</h3>

              <div className="space-y-4">
                {weeks.map((week) => {
                  const isSelectedForVids = selectedWeekForVideos === week.weekNumber;

                  return (
                    <div key={week.weekNumber} className="glass-panel p-5 rounded-3xl border border-stone-850 space-y-4">
                      {/* Week Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">الأسبوع {week.weekNumber}</span>
                          <h4 className="font-bold text-white text-md mt-0.5">{week.title}</h4>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEditWeek(week)}
                            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-850 transition-all"
                            title="تعديل تفاصيل الأسبوع"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteWeek(week.weekNumber)}
                            className="p-1.5 text-stone-500 hover:text-red-400 rounded-lg hover:bg-stone-850 transition-all"
                            title="حذف الأسبوع بالكامل"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Materials Info */}
                      <div className="text-xs space-y-1 bg-stone-950/40 p-3 rounded-xl border border-stone-900">
                        <p className="text-stone-500 font-light leading-relaxed">{week.description || 'لا يوجد وصف مضاف.'}</p>
                        <div className="pt-2 border-t border-stone-900 flex flex-wrap gap-x-4 text-[10px]">
                          {week.taskMaterialsUrl ? (
                            <a href={week.taskMaterialsUrl} target="_blank" rel="noreferrer" className="text-amber-500 hover:underline inline-flex items-center gap-1 font-semibold">
                              <Link className="w-3 h-3" /> مجلد الماتريال (Drive)
                            </a>
                          ) : (
                            <span className="text-stone-600 inline-flex items-center gap-1">
                              <Link className="w-3 h-3" /> لا يوجد رابط ماتريال
                            </span>
                          )}
                          {week.playlistUrl && (
                            <a href={week.playlistUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1 font-semibold">
                              <Link className="w-3 h-3" /> قائمة يوتيوب
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Video Lessons Block */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] text-stone-400 font-bold">الدروس التعليمية داخل الأسبوع: ({week.videos?.length || 0})</span>
                          <button
                            onClick={() => setSelectedWeekForVideos(isSelectedForVids ? null : week.weekNumber)}
                            className="text-[10px] text-amber-400 font-bold hover:underline"
                          >
                            {isSelectedForVids ? 'إغلاق محرر الدروس ×' : 'إدارة الدروس والفيديوهات 📹'}
                          </button>
                        </div>

                        {/* List Videos */}
                        <div className="space-y-1.5">
                          {week.videos && week.videos.length > 0 ? (
                            week.videos.map((vid) => (
                              <div key={vid.id} className="p-2.5 rounded-xl bg-stone-950 border border-stone-900 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                  <Video className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                  <div>
                                    <span className="text-white font-bold block">{vid.title}</span>
                                    <span className="text-[9px] text-stone-500 font-semibold block">المدة: {vid.duration} | <a href={vid.youtubeUrl} target="_blank" rel="noreferrer" className="text-amber-500/70 hover:underline">رابط يوتيوب 🔗</a></span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteVideo(week.weekNumber, vid.id)}
                                  className="text-stone-600 hover:text-red-400 p-1"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="text-center p-3 text-[10px] text-stone-600 bg-stone-950/20 border border-stone-900 border-dashed rounded-xl">لا توجد دروس شرح داخل هذا الأسبوع حالياً.</div>
                          )}
                        </div>

                        {/* Add Video Drawer */}
                        <AnimatePresence>
                          {isSelectedForVids && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 p-4 bg-stone-950 border border-stone-850 rounded-2xl space-y-3"
                            >
                              <div className="text-[10px] font-bold text-amber-400">إضافة درس جديد للأسبوع {week.weekNumber} 📹</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  placeholder="عنوان الدرس المطور..."
                                  value={newVideoTitle}
                                  onChange={(e) => setNewVideoTitle(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs placeholder-stone-600 outline-none text-white focus:border-amber-500/60"
                                />
                                <input
                                  type="text"
                                  placeholder="مدة الشرح (مثال: 08:30)..."
                                  value={newVideoDuration}
                                  onChange={(e) => setNewVideoDuration(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs placeholder-stone-600 outline-none text-white focus:border-amber-500/60"
                                />
                              </div>
                              <input
                                type="url"
                                placeholder="رابط الدرس على يوتيوب..."
                                value={newVideoYoutube}
                                onChange={(e) => setNewVideoYoutube(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs placeholder-stone-600 outline-none text-white focus:border-amber-500/60"
                              />

                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setSelectedWeekForVideos(null)}
                                  className="px-3 py-1 bg-stone-850 hover:bg-stone-800 text-stone-400 rounded-lg text-[10px] font-bold"
                                >
                                  إلغاء
                                </button>
                                <button
                                  onClick={handleAddVideo}
                                  className="px-4 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-lg text-[10px] font-bold"
                                >
                                  حفظ الدرس
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </main>

      <footer className="bg-stone-950 border-t border-stone-850 py-4 text-center text-xs text-stone-500 mt-auto">
        منصة تدريب فريق الرؤية للإنتاج المرئي 🎬 © {new Date().getFullYear()} - بوابة المشرف
      </footer>
    </div>
  );
}
