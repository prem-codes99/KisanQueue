import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { AlertCircle, UserPlus } from 'lucide-react';

const Register = () => {
  const { registerFarmer } = useAuth();
  const { t, languageOptions } = useLanguage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '', // will be set to mobile number
    password: '',
    name: '',
    mobileNumber: '',
    farmerId: '',
    village: '',
    district: '',
    state: '',
    preferredLanguage: 'en'
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, mobileNumber, farmerId, village, district, state, password } = formData;

    if (!name || !mobileNumber || !farmerId || !village || !district || !state || !password) {
      setError(t('enterDetails'));
      return;
    }

    if (mobileNumber.length !== 10 || isNaN(mobileNumber)) {
      setError(t('validMobile'));
      return;
    }

    setError('');
    setLoading(true);

    // Set username as mobile number
    const submissionData = {
      ...formData,
      username: mobileNumber
    };

    const result = await registerFarmer(submissionData);
    setLoading(false);

    if (result.success) {
      navigate('/farmer');
    } else {
      setError(result.message || t('loginFailed'));
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8 text-left">
      <div className="max-w-xl w-full space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="text-center">
          <span className="text-3xl block">🚜</span>
          <h2 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900">
            {t('registerTitle')}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {t('registerSubtitle')}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {t('name')} *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Ramesh Patil"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {t('phone')} *
            </label>
            <input
              type="text"
              name="mobileNumber"
              required
              value={formData.mobileNumber}
              onChange={handleChange}
              placeholder="10-digit number"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {t('farmerId')} *
            </label>
            <input
              type="text"
              name="farmerId"
              required
              value={formData.farmerId}
              onChange={handleChange}
              placeholder="e.g. F-PUNE-2026-8910"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {t('village')} *
            </label>
            <input
              type="text"
              name="village"
              required
              value={formData.village}
              onChange={handleChange}
              placeholder="e.g. Manjari Budruk"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {t('district')} *
            </label>
            <input
              type="text"
              name="district"
              required
              value={formData.district}
              onChange={handleChange}
              placeholder="e.g. Pune"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {t('state')} *
            </label>
            <input
              type="text"
              name="state"
              required
              value={formData.state}
              onChange={handleChange}
              placeholder="e.g. Maharashtra"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {t('password')} *
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 6 characters"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {t('preferredLanguage')}
            </label>
            <select
              name="preferredLanguage"
              value={formData.preferredLanguage}
              onChange={handleChange}
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white cursor-pointer"
            >
              {(languageOptions || []).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.name} ({opt.nativeName})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none disabled:opacity-50 transition shadow-xs cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
                  <span>{t('loading')}</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{t('registerBtn')}</span>
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center pt-2 space-y-1.5 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {t('alreadyRegistered')}{' '}
            <Link to="/login" className="font-bold text-emerald-700 hover:underline">
              {t('login')}
            </Link>
          </p>
          <p className="text-3xs text-gray-500">
            {t('areYouACentre')}{' '}
            <Link to="/register-centre" className="font-bold text-blue-700 hover:underline">
              {t('registerAsProcurementCentre')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
