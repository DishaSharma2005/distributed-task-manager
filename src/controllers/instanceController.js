const os = require('os');

// GET /api/instance
// Returns which server instance handled this request.
// INSTANCE_ID is set per EC2 instance via environment variable — never hardcoded.
const getInstanceInfo = (req, res) => {
  res.status(200).json({
    instance: process.env.INSTANCE_ID || 'LOCAL',
    hostname: os.hostname()
  });
};

module.exports = { getInstanceInfo };
