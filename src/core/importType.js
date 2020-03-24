import * as PATH from 'path'
import coreModules from 'resolve/lib/core'

import resolve from 'eslint-module-utils/resolve'
import { getContextPackagePath } from './packagePath'

function baseModule(name) {
  if (isScoped(name)) {
    const [scope, pkg] = name.split('/')
    return `${scope}/${pkg}`
  }
  const [pkg] = name.split('/')
  return pkg
}

export function isAbsolute(name) {
  return PATH.isAbsolute(name)
}

// path is defined only when a resolver resolves to a non-standard path
export function isBuiltIn(name, settings, path) {
  if (path || !name) return false
  const base = baseModule(name)
  const extras = (settings && settings['import/core-modules']) || []
  return coreModules[base] || extras.indexOf(base) > -1
}

function isExternalPath(name, settings, path, packagePath) {
  const internalScope = (settings && settings['import/internal-regex'])
  if (internalScope && RegExp(internalScope).test(name)) {
    return false
  }

  if (!path || PATH.relative(packagePath, path).startsWith('..')) {
    return true
  }

  const folders = (settings && settings['import/external-module-folders']) || ['node_modules']
  return folders.some((folder) => {
    const folderPath = PATH.resolve(packagePath, folder)
    const relativePath = PATH.relative(folderPath, path)
    return !relativePath.startsWith('..')
  })
}

const moduleRegExp = /^\w/
export function isExternalModule(name, settings, path, context) {
  const packagePath = getContextPackagePath(context)
  return moduleRegExp.test(name) && isExternalPath(name, settings, path, packagePath)
}

const moduleMainRegExp = /^[\w]((?!\/).)*$/
export function isExternalModuleMain(name, settings, path, context) {
  const packagePath = getContextPackagePath(context)
  return moduleMainRegExp.test(name) && isExternalPath(name, settings, path, packagePath)
}

const scopedRegExp = /^@[^/]*\/?[^/]+/
export function isScoped(name) {
  return name && scopedRegExp.test(name)
}

const scopedMainRegExp = /^@[^/]+\/?[^/]+$/
export function isScopedMain(name) {
  return name && scopedMainRegExp.test(name)
}

function isRelativeToParent(name) {
  return/^\.\.$|^\.\.[\\/]/.test(name)
}

const indexFiles = ['.', './', './index', './index.js']
function isIndex(name) {
  return indexFiles.indexOf(name) !== -1
}

function isRelativeToSibling(name) {
  return /^\.[\\/]/.test(name)
}

const specialCharsRegExp = /[\s~#$!%^&*(),?"':{}|<>]/
const firstCharsRegExp = /^[-_]/
function isUnknown(name, path) {
  // do not return unknown if path has been resolved through the resolvers
  return (!path && name && (specialCharsRegExp.test(name) || firstCharsRegExp.test(name)))
}

function typeTest(name, settings, path, context) {
  if (isAbsolute(name)) { return 'absolute' }
  if (isBuiltIn(name, settings, path)) { return'builtin' }
  if (isRelativeToParent(name)) { return'parent' }
  if (isIndex(name)) { return'index' }
  if (isRelativeToSibling(name)) { return'sibling' }
  if (isUnknown(name, path)) { return 'unknown' }
  const packagePath = getContextPackagePath(context)
  return (isExternalPath(name, settings, path, packagePath)) ? 'external' : 'internal'
}

export function isScopedModule(name) {
  return name.indexOf('@') === 0
}

export default function resolveImportType(name, context) {
  return typeTest(name, context.settings, resolve(name, context), context)
}
