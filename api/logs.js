import { db } from './_utils/db.js';
import { authenticate } from './_utils/middleware.js';
import { buildCurlCommand } from './webhook/[...path].js';

const handler = async (req, res) => {
  const { endpointId, id } = req.query;

  // ── DELETE /api/logs?id=X  →  delete a single log ──
  if (req.method === 'DELETE') {
    if (!id) {
      return res.status(400).json({ error: 'Log ID required' });
    }

    try {
      const endpoints = await db.getEndpointsByUserId(req.user.id);
      const endpointIds = endpoints.map(e => e.id);

      const deleted = await db.deleteWebhookLog(parseInt(id), endpointIds);

      if (!deleted) {
        return res.status(404).json({ error: 'Log not found or access denied' });
      }

      return res.status(200).json({ message: 'Log deleted' });
    } catch (error) {
      console.error('Delete log error:', error);
      return res.status(500).json({ error: 'Failed to delete log' });
    }
  }

  // ── GET /api/logs?endpointId=X  →  list logs ──
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Return logs with payload as 'data' + curl command for each log
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