import React from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { AlertTriangle, Clock, Users, Flame, ChevronRight } from 'lucide-react';

const RealTimeQueueAlert = ({ liveQueue, activeBooking }) => {
  const { t } = useLanguage();

  if (!liveQueue) return null;

  const waitTime = liveQueue.estimatedWaitTime || 0;
  const queueStatus = liveQueue.queueStatus || 'NORMAL';
  const position = liveQueue.position || 1;
  const isHighCongestion = queueStatus === 'CRITICAL' || waitTime >= 30 || liveQueue.congestion === 'HIGH';

  // Automatically hide or remove alert when queue returns to normal
  if (!isHighCongestion) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-3xl p-4 sm:p-5 text-white shadow-lg border-2 border-amber-300 relative overflow-hidden transition-all duration-300 animate-fadeIn text-left">
      
      {/* Background ambient decorative glow */}
      <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/20 rounded-full blur-xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left: Warning Title and Message */}
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-white/20 backdrop-blur-xs rounded-xl inline-flex items-center justify-center animate-bounce">
              <AlertTriangle className="h-4 w-4 text-yellow-200" />
            </span>
            <span className="text-3xs uppercase font-black tracking-wider bg-black/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-white/20">
              {t('liveQueueAlertBadge')}
            </span>
            <span className="text-xs sm:text-sm font-black tracking-tight text-yellow-100 flex items-center gap-1">
              ⚠️ {t('queueGettingCrowdedTitle')}
            </span>
          </div>

          <p className="text-xs sm:text-sm font-bold text-white leading-snug">
            {t('yourEstimatedWaitIsNow')} <span className="underline decoration-yellow-300 font-black text-yellow-200">{waitTime} {t('minutes')}</span>.
          </p>

          <p className="text-3xs sm:text-2xs text-amber-100 font-medium">
            {t('queueExperiencingHighCongestion')}
          </p>
        </div>

        {/* Right: 3 Live Metric Badges */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          
          {/* Position */}
          <div className="bg-black/25 backdrop-blur-xs border border-white/20 px-3 py-2 rounded-2xl flex-1 sm:flex-none text-center sm:text-left">
            <span className="text-4xs uppercase font-bold text-amber-200 block">{t('queuePositionLabel')}</span>
            <span className="text-sm sm:text-base font-black text-white flex items-center justify-center sm:justify-start gap-1">
              <Users className="h-3.5 w-3.5 text-amber-300" />
              #{position}
            </span>
          </div>

          {/* Estimated Wait */}
          <div className="bg-black/25 backdrop-blur-xs border border-white/20 px-3 py-2 rounded-2xl flex-1 sm:flex-none text-center sm:text-left">
            <span className="text-4xs uppercase font-bold text-amber-200 block">{t('estWaitTime')}</span>
            <span className="text-sm sm:text-base font-black text-white flex items-center justify-center sm:justify-start gap-1">
              <Clock className="h-3.5 w-3.5 text-yellow-300" />
              ~{waitTime} {t('minutes')}
            </span>
          </div>

          {/* Congestion Level */}
          <div className="bg-black/25 backdrop-blur-xs border border-white/20 px-3 py-2 rounded-2xl flex-1 sm:flex-none text-center sm:text-left">
            <span className="text-4xs uppercase font-bold text-amber-200 block">{t('congestionLevelLabel')}</span>
            <span className="text-xs sm:text-sm font-black text-yellow-200 uppercase flex items-center justify-center sm:justify-start gap-1">
              <Flame className="h-3.5 w-3.5 text-red-300 animate-pulse" />
              🔴 {t('congestionHigh')}
            </span>
          </div>

        </div>

      </div>

    </div>
  );
};

export default RealTimeQueueAlert;
