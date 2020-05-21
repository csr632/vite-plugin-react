import fs from 'fs'
import { ServerPlugin } from 'vite'

export const runtimePublicPath = '/@react-refresh'

const globalPreamble = `
<script type="module">
import RefreshRuntime from "${runtimePublicPath}"
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
</script>
`

function debounce(fn: () => void, delay: number) {
  let handle: any
  return () => {
    clearTimeout(handle)
    handle = setTimeout(fn, delay)
  }
}

export const reactRefreshServerPlugin: ServerPlugin = ({ app }) => {
  const runtimePath = require.resolve(
    'react-refresh/cjs/react-refresh-runtime.development.js'
  )
  // shim the refresh runtime into an ES module
  const runtimeCode = `
const exports = {}
${fs.readFileSync(runtimePath, 'utf-8').replace("process.env.NODE_ENV", JSON.stringify("development"))}
${debounce.toString()}
exports.performReactRefresh = debounce(exports.performReactRefresh, 16)
export default exports
`

  app.use(async (ctx, next) => {
    // serve react refresh runtime
    if (ctx.path === runtimePublicPath) {
      ctx.type = 'js'
      ctx.status = 200
      ctx.body = runtimeCode
      return
    }

    await next()

    if ((ctx.path.endsWith('/') || ctx.path.endsWith('.html')) && ctx.body) {
      // inject global preamble
      ctx.body = globalPreamble + ctx.body
    }
  })
}
