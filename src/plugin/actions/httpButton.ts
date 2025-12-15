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

  // Save SVG to public/images/last.svg via localhost:5173
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
        console.log('[HTTPButton] SVG saved successfully to public/images/last.svg');
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

  // Load text content from file or HTTP URL and generate SVG image
  const loadButtonContent = async (context: string, forceUpdate = false) => {
    try {
      const action = plugin.getAction(context);
      if (!action) return;

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
          const result = await plugin.fetchText(textUrl, authOptions);
          if (result.success && result.text) {
            text = result.text;
          } else {
            console.error(`[HTTPButton] Failed to load from ${textUrl}:`, result.error);
            // Fallback to file if HTTP fails
            const response = await fetch(`/${mdFilePath}?t=${Date.now()}`);
            if (response.ok) {
              text = await response.text();
            } else {
              console.error(`[HTTPButton] Failed to load ${mdFilePath}: ${response.status}`);
              return;
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
            const response = await fetch(textUrl, { method: 'GET', headers });
            if (response.ok) {
              text = await response.text();
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (error: any) {
            console.error(`[HTTPButton] Failed to load from ${textUrl}:`, error);
            // Fallback to file if HTTP fails
            const response = await fetch(`/${mdFilePath}?t=${Date.now()}`);
            if (response.ok) {
              text = await response.text();
            } else {
              console.error(`[HTTPButton] Failed to load ${mdFilePath}: ${response.status}`);
              return;
            }
          }
        }
      } else {
        // Use file as before
        const response = await fetch(`/${mdFilePath}?t=${Date.now()}`);
        if (!response.ok) {
          console.error(`[HTTPButton] Failed to load ${mdFilePath}: ${response.status}`);
          return;
        }
        text = await response.text();
      }

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
      
      try {
        action.setImage(dataUrl);
        // action.setImage(dataUrlTest);
        console.log('[HTTPButton] setImage called successfully');
      } catch (error) {
        console.error('[HTTPButton] Error calling setImage:', error);
      }
      
      // Save SVG to public/images/last.svg after setImage
      saveSvgToFile(svg);
      
      if (forceUpdate || text !== previousContent) {
        console.log(`[HTTPButton] Updated button content from ${mdFilePath} (${lines.length} buttons)`);
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

    const DEFAULT_HTTP_URL = 'https://node-red.shome.popstas.ru/actions/mirabox/button-1';
    const settings = action.settings as any;
    const httpUrl = settings?.httpUrl || DEFAULT_HTTP_URL;
    const username = settings?.httpUsername || '';
    const password = settings?.httpPassword || '';

    // Get the line content from MD file
    const mdFilePath = settings?.mdFilePath || 'text.md';
    try {
      const response = await fetch(`/${mdFilePath}?t=${Date.now()}`);
      if (!response.ok) return;

      const text = await response.text();
      const lines = text
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('button content:'))
        .map((line) => line.trim());

      if (buttonIndex < 1 || buttonIndex > lines.length) {
        console.warn(`[HTTPButton] Button index ${buttonIndex} out of range (1-${lines.length}). MD file has ${lines.length} lines.`);
        return;
      }

      const lineContent = lines[buttonIndex - 1];

      const result = await plugin.sendHttpRequest(
        httpUrl,
        {
          path: lineContent,
          value: lineContent
        },
        username && password ? { username, password } : undefined
      );

      if (!result.success) {
        console.error('[HTTPButton] HTTP request failed:', result.error);
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
    }
  });
}

