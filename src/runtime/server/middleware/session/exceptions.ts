export class SessionExpired extends Error {
  constructor (message = 'Session expired') {
    super(message)
  }
}
