/*
 * @Description:
 * @Version: 1.668
 * @Autor: 地虎降天龙
 * @Date: 2023-10-16 10:53:09
 * @LastEditors: 地虎降天龙
 * @LastEditTime: 2025-07-08 09:31:29
 */
import { defineRuntimeConfig, useModel } from '@fesjs/fes'
import { FMenu } from '@fesjs/fes-design'
import Tres from '@tresjs/core'
import chalk from 'chalk'

// add by 地虎降天龙
import 'uno.css'
import 'animate.css/animate.min.css'

// 注册图标 iconify goview
import { addCollection } from 'iconify-icon'
import uimIcons from '@iconify/json/json/uim.json'
import lineMdIcons from '@iconify/json/json/line-md.json'
import wiIcons from '@iconify/json/json/wi.json'
import { useQiankunTvtStore } from 'PLS/qiankunTvt/stores/index'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'
import UserCenter from '@/components/forPreview/userCenter.vue'
import PageLoading from '@/components/pageLoading.vue'

addCollection(uimIcons)
addCollection(lineMdIcons)
addCollection(wiIcons)

let qiankunTvtStore = null
export default defineRuntimeConfig({
    beforeRender: {
        loading: <PageLoading />,
        action () {
            if (qiankunWindow.__POWERED_BY_QIANKUN__) {
                qiankunTvtStore = useQiankunTvtStore()
                const purl = qiankunWindow.__INJECTED_PUBLIC_PATH_BY_QIANKUN__
                globalThis.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ = purl
                window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ = purl
                console.log('qiankunWindow.__INJECTED_PUBLIC_PATH_BY_QIANKUN__', qiankunWindow.__INJECTED_PUBLIC_PATH_BY_QIANKUN__)
                // window.__webpack_public_path__ = purl
                // qiankunWindow.__webpack_public_path__ = purl
                // Object.defineProperty(import.meta, 'url', { get: () => purl })
            }
            const { signin, getMenu } = useModel('forPreview')
            signin()
            if ((process.env.FES_APP_PLUGINS === 'true' && process.env.NODE_ENV === 'development') || process.env.FES_APP_ONLINE_API) {
                getMenu()
            }
        },
    },
})

export function layout (layoutConfig) {
    return {
        renderCustom: () => <UserCenter />,
        ...layoutConfig,
        menus: () => {
            window.layoutConfig = layoutConfig
            return layoutConfig.menus
        }
    }
}


export function onAppCreated ({ app }) {
    app.use(FMenu)
    app.use(Tres)

    window.$vue = app

}
const findStringBetween = (str) => {
    const regex = /plugins\/([^/]+)\/pages\//
    const match = str.match(regex)
    if (match && match[1]) {
        return match[1]
    }
    return null
}

export function patchRoutes ({ routes }) {
    if (process.env.FES_APP_PLUGINS === 'false') {
        return
    }

    // 自动读取plugins目录下所有插件的pages的目录下的*.vue 并加入路由
    let viteModules = import.meta.glob('./plugins/**/pages/**/*.vue')
    if (process.env.FES_APP_PLSNAME !== undefined) {
        const filteredModules = Object.fromEntries(
            Object.entries(viteModules).filter(([path]) => path.startsWith(`./plugins/${process.env.FES_APP_PLSNAME}/pages/`))
        )
        viteModules = filteredModules
    }
    const needAddRouter = {
        path: '/plugins',
        component: () => import("./components/forPreview/suspenseLayout.vue"),
        children: []
    }
    // eslint-disable-next-line guard-for-in
    for (const [key, value] of Object.entries(viteModules)) {
        const pluginName = findStringBetween(key)
        const urlList = key.match(/\.\/(.+)\.vue$/)[1].split('/')
        if (urlList.length === 4) {  //插件一级目录 普通插件
            needAddRouter.children.unshift({
                path: `/plugins/${pluginName}/${urlList[3]}`,
                component: value
            })
        }
        else if (urlList.length === 5) { //插件二级目录 目前只存在已 basic 基础功能展示
            needAddRouter.children.unshift({
                path: `/plugins/${pluginName}/${urlList[3]}/${urlList[4]}`,
                component: value
            })
        } else {  // 若目录异常 那么直接跳过
            return
        }
    }
    routes.unshift(needAddRouter)
}

export function modifyRoute (memo) {
    if (process.env.FES_APP_PREINDEX === 'true') {
        console.log('预览模式下 已经自动替换index的路由为 plugins/preview.vue')
        let indexRoute = memo.routes.find(route => route.path === '/')
        if (indexRoute) {
            indexRoute = indexRoute.children.find(route => route.path === '/')
            if (indexRoute) {
                indexRoute.component = () => import("./plugins/preview.vue")
                indexRoute.meta = {
                    name: 'preview',
                    title: '开源框架展示',
                }
            }
        }
    }
    if (process.env.FES_APP_PLUGINS === 'false') {
        const indexRoute = memo.routes.find(route => route.path === '/')
        if (indexRoute) {
            indexRoute.component = null
        }
    }

    
    // 首先添加一个明确的根路由，确保 / 路径直接指向 simulation
    memo.routes.unshift({
        path: '/',
        name: 'home',
        component: () => import("./pages/simulation.vue"),
        meta: {
            name: 'simulation',
            title: '人群仿真可视化系统',
        }
    })
    
    // 同时处理可能存在的其他根路由配置
    let existingHomeRoute = memo.routes.find((route, index) => route.path === '/' && index > 0)
    if (existingHomeRoute) {
        // 如果存在子路由，找到首页子路由
        if (existingHomeRoute.children) {
            let homeChildRoute = existingHomeRoute.children.find(route => route.path === '/')
            if (homeChildRoute) {
                homeChildRoute.component = () => import("./pages/simulation.vue")
                homeChildRoute.meta = {
                    name: 'simulation',
                    title: '人群仿真可视化系统',
                }
            }
        } else {
            // 如果没有子路由，直接修改主路由
            existingHomeRoute.component = () => import("./pages/simulation.vue")
            existingHomeRoute.meta = {
                name: 'simulation',
                title: '人群仿真可视化系统',
            }
        }
    }



    // 添加备用首页路由
    memo.routes.unshift({
        path: '/index_back',
        name: 'index_back',
        component: () => import("./pages/index_back.vue"),
        meta: {
            name: 'index_back',
            title: '人群仿真可视化系统',
        }
    })

    return memo
}export const qiankun = {
    // 应用加载之前
    async bootstrap (props) {
        console.log('son TvT.js bootstrap', props)
    },
    // 应用 render 之前触发
    async mount (props) {
        console.log('son TvT.js mount', props)
        if (props) {
            props.onGlobalStateChange((state, prev) => {
                qiankunTvtStore.setGlobalState(state)
            })
            window.qiankunProps = props
        }
    },
    // 当 props 更新时触发
    async update (props) {
        console.log('son TvT.js update', props)
    },
    // 应用卸载之后触发
    async unmount (props) {
        console.log('son TvT.js unmount', props)
    },
}