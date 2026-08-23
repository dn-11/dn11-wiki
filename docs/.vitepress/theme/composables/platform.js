import { ref } from 'vue'

const STORAGE_KEY = 'dn11-wiki-platform'

export const PLATFORMS = [
  { id: 'openwrt', label: 'OpenWrt' },
  { id: 'linux', label: 'Linux' },
]

// 模块级单例:页面顶部切换器与文中所有 PlatformPanel 共享同一状态,
// 顶上一切,全文的配置样例与解释跟着联动
const platform = ref('openwrt')

export function usePlatform() {
  function set(id) {
    platform.value = id
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {}
  }
  // 只能在客户端 onMounted 里调用,避免 SSR 水合结果不一致
  function restore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && PLATFORMS.some((p) => p.id === saved))
        platform.value = saved
    } catch {}
  }
  return { platform, set, restore }
}
