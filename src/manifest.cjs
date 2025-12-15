const Plugin = {
  UUID: 'pro.popstas.httpbutton',
  version: '1.0.0',
  Icon: 'images/icon.png',
  i18n: {
    en: {
      Name: 'HTTP Button',
      Description: 'HTTP Button with configurable MD file and URL'
    }
  },
  Software: {
    MinimumVersion: '6.5'
  },
  ApplicationsToMonitor: {
    windows: []
  }
};

// Actions array
const Actions = [
  {
    UUID: 'httpButton',
    Icon: 'images/icon.png',
    i18n: {
      en: {
        Name: 'HTTP Button',
        Tooltip: 'HTTP Button'
      }
    },
    state: 0,
    States: [
      {
        FontSize: '10',
        TitleAlignment: 'top',
        Image: 'images/default.png',
        ShowTitle: false
      }
    ],
    Settings: {},
    UserTitleEnabled: false,
    SupportedInMultiActions: false,
    Controllers: ['Keypad', 'Information']
  },
  {
    UUID: 'imageButton',
    Icon: 'images/icon.png',
    i18n: {
      en: {
        Name: 'Image Button',
        Tooltip: 'Image Button'
      }
    },
    state: 0,
    States: [
      {
        FontSize: '10',
        TitleAlignment: 'top',
        Image: 'images/default.png',
        ShowTitle: false
      }
    ],
    Settings: {},
    UserTitleEnabled: false,
    SupportedInMultiActions: false,
    Controllers: ['Keypad', 'Information']
  }
];

// !! Do not modify !!
module.exports = {
  PUUID: Plugin.UUID,
  ApplicationsToMonitor: Plugin.ApplicationsToMonitor,
  Software: Plugin.Software,
  Version: Plugin.version,
  CategoryIcon: Plugin.Icon,
  i18n: Plugin.i18n,
  Actions
};

