import TabView from '@/components/tab-view.vue';
import { defineStore } from 'pinia';
import { ref, watch, nextTick } from 'vue';

export { TabView };
export const usePropertyStore = defineStore('propertyStore', () => {
  document.title = window.argv[3].plugin.uuid + ' - Property Inspector';

  const preventWatch = ref(false);
  const settings = ref(window.argv[4].payload.settings);
  watch(
    settings,
    () => {
      if (preventWatch.value) return;
      server.send(
        JSON.stringify({
          event: 'setSettings',
          context: window.argv[1],
          payload: settings.value
        })
      );
    },
    { deep: true }
  );

  const message = ref<StreamDock.Message>();
  const server = new WebSocket('ws://127.0.0.1:' + window.argv[0]);
  const pendingSettings: any[] = [];
  
  server.onopen = () => {
    server.send(JSON.stringify({ event: window.argv[2], uuid: window.argv[1] }));
    // Send any pending settings
    while (pendingSettings.length > 0) {
      const settings = pendingSettings.shift();
      server.send(
        JSON.stringify({
          event: 'setSettings',
          context: window.argv[1],
          payload: settings
        })
      );
    }
  };
  server.onmessage = (e) => {
    message.value = JSON.parse(e.data);
  };
  server.onerror = (error) => {
    console.error('[Property Store] WebSocket error:', error);
  };
  server.onclose = () => {
    console.log('[Property Store] WebSocket closed');
  };

  const sendToPlugin = (payload: any) => {
    const message = {
      event: 'sendToPlugin',
      action: window.argv[4].action,
      context: window.argv[1],
      payload
    };
    server.send(JSON.stringify(message));
  };

  const setState = (state: number) => {
    server.send(
      JSON.stringify({
        event: 'setState',
        context: window.argv[4].context,
        payload: { state }
      })
    );
  };

  const setTitle = (title: string) => {
    server.send(
      JSON.stringify({
        event: 'setTitle',
        context: window.argv[4].context,
        payload: {
          title,
          target: 0
        }
      })
    );
  };

  const getGlobalSettings = () => {
    server.send(
      JSON.stringify({
        event: 'getGlobalSettings',
        context: window.argv[1]
      })
    );
  };

  const setGlobalSettings = (payload: any) => {
    const message = {
      event: 'setGlobalSettings',
      context: window.argv[1],
      payload
    };
    server.send(JSON.stringify(message));
  };

  const setSettings = (payload: any) => {
    if (server.readyState === WebSocket.OPEN) {
      server.send(
        JSON.stringify({
          event: 'setSettings',
          context: window.argv[1],
          payload
        })
      );
      console.log('[Property Store] Settings sent:', payload);
    } else {
      console.warn('[Property Store] WebSocket not ready, queuing settings');
      pendingSettings.push(payload);
    }
  };

  const setImage = (url: string) => {
    if (url.includes('data:')) {
      server.send(JSON.stringify({ event: 'setImage', context: window.argv[4].context, payload: { target: 0, image: url } }));
      return;
    }
    const image = new Image();
    image.src = url;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      server.send(JSON.stringify({ event: 'setImage', context: window.argv[4].context, payload: { target: 0, image: canvas.toDataURL('image/png') } }));
    };
  };

  const openUrl = (url: string) => {
    server.send(
      JSON.stringify({
        event: 'openUrl',
        payload: { url }
      })
    );
  };

  return {
    message,
    preventWatch,
    settings,
    sendToPlugin,
    getGlobalSettings,
    setGlobalSettings,
    setSettings,
    setState,
    setTitle,
    setImage,
    openUrl
  };
});

export const useWatchEvent = (MessageEvents: StreamDock.ProperMessage) => {
  const property = usePropertyStore();
  const Events: StreamDock.ProperMessage = {
    didReceiveSettings(data) {
      property.preventWatch = true;
      property.settings = data.payload.settings;
      nextTick(() => {
        property.preventWatch = false;
      });
    }
  };
  watch(
    () => property.message,
    () => {
      if (!property.message) return;
      const data = JSON.parse(JSON.stringify(property.message));
      Events[property.message.event]?.(data);
      MessageEvents[property.message.event]?.(data);
    }
  );
};

