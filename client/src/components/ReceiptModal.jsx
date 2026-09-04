import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { 
  FileText, Download, Printer, X, CheckCircle2, 
  MapPin, User, Calendar, ShieldCheck, Scale, IndianRupee, AlertCircle
} from 'lucide-react';
import { 
  extractReceiptData, 
  generateReceiptQRCode, 
  generateReceiptPDF, 
  openPrintReceipt, 
  maskMobile 
} from '../utils/receiptGenerator.js';

const ReceiptModal = ({ isOpen, onClose, payment, booking, farmer }) => {
  const { t, language } = useLanguage();
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const data = extractReceiptData(payment, booking, farmer);

  useEffect(() => {
    if (isOpen) {
      setDownloadSuccess(false);
      setErrorMsg('');
      generateReceiptQRCode(data).then(url => {
        setQrCodeUrl(url);
      });
    }
  }, [isOpen, payment, booking, farmer]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleDownloadPDF = async () => {
    setDownloading(true);
    setErrorMsg('');
    try {
      await generateReceiptPDF({ payment, booking, farmer, t, language });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('PDF generation error', err);
      setErrorMsg(t('receiptErrorMsg'));
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    try {
      openPrintReceipt({ payment, booking, farmer, t, language });
    } catch (err) {
      console.error('Print error', err);
      setErrorMsg(t('receiptErrorMsg'));
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
        {/* Modal Top Bar */}
        <div className="bg-green-700 dark:bg-green-800 text-white p-4 sm:p-5 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="bg-white/20 p-2 rounded-xl">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">{t('farmerReceiptHeader')}</h3>
              <p className="text-4xs sm:text-3xs text-green-200 uppercase tracking-wider">{t('receiptSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs text-gray-700 dark:text-gray-300">
          
          {/* Success / Error Alerts */}
          {downloadSuccess && (
            <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 p-3 rounded-xl flex items-center space-x-2 text-green-800 dark:text-green-300 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span>{t('receiptSuccessMsg')}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-3 rounded-xl flex items-center space-x-2 text-red-800 dark:text-red-300 text-xs font-bold animate-fade-in">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Receipt Header Banner */}
          <div className="bg-green-50/70 dark:bg-green-950/40 border border-green-200/80 dark:border-green-900/60 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <span className="text-4xs uppercase font-extrabold text-green-700 dark:text-green-400 tracking-wider block">{t('receiptNo')}</span>
              <span className="text-sm font-black text-gray-900 dark:text-white">{data.receiptNo}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-4xs uppercase font-extrabold text-green-700 dark:text-green-400 tracking-wider block">{t('tokenNumber')}</span>
                <span className="text-sm font-black text-green-800 dark:text-green-300">{data.tokenNumber}</span>
              </div>
              <div className="border-l border-green-200 dark:border-green-800 pl-4">
                <span className="text-4xs uppercase font-extrabold text-gray-500 dark:text-gray-400 tracking-wider block">{t('generationDate')}</span>
                <span className="text-3xs font-semibold text-gray-700 dark:text-gray-300">{data.date}</span>
              </div>
            </div>
          </div>

          {/* 2-Column Grid: Farmer & Mandi Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Farmer Identification */}
            <div className="bg-gray-50/70 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 rounded-2xl p-4 space-y-2.5">
              <h4 className="text-3xs font-extrabold text-green-700 dark:text-green-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200/60 dark:border-gray-700 pb-1.5">
                <User className="h-3.5 w-3.5" /> {t('farmerDetailsSection')}
              </h4>
              <div className="space-y-1 text-2xs">
                <p className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('name')}:</span><b className="text-gray-900 dark:text-white">{data.farmerName}</b></p>
                <p className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('farmerId')}:</span><b className="text-gray-900 dark:text-white">{data.farmerId}</b></p>
                <p className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('mobileNumber')}:</span><b className="text-gray-900 dark:text-white">{maskMobile(data.mobileNumber)}</b></p>
                <p className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('village')} / {t('district')}:</span><span className="font-semibold text-gray-800 dark:text-gray-200">{data.village}, {data.district}</span></p>
                <p className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('state')}:</span><span className="font-semibold text-gray-800 dark:text-gray-200">{data.state}</span></p>
              </div>
            </div>

            {/* Mandi & Booking Details */}
            <div className="bg-gray-50/70 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 rounded-2xl p-4 space-y-2.5">
              <h4 className="text-3xs font-extrabold text-green-700 dark:text-green-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200/60 dark:border-gray-700 pb-1.5">
                <MapPin className="h-3.5 w-3.5" /> {t('bookingDetailsSection')}
              </h4>
              <div className="space-y-1 text-2xs">
                <p className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('thCentre')}:</span><b className="text-gray-900 dark:text-white">{data.centreName}</b></p>
                <p className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('locationLabel')}:</span><span className="text-gray-800 dark:text-gray-200 font-semibold">{data.centreLocation}</span></p>
                <p className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('thDate')}:</span><b className="text-gray-900 dark:text-white">{data.date}</b></p>
                <p className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('scheduledSlot')}:</span><b className="text-gray-900 dark:text-white">{data.slotTime}</b></p>
                <p className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('thStatus')}:</span><span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full font-extrabold text-4xs uppercase">{t(data.paymentStatus)}</span></p>
              </div>
            </div>
          </div>

          {/* Section: Crop Weighment & Quality Assessment */}
          <div className="bg-gray-50/70 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 rounded-2xl p-4 space-y-3">
            <h4 className="text-3xs font-extrabold text-green-700 dark:text-green-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200/60 dark:border-gray-700 pb-1.5">
              <Scale className="h-3.5 w-3.5" /> {t('cropDetailsSection')}
            </h4>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-2xs divide-y divide-gray-200 dark:divide-gray-700 text-left">
                <thead>
                  <tr className="bg-green-100/70 dark:bg-green-950/70 text-green-900 dark:text-green-300 font-extrabold text-4xs uppercase tracking-wider">
                    <th className="py-2 px-2.5 rounded-l-lg">{t('thCrop')}</th>
                    <th className="py-2 px-2">{t('quantity')} ({t('BOOKED')})</th>
                    <th className="py-2 px-2">{t('netWeight')} ({t('COMPLETED')})</th>
                    <th className="py-2 px-2">{t('qualityGrade')}</th>
                    <th className="py-2 px-2.5 rounded-r-lg">{t('mspRatePerQtl')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr className="font-semibold text-gray-800 dark:text-gray-200">
                    <td className="py-2.5 px-2.5 font-bold text-gray-900 dark:text-white">🌾 {t(`crop${data.cropType.replace(/[^a-zA-Z]/g, '')}`, data.cropType)}</td>
                    <td className="py-2.5 px-2">{data.approxWeight} {t('quintals')}</td>
                    <td className="py-2.5 px-2 font-bold text-green-700 dark:text-green-400">{data.actualWeight} {t('quintals')}</td>
                    <td className="py-2.5 px-2">
                      <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-md text-4xs font-extrabold">
                        {data.qualityGrade}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 font-bold text-gray-900 dark:text-white">₹{data.ratePerQuintal} / {t('quintals')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-4xs text-gray-500 dark:text-gray-400 space-y-0.5 pt-1 border-t border-gray-200/60 dark:border-gray-700">
              <p>✔ {t('weighbridgeCalibration')}</p>
              <p>✔ {t('moisturePermissible')}</p>
            </div>
          </div>

          {/* Section: Financial Settlement & Payout */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-4 space-y-3">
            <h4 className="text-3xs font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-200/60 dark:border-emerald-900/60 pb-1.5">
              <IndianRupee className="h-3.5 w-3.5" /> {t('paymentDetailsSection')}
            </h4>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 gap-2">
              <div>
                <span className="text-4xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">{t('totalPayable')}</span>
                <span className="text-3xs text-gray-400 dark:text-gray-500">{t('directBankTransfer')}</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-green-700 dark:text-green-400">
                ₹{Number(data.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs pt-1">
              <div className="flex items-center justify-between bg-white/70 dark:bg-gray-800/80 p-2 rounded-lg border border-emerald-100/60 dark:border-emerald-900/40">
                <span className="text-gray-500 dark:text-gray-400">{t('payoutStatus')}:</span>
                <span className={`px-2 py-0.5 rounded-full font-extrabold text-4xs uppercase ${
                  data.paymentStatus === 'COMPLETED' ? 'bg-green-600 text-white' :
                  data.paymentStatus === 'PROCESSING' ? 'bg-blue-600 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {t(data.paymentStatus)}
                </span>
              </div>
              <div className="flex items-center justify-between bg-white/70 dark:bg-gray-800/80 p-2 rounded-lg border border-emerald-100/60 dark:border-emerald-900/40">
                <span className="text-gray-500 dark:text-gray-400">{t('transactionRef')}:</span>
                <span className="font-mono font-bold text-gray-800 dark:text-gray-200 text-3xs">{data.transactionId}</span>
              </div>
            </div>
          </div>

          {/* Section: QR Code Verification & Footer Disclaimer */}
          <div className="bg-gray-50/70 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="space-y-1 text-2xs text-gray-500 dark:text-gray-400 flex-1">
              <h5 className="font-extrabold text-green-800 dark:text-green-300 text-3xs flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" /> {t('qrVerification')}
              </h5>
              <p className="text-4xs text-gray-500 dark:text-gray-400">{t('qrVerificationNote')}</p>
              <p className="text-4xs text-gray-500 dark:text-gray-400 pt-1">📞 {t('phoneCall')}: <b>1800-425-1555</b> ({t('tollFree')}) | ✉️ <b>support@kisanqueue.gov.in</b></p>
              <p className="text-5xs text-gray-400 dark:text-gray-500 italic pt-1">{t('disclaimer')}</p>
            </div>
            {qrCodeUrl && (
              <div className="flex-shrink-0 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs text-center">
                <img src={qrCodeUrl} alt="Receipt QR Code" className="w-24 h-24 sm:w-28 sm:h-28 mx-auto" />
                <span className="text-5xs text-gray-400 dark:text-gray-400 font-bold uppercase block mt-1">Scan to Verify</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex flex-wrap justify-between items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
          >
            {t('close')}
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-green-300 dark:border-green-800 rounded-xl text-xs font-bold text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-950/60 hover:bg-green-100 dark:hover:bg-green-900/60 shadow-2xs transition cursor-pointer"
            >
              <Printer className="h-4 w-4 text-green-700 dark:text-green-400" />
              <span>{t('printReceipt')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {downloading ? (
                <>
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
                  <span>{t('receiptGenerating')}</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>{t('downloadPDF')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReceiptModal;
