import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Sparkles, Users, Clock, AlertTriangle, ArrowRight, CheckCircle2, Star } from 'lucide-react';
import io from 'socket.io-client';

const SmartQueueAdvisor = ({ centreId, selectedDate, onSelectBestSlot }) => {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [advisorData, setAdvisorData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdvisor = async () => {
    if (!token) return;
    try {
      const url = centreId 
        ? `/api/slots/advisor?centreId=${centreId}${selectedDate ? `&date=${selectedDate}` : ''}`
        : `/api/slots/advisor${selectedDate ? `?date=${selectedDate}` : ''}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAdvisorData(data.data);
      } else {
        setAdvisorData(null);
      }
    } catch (err) {
      console.error(err);
      setAdvisorData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisor();
  }, [token, centreId, selectedDate]);

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    const socket = io(window.location.origin);
    if (centreId) {
      socket.emit('joinCentre', centreId.toString());
    }

    socket.on('queueUpdated', () => {
      fetchAdvisor();
    });
    socket.on('bottlenecksUpdated', () => {
      fetchAdvisor();
    });

    return () => {
      socket.disconnect();
    };
  }, [centreId]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-green-50/50 dark:from-gray-900 dark:to-gray-800/70 rounded-3xl p-6 border-2 border-green-200 dark:border-gray-700 shadow-md animate-pulse space-y-4 text-left">
        <div className="flex justify-between items-center">
          <div className="h-4 w-40 bg-green-100 dark:bg-gray-800 rounded-md"></div>
          <div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded-md"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="h-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl"></div>
          <div className="h-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl"></div>
          <div className="h-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl"></div>
          <div className="h-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!advisorData) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm text-left">
        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-xs font-bold">{t('smartQueueAdvisorTitle')}</span>
        </div>
        <p className="text-3xs text-gray-400 dark:text-gray-500 mt-2">{t('estimateUnavailable')}</p>
      </div>
    );
  }

  const {
    centreName,
    currentQueue,
    congestionLevel,
    predictedPeakPeriod,
    recommendedSlot,
    bestTimeToVisit,
    expectedWaitTime
  } = advisorData;

  const bestSlot = bestTimeToVisit || recommendedSlot;

  const renderCongestionBadge = (level) => {
    if (level === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 font-extrabold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-2.5 py-0.5 rounded-full text-4xs">
          🔴 {t('highCrowd') || t('congestionHigh')}
        </span>
      );
    }
    if (level === 'MODERATE') {
      return (
        <span className="inline-flex items-center gap-1 font-extrabold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full text-4xs">
          🟡 {t('moderateCrowd') || t('congestionModerate')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-extrabold text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-950/60 border border-green-200 dark:border-green-800 px-2.5 py-0.5 rounded-full text-4xs">
        🟢 {t('lowCrowd') || t('congestionLow')}
      </span>
    );
  };

  return (
    <div className="bg-gradient-to-br from-white via-[#fafdf9] to-emerald-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20 rounded-3xl p-5 sm:p-6 border-2 border-green-200 dark:border-green-900/60 shadow-md space-y-5 text-left transition hover:shadow-lg">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-green-100/70 dark:border-gray-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <span className="p-2 bg-green-600 text-white rounded-xl shadow-xs">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>{t('smartQueueAdvisorTitle')}</span>
              <span className="text-3xs font-semibold px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded-full border border-green-200 dark:border-green-800">
                AI Mandi Engine
              </span>
            </h3>
            <p className="text-4xs text-gray-500 dark:text-gray-400">{centreName || t('smartQueueAdvisorSubtitle')}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-4xs font-bold text-gray-400 dark:text-gray-400">{t('currentCongestionLevel')}:</span>
          {renderCongestionBadge(congestionLevel)}
        </div>
      </div>

      {/* Featured "⭐ Best Time to Visit" Recommendation Block */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-700 dark:from-emerald-700 dark:to-green-800 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white font-extrabold text-3xs uppercase tracking-wider backdrop-blur-xs">
            <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" />
            <span>{t('bestTimeToVisitTitle')}</span>
          </div>

          {bestSlot ? (
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 mt-1">
                <span>{bestSlot.startTime} - {bestSlot.endTime}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-2xs sm:text-xs font-semibold mt-1.5 text-emerald-100">
                <span className="bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-400/30 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-emerald-300" />
                  <span>{t('expectedWaitPrefix')}: <b>{bestSlot.predictedWaitTime} {t('minutes')}</b></span>
                </span>
                
                <span className="bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-400/30 font-bold">
                  {bestSlot.congestion === 'LOW' ? `🟢 ${t('lowCrowd')}` :
                   bestSlot.congestion === 'MODERATE' ? `🟡 ${t('moderateCrowd')}` :
                   `🔴 ${t('highCrowd')}`}
                </span>
              </div>

              <p className="text-3xs text-emerald-100/90 font-medium italic pt-1 flex items-center gap-1">
                <span>💡</span> {t('avoidPeakHoursTip')}
              </p>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-sm font-bold text-white">{t('noSlotsAvailable')}</p>
              <p className="text-3xs text-emerald-200">{t('estimateUnavailable')}</p>
            </div>
          )}
        </div>

        {bestSlot && (
          <div className="z-10 self-stretch sm:self-auto flex items-center">
            {onSelectBestSlot ? (
              <button
                type="button"
                onClick={() => onSelectBestSlot(bestSlot._id)}
                className="w-full sm:w-auto px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{t('confirm')}</span>
                <ArrowRight className="h-4 w-4 text-emerald-700" />
              </button>
            ) : (
              <Link
                to="/farmer/book"
                className="w-full sm:w-auto px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>{t('bookOptimalSlot')}</span>
                <ArrowRight className="h-4 w-4 text-emerald-700" />
              </Link>
            )}
          </div>
        )}

        {/* Ambient background decoration */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* 3 Secondary Operational Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        
        {/* 1. Current Yard Queue */}
        <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-2xl border border-green-100 dark:border-gray-700 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-gray-400 dark:text-gray-400 mb-1">
            <Users className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <span className="text-4xs uppercase font-bold tracking-wider">{t('currentYardQueue')}</span>
          </div>
          <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white block">
            {currentQueue} <span className="text-3xs font-medium text-gray-500 dark:text-gray-400">{t('farmersWaiting')}</span>
          </span>
        </div>

        {/* 2. Predicted Peak Period */}
        <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-2xl border border-green-100 dark:border-gray-700 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-gray-400 dark:text-gray-400 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            <span className="text-4xs uppercase font-bold tracking-wider">{t('predictedPeakPeriod')}</span>
          </div>
          <span className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-300 block truncate">
            {predictedPeakPeriod}
          </span>
        </div>

        {/* 3. Expected Baseline Turnaround */}
        <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-2xl border border-green-100 dark:border-gray-700 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-gray-400 dark:text-gray-400 mb-1">
            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-4xs uppercase font-bold tracking-wider">{t('estWaitTime')}</span>
          </div>
          <span className="text-base sm:text-lg font-black text-blue-900 dark:text-blue-300 block">
            ~{expectedWaitTime} <span className="text-3xs font-bold text-blue-700 dark:text-blue-400">{t('minutes')}</span>
          </span>
        </div>

      </div>

    </div>
  );
};

export default SmartQueueAdvisor;
