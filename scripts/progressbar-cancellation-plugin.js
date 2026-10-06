/* eslint-env node */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const MagicString = require('magic-string')

const PATH_HASH = '02e441df6a1d4a0c679433b341e5de1594e13579cb2f7f7ffc1a8719945fdd86'
const SHIFTY_HASH = '68d04f45b4f96a2e75b1c39763f06f10c35b0b02700e17600d02a67367995e99'
const CONSTRUCTOR = '    this._tweenable = new Tweenable();'
const COMPLETION = '    }).then(function(state) {\n        if (utils.isFunction(cb)) {\n            cb();\n        }\n    });'
const HANDLER_NAME = 'ignoreProgressbarCancellation'
const HANDLER = 'function ' + HANDLER_NAME + '(reason) {\n' +
  '        if (reason && typeof reason === "object" &&\n' +
  '            Object.keys(reason).length === 3 &&\n' +
  '            Object.prototype.hasOwnProperty.call(reason, "error") &&\n' +
  '            Object.prototype.hasOwnProperty.call(reason, "currentState") &&\n' +
  '            Object.prototype.hasOwnProperty.call(reason, "attachment") &&\n' +
  '            reason.error === "stop() executed while tween isPlaying." &&\n' +
  '            reason.currentState === progressbarTween._currentState &&\n' +
  '            reason.attachment === undefined && !progressbarTween.isPlaying()) {\n' +
  '            return;\n' +
  '        }\n' +
  '        throw reason;\n' +
  '    }'

function digest(code) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

function canonical(id) {
  return id && id[0] !== '\0' && fs.existsSync(id) ? fs.realpathSync(id) : null
}

function owner(id) {
  let directory = path.dirname(id)
  while (directory !== path.dirname(directory)) {
    const file = path.join(directory, 'package.json')
    if (fs.existsSync(file)) return { name: JSON.parse(fs.readFileSync(file, 'utf8')).name, directory }
    directory = path.dirname(directory)
  }
  return {}
}

module.exports = function cancellationPlugin(root) {
  const progressbarPackage = require.resolve('progressbar.js/package.json', { paths: [root] })
  const dependencyRoot = path.dirname(progressbarPackage)
  const target = fs.realpathSync(path.join(dependencyRoot, 'src/path.js'))
  const expectedMain = fs.realpathSync(path.join(dependencyRoot, 'src/main.js'))
  let shiftyEntry
  let engineLoads = 0
  let patched = 0
  let targetId

  function fail(context, message) {
    context.error('ProgressBar compatibility guard: ' + message + '; review the dependency patch and restart the build process')
  }

  return {
    name: 'audited-progressbar-cancellation',
    async buildStart() {
      patched = 0
      engineLoads = 0
      targetId = null
      const pkg = JSON.parse(fs.readFileSync(progressbarPackage, 'utf8'))
      if (pkg.name !== 'progressbar.js' || pkg.version !== '1.1.0' || pkg.main !== 'src/main.js' || pkg.module || pkg.browser || pkg['jsnext:main']) fail(this, 'unexpected progressbar.js metadata')
      const main = await this.resolve('progressbar.js', path.join(root, 'src/index.js'))
      if (!main || main.external || canonical(main.id) !== expectedMain) fail(this, 'unexpected or external progressbar.js entry')
      const shifty = await this.resolve('shifty', target)
      if (!shifty || shifty.external || !canonical(shifty.id)) fail(this, 'missing or external Shifty entry')
      shiftyEntry = canonical(shifty.id)
      const shiftyPackage = path.resolve(path.dirname(shiftyEntry), '../package.json')
      const engine = JSON.parse(fs.readFileSync(shiftyPackage, 'utf8'))
      if (engine.name !== 'shifty' || engine.version !== '2.9.1' || engine.main !== 'dist/shifty.node.js' || engine.browser !== 'dist/shifty.js' || engine.module || engine['jsnext:main']) fail(this, 'unexpected Shifty metadata')
      if (shiftyEntry !== fs.realpathSync(path.join(path.dirname(shiftyPackage), engine.main))) fail(this, 'unexpected Shifty entry path')
      if (path.basename(shiftyEntry) !== 'shifty.node.js' || digest(fs.readFileSync(shiftyEntry)) !== SHIFTY_HASH) fail(this, 'unexpected Shifty entry bytes')
      ;[progressbarPackage, target, shiftyPackage, shiftyEntry].forEach(file => this.addWatchFile(file))
    },
    load(id) {
      if (canonical(id) === shiftyEntry) {
        if (++engineLoads !== 1) fail(this, 'duplicate Shifty module')
        const code = fs.readFileSync(shiftyEntry, 'utf8')
        if (digest(code) !== SHIFTY_HASH) fail(this, 'Shifty entry changed before loading')
        // Rollup 1 retains this upstream map URL differently on cached builds.
        // Remove only the audited transport directive and map the original bytes.
        const directive = '//# sourceMappingURL=shifty.node.js.map'
        const end = code.lastIndexOf(directive)
        if (end < 0 || code.slice(end + directive.length).trim()) fail(this, 'unexpected Shifty source-map directive')
        const source = new MagicString(code)
        source.remove(end, code.length)
        return { code: source.toString(), map: source.generateMap({ source: id, includeContent: true, hires: true }) }
      }
      if (canonical(id) !== target) return null
      if (++patched !== 1) fail(this, 'duplicate target module')
      targetId = id
      const code = fs.readFileSync(target, 'utf8')
      if (digest(code) !== PATH_HASH) fail(this, 'unexpected Path source hash')
      if (code.split(CONSTRUCTOR).length !== 2 || code.split(COMPLETION).length !== 2) fail(this, 'missing or duplicate patch anchor')
      const output = new MagicString(code)
      output.prependLeft(code.indexOf(CONSTRUCTOR) + 4, 'var progressbarTween = ')
      output.prependLeft(code.indexOf(COMPLETION) + COMPLETION.length - 2, ', ' + HANDLER)
      return { code: output.toString(), map: output.generateMap({ source: id, includeContent: true, hires: true }) }
    },
    buildEnd(error) {
      if (error) return
      if (patched !== 1 || engineLoads !== 1) fail(this, 'expected exactly one patched module and audited Shifty load')
      const ids = Array.from(this.moduleIds)
      if (ids.filter(id => canonical(id) === target).length !== 1) fail(this, 'duplicate target identity')
      const pending = [targetId]
      const seen = new Set()
      while (pending.length) {
        const id = pending.pop()
        if (seen.has(id)) continue
        seen.add(id)
        const info = this.getModuleInfo(id)
        if (info.isExternal) fail(this, 'external dependency in patched Path graph')
        info.importedIds.forEach(imported => pending.push(imported))
      }
      const engines = Array.from(seen).filter(id => canonical(id) === shiftyEntry)
      if (engines.length !== 1) fail(this, 'cached graph does not use exactly one audited Shifty entry')
      const unexpected = ids.filter(id => {
        const file = canonical(id)
        if (!file) return false
        const pkg = owner(file)
        return (pkg.name === 'shifty' && file !== shiftyEntry) ||
          (pkg.name === 'progressbar.js' && !file.startsWith(fs.realpathSync(dependencyRoot) + path.sep + 'src' + path.sep))
      })
      if (unexpected.length) fail(this, 'unexpected dependency copy or entry')
    },
    generateBundle(options, bundle) {
      if (options.format !== 'cjs' && options.format !== 'es') fail(this, 'unsupported output format')
      const chunks = Object.keys(bundle).map(key => bundle[key]).filter(output => output.type !== 'asset')
      const containing = chunks.filter(chunk => chunk.modules[targetId] && chunk.modules[targetId].renderedLength > 0)
      if (containing.length !== 1) fail(this, 'patched module missing from output')
      const ast = this.parse(containing[0].code)
      const expected = this.parse('(' + HANDLER + ')').body[0].expression
      const handlers = []
      const uses = []
      function visit(node) {
        if (!node || typeof node !== 'object') return
        if (node.type === 'FunctionExpression' && node.id && node.id.name === HANDLER_NAME) handlers.push(node)
        if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'then' && node.arguments.length === 2 &&
            node.arguments[1].type === 'FunctionExpression' && node.arguments[1].id &&
            node.arguments[1].id.name === HANDLER_NAME) uses.push(node.arguments[1])
        Object.keys(node).forEach(key => {
          if (Array.isArray(node[key])) node[key].forEach(visit)
          else if (node[key] && typeof node[key] === 'object') visit(node[key])
        })
      }
      visit(ast)
      const structural = node => JSON.stringify(node, (key, value) => ['start', 'end', 'loc', 'raw'].includes(key) ? undefined : value)
      if (handlers.length !== 1 || uses.length !== 1 || handlers[0] !== uses[0] || structural(handlers[0]) !== structural(expected)) fail(this, 'executable cancellation handler missing or changed')
    }
  }
}
