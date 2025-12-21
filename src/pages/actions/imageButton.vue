<script setup lang="ts">
  import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
  import { ref, onMounted, watch, nextTick } from 'vue';

  const property = usePropertyStore();

  const DEFAULT_UPDATE_INTERVAL = 60000; // 60 seconds
  const DEFAULT_IMAGE_NAME = 'httpImage';

  const imageUrl = ref('');
  const imageName = ref(DEFAULT_IMAGE_NAME);
  const title = ref('');
  const updateInterval = ref(String(DEFAULT_UPDATE_INTERVAL));
  const saving = ref(false);
  const statusMessage = ref('');
  const statusType = ref<'success' | 'error' | ''>('');

  onMounted(() => {
    // Settings are already loaded from window.argv[4].payload.settings
    // No need to call getGlobalSettings for action settings
  });

  watch(
    () => property.settings,
    (newSettings) => {
      if (newSettings) {
        if ((newSettings as any).imageUrl !== undefined) {
          imageUrl.value = (newSettings as any).imageUrl || '';
        }
        if ((newSettings as any).imageName !== undefined) {
          imageName.value = (newSettings as any).imageName || DEFAULT_IMAGE_NAME;
        }
        if ((newSettings as any).title !== undefined) {
          title.value = (newSettings as any).title || '';
        }
        if ((newSettings as any).updateInterval !== undefined) {
          updateInterval.value = String((newSettings as any).updateInterval || DEFAULT_UPDATE_INTERVAL);
        }
      }
    },
    { deep: true, immediate: true }
  );

  const saveConfig = async () => {
    saving.value = true;
    try {
      const newSettings = {
        ...property.settings,
        imageUrl: imageUrl.value || '',
        imageName: imageName.value || DEFAULT_IMAGE_NAME,
        title: title.value || '',
        updateInterval: Number(updateInterval.value) || DEFAULT_UPDATE_INTERVAL
      } as any;

      console.log('[Property imageButton] Saving config:', newSettings);

      // Update local settings without triggering watcher
      property.preventWatch = true;
      property.settings = newSettings;
      await nextTick();
      
      // Manually send setSettings to ensure it's saved
      // The watcher will also send it, but we ensure it's sent here too
      property.setSettings(newSettings);
      
      // Allow watcher to work again
      await nextTick();
      property.preventWatch = false;

      // Wait a bit to ensure settings are saved
      await new Promise(resolve => setTimeout(resolve, 200));
      
      statusType.value = 'success';
      statusMessage.value = 'Configuration saved successfully';
    } catch (error) {
      console.error('[Property imageButton] Failed to save config:', error);
      statusType.value = 'error';
      statusMessage.value = 'Failed to save configuration';
    } finally {
      saving.value = false;
    }
  };

  useWatchEvent({
    didReceiveSettings(data) {
      if (data.payload?.settings) {
        const settings = data.payload.settings as any;
        if (settings.imageUrl !== undefined) {
          imageUrl.value = settings.imageUrl || '';
        }
        if (settings.imageName !== undefined) {
          imageName.value = settings.imageName || DEFAULT_IMAGE_NAME;
        }
        if (settings.title !== undefined) {
          title.value = settings.title || '';
        }
        if (settings.updateInterval !== undefined) {
          updateInterval.value = String(settings.updateInterval || DEFAULT_UPDATE_INTERVAL);
        }
      }
    }
  });
</script>

<template>
  <div class="container">
    <TabView label="Img Source">
      <div class="field-wrapper">
        <label class="field-label">Image URL:</label>
        <input
          v-model="imageUrl"
          placeholder="https://example.com/image.png"
          class="field-input text-input"
          :disabled="saving"
        />
        <div class="field-help">
          URL to fetch image from (e.g., Grafana render endpoint)
        </div>
      </div>
      <div class="field-wrapper">
        <label class="field-label">Image Name:</label>
        <input
          v-model="imageName"
          placeholder="httpImage"
          class="field-input text-input"
          :disabled="saving"
        />
        <div class="field-help">
          Name for saved image file (saved to data/last/{name}.png)
        </div>
      </div>
    </TabView>

    <TabView label="Title">
      <div class="field-wrapper">
        <label class="field-label">Button Title:</label>
        <input
          v-model="title"
          placeholder="Enter button title"
          class="field-input text-input"
          :disabled="saving"
        />
        <div class="field-help">
          Custom title text displayed on the button
        </div>
      </div>
    </TabView>

    <TabView label="Update">
      <div class="field-wrapper">
        <label class="field-label">Update Interval:</label>
        <input
          v-model="updateInterval"
          placeholder="60000"
          class="field-input text-input"
          :disabled="saving"
        />
        <div class="field-help">
          Update interval in milliseconds (default: 60000 = 60 seconds). How often to fetch and update the image.
        </div>
      </div>
    </TabView>

    <button type="button" @click="saveConfig" :disabled="saving" class="save-button primary-button">
      <span v-if="saving">Saving...</span>
      <span v-else>Save Configuration</span>
    </button>
    <p v-if="statusMessage" :class="['status', statusType]">{{ statusMessage }}</p>
  </div>
</template>

<style scoped>
@import './styles.css';
</style>
