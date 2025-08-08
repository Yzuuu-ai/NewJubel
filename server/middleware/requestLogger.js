// Enhanced request logger to track GET requests to escrow endpoints
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const referer = req.get('Referer') || 'Direct';
  const origin = req.get('Origin') || 'Unknown';
  // Log all requests to escrow endpoints
  if (url.includes('/escrow')) {
    // Special attention to GET requests to /create
    if (method === 'GET' && url.includes('/create')) {
      // Check if it's from a browser
      if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
        // Check if it's likely from frontend
        if (referer.includes('localhost:3001') || origin.includes('localhost:3001')) {
        } else {
        }
      } else {
      }
    }
  }
  next();
};
module.exports = requestLogger;
