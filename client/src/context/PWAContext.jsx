import React, { createContext, useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from './LanguageContext.jsx';

const PWAContext = createContext();

export const PWAProvider = ({ children }) => {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      
      setIsInstalled(isStandaloneMode);
    };

    checkStandalone();

    // Listen for display mode changes
    const mediaMatcher = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      setIsInstalled(e.matches);
    };

    try {
      mediaMatcher.addEventListener('change', handleDisplayModeChange);
    } catch (err) {
      mediaMatcher.addListener(handleDisplayModeChange);
    }

    // Capture the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowInstructionsModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      try {
        mediaMatcher.removeEventListener('change', handleDisplayModeChange);
      } catch (err) {
        mediaMatcher.removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else if (!isInstalled) {
      setShowInstructionsModal(true);
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        deferredPrompt,
        installApp,
        showInstructionsModal,
        setShowInstructionsModal
      }}
    >
      {children}

      {/* Manual Installation Instructions Modal rendered via Portal */}
      {showInstructionsModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowInstructionsModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🌾</span>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">{t('pwaModalTitle')}</h3>
                  <p className="text-3xs text-green-700 font-bold uppercase tracking-wider">{t('pwaModalSubtitle')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
                aria-label={t('close')}
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs text-gray-600 leading-relaxed">
              <p className="font-medium text-gray-800">
                {t('pwaInstructionPrompt')}
              </p>

              <div className="bg-green-50/70 p-3.5 rounded-2xl border border-green-200/80 space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="font-bold text-green-800 text-sm">📱</span>
                  <div>
                    <span className="font-bold text-green-900 block">{t('pwaChromeAndroid')}</span>
                    <span>{t('pwaChromeAndroidDesc')}</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2 pt-2 border-t border-green-200/60">
                  <span className="font-bold text-green-800 text-sm">🍏</span>
                  <div>
                    <span className="font-bold text-green-900 block">{t('pwaSafariIos')}</span>
                    <span>{t('pwaSafariIosDesc')}</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2 pt-2 border-t border-green-200/60">
                  <span className="font-bold text-green-800 text-sm">💻</span>
                  <div>
                    <span className="font-bold text-green-900 block">{t('pwaDesktop')}</span>
                    <span>{t('pwaDesktopDesc')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                {t('pwaGotIt')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </PWAContext.Provider>
  );
};

export const usePWA = () => useContext(PWAContext);
