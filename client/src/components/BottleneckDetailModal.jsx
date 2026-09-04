import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { 
  X, AlertTriangle, CheckCircle2, AlertCircle, Clock, 
  Layers, Users, Activity, Lightbulb, Scale
} from 'lucide-react';

const BottleneckDetailModal = ({ isOpen, onClose, centreData }) => {
  const { t } = useLanguage();

  if (!isOpen || !centreData || typeof document === 'undefined') return null;

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 px-3 py-1 rounded-full text-4xs font-black uppercase flex items-center gap-1">🔴 {t('severityCritical')}</span>;
      case 'MODERATE':
        return <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full text-4xs font-black uppercase flex items-center gap-1">🟡 {t('severityModerate')}</span>;
      default:
        return <span className="bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 px-3 py-1 rounded-full text-4xs font-black uppercase flex items-center gap-1">🟢 {t('severityNormal')}</span>;
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in text-left"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800 relative my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 dark:bg-black text-white p-4 sm:p-5 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 p-2.5 rounded-2xl">
              <Activity className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-sm sm:text-base">{centreData.centreName}</h3>
                <span className="text-4xs font-mono bg-white/20 px-2 py-0.5 rounded text-gray-300">{centreData.centreCode}</span>
              </div>
              <p className="text-4xs sm:text-3xs text-gray-400">
                {centreData.district}, {centreData.state} • {centreData.activeCounters} {t('countersLabel')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs text-gray-700 dark:text-gray-300">
          
          {/* Top Bottleneck Alert Banner */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
            centreData.severity === 'CRITICAL' ? 'bg-red-50/90 dark:bg-red-950/40 border-red-200 dark:border-red-900/60' :
            centreData.severity === 'MODERATE' ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60' :
            'bg-green-50/90 dark:bg-green-950/40 border-green-200 dark:border-green-900/60'
          }`}>
            <div className="space-y-1 flex-1">
              <div className="flex items-center space-x-2">
                {centreData.severity === 'CRITICAL' && <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />}
                {centreData.severity === 'MODERATE' && <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />}
                {centreData.severity === 'NORMAL' && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />}
                <span className="font-black text-xs text-gray-900 dark:text-white">
                  {centreData.severity === 'NORMAL' 
                    ? t('noBottleneckDetected')
                    : `${t('bottleneckDetectedAt')}: ${t(centreData.bottleneckStageKey, centreData.bottleneckStage)}`}
                </span>
              </div>
              <p className="text-3xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {centreData.explanation}
              </p>
            </div>
            <div className="flex-shrink-0">
              {getSeverityBadge(centreData.severity)}
            </div>
          </div>

          {/* Actionable Recommendation Box */}
          <div className="bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 rounded-2xl p-4 space-y-2">
            <h4 className="text-3xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> {t('actionableRecommendationTitle')}
            </h4>
            <p className="text-2xs font-semibold text-slate-700 dark:text-gray-300 leading-relaxed">
              💡 {centreData.recommendation}
            </p>
          </div>

          {/* Operational Metrics KPI Grid */}
          <div className="space-y-2">
            <h4 className="text-3xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('currentOperationsOverview')}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-5xs uppercase font-extrabold text-gray-400 dark:text-gray-400 block">{t('farmersWaiting')}</span>
                <span className="text-md font-black text-amber-700 dark:text-amber-400 mt-0.5 block">{centreData.waitingFarmers}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-5xs uppercase font-extrabold text-gray-400 dark:text-gray-400 block">{t('farmersServing')}</span>
                <span className="text-md font-black text-blue-700 dark:text-blue-400 mt-0.5 block">{centreData.servingFarmers}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-5xs uppercase font-extrabold text-gray-400 dark:text-gray-400 block">{t('completedToday')}</span>
                <span className="text-md font-black text-green-700 dark:text-green-400 mt-0.5 block">{centreData.completedToday}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-5xs uppercase font-extrabold text-gray-400 dark:text-gray-400 block">{t('throughput')}</span>
                <span className="text-md font-black text-gray-800 dark:text-gray-200 mt-0.5 block">{centreData.throughputPerHour} / hr</span>
              </div>
            </div>
          </div>

          {/* Counter Utilization */}
          <div className="bg-gray-50/80 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-700 space-y-1.5">
            <div className="flex justify-between items-center text-3xs">
              <span className="font-extrabold text-gray-700 dark:text-gray-300">{t('counterUtilization')}:</span>
              <b className="text-gray-900 dark:text-white">{centreData.counterUtilization}% ({centreData.activeCounters} {t('countersLabel')})</b>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  centreData.counterUtilization > 85 ? 'bg-red-500' :
                  centreData.counterUtilization > 60 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, centreData.counterUtilization)}%` }}
              ></div>
            </div>
          </div>

          {/* 5-Stage Performance Table */}
          <div className="space-y-2">
            <h4 className="text-3xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('stagePerformanceTitle')}
            </h4>
            <div className="overflow-x-auto border border-gray-200/80 dark:border-gray-700 rounded-2xl">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left text-2xs">
                <thead>
                  <tr className="bg-gray-100/80 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-extrabold text-4xs uppercase tracking-wider">
                    <th className="py-2.5 px-3">{t('thStage')}</th>
                    <th className="py-2.5 px-2">{t('thExpected')}</th>
                    <th className="py-2.5 px-2">{t('thActual')}</th>
                    <th className="py-2.5 px-2">{t('thDelay')}</th>
                    <th className="py-2.5 px-3 text-right">{t('thSeverity')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {centreData.stages?.map((stg) => (
                    <tr key={stg.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium">
                      <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white">
                        {t(stg.key, stg.name)}
                      </td>
                      <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400 font-mono">{stg.expected} min</td>
                      <td className="py-2.5 px-2 font-bold text-gray-800 dark:text-gray-200 font-mono">{stg.actual} min</td>
                      <td className="py-2.5 px-2">
                        {stg.delay > 0 ? (
                          <span className="font-black text-red-600 dark:text-red-400 font-mono">+{stg.delay} min</span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400 font-mono">0 min</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-5xs font-black uppercase ${
                          stg.severity === 'CRITICAL' ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300' :
                          stg.severity === 'MODERATE' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300'
                        }`}>
                          {t(`severity${stg.severity.charAt(0) + stg.severity.slice(1).toLowerCase()}`, stg.severity)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center flex-shrink-0">
          <span className="text-5xs text-gray-400 dark:text-gray-500">
            {t('lastCalculated')}: {new Date(centreData.lastUpdated).toLocaleTimeString()}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BottleneckDetailModal;
