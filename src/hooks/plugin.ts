import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

// Plugin hooks
export const usePluginStore = defineStore('pluginStore', () => {
  const pluginUuid = window.argv?.[3]?.plugin?.uuid || 'pro.popstas.httpbutton';
  document.title = pluginUuid + ' - Plugin';

  // Timer thread
  const Timer = new Worker('interval.js');
  const TimerSubscribe: { uuid: string; fn: () => void }[] = [];
  Timer.addEventListener('message', ({ data: { event, uuid } }: { data: { event: string; uuid: string } }) => {
    const subIndex = TimerSubscribe.findIndex((item) => item.uuid === uuid);
    subIndex !== -1 && event === 'setInterval' && TimerSubscribe[subIndex].fn();
  });

  // Create timer
  const Interval = (uuid: string, delay: number, fn: () => void) => {
    TimerSubscribe.findIndex((item) => item.uuid === uuid) === -1 && TimerSubscribe.push({ uuid, fn });
    Timer.postMessage({ event: 'setInterval', uuid, delay });
  };

  // Destroy timer
  const Unterval = (uuid: string) => {
    const subIndex = TimerSubscribe.findIndex((item) => item.uuid === uuid);
    subIndex !== -1 && TimerSubscribe.splice(subIndex, 1);
    Timer.postMessage({ event: 'clearInterval', uuid });
  };

  // Connect to software
  const message = ref<StreamDock.Message>();
  let server: WebSocket | null = null;

  // Queue for pending images to send when WebSocket opens
  const pendingImages: Array<{ context: string; image: string }> = [];

  const sendPendingImages = () => {
    if (pendingImages.length === 0) return;
    while (pendingImages.length > 0) {
      const item = pendingImages.shift();
      if (item && server && server.readyState === WebSocket.OPEN) {
        try {
          server.send(JSON.stringify({ event: 'setImage', context: item.context, payload: { target: 0, image: item.image } }));
        } catch (error) {
          console.error('[Plugin Store] Error sending pending image:', error);
        }
      }
    }
  };

  // Only connect if we have valid argv (not in dev mode)
  if (window.argv && typeof window.argv[0] === 'string' && window.argv[1] && window.argv[2]) {
    try {
      server = new WebSocket('ws://127.0.0.1:' + window.argv[0]);
      server.onopen = () => {
        server!.send(JSON.stringify({ event: window.argv[2], uuid: window.argv[1] }));
        sendPendingImages();
        Interval('sendPendingImages', 5000, () => {
          sendPendingImages();
        });
      };
      server.onmessage = (e) => {
        try {
          message.value = JSON.parse(e.data);
        } catch (error) {
          console.error('[Plugin Store] Failed to parse message:', error);
        }
      };
      server.onerror = (error) => {
        console.error('[Plugin Store] WebSocket error:', error);
      };
      server.onclose = () => {
        Unterval('sendPendingImages');
      };
    } catch (error) {
      console.warn('WebSocket connection failed (dev mode?):', error);
    }
  }

  // Global settings data
  const globalSettings = ref<any>();
  const devices = ref<Set<string>>(new Set());
  const userInfo = ref<any>({});

  const setGlobalSettings = (payload: any) => {
    if (server) {
      server.send(JSON.stringify({ event: 'setGlobalSettings', context: window.argv[1], payload }));
    }
    globalSettings.value = payload;
  };

  const getGlobalSettings = () => {
    if (server) {
      server.send(JSON.stringify({ event: 'getGlobalSettings', context: window.argv[1] }));
    }
  };

  // Action data storage
  class Actions {
    settings: {};
    action: string;
    context: string;
    title: string;
    titleParameters = {} as titleParameters;
    constructor(action: string, context: string, settings: {}) {
      this.action = action;
      this.context = context;
      this.settings = settings;
    }

    static list: Actions[] = [];
    static addAction = (action: string, context: string, settings: {}) => {
      const instance = new Actions(action, context, settings);
      this.list.push(instance);
      return instance;
    };

    static delAction = (context: string) => {
      const i = this.list.findIndex((item) => item.context === context);
      i !== -1 && this.list.splice(i, 1);
    };

    static getAction = (context: string) => {
      return Actions.list.find((item) => item.context === context);
    };

    static getActions = (action: string) => {
      return this.list.filter((item) => item.action === action);
    };

    static getList = () => { 
      return Actions.list
    };

    sendToPropertyInspector = (payload: any) => {
      if (!server) return;
      server.send(JSON.stringify({ event: 'sendToPropertyInspector', action: this.action, context: this.context, payload }));
    };

    setState = (state: number) => {
      if (!server) return;
      server.send(JSON.stringify({ event: 'setState', context: this.context, payload: { state } }));
    };

    setTitle = (title: string) => {
      if (!server) return;
      server.send(JSON.stringify({ event: 'setTitle', context: this.context, payload: { title, target: 0 } }));
    };

    setImage = (url: string) => {
      console.log('[Plugin Store] setImage called for context:', this.context, 'url type:', url.substring(0, 50));
      
      if (!server) {
        console.log('[Plugin Store] setImage: No server, adding to pending images');
        pendingImages.push({ context: this.context, image: url });
        return;
      }

      if (server.readyState !== WebSocket.OPEN) {
        console.log('[Plugin Store] setImage: Server not open, readyState:', server.readyState, 'adding to pending images');
        pendingImages.push({ context: this.context, image: url });
        return;
      }

      if (url.includes('data:')) {
        try {
          const message = JSON.stringify({ event: 'setImage', context: this.context, payload: { target: 0, image: url } });
          console.log('[Plugin Store] setImage: Sending data URL, message length:', message.length);
          server.send(message);
          console.log('[Plugin Store] setImage: Message sent successfully');
        } catch (error) {
          console.error('[Plugin Store] setImage: Error sending image:', error);
          pendingImages.push({ context: this.context, image: url });
        }
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
        if (server) {
          server.send(JSON.stringify({ event: 'setImage', context: this.context, payload: { target: 0, image: canvas.toDataURL('image/png') } }));
        }
      };
    };

    setSettings = (payload: any) => {
      this.settings = payload;
      if (!server) return;
      server.send(JSON.stringify({ event: 'setSettings', context: this.context, payload }));
    };

    openUrl = (url: string) => {
      if (!server) return;
      server.send(JSON.stringify({ event: 'openUrl', payload: { url } }));
    };
  }

  class EventEmitter {
    events: { [key: string]: any[] };
    constructor() {
      this.events = {};
    }

    subscribe(event: string, listener: Function) {
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].push(listener);
    }

    unsubscribe(event: string) {
      if (!this.events[event]) return;
      this.events[event] = null;
    }

    emit(event: string, data: any) {
      if (!this.events[event]) return;
      this.events[event].forEach((listener) => listener(data));
    }
  }

  const eventEmitter = new EventEmitter();

  // Fetch text with optional basic auth (POST request)
  const fetchText = async (
    url: string,
    options?: { username?: string; password?: string; button?: number; name?: string }
  ): Promise<{ success: boolean; error?: string; text?: string }> => {
    try {
      const headers: HeadersInit = {};

      // Add Basic Auth header if credentials are provided
      if (options?.username && options?.password) {
        const credentials = btoa(`${options.username}:${options.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const payload: { button: number; name?: string } = {
        button: options?.button ?? 0
      };
      if (options?.name !== undefined) {
        payload.name = options.name;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}${errorText ? ' - ' + errorText : ''}`
        };
      }

      const text = await response.text();
      return {
        success: true,
        text
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  };

  // Send HTTP request with optional basic auth
  const sendHttpRequest = async (
    url: string,
    data: { [key: string]: any },
    options?: { username?: string; password?: string }
  ): Promise<{ success: boolean; error?: string; response?: any }> => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      // Add Basic Auth header if credentials are provided
      if (options?.username && options?.password) {
        const credentials = btoa(`${options.username}:${options.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}${errorText ? ' - ' + errorText : ''}`
        };
      }

      const result = await response.json().catch(() => ({}));
      return {
        success: true,
        response: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  };

  return {
    message,
    globalSettings,
    eventEmitter,
    devices,
    userInfo,
    Interval,
    Unterval,
    setGlobalSettings,
    getGlobalSettings,
    fetchText,
    sendHttpRequest,
    sendPendingImages,
    ActionArr: Actions.list,
    getAction: Actions.getAction,
    addAction: Actions.addAction,
    delAction: Actions.delAction,
    getActions: Actions.getActions
  };
});

type MessageTypes = { plugin: StreamDock.PluginMessage; action: StreamDock.ActionMessage };
type payload = {
  settings: any;
};

export const useWatchEvent = <T extends keyof MessageTypes>(type: T, MessageEvents: MessageTypes[T]) => {
  const plugin = usePluginStore();

  if (type === 'plugin') {
    return watch(
      () => plugin.message,
      () => {
        if (!plugin.message) return;
        if (plugin.message.action) return;

        MessageEvents[plugin.message.event]?.(JSON.parse(JSON.stringify(plugin.message)));
        if (plugin.message.event === 'didReceiveGlobalSettings') {
          const settings = (plugin.message.payload as payload).settings;
          plugin.globalSettings = settings;
        } else if (plugin.message.event === 'deviceDidConnect') {
          const device = (plugin.message as any).device;
          if (device) {
            plugin.devices.add(device);
          }
        } else if (plugin.message.event === 'deviceDidDisconnect') {
          const device = (plugin.message as any).device;
          if (device) {
            plugin.devices.delete(device);
          }
        } else if (plugin.message.event === 'sendUserInfo') {
          plugin.userInfo = plugin.message.payload;
        }
      },
      { immediate: true }
    );
  }

  const Events: StreamDock.ActionMessage = {
    willAppear({ action, context, payload }) {
      !plugin.getAction(context) && plugin.addAction(action, context, payload.settings);
    },
    willDisappear({ context }) {
      plugin.delAction(context);
    },
    didReceiveSettings({ context, payload }) {
      const action = plugin.getAction(context);
      if (action) {
        action.settings = payload.settings;
      }
    },
    titleParametersDidChange({ context, payload }) {
      const action = plugin.getAction(context);
      if (action) {
        action.title = payload.title;
        action.titleParameters = payload.titleParameters;
      }
    }
  };

  const expectedActionID = (MessageEvents as any)['ActionID'];

  return watch(
    () => plugin.message,
    () => {
      if (!plugin.message) return;

      const messageAction = plugin.message.action;
      const messageEvent = plugin.message.event;

      if (!messageAction) return;
      if (!expectedActionID) return;
      if (messageAction !== expectedActionID) return;
      if (messageEvent === 'ActionID') return;

      const data = JSON.parse(JSON.stringify(plugin.message));

      const baseHandler = Events[plugin.message.event as keyof typeof Events];
      if (baseHandler && typeof baseHandler === 'function') {
        try {
          (baseHandler as any).call(Events, data);
        } catch (error) {
          console.error('[useWatchEvent] Error calling base handler:', error);
        }
      }

      const customHandler = MessageEvents[plugin.message.event as keyof typeof MessageEvents];
      if (customHandler && typeof customHandler === 'function') {
        customHandler(data);
      }
    },
    { immediate: true }
  );
};

