<script setup lang="ts">
  import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
  import { ref, onMounted, watch, nextTick } from 'vue';
  import { NInput, NButton, useMessage } from 'naive-ui';

  const property = usePropertyStore();
  const message = useMessage();

  const DEFAULT_HTTP_URL = 'https://node-red.shome.popstas.ru/actions/mirabox/button';
  const DEFAULT_TEXT_URL = 'https://node-red.shome.popstas.ru/actions/mirabox/button/getText';
  const DEFAULT_UPDATE_INTERVAL = 60000; // 60 seconds

  const mdFilePath = ref('text.md');
  const textUrl = ref(DEFAULT_TEXT_URL);
  const httpUrl = ref(DEFAULT_HTTP_URL);
  const httpUsername = ref('');
  const httpPassword = ref('');
  const updateInterval = ref(String(DEFAULT_UPDATE_INTERVAL));
  const saving = ref(false);

  onMounted(() => {
    // Settings are already loaded from window.argv[4].payload.settings
    // No need to call getGlobalSettings for action settings
  });

  watch(
    () => property.settings,
    (newSettings) => {
      if (newSettings) {
        if ((newSettings as any).mdFilePath !== undefined) {
          mdFilePath.value = (newSettings as any).mdFilePath || 'text.md';
        }
        if ((newSettings as any).textUrl !== undefined) {
          textUrl.value = (newSettings as any).textUrl || DEFAULT_TEXT_URL;
        }
        if ((newSettings as any).httpUrl !== undefined) {
          httpUrl.value = (newSettings as any).httpUrl || DEFAULT_HTTP_URL;
        }
        if ((newSettings as any).httpUsername !== undefined) {
          httpUsername.value = (newSettings as any).httpUsername || '';
        }
        if ((newSettings as any).httpPassword !== undefined) {
          httpPassword.value = (newSettings as any).httpPassword || '';
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
        mdFilePath: mdFilePath.value || 'text.md',
        textUrl: textUrl.value || DEFAULT_TEXT_URL,
        httpUrl: httpUrl.value || DEFAULT_HTTP_URL,
        httpUsername: httpUsername.value || '',
        httpPassword: httpPassword.value || '',
        updateInterval: Number(updateInterval.value) || DEFAULT_UPDATE_INTERVAL
      } as any;

      console.log('[Property httpButton] Saving config:', newSettings);

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
      
      // Request new text from plugin after saving
      property.sendToPlugin({ action: 'refreshText' });
      
      message.success('Configuration saved successfully', {
        duration: 3000
      });
    } catch (error) {
      console.error('[Property httpButton] Failed to save config:', error);
      message.error('Failed to save configuration');
    } finally {
      saving.value = false;
    }
  };

  useWatchEvent({
    didReceiveSettings(data) {
      if (data.payload?.settings) {
        const settings = data.payload.settings as any;
        if (settings.mdFilePath) {
          mdFilePath.value = settings.mdFilePath;
        }
        if (settings.textUrl !== undefined) {
          textUrl.value = settings.textUrl || DEFAULT_TEXT_URL;
        }
        if (settings.httpUrl !== undefined) {
          httpUrl.value = settings.httpUrl || DEFAULT_HTTP_URL;
        }
        if (settings.httpUsername !== undefined) {
          httpUsername.value = settings.httpUsername || '';
        }
        if (settings.httpPassword !== undefined) {
          httpPassword.value = settings.httpPassword || '';
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
    <TabView label="Text Source">
      <div class="field-wrapper">
        <label class="field-label">MD File Path:</label>
        <NInput
          v-model:value="mdFilePath"
          placeholder="text.md"
          class="field-input"
          :disabled="saving"
        />
        <div class="field-help">
          Path to markdown file (relative to data/ directory)
        </div>
      </div>
      <div>
        <label class="field-label">Text URL:</label>
        <NInput
          v-model:value="textUrl"
          placeholder="https://node-red.shome.popstas.ru/actions/mirabox/button/getText"
          class="field-input"
          :disabled="saving"
        />
        <div class="field-help">
          URL to fetch text content via HTTP POST request (uses Basic Auth if configured)
        </div>
      </div>
    </TabView>

    <TabView label="HTTP URL">
      <NInput
        v-model:value="httpUrl"
        placeholder="https://node-red.shome.popstas.ru/actions/mirabox/button"
        class="field-input"
        :disabled="saving"
      />
      <div class="field-help">
        URL to send HTTP POST request on button click (uses Basic Auth if configured)
      </div>
    </TabView>

    <TabView label="Basic Auth">
      <NInput
        v-model:value="httpUsername"
        placeholder="Username"
        class="field-input field-input-spacing"
        :disabled="saving"
      />
      <NInput
        v-model:value="httpPassword"
        type="password"
        placeholder="Password"
        class="field-input"
        :disabled="saving"
      />
      <div class="field-help">
        Optional: Basic authentication credentials for HTTP requests
      </div>
    </TabView>

    <TabView label="Update">
      <div class="field-wrapper">
        <label class="field-label">Update Interval:</label>
        <NInput
          v-model:value="updateInterval"
          placeholder="60000"
          class="field-input"
          :disabled="saving"
        />
        <div class="field-help">
          Update interval in milliseconds (default: 60000 = 60 seconds). How often to check for text content updates.
        </div>
      </div>
    </TabView>

    <NButton type="primary" @click="saveConfig" :loading="saving" block class="save-button">
      Save Configuration
    </NButton>
  </div>
</template>

<style lang="scss" scoped>
@import './styles.scss';
</style>

