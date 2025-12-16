import { usePluginStore, useWatchEvent } from '@/hooks/plugin';

export default function (name: string) {
  const pluginUuid = window.argv?.[3]?.plugin?.uuid || 'pro.popstas.httpbutton';
  const ActionID = `${pluginUuid}.${name}`;

  const plugin = usePluginStore();
  
  // Store previous image URL to detect changes (per context)
  const imageUrlMap = new Map<string, string>();

  // Store previous title to detect changes (per context)
  const titleMap = new Map<string, string>();

  // Store cleanup functions for image watchers (per context)
  const watcherCleanups = new Map<string, () => void>();

  // Save image to data/last/{name}.png via localhost:5173
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
        console.log(`[ImageButton] Image saved successfully to data/${imagePath}`);
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

  // Set title from settings
  const setButtonTitle = (context: string) => {
    try {
      const action = plugin.getAction(context);
      if (!action) return;

      const settings = action.settings as any;
      const title = settings?.title || '';
      const previousTitle = titleMap.get(context) || '';

      if (title !== previousTitle) {
        titleMap.set(context, title);
        action.setTitle(title);
        console.log(`[ImageButton] Title set to: "${title}"`);
      }
    } catch (error) {
      console.error('[ImageButton] Error setting title:', error);
    }
  };

  // Load saved image from data/last/{name}.png
  const loadSavedImage = async (context: string): Promise<boolean> => {
    try {
      const action = plugin.getAction(context);
      if (!action) return false;

      const settings = action.settings as any;
      const imageName = settings?.imageName || 'httpImage';
      const savedImagePath = `/data/last/${imageName}.png`;

      console.log(`[ImageButton] Attempting to load saved image from: ${savedImagePath}`);

      const response = await fetch(`${savedImagePath}?t=${Date.now()}`);
      if (!response.ok) {
        console.log(`[ImageButton] Saved image not found at ${savedImagePath}, will load from URL`);
        return false;
      }

      // Convert response to blob, then to data URL
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
      action.setImage(dataUrl);
      console.log(`[ImageButton] Successfully loaded saved image from ${savedImagePath}`);
      return true;
    } catch (error: any) {
      console.log(`[ImageButton] Failed to load saved image: ${error.message}, will load from URL`);
      return false;
    }
  };

  // Resize to height 128, then crop right 128x128 fragment
  const resizeAndCropImage = async (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          const targetHeight = 128;
          const targetWidth = 128;

          // Step 1: Calculate scale to resize to height 128 (maintain aspect ratio)
          const scale = img.height > targetHeight ? targetHeight / img.height : 1;
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;

          // Step 2: Crop right 128x128 fragment from resized image
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Calculate source coordinates for right crop
          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = targetWidth;
          let sourceHeight = targetHeight;

          if (scaledWidth >= targetWidth) {
            // Image is wider than target, crop from right
            sourceX = scaledWidth - targetWidth;
          } else {
            // Image is narrower, use full width
            sourceX = 0;
            sourceWidth = scaledWidth;
          }

          if (scaledHeight >= targetHeight) {
            // Image is taller, crop from top (or center, but we'll take top for consistency)
            sourceY = 0;
            sourceHeight = targetHeight;
          } else {
            // Image is shorter, use full height
            sourceY = 0;
            sourceHeight = scaledHeight;
          }

          // Calculate destination position (align to top-right if image is smaller)
          const destX = scaledWidth >= targetWidth ? 0 : targetWidth - scaledWidth;
          const destY = 0; // Always align to top

          // Draw black background
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // Draw the resized and cropped image
          // Convert source coordinates back to original image coordinates
          ctx.drawImage(
            img,
            sourceX / scale, sourceY / scale, sourceWidth / scale, sourceHeight / scale,  // source (from original image)
            destX, destY, sourceWidth, sourceHeight                                        // destination (on canvas)
          );

          const croppedDataUrl = canvas.toDataURL('image/png');
          resolve(croppedDataUrl);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = dataUrl;
    });
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
        
        // Resize and crop image to 128x128 (max size, crop bottom right)
        let processedDataUrl = dataUrl;
        try {
          processedDataUrl = await resizeAndCropImage(dataUrl);
          console.log('[ImageButton] Image resized and cropped to 128x128');
        } catch (error) {
          console.warn('[ImageButton] Failed to resize/crop image, using original:', error);
        }

        // Set the image
        try {
          action.setImage(processedDataUrl);
          console.log('[ImageButton] setImage called successfully');
          
          // Save processed image to data/last/{name}.png
          const imagePath = `last/${imageName}.png`;
          await saveImageToFile(processedDataUrl, imagePath);
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
      // Clear cached URL to force reload even if URL hasn't changed
      // This ensures the image updates periodically
      imageUrlMap.delete(context);
      loadImageContent(context, true);
    });
    
    const cleanup = () => {
      plugin.Unterval(intervalId);
      watcherCleanups.delete(context);
      imageUrlMap.delete(context);
      titleMap.delete(context);
    };
    
    watcherCleanups.set(context, cleanup);
    return cleanup;
  };

  useWatchEvent('action', {
    ActionID,
    willAppear({ context, payload }) {
      console.log(`[ImageButton] Action appeared: ${context}`);
      setButtonTitle(context);
      // Try to load saved image first, then load from URL if not found
      loadSavedImage(context).then((loaded) => {
        if (!loaded) {
          loadImageContent(context, true);
        }
      });
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
      // Update title if it changed
      setButtonTitle(context);
      // Clear cached URL to force reload
      imageUrlMap.delete(context);
      loadImageContent(context, true);
      watchImageUrl(context);
    },
    keyUp({ context, payload }) {
      console.log(`[ImageButton] Button pressed (keyUp): ${context}`);
      // Force update image on button press
      imageUrlMap.delete(context);
      loadImageContent(context, true);
    },
    touchTap({ context, payload }) {
      console.log(`[ImageButton] Button pressed (touchTap): ${context}`);
      // Force update image on button press
      imageUrlMap.delete(context);
      loadImageContent(context, true);
    }
  });
}

