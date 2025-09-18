export function createAuthMiddleware(dependencies = {}) {
  const { utils, logger, config } = dependencies;

  if (!utils) throw new Error('Utils required for auth middleware');
  if (!logger) throw new Error('Logger required for auth middleware');
  if (!config) throw new Error('Config required for auth middleware');

  return {
      requireAuth() {
          return (req, res, next) => {
              const token = req.cookies?.session_token || null;

              if (!token) {
                  return res.status(401).json({ success: false, error: 'Access token required' });
              }

              try {
                  const [timestamp] = token.split('.');
                  const tokenTime = parseInt(timestamp);
                  const now = Date.now();
                  const twentyFourHours = 24 * 60 * 60 * 1000;

                  if ((now - tokenTime) >= twentyFourHours) {
                      return res.status(401).json({ success: false, error: 'Access token required' });
                  }
              } catch (error) {
                  return res.status(401).json({ success: false, error: 'Access token required' });
              }

              next();
          };
      },
  };
}
