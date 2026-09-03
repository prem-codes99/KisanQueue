import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { ArrowLeft, Calendar, AlertCircle, Sparkles, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import SmartQueueAdvisor from '../components/SmartQueueAdvisor.jsx';

const BookSlot = () => {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const farmerId = user?.profile?._id;

  const [centres, setCentres] = useState([]);
  const [selectedCentre, setSelectedCentre] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('Wheat');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(() => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return tom.toISOString().split('T')[0];
  });
  
  const [slots, setSlots] = useState([]);
  const [recommendedSlot, setRecommendedSlot] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [centreCongestion, setCentreCongestion] = useState('LOW');
  const [altCentreRecommendation, setAltCentreRecommendation] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  // Fetch all centres on mount
  useEffect(() => {
    const fetchCentres = async () => {
      try {
        const response = await fetch('/api/centres', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          setCentres(result.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCentres();
  }, [token]);

  // Fetch slots whenever centre or date changes
  useEffect(() => {
    if (!selectedCentre || !date) {
      setSlots([]);
      setRecommendedSlot(null);
      return;
    }

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError('');
      try {
        const response = await fetch(`/api/slots?centreId=${selectedCentre}&date=${date}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          setSlots(result.data);
          setRecommendedSlot(result.recommendedSlot);

          const totalBooked = result.data.reduce((sum, s) => sum + s.bookedCount, 0);
          const totalCapacity = result.data.reduce((sum, s) => sum + s.capacity, 0);
          const utilization = totalCapacity > 0 ? totalBooked / totalCapacity : 0;
          
          if (utilization >= 0.8) {
            setCentreCongestion('HIGH');
            const alt = centres.find(c => c._id !== selectedCentre);
            setAltCentreRecommendation(alt || null);
          } else if (utilization >= 0.4) {
            setCentreCongestion('MEDIUM');
            setAltCentreRecommendation(null);
          } else {
            setCentreCongestion('LOW');
            setAltCentreRecommendation(null);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedCentre, date, centres, token]);

  const handleBookSlot = async (e) => {
    e.preventDefault();
    if (!selectedCentre || !selectedSlot || !quantity || !date) {
      setError(t('enterDetails'));
      return;
    }

    setBooking(true);
    setError('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          farmerId,
          centreId: selectedCentre,
          slotId: selectedSlot,
          cropType: selectedCrop,
          approxQuantity: parseFloat(quantity),
          date
        })
      });
      const result = await response.json();
      setBooking(false);

      if (result.success) {
        alert(t('slotBookSuccess') + result.data.tokenNumber);
        navigate('/farmer');
      } else {
        setError(result.message || t('loginFailed'));
      }
    } catch (err) {
      setBooking(false);
      setError('Connection failure.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-left space-y-6">
      <Link to="/farmer" className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:underline">
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> {t('back')} ({t('dashboard')})
      </Link>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('bookSlotPageTitle')}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('bookSlotPageSubtitle')}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl flex items-start space-x-2.5 text-left">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleBookSlot} className="space-y-6">
          {/* Form Fields: 2x2 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            
            {/* Centre Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t('selectCentre')}
              </label>
              <select
                required
                value={selectedCentre}
                onChange={(e) => setSelectedCentre(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white cursor-pointer"
              >
                <option value="">-- {t('selectCentre')} --</option>
                {centres.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.district})
                  </option>
                ))}
              </select>
            </div>

            {/* Crop Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t('selectCrop')}
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white cursor-pointer"
              >
                <option value="Wheat">🌾 {t('cropWheat')}</option>
                <option value="Paddy (Rice)">🌾 {t('cropPaddy')}</option>
                <option value="Cotton">🌱 {t('cropCotton')}</option>
                <option value="Maize">🌽 {t('cropMaize')}</option>
                <option value="Soybean">🫘 {t('cropSoybean')}</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t('enterQuantity')}
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={t('approxQuantityPlaceholder')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t('selectDate')}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Smart Queue Advisor & Congestion Solutions */}
          {selectedCentre && (
            <div className="space-y-4 pt-1">
              <SmartQueueAdvisor 
                centreId={selectedCentre} 
                selectedDate={date} 
                onSelectBestSlot={(slotId) => setSelectedSlot(slotId)} 
              />

              {centreCongestion === 'HIGH' && altCentreRecommendation && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-left space-y-2">
                  <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>{t('congestionWarning')}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-amber-200/60 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-4xs uppercase font-bold text-emerald-700 block">{t('altCentreTitle')}</span>
                      <h4 className="text-xs font-bold text-gray-800 mt-0.5">{altCentreRecommendation.name}</h4>
                      <p className="text-4xs text-gray-500">{altCentreRecommendation.location}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCentre(altCentreRecommendation._id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-3xs px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0"
                    >
                      {t('selectCentre')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Time Slot Selection Grid */}
          {selectedCentre && date && (
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" /> {t('selectTimeSlot')}
              </h4>

              {loadingSlots ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-emerald-600"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {slots.map((s) => {
                      const isSelected = selectedSlot === s._id;
                      const isFull = s.bookedCount >= s.capacity;
                      const isRecommended = recommendedSlot && (recommendedSlot._id === s._id || recommendedSlot.startTime === s.startTime);
                      const congestion = s.congestion || (s.crowdLevel === 'LOW' ? 'LOW' : s.crowdLevel === 'HIGH' ? 'HIGH' : 'MODERATE');
                      const predictedWait = s.predictedWaitTime || (congestion === 'LOW' ? 12 : congestion === 'MODERATE' ? 28 : 52);

                      return (
                        <button
                          key={s._id}
                          type="button"
                          disabled={isFull}
                          onClick={() => setSelectedSlot(s._id)}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition focus:outline-none relative cursor-pointer ${
                            isFull ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-50' :
                            isSelected ? 'bg-emerald-50/80 border-2 border-emerald-600 ring-2 ring-emerald-100 shadow-xs' :
                            isRecommended ? 'bg-emerald-50/30 border border-emerald-300 hover:border-emerald-500' :
                            'bg-white border-gray-200/90 hover:border-gray-300 shadow-2xs'
                          }`}
                        >
                          {/* Recommended Badge */}
                          {isRecommended && (
                            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-4xs font-bold px-2 py-0.5 rounded-bl-lg">
                              {t('recommendedBadge')}
                            </div>
                          )}

                          <div>
                            <span className={`text-xs sm:text-sm font-bold block ${isSelected ? 'text-emerald-950' : 'text-gray-900'}`}>
                              {s.startTime} - {s.endTime}
                            </span>
                            <div className="flex items-center space-x-1 text-3xs font-medium text-gray-500 mt-0.5">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span>~{predictedWait} {t('minutes')}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100 text-4xs">
                            <span className="text-gray-500 font-medium">
                              {s.capacity - s.bookedCount} / {s.capacity} left
                            </span>
                            <span className={`font-bold px-2 py-0.5 rounded-full ${
                              congestion === 'LOW' ? 'bg-emerald-100 text-emerald-800' :
                              congestion === 'MODERATE' ? 'bg-amber-100 text-amber-900' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {congestion === 'LOW' ? `🟢 ${t('congestionLow')}` :
                               congestion === 'MODERATE' ? `🟡 ${t('congestionModerate')}` : 
                               `🔴 ${t('congestionHigh')}`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* High Congestion Warning Banner if selected slot is congested */}
                  {(() => {
                    const selObj = slots.find(s => s._id === selectedSlot);
                    if (selObj && (selObj.congestion === 'HIGH' || selObj.crowdLevel === 'HIGH')) {
                      return (
                        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left mt-3">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-xs font-bold text-amber-950">{t('highCongestionWarning')}</h5>
                              <p className="text-3xs text-amber-900 mt-0.5 leading-relaxed">
                                {t('suggestedAlternativePrefix')} <b>{recommendedSlot?.startTime} - {recommendedSlot?.endTime} (~{recommendedSlot?.predictedWaitTime || 12} {t('minutes')})</b> {t('fasterTurnaroundTip')}.
                              </p>
                            </div>
                          </div>
                          {recommendedSlot && recommendedSlot._id !== selectedSlot && (
                            <button
                              type="button"
                              onClick={() => setSelectedSlot(recommendedSlot._id)}
                              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-3xs font-bold transition whitespace-nowrap self-stretch sm:self-auto cursor-pointer"
                            >
                              {t('switchToRecommendedBtn')}
                            </button>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </>
              )}
            </div>
          )}

          {/* Book Slot Submit Button */}
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={booking || !selectedSlot}
              className="px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
            >
              {booking ? t('bookingInProgress') : t('confirmBookingBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookSlot;
