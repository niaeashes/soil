// @ts-check

import Node from './Node.js'
import Root from './Root.js'
import Type from './Type.js'

import '../extension.js'
import { DEFINED_TYPES } from '../const.js'

export default class Field extends Node {
  /**
   * @param {string} name 
   * @param {object|string} schema 
   */
  constructor(name, schema) {
    if (typeof schema == 'string') {
      super(name, { name, type: schema })
    } else {
      super(name, { name, type: '*', ...schema })
    }
  }

  /**
   * @returns {string?}
   */
  get label () {
    return null
  }

  get type () {
    // @ts-ignore
    return new Type(this.schema.type.replace('*', this.name.classify()), this)
  }

  /**
   * @type {boolean}
   */
  get mutable () {
    return this.schema.annotation == 'mutable'
  }

  /**
   * @type {boolean}
   */
   get writer () {
    return this.schema.annotation == 'writer'
  }

  /**
   * @type {boolean}
   */
  get reference () {
    return this.schema.annotation == 'reference'
  }

  /**
   * @type {boolean}
   */
  get optional () {
    return this.type.isOptional
  }

  /**
   * @type {boolean}
   */
  get isSelfDefined () {
    return ['*', 'List<*>', '*?', 'Enum'].indexOf(this.schema.type) != -1
  }

  /**
   * @returns {object[]}
   */
  captureSubschemas () {
    const subschemas = []
    if (this.isSelfDefined && this.schema.schema) {
      // @ts-ignore
      subschemas.push({ ...this.schema.schema, name: this.name.classify() })
    }
    return subschemas
  }

  get token () {
    return this.schema.token || `$${this.name}`
  }

  get enumValues () {
    const enumValues = this.schema.enum
    if (Array.isArray(enumValues)) {
      return enumValues
    }
    return []
  }

  /**
   * @type {boolean}
   */
   get isEnum () {
    return this.type.isEnum
  }

  /**
   * @type {boolean}
   */
  get isSelfDefinedEnum () {
    return this.isEnum && Array.isArray(this.schema.enum)
  }

  /**
   * @type {any}
   */
  get typicalValue () {
    return this.type.mock()
  }

  mock () {
    if (this.isEnum) {
      return this.enumValues[0]
    }
    return this.typicalValue
  }
}

/*
  ================================
  Utilities
 */

  /**
   * 
   * @param {object} fields 
   * @returns 
   */
Field.parse = fields => Object.keys(fields || {}).map(name => new Field(name, fields[name]))