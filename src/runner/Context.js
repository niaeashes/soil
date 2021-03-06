import Runner from './Runner.js'

import VariableNotFoundError from '../errors/VariableNotFoundError.js'

export default class Context {
  /**
   * 
   * @param {Context|undefined} parent
   * @param {object|undefined} env 
   */
  constructor (parent, env = undefined) {
    this._space = {}
    this._headers = {}
    this._env = env
    Object.defineProperty(this, 'parent', { value: parent, enumerable: false })
  }

  get env () {
    if (typeof this.parent != 'undefined') {
      return this.parent.env
    } else {
      return this._env || process.env
    }
  }

  get headers () {
    return Object.assign({}, this.parent.headers, this._headers)
  }

  setHeader (name, value) {
    if (typeof value == 'string' && value[0] == '$') {
      return this.setHeader(name, this.resolveVar(value))
    }
    this._headers[name] = value
  }

  setVar (name, value) {
    if (typeof value == 'string' && value[0] == '$') {
      return this.setVar(name, this.resolveVar(value))
    }
    this._space[`$${name}`] = value
  }

  /**
   * 
   * @param {string} code 
   * @param {object|undefined} namespace
   * @returns 
   */
  resolveVar (code, namespace = undefined) {
    var path = code.split('.')
    const name = path.shift()

    if (path.length == 0 && typeof namespace == 'object') {
      return namespace[name.replace(/^\$/, '')]
    }

    switch (name) {
      case '$env':
        if (typeof this.env[path[0]] == 'undefined') {
          break
        } else {
          return this.env[path[0]]
        }
      case '$header':
        if (typeof this.headers[path[0]] == 'undefined') {
          break
        } else {
          return this.headers[path[0]]
        }
      default:
        if (typeof namespace == 'object' && typeof namespace[name] != 'undefined') {
          if (path.length == 0) {
            return namespace[name]
          } else {
            return this.resolveVar(path.join('.'), namespace[name])
          }
        }
        if (typeof this._space[name] == 'object') {
          if (path.length == 0) {
            return this._space[name]
          } else {
            return this.resolveVar(path.join('.'), this._space[name])
          }
        }
        if (typeof this._space[name] != 'undefined') {
          return this._space[name]
        }
        if (typeof this.parent != 'undefined') {
          return this.parent.resolveVar(code)
        }
    }

    console.log(this._space)

    throw new VariableNotFoundError(`Variable not found \`${code}\``)
  }

  spawnNestedContext () {
    return new Context(this)
  }
}