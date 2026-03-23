import { db } from './_utils/db.js';
import { authenticate } from './_utils/middleware.js';
import { buildCurlCommand } from './webhook/[...path].js';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpointId } = req.query;

  if (!endpointId) {
    return res.status(400).json({ error: 'Endpoint ID required' });
  }

  try {
    // Verify endpoint belongs to user
    const endpoints = await db.getEndpointsByUserId(req.user.id);
    const endpoint = endpoints.find(e => e.id === parseInt(endpointId));

    if (!endpoint) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get logs (with payload)
    const logs = await db.getWebhookLogs(endpointId, 50);

    // Return logs with payload as 'data' + postman collection for each log
    const logsWithData = logs.map(log => ({
      id: log.id,
      method: log.method,
      received_at: log.received_at,
      data: log.payload || null,
      curl: buildCurlCommand({
        id: log.id,
        received_at: log.received_at,
        data: log.payload || null,
      }),
    }));

    return res.status(200).json({ logs: logsWithData });
  } catch (error) {
    console.error('Get logs error:', error);
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

export default authenticate(handler);