const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1';

export type AuthValidationErrorBody = {
  error?: string;
  message?: string;
  details?: Record<string, string>;
};

export type ApiUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'admin' | 'super_admin';
  status: 'pending' | 'active' | 'suspended';
  email_is_verified: boolean;
  avatar_url?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  last_login_at?: string | null;
  job_title?: string | null;
  department?: string | null;
  onboarding_completed: boolean;
};

export type ApiTicket = {
  id: string;
  title: string;
  description: string;
  type: 'hardware' | 'software' | 'bug';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'on_hold' | 'pending_routing';
  created_at: string;
  replication_steps?: string | null;
  metadata?: Record<string, unknown>;
  category_id: string;
  category_name: string;
  submitted_by_id: string;
  submitted_by_email: string;
  submitted_by_avatar_url?: string | null;
  assigned_to_id?: string | null;
  assigned_to_avatar_url?: string | null;
  assigned_to_name?: string | null;
};

export type ApiCategory = {
  id: string;
  name: string;
  description?: string | null;
  created_by: string;
  is_active: boolean;
};

export type AdminWorkload = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  p1_count: number;
  p2_count: number;
  p3_count: number;
  p4_count: number;
  total_open: number;
  load_score: number;
};

export type ApiComment = {
  id: string;
  ticket_id: string;
  body: string;
  created_at: string;
  author_id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
  role: ApiUser['role'];
};

export type ApiNotification = {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  first_name: string;
  last_name: string;
  actor_email: string;
};

export type ApiActivityEvent = {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_id: string;
  first_name: string;
  last_name: string;
  actor_email: string;
  actor_role: string;
  avatar_url?: string | null;
};

export type ApiRating = {
  rating: number;
  comment?: string | null;
  ticket_id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
};

export type ApiAiDecision = {
  id: string;
  title: string;
  priority: ApiTicket['priority'];
  type: ApiTicket['type'];
  created_at: string;
  routing: {
    source: string;
    assigned_admin_id?: string;
    reasoning?: string;
  } | null;
  assigned_to_name?: string | null;
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
}

function apiPath(endpoint: string): string {
  const e = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_PREFIX}${e}`;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

const isAuthPublicPath = (): boolean => {
  const path = window.location.pathname;
  const publicPrefixes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];
  return publicPrefixes.some((p) => path === p || path.startsWith(`${p}/`));
};

export async function apiRequest(
  endpoint: string,
  options: RequestOptions = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${apiPath(endpoint)}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && !isAuthPublicPath()) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }

  return response;
}

export async function apiUpload(endpoint: string, formData: FormData): Promise<Response> {
  const url = `${API_BASE_URL}${apiPath(endpoint)}`;
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { method: 'POST', headers, body: formData });
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest('/auth/login', { method: 'POST', body: { email, password } }),

  signup: (data: { email: string; firstName: string; lastName: string; password: string; role?: string }) =>
    apiRequest('/auth/signup', { method: 'POST', body: data }),

  google: (data: { credential?: string; accessToken?: string }) =>
    apiRequest('/auth/google', { method: 'POST', body: data }),

  forgotPassword: (email: string) =>
    apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (token: string, password: string) =>
    apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } }),

  verifyEmail: (token: string) =>
    apiRequest('/auth/verify-email', { method: 'POST', body: { token } }),

  verifyEmailOtp: (email: string, otp: string) =>
    apiRequest('/auth/verify-email-otp', { method: 'POST', body: { email, otp } }),

  resendVerification: (email: string) =>
    apiRequest('/auth/resend-verification', { method: 'POST', body: { email } }),

  refreshToken: () =>
    apiRequest('/auth/refresh', { method: 'POST', body: { refreshToken: localStorage.getItem('refreshToken') } }),
};

export const usersApi = {
  me: () => apiRequest('/users/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/users/me/password', { method: 'PATCH' as RequestOptions['method'], body: { currentPassword, newPassword } }),

  saveOnboarding: (jobTitle: string, department: string) =>
    apiRequest('/users/me/onboarding', { method: 'PATCH' as RequestOptions['method'], body: { jobTitle, department } }),

  list: (params?: { role?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    const suffix = query.toString() ? `?${query}` : '';
    return apiRequest(`/users${suffix}`);
  },

  updateApproval: (id: string, status: 'active' | 'pending' | 'suspended') =>
    apiRequest(`/users/${id}/approval`, { method: 'PATCH' as RequestOptions['method'], body: { status } }),

  updateRole: (id: string, role: 'user' | 'admin' | 'super_admin') =>
    apiRequest(`/users/${id}/role`, { method: 'PATCH' as RequestOptions['method'], body: { role } }),

  delete: (id: string) =>
    apiRequest(`/users/${id}`, { method: 'DELETE' as RequestOptions['method'] }),

  uploadAvatar: (formData: FormData) =>
    apiUpload('/users/me/avatar', formData),

  updateName: (firstName: string, lastName: string) =>
    apiRequest('/users/me', { method: 'PATCH', body: { firstName, lastName } }),
};

export const categoriesApi = {
  list: () => apiRequest('/categories'),
};

export const ticketsApi = {
  list: (params?: { scope?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.scope) query.set('scope', params.scope);
    if (params?.status) query.set('status', params.status);
    const suffix = query.toString() ? `?${query}` : '';
    return apiRequest(`/tickets${suffix}`);
  },

  get: (ticketId: string) => apiRequest(`/tickets/${ticketId}`),

  create: (body: {
    title: string;
    description: string;
    categoryId: string;
    type: 'hardware' | 'software' | 'bug';
    priority: 'P1' | 'P2' | 'P3' | 'P4';
    replicationSteps?: string;
  }) => apiRequest('/tickets', { method: 'POST', body }),

  updateStatus: (ticketId: string, status: ApiTicket['status']) =>
    apiRequest(`/tickets/${ticketId}/status`, { method: 'PATCH' as RequestOptions['method'], body: { status } }),

  assign: (ticketId: string, assignedTo: string) =>
    apiRequest(`/tickets/${ticketId}/assign`, { method: 'POST', body: { assignedTo } }),

  reroute: (ticketId: string) =>
    apiRequest(`/tickets/${ticketId}/route`, { method: 'POST' }),

  rate: (ticketId: string, rating: number, comment?: string) =>
    apiRequest(`/tickets/${ticketId}/rating`, { method: 'POST', body: { rating, comment } }),

  workload: () => apiRequest('/tickets/admin/workload'),

  getComments: (ticketId: string) => apiRequest(`/tickets/${ticketId}/comments`),

  addComment: (ticketId: string, body: string) =>
    apiRequest(`/tickets/${ticketId}/comments`, { method: 'POST', body: { body } }),

  getActivity: (ticketId: string) => apiRequest(`/tickets/${ticketId}/activity`),

  askAI: (ticketId: string, question: string) =>
    apiRequest(`/tickets/${ticketId}/ask`, { method: 'POST', body: { question } }),
};

export type ApiChatConversation = {
  id: string;
  status: string;
  created_at: string;
  last_message_at: string;
  // admin list view extras
  user_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string | null;
  last_body?: string | null;
  last_image?: string | null;
  unread_count?: number;
};

export type ApiChatMessage = {
  id: string;
  body: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
  sender_id: string;
  first_name: string;
  last_name: string;
  role: ApiUser['role'];
  avatar_url?: string | null;
};

export const chatApi = {
  getConversations: () => apiRequest('/chat/conversations'),
  getMessages: (convId: string) => apiRequest(`/chat/conversations/${convId}/messages`),
  sendMessage: (convId: string, body: string) =>
    apiRequest(`/chat/conversations/${convId}/messages`, { method: 'POST', body: { body } }),
  sendImage: (convId: string, formData: FormData) => {
    const url = `${API_BASE_URL}${API_PREFIX}/chat/conversations/${convId}/messages/image`;
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, { method: 'POST', headers, body: formData });
  },
  getUnread: () => apiRequest('/chat/unread'),
};

export const notificationsApi = {
  list: () => apiRequest('/notifications'),
  aiDecisions: () => apiRequest('/notifications/ai-decisions'),
};

export default apiRequest;
