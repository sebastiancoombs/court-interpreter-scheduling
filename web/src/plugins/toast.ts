import Vue from 'vue'

interface ToastOpts { title?: string; duration?: number }

function makeToaster(vm: Vue) {
    const show = (variant: string, msg: string, opts: ToastOpts = {}) =>
        (vm as any).$bvToast.toast(msg, {
            title: opts.title,
            variant,
            solid: true,
            noCloseButton: true,
            autoHideDelay: opts.duration ?? 4000,
            toaster: 'b-toaster-bottom-right',
            appendToast: true,
        })
    return {
        success: (msg: string, opts?: ToastOpts) => show('success', msg, opts),
        error:   (msg: string, opts?: ToastOpts) => show('danger',  msg, opts),
        info:    (msg: string, opts?: ToastOpts) => show('info',    msg, opts),
        warning: (msg: string, opts?: ToastOpts) => show('warning', msg, opts),
    }
}

const ToastPlugin = {
    install(V: typeof Vue) {
        Object.defineProperty(V.prototype, '$toast', {
            get() { return makeToaster(this) },
        })
    },
}

export default ToastPlugin
