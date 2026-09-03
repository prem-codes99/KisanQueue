import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import io from 'socket.io-client';
import { 
  Users, CheckCircle2, Play, Scale, Activity,
  AlertCircle, AlertTriangle, Lightbulb, Clock, Check
} from 'lucide-react';

const OperatorDashboard = () => {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const centreId = user?.profile?.centreId?._id;
  const centreName = user?.profile?.centreId?.name;

  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bottleneckData, setBottleneckData] = useState(null);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'appointments' | 'bottlenecks' | 'payments'
  
  // Weight Recording Modal State
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actualWeight, setActualWeight] = useState('');
  const [qualityGrade, setQualityGrade] = useState('Grade A');
  const [submittingProcurement, setSubmittingProcurement] = useState(false);

  const fetchQueue = async () => {
    if (!centreId || !token) return;
    try {
      const response = await fetch(`/api/queue/centre/${centreId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setQueue(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppointments = async () => {
    if (!centreId || !token) return;
    try {
      const response = await fetch(`/api/bookings/centre/${centreId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setAppointments(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBottlenecks = async () => {
    if (!centreId || !token) return;
    try {
      const response = await fetch(`/api/analytics/centre/${centreId}/bottlenecks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setBottleneckData(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllData = async () => {
    await fetchQueue();
    await fetchAppointments();
    await fetchBottlenecks();
    try {
      const response = await fetch(`/api/payments/farmer/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pResult = await response.json();
      if (pResult.success) {
        setPayments(pResult.data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchAllData();
  }, [centreId]);

  // Socket listener to refresh operator dashboard when queue or bottlenecks change
  useEffect(() => {
    if (!centreId) return;
    const socket = io(window.location.origin);
    socket.emit('joinCentre', centreId);

    socket.on('queueUpdated', (updatedQueue) => {
      setQueue(updatedQueue);
      fetchBottlenecks();
    });

    socket.on('bottlenecksUpdated', () => {
      fetchBottlenecks();
    });

    return () => {
      socket.disconnect();
    };
  }, [centreId]);

  // Actions
  const handleCallNext = async () => {
    try {
      const response = await fetch('/api/queue/call-next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ centreId })
      });
      const result = await response.json();
      if (result.success) {
        alert(result.message || t('calledSuccess'));
        fetchQueue();
        fetchBottlenecks();
      }
    } catch (err) {
      alert('Failed to call next.');
    }
  };

  const handleMarkArrived = async (bookingId) => {
    try {
      const response = await fetch('/api/queue/mark-arrived', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId })
      });
      const result = await response.json();
      if (result.success) {
        alert(t('checkInSuccess'));
        fetchQueue();
        fetchBottlenecks();
      } else {
        alert(result.message || 'Error checking in farmer.');
      }
    } catch (err) {
      alert('Connection error.');
    }
  };

  const handleNoShow = async (queueId) => {
    try {
      const response = await fetch('/api/queue/no-show', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ queueId })
      });
      const result = await response.json();
      if (result.success) {
        alert(t('markNoShowSuccess'));
        fetchQueue();
        fetchBottlenecks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordWeight = (booking) => {
    setSelectedBooking(booking);
    setActualWeight(booking.approxQuantity || '');
    setShowWeightModal(true);
  };

  const submitProcurement = async (e) => {
    e.preventDefault();
    if (!actualWeight || !qualityGrade) return;

    setSubmittingProcurement(true);
    try {
      const response = await fetch('/api/procurements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: selectedBooking._id,
          actualWeight: parseFloat(actualWeight),
          qualityStatus: qualityGrade
        })
      });
      const result = await response.json();
      setSubmittingProcurement(false);
      setShowWeightModal(false);

      if (result.success) {
        alert(t('procurementSuccessMsg'));
        fetchAllData();
      } else {
        alert(result.message || 'Failed to submit procurement.');
      }
    } catch (err) {
      setSubmittingProcurement(false);
      alert('Connection error.');
    }
  };

  const handleUpdatePaymentStatus = async (paymentId, status) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (result.success) {
        alert(t('paymentMarkedSuccess'));
        fetchAllData();
      }
    } catch (err) {
      alert('Failed to update payment status.');
    }
  };

  const servingItem = queue.find(q => q.status === 'SERVING');
  const waitingItems = queue.filter(q => q.status === 'WAITING').sort((a, b) => a.position - b.position);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-left space-y-6">
      
      {/* Centre Command Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-4xs uppercase font-bold text-emerald-700 tracking-wider block">{t('operatorCommandTitle')}</span>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{centreName || t('centreLocation')}</h2>
          <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-2">
            <span>{t('operatorName')}: <b className="text-gray-700">{user?.profile?.name}</b></span>
            <span>•</span>
            <span>{t('district')}: <b className="text-gray-700">{user?.profile?.centreId?.district}</b></span>
          </p>
        </div>
        <div>
          <button
            onClick={handleCallNext}
            disabled={waitingItems.length === 0}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50 transition cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" /> {t('callNextBtn')}
          </button>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-4xs uppercase font-bold text-gray-500 tracking-wider">{t('queueCapacity')}</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-xl font-bold text-gray-900 block mt-1">{user?.profile?.centreId?.capacity || 40}</span>
          <span className="text-4xs text-gray-400 mt-0.5 block">{t('maxSlotSize')}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-4xs uppercase font-bold text-gray-500 tracking-wider">{t('waitingInQueue')}</span>
            <Scale className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-xl font-bold text-amber-700 block mt-1">{waitingItems.length}</span>
          <span className="text-4xs text-gray-400 mt-0.5 block font-medium">{t('farmersWaiting')}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-4xs uppercase font-bold text-gray-500 tracking-wider">{t('currentlyServingTitle')}</span>
            <Play className="h-4 w-4 text-blue-500" />
          </div>
          <span className="text-xl font-bold text-blue-700 block mt-1">{servingItem ? servingItem.tokenNumber : '-'}</span>
          <span className="text-4xs text-gray-400 mt-0.5 block">{t('processingWeights')}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-4xs uppercase font-bold text-gray-500 tracking-wider">{t('activeCounters')}</span>
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
          </div>
          <span className="text-xl font-bold text-gray-900 block mt-1">{user?.profile?.centreId?.activeCounters || 2}</span>
          <span className="text-4xs text-gray-400 mt-0.5 block">{t('weighCountersActive')}</span>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('queue')}
          className={`py-2 px-3.5 font-bold text-xs uppercase tracking-wider focus:outline-none transition cursor-pointer whitespace-nowrap ${
            activeTab === 'queue'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {t('tabLiveQueue')}
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`py-2 px-3.5 font-bold text-xs uppercase tracking-wider focus:outline-none transition cursor-pointer whitespace-nowrap ${
            activeTab === 'appointments'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {t('tabAppointments')}
        </button>
        <button
          onClick={() => setActiveTab('bottlenecks')}
          className={`py-2 px-3.5 font-bold text-xs uppercase tracking-wider focus:outline-none transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'bottlenecks'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>{t('liveBottlenecksTab')}</span>
          {bottleneckData && bottleneckData.severity === 'CRITICAL' && (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`py-2 px-3.5 font-bold text-xs uppercase tracking-wider focus:outline-none transition cursor-pointer whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {t('tabPayments')}
        </button>
      </div>

      {/* Tab Contents: Live Queue Desk */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Serving Desk Box */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs">
              <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2.5">{t('servingCardTitle')}</h3>
              
              {servingItem ? (
                <div className="space-y-4 pt-3">
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 text-center">
                    <span className="text-4xs uppercase font-bold text-emerald-700 tracking-wider">{t('tokenNumber')}</span>
                    <span className="text-2xl font-black text-emerald-800 block mt-0.5">{servingItem.tokenNumber}</span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200/60">
                    <p className="flex justify-between">
                      <span className="text-gray-500">{t('name')}:</span>
                      <b className="text-gray-800">{servingItem.bookingId?.farmerId?.name}</b>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">{t('crop')}:</span>
                      <b className="text-gray-800">{t(`crop${servingItem.bookingId?.cropType?.replace(/[^a-zA-Z]/g, '')}`, servingItem.bookingId?.cropType)}</b>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">{t('quantity')}:</span>
                      <b className="text-gray-800">{servingItem.bookingId?.approxQuantity} {t('quintals')}</b>
                    </p>
                  </div>

                  <button
                    onClick={() => handleRecordWeight(servingItem.bookingId)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-transparent rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                  >
                    <Scale className="h-3.5 w-3.5" /> {t('startWeighQualityBtn')}
                  </button>
                </div>
              ) : (
                <div className="py-10 text-center text-gray-400 space-y-1.5">
                  <span className="text-2xl block">⏳</span>
                  <p className="text-xs font-semibold">{t('noFarmersInQueue')}</p>
                  <p className="text-4xs text-gray-400">{t('callNextBtn')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Queue Timeline list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs">
              <h3 className="font-bold text-sm text-gray-800 mb-3">{t('waitingQueueTitle')}</h3>

              {waitingItems.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <span className="text-2xl block mb-1">🎉</span>
                  <p className="text-xs">{t('allWaitingCleared')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-left">
                    <thead>
                      <tr className="text-4xs uppercase font-bold text-gray-400 tracking-wider">
                        <th className="py-2.5 px-2">#</th>
                        <th className="py-2.5 px-2">{t('tokenNumber')}</th>
                        <th className="py-2.5 px-2">{t('thFarmer')}</th>
                        <th className="py-2.5 px-2">{t('thCrop')}</th>
                        <th className="py-2.5 px-2">{t('estWaitTime')}</th>
                        <th className="py-2.5 px-2 text-right">{t('thAction')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {waitingItems.map((item) => (
                        <tr key={item._id} className="hover:bg-gray-50/70">
                          <td className="py-2.5 px-2 font-bold text-gray-400">#{item.position}</td>
                          <td className="py-2.5 px-2 font-bold text-emerald-700">{item.tokenNumber}</td>
                          <td className="py-2.5 px-2 font-medium text-gray-800">{item.bookingId?.farmerId?.name}</td>
                          <td className="py-2.5 px-2 text-gray-600">{t(`crop${item.bookingId?.cropType?.replace(/[^a-zA-Z]/g, '')}`, item.bookingId?.cropType)}</td>
                          <td className="py-2.5 px-2 text-gray-500 font-medium">{item.estimatedWaitTime} {t('minutes')}</td>
                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={() => handleNoShow(item._id)}
                              className="text-red-500 hover:text-red-700 font-bold text-4xs uppercase tracking-wider cursor-pointer"
                            >
                              {t('markNoShowBtn')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Today's Appointments */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-gray-800">{t('tabAppointments')}</h3>

          {appointments.length === 0 ? (
            <p className="text-gray-400 text-xs py-8 text-center">{t('noBookingsToday')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead>
                  <tr className="text-4xs uppercase font-bold text-gray-400 tracking-wider">
                    <th className="py-2.5 px-2">{t('tokenNumber')}</th>
                    <th className="py-2.5 px-2">{t('thFarmer')}</th>
                    <th className="py-2.5 px-2">{t('slotTime')}</th>
                    <th className="py-2.5 px-2">{t('thCrop')}</th>
                    <th className="py-2.5 px-2">{t('thWeight')}</th>
                    <th className="py-2.5 px-2">{t('thStatus')}</th>
                    <th className="py-2.5 px-2 text-right">{t('thAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {appointments.map((appt) => (
                    <tr key={appt._id} className="hover:bg-gray-50/70">
                      <td className="py-2.5 px-2 font-bold text-emerald-700">{appt.tokenNumber}</td>
                      <td className="py-2.5 px-2 font-medium text-gray-800">{appt.farmerId?.name}</td>
                      <td className="py-2.5 px-2 text-gray-600">{appt.slotId?.startTime} - {appt.slotId?.endTime}</td>
                      <td className="py-2.5 px-2 text-gray-700">{t(`crop${appt.cropType?.replace(/[^a-zA-Z]/g, '')}`, appt.cropType)}</td>
                      <td className="py-2.5 px-2 text-gray-600">{appt.approxQuantity} {t('quintals')}</td>
                      <td className="py-2.5 px-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-4xs font-bold uppercase tracking-wider ${
                          appt.status === 'BOOKED' ? 'bg-amber-100 text-amber-800' :
                          appt.status === 'ARRIVED' ? 'bg-blue-100 text-blue-800' :
                          appt.status === 'IN_QUEUE' ? 'bg-purple-100 text-purple-800' :
                          appt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {t(appt.status)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {appt.status === 'BOOKED' && (
                          <button
                            onClick={() => handleMarkArrived(appt._id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-4xs uppercase px-2.5 py-1 rounded transition cursor-pointer"
                          >
                            {t('checkInBtn')}
                          </button>
                        )}
                        {appt.status !== 'BOOKED' && (
                          <span className="text-gray-400 text-4xs font-medium">{t('checkedInStatus')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: Bottlenecks & Efficiency Analysis */}
      {activeTab === 'bottlenecks' && (
        <div className="space-y-5">
          {bottleneckData ? (
            <>
              {/* Bottleneck Alert Banner */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                bottleneckData.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                bottleneckData.severity === 'MODERATE' ? 'bg-amber-50 border-amber-200' :
                'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2">
                    {bottleneckData.severity === 'CRITICAL' && <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />}
                    {bottleneckData.severity === 'MODERATE' && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
                    {bottleneckData.severity === 'NORMAL' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                    <h3 className="font-bold text-xs sm:text-sm text-gray-900">
                      {bottleneckData.severity === 'NORMAL'
                        ? t('noBottleneckDetected')
                        : `${t('bottleneckDetectedAt')}: ${t(bottleneckData.bottleneckStageKey, bottleneckData.bottleneckStage)}`}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {bottleneckData.explanation}
                  </p>
                </div>
                <div className="shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-4xs font-bold uppercase inline-flex items-center gap-1 ${
                    bottleneckData.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                    bottleneckData.severity === 'MODERATE' ? 'bg-amber-100 text-amber-900' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {bottleneckData.severity === 'CRITICAL' && '🔴'}
                    {bottleneckData.severity === 'MODERATE' && '🟡'}
                    {bottleneckData.severity === 'NORMAL' && '🟢'}
                    {t(`severity${bottleneckData.severity.charAt(0) + bottleneckData.severity.slice(1).toLowerCase()}`, bottleneckData.severity)}
                  </span>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 space-y-1.5">
                <h4 className="text-4xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> {t('actionableRecommendationTitle')}
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed">
                  💡 {bottleneckData.recommendation}
                </p>
              </div>

              {/* Operations KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs">
                  <span className="text-4xs uppercase font-bold text-gray-500 block">{t('farmersWaiting')}</span>
                  <span className="text-lg font-bold text-amber-700 mt-0.5 block">{bottleneckData.waitingFarmers}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs">
                  <span className="text-4xs uppercase font-bold text-gray-500 block">{t('farmersServing')}</span>
                  <span className="text-lg font-bold text-blue-700 mt-0.5 block">{bottleneckData.servingFarmers}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs">
                  <span className="text-4xs uppercase font-bold text-gray-500 block">{t('completedToday')}</span>
                  <span className="text-lg font-bold text-emerald-700 mt-0.5 block">{bottleneckData.completedToday}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs">
                  <span className="text-4xs uppercase font-bold text-gray-500 block">{t('throughput')}</span>
                  <span className="text-lg font-bold text-gray-900 mt-0.5 block">{bottleneckData.throughputPerHour} / hr</span>
                </div>
              </div>

              {/* Counter Utilization Progress Bar */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-700">{t('counterUtilization')}:</span>
                  <b className="text-gray-900 font-mono">{bottleneckData.counterUtilization}% ({bottleneckData.activeCounters} {t('countersLabel')})</b>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      bottleneckData.counterUtilization > 85 ? 'bg-red-500' :
                      bottleneckData.counterUtilization > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, bottleneckData.counterUtilization)}%` }}
                  ></div>
                </div>
              </div>

              {/* 5-Stage Performance Table */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-3">
                <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                  {t('stagePerformanceTitle')}
                </h4>
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold text-4xs uppercase tracking-wider">
                        <th className="py-2.5 px-3">{t('thStage')}</th>
                        <th className="py-2.5 px-3">{t('thExpected')}</th>
                        <th className="py-2.5 px-3">{t('thActual')}</th>
                        <th className="py-2.5 px-3">{t('thDelay')}</th>
                        <th className="py-2.5 px-3 text-right">{t('thSeverity')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bottleneckData.stages?.map((stg) => (
                        <tr key={stg.id} className="hover:bg-gray-50/70 font-medium">
                          <td className="py-2.5 px-3 font-semibold text-gray-900">
                            {t(stg.key, stg.name)}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 font-mono">{stg.expected} min</td>
                          <td className="py-2.5 px-3 font-semibold text-gray-800 font-mono">{stg.actual} min</td>
                          <td className="py-2.5 px-3">
                            {stg.delay > 0 ? (
                              <span className="font-bold text-red-600 font-mono">+{stg.delay} min</span>
                            ) : (
                              <span className="text-emerald-600 font-mono">0 min</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-4xs font-bold uppercase ${
                              stg.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                              stg.severity === 'MODERATE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
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
            </>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">
              <span className="animate-spin inline-block h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full mb-2"></span>
              <p>Calculating live centre bottleneck metrics...</p>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: Payment Logs */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-gray-800">{t('tabPayments')}</h3>

          {payments.length === 0 ? (
            <p className="text-gray-400 text-xs py-8 text-center">{t('noPaymentsFound')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead>
                  <tr className="text-4xs uppercase font-bold text-gray-400 tracking-wider">
                    <th className="py-2.5 px-2">{t('thFarmer')}</th>
                    <th className="py-2.5 px-2">{t('totalAmount')}</th>
                    <th className="py-2.5 px-2">{t('paymentStatus')}</th>
                    <th className="py-2.5 px-2">{t('transactionRef')}</th>
                    <th className="py-2.5 px-2 text-right">{t('thAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50/70">
                      <td className="py-2.5 px-2 font-medium text-gray-800">{p.farmerId?.name}</td>
                      <td className="py-2.5 px-2 font-bold text-emerald-700">₹{p.amount.toFixed(2)}</td>
                      <td className="py-2.5 px-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-4xs font-bold uppercase tracking-wider ${
                          p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t(p.status)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-4xs text-gray-500">{p.transactionId || t('awaitingCompletion')}</td>
                      <td className="py-2.5 px-2 text-right">
                        {p.status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdatePaymentStatus(p._id, 'PROCESSING')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-4xs uppercase px-2.5 py-1 rounded transition cursor-pointer"
                          >
                            {t('processPaymentBtn')}
                          </button>
                        )}
                        {p.status === 'PROCESSING' && (
                          <button
                            onClick={() => handleUpdatePaymentStatus(p._id, 'COMPLETED')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-4xs uppercase px-2.5 py-1 rounded transition cursor-pointer"
                          >
                            {t('markCompletedBtn')}
                          </button>
                        )}
                        {p.status === 'COMPLETED' && (
                          <span className="text-4xs font-semibold text-gray-400">✓ {t('COMPLETED')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Weight Recording Modal */}
      {showWeightModal && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 text-left shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-start border-b border-gray-100 pb-2.5">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-emerald-600" /> {t('weighModalTitle')}
              </h3>
              <button 
                onClick={() => setShowWeightModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitProcurement} className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200/60 space-y-1 text-xs">
                <p><span className="text-gray-500">{t('tokenNumber')}:</span> <b className="text-emerald-700">{selectedBooking.tokenNumber}</b></p>
                <p><span className="text-gray-500">{t('thFarmer')}:</span> <b className="text-gray-800">{selectedBooking.farmerId?.name}</b></p>
                <p><span className="text-gray-500">{t('crop')}:</span> <b className="text-gray-800">{t(`crop${selectedBooking.cropType?.replace(/[^a-zA-Z]/g, '')}`, selectedBooking.cropType)}</b></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {t('actualWeightLabel')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.1"
                  value={actualWeight}
                  onChange={(e) => setActualWeight(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {t('qualityGradeLabel')}
                </label>
                <select
                  value={qualityGrade}
                  onChange={(e) => setQualityGrade(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white cursor-pointer"
                >
                  <option value="Grade A">🌟 {t('gradeAOption')}</option>
                  <option value="Grade B">🌱 {t('gradeBOption')}</option>
                  <option value="Grade C">🌾 {t('gradeCOption')}</option>
                  <option value="Rejected">❌ {t('rejectedOption')}</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowWeightModal(false)}
                  className="px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submittingProcurement}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {submittingProcurement ? t('loading') : t('submitProcurementBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorDashboard;
