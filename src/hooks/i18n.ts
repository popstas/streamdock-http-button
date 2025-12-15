export const useI18nStore = () => {
  const language = window.argv[3].application.language;
  const localString = {
    en: {
      'Operation options': 'Operation options'
    },
    zh_CN: {
      'Operation options': '操作选项'
    }
  };
  return localString[language] || localString['en'];
};
