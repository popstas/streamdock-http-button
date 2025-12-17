<script setup lang="ts">
  import { useWatchEvent, usePluginStore } from '@/hooks/plugin';

  // Use a relative glob to avoid Windows drive-letter / absolute path issues during Rollup build.
  const actionFiles = import.meta.glob('./actions/*.ts', { eager: true, import: 'default' });

  Object.entries(actionFiles).forEach(([path, fn]) => {
    const actionName = path
      .replace(/^.*\/actions\//, '')
      .replace(/^\.\/actions\//, '')
      .replace(/\.ts$/, '');
    if (!fn || typeof fn !== 'function') {
      console.error('[Plugin Index] Invalid action handler:', actionName);
      return;
    }
    try {
      (fn as Function)(actionName);
    } catch (error) {
      console.error('[Plugin Index] Error registering action:', actionName, error);
    }
  });

  const plugin = usePluginStore();
  useWatchEvent('plugin', {
    deviceDidConnect() {},
    deviceDidDisconnect() {},
    didReceiveGlobalSettings(data) {
      console.log('[Plugin] Global settings received:', data);
    },
    systemDidWakeUp(data) {},
    applicationDidTerminate(data) {},
    applicationDidLaunch(data) {},
    keyUpCord(data) {
      plugin.eventEmitter.emit('keyUpCord', data);
    },
    keyDownCord(data) {
      plugin.eventEmitter.emit('keyDownCord', data);
    },
    stopBackground(data) {
      plugin.eventEmitter.emit('stopBackground', data);
    },
    lockScreen(data) {},
    unLockScreen(data) {}
  });
</script>

<template>
  <div></div>
</template>

<style lang="scss" scoped></style>

