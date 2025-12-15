import { createApp, defineAsyncComponent } from 'vue';
import { createPinia } from 'pinia';
import Plugin from '@/plugin/index.vue';
import Property from '@/pages/index.vue';
import './main.css';

// Software interface
window.connectSDSocket = function () {
  window.argv = [arguments[0], arguments[1], arguments[2], JSON.parse(arguments[3]), arguments[4] && JSON.parse(arguments[4])];
  const app = arguments[4] ? createApp(Property) : createApp(Plugin);
  app.use(createPinia()).mount('#app');
};

// Compatible with Elgato interface
window.connectSocket = window.connectSDSocket;
window.connectElgatoStreamDeckSocket = window.connectSDSocket;

// Development mode: auto-mount if window.argv is not set (running in browser)
if (typeof window.argv === 'undefined') {
  window.argv = [
    '12345',
    'mock-context',
    'registerPlugin',
    {
      application: {
        font: 'Arial',
        language: 'en',
        platform: 'windows',
        platformVersion: '10.0',
        version: '1.0.0'
      },
      plugin: {
        uuid: 'pro.popstas.httpbutton',
        version: '1.0.0'
      }
    },
    null
  ] as StreamDock.Argv;

  const app = createApp(Plugin);
  app.use(createPinia());
  app.mount('#app');
}

