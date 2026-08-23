<script setup>
import { onMounted } from 'vue'
import { PLATFORMS, usePlatform } from '../composables/platform'

const { platform, set, restore } = usePlatform()
onMounted(restore)
</script>

<template>
  <div class="platform-tabs">
    <div class="group">
      <button
        v-for="p in PLATFORMS"
        :key="p.id"
        type="button"
        class="tab"
        :class="{ active: platform === p.id }"
        :aria-pressed="platform === p.id"
        @click="set(p.id)"
      >
        {{ p.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.platform-tabs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 16px 0 24px;
}

.group {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}

.tab {
  min-width: 96px;
  padding: 6px 20px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    color 0.25s,
    background-color 0.25s;
}

.tab:hover:not(.active) {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-mute);
}

.tab.active {
  background: var(--vp-c-brand-1);
  color: #fff;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
</style>
