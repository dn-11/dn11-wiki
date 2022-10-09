export default {
    title: 'DN11',
    description: 'An intranet of Building 11',
    outDir: '../dist',
    themeConfig: {
        sidebar: [{
                text: '简介',
                items: [
                    { text: '开始', link: '/start' },
                ]
            },
            {
                text: '接入',
                items: [
                    { text: '子网并入', link: '/mergeSubnet' },
                    { text: '单设备接入', link: '/singleDevice' }
                ]
            },
            {
                text: '节点',
                items: [
                    { text: '列表', link: '/peerList' }
                ]
            },
            {
                text: '服务',
                items: [
                    { text: 'Samba', link: '/service/samba' }
                ]
            }
        ]
    }
}