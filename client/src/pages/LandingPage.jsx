import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { usePWA } from '../context/PWAContext.jsx';
import { ArrowRight, Clock, ShieldCheck, Milestone } from 'lucide-react';

const LandingPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isInstalled } = usePWA();

  // If launched/opened in Farmer PWA standalone mode, do not render Landing Page
  if (isInstalled) {
    return <Navigate to={user?.role === 'farmer' ? '/farmer' : '/login'} replace />;
  }

  return (
    <div className="bg-gradient-to-b from-[#f4fbf4] via-white to-[#f8faf7] dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-150">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            <div className="col-span-7 space-y-6 text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
                {t('heroTitle1')} <br />
                <span className="text-green-600 dark:text-emerald-400">{t('heroTitle2')}</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl leading-relaxed">
                {t('heroSubtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {user ? (
                  <Link
                    to={user.role === 'farmer' ? '/farmer' : user.role === 'operator' ? '/operator' : '/admin'}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-bold rounded-full text-white bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-md transition"
                  >
                    {t('goToDashboard')} <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-bold rounded-full text-white bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-md transition cursor-pointer"
                    >
                      🌾 {t('registerAsFarmer')} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                    <Link
                      to="/register-centre"
                      className="inline-flex items-center justify-center px-5 py-3 border border-green-300 dark:border-emerald-800 text-sm font-bold rounded-full text-green-800 dark:text-emerald-300 bg-green-50 dark:bg-emerald-950/50 hover:bg-green-100 dark:hover:bg-emerald-900/50 shadow-xs transition cursor-pointer"
                    >
                      🏛️ {t('registerAsProcurementCentre')}
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 dark:border-gray-700 text-sm font-bold rounded-full text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition cursor-pointer"
                    >
                      {t('login')} / {t('trackMyToken')}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Visual Art/Illustration Card */}
            <div className="col-span-5 mt-12 lg:mt-0 relative flex justify-center">
              <div className="w-80 h-80 sm:w-96 sm:h-96 rounded-3xl bg-green-100 dark:bg-emerald-950/40 flex flex-col justify-between p-8 border border-green-200 dark:border-emerald-800/80 shadow-xl overflow-hidden text-left relative">
                <div className="absolute top-0 right-0 p-10 bg-green-200/50 dark:bg-emerald-900/30 rounded-bl-full -z-0"></div>
                <div className="relative z-10 space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm inline-block border border-green-100 dark:border-emerald-900/60">
                    <span className="text-4xl">🌾</span>
                  </div>
                  <h3 className="text-xl font-bold text-green-900 dark:text-emerald-200 leading-snug">{t('appName')} {t('appSubtitle')}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-green-800 dark:text-emerald-300 bg-white/70 dark:bg-gray-900/70 px-3 py-1.5 rounded-lg border border-green-100/50 dark:border-emerald-900/40">
                      <span className="h-2 w-2 rounded-full bg-green-600 dark:bg-emerald-400 animate-ping"></span>
                      <span>{t('estWaitTime')}: <b>12 {t('minutes')}</b></span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-green-800 dark:text-emerald-300 bg-white/70 dark:bg-gray-900/70 px-3 py-1.5 rounded-lg border border-green-100/50 dark:border-emerald-900/40">
                      <span>🎟️ {t('tokenNumber')}: <b>KQ-124</b></span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-green-200/80 dark:border-emerald-800/80 pt-4 flex items-center justify-between text-green-800 dark:text-emerald-300 text-xs font-bold relative z-10">
                  <span>{t('thCentre')}: Kharadi Mandi</span>
                  <span className="bg-green-600 dark:bg-emerald-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider text-4xs">{t('low')} {t('crowdLevel')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white dark:bg-gray-900 border-y border-green-50 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">{t('howItWorksTitle')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">{t('whyChooseSubtitle')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12 text-left">
            <div className="bg-[#f8faf7] dark:bg-gray-800/80 p-6 rounded-2xl border border-green-50 dark:border-gray-700/60 shadow-2xs">
              <span className="text-2xl p-3 bg-green-100 dark:bg-emerald-950/70 rounded-xl inline-block text-green-800 dark:text-emerald-300 mb-4">📱</span>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('step1Title')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                {t('step1Desc')}
              </p>
            </div>

            <div className="bg-[#f8faf7] dark:bg-gray-800/80 p-6 rounded-2xl border border-green-50 dark:border-gray-700/60 shadow-2xs">
              <span className="text-2xl p-3 bg-green-100 dark:bg-emerald-950/70 rounded-xl inline-block text-green-800 dark:text-emerald-300 mb-4">🎟️</span>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('step2Title')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                {t('step2Desc')}
              </p>
            </div>

            <div className="bg-[#f8faf7] dark:bg-gray-800/80 p-6 rounded-2xl border border-green-50 dark:border-gray-700/60 shadow-2xs">
              <span className="text-2xl p-3 bg-green-100 dark:bg-emerald-950/70 rounded-xl inline-block text-green-800 dark:text-emerald-300 mb-4">⚖️</span>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('step3Title')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                {t('step3Desc')}
              </p>
            </div>

            <div className="bg-[#f8faf7] dark:bg-gray-800/80 p-6 rounded-2xl border border-green-50 dark:border-gray-700/60 shadow-2xs">
              <span className="text-2xl p-3 bg-green-100 dark:bg-emerald-950/70 rounded-xl inline-block text-green-800 dark:text-emerald-300 mb-4">💳</span>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('step4Title')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                {t('step4Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Innovation Differentiators */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">{t('whyChooseTitle')}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{t('whyChooseSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 text-left">
            <div className="flex space-x-4">
              <div className="bg-green-100 dark:bg-emerald-950/80 p-2.5 rounded-lg text-green-700 dark:text-emerald-300 h-10 w-10 flex-shrink-0 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-100">{t('feature1Title')}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                  {t('feature1Desc')}
                </p>
              </div>
            </div>

            <div className="flex space-x-4">
              <div className="bg-green-100 dark:bg-emerald-950/80 p-2.5 rounded-lg text-green-700 dark:text-emerald-300 h-10 w-10 flex-shrink-0 flex items-center justify-center">
                <Milestone className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-100">{t('feature2Title')}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                  {t('feature2Desc')}
                </p>
              </div>
            </div>

            <div className="flex space-x-4">
              <div className="bg-green-100 dark:bg-emerald-950/80 p-2.5 rounded-lg text-green-700 dark:text-emerald-300 h-10 w-10 flex-shrink-0 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-100">{t('feature3Title')}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                  {t('feature3Desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-950 dark:bg-black text-green-200 dark:text-emerald-300 py-12 border-t border-green-900/60 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-sm font-bold tracking-wider uppercase text-green-400 dark:text-emerald-400">
            🌾 {t('appName')} – {t('appSubtitle')}
          </p>
          <p className="text-xs text-green-300/70 dark:text-emerald-400/60 max-w-md mx-auto leading-relaxed">
            {t('ctaSubtitle')}
          </p>
          <div className="border-t border-green-900/60 dark:border-gray-900 pt-6 text-5xs text-green-400/50 dark:text-emerald-500/40">
            &copy; 2026 {t('appName')}. {t('allRightsReserved')}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
