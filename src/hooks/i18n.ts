export const useI18nStore = () => {
  const language = window.argv[3].application.language;
  const localString = {
    en: {
      'Operation options': 'Operation options'
    }
  };
  return localString[language] || localString['en'];
};
