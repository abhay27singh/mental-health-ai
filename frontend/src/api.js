// Thin wrapper around fetch that attaches the auth token and unwraps errors.

const TOKEN_KEY = "mh_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let payload = body;
  if (body && !isForm) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (username, password) =>
    request("/api/register", { method: "POST", body: { username, password } }),

  login: (username, password) =>
    request("/api/login", { method: "POST", body: { username, password } }),

  logout: () => request("/api/logout", { method: "POST" }),

  predict: (answers) =>
    request("/api/predict", { method: "POST", body: { answers } }),

  addMood: (text) =>
    request("/api/mood", { method: "POST", body: { text } }),

  moodHistory: () => request("/api/mood/history"),

  modelMetrics: () => request("/api/models/metrics"),

  chat: (message, history) =>
    request("/api/chat", { method: "POST", body: { message, history } }),

  getProfile: () => request("/api/profile"),
  updateProfile: (data) => request("/api/profile", { method: "PUT", body: data }),
  changePassword: (current_password, new_password) =>
    request("/api/profile/password", {
      method: "POST",
      body: { current_password, new_password },
    }),

  detectEmotion: (blob) => {
    const form = new FormData();
    form.append("image", blob, "capture.jpg");
    return request("/api/emotion", { method: "POST", body: form, isForm: true });
  },

  adminUsers: () => request("/api/admin/users"),
  adminUserDetail: (username) =>
    request(`/api/admin/user/${encodeURIComponent(username)}`),
  adminUpdatePassword: (username, password) =>
    request(`/api/admin/user/${encodeURIComponent(username)}/password`, {
      method: "POST",
      body: { password },
    }),
  adminDeleteUser: (username) =>
    request(`/api/admin/user/${encodeURIComponent(username)}`, {
      method: "DELETE",
    }),
};
