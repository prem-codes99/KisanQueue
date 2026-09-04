import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Lock, Smartphone, LogIn, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('farmer');
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

  // Quick fill demo credentials & update selected role
  const handleSelectRole = (userType) => {
    setSelectedRole(userType);
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50/50 dark:bg-gray-950/50 py-10 px-4 sm:px-6 lg:px-8 text-left transition-colors duration-150">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-xs transition-colors duration-150">
        <div className="text-center">
          <span className="text-3xl block">🌾</span>
          <h2 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('loginTitle')}
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('loginSubtitle')}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-3 rounded-xl flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              {selectedRole === 'farmer' ? t('mobileNumber') : `${t('mobileNumber')} / ${t('name')}`}
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={selectedRole === 'farmer' ? 'e.g. 9876543210' : 'e.g. 9876543210 / username'}
                className="pl-9 w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              {t('password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 transition"
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

        <div className="space-y-2 text-center pt-2 border-t border-gray-100 dark:border-gray-800">
          <p className="text-3xs text-gray-500 dark:text-gray-400 font-medium">{t('dontHaveAccount')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs">
            <Link 
              to="/register" 
              className="font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200/80 dark:border-emerald-800/80 transition"
            >
              🌾 {t('registerAsFarmer')}
            </Link>
            <Link 
              to="/register-centre" 
              className="font-bold text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-lg border border-blue-200/80 dark:border-blue-800/80 transition"
            >
              🏛️ {t('registerAsProcurementCentre')}
            </Link>
          </div>
        </div>

        {/* Demo Quick login links with role options without emojis */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
          <h4 className="text-3xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2.5 text-center">
            {t('quickFillDemo')}
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSelectRole('farmer')}
              className={`py-2 px-1 text-center border text-3xs font-bold rounded-lg transition cursor-pointer ${
                selectedRole === 'farmer'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {t('farmer')}
            </button>
            <button
              type="button"
              onClick={() => handleSelectRole('operator')}
              className={`py-2 px-1 text-center border text-3xs font-bold rounded-lg transition cursor-pointer ${
                selectedRole === 'operator'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-200 dark:border-blue-800/80 text-blue-800 dark:text-blue-300'
              }`}
            >
              {t('operator')}
            </button>
            <button
              type="button"
              onClick={() => handleSelectRole('admin')}
              className={`py-2 px-1 text-center border text-3xs font-bold rounded-lg transition cursor-pointer ${
                selectedRole === 'admin'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border-purple-200 dark:border-purple-800/80 text-purple-800 dark:text-purple-300'
              }`}
            >
              {t('admin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
