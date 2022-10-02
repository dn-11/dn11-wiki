export default {
  title: 'DN11',
  description: 'An intranet of Building 11',
  outDir: '../dist',
  themeConfig: {
    sidebar: [
      {
        text: 'Start',
        items: [
          { text: 'GettingStart', link: '/start' },
        ]
      },
      {
        text: 'Guide',
        items: [
          { text: 'Use Tailscale', link: '/tailscale' },
        ]
      }
    ]
  }
}
