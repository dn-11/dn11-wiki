<script setup>
import { computed } from 'vue'
import { usePlatform } from '../composables/platform'

const props = defineProps({
  name: { type: String, required: true },
})

const { platform } = usePlatform()
const visible = computed(() => platform.value === props.name)
</script>

<template>
  <!-- 用 v-show 而不是 v-if：两份内容都保留在 HTML 里，本地搜索才能索引到 -->
  <div v-show="visible" class="platform-panel">
    <slot />
  </div>
</template>

<style scoped>
.platform-panel {
  padding: 0;
  margin: 0;
}
</style>