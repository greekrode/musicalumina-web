import { useLanguage } from '../lib/LanguageContext';

function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
      className="flex items-center space-x-2 px-3 py-1 rounded-md hover:bg-gray-200 transition-colors"
      title={t('registration.changeLanguage')}
    >
      <span className="w-6 h-4 relative">
        {language === 'en' ? (
          <img
            src="https://flagcdn.com/w40/gb.png"
            alt="English"
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <img
            src="https://flagcdn.com/w40/id.png"
            alt="Bahasa Indonesia"
            className="w-full h-full object-cover rounded"
          />
        )}
      </span>
      <span className="text-sm text-gray-500">
        {language === 'en' ? 'EN' : 'ID'}
      </span>
      <span className="text-sm text-gray-500 hidden sm:inline">
        {t('registration.changeLanguage')}
      </span>
    </button>
  );
}

export default LanguageSwitcher; 