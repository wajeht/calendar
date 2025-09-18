export function createAuthMiddleware(dependencies = {}) {
  const { utils, logger } = dependencies;

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
