import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
})

function authHeader(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

export async function registerUser(payload) {
  const { data } = await api.post('/register', payload)
  return data
}

export async function loginUser(payload) {
  const { data } = await api.post('/login', payload)
  return data
}

export async function fetchProfile(token) {
  const { data } = await api.get('/me', authHeader(token))
  return data
}

export async function changePassword(token, payload) {
  const { data } = await api.post('/change-password', payload, authHeader(token))
  return data
}

export async function fetchFiles(token) {
  const { data } = await api.get('/files', authHeader(token))
  return data
}

export async function uploadFile(token, file, onProgress) {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await api.post('/upload', formData, {
    ...authHeader(token),
    headers: {
      ...authHeader(token).headers,
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress(progressEvent) {
      if (!progressEvent.total || !onProgress) return
      onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
    },
  })

  return data
}

export async function downloadFile(token, fileId) {
  const { data } = await api.get(`/files/download/${fileId}`, {
    ...authHeader(token),
    responseType: 'blob',
  })
  return data
}

export async function deleteFile(token, fileId) {
  const { data } = await api.delete(`/files/delete/${fileId}`, authHeader(token))
  return data
}

export async function fetchActivity(token) {
  const { data } = await api.get('/activity', authHeader(token))
  return data
}

export async function fetchUsers(token) {
  const { data } = await api.get('/users', authHeader(token))
  return data
}

export async function fetchDashboardSummary(token) {
  const { data } = await api.get('/admin/stats', authHeader(token))
  return data
}
