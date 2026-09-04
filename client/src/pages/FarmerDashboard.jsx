import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { usePWA } from '../context/PWAContext.jsx';
import io from 'socket.io-client';
import { 
  FileText, MapPin, HelpCircle, ArrowRight, Download, Printer
} from 'lucide-react';

import MandiAssistant from '../components/MandiAssistant.jsx';
import ReceiptModal from '../components/ReceiptModal.jsx';
import EstimatedWaitCard from '../components/EstimatedWaitCard.jsx';
import SmartQueueAdvisor from '../components/SmartQueueAdvisor.jsx';
import RealTimeQueueAlert from '../components/RealTimeQueueAlert.jsx';
import { openPrintReceipt } from '../utils/receiptGenerator.js';

const FarmerDashboard = () => {
  const { user, token } = useAuth();
  const { t, language } = useLanguage();
  const { isInstalled, installApp } = usePWA();
  const farmerId = user?.profile?._id;

  const [bookings, setBookings] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [liveQueue, setLiveQueue] = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const fetchBookings = async () => {
    if (!farmerId || !token) return;
    try {
      const response = await fetch(`/api/bookings/farmer/${farmerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setBookings(result.data);
        
        // Find first active/booked/processing booking (including completed today to show payment progress)
        const todayStr = new Date().toISOString().split('T')[0];
        const active = result.data.find(b => 
          ['BOOKED', 'ARRIVED', 'IN_QUEUE', 'PROCESSING', 'COMPLETED'].includes(b.status) && 
          b.date === todayStr
        ) || result.data.find(b => 
          ['BOOKED', 'ARRIVED', 'IN_QUEUE', 'PROCESSING'].includes(b.status)
        );
        setActiveBooking(active || null);
      }

      // Fetch payments
      const payResponse = await fetch(`/api/payments/farmer/${farmerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pResult = await payResponse.json();
      if (pResult.success) {
        setPayments(pResult.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveQueue = async (bookingId) => {
    if (!token || !bookingId) return;
    setQueueLoading(true);
    try {
      const response = await fetch(`/api/queue/live/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setLiveQueue(result.data);
      } else {
        setLiveQueue(null);
      }
    } catch (err) {
      setLiveQueue(null);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [farmerId]);

  // Fetch queue data whenever active booking changes
  useEffect(() => {
    if (activeBooking?._id) {
      fetchLiveQueue(activeBooking._id);
    } else {
      setLiveQueue(null);
    }
  }, [activeBooking]);

  // Socket connection to listen for queue adjustments in real-time
  useEffect(() => {
    if (!activeBooking) return;

    const socket = io(window.location.origin);
    const centreId = activeBooking.centreId?._id || activeBooking.centreId;
    if (centreId) {
      socket.emit('joinCentre', centreId.toString());
    }

    socket.on('queueUpdated', () => {
      fetchBookings();
      if (activeBooking?._id) {
        fetchLiveQueue(activeBooking._id);
      }
    });

    socket.on('bottlenecksUpdated', () => {
      if (activeBooking?._id) {
        fetchLiveQueue(activeBooking._id);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeBooking]);

  // Cancel Booking handler
  const handleCancelBooking = async (id) => {
    if (!window.confirm(t('cancelConfirm'))) return;
    setCancelling(true);
    try {
      const response = await fetch(`/api/bookings/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        alert(t('cancelSuccess'));
        fetchBookings();
      }
    } catch (err) {
      alert(t('cancelFail'));
    } finally {
      setCancelling(false);
    }
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleOpenReceipt = (paymentRecord, bookingRecord) => {
    const p = paymentRecord || payments.find(pay => 
      pay.procurementId?.bookingId === bookingRecord?._id || 
      pay.procurementId?.bookingId?._id === bookingRecord?._id ||
      pay.procurementId?.bookingId?.bookingId === bookingRecord?.bookingId
    ) || {
      farmerId: user?.profile,
      amount: (bookingRecord?.approxQuantity || 10) * 2275,
      status: bookingRecord?.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      procurementId: {
        bookingId: bookingRecord,
        centreId: bookingRecord?.centreId,
        actualWeight: bookingRecord?.approxQuantity || 10,
        qualityStatus: 'Grade A',
        ratePerQuintal: 2275,
        totalAmount: (bookingRecord?.approxQuantity || 10) * 2275
      }
    };
    setSelectedReceipt({ payment: p, booking: bookingRecord });
    setIsReceiptModalOpen(true);
  };

  const handleDirectPrint = (paymentRecord, bookingRecord) => {
    const p = paymentRecord || payments.find(pay => 
      pay.procurementId?.bookingId === bookingRecord?._id || 
      pay.procurementId?.bookingId?._id === bookingRecord?._id ||
      pay.procurementId?.bookingId?.bookingId === bookingRecord?.bookingId
    ) || {
      farmerId: user?.profile,
      amount: (bookingRecord?.approxQuantity || 10) * 2275,
      status: bookingRecord?.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      procurementId: {
        bookingId: bookingRecord,
        centreId: bookingRecord?.centreId,
        actualWeight: bookingRecord?.approxQuantity || 10,
        qualityStatus: 'Grade A',
        ratePerQuintal: 2275,
        totalAmount: (bookingRecord?.approxQuantity || 10) * 2275
      }
    };
    openPrintReceipt({ payment: p, booking: bookingRecord, farmer: user?.profile, t, language });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Calculate ideal reach time
  const getIdealReachTime = () => {
    if (!activeBooking || !liveQueue) return null;
    const dateObj = new Date();
    const waitMs = (liveQueue.estimatedWaitTime || 0) * 60000;
    const targetTime = new Date(dateObj.getTime() + waitMs - (15 * 60000));
    return targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activePayment = payments.find(p => 
    p.procurementId?.bookingId === activeBooking?._id || 
    p.procurementId?.bookingId?._id === activeBooking?._id ||
    p.procurementId?.bookingId?.bookingId === activeBooking?.bookingId
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-left space-y-6">
      {/* Welcome & Action Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 border border-gray-200/80 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {t('welcome')}, {user?.profile?.name || user?.username}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-x-2">
            <span>{t('village')}: <b className="text-gray-700 dark:text-gray-200">{user?.profile?.village}</b></span>
            <span>•</span>
            <span>{t('farmerId')}: <b className="text-gray-700 dark:text-gray-200 font-mono">{user?.profile?.farmerId}</b></span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {!isInstalled && (
            <button
              onClick={installApp}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-xs font-semibold rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-2xs cursor-pointer"
              title={t('installMobileApp')}
            >
              <Download className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {t('installApp')}
            </button>
          )}
          <Link
            to="/farmer/book"
            className="inline-flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
          >
            {t('bookSlotBtn')} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Real-Time Queue Alert (When Congestion is Detected) */}
      <RealTimeQueueAlert liveQueue={liveQueue} activeBooking={activeBooking} />

      {/* Smart Queue Advisor & Congestion Prevention */}
      <SmartQueueAdvisor centreId={activeBooking?.centreId?._id || activeBooking?.centreId} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Active Booking & History */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Booking Card */}
          {activeBooking ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-xs overflow-hidden">
              {/* Card Header */}
              <div className="bg-gray-50/90 dark:bg-gray-800/80 px-5 sm:px-6 py-3.5 border-b border-gray-200/80 dark:border-gray-700/80 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-gray-800 dark:text-white">{t('todayStatus')}</h3>
                  <p className="text-3xs text-gray-500 dark:text-gray-400 font-mono">ID: {activeBooking.bookingId}</p>
                </div>
                <span className={`text-3xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  activeBooking.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                  activeBooking.status === 'IN_QUEUE' || activeBooking.status === 'PROCESSING' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}>
                  {t(activeBooking.status)}
                </span>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                {/* 4 Primary Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
                    <span className="text-4xs uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider block">{t('tokenNumber')}</span>
                    <span className="text-lg font-black text-emerald-800 dark:text-emerald-300 block mt-0.5">{activeBooking.tokenNumber}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-200/70 dark:border-gray-700">
                    <span className="text-4xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider block">{t('crop')}</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100 block mt-0.5">{t(`crop${activeBooking.cropType.replace(/[^a-zA-Z]/g, '')}`, activeBooking.cropType)}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-200/70 dark:border-gray-700">
                    <span className="text-4xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider block">{t('quantity')}</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100 block mt-0.5">{activeBooking.approxQuantity} {t('quintals')}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-200/70 dark:border-gray-700">
                    <span className="text-4xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider block">{t('slotTime')}</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100 block mt-0.5">{activeBooking.slotId?.startTime} - {activeBooking.slotId?.endTime}</span>
                  </div>
                </div>

                {/* Progress Journey Stepper */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <h4 className="text-3xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{t('journeyTrackerTitle')}</h4>
                  <div className="overflow-x-auto pb-1">
                    <div className="relative flex items-center justify-between min-w-[280px]">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-200 dark:bg-gray-700 -z-0"></div>
                      <div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 transition-all duration-300 -z-0"
                        style={{
                          width: 
                            activeBooking.status === 'BOOKED' ? '0%' :
                            activeBooking.status === 'ARRIVED' ? '25%' :
                            activeBooking.status === 'IN_QUEUE' ? '50%' :
                            activeBooking.status === 'PROCESSING' ? '75%' :
                            activeBooking.status === 'COMPLETED' ? '100%' : '0%'
                        }}
                      ></div>

                      {[
                        { statusKey: 'BOOKED', label: t('BOOKED'), stepNum: 1 },
                        { statusKey: 'ARRIVED', label: t('ARRIVED'), stepNum: 2 },
                        { statusKey: 'IN_QUEUE', label: t('IN_QUEUE'), stepNum: 3 },
                        { statusKey: 'PROCESSING', label: t('PROCESSING'), stepNum: 4 },
                        { statusKey: 'COMPLETED', label: t('COMPLETED'), stepNum: 5 }
                      ].map((step, idx) => {
                        const statuses = ['BOOKED', 'ARRIVED', 'IN_QUEUE', 'PROCESSING', 'COMPLETED'];
                        const currentIdx = statuses.indexOf(activeBooking.status);
                        const isCompleted = currentIdx >= idx;
                        const isActive = activeBooking.status === step.statusKey;
                        
                        return (
                          <div key={idx} className="flex flex-col items-center relative z-10 px-1">
                            <div 
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-3xs font-bold border transition ${
                                isCompleted 
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs' 
                                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                              } ${isActive ? 'ring-3 ring-emerald-100 dark:ring-emerald-900/60 font-extrabold' : ''}`}
                            >
                              {isCompleted ? '✓' : step.stepNum}
                            </div>
                            <span className={`text-4xs mt-1 font-semibold whitespace-nowrap ${
                              isActive ? 'text-emerald-700 dark:text-emerald-400 font-bold' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Location Bar */}
                <div className="bg-gray-50/80 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-200/70 dark:border-gray-700 flex items-center space-x-2.5 text-left">
                  <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate block">{activeBooking.centreId?.name}</span>
                    <span className="text-3xs text-gray-500 dark:text-gray-400 truncate block">{activeBooking.centreId?.location}</span>
                  </div>
                </div>

                {/* Estimated Waiting Time Component */}
                <EstimatedWaitCard 
                  queueData={liveQueue} 
                  loading={queueLoading} 
                  bookingStatus={activeBooking.status} 
                />

                {/* Live Queue Details Timeline & Clearance Chain */}
                {liveQueue && (
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
                    <h4 className="text-3xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('queueTimelineTitle')}</h4>
                    
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-200/70 dark:border-gray-700">
                        <span className="text-4xs uppercase font-bold text-gray-500 dark:text-gray-400 block truncate">{t('currentServing')}</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 block mt-0.5 truncate">{liveQueue.currentServingToken}</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-200/70 dark:border-gray-700">
                        <span className="text-4xs uppercase font-bold text-gray-500 dark:text-gray-400 block truncate">{t('queuePosition')}</span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5 truncate">#{liveQueue.position}</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-200/70 dark:border-gray-700">
                        <span className="text-4xs uppercase font-bold text-gray-500 dark:text-gray-400 block truncate">{t('estWaitTime')}</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 block mt-0.5 truncate">{liveQueue.estimatedWaitTime} {t('minutes')}</span>
                      </div>
                    </div>

                    {/* Clearance Chain Tracker */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/70 dark:border-gray-700 text-center">
                      <span className="text-3xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2 block">{t('clearanceChainTitle')}</span>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-medium">
                        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-3xs font-semibold">{t('serving')}: {liveQueue.currentServingToken}</span>
                        <span className="text-gray-400 text-xs">➔</span>
                        <span className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-3xs">{t('waitingAhead')}: {liveQueue.position - 1}</span>
                        <span className="text-gray-400 text-xs">➔</span>
                        <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded font-bold text-3xs">{user?.profile?.name?.split(' ')?.[0] || t('farmer')}: {liveQueue.tokenNumber}</span>
                      </div>
                    </div>

                    {/* Smart Recommendations */}
                    {getIdealReachTime() && (
                      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 flex items-start space-x-2 text-left">
                        <span className="text-base shrink-0">💡</span>
                        <p className="text-3xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                          {t('arrivalRecommendationText')} <b className="font-bold text-emerald-900 dark:text-emerald-300">{getIdealReachTime()}</b> {t('arrivalRecommendationBuffer')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Completed Payout & Receipt Actions */}
                {activeBooking.status === 'COMPLETED' && (
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3 text-left">
                    <div className="flex justify-between items-center">
                      <h4 className="text-3xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('billingReceiptTitle')}</h4>
                      <span className="text-3xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                        ✓ {t('COMPLETED')}
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-4xs uppercase font-bold text-gray-500 dark:text-gray-400 block">{t('totalPayoutBilling')}</span>
                        <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                          ₹{(activePayment?.amount || (activeBooking.approxQuantity * 2275)).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-4xs uppercase font-bold text-gray-500 dark:text-gray-400 block">{t('payoutStatus')}</span>
                        <span className={`inline-block text-4xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
                          activePayment?.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' :
                          activePayment?.status === 'PROCESSING' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300' :
                          'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}>
                          {t(activePayment?.status || 'COMPLETED')}
                        </span>
                      </div>
                      <div>
                        <span className="text-4xs uppercase font-bold text-gray-500 dark:text-gray-400 block">{t('transactionRef')}</span>
                        <span className="text-3xs font-mono text-gray-600 dark:text-gray-400 block mt-1">
                          {activePayment?.transactionId || `TXN-${String(activeBooking._id).slice(-8).toUpperCase()}`}
                        </span>
                      </div>
                    </div>

                    {/* Download & Print Receipt Buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenReceipt(activePayment, activeBooking)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>{t('downloadReceipt')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDirectPrint(activePayment, activeBooking)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
                      >
                        <Printer className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                        <span>{t('printReceipt')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Cancel Booking (when BOOKED) */}
                {activeBooking.status === 'BOOKED' && (
                  <div className="flex justify-end border-t border-gray-100 dark:border-gray-800 pt-3">
                    <button
                      onClick={() => handleCancelBooking(activeBooking._id)}
                      disabled={cancelling}
                      className="px-3.5 py-1.5 border border-red-200 dark:border-red-800 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/50 transition disabled:opacity-50 cursor-pointer"
                    >
                      {t('cancelBookingBtn')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200/80 dark:border-gray-800 shadow-xs text-center space-y-3">
              <span className="text-4xl block">🚜</span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('noBooking')}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs max-w-sm mx-auto">
                {t('noBookingDesc')}
              </p>
              <div className="pt-2">
                <Link
                  to="/farmer/book"
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                >
                  {t('bookSlotBtn')}
                </Link>
              </div>
            </div>
          )}

          {/* Historical Procurement Log Table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200/80 dark:border-gray-800 shadow-xs">
            <h3 className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5 mb-3">
              <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> {t('historyTitle')}
            </h3>

            {bookings.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-xs py-4 text-center">{t('historyEmpty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left">
                  <thead>
                    <tr className="text-4xs uppercase font-bold text-gray-400 dark:text-gray-400 tracking-wider">
                      <th className="py-2.5 px-2">{t('thDate')}</th>
                      <th className="py-2.5 px-2">{t('thCentre')}</th>
                      <th className="py-2.5 px-2">{t('thCrop')}</th>
                      <th className="py-2.5 px-2">{t('thWeight')}</th>
                      <th className="py-2.5 px-2">{t('thStatus')}</th>
                      <th className="py-2.5 px-2 text-right">{t('thAction')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                    {bookings.map((b) => (
                      <tr key={b._id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50">
                        <td className="py-2.5 px-2 text-gray-600 dark:text-gray-400">{b.date}</td>
                        <td className="py-2.5 px-2 font-medium text-gray-800 dark:text-gray-200">{b.centreId?.name}</td>
                        <td className="py-2.5 px-2 text-gray-700 dark:text-gray-300">{t(`crop${b.cropType.replace(/[^a-zA-Z]/g, '')}`, b.cropType)}</td>
                        <td className="py-2.5 px-2 text-gray-600 dark:text-gray-400">{b.approxQuantity} {t('quintals')}</td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-4xs font-bold uppercase tracking-wider ${
                            b.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' :
                            b.status === 'CANCELLED' ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                          }`}>
                            {t(b.status)}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {b.status === 'COMPLETED' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(null, b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-3xs font-semibold transition cursor-pointer"
                              title={t('downloadReceipt')}
                            >
                              <FileText className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              <span>{t('viewReceipt')}</span>
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-3xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: FAQ & Helpline */}
        <div className="space-y-6">
          {/* FAQ Accordion */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200/80 dark:border-gray-800 shadow-xs">
            <h3 className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-1.5 mb-3">
              <HelpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> {t('faqTitle')}
            </h3>

            <div className="space-y-2.5">
              {[1, 2, 3].map((num) => (
                <div key={num} className="border-b border-gray-100 dark:border-gray-800 pb-2.5 last:border-0">
                  <button
                    onClick={() => toggleFaq(num)}
                    className="w-full flex justify-between items-center text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 focus:outline-none cursor-pointer"
                  >
                    <span>{t(`faq${num}Q`)}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-3xs ml-2">{openFaq === num ? '▲' : '▼'}</span>
                  </button>
                  {openFaq === num && (
                    <p className="text-3xs text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
                      {t(`faq${num}A`)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Helpline Card */}
          <div className="bg-emerald-950 dark:bg-gray-900 border dark:border-emerald-900/60 text-white rounded-2xl p-5 space-y-3 text-left shadow-xs">
            <h4 className="font-bold text-sm text-emerald-300">{t('emergencyHelpline')}</h4>
            <p className="text-3xs text-emerald-200/80 leading-relaxed">
              {t('helplineDesc')}
            </p>
            <div className="border-t border-emerald-900/80 pt-2.5 space-y-1 text-3xs">
              <p>📞 {t('phoneCall')}: <a href="tel:18004251555" className="text-emerald-300 hover:underline font-bold">1800-425-1555</a> ({t('tollFree')})</p>
              <p>✉️ {t('emailSupport')}: <a href="mailto:support@kisanqueue.gov.in" className="text-emerald-300 hover:underline font-bold">support@kisanqueue.gov.in</a></p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Multilingual Chatbot Assistant */}
      <MandiAssistant />

      {/* Downloadable Procurement Receipt Modal */}
      {isReceiptModalOpen && selectedReceipt && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          payment={selectedReceipt.payment}
          booking={selectedReceipt.booking}
          farmer={user?.profile}
        />
      )}
    </div>
  );
};

export default FarmerDashboard;
