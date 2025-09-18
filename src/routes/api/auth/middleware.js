export function createAuthMiddleware(dependencies = {}) {
  const { utils, logger } = dependencies;

  if (!utils) throw new Error('Utils required for auth middleware');
  if (!logger) throw new Error('Logger required for auth middleware');

  return {
      requireAuth() {
          return (req, res, next) => {
              const token = utils.auth.extractSessionToken(req);

              if (!utils.auth.validateSessionToken(token)) {
                  return res.status(401).json({ success: false, error: 'Access token required' });
              }

              next();
          };
      },
  };
}
