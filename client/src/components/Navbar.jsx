import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { usePWA } from '../context/PWAContext.jsx';
import { Bell, Globe, LogOut, User as UserIcon, Menu, X, CheckCheck, Download, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { language, setLanguage, t, languageOptions } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const { isInstalled, installApp } = usePWA();
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleToggleDrawer = () => {
    const willOpen = !showNotifDrawer;
    setShowNotifDrawer(willOpen);
    if (willOpen) {
      fetchNotifications();
    }
  };

  // Close drawer or mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowNotifDrawer(false);
        setMobileMenuOpen(false);
      }
    };

    if (showNotifDrawer || mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNotifDrawer, mobileMenuOpen]);

  // Contextual icon for notification types
  const getNotifIcon = (type) => {
    switch (type) {
      case 'SLOT_BOOKED':
      case 'PROCUREMENT_COMPLETED':
        return '🌾';
      case 'PAYMENT_PROCESSED':
        return '💰';
      case 'REMINDER':
      case 'TURN_APPROACHING':
        return '⏰';
      case 'CALLED':
        return '📢';
      case 'ALERT':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  // Formatted date & relative timestamp
  const formatNotifTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const notificationList = Array.isArray(notifications) ? notifications : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/80 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur shadow-2xs transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center min-w-0">
            <Link to="/" className="flex items-center space-x-2 truncate">
              <span className="text-2xl shrink-0">🌾</span>
              <span className="font-bold text-lg sm:text-xl tracking-tight text-emerald-700 dark:text-emerald-400 truncate">
                {t('appName')}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            {/* Dark / Light Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              type="button"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-gray-200 dark:border-gray-700 transition cursor-pointer shadow-2xs"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400 animate-fadeIn" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 animate-fadeIn" />
              )}
            </button>

            {/* PWA Install Button for Farmers */}
            {user?.role === 'farmer' && !isInstalled && (
              <button
                onClick={installApp}
                className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition"
                title={t('installMobileApp')}
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t('installApp')}</span>
              </button>
            )}

            {/* Language Selector */}
            <div className="flex items-center space-x-1 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
              <Globe className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent font-medium focus:outline-none cursor-pointer dark:bg-gray-800 dark:text-gray-200"
              >
                {(languageOptions || []).map((opt) => (
                  <option key={opt.code} value={opt.code} className="dark:bg-gray-800 dark:text-gray-200">
                    {opt.name} ({opt.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {user ? (
              <>
                <Link
                  to={
                    user.role === 'farmer'
                      ? '/farmer'
                      : user.role === 'operator'
                      ? '/operator'
                      : '/admin'
                  }
                  className="text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition px-2 py-1"
                >
                  {t('dashboard')}
                </Link>

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={handleToggleDrawer}
                    aria-label={t('notifications')}
                    className={`p-1.5 rounded-lg focus:outline-none relative transition cursor-pointer ${
                      showNotifDrawer 
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[1rem] h-[1rem] px-0.5 rounded-full text-4xs font-bold text-white bg-red-500">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Profile menu & Logout */}
                <div className="flex items-center space-x-2.5 border-l border-gray-200 dark:border-gray-700 pl-3">
                  <div className="flex flex-col text-right max-w-[120px] lg:max-w-[160px] truncate">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                      {user.profile?.name || user.username}
                    </span>
                    <span className="text-4xs uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
                      {t(user.role)}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title={t('logout')}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 focus:outline-none transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/register-centre"
                  className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/70 px-3 py-1.5 rounded-lg transition"
                >
                  🏛️ {t('registerAsProcurementCentre')}
                </Link>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-1.5 rounded-lg transition"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg shadow-xs transition"
                >
                  {t('register')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Navigation Header Items */}
          <div className="md:hidden flex items-center space-x-1.5 sm:space-x-2">
            {/* Mobile Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              type="button"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-gray-200 dark:border-gray-700 transition cursor-pointer"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>

            {/* Language Selector icon */}
            <div className="flex items-center bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
              <Globe className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer ml-1 max-w-[85px] truncate dark:bg-gray-800 dark:text-gray-200"
              >
                {(languageOptions || []).map((opt) => (
                  <option key={opt.code} value={opt.code} className="dark:bg-gray-800 dark:text-gray-200">
                    {opt.name} ({opt.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Notification Bell */}
            {user && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleToggleDrawer();
                }}
                aria-label={t('notifications')}
                className={`p-1.5 rounded-lg relative cursor-pointer ${
                  showNotifDrawer 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[0.9rem] h-[0.9rem] px-0.5 rounded-full text-4xs font-bold text-white bg-red-500">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => {
                setShowNotifDrawer(false);
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 space-y-2 text-left shadow-lg transition-colors">
          {user ? (
            <>
              <div className="py-2 border-b border-gray-100 dark:border-gray-800 flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{user.profile?.name || user.username}</p>
                  <p className="text-4xs uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">{t(user.role)}</p>
                </div>
              </div>

              {/* Mobile Install App Button for Farmers */}
              {user.role === 'farmer' && !isInstalled && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    installApp();
                  }}
                  className="w-full text-left py-2 px-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center space-x-2 transition"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{t('installMobileApp')}</span>
                </button>
              )}

              <Link
                to={user.role === 'farmer' ? '/farmer' : user.role === 'operator' ? '/operator' : '/admin'}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                {t('dashboard')}
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center space-x-1.5"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span>{t('logout')}</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col space-y-2 py-1">
              <Link
                to="/register-centre"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 rounded-lg"
              >
                🏛️ {t('registerAsProcurementCentre')}
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
              >
                {t('login')}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
              >
                {t('register')}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Slide-out Notifications Drawer rendered into Portal */}
      {showNotifDrawer && typeof document !== 'undefined' && createPortal(
        <div className="kisanqueue-notification-portal">
          {/* Fullscreen Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[9998] transition-opacity"
            onClick={() => setShowNotifDrawer(false)}
            aria-label="Close notification panel"
          />

          {/* Drawer Panel Container */}
          <div
            ref={drawerRef}
            className="fixed inset-y-0 right-0 z-[9999] w-full max-w-full sm:max-w-md bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-800 flex flex-col text-left transition-transform duration-200 ease-out h-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-panel-title"
          >
            {/* Header */}
            <div className="h-14 shrink-0 flex items-center justify-between px-4 sm:px-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🔔</span>
                <h3 id="notification-panel-title" className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                  {t('notifications')}
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-4xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} {t('newBadge')}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-3xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 transition flex items-center space-x-1 cursor-pointer"
                    title={t('markAllRead')}
                  >
                    <CheckCheck className="h-3 w-3" />
                    <span className="hidden xs:inline">{t('markAllRead')}</span>
                    <span className="xs:hidden">{t('markAllReadShort')}</span>
                  </button>
                )}
                <button
                  onClick={() => setShowNotifDrawer(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition focus:outline-none cursor-pointer"
                  aria-label={t('close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-gray-50/50 dark:bg-gray-950/50">
              {notificationList.length === 0 ? (
                <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center p-6 text-gray-400 dark:text-gray-500">
                  <span className="text-3xl mb-2">📬</span>
                  <p className="text-gray-700 dark:text-gray-300 font-bold text-sm">{t('noNotifications')}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 max-w-xs leading-relaxed">
                    {t('noNotificationsDesc')}
                  </p>
                </div>
              ) : (
                notificationList.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => !notif.isRead && markAsRead(notif._id)}
                    className={`p-3 sm:p-3.5 rounded-xl border transition cursor-pointer ${
                      notif.isRead
                        ? 'bg-white dark:bg-gray-800 border-gray-200/80 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                        : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-gray-900 dark:text-gray-100 shadow-2xs hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      {/* Type Icon */}
                      <div className={`p-2 rounded-lg text-base shrink-0 ${
                        notif.isRead ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                      }`}>
                        {getNotifIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={`text-xs leading-snug break-words ${
                            notif.isRead ? 'font-semibold text-gray-700 dark:text-gray-300' : 'font-bold text-emerald-950 dark:text-emerald-300'
                          }`}>
                            {notif.title}
                          </h4>
                          {!notif.isRead && (
                            <span className="shrink-0 inline-block px-1.5 py-0.5 text-4xs font-bold uppercase tracking-wider bg-emerald-600 text-white rounded">
                              {t('newBadge')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed break-words">
                          {notif.message}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100 dark:border-gray-700/80">
                          <span className="text-4xs text-gray-400 dark:text-gray-500 font-medium">
                            {formatNotifTime(notif.createdAt)}
                          </span>
                          {!notif.isRead && (
                            <span className="text-4xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline">
                              {t('tapToMarkRead')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notificationList.length > 0 && (
              <div className="p-2.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-center shrink-0">
                <p className="text-4xs text-gray-400 dark:text-gray-500 font-medium">
                  {t('showingNotifications')} {notificationList.length} {notificationList.length > 1 ? t('notificationsItems') : t('notificationItem')}
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};

export default Navbar;
