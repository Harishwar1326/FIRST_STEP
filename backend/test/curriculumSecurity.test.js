import test from 'node:test'
import assert from 'node:assert/strict'
import learningRoutes from '../src/routes/learning.routes.js'
import programmingLearningRoutes from '../src/routes/programmingLearning.routes.js'

const findRoute = (router, method, routePath) =>
  router.stack.find((layer) => layer.route?.path === routePath && layer.route.methods[method])

test('curriculum import requires authentication and administrator permission', () => {
  const route = findRoute(learningRoutes, 'post', '/lessons/import')
  assert.ok(route, 'lesson import route exists')
  const middlewareNames = route.route.stack.map((layer) => layer.handle.name)
  assert.ok(middlewareNames.includes('protect'), 'lesson import requires a JWT')
  assert.ok(middlewareNames.includes('requireAdmin'), 'lesson import requires an administrator')
})

test('all student learning routes run after account authentication', () => {
  const authIndex = learningRoutes.stack.findIndex((layer) => layer.handle?.name === 'protect')
  assert.ok(authIndex >= 0, 'learning router installs account authentication')
  for (const [method, routePath] of [
    ['get', '/lessons'],
    ['get', '/lesson/:id'],
    ['post', '/quiz/submit'],
    ['post', '/task/submit'],
    ['post', '/learning/update'],
  ]) {
    const route = findRoute(learningRoutes, method, routePath)
    assert.ok(route, `${method.toUpperCase()} ${routePath} exists`)
    const routeIndex = learningRoutes.stack.indexOf(route)
    assert.ok(authIndex < routeIndex, `${method.toUpperCase()} ${routePath} follows authentication`)
  }
})

test('legacy quiz, task, and profile mutations validate request bodies', () => {
  for (const [method, routePath] of [
    ['post', '/quiz/submit'],
    ['post', '/task/submit'],
    ['post', '/learning/update'],
  ]) {
    const route = findRoute(learningRoutes, method, routePath)
    assert.ok(route.route.stack.some((layer) => layer.handle.name === 'validateRequest'), `${routePath} has body validation`)
  }
})

test('programming curriculum seed requires authentication and administrator permission', () => {
  const route = findRoute(programmingLearningRoutes, 'post', '/seed')
  assert.ok(route, 'programming seed route exists')
  const routeMiddleware = route.route.stack.map((layer) => layer.handle.name)
  assert.ok(routeMiddleware.includes('requireAdmin'), 'seed route requires an administrator')

  const routeIndex = programmingLearningRoutes.stack.indexOf(route)
  const authIndex = programmingLearningRoutes.stack.findIndex((layer) => layer.handle.name === 'protect')
  assert.ok(authIndex >= 0 && authIndex < routeIndex, 'authentication runs before the seed route')
})

test('programming lesson note writes validate request bodies after authentication', () => {
  const route = findRoute(programmingLearningRoutes, 'post', '/lesson/:id/notes')
  assert.ok(route)
  assert.ok(route.route.stack.some((layer) => layer.handle.name === 'validateRequest'))
  const routeIndex = programmingLearningRoutes.stack.indexOf(route)
  const authIndex = programmingLearningRoutes.stack.findIndex((layer) => layer.handle.name === 'protect')
  assert.ok(authIndex >= 0 && authIndex < routeIndex)
})
