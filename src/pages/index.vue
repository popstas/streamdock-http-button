<!-- Do not modify this file -->
<script setup lang="ts">
  import { defineAsyncComponent } from 'vue';
  // Vite/Rollup can't reliably bundle fully dynamic import paths.
  // Use a glob so all action inspectors are included in the build, then pick at runtime.
  const inspectors = import.meta.glob('./actions/*.vue') as Record<string, () => Promise<any>>;
  const actionName = window.argv?.[4]?.action?.split('.').pop();
  const inspectorKey = `./actions/${actionName}.vue`;
  const PropertyInspector = defineAsyncComponent(
    inspectors[inspectorKey] ?? inspectors['./actions/httpButton.vue'] ?? Object.values(inspectors)[0]
  );

</script>

<template>
  <PropertyInspector></PropertyInspector>
</template>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html,
  body {
    font-size: 9pt;
    color: #e6e6e6;
    user-select: none;
    background-color: #2d2d2d;
    font-family: Arial, sans-serif;
  }

  ::-webkit-scrollbar {
    width: 0;
  }
  ::-webkit-scrollbar-track {
    border-radius: 8px;
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }
  ::-webkit-scrollbar-thumb {
    border-radius: 8px;
    background-color: #6d6d71;
    outline: 1px solid slategrey;
  }
</style>
