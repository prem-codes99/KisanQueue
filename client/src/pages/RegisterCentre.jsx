import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { 
  Building2, MapPin, User, Phone, Mail, Clock, 
  Layers, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Wheat
} from 'lucide-react';

const CROP_OPTIONS = [
  { id: 'Wheat', label: 'Wheat (गेहूं / गहू)' },
  { id: 'Paddy (Rice)', label: 'Paddy / Rice (धान / भात)' },
  { id: 'Cotton', label: 'Cotton (कपास / कापूस)' },
  { id: 'Maize', label: 'Maize (मक्का / मका)' },
  { id: 'Soybean', label: 'Soybean (सोयाबीन)' },
  { id: 'Mustard', label: 'Mustard (सरसों / मोहरी)' },
  { id: 'Pulses', label: 'Pulses / Dal (दालें / डाळी)' }
];

const RegisterCentre = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    centreCode: '',
    district: '',
    state: 'Maharashtra',
    location: '',
    contactPerson: '',
    contactNumber: '',
    email: '',
    capacity: 60,
    activeCounters: 2,
    operatingHours: '08:00 AM - 06:00 PM',
    cropsHandled: ['Wheat', 'Paddy (Rice)', 'Soybean'],
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCropToggle = (cropId) => {
    setFormData(prev => {
      const exists = prev.cropsHandled.includes(cropId);
      const updated = exists 
        ? prev.cropsHandled.filter(c => c !== cropId)
        : [...prev.cropsHandled, cropId];
      return { ...prev, cropsHandled: updated.length > 0 ? updated : [cropId] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Form validations
    if (!formData.name.trim() || !formData.district.trim() || !formData.location.trim() || 
        !formData.contactPerson.trim() || !formData.contactNumber.trim() || !formData.password) {
      setError(t('fillAllFields'));
      return;
    }

    if (formData.contactNumber.length < 10) {
      setError(t('invalidMobile'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-centre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || 'Registration failed');
      }

      setSuccessData(result.data || { name: formData.name, centreCode: formData.centreCode });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/50 text-left transition-colors duration-150">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-5 text-center transition-colors">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <Clock className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('centreRegistrationSubmitted')}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('centrePendingApprovalNotice')}
            </p>
          </div>

          <div className="bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400 font-medium">{t('centreNameLabel')}:</span>
              <b className="text-gray-900 dark:text-gray-100">{successData.name || formData.name}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400 font-medium">{t('centreCodeLabel')}:</span>
              <b className="text-gray-900 dark:text-gray-100 font-mono">{successData.centreCode || formData.centreCode}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400 font-medium">{t('thStatus')}:</span>
              <span className="bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold px-2 py-0.5 rounded-full text-4xs uppercase">
                {t('PENDING')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400 font-medium">{t('officialLoginMobile')}:</span>
              <b className="text-gray-900 dark:text-gray-100">{formData.contactNumber}</b>
            </div>
          </div>

          <p className="text-4xs text-gray-400 dark:text-gray-500">
            {t('centreAdminReviewTimeline')}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs"
            >
              {t('goToLogin')}
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/50 text-left transition-colors duration-150">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-5 transition-colors">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-800">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{t('registerProcurementCentreTitle')}</h2>
              <p className="text-3xs text-gray-500 dark:text-gray-400">{t('registerProcurementCentreSubtitle')}</p>
            </div>
          </div>
          <span className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-4xs font-bold uppercase px-2.5 py-1 rounded-full">
            🏛️ {t('mandiRegistrationBadge')}
          </span>
        </div>

        {/* Farmer Switcher */}
        <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-700 flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-300 font-medium">{t('areYouAFarmer')}</span>
          <Link 
            to="/register" 
            className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 text-3xs"
          >
            🌾 {t('registerAsFarmer')} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-3 rounded-xl text-xs flex items-center space-x-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Section 1: Centre Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-800 pb-1">
              <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> 1. {t('centreInfoSection')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t('centreNameLabel')} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Kharadi APMC Grain Mandi"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t('centreCodeOptional')}
                </label>
                <input
                  type="text"
                  name="centreCode"
                  value={formData.centreCode}
                  onChange={handleChange}
                  placeholder="e.g. MANDI-PUN-014"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none uppercase font-mono transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t('district')} *
                </label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="e.g. Pune"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t('state')} *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Maharashtra"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                {t('locationAddressLabel')} *
              </label>
              <textarea
                name="location"
                value={formData.location}
                onChange={handleChange}
                rows={2}
                placeholder="e.g. Gate No. 1, APMC Yard, Kharadi Bypass, Pune, MH 411014"
                className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition"
                required
              />
            </div>
          </div>

          {/* Section 2: Capacity & Operations */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-800 pb-1">
              <Layers className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> 2. {t('capacityAndOperationsSection')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t('activeCounters')} *
                </label>
                <input
                  type="number"
                  name="activeCounters"
                  min={1}
                  max={20}
                  value={formData.activeCounters}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none font-semibold transition"
                  required
                />
              </div>

              <div>
                <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t('dailyFarmerCapacity')} *
                </label>
                <input
                  type="number"
                  name="capacity"
                  min={10}
                  max={2000}
                  value={formData.capacity}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none font-semibold transition"
                  required
                />
              </div>

              <div>
                <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t('operatingHoursLabel')}
                </label>
                <input
                  type="text"
                  name="operatingHours"
                  value={formData.operatingHours}
                  onChange={handleChange}
                  placeholder="08:00 AM - 06:00 PM"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Crops Handled */}
            <div>
              <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                {t('cropsHandledLabel')} *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CROP_OPTIONS.map(crop => {
                  const isSelected = formData.cropsHandled.includes(crop.id);
                  return (
                    <button
                      key={crop.id}
                      type="button"
                      onClick={() => handleCropToggle(crop.id)}
                      className={`px-3 py-1.5 rounded-lg text-4xs font-bold border transition text-left flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-2xs' 
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="truncate">{crop.label}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Authentication */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-800 pb-1">
              <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> 3. {t('contactPersonAndAuthSection')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t('contactPersonName')} *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="e.g. Suhas Deshmukh"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t('officialMobileNumber')} *
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="10-digit mobile"
                  maxLength={10}
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none font-semibold transition"
                  required
                />
              </div>

              <div>
                <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t('officialEmail')}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="mandi.office@gov.in"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t('password')} *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-3xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  {t('confirmPassword')} *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 text-4xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start space-x-2">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              <b>{t('importantNotice')}:</b> {t('centreRegistrationPendingAlertText')}
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white mr-2"></span>
                  {t('submitting')}
                </>
              ) : (
                <>
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  {t('submitCentreRegistrationBtn')}
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center pt-2 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('alreadyApprovedCentre')}{' '}
            <Link to="/login" className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
              {t('loginHere')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterCentre;
