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
      className="glass-panel px-3 py-1 rounded-lg text-sm"
    >
      <option value="en">EN</option>
      <option value="hi">HI</option>
      <option value="te">TE</option>
    </select>
  );
};

export default LanguageSelector;
