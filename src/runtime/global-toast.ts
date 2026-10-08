/**
 * HorizonUI · 全局 Toast 宿主（Nuxt 客户端插件）
 *
 * 由 nuxt 模块自动注册（见 ../nuxt.ts 第 5 步），宿主不必再在自己的 app.vue 里写
 * `<UIToast />` —— 那是「每个宿主都要抄一遍、抄漏就没提示」的装配细节，收进库。
 *
 * 为什么必须是插件而不是让模块注册个组件：
 * Toast 的 viewport 得挂在 body 级容器上，且必须落在**宿主那个 Vue app 的上下文**里 ——
 * 另起一个 app 就 inject 不到 createHorizon 提供的 TOAST_KEY（store）与 HORIZON_CONFIG
 * （皮肤开关），toast 会退回「本地 store + 静默」，跟没挂一样。
 *
 * 实现依据：vue 的 render() 在「无父组件」时用 vnode.appContext 建实例
 * （runtime-core: `const appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext`），
 * 所以把宿主的 app context 挂到 vnode 上，就等于让这棵子树长在宿主 app 里。
 *
 * 时机：在 app:mounted 里渲染，不在插件体内 —— 模块插件与宿主插件（app/plugins/*.ts，
 * createHorizon 通常在那里 install）的先后顺序由 Nuxt 决定，等挂载后再渲染可保证
 * TOAST_KEY 一定已 provide。
 *
 * ⚠️ 刻意从 '#app' 显式 import defineNuxtPlugin 而不吃自动导入：本文件来自 node_modules，
 *    自动导入转换默认不覆盖该目录，靠全局变量会 "is not defined"。
 * ⚠️ 与宿主自挂的 <UIToast /> 会形成两个 viewport（同一条 toast 渲染两次），
 *    接入本模块后请删掉宿主里那行。
 */
import { defineNuxtPlugin } from '#app'
import { h, render, type VNode } from 'vue'
import UIToast from '../components/UI/Toast.vue'

export default defineNuxtPlugin((nuxtApp) => {
    // 防御：本插件以 mode: 'client' 注册，正常不会有 document 缺失的分支
    if (typeof document === 'undefined') return

    const host = document.createElement('div')
    host.dataset.horizonToastHost = ''
    document.body.appendChild(host)

    nuxtApp.hook('app:mounted', () => {
        const vnode = h(UIToast) as VNode
        // 共享宿主 app 的 provide（TOAST_KEY / HORIZON_CONFIG）
        vnode.appContext = nuxtApp.vueApp._context as VNode['appContext']
        render(vnode, host)
    })
})