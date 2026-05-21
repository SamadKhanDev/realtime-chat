import React, { createContext, useState, useEffect } from 'react';


// Create a Context to store the selected language
export const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {}
});

export const LanguageProvider = ({ children }) => {
  // Initialise from localStorage to persist user preference
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preferredLanguage') || 'en';
    }
    return 'en';
  });

  // Keep localStorage in sync when language changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', language);
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
