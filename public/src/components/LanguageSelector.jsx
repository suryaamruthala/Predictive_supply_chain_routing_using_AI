import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <select 
        onChange={changeLanguage} 
        value={i18n.language}
        className="bg-slate-800/80 text-textMain border border-white/20 p-2 rounded-lg outline-none cursor-pointer hover:bg-slate-700/80 transition-colors"
    >
      <option value="en">English (EN)</option>
      <option value="hi">हिंदी (HI)</option>
      <option value="te">తెలుగు (TE)</option>
    </select>
  );
};

export default LanguageSelector;
