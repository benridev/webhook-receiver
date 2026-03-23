<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <nav class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-bold text-gray-900">Webhook Receiver</h1>
          </div>
          <div class="flex items-center">
            <button
              @click="handleLogout"
              class="ml-4 px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Create Endpoint Section -->
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Create New Webhook Endpoint</h2>
        <form @submit.prevent="createEndpoint" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">
              LINE Channel Secret
            </label>
            <input
              v-model="newEndpoint.secret"
              type="text"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              placeholder="Your LINE Channel Secret"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <input
              v-model="newEndpoint.description"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              placeholder="e.g., Production LINE Bot"
            />
          </div>
          <button
            type="submit"
            :disabled="creating"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ creating ? 'Creating...' : 'Create Endpoint' }}
          </button>
        </form>
      </div>

      <!-- Endpoints List -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-semibold mb-4">Your Webhook Endpoints</h2>
        
        <div v-if="loading" class="text-center py-4 text-gray-500">
          Loading...
        </div>

        <div v-else-if="endpoints.length === 0" class="text-center py-8 text-gray-500">
          No endpoints yet. Create one above!
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="endpoint in endpoints"
            :key="endpoint.id"
            class="border rounded-lg p-4 hover:bg-gray-50"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-sm font-medium text-gray-900">
                    {{ endpoint.description || 'Unnamed Endpoint' }}
                  </span>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    Active
                  </span>
                </div>
                
                <div class="bg-gray-100 p-3 rounded mb-2">
                  <code class="text-sm text-gray-800 break-all">
                    {{ getWebhookUrl(endpoint.path) }}
                  </code>
                  <button
                    @click="copyUrl(endpoint.path)"
                    class="ml-2 text-indigo-600 hover:text-indigo-800 text-xs"
                  >
                    Copy
                  </button>
                </div>

                <div class="text-xs text-gray-500">
                  Created: {{ new Date(endpoint.created_at).toLocaleString() }}
                </div>
              </div>

              <div class="flex gap-2 ml-4">
                <button
                  @click="viewLogs(endpoint)"
                  class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Logs
                </button>
                <button
                  @click="deleteEndpoint(endpoint.id)"
                  class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs Modal -->
      <div
        v-if="selectedEndpoint"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        @click.self="selectedEndpoint = null"
      >
        <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div class="p-6 border-b">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold">
                Webhook Logs: {{ selectedEndpoint.description || 'Unnamed' }}
              </h3>
              <button
                @click="selectedEndpoint = null"
                class="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>

          <div class="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
            <div v-if="loadingLogs" class="text-center py-8 text-gray-500">
              Loading logs...
            </div>

            <div v-else-if="logs.length === 0" class="text-center py-8 text-gray-500">
              No requests received yet
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="log in logs"
                :key="log.id"
                class="border rounded-lg p-4"
              >
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <span class="font-medium">{{ log.method }}</span>
                    <span class="text-sm text-gray-500 ml-2">
                      {{ new Date(log.received_at).toLocaleString() }}
                    </span>
                  </div>
                  <button
                    @click="copyCurl(log)"
                    class="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Copy cURL
                  </button>
                </div>

                <details class="mt-2">
                  <summary class="cursor-pointer text-sm text-indigo-600 hover:text-indigo-800">
                    View Details
                  </summary>
                  <pre class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">{{ JSON.stringify(log.data, null, 2) }}</pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../utils/api';

export default {
  name: 'Dashboard',
  setup() {
    const router = useRouter();
    const endpoints = ref([]);
    const loading = ref(true);
    const creating = ref(false);
    const newEndpoint = ref({ secret: '', description: '' });
    const selectedEndpoint = ref(null);
    const logs = ref([]);
    const loadingLogs = ref(false);

    const loadEndpoints = async () => {
      try {
        endpoints.value = await api.getEndpoints();
      } catch (err) {
        console.error('Failed to load endpoints:', err);
      } finally {
        loading.value = false;
      }
    };

    const createEndpoint = async () => {
      creating.value = true;
      try {
        await api.createEndpoint(newEndpoint.value.secret, newEndpoint.value.description);
        newEndpoint.value = { secret: '', description: '' };
        await loadEndpoints();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to create endpoint');
      } finally {
        creating.value = false;
      }
    };

    const deleteEndpoint = async (id) => {
      if (!confirm('Are you sure you want to delete this endpoint?')) return;
      
      try {
        await api.deleteEndpoint(id);
        await loadEndpoints();
      } catch (err) {
        alert('Failed to delete endpoint');
      }
    };

    const viewLogs = async (endpoint) => {
      selectedEndpoint.value = endpoint;
      loadingLogs.value = true;
      try {
        logs.value = await api.getLogs(endpoint.id);
      } catch (err) {
        alert('Failed to load logs');
      } finally {
        loadingLogs.value = false;
      }
    };

    const getWebhookUrl = (path) => {
      return `${window.location.origin}/api/webhook/${path}`;
    };

    const copyUrl = (path) => {
      navigator.clipboard.writeText(getWebhookUrl(path));
      alert('URL copied to clipboard!');
    };

    // ✅ Copy cURL command — paste into Postman via Import > Raw Text
    const copyCurl = (log) => {
      const curl = log.curl;
      if (!curl) {
        alert('cURL not available for this log (recorded before this feature was added)');
        return;
      }
      navigator.clipboard.writeText(curl);
      alert('cURL copied! In Postman: Import → Raw Text → paste → Continue');
    };

    const handleLogout = async () => {
      await api.logout();
      localStorage.removeItem('isAuthenticated');
      router.push('/login');
    };

    onMounted(() => {
      loadEndpoints();
    });

    return {
      endpoints,
      loading,
      creating,
      newEndpoint,
      selectedEndpoint,
      logs,
      loadingLogs,
      createEndpoint,
      deleteEndpoint,
      viewLogs,
      getWebhookUrl,
      copyUrl,
      copyCurl,
      handleLogout
    };
  }
};
</script>