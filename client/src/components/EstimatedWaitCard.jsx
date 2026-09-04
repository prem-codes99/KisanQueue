import React from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Clock, Users, Hash, ShieldCheck, Activity } from 'lucide-react';

const EstimatedWaitCard = ({ queueData, loading, bookingStatus }) => {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border-2 border-green-200 dark:border-emerald-900/60 shadow-md animate-pulse space-y-4 text-left transition-colors">
        <div className="flex justify-between items-center">
          <span className="h-4 w-32 bg-green-100 dark:bg-emerald-950 rounded-md"></span>
          <span className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded-md"></span>
        </div>
        <div className="h-10 w-48 bg-green-100/70 dark:bg-emerald-950/70 rounded-xl"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="h-14 bg-gray-50 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-14 bg-gray-50 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-14 bg-gray-50 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-14 bg-gray-50 dark:bg-gray-800 rounded-xl"></div>
        </div>
        <div className="text-4xs text-gray-400 dark:text-gray-500 font-medium pt-1">
          {t('calculatingWait')}
        </div>
      </div>
    );
  }

  // Format last updated time
  const formatTime = (isoString) => {
    if (!isoString) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const isServing = queueData?.status === 'SERVING' || bookingStatus === 'PROCESSING';
  const isCompleted = queueData?.status === 'COMPLETED' || bookingStatus === 'COMPLETED';
  const isAvailable = Boolean(queueData);

  const estimatedWaitMins = queueData?.estimatedWaitTime;
  const position = queueData?.position;
  const farmersAhead = queueData?.farmersAhead !== undefined ? queueData.farmersAhead : (position ? Math.max(0, position - 1) : 0);
  const activeCounters = queueData?.activeCounters || 2;
  const queueStatus = queueData?.queueStatus || (estimatedWaitMins > 35 ? 'CRITICAL' : estimatedWaitMins > 15 ? 'MODERATE' : 'NORMAL');
  const lastUpdatedTime = formatTime(queueData?.lastUpdated);

  // Status visual badge
  const renderStatusBadge = () => {
    if (!isAvailable) {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full text-3xs">
          {t('calculatingWait')}
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 font-extrabold text-green-800 dark:text-emerald-300 bg-green-100 dark:bg-emerald-950/80 border border-green-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-3xs">
          ✓ {t('statusCompletedText')}
        </span>
      );
    }
    if (isServing) {
      return (
        <span className="inline-flex items-center gap-1 font-extrabold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 px-2.5 py-0.5 rounded-full text-3xs animate-pulse">
          🟢 {t('statusServingText')}
        </span>
      );
    }
    if (queueStatus === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 font-extrabold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-800 px-2.5 py-0.5 rounded-full text-3xs">
          🔴 {t('statusCriticalText')}
        </span>
      );
    }
    if (queueStatus === 'MODERATE') {
      return (
        <span className="inline-flex items-center gap-1 font-extrabold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full text-3xs">
          🟡 {t('statusModerateText')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-extrabold text-green-800 dark:text-emerald-300 bg-green-100 dark:bg-emerald-950/80 border border-green-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-3xs">
        🟢 {t('statusNormalText')}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border-2 border-green-200 dark:border-emerald-900/60 shadow-md space-y-4 text-left transition-colors hover:shadow-lg">
      
      {/* Header bar */}
      <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 bg-green-100 dark:bg-emerald-950/80 text-green-700 dark:text-emerald-400 rounded-lg">
            <Clock className="h-4 w-4" />
          </span>
          <h3 className="font-extrabold text-xs sm:text-sm text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            {t('estimatedWaitCardTitle')}
          </h3>
        </div>
        <div className="flex items-center space-x-1.5 text-4xs font-bold text-gray-400 dark:text-gray-500">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
          <span>{t('lastUpdatedLabel')}: <b>{lastUpdatedTime}</b></span>
        </div>
      </div>

      {/* Main Wait Callout */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50/60 dark:from-emerald-950/50 dark:to-green-950/40 p-4 rounded-2xl border border-green-100 dark:border-emerald-900/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span className="text-4xs uppercase font-extrabold text-green-700 dark:text-emerald-400 tracking-wider block">
            {t('estimatedWaitCardTitle')}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-green-900 dark:text-emerald-200 mt-0.5 flex items-baseline gap-1.5">
            {!isAvailable ? (
              <span className="text-lg text-gray-500 dark:text-gray-400">{t('calculatingWait')}</span>
            ) : isServing ? (
              <span className="text-xl sm:text-2xl text-green-700 dark:text-emerald-400 font-extrabold">{t('atCounterText')}</span>
            ) : isCompleted ? (
              <span className="text-xl sm:text-2xl text-green-700 dark:text-emerald-400 font-extrabold">{t('statusCompletedText')}</span>
            ) : (
              <>
                <span>{estimatedWaitMins}</span>
                <span className="text-sm sm:text-base font-bold text-green-700 dark:text-emerald-400">{t('minutes')}</span>
              </>
            )}
          </div>
        </div>

        <div>
          {renderStatusBadge()}
        </div>
      </div>

      {/* 4-Item Information Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
        
        {/* Queue Position */}
        <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center space-x-1 text-gray-400 dark:text-gray-400 mb-1">
            <Hash className="h-3 w-3 text-green-600 dark:text-emerald-400" />
            <span className="text-4xs uppercase font-bold tracking-wider">{t('queuePositionLabel')}</span>
          </div>
          <span className="text-sm sm:text-base font-black text-gray-900 dark:text-gray-100 block">
            {!isAvailable ? t('calculatingWait') : isCompleted ? '-' : isServing ? '#1' : `#${position}`}
          </span>
        </div>

        {/* Farmers Ahead */}
        <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center space-x-1 text-gray-400 dark:text-gray-400 mb-1">
            <Users className="h-3 w-3 text-amber-500 dark:text-amber-400" />
            <span className="text-4xs uppercase font-bold tracking-wider">{t('farmersAheadLabel')}</span>
          </div>
          <span className="text-sm sm:text-base font-black text-gray-900 dark:text-gray-100 block">
            {!isAvailable ? t('calculatingWait') : isCompleted || isServing ? '0' : farmersAhead}
          </span>
        </div>

        {/* Active Counters */}
        <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center space-x-1 text-gray-400 dark:text-gray-400 mb-1">
            <ShieldCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span className="text-4xs uppercase font-bold tracking-wider">{t('activeCountersLabel')}</span>
          </div>
          <span className="text-sm sm:text-base font-black text-gray-900 dark:text-gray-100 block">
            {!isAvailable ? t('calculatingWait') : activeCounters}
          </span>
        </div>

        {/* Current Status */}
        <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center space-x-1 text-gray-400 dark:text-gray-400 mb-1">
            <Activity className="h-3 w-3 text-purple-600 dark:text-purple-400" />
            <span className="text-4xs uppercase font-bold tracking-wider">{t('currentQueueStatusLabel')}</span>
          </div>
          <div className="mt-0.5">
            {renderStatusBadge()}
          </div>
        </div>

      </div>
    </div>
  );
};

export default EstimatedWaitCard;
