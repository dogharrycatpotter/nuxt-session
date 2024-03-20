import crypto from 'crypto'
import { deleteCookie, eventHandler, H3Event, parseCookies, setCookie } from 'h3'
import { nanoid } from 'nanoid'
import dayjs from 'dayjs'
import onHeaders from 'on-headers'
import { SameSiteOptions, Session, SessionOptions } from '../../../../types'
import { dropStorageSession, getStorageSession, setStorageSession } from './storage'
import { SessionExpired } from './exceptions'
import { createError, useRuntimeConfig } from '#imports'

const safeSetCookie = (event: H3Event, name: string, value: string, createdAt: Date) => {
  const sessionOptions = useRuntimeConfig().session.session as SessionOptions
  const expirationDate = sessionOptions.expiryInSeconds !== false
    ? new Date(createdAt.getTime() + sessionOptions.expiryInSeconds * 1000)
    : undefined

  setCookie(event, name, value, {
    // Set cookie expiration date to now + expiryInSeconds
    expires: expirationDate,
    // Wether to send cookie via HTTPs to mitigate man-in-the-middle attacks
    secure: sessionOptions.cookieSecure,
    // Wether to send cookie via HTTP requests and not allowing access of cookie from JS to mitigate XSS attacks
    httpOnly: sessionOptions.cookieHttpOnly,
    // Do not send cookies on many cross-site requests to mitigates CSRF and cross-site attacks, see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite#lax
    sameSite: sessionOptions.cookieSameSite as SameSiteOptions,
    // Set cookie for subdomain
    domain: sessionOptions.domain || undefined
  })
}

const checkSessionExpirationTime = (session: Session, sessionExpiryInSeconds: number) => {
  const now = dayjs()
  if (now.diff(dayjs(session.createdAt), 'seconds') > sessionExpiryInSeconds) {
    throw new SessionExpired()
  }
}

const getCurrentSessionId = (event: H3Event) => {
  const sessionOptions = useRuntimeConfig().session.session
  const sessionIdRequest = parseCookies(event)[sessionOptions.cookieName]
  return sessionIdRequest
}

export const deleteSession = async (event: H3Event) => {
  const currentSessionId = getCurrentSessionId(event)
  if (currentSessionId) {
    await dropStorageSession(currentSessionId)
  }

  const sessionOptions = useRuntimeConfig().session.session as SessionOptions

  deleteCookie(event, sessionOptions.cookieName)

  delete event.context.sessionId
  delete event.context.session
}

const reNewSession = async (event: H3Event) => {
  const body = { ...event.context.session }
  await deleteSession(event)
  await createSession(event, body)
}

const getSession = async (event: H3Event): Promise<null | Session> => {
  // 1. Does the sessionId cookie exist on the request?
  const existingSessionId = getCurrentSessionId(event)
  if (!existingSessionId) {
    return null
  }

  // 2. Does the session exist in our storage?
  const session = await getStorageSession(existingSessionId)
  if (!isSession(session)) {
    return null
  }

  const runtimeConfig = useRuntimeConfig()
  const sessionOptions = runtimeConfig.session.session as SessionOptions
  const sessionExpiryInSeconds = sessionOptions.expiryInSeconds

  try {
    // 3. Is the session not expired?
    if (sessionExpiryInSeconds !== false) {
      checkSessionExpirationTime(session, sessionExpiryInSeconds)
    }
  } catch {
    await deleteSession(event) // Cleanup old session data to avoid leaks

    return null
  }

  return session
}

function isSession (shape: unknown): shape is Session {
  return typeof shape === 'object' && !!shape && 'id' in shape && 'createdAt' in shape
}

const hash = (session: Session) => {
  const str = JSON.stringify(session)
  return crypto.createHash('sha1').update(str, 'utf8').digest('hex')
}

const createSession = (event: H3Event, initBody?: Session) => {
  const sessionOptions = useRuntimeConfig().session.session
  const now = new Date()
  if (initBody) {
    event.context.session = { ...initBody }
  }
  event.context.sessionId = nanoid(sessionOptions.idLength)
  event.context.session.id = event.context.sessionId
  event.context.session.createdAt = now
}

export default eventHandler(async (event: H3Event) => {
  try {
    const sessionOptions = useRuntimeConfig().session.session
    const session = await getSession(event)

    let isInit = true
    if (session) {
      event.context.sessionId = session.id
      event.context.session = session
      isInit = false
    } else {
      event.context.sessionId = ''
      event.context.session = {}
    }

    let isTouch = false
    let isReNew = false
    event.context.sessionFn = {
      async destroy () {
        await deleteSession(event)
      },
      async regenerate () {
        await reNewSession(event)
        isReNew = true
      },
      touch () {
        isTouch = true
      }
    }

    const preSessionId = event.context.sessionId
    const preSessionHash = hash(event.context.session)

    const isDestory = (event: H3Event): boolean => {
      return !event.context.sessionId && !event.context.session
    }

    const isModified = (): boolean => {
      return preSessionId !== postSessionId || preSessionHash !== postSessionHash
    }

    let postSessionId
    let postSessionHash

    onHeaders(event.node.res, () => {
      if (isDestory(event)) {
        return
      }

      postSessionId = event.context.sessionId
      postSessionHash = hash(event.context.session)

      if (isInit) {
        if (isModified() || isTouch) {
          createSession(event)
          safeSetCookie(event, sessionOptions.cookieName, event.context.sessionId, event.context.session.createdAt)
        }
      } else if (sessionOptions.rolling || (sessionOptions.expiryInSeconds !== false && (isModified() || isTouch)) || (isReNew && (isModified() || isTouch))) {
        const now = new Date()
        event.context.session.createdAt = now
        safeSetCookie(event, sessionOptions.cookieName, event.context.sessionId, event.context.session.createdAt)
      }
    })

    event.node.res.on('finish', async () => {
      if (isDestory(event)) {
        return
      }

      if (isInit) {
        if (isModified() || isTouch) {
          await setStorageSession(event.context.sessionId, event.context.session)
        }
      } else if (isModified() || isTouch) {
        await setStorageSession(event.context.sessionId, event.context.session)
      }
    })
  } catch (err) {
    throw createError({ message: err.message, statusCode: err.statusCode, cause: err, fatal: true })
  }
})
