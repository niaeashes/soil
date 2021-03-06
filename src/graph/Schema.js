import { promises as fs } from 'node:fs'
import path from 'node:path'

import chalk from 'chalk'

import contextUtilities from '../context.js'

import Entity from './Entity.js'
import Scenario from './Scenario.js'
import Root from './Root.js'
import Endpoint from './Endpoint.js'
import RequestStep from './RequestStep.js'

export default class Schema {
  constructor(config) {
    Object.defineProperty(this, 'config', { value: config })
  }

  parse(schemas) {
    const root = new Root()
    schemas
      .entities
      .forEach(schema => root.addChild(schema.name, new Entity(schema)))
    schemas
      .scenarios
      .forEach(schema => root.addChild(schema.name, new Scenario(schema)))

    Object.defineProperty(this, 'root', { value: root, enumerable: true })
  }

  get entities () {
    return this.root.entities
  }

  get scenarios () {
    return this.root.scenarios
  }

  get endpoints () {
    return this.root.endpoints
  }

  async exportOpenApiSchema() {
  }

  async exportSwiftCode() {
    var swiftExportDir = this.config.exportDir

    if (typeof swiftExportDir == 'object') {
      swiftExportDir = swiftExportDir.swift || swiftExportDir.default
    }
    await fs.mkdir(swiftExportDir, { recursive: true })
    this.entities.forEach(async (entity) => {
      const file = path.join(process.cwd(), swiftExportDir, `${entity.name}.swift`)
      try {
        const body = await entity.renderSwiftFile({ config: this.config, entities: this.entities, ...contextUtilities })
        fs.writeFile(file, body, this.config.encode)
        console.log(chalk.green('[Swift]', '-', file))
      } catch (error) {
        console.error(chalk.red('[Swift]', `Failure exporting to ${file}`))
        console.error(error)
      }
    })
  }

  async exportKotlinCode() {
  }

  /**
   * 
   * @param {RequestStep|string} reference 
   * @param {string|undefined} path 
   * @returns {Endpoint|undefined}
   */
  resolveEndpoint (reference, path = undefined) {
    if (reference instanceof RequestStep) {
      return this.resolveEndpoint(reference.reference || reference.method, reference.path)
    }
    if (typeof path == 'string') {
      const method = reference
      return this.root.endpoints.find(endpoint => endpoint.match(method, path))
    } else {
      const node = this.root.resolve(reference)
      if (node instanceof Endpoint) {
        return node
      }
    }
  }

  debug () {
    if (!soil.options.verbose) { return }
    console.log(chalk.yellow('[DEBUG] print loaded schema'))
    this.entities.forEach(entity => {
      entity.inspect()
    })
  }
}
