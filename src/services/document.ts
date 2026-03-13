// src/api/document.ts
import api from './api'

export const documentApi = {
  getAll: (employeeId: number) => api.get(`/employees/${employeeId}/documents`),
  upload: (employeeId: number, formData: FormData) =>
    api.post(`/employees/${employeeId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (employeeId: number, docId: number, data: any) =>
    api.put(`/employees/${employeeId}/documents/${docId}`, data),
  delete: (employeeId: number, docId: number) =>
    api.delete(`/employees/${employeeId}/documents/${docId}`),
  download: (employeeId: number, docId: number) =>
    api.get(`/employees/${employeeId}/documents/${docId}/download`, {
      responseType: 'blob',
    }),
}
