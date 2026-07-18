import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Film, ShieldAlert, Sparkles, User, KeyRound, Award } from 'lucide-react';

export default function Auth({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [isCoachMode, setIsCoachMode] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('beginner'); // beginner, intermediate, advanced
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let endpoint = '/api/auth/login';
      let payload = { name };

      if (isCoachMode) {
        payload.passcode = passcode;
        payload.isCoach = true;
      } else if (isRegister) {
        endpoint = '/api/auth/register';
        payload.level = level;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ ما، يرجى المحاولة لاحقاً.');
      }

      // Successfully authenticated
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-stone-950">
      {/* Background visual accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
            <Film className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            تدريب فريق الرؤية 🎬
          </h1>
          <p className="mt-2 text-stone-400 text-sm">
            المنصة التفاعلية الرسمية لصناعة المحتوى والمونتاج 🚀
          </p>
        </div>

        {/* Auth Panel */}
        <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-stone-800">
          {/* Top Toggles */}
          <div className="flex border-b border-stone-800 pb-4 mb-6">
            {!isCoachMode ? (
              <>
                <button
                  onClick={() => { setIsRegister(false); setError(''); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    !isRegister ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => { setIsRegister(true); setError(''); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    isRegister ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  انضم كمتدرب جديد
                </button>
              </>
            ) : (
              <div className="w-full text-center py-2 text-sm font-bold text-amber-400 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" /> بوابة الكوتش مينا 👑
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-start gap-2"
              >
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Full Name Input */}
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-2">
                {isCoachMode ? 'الاسم التعريفي للكوتش' : 'الاسم الكامل باللغة العربية (ثنائي أو ثلاثي)'}
              </label>
              <div className="relative">
                <User className="absolute right-3.5 top-3 w-5 h-5 text-stone-500" />
                <input
                  type="text"
                  required
                  placeholder={isCoachMode ? 'مينا' : 'اكتب اسمك الحقيقي هنا..'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 bg-stone-900 border border-stone-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 rounded-xl text-stone-100 placeholder-stone-600 transition-all outline-none"
                />
              </div>
            </div>

            {/* Trainee Level Selection (only on Register) */}
            {!isCoachMode && isRegister && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="block text-xs font-semibold text-stone-400">
                  حدد مستواك الحالي في المونتاج 🛠️
                </label>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { key: 'beginner', label: 'مبتدئ 🟢', class: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5' },
                    { key: 'intermediate', label: 'متوسط 🟡', class: 'border-amber-500/40 text-amber-400 bg-amber-500/5' },
                    { key: 'advanced', label: 'متقدم 🔴', class: 'border-red-500/40 text-red-400 bg-red-500/5' }
                  ].map((lvl) => (
                    <button
                      key={lvl.key}
                      type="button"
                      onClick={() => setLevel(lvl.key)}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all ${
                        level === lvl.key
                          ? `${lvl.class} ring-2 ring-offset-2 ring-offset-stone-950 ring-stone-500`
                          : 'border-stone-800 text-stone-400 hover:border-stone-700 bg-stone-900/40'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Passcode (only for Coach Mode) */}
            {isCoachMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="block text-xs font-semibold text-amber-400 mb-1">
                  رمز المرور الخاص بالكوتش 🔑
                </label>
                <div className="relative">
                  <KeyRound className="absolute right-3.5 top-3 w-5 h-5 text-amber-500/60" />
                  <input
                    type="password"
                    required
                    placeholder="أدخل الرمز السري هنا..."
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full pl-4 pr-11 py-2.5 bg-stone-900 border border-stone-800 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 rounded-xl text-stone-100 placeholder-stone-600 transition-all outline-none"
                  />
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                isCoachMode
                  ? 'bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 shadow-amber-900/20'
                  : 'bg-gradient-to-l from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-stone-950 shadow-emerald-900/20'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></div>
              ) : isCoachMode ? (
                <>
                  <Award className="w-5 h-5" />
                  <span>دخول الكوتش مينا 🚀</span>
                </>
              ) : isRegister ? (
                <>
                  <Flame className="w-5 h-5" />
                  <span>إنشاء الحساب وبدء التدريب 🚀🔥</span>
                </>
              ) : (
                <>
                  <Film className="w-5 h-5" />
                  <span>دخول لمتابعة التدريب 🎬</span>
                </>
              )}
            </button>
          </form>

          {/* Alternative Toggle (Coach vs Trainee) */}
          <div className="mt-6 pt-4 border-t border-stone-800 flex justify-between text-xs">
            <button
              onClick={() => {
                setIsCoachMode(!isCoachMode);
                setError('');
                setName('');
                setPasscode('');
              }}
              className="text-stone-500 hover:text-amber-400 transition-all font-semibold"
            >
              {isCoachMode ? '← الدخول كمتدرب عادي' : '👑 الدخول ككوتش مينا'}
            </button>

            {!isCoachMode && (
              <span className="text-stone-600">
                {isRegister ? 'لديك حساب بالفعل؟' : 'متدرب جديد؟'}
                <button
                  onClick={() => { setIsRegister(!isRegister); setError(''); }}
                  className="mr-1 text-emerald-400 hover:underline font-semibold"
                >
                  {isRegister ? 'سجل دخولك' : 'سجل الآن'}
                </button>
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
