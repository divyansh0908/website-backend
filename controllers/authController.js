const passport = require('passport')
const config = require('config')
const logger = require('../utils/logger')
const users = require('../models/users')
const authService = require('../services/authService')


const tempRedirectPage = '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=https://realdevsquad.com/goto" /><title>Auth</title></head><body>Click <a href="https://realdevsquad.com">here</a> to go to the home page.</body></html>';

/**
 * Fetches the user info from GitHub and authenticates User
 *
 * @param req {Object} - Express request object
 * @param res {Object} - Express response object
 * @param next {Function} - Express middleware function
 */
const githubAuth = (req, res, next) => {
  let userData

  try {
    passport.authenticate('github', { session: false }, async (err, accessToken, user) => {
      if (err) {
        logger.error(err)
        return res.boom.unauthorized('User cannot be authenticated')
      }

      userData = {
        github_id: user.username,
        github_display_name: user.displayName,
        tokens: {
          githubAccessToken: accessToken
        }
      }

      const { isNewUser, userId } = await users.addOrUpdate(userData)

      const token = await authService.generateAuthToken({ userId })

      // respond with a cookie
      res.cookie(config.get('userToken.cookieName'), token, {
        domain: 'realdevsquad.com',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: true
      })
      res.set('Content-Type', 'text/html')
      return res.send(tempRedirectPage)
    })(req, res, next)
  } catch (err) {
    logger.error(err)
    return res.boom.unauthorized('User cannot be authenticated')
  }
}

module.exports = {
  githubAuth
}
