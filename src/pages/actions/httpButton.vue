<script setup lang="ts">
  import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
  import { ref, onMounted, watch } from 'vue';
  import { NInput, NButton, useMessage } from 'naive-ui';

  const property = usePropertyStore();
  const message = useMessage();

  const mdFilePath = ref('text.md');
  const httpUrl = ref('');
  const saving = ref(false);

  onMounted(() => {
    property.getGlobalSettings();
  });

  watch(
    () => property.settings,
    (newSettings) => {
      if (newSettings) {
        if ((newSettings as any).mdFilePath) {
          mdFilePath.value = (newSettings as any).mdFilePath;
        }
        if ((newSettings as any).httpUrl) {
          httpUrl.value = (newSettings as any).httpUrl;
        }
      }
    },
    { deep: true, immediate: true }
  );

  const saveConfig = async () => {
    saving.value = true;
    try {
      property.preventWatch = true;
      property.settings = {
        ...property.settings,
        mdFilePath: mdFilePath.value || 'text.md',
        httpUrl: httpUrl.value || ''
      } as any;
      property.preventWatch = false;

      message.success('Configuration saved successfully');
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
        if (settings.httpUrl) {
          httpUrl.value = settings.httpUrl;
        }
      }
    }
  });
</script>

<template>
  <div style="padding: 15px">
    <TabView label="MD File Path">
      <NInput
        v-model:value="mdFilePath"
        placeholder="text.md"
        style="margin-bottom: 15px"
        :disabled="saving"
      />
      <div style="font-size: 11px; color: #999; margin-bottom: 15px">
        Path to markdown file (relative to public/ directory)
      </div>
    </TabView>

    <TabView label="HTTP URL">
      <NInput
        v-model:value="httpUrl"
        placeholder="https://example.com/api/button"
        style="margin-bottom: 15px"
        :disabled="saving"
      />
      <div style="font-size: 11px; color: #999; margin-bottom: 15px">
        URL to send HTTP POST request on button click
      </div>
    </TabView>

    <NButton type="primary" @click="saveConfig" :loading="saving" block style="margin-top: 15px">
      Save Configuration
    </NButton>
  </div>
</template>

<style lang="scss" scoped></style>

