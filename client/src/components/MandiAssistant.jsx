import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { MessageSquare, Send, X, Bot, Mic } from 'lucide-react';

const MandiAssistant = () => {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const messagesEndRef = useRef(null);

  // Web Speech API check
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognitionRef = useRef(null);
  const handleSendRef = useRef(null);

  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  useEffect(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => {
        setIsListening(true);
        setSpeechError('');
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        if (handleSendRef.current) {
          handleSendRef.current(transcript);
        }
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setSpeechError(event.error === 'not-allowed' ? t('botSpeechError') : 'Speech error');
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [SpeechRecognition, language]);

  // Seed initial welcome message on language change or open
  useEffect(() => {
    setMessages([
      {
        sender: 'bot',
        text: t('botWelcome'),
        timestamp: new Date()
      }
    ]);
  }, [language, isOpen]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Comprehensive multilingual keyword matches for 11 languages
  const getFaqAnswer = (textLower) => {
    // 1. Documents / ID / Card
    if (/document|id|card|aadhaar|bring|paper|दस्तावेज़|पहचान|कागजात|कागदपत्रे|ਦਸਤਾਵੇਜ਼|દસ્તાવેજ|নথি|ஆவணங்கள்|పత్రాలు|ದಾಖಲೆ|രേഖകൾ|ଦଲିଲ/.test(textLower)) {
      return t('faq2A');
    }
    // 2. Payout / Calculation / Rate / MSP / Money
    if (/payout|money|payment|calculate|rate|price|msp|भुगतान|पेमेंट|पैसा|दर|भाव|एमएसपी|पैसे|हमीभाव|ਭੁਗਤਾਨ|ચુકવણી|পেমেন্ট|கட்டணம்|చెల్లింపు|ಪಾವತಿ|രൂപ|ପେମେଣ୍ଟ/.test(textLower)) {
      return t('faq3A') + " " + t('totalPayoutBilling');
    }
    // 3. Queue / Wait time / Tracking
    if (/queue|wait|position|serving|counter|reach|कतार|प्रतीक्षा|स्थान|काउंटर|रांग|ਕਤਾਰ|કતાર|লাইন|வரிசை|క్యూ|ಕ್ಯೂ|ക്യൂ|ଧାଡ଼ି/.test(textLower)) {
      return t('faq3A');
    }
    // 4. Booking / Slot / Appointment
    if (/slot|book|appoint|schedule|reschedule|स्लॉट|बुक|अपॉइंटमेंट|ਸਲਾਟ|സ്ലോട്ട്|ସ୍ଲଟ୍/.test(textLower)) {
      return t('faq1A');
    }
    // 5. Weight / Quality / Grading
    if (/weight|weigh|quality|grade|reject|तौल|वजन|क्वालिटी|ग्रेड|गुणवत्ता|ਤੋਲ|ગુણવત્તા|ওজন|எடை|బరువు|ತೂಕ|ഭാരം|ଓଜନ/.test(textLower)) {
      return t('weighModalTitle') + ": " + t('gradeAOption') + ", " + t('gradeBOption') + ", " + t('gradeCOption') + ".";
    }
    // 6. Cancel
    if (/cancel|delete|रद्द|कैंसिल|कॅन्सल|ਰੱଦ|રદ|বাতিল|ரத்து|రద్దు|ರದ್ದು|റദ്ദാക്കുക|ବାତିଲ/.test(textLower)) {
      return t('cancelConfirm') + " " + t('cancelBookingBtn');
    }

    return t('botNoMatch');
  };

  const handleSend = (textToSend) => {
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Simulate bot response
    setTimeout(() => {
      const botReplyText = getFaqAnswer(textToSend.toLowerCase());
      const botMsg = {
        sender: 'bot',
        text: botReplyText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    }, 500);
  };

  // Toggle Voice Recognition
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      const langMap = {
        en: 'en-IN',
        hi: 'hi-IN',
        mr: 'mr-IN',
        pa: 'pa-IN',
        gu: 'gu-IN',
        bn: 'bn-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        kn: 'kn-IN',
        ml: 'ml-IN',
        or: 'hi-IN'
      };
      recognitionRef.current.lang = langMap[language] || 'en-IN';
      
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-full shadow-lg flex items-center justify-center transition focus:outline-none cursor-pointer"
          aria-label={t('botName')}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="ml-2 text-xs font-bold hidden sm:inline">{t('botName')}</span>
        </button>
      )}

      {/* Expanded chat window */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[28rem] bg-white rounded-2xl border border-gray-200/80 shadow-xl flex flex-col overflow-hidden text-left">
          
          {/* Header */}
          <div className="bg-emerald-700 text-white px-4 py-3 flex justify-between items-center shrink-0">
            <div className="flex items-center space-x-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm">{t('botName')}</h3>
                <span className="text-4xs text-emerald-200 block uppercase tracking-wider leading-none">{t('botSubtitle')}</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-md transition focus:outline-none cursor-pointer"
              aria-label={t('close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages screen */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-gray-50/50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-2.5 rounded-xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-white border border-gray-200/80 text-gray-800 rounded-tl-none shadow-2xs'
                  }`}
                >
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Tap-to-ask suggestions */}
          {messages.length === 1 && (
            <div className="px-3.5 py-2 bg-gray-50 border-t border-gray-200/80 space-y-1 text-3xs">
              <span className="font-bold text-gray-500 uppercase tracking-wider block">{t('botTapToAsk')}</span>
              <button
                onClick={() => handleSend(t('botQuick1'))}
                className="w-full text-left px-2.5 py-1.5 bg-white hover:bg-emerald-50 border border-gray-200 text-emerald-800 font-medium rounded-lg transition cursor-pointer"
              >
                {t('botQuick1')}
              </button>
              <button
                onClick={() => handleSend(t('botQuick2'))}
                className="w-full text-left px-2.5 py-1.5 bg-white hover:bg-emerald-50 border border-gray-200 text-emerald-800 font-medium rounded-lg transition cursor-pointer"
              >
                {t('botQuick2')}
              </button>
              <button
                onClick={() => handleSend(t('botQuick3'))}
                className="w-full text-left px-2.5 py-1.5 bg-white hover:bg-emerald-50 border border-gray-200 text-emerald-800 font-medium rounded-lg transition cursor-pointer"
              >
                {t('botQuick3')}
              </button>
            </div>
          )}

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            className="p-2.5 bg-white border-t border-gray-200 flex items-center space-x-2 shrink-0"
          >
            {/* Mic voice input button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-lg transition cursor-pointer ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
              }`}
              title="Voice Input"
            >
              <Mic className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isListening ? t('botListening') : t('botPlaceholder')}
              className="flex-1 bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition shadow-2xs cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          {speechError && (
            <div className="bg-red-50 text-red-700 px-3 py-1 text-4xs font-semibold text-center border-t border-red-100">
              ⚠️ {speechError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MandiAssistant;
