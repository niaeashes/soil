const STEP = 1

export default class Parser {

  constructor () {
    this.entities = []
    this.logs = []
  }

  /**
   * @param  {...string} messages 
   */
  log (...messages) {
    this.logs.push(messages.join(' '))
  }

  /**
   * @param {string} body 
   * @returns {string[]} tokens
   */
  tokenize (body) {
    const length = body.length
    var tokens = []
    var buffer = ''
    var i = 0
    while (i < body.length) {
      const c = body[i]
      switch (c) {
        case '\n':
        case ' ':
          if (buffer.trim().length > 0)
            tokens.push(buffer.trim())
          buffer = ''
          break
        case '{':
        case '}':
        case ':':
        case '[':
        case ']':
          const trim = buffer.trim()
          if (trim.length > 0)
            tokens.push(trim)
          tokens.push(c)
          buffer = ''
          break
        case '-':
          var comment = ''
          i += STEP
          while (body[i] != '\n' && i < body.length) {
            comment += body[i]
            i += STEP
          }
          tokens.push('-', comment.trim())
          break
        default:
          buffer += c
      }

      i += STEP
    }
    if (buffer.trim().length > 0)
      tokens.push(buffer.trim())
    this.log('tokenized:', tokens.map(token => `'${token}'`).join(', '))
    return tokens
  }

  /**
   * @param {string} body .soil file body
   * @returns {object[]} array of soil entity
   */
  parse (body) {
    this.log('start parse')
    const tokens = this.tokenize(body)
    var i = 0
    if (tokens[i] == 'entity') {
      i = this.parseEntity(tokens, i)
    } else {
      throw 'Syntax Error'
    }
    return this.entities
  }

  parseEntity (tokens, i) {
    if (tokens[i] != 'entity') {
      throw 'Illegal Call: parseEntity'
    }
    i += STEP
    var schema = {
      name: tokens[i],
      fields: {},
      subtypes: [],
      endpoints: {},
    }
    this.log('start parse entity', schema.name)
    i += STEP
    if (tokens[i] != '{') {
      throw 'Unexpected token'
    }
    i += STEP
    while (tokens[i] != '}') {
      const token = tokens[i]
      switch (token) {
      case 'field':
        i = this.parseField(tokens, i, schema)
        break
      case 'inner':
        i = this.parseInnerType(tokens, i, schema)
        break
      case 'endpoint':
        i = this.parseEndpoint(tokens, i, schema)
        break
      case 'mutable':
        if (tokens[i + 1] == 'field') {
          i += STEP
          break
        }
      default:
        throw new Error(`unexpected token: ${token}`)
      }
    }
    this.entities.push(schema)
    return i
  }

  parseField (tokens, i, schema) {
    if (tokens[i] != 'field') {
      throw 'Illegal Call'
    }
    this.log('start parse field in', schema.name)
    let bi = i - STEP
    var annotation
    while (['mutable', 'reference', 'writer', 'identifier'].indexOf(tokens[bi]) != -1) {
      annotation = tokens[bi]
      bi -= STEP
    }
    i += STEP
    const name = tokens[i]
    this.log('- field name:', name)
    i += STEP
    if (tokens[i] != ':') {
      throw 'Unexpected Token'
    }
    i += STEP
    var fieldSchema = {
      type: tokens[i],
    }
    i += STEP

    if (annotation) {
      fieldSchema.annotation = annotation
      this.log('- annotation:', annotation)
    }

    if (tokens[i] == '{') {
      this.log('- field has block')
      i = this.parseFieldBlock(tokens, i, fieldSchema)
      this.log('- field block closed')
    }

    schema.fields[name] = fieldSchema

    return i
  }

  parseFieldBlock (tokens, i, schema) {
    if (tokens[i] != '{') {
      throw 'Illegal Call'
    }
    i += STEP
    var hasSummary = false
    while (tokens[i] != '}') {
      var token = tokens[i]
      switch (token) {
      case '-':
        i += STEP
        if (hasSummary == false) {
          hasSummary = true
          schema.summary = tokens[i]
          this.log('- field summary:', schema.summary)
        } else {
          schema.description = tokens[i]
        }
        i += STEP
        break
      case 'schema':
        i += STEP
        var subschema = { fields: {} }
        i = this.parseSubschema(tokens, i, subschema)
        schema.schema = subschema
        break
      case 'example':
        i += STEP
        var examples = []
        i = this.parseExample(tokens, i, examples)
        console.log({ examples })
        break
      case '{':
        while (tokens[i] != '}') i += STEP
        i += STEP
        break
      default:
        throw new Error(`unexpected token: ${token}`)
      }
    }
    i += STEP
    return i
  }

  parseInnerType (tokens, i, schema) {
    if (tokens[i] != 'inner') {
      throw 'Illegal Call'
    }
    this.log('start parse inner-type in', schema.name)
    i += STEP
    const name = tokens[i]
    this.log('- inner type name:', name)
    i += STEP
    var innerSchema = {
      name,
      fields: {},
    }

    if (tokens[i] == '{') {
      this.log('- inner has block')
      i = this.parseInnerBlock(tokens, i, innerSchema)
      this.log('- inner block closed')
    }

    schema.subtypes.push(innerSchema)

    return i
  }

  parseInnerBlock (tokens, i, schema) {
    if (tokens[i] != '{') {
      throw 'Illegal Call'
    }
    i += STEP
    var hasSummary = false
    while (tokens[i] != '}') {
      var token = tokens[i]
      switch (token) {
      case '-':
        i += STEP
        if (hasSummary == false) {
          hasSummary = true
          schema.summary = tokens[i]
          this.log('- field summary:', schema.summary)
        } else {
          schema.description = tokens[i]
        }
        i += STEP
        break
      case '{':
        while (tokens[i] != '}') i += STEP
        i += STEP
        break
      case 'field':
        i = this.parseField(tokens, i, schema)
        break
      default:
        throw new Error(`unexpected token: ${token}`)
      }
    }
    i += STEP
    return i
  }

  parseEndpoint (tokens, i, schema) {
    if (tokens[i] != 'endpoint') {
      throw 'Illegal Call'
    }
    i += STEP
    const method = tokens[i]
    i += STEP
    const path = tokens[i]
    i += STEP
    var endpointSchema = {
      parameters: {}
    }
    this.log('start parse endpoint', method, path)

    if (tokens[i] == '{') {
      var hasSummary = false
      i += STEP
      while (tokens[i] != '}') {
        const token = tokens[i]
        switch (token) {
          case 'success':
          case 'request':
            i += STEP
            var subschema = { fields: {} }
            i = this.parseSubschema(tokens, i, subschema)
            endpointSchema[token] = { schema: subschema.fields }
            break
          case 'parameter':
            i = this.parseParameter(tokens, i, endpointSchema)
            break
          case '-':
            i += STEP
            if (hasSummary == false) {
              hasSummary = true
              endpointSchema.summary = tokens[i]
            } else {
              endpointSchema.description = tokens[i]
            }
            i += STEP
            break
          default:
            throw new Error(`unexpected token: ${token}`)
        }
      }
      i += STEP
    }

    if (typeof schema.endpoints[path] == 'undefined') {
      schema.endpoints[path] = {}
    }
    schema.endpoints[path][method.toLowerCase()] = endpointSchema

    return i
  }

  parseParameter (tokens, i, schema) {
    if (tokens[i] != 'parameter') {
      throw 'Illegal Call'
    }
    i += STEP
    const name = tokens[i]
    this.log('start parse endpoint parameter:', name)
    i += STEP
    if (tokens[i] != ':') {
      throw new Error(`Unexpected Token: '${tokens[i]}', but expected ':'`)
    }
    i += STEP
    const type = tokens[i]

    const parameterSchema = {
      type,
    }

    i += STEP

    if (type == 'Enum' && tokens[i] == '[') {
      i += STEP
      var items = []
      while (tokens[i] != ']') {
        items.push(tokens[i].replace(/,$/, ''))
        i += STEP
      }
      i += STEP
      parameterSchema.enum = items
    }

    schema.parameters[name] = parameterSchema

    return i
  }

  parseExample (tokens, i, schema) {

    i += STEP
    while (tokens[i] != ']') {
      console.log(tokens[i])
      i += STEP
    }

    i += STEP

    return i
  }

  parseSubschema (tokens, i, schema) {
    if (tokens[i] != '{') {
      throw 'Unexpected Token'
    }
    i += STEP
    while (tokens[i] != '}') {
      const token = tokens[i]
      switch (token) {
        case 'field':
          i = this.parseField(tokens, i, schema)
          break
        default:
          throw new Error(`unexpected token: ${token}`)
      }
    }
    i += STEP
    return i
  }
}