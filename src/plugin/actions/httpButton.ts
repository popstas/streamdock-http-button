import { usePluginStore, useWatchEvent } from '@/hooks/plugin';

export default function (name: string) {
  const pluginUuid = window.argv?.[3]?.plugin?.uuid || 'pro.popstas.httpbutton';
  const ActionID = `${pluginUuid}.${name}`;

  const plugin = usePluginStore();
  
  // Debug: Check if fetchText is available
  if (typeof plugin.fetchText !== 'function') {
    console.warn('[HTTPButton] fetchText not available on plugin store. Available methods:', Object.keys(plugin));
  }

  // Store previous content to detect changes (per context)
  const textMdContentMap = new Map<string, string>();

  // Store cleanup functions for file watchers (per context)
  const watcherCleanups = new Map<string, () => void>();

  // Escape XML special characters
  const escapeXml = (s: string): string => {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  // Generate SVG with multi-line text from MD file
  const makeKeySvg = (lines: string[]): string => {
    const W = 128;
    const H = 128;
    const fontSize = 20;
    const lineHeight = 32;

    // Calculate y positions: center the block of text vertically
    const centerY = H / 2;
    const totalTextHeight = (lines.length - 1) * lineHeight;
    const firstY = Math.round(centerY - totalTextHeight / 2 + fontSize / 2);

    const textElements = lines
      .map((line, i) => {
        const y = Math.round(firstY + i * lineHeight);
        return `  <text x="${W / 2}" y="${y}" text-anchor="middle" font-family="Arial, Segoe UI" font-size="${fontSize}" fill="#fff">${escapeXml(line)}</text>`;
      })
      .join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="18" fill="#111"/>
${textElements}
</svg>`;
  };

  // Save SVG to data/images/last.svg via localhost:5173
  const saveSvgToFile = async (svg: string) => {
    try {
      // Send POST request to localhost:5173 to save the SVG
      const response = await fetch('http://localhost:5173/api/save-svg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          svg: svg,
          path: 'images/last.svg'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[HTTPButton] SVG saved successfully to data/images/last.svg');
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.warn('[HTTPButton] Failed to save SVG via server:', error);
      }
    } catch (error) {
      // If localhost:5173 is not available (e.g., in production), silently fail
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.debug('[HTTPButton] Dev server not available, skipping SVG save');
      } else {
        console.error('[HTTPButton] Failed to save SVG:', error);
      }
    }
  };

  // Save MD file to data/ directory via localhost:5173
  const saveMdToFile = async (text: string, mdFilePath: string) => {
    try {
      // Send POST request to localhost:5173 to save the MD file
      const response = await fetch('http://localhost:5173/api/save-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          path: mdFilePath
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[HTTPButton] MD file saved successfully to data/${mdFilePath}`);
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.warn('[HTTPButton] Failed to save MD file via server:', error);
      }
    } catch (error) {
      // If localhost:5173 is not available (e.g., in production), silently fail
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.debug('[HTTPButton] Dev server not available, skipping MD file save');
      } else {
        console.error('[HTTPButton] Failed to save MD file:', error);
      }
    }
  };

  // Load text content from file or HTTP URL (shared function)
  const loadTextContent = async (context: string): Promise<string | null> => {
    const action = plugin.getAction(context);
    if (!action) return null;

    const settings = action.settings as any;
    const mdFilePath = settings?.mdFilePath || 'text.md';
    const textUrl = settings?.textUrl || '';
    const username = settings?.httpUsername || '';
    const password = settings?.httpPassword || '';

    let text = '';
    
    // Try to fetch from textUrl first if provided, otherwise use file
    if (textUrl) {
      // Check if fetchText is available, otherwise use direct fetch
      if (typeof plugin.fetchText === 'function') {
        const authOptions = username && password ? { username, password } : undefined;
        const fetchOptions: any = { ...authOptions, button: 0 };
        if (mdFilePath && mdFilePath.trim()) {
          const name = mdFilePath.replace(/\.md$/, '').trim();
          if (name) {
            fetchOptions.name = name;
          }
        }
        console.log('[HTTPButton] Fetching text with options:', { textUrl, button: fetchOptions.button, name: fetchOptions.name });
        const result = await plugin.fetchText(textUrl, fetchOptions);
        if (result.success && result.text) {
          text = result.text;
          // Save to mdFilePath after fetching from textUrl
          await saveMdToFile(text, mdFilePath);
        } else {
          console.error(`[HTTPButton] Failed to load from ${textUrl}:`, result.error);
          // Fallback to file if HTTP fails
          const response = await fetch(`/data/${mdFilePath}?t=${Date.now()}`);
          if (response.ok) {
            text = await response.text();
          } else {
            console.error(`[HTTPButton] Failed to load ${mdFilePath}: ${response.status}`);
            return null;
          }
        }
      } else {
        // Fallback: use direct fetch with Basic Auth
        console.warn('[HTTPButton] fetchText not available, using direct fetch');
        try {
          const headers: HeadersInit = {};
          if (username && password) {
            const credentials = btoa(`${username}:${password}`);
            headers['Authorization'] = `Basic ${credentials}`;
          }
          const payload: any = { button: 0 };
          if (mdFilePath && mdFilePath.trim()) {
            const name = mdFilePath.replace(/\.md$/, '').trim();
            if (name) {
              payload.name = name;
            }
          }
          console.log('[HTTPButton] Direct fetch with payload:', payload);
          const response = await fetch(textUrl, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          if (response.ok) {
            text = await response.text();
            // Save to mdFilePath after fetching from textUrl
            await saveMdToFile(text, mdFilePath);
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error: any) {
          console.error(`[HTTPButton] Failed to load from ${textUrl}:`, error);
          // Fallback to file if HTTP fails
          const response = await fetch(`/data/${mdFilePath}?t=${Date.now()}`);
          if (response.ok) {
            text = await response.text();
          } else {
            console.error(`[HTTPButton] Failed to load ${mdFilePath}: ${response.status}`);
            return null;
          }
        }
      }
    } else {
      // Use file as before
      const response = await fetch(`/data/${mdFilePath}?t=${Date.now()}`);
      if (!response.ok) {
        console.error(`[HTTPButton] Failed to load ${mdFilePath}: ${response.status}`);
        return null;
      }
      text = await response.text();
    }

    return text;
  };

  // Load text content from file or HTTP URL and generate SVG image
  const loadButtonContent = async (context: string, forceUpdate = false) => {
    try {
      const action = plugin.getAction(context);
      if (!action) return;

      const text = await loadTextContent(context);
      console.log('[HTTPButton] Loaded text:', text);
      if (!text) return;

      const previousContent = textMdContentMap.get(context) || '';
      
      if (text === previousContent && !forceUpdate) {
        return;
      }

      textMdContentMap.set(context, text);

      const lines = text
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('button content:'))
        .map((line) => line.trim());

      if (lines.length === 0) {
        return;
      }

      const svg = makeKeySvg(lines);
      const dataUrl = 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(svg);
      const testSvg128x128 = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect x="0" y="0" width="128" height="128" fill="#111"/>
  <text x="64" y="64" text-anchor="middle" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="18" fill="#fff" dominant-baseline="middle">Test</text>
</svg>`;
      const dataUrlTest = 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(testSvg128x128);

      console.log('[HTTPButton] Calling setImage with dataUrl length:', dataUrl.length);
      console.log('[HTTPButton] Action context:', action.context);
      console.log('[HTTPButton] SVG preview:', svg.substring(0, 100) + '...');
      
      // Check if MD file exists, and save it if not exists (only if loaded from textUrl)
      const settings = action.settings as any;
      const mdFilePath = settings?.mdFilePath || 'text.md';
      const textUrl = settings?.textUrl || '';
      
      if (textUrl) {
        // If content was loaded from textUrl, check if local MD file exists
        try {
          const fileCheckResponse = await fetch(`/data/${mdFilePath}?t=${Date.now()}`);
          if (!fileCheckResponse.ok && fileCheckResponse.status === 404) {
            // File doesn't exist, save it
            console.log(`[HTTPButton] MD file ${mdFilePath} not found, saving content...`);
            await saveMdToFile(text, mdFilePath);
          }
        } catch (error) {
          // If fetch fails (e.g., in production), silently continue
          console.debug('[HTTPButton] Could not check MD file existence, continuing...');
        }
      }
      
      try {
        action.setImage(dataUrl);
        // action.setImage(dataUrlTest);
        console.log('[HTTPButton] setImage called successfully');
      } catch (error) {
        console.error('[HTTPButton] Error calling setImage:', error);
      }
      
      // Save SVG to data/images/last.svg after setImage
      saveSvgToFile(svg);
      
      if (forceUpdate || text !== previousContent) {
        const source = textUrl || mdFilePath;
        console.log(`[HTTPButton] Updated button content from ${source} (${lines.length} buttons)`);
      }
    } catch (error) {
      console.error('[HTTPButton] Failed to load MD file:', error);
    }
  };

  // Watch MD file for changes
  const watchMdFile = (context: string) => {
    // Clean up existing watcher if any
    const existingCleanup = watcherCleanups.get(context);
    if (existingCleanup) {
      existingCleanup();
    }

    const action = plugin.getAction(context);
    if (!action) return;

    const settings = action.settings as any;
    const DEFAULT_UPDATE_INTERVAL = 60000; // 60 seconds default
    const updateInterval = settings?.updateInterval || DEFAULT_UPDATE_INTERVAL;
    
    // Ensure updateInterval is a valid number and at least 1000ms (1 second)
    const interval = Math.max(1000, Number(updateInterval) || DEFAULT_UPDATE_INTERVAL);

    const intervalId = `md-file-watch-${context}`;
    plugin.Interval(intervalId, interval, () => {
      loadButtonContent(context, false);
    });
    
    const cleanup = () => {
      plugin.Unterval(intervalId);
      watcherCleanups.delete(context);
      textMdContentMap.delete(context);
    };
    
    watcherCleanups.set(context, cleanup);
    return cleanup;
  };

  // Handle HTTP request on button press
  const handleButtonPress = async (context: string, buttonIndex: number) => {
    const action = plugin.getAction(context);
    if (!action) return;

    const DEFAULT_HTTP_URL = 'https://node-red.shome.popstas.ru/actions/mirabox/button';
    const settings = action.settings as any;
    const httpUrl = settings?.httpUrl || DEFAULT_HTTP_URL;
    const username = settings?.httpUsername || '';
    const password = settings?.httpPassword || '';

    // Send buttonIndex as value
    try {
      const result = await plugin.sendHttpRequest(
        httpUrl,
        {
          button: buttonIndex
        },
        username && password ? { username, password } : undefined
      );

      if (!result.success) {
        console.error('[HTTPButton] HTTP request failed:', result.error);
      } else {
        // Update source text after successful button press
        console.log(`[HTTPButton] Button pressed, updating source text: ${context}`);
        textMdContentMap.delete(context);
        loadButtonContent(context, true);
      }
    } catch (error) {
      console.error('[HTTPButton] Error handling button press:', error);
    }
  };

  useWatchEvent('action', {
    ActionID,
    willAppear({ context, payload }) {
      console.log(`[HTTPButton] Action appeared: ${context}`);
      loadButtonContent(context, true);
      watchMdFile(context);
    },
    willDisappear({ context }) {
      console.log(`[HTTPButton] Action disappeared: ${context}`);
      const cleanup = watcherCleanups.get(context);
      if (cleanup) {
        cleanup();
      }
    },
    didReceiveSettings({ context, payload }) {
      // Restart watcher if settings changed (e.g., mdFilePath)
      console.log(`[HTTPButton] Settings updated: ${context}`);
      // Clear cached content to force reload
      textMdContentMap.delete(context);
      loadButtonContent(context, true);
      watchMdFile(context);
    },
    keyUp({ context, payload }) {
      const action = plugin.getAction(context);
      let buttonIndex = 1;
      if (action?.settings && typeof (action.settings as any).buttonIndex === 'number') {
        buttonIndex = (action.settings as any).buttonIndex;
      } else if (payload?.coordinates) {
        const row = payload.coordinates.row || 0;
        const column = payload.coordinates.column || 0;
        buttonIndex = row * 5 + column + 1;
      }
      handleButtonPress(context, buttonIndex);
    },
    touchTap({ context, payload }) {
      const action = plugin.getAction(context);
      let buttonIndex = 1;
      if (action?.settings && typeof (action.settings as any).buttonIndex === 'number') {
        buttonIndex = (action.settings as any).buttonIndex;
      } else if (payload?.coordinates) {
        const row = payload.coordinates.row || 0;
        const column = payload.coordinates.column || 0;
        buttonIndex = row * 5 + column + 1;
      }
      handleButtonPress(context, buttonIndex);
    },
    sendToPlugin({ context, payload }) {
      // Handle messages from property inspector
      if (payload?.action === 'refreshText') {
        console.log(`[HTTPButton] Refresh text requested from property inspector: ${context}`);
        // Clear cached content to force reload
        textMdContentMap.delete(context);
        loadButtonContent(context, true);
      }
    }
  });
}

