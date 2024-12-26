import type { BuiltinDriverName } from 'unstorage'
import type { FSStorageOptions } from 'unstorage/dist/drivers/fs'
import type { KVOptions } from 'unstorage/dist/drivers/cloudflare-kv-binding'
import type { KVHTTPOptions } from 'unstorage/dist/drivers/cloudflare-kv-http'
import type { GithubOptions } from 'unstorage/dist/drivers/github'
import type { HTTPOptions } from 'unstorage/dist/drivers/http'
import type { OverlayStorageOptions } from 'unstorage/dist/drivers/overlay'
import type { LocalStorageOptions } from 'unstorage/dist/drivers/localstorage'
import type { RedisOptions } from 'unstorage/dist/drivers/redis'

export type SameSiteOptions = 'lax' | 'strict' | 'none'

export type UnstorageDriverOption = FSStorageOptions | KVOptions | KVHTTPOptions | GithubOptions | HTTPOptions | OverlayStorageOptions | LocalStorageOptions | RedisOptions

export interface StorageOptions {
  driver: BuiltinDriverName,
  options?: UnstorageDriverOption
}

export interface SessionOptions {
  /**
   * Set the session duration in seconds. Once the session expires, a new one with a new id will be created. Set to `false` for infinite sessions
   * @default 600
   * @example 30
   * @type number | false
   */
  expiryInSeconds: number | false
  /**
   * How many characters the random session id should be long
   * @default 64
   * @example 128
   * @type number
   */
  idLength: number
  /**
   * What prefix to use to store session information via `unstorage`
   * @default 64
   * @example 128
   * @type number
   * @docs https://github.com/unjs/unstorage
   */
  storePrefix: string
  /**
   * When to attach session cookie to requests
   * @default 'lax'
   * @example 'strict'
   * @type SameSiteOptions
   * @docs https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
   */
  cookieSameSite: SameSiteOptions
  /**
   * Wether to set the `Secure` attribute for the session cookie
   * @default true
   * @example false
   * @type boolean
   * @docs https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies
   */
  cookieSecure: boolean
  /**
   * Wether to set the `HttpOnly` attribute for the session cookie. When `HttpOnly` is set the session cookie will not be accessible from JavaScript, this can mitigate XSS attacks
   * @default true
   * @example false
   * @type boolean
   * @docs https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies
   */
  cookieHttpOnly: boolean
  /**
   * The name of the session ID cookie to set in the response (and read from in the request). The default value is 'sessionId'
   * @default 'sessionId'
   * @example 'sessionId'
   * @type string
   * @docs https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies
   */
  cookieName: string
  /**
   * Wether to forces the session to be saved back to the session store. Currently only supports false
   * @default false
   * @example false
   * @type
   */
  resave: boolean
  /**
   * Wether to forces a session that is "uninitialized" to be saved to the store. Currently only supports false
   * @default false
   * @example false
   * @type boolean
   */
  saveUninitialized: boolean
  /**
   * Whether to perform the save process asynchronously. The default value is false
   * @default false
   * @example false
   * @type boolean
   */
  saveAsync: boolean
  /**
   * Driver configuration for session-storage. Per default in-memory storage is used
   * @default { driver: 'memory', options: {} }
   * @example { driver: 'redis', options: {url: 'redis://localhost:6739' } }
   * @docs https://github.com/unjs/unstorage
   */
  storageOptions: StorageOptions,
  /**
   * Set the domain the session cookie will be receivable by. Setting `domain: false` results in setting the domain the cookie is initially set on. Specifying a domain will allow the domain and all its sub-domains.
   * @default false
   * @example '.example.com'
   * @type string | false
   * @docs https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#define_where_cookies_are_sent
   */
  domain: string | false,
  /**
   * Force the session identifier cookie to be set on every response. The expiration is reset to the original expiryInSeconds, resetting the expiration countdown.
   * @default false
   * @example true
   * @type boolean
   */
  rolling: boolean
}

export interface ModuleOptions {
  /**
   * Whether to enable the module
   * @default true
   * @example true
   * @type boolean
   */
  isEnabled: boolean,
  /**
   * Configure session-behavior
   * @type SessionOptions
   */
  session: Partial<SessionOptions>
}

export interface FilledModuleOptions {
  /**
   * Whether the module is enabled
   * @type boolean
   */
  isEnabled: boolean,

  /**
   * Session configuration
   * @type SessionOptions
   */
  session: SessionOptions,
}

export interface ModuleRuntimeConfig {
  session: FilledModuleOptions;
}

export interface ModulePublicRuntimeConfig {
  session: {
    api: ModuleRuntimeConfig['session'];
  };
}

export declare interface Session {
  id: string;
  createdAt: Date;

  [key: string]: any;
}
