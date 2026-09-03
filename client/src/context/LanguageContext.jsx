import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, languageOptions } from '../utils/translations.js';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('kisanqueue_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('kisanqueue_lang', language);
  }, [language]);

  const t = (key, fallback) => {
    if (!key) return '';
    const langDict = translations[language];
    if (langDict && langDict[key] !== undefined) {
      return langDict[key];
    }
    const enDict = translations['en'];
    if (enDict && enDict[key] !== undefined) {
      return enDict[key];
    }
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languageOptions, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
