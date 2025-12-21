<!-- Do not modify this file -->
<script setup lang="ts">
  defineProps<{ label: string; width?: string; alignItems?: string }>();
</script>

<template>
  <div class="tab-wrap" :style="{ alignItems }">
    <div class="label" :style="{ width }" :title="label">{{ label }}</div>
    <div class="value">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
  .tab-wrap {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }

  .tab-wrap .label {
    width: 76px;
    text-align: end;
    padding-left: 4px;
    margin-right: 10px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .tab-wrap .value {
    flex: 1;
    width: 0;
  }

  .tab-wrap:last-child {
    margin-bottom: 0;
  }
</style>
