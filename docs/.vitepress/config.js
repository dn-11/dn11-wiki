export default {
  title: 'DN11',
  description: 'An intranet of Building 11',
  outDir: '../dist',
  themeConfig: {
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
        { text: 'IBGP', link: '/connect/ibgp' }
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
        { text: 'Samba', link: '/service/samba' }
      ]
    },
    {
      text: '其他',
      items: [
        { text: 'DDNS', link: '/mics/ddns' },
        { text: 'DNS', link: '/mics/dns' }
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
}