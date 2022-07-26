import test from "ava"
import Endpoint from "../src/models/Endpoint.js"
import Field from "../src/models/Field.js"

import { DEFAULT_CONFIG } from '../src/const.js'
import contextUtilities from '../src/context.js'

const context = {
  config: DEFAULT_CONFIG,
  ...contextUtilities,
}

test('get endpoint', t => {
  const getEndpoint = new Endpoint('/users', 'get', {})
  t.is(getEndpoint.signature, 'UsersEndpoint')
})

test('get endpoint with summary', t => {
  const getEndpoint = new Endpoint('/users', 'get', {
    summary: 'List Users',
  })
  t.is(getEndpoint.signature, 'ListUsersEndpoint')
})

test('get endpoint with parameter', t => {
  const getEndpoint = new Endpoint('/users/{id}', 'get', {})
  t.is(getEndpoint.signature, 'UsersIdEndpoint')
  t.is(getEndpoint.resolvePathParameters(context).length, 1)
})

test('get endpoint with summary and parameter', t => {
  const getEndpoint = new Endpoint('/users/{id}', 'get', {
    summary: 'Get User',
  })
  t.is(getEndpoint.signature, 'GetUserEndpoint')
})

test('get endpoint with path parameter', t => {
  const getEndpoint = new Endpoint('/users/$id', 'get', {})
  t.is(getEndpoint.signature, 'UsersIdEndpoint')
  t.is(getEndpoint.resolvePathParameters(context).length, 1)
  t.assert(getEndpoint.resolvePathParameters(context)[0] instanceof Field)
})

test('get endpoint with path parameter and parameters schema', t => {
  const getEndpoint = new Endpoint('/users/$id', 'get', { parameters: { id: 'String' } })
  t.is(getEndpoint.signature, 'UsersIdEndpoint')
  t.is(getEndpoint.resolvePathParameters(context).length, 1)
  t.assert(getEndpoint.resolvePathParameters(context)[0] instanceof Field)
})