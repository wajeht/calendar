
/**
 * Creates auth middleware factory with dependency injection
 * @param {Object} dependencies - Required dependencies
 * @param {Object} dependencies.utils - Utils object with auth methods
 * @param {Object} dependencies.logger - Logger instance
 * @returns {Object} - Auth middleware collection
 */
export function createAuthMiddleware(dependencies = {}) {
  const { utils, logger } = dependencies;

  return {
      /**
       * Authentication middleware that requires valid session token
       * @returns {Function} - Express middleware function
       */
      requireAuth() {
          return (req, res, next) => {
              const token = utils.auth.extractSessionToken(req);

              if (!utils.auth.validateSessionToken(token)) {
                  return res.status(401).json({ success: false, error: 'Access token required' });
              }

              next();
          };
      },

      /**
       * Optional authentication middleware for pages that can work with or without auth
       * @returns {Function} - Express middleware function
       */
      optionalAuth() {
          return (req, res, next) => {
              const token = utils.auth.extractSessionToken(req);
              req.authenticated = utils.auth.validateSessionToken(token);
              next();
          };
      },

  };
}
