import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

export default {
  // Auth
  async login(username, password) {
    const { data } = await api.post('/login', { username, password });
    return data;
  },

  async register(username, password) {
    const { data } = await api.post('/register', { username, password });
    return data;
  },

  async logout() {
    await api.post('/logout');
  },

  // Endpoints
  async getEndpoints() {
    const { data } = await api.get('/endpoints');
    return data.endpoints;
  },

  async createEndpoint(lineChannelSecret, description) {
    const { data } = await api.post('/endpoints', {
      lineChannelSecret,
      description
    });
    return data.endpoint;
  },

  async deleteEndpoint(id) {
    await api.delete('/endpoints', { data: { id } });
  },

  // Logs
  async getLogs(endpointId) {
    const { data } = await api.get('/logs', { params: { endpointId } });
    return data.logs;
  },

  async deleteLog(id) {
    await api.delete('/logs', { params: { id } });
  },
};