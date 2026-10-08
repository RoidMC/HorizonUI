<script setup lang="ts">
// HorizonUI · 纯 Vue 3 playground
//
// 目的有两个：
//   1. 验证本轮落地的 reka-ui 2.11 Toast Manager 在真实 DOM 里的表现（类型 / promise / 动作 /
//      位置 / limit / 退出动画）；
//   2. 当「组件层零 Nuxt 依赖」的哨兵 —— 这里没有 Nuxt、没有自动导入、没有全局组件注册，
//      全部显式 import，能跑通就说明宿主换成任何 Vue 3 应用都成立。
//
// ⚠️ 与 Nuxt 宿主的一处差异：Nuxt 侧由模块注册客户端插件自动挂 <UIToast />，
//    纯 Vue 宿主没有那层自动装配，得自己挂在根组件上（下面模板末尾那一行）。
import {
  UIAvatar,
  UIButton,
  UICheckbox,
  UIDialog,
  UIDivider,
  UIForm,
  UIField,
  UIFieldControl,
  UIFieldDescription,
  UIFieldError,
  UIFieldLabel,
  UIFieldValidity,
  UIInput,
  UILayout,
  UILayoutAside,
  UILayoutFooter,
  UILayoutHeader,
  UILayoutMain,
  UIPanelCard,
  UIQRCode,
  UIScrollingText,
  UIToast,
  useToast,
} from '@roidmc/horizon-ui/unstyled'
import { computed, ref } from 'vue'

const { toast } = useToast()

const text = ref('')
const nick = ref('')
const checked = ref(true)
const dialogOpen = ref(false)

// 3. 表单家族：校验函数返回非空错误即失败；表单值在通过校验后由 @form-submit 交出
const form = ref({ username: '', email: '', agree: false })
const formErrors = ref<Record<string, string | string[]>>({})

const validateUsername = (value: unknown) => {
  const name = String(value ?? '')
  if (!name) return '用户名不能为空'
  return /^[A-Za-z0-9]{3,16}$/.test(name) ? '' : '需 3-16 位字母或数字'
}
const validateEmail = (value: unknown) => {
  const mail = String(value ?? '')
  if (!mail) return '邮箱不能为空'
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) ? '' : '邮箱格式不正确'
}
// Checkbox 进字段后，取值是布尔而不是字符串 —— 同一个底层对两类控件都给对了值
const validateAgree = (value: unknown) => (value === true ? '' : '请先勾选同意后再提交')
const onFormSubmit = (values: Record<string, unknown>) => {
  // 演示服务端错误回填：这个邮箱「已被注册」
  formErrors.value = values.email === 'taken@example.com' ? { email: '该邮箱已被注册' } : {}
  if (!Object.keys(formErrors.value).length) {
    toast.success(`表单已提交：${JSON.stringify(values)}`)
  }
}

const positions = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const

const demo = {
  basic: () => toast('默认提示'),
  withTitle: () => toast.success('创建成功', { title: '项目已就绪', description: '可以去面板里继续配置' }),
  action: () =>
    toast.warning('配额即将用尽', {
      action: { label: '升级', onClick: () => toast.info('已跳转到升级页（示例）') },
    }),
  loading: () => {
    const id = toast.loading('上传中…')
    window.setTimeout(() => toast.dismiss(id), 2000)
  },
  promise: () =>
    toast.promise(new Promise((resolve) => window.setTimeout(resolve, 1400)), {
      loading: '正在提交…',
      success: () => '提交完成',
      error: (e) => `提交失败：${String(e)}`,
    }),
  many: () => {
    for (let i = 1; i <= 5; i += 1) toast(`第 ${i} 条（看 limit 是否只留 3 条）`)
  },
  limitOn: () => {
    toast.maxCount(3)
    toast.info('limit = 3')
  },
  limitOff: () => {
    toast.maxCount(0)
    toast.info('limit = 0（不限制）')
  },
}

const dark = ref(false)
const toggleDark = () => {
  dark.value = !dark.value
  document.documentElement.classList.toggle('dark', dark.value)
}

const mode = computed(() => (dark.value ? '暗色' : '亮色'))
</script>

<template>
  <UILayout class="pg">
    <UILayoutHeader class="pg__header">
      <strong>@roidmc/horizon-ui</strong>
      <span class="pg__sub">纯 Vue 3 playground（无 Nuxt）</span>
      <UIButton @click="toggleDark">切换主题：{{ mode }}</UIButton>
    </UILayoutHeader>

    <UILayoutMain class="pg__main">
      <section class="pg__block">
        <h2>1. Toast（reka-ui 2.11 Toast Manager）</h2>
        <div class="pg__row">
          <UIButton @click="demo.basic">default</UIButton>
          <UIButton @click="demo.withTitle">title + description</UIButton>
          <UIButton @click="demo.action">带 action</UIButton>
          <UIButton @click="demo.loading">loading（常驻，2s 后关）</UIButton>
          <UIButton @click="demo.promise">promise</UIButton>
          <UIButton @click="demo.many">连发 5 条</UIButton>
          <UIButton @click="toast.dismiss()">全部关闭</UIButton>
        </div>
        <div class="pg__row">
          <span class="pg__label">limit</span>
          <UIButton @click="demo.limitOn">= 3</UIButton>
          <UIButton @click="demo.limitOff">= 0（不限）</UIButton>
        </div>
        <div class="pg__row">
          <span class="pg__label">position</span>
          <UIButton v-for="p in positions" :key="p" @click="toast.position(p)">{{ p }}</UIButton>
        </div>
        <p class="pg__note">
          退出动画由 reka 的 <code>Presence</code> 监听 <code>animationend</code> 决定卸载时机；
          超出 limit 时最旧的 toast 会被自动关掉（轮播），队列里不留被藏起来的条目。
        </p>
      </section>

      <UIDivider />

      <section class="pg__block">
        <h2>2. 表单原语</h2>
        <div class="pg__row">
          <UIInput v-model="text" placeholder="独立使用：无标签" prefix-icon="tdesign:user" />
          <UICheckbox v-model="checked">记住我</UICheckbox>
        </div>
        <p class="pg__note">当前 modelValue：{{ text || '（空）' }} / {{ checked }}</p>

        <p class="pg__sub">同一个 UIInput 放进 UIField：标签 / 说明 / 校验改由字段上下文接管</p>
        <UIField name="nick" class="pg__form" validation-mode="onChange" :validate="validateUsername">
          <UIFieldLabel>昵称</UIFieldLabel>
          <UIInput v-model="nick" placeholder="3-16 位字母或数字" prefix-icon="tdesign:user" />
          <UIFieldDescription>UIInput 自己不画标签 —— 内层 input 由 FieldControl 接好 for / aria</UIFieldDescription>
          <UIFieldError />
        </UIField>
      </section>

      <UIDivider />

      <section class="pg__block">
        <h2>3. 表单家族（UIForm + UIField*）</h2>
        <UIForm class="pg__form" :errors="formErrors" @form-submit="onFormSubmit">
          <UIField name="username" required :validate="validateUsername">
            <UIFieldLabel>用户名</UIFieldLabel>
            <UIFieldControl v-model="form.username" placeholder="3-16 位字母或数字" autocomplete="username" />
            <UIFieldDescription>登录后不可修改</UIFieldDescription>
            <UIFieldError />
            <UIFieldValidity v-slot="{ errors }">
              <span class="pg__note">实时错误：{{ errors.length ? errors.join('，') : '无' }}</span>
            </UIFieldValidity>
          </UIField>

          <UIField name="email" required :validate="validateEmail">
            <UIFieldLabel>邮箱</UIFieldLabel>
            <UIFieldControl v-model="form.email" type="email" placeholder="taken@example.com 试试服务端错误" />
            <UIFieldError />
          </UIField>

          <UIField name="agree" :validate="validateAgree">
            <UIFieldLabel>服务条款</UIFieldLabel>
            <UICheckbox v-model="form.agree">我已阅读并同意服务条款</UICheckbox>
            <UIFieldError />
          </UIField>

          <div class="pg__row">
            <UIButton type="submit">提交</UIButton>
            <UIButton type="reset">重置</UIButton>
          </div>
        </UIForm>
        <p class="pg__note">
          校验失败会聚焦第一个出错字段；提交通过才触发 form-submit。reka 会把标签 / 说明 / 错误的 id
          接进控件的 aria-labelledby / aria-describedby。UICheckbox 与 UIInput 走的是同一条字段缝
          （composables/useField），所以勾选框的值照样进表单值表（布尔）、照样参与校验与报错。
        </p>
      </section>

      <UIDivider />

      <section class="pg__block">
        <h2>4. 浮层</h2>
        <div class="pg__row">
          <UIButton @click="dialogOpen = true">打开 Dialog</UIButton>
        </div>
        <UIDialog :open="dialogOpen" title="示例弹窗" icon="tdesign:info-circle" @update:open="dialogOpen = $event">
          <p>Esc 关闭、点击遮罩关闭、Tab 焦点陷阱都应由 reka 提供。</p>
          <p>关闭按钮的无障碍名走 closeLabel，库不下发 i18n。</p>
        </UIDialog>
      </section>

      <UIDivider />

      <section class="pg__block">
        <h2>5. 展示组件</h2>
        <div class="pg__row">
          <UIAvatar src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20gradient%20avatar%20portrait&image_size=square" alt="示例头像" />
          <UIPanelCard title="PanelCard" variant="elevated" padding="md">
            <p>面板内容</p>
          </UIPanelCard>
          <UIQRCode value="https://www.roidmc.com" :size="120" />
        </div>
        <UIScrollingText text="HorizonUI 的滚动文本组件 · 纯 Vue 3 下同样可用" />
      </section>

      <UIDivider />

      <section class="pg__block">
        <h2>6. Layout 套件</h2>
        <UILayout direction="row" class="pg__layout">
          <UILayoutAside width="10rem">Aside</UILayoutAside>
          <UILayoutMain>Main</UILayoutMain>
        </UILayout>
      </section>
    </UILayoutMain>

    <UILayoutFooter class="pg__footer">
      库不内置图标集：图标由 <code>createHorizon({ icon })</code> 注入（本页用 @iconify/vue + tdesign 集合）。
    </UILayoutFooter>
  </UILayout>

  <!-- 纯 Vue 宿主需自己挂 Toast 宿主；Nuxt 宿主由库的模块插件自动挂 -->
  <UIToast />
</template>

<style scoped>
:global(html),
:global(body) {
  margin: 0;
}

:global(body) {
  font-family: var(--h-font-family, system-ui, sans-serif);
  color: var(--h-text, #1f2937);
  background: var(--h-page-bg, #f6f7f9);
}

.pg {
  min-height: 100dvh;
}

.pg__header,
.pg__footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1.25rem;
}

.pg__sub,
.pg__label,
.pg__note {
  font-size: 0.85rem;
  opacity: 0.72;
}

.pg__main {
  padding: 1.25rem;
}

.pg__block {
  margin: 0 0 1.5rem;
}

.pg__block h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.pg__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.pg__note {
  margin: 0.4rem 0 0;
}

.pg__form {
  max-width: 24rem;
}

.pg__layout {
  min-height: 6rem;
}
</style>