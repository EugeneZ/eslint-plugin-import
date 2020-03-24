import {dirname} from 'path'
import findUp from 'find-up'


export function getContextPackagePath(context) {
  return getFilePackagePath(context.getFilename())
}

export function getFilePackagePath(filePath) {
  const fp = findUp.sync('package.json', {cwd: filePath, normalize: false})
  return dirname(fp)
}
