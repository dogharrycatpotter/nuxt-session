import { createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'
import { defu } from 'defu'
import { builtinDrivers } from 'unstorage'
import type {
  FilledModuleOptions,
  ModuleOptions
} from './types'

const PACKAGE_NAME = 'nuxt-session'

const defaults: FilledModuleOptions = {
  isEnabled: true,
  session: {
    expiryInSeconds: 60 * 10,
    idLength: 64,
    storePrefix: 'sessions',
    cookieSameSite: 'lax',
    cookieSecure: true,
    cookieHttpOnly: true,
    cookieName: 'sessionId',
    resave: false,
    saveUninitialized: false,
    storageOptions: {
      driver: 'memory',
      options: {}
    },
    domain: false,
    rolling: false
  }
} as const

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: `@sidebase/${PACKAGE_NAME}`,
    configKey: 'session',
    compatibility: {
      bridge: false
    }
  },
  defaults,
  hooks: {},
  setup (moduleOptions, nuxt) {
    const logger = useLogger(PACKAGE_NAME)

    // 1. Check if module should be enabled at all
    if (!moduleOptions.isEnabled) {
      logger.info(`Skipping ${PACKAGE_NAME} setup, as module is disabled`)
      return
    }

    logger.info('Setting up sessions...')

    // 2. Set public and private runtime configuration
    const options = defu(moduleOptions, defaults)

    // @ts-ignore TODO: Fix this `nuxi prepare` bug (see https://github.com/nuxt/framework/issues/8728)
    nuxt.options.runtimeConfig.session = defu(nuxt.options.runtimeConfig.session, options) as FilledModuleOptions

    // setup unstorage
    nuxt.options.nitro.virtual = defu(nuxt.options.nitro.virtual, {
      '#session-driver': `export { default } from '${
        builtinDrivers[options.session.storageOptions.driver]
      }'`
    })

    // 3. Locate runtime directory and transpile module
    const { resolve } = createResolver(import.meta.url)

    // 4. Setup middleware, use `.unshift` to ensure (reasonably well) that the session middleware is first
    const handler = resolve('./runtime/server/middleware/session')
    const serverHandler = {
      middleware: true,
      handler
    }
    nuxt.options.serverHandlers.unshift(serverHandler)

    logger.success('Session setup complete')
  }
})

export * from './types'
