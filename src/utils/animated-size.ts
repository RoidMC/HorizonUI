// Horizon UI Core - AnimatedSize

import { nextTick } from 'vue';
import type { Ref } from 'vue';

export interface AnimatedSizeOptions {
  /** 过渡时长，默认 300ms */
  duration?: number;
  /** 缓动函数，默认 ease */
  easing?: string;
  /** 离开（收起/移出）方向的缓动函数，默认 ease-in-out。
   *  展开用 `ease` 会"前段快速撑开"显得丝滑；但同一曲线反向用在收起时，
   *  会在前 40% 时间就缩掉约 75%，读起来像"直接收回去还剩小尾巴"。
   *  这里单独给反向用对称的 ease-in-out，避免展开/收回感知不对称。
   */
  easingOut?: string;
  /** 是否同时过渡 opacity（需要在 CSS 中自行定义） */
}

/**
 * 让容器在内容切换 / 开合时平滑过渡宽高。
 * 与 Vue <Transition> 的 JS hooks 配合使用。
 *
 * 提供两套钩子：
 *  1) 内容替换模式（auth.vue 在用）：beforeLeave / enter / afterEnter
 *     —— wrapper 为外层固定容器，el 为被切换的内容。
 *  2) 开合模式（NavMenuItem 在用）：preOpen / open / postOpen / preClose / close / postClose
 *     —— 过渡元素即 <Transition> 直接包裹的那个元素，实现单个元素 0 ↔ auto 高度的丝滑过渡。
 *
 *  重要：开合模式的全部钩子都使用 Vue 传入的 el 参数操作 DOM，绝不读 wrapperRef。
 *  原因：Vue 3 对 v-if 卸载的元素在 leave 动画开始前就已把 template ref 置空
 *  （DOM 移除延迟到 done 之后，但 ref 清空不等它），leave 钩子里 wrapperRef.value
 *  必为 null —— 若依赖 ref 会让收起动画被静默跳过（表现为瞬间消失）。
 */
export function useAnimatedSize<T extends HTMLElement>(
  wrapperRef: Ref<T | null>,
  options: AnimatedSizeOptions = {}
) {
  // 默认缓动：展开走 iOS 那条「起步快、尾巴长」的减速曲线
  // （= --h-motion-ease-ios cubic-bezier(0.32, 0.72, 0, 1)，见 themes/variables/abstracts/_vars.scss）。
  // `ease` 在高度这种大位移上观感几乎就是线性，没有"弹出感"。
  //
  // ⚠️ 高度**绝不能**用带过冲（overshoot）的曲线（如 easeOutBack / cubic-bezier(0.34, 1.56, 0.64, 1)）：
  //    收起时会先缩到比目标更矮，而内容还在 → 最后一行被裁掉（正是刚修掉的「底部被挡」）。
  //    过冲只能用在不会裁内容的属性上：平移 / 缩放 / 透明度。
  const { duration = 300, easing = 'cubic-bezier(0.32, 0.72, 0, 1)', easingOut = 'ease-in-out' } = options;

  const applyTransition = (curve: string) => {
    const el = wrapperRef.value;
    if (!el) return;
    el.style.transition = `width ${duration}ms ${curve}, height ${duration}ms ${curve}`;
    el.style.overflow = 'hidden';
  };

  const setSize = (width: number, height: number) => {
    const el = wrapperRef.value;
    if (!el) return;
    // 方向感知：长高 → easing（减速，有弹出感）；收短 → easingOut（对称曲线）。
    // 把减速曲线原样反向用在收起上，会在前 40% 的时间里就缩掉约 75%，
    // 读起来像"啪一下收回、还剩个小尾巴"。
    const growing = height > el.offsetHeight;
    applyTransition(growing ? easing : easingOut);
    el.style.width = width > 0 ? `${width}px` : '';
    el.style.height = height > 0 ? `${height}px` : '';
  };

  // 释放内联尺寸时**必须连 transition / overflow 一起清**：
  // 只清宽高的话，容器会永久留着 `overflow: hidden`，之后只要内容比"锁定高度"高一点
  // （字体互换、图片解码、末行亚像素取整都会导致）就会被裁掉最后一行，
  // 等下一次再清高度时才"生硬跳回"真实高度 —— 这正是"底部被挡"的来源。
  // 开合模式的 postOpen/postClose 一直是这么清的，内容替换模式此前漏了。
  const clearSize = () => {
    const el = wrapperRef.value;
    if (!el) return;
    el.style.width = '';
    el.style.height = '';
    el.style.transition = '';
    el.style.overflow = '';
  };

  // ⚠️ 这两个钩子的参数类型必须是 `Element`（不是 HTMLElement）：
  //    Vue 的 Transition Hook 契约就是 `Hook<(el: Element) => void>`，
  //    声明成 HTMLElement 会在模板里 `@before-leave="beforeLeave"` 处报 TS2322
  //    （Element 不能赋给 HTMLElement）。这里只用到 getBoundingClientRect，Element 上就有。

  // 内容替换模式的收尾资源：跟随内容高度的观察器 + 兜底释放定时器。
  // 为什么需要它们（不要简化回"测一次 + 等 afterEnter"）：
  //   进入元素的高度可能在任何时刻才 settle —— 字体互换、URL/长 scope 的换行行数、
  //   图片解码、i18n 文案长度变化。只要"锁定高度"比真实内容矮一行，那一行就会掉到
  //   内容盒外：要么被容器裁掉、要么被下面的底栏盖住（表现为"底部被挡"），直到尺寸被
  //   释放才"生硬跳回"真实高度。而一旦 afterEnter 因被打断/没有 transitionend 而未触发，
  //   这个错误高度就会**永久停留**——不是闪一下，是一直错。
  // 观察的必须是**进入元素自身**：改高度的是外层容器，观察容器会自激。
  let replaceObserver: ResizeObserver | null = null;
  let replaceTimer: number | null = null;

  const stopReplaceWatch = () => {
    if (replaceObserver) {
      replaceObserver.disconnect();
      replaceObserver = null;
    }
    if (replaceTimer !== null) {
      clearTimeout(replaceTimer);
      replaceTimer = null;
    }
  };

  /** Vue Transition before-leave 钩子（内容替换模式） */
  const beforeLeave = (el: Element) => {
    // 先停掉上一次动画的观察与兜底：否则它会在本次动画进行到一半时触发 clearSize，
    // 表现为"高度弹回 auto 再开始缩"（同开合模式里 clearPending 的理由）。
    stopReplaceWatch();
    const target = el as HTMLElement;
    setSize(target.offsetWidth, target.offsetHeight + 1);
  };

  /** Vue Transition enter 钩子（内容替换模式） */
  const enter = (el: Element) => {
    // ⚠️ 测量必须用**布局尺寸** offsetWidth / offsetHeight，不能用 getBoundingClientRect()：
    //    进场元素带着 translateX + scale（见 .kex-auth-panel-fade-enter-from），
    //    而 getBoundingClientRect() 返回的是**变换后**的矩形 —— scale(0.96) 会让它矮 4%，
    //    锁定高度一旦矮于真实内容，最后一行就会被裁（正是刚修掉的「底部被挡」）。
    //    另外也不用容器的 scrollHeight：交叉淡出时离场元素是 absolute 脱流的，
    //    它会算进 scrollable overflow，读出来是旧内容的高度。
    //    offsetHeight 是整数（四舍五入），故 +1 兜住小数 —— 宁可高 1px 也不要裁掉末行。
    const target = el as HTMLElement;
    let applied = 0;
    const apply = () => {
      const height = target.offsetHeight;
      if (height <= 0) return;
      const next = height + 1;
      // 同值不重复写：避免反复重置内联 transition 打断正在跑的过渡
      if (next === applied) return;
      applied = next;
      setSize(target.offsetWidth, next);
    };
    nextTick(() => {
      apply();
      // 动画期间持续跟随内容高度：内容什么时候 settle，目标高度就什么时候改对
      // （迟到的修正落在 300ms 过渡里，肉眼看不见；总比停在错误高度强）。
      if (typeof ResizeObserver !== 'undefined') {
        replaceObserver = new ResizeObserver(() => apply());
        replaceObserver.observe(target);
      }
      // 兜底：无论 afterEnter 是否如期触发，duration 之后一定释放一次尺寸。
      // 这是"不会永久停在错误高度"的保证。
      // +120 而不是 +80：CSS 那条淡入带了延迟（见 .kex-auth-panel-fade-enter-active），
      // Vue 的 afterEnter 是按「时长 + 延迟」算的，兜底必须晚于它，否则会提前把尺寸释放掉。
      replaceTimer = window.setTimeout(() => {
        stopReplaceWatch();
        clearSize();
      }, duration + 120);
    });
  };

  /** Vue Transition after-enter 钩子（内容替换模式） */
  const afterEnter = () => {
    stopReplaceWatch();
    clearSize();
  };

  // ===== 开合模式：单个元素 0 ↔ auto 高度过渡 =====
  // 用法：
  // <Transition :css="false"
  //   @before-enter="preOpen" @enter="open" @after-enter="postOpen"
  //   @before-leave="preClose" @leave="close" @after-leave="postClose">
  //   <div ref="wrapperRef" v-if="open">...内容...</div>
  // </Transition>
  // 全部钩子操作 Vue 传入的 el；wrapperRef 仅用于类型约束与内容替换模式。

  // 进行中动画的收尾资源：监听器挂在哪个元素、事件处理器、兜底定时器。
  // 挂载元素必须显式记录：leave 期间 template ref 已被 Vue 置空，不能靠 wrapperRef 反查。
  let pendingEl: HTMLElement | null = null;
  let pendingEnd: ((e: TransitionEvent) => void) | null = null;
  // 兜底定时器必须跟踪并在 clearPending 中清理：
  // 否则「开→马上关」时，上一次动画的兜底定时器会在收起进行到一半时触发，
  // 移除当前动画的 transitionend 监听并误调旧的 done()（postOpen 把 height 改回 auto），
  // 表现为收起动画中途弹回全高后瞬间消失。
  // 类型直接用 number（lib.dom 中 window.setTimeout 返回 number）。
  // 不要写 ReturnType<typeof setTimeout>：混合 @types/node 时会被解析成
  // NodeJS.Timeout，与 window.setTimeout 的 number 不一致，赋值/比较均报错。
  let pendingFallback: number | null = null;
  const clearPending = () => {
    if (pendingEl && pendingEnd) {
      pendingEl.removeEventListener('transitionend', pendingEnd);
    }
    pendingEl = null;
    pendingEnd = null;
    if (pendingFallback) {
      clearTimeout(pendingFallback);
      pendingFallback = null;
    }
  };

  // 强制浏览器立即重排，确保 height:0 等起点样式被实际渲染后再开始过渡
  const forceReflow = (el: HTMLElement) => void el.offsetHeight;

  // 执行一次高度过渡：从 from(px) 平滑过渡到 to(px)。
  // 关键点：必须在同一同步任务里先锁死起点并 forceReflow，
  // 再设置 transition + 目标高度，浏览器才会真正产生过渡动画
  // （若设 transition 与设目标值隔帧，起点会被丢弃，表现为直接跳变）。
  const animateHeight = (
    w: HTMLElement,
    from: number,
    to: number,
    done: () => void,
    transitEasing: string = easing
  ) => {
    clearPending();
    // 先清零上一次可能残留的过渡，避免干扰本次起点
    w.style.transition = 'none';
    w.style.overflow = 'hidden';
    w.style.height = `${from}px`;
    forceReflow(w); // 提交起点（让浏览器"记住"当前高度）
    // 开启过渡并设目标值
    w.style.transition = `height ${duration}ms ${transitEasing}`;
    w.style.height = `${to}px`;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      // 只清理属于自己的监听/定时器：若本次动画已被更新的动画打断，
      // pendingEnd/pendingFallback 已归属新动画，绝不能动
      if (pendingEnd === onEnd) {
        pendingEnd = null;
        pendingEl = null;
        w.removeEventListener('transitionend', onEnd);
      }
      if (pendingFallback === fallback) pendingFallback = null;
      done();
    };
    const onEnd = (e: TransitionEvent) => {
      // 只响应自身 height 过渡结束；子元素（嵌套菜单）冒泡上来的 transitionend 一律忽略，
      // 否则父菜单会在子动画结束时被误判完成而提前移除
      if (e.target === w && e.propertyName === 'height') finish();
    };
    // 兜底：transition 被禁用 / 不触发时也能完成，避免 Vue 卡在过渡中
    const fallback = window.setTimeout(finish, duration + 60);
    w.addEventListener('transitionend', onEnd);
    pendingEl = w;
    pendingEnd = onEnd;
    pendingFallback = fallback;
  };

  /** 进入前：固定高度为 0，作为过渡起点（双保险，animateHeight 内也会再锁定） */
  const preOpen = (el: Element) => {
    const w = el as HTMLElement; // Transition 实际传入 HTMLElement；Element 无 style，需收窄
    clearPending();
    w.style.overflow = 'hidden';
    w.style.height = '0px';
  };

  /** 进入动画：从 0 过渡到内容真实高度（scrollHeight），结束后 done */
  const open = (el: Element, done: () => void) => {
    const target = el.scrollHeight;
    if (target <= 0) { done(); return; }
    animateHeight(el as HTMLElement, 0, target, done);
  };

  /** 进入完成：释放为 auto，自适应内容变化（如窗口 resize、子项增减） */
  const postOpen = (el: Element) => {
    const w = el as HTMLElement;
    clearPending();
    w.style.height = 'auto';
    w.style.overflow = '';
    w.style.transition = '';
  };

  /** 离开前：仅准备 overflow（起点由 close 重新测量，避免依赖此处的快照） */
  const preClose = (el: Element) => {
    const w = el as HTMLElement;
    clearPending();
    w.style.overflow = 'hidden';
  };

  /** 离开动画：从当前高度过渡到 0，结束后 done */
  const close = (el: Element, done: () => void) => {
    // 优先取当前渲染高度：若收起发生在上一次（被中断的）动画中段，
    // 从当前值继续收起才不会先跳变；height:auto 时 rect 即内容高度，
    // rect 为 0 时回退 scrollHeight（内容真实高度，不受父级裁剪影响）
    const from = el.getBoundingClientRect().height || el.scrollHeight;
    if (from <= 0) { done(); return; }
    animateHeight(el as HTMLElement, from, 0, done, easingOut);
  };

  /** 离开完成：清理内联样式 */
  const postClose = (el: Element) => {
    const w = el as HTMLElement;
    clearPending();
    w.style.height = '';
    w.style.overflow = '';
    w.style.transition = '';
  };

  return {
    beforeLeave,
    enter,
    afterEnter,
    // 开合模式
    preOpen,
    open,
    postOpen,
    preClose,
    close,
    postClose,
  };
}
