import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const db = {
  // User functions
  async createUser(username, password) {
    const hash = await bcrypt.hash(password, 10);
    const result = await sql`
      INSERT INTO users (username, password_hash)
      VALUES (${username}, ${hash})
      RETURNING id, username, created_at
    `;
    return result.rows[0];
  },

  async findUserByUsername(username) {
    const result = await sql`
      SELECT * FROM users WHERE username = ${username}
    `;
    return result.rows[0];
  },

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  // Webhook endpoint functions
  async createEndpoint(userId, path, lineChannelSecret, description = '') {
    const result = await sql`
      INSERT INTO webhook_endpoints (user_id, path, line_channel_secret, description)
      VALUES (${userId}, ${path}, ${lineChannelSecret}, ${description})
      RETURNING *
    `;
    return result.rows[0];
  },

  async getEndpointsByUserId(userId) {
    const result = await sql`
      SELECT * FROM webhook_endpoints
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return result.rows;
  },

  async getEndpointByPath(path) {
    const result = await sql`
      SELECT * FROM webhook_endpoints
      WHERE path = ${path} AND is_active = true
    `;
    return result.rows[0];
  },

  async deleteEndpoint(id, userId) {
    await sql`
      DELETE FROM webhook_endpoints
      WHERE id = ${id} AND user_id = ${userId}
    `;
  },

  // Webhook log functions (Postgres only, with payload)
  async saveWebhookLog(endpointId, method, payload) {
    const result = await sql`
      INSERT INTO webhook_logs (endpoint_id, method, payload)
      VALUES (${endpointId}, ${method}, ${payload})
      RETURNING *
    `;
    return result.rows[0];
  },

  async getWebhookLogs(endpointId, limit = 50) {
    const result = await sql`
      SELECT id, method, received_at, payload
      FROM webhook_logs
      WHERE endpoint_id = ${endpointId}
      ORDER BY received_at DESC
      LIMIT ${limit}
    `;
    return result.rows;
  },

  // Delete a single log — verifies it belongs to one of the user's endpoints
  async deleteWebhookLog(logId, userEndpointIds) {
    const result = await sql`
      DELETE FROM webhook_logs
      WHERE id = ${logId}
        AND endpoint_id = ANY(${userEndpointIds})
      RETURNING id
    `;
    return result.rows[0] || null;
  },
};


// Redis/KV cache removed. All log storage is now in Postgres.

export const auth = {
  generateToken(user) {
    return jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  },

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
};