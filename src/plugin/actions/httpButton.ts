import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { ref } from 'vue';

export default function (name: string) {
  const pluginUuid = window.argv?.[3]?.plugin?.uuid || 'pro.popstas.httpbutton';
  const ActionID = `${pluginUuid}.${name}`;

  const plugin = usePluginStore();

  // Store previous content to detect changes
  const textMdContent = ref<string>('');

  // Escape XML special characters
  const escapeXml = (s: string): string => {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  // Generate SVG with multi-line text from MD file
  const makeKeySvg = (lines: string[]): string => {
    const W = 144,
      H = 144;
    const fontSize = 18;
    const lineHeight = 22;

    const totalH = (lines.length - 1) * lineHeight;
    const startY = H / 2 - totalH / 2 + fontSize / 2;

    const tspans = lines.map((t, i) => `<tspan x="${W / 2}" y="${startY + i * lineHeight}" text-anchor="middle">${escapeXml(t)}</tspan>`).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="0" y="0" width="${W}" height="${H}" rx="18" ry="18" fill="#111"/>
  <text x="${W / 2}" y="${H / 2}" text-anchor="middle"
        font-family="Inter, Segoe UI, Arial, sans-serif" font-size="${fontSize}"
        fill="#fff" dominant-baseline="middle">
    ${tspans}
  </text>
</svg>`.trim();
  };

  // Load MD file content and generate SVG image
  const loadButtonContent = async (context: string, forceUpdate = false) => {
    try {
      const action = plugin.getAction(context);
      if (!action) return;

      const settings = action.settings as any;
      const mdFilePath = settings?.mdFilePath || 'text.md';

      const response = await fetch(`/${mdFilePath}?t=${Date.now()}`);
      if (!response.ok) {
        console.error(`[HTTPButton] Failed to load ${mdFilePath}: ${response.status}`);
        return;
      }

      const text = await response.text();
      if (text === textMdContent.value && !forceUpdate) {
        return;
      }

      textMdContent.value = text;

      const lines = text
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('button content:'))
        .map((line) => line.trim());

      if (lines.length === 0) {
        return;
      }

      const svg = makeKeySvg(lines);
      const dataUrl = 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(svg);

      action.setImage(dataUrl);
    } catch (error) {
      console.error('[HTTPButton] Failed to load MD file:', error);
    }
  };

  // Watch MD file for changes
  const watchMdFile = (context: string) => {
    const intervalId = `md-file-watch-${context}`;
    plugin.Interval(intervalId, 2000, () => {
      loadButtonContent(context, false);
    });
    return () => {
      plugin.Unterval(intervalId);
    };
  };

  // Handle HTTP request on button press
  const handleButtonPress = async (context: string, buttonIndex: number) => {
    const action = plugin.getAction(context);
    if (!action) return;

    const settings = action.settings as any;
    const httpUrl = settings?.httpUrl;
    if (!httpUrl) {
      console.warn('[HTTPButton] No HTTP URL configured');
      return;
    }

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
        console.warn('[HTTPButton] Button index out of range');
        return;
      }

      const lineContent = lines[buttonIndex - 1];

      const result = await plugin.sendHttpRequest(httpUrl, {
        path: lineContent,
        value: lineContent
      });

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

