import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Lock, Smartphone, LogIn, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t('enterDetails'));
      return;
    }

    setError('');
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      setLoading(false);
      const fetchRole = async () => {
        try {
          const token = localStorage.getItem('kisanqueue_token');
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const resJson = await response.json();
          if (resJson.success) {
            const role = resJson.user.role;
            if (role === 'farmer') navigate('/farmer');
            else if (role === 'operator') navigate('/operator');
            else if (role === 'admin') navigate('/admin');
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchRole();
    } else {
      setLoading(false);
      setError(result.message || t('loginFailed'));
    }
  };

  // Quick fill demo credentials
  const fillCredentials = (userType) => {
    if (userType === 'farmer') {
      setUsername('9876543210');
      setPassword('password123');
    } else if (userType === 'operator') {
      setUsername('operator1');
      setPassword('password123');
    } else if (userType === 'admin') {
      setUsername('admin1');
      setPassword('password123');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8 text-left">
      <div className="max-w-md w-full space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="text-center">
          <span className="text-3xl block">🌾</span>
          <h2 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900">
            {t('loginTitle')}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {t('loginSubtitle')}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {t('mobileNumber')} / {t('name')}
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. 9876543210"
                className="pl-9 w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {t('password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-2.5 border border-transparent rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none disabled:opacity-50 transition shadow-xs cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
                <span>{t('loading')}</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5">
                <LogIn className="h-3.5 w-3.5" />
                <span>{t('login')}</span>
              </span>
            )}
          </button>
        </form>

        <div className="space-y-2 text-center pt-2 border-t border-gray-100">
          <p className="text-3xs text-gray-500 font-medium">{t('dontHaveAccount')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs">
            <Link 
              to="/register" 
              className="font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/80 transition"
            >
              🌾 {t('registerAsFarmer')}
            </Link>
            <Link 
              to="/register-centre" 
              className="font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200/80 transition"
            >
              🏛️ {t('registerAsProcurementCentre')}
            </Link>
          </div>
        </div>

        {/* Demo Quick login links */}
        <div className="border-t border-gray-100 pt-4 mt-4">
          <h4 className="text-3xs font-bold text-emerald-800 uppercase tracking-wider mb-2.5 text-center">
            {t('quickFillDemo')}
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => fillCredentials('farmer')}
              className="py-2 px-1 text-center bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-3xs font-bold text-emerald-800 rounded-lg transition cursor-pointer"
            >
              👩🌾 {t('farmer')}
            </button>
            <button
              onClick={() => fillCredentials('operator')}
              className="py-2 px-1 text-center bg-blue-50 hover:bg-blue-100 border border-blue-200 text-3xs font-bold text-blue-800 rounded-lg transition cursor-pointer"
            >
              🏢 {t('operator')}
            </button>
            <button
              onClick={() => fillCredentials('admin')}
              className="py-2 px-1 text-center bg-purple-50 hover:bg-purple-100 border border-purple-200 text-3xs font-bold text-purple-800 rounded-lg transition cursor-pointer"
            >
              👨💼 {t('admin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
