import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s for AI inference
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 / token refresh ────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          original.headers.Authorization = `Bearer ${access_token}`;
          return api(original);
        } catch {
          // Refresh failed — clear tokens and redirect
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:       (data)  => api.post('/auth/register', data),
  login:          (data)  => api.post('/auth/login', data),
  refresh:        (data)  => api.post('/auth/refresh', data),
  forgotPassword: (data)  => api.post('/auth/forgot-password', data),
  resetPassword:  (data)  => api.post('/auth/reset-password', data),
  getMe:          ()      => api.get('/auth/me'),
  updateMe:       (data)  => api.patch('/auth/me', data),
  changePassword: (data)  => api.post('/auth/change-password', data),
};

// ── Scans ─────────────────────────────────────────────────────────────────────
export const scansAPI = {
  upload: (formData) =>
    api.post('/scans/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  list:   (params) => api.get('/scans/', { params }),
  get:    (id)     => api.get(`/scans/${id}`),
  delete: (id)     => api.delete(`/scans/${id}`),
  updateDefect: (scanId, defectId, data) =>
    api.patch(`/scans/${scanId}/defects/${defectId}`, data),
};

// ── Analytics ──────────────────────────────────────────────────────────────
export const analyticsAPI = {
  dashboard:            ()         => api.get('/analytics/dashboard'),
  defectTypes:          ()         => api.get('/analytics/defect-types'),
  severityDistribution: ()         => api.get('/analytics/severity-distribution'),
  monthlyTrends:        (months)   => api.get('/analytics/monthly-trends', { params: { months } }),
  defectFrequency:      (days)     => api.get('/analytics/defect-frequency', { params: { days } }),
  qualityScore:         (months)   => api.get('/analytics/quality-score', { params: { months } }),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsAPI = {
  generate:  (scanId)   => api.post(`/reports/${scanId}/generate`),
  list:      (params)   => api.get('/reports/', { params }),
  get:       (id)       => api.get(`/reports/${id}`),
  download:  (id)       => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
  delete:    (id)       => api.delete(`/reports/${id}`),
};

// ── Notifications ────────────────────────────────────────────────────────────
export const notificationsAPI = {
  list:         (params) => api.get('/notifications/', { params }),
  unreadCount:  ()       => api.get('/notifications/unread-count'),
  markRead:     (ids)    => api.patch('/notifications/mark-read', { notification_ids: ids }),
  markAllRead:  ()       => api.patch('/notifications/mark-all-read'),
  delete:       (id)     => api.delete(`/notifications/${id}`),
};

export default api;
