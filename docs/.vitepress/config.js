import PanguPlugin from 'markdown-it-pangu'
import { birdConf } from './theme/shikiji'
import { withMermaid } from "vitepress-plugin-mermaid"
export default withMermaid({
  title: 'DN11',
  description: 'An intranet of Building 11',
  outDir: '../dist',
  mermaid:{
    //mermaidConfig !theme here works for ligth mode since dark theme is forced in dark mode
  },
  head: [
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['link', { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#5bbad5' }],
    ['meta', { name: 'msapplication-TileColor', content: '#da532c' }],
    ['meta', { name: 'theme-color', content: '#ffffff' }]
  ],
  markdown: {
    lineNumbers: true,
    config: (md) => {
      md.use(PanguPlugin);
    },
    languages: [birdConf],
    languageAlias: {
      'bird_conf': 'bird'
    }
  },
  themeConfig: {
    outline: [2, 6],
    nav: [
      { text: '首页', link: '/' },
      {
        text: 'Status', items: [
          { text: '主站', link: 'https://status.dn11.top' },
          { text: '备站', link: 'https://monitor.dn11.baimeow.cn' }
        ]
      },
      {
        text: '博客', items:
          [
            { text: 'baimeow', link: 'https://baimeow.cn' },
            { text: 'xyxsw', link: 'https://xyxsw.ltd' },
            { text: 'potat0', link: 'https://potat0.cc' },
          ]
      },
    ],
    sidebar: [{
      text: '简介',
      items: [
        { text: '开始', link: '/introduce/start' },
      ]
    },
    {
      text: '接入',
      items: [
        { text: '子网并入', link: '/connect/subnet' },
        { text: 'BGP', link: '/connect/bgp' },
        { text: 'IBGP', link: '/connect/ibgp' },
        { text: 'BFD', link: '/connect/bfd' },
        { text: 'Route Collector', link: '/connect/collector' },
        { text: 'ROA', link: '/connect/roa' },
      ]
    },
    {
      text: '节点',
      items: [
        { text: '列表', link: '/peer/list' }
      ]
    },
    {
      text: '服务',
      items: [
        { text: 'Samba', link: '/service/samba' },
        { text: 'Others', link: '/service/other' }
      ]
    },
    {
      text: '其他',
      items: [
        { text: 'DDNS', link: '/mics/ddns' },
        { text: 'DNS', link: '/mics/dns' },
        { text: 'RDNS', link: '/mics/rdns' }
      ]
    },
    {
      text: '废弃内容',
      items: [
        { text: 'ospf接入', link: '/dustbin/ospf' },
      ]
    }
    ],
    search: {
      provider: 'local'
    },
    footer: {
      message: 'Made with ❤️ by DN11 team',
      copyright: 'Copyright © DN11 team'
    }
  }
})