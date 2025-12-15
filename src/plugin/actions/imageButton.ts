import { usePluginStore, useWatchEvent } from '@/hooks/plugin';

export default function (name: string) {
  const pluginUuid = window.argv?.[3]?.plugin?.uuid || 'pro.popstas.httpbutton';
  const ActionID = `${pluginUuid}.${name}`;

  const plugin = usePluginStore();
  
  // Store previous image URL to detect changes (per context)
  const imageUrlMap = new Map<string, string>();

  // Store cleanup functions for image watchers (per context)
  const watcherCleanups = new Map<string, () => void>();

  // Save image to public/last/{name}.png via localhost:5173
  const saveImageToFile = async (imageData: string, imagePath: string) => {
    try {
      // Send POST request to localhost:5173 to save the image
      const response = await fetch('http://localhost:5173/api/save-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageData: imageData,
          path: imagePath
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[ImageButton] Image saved successfully to public/${imagePath}`);
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.warn('[ImageButton] Failed to save image via server:', error);
      }
    } catch (error) {
      // If localhost:5173 is not available (e.g., in production), silently fail
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.debug('[ImageButton] Dev server not available, skipping image save');
      } else {
        console.error('[ImageButton] Failed to save image:', error);
      }
    }
  };

  // Load image from URL and set it
  const loadImageContent = async (context: string, forceUpdate = false) => {
    try {
      const action = plugin.getAction(context);
      if (!action) return;

      const settings = action.settings as any;
      const imageUrl = settings?.imageUrl || '';
      const imageName = settings?.imageName || 'httpImage';

      if (!imageUrl) {
        console.warn('[ImageButton] No image URL configured');
        return;
      }

      const previousUrl = imageUrlMap.get(context) || '';
      
      if (imageUrl === previousUrl && !forceUpdate) {
        return;
      }

      imageUrlMap.set(context, imageUrl);

      console.log(`[ImageButton] Loading image from: ${imageUrl}`);

      // Fetch the image
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Convert response to blob, then to data URL using Promise wrapper
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onloadend = () => {
            if (reader.result && typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Failed to convert blob to data URL'));
            }
          };
          
          reader.onerror = () => {
            reject(new Error('Error reading image blob'));
          };
          
          reader.readAsDataURL(blob);
        });
        
        // Set the image
        try {
          action.setImage(dataUrl);
          console.log('[ImageButton] setImage called successfully');
          
          // Save image to public/last/{name}.png
          const imagePath = `last/${imageName}.png`;
          await saveImageToFile(dataUrl, imagePath);
        } catch (error) {
          console.error('[ImageButton] Error calling setImage:', error);
        }
      } catch (error: any) {
        console.error(`[ImageButton] Failed to load image from ${imageUrl}:`, error);
      }
    } catch (error) {
      console.error('[ImageButton] Failed to load image:', error);
    }
  };

  // Watch image URL for changes
  const watchImageUrl = (context: string) => {
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

    const intervalId = `image-url-watch-${context}`;
    plugin.Interval(intervalId, interval, () => {
      loadImageContent(context, false);
    });
    
    const cleanup = () => {
      plugin.Unterval(intervalId);
      watcherCleanups.delete(context);
      imageUrlMap.delete(context);
    };
    
    watcherCleanups.set(context, cleanup);
    return cleanup;
  };

  useWatchEvent('action', {
    ActionID,
    willAppear({ context, payload }) {
      console.log(`[ImageButton] Action appeared: ${context}`);
      loadImageContent(context, true);
      watchImageUrl(context);
    },
    willDisappear({ context }) {
      console.log(`[ImageButton] Action disappeared: ${context}`);
      const cleanup = watcherCleanups.get(context);
      if (cleanup) {
        cleanup();
      }
    },
    didReceiveSettings({ context, payload }) {
      // Restart watcher if settings changed (e.g., imageUrl or imageName)
      console.log(`[ImageButton] Settings updated: ${context}`);
      // Clear cached URL to force reload
      imageUrlMap.delete(context);
      loadImageContent(context, true);
      watchImageUrl(context);
    }
  });
}

