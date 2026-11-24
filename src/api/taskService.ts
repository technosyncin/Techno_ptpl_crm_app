import { apiClient } from './client';

export type TaskItem = Task;

export interface Task {
  taskID: number;
  taskName?: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  priority?: 'High' | 'Medium' | 'Low';
  taskStatus?: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  assignedTo?: string | number;
  assignedToName?: string;
  category?: string;
  companyId?: number;
  companyID?: number;
  leadID?: number;
  leadName?: string;
  leadNumber?: string;
  purposeName?: string;
  remark?: string;
  createdDate?: string;
}

export interface Note {
  noteID: number;
  title: string;
  content: string;
  leadID?: number;
  customerName?: string;
  companyID?: number;
  createdDate: string;
  updatedDate?: string;
  createdBy?: number;
}

export interface Visit {
  visitID: number;
  clientName: string;
  companyName?: string;
  companyID?: number;
  location: string;
  visitDate: string;
  purpose: string;
  outcomeRemarks?: string;
  status: string;
}

export const taskService = {
  // GET ALL TASKS (matches Desktop taskService.getAllTasks)
  getTasks: async (params?: {
    companyId?: number;
    assignedTo?: string | number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Task[]> => {
    try {
      const response = await apiClient.get('/Task', { params });
      if (response && response.data) {
        const raw = Array.isArray(response.data)
          ? response.data
          : response.data.data || response.data.tasks;
        if (Array.isArray(raw)) {
          return raw.map((t: any) => ({
            taskID: t.taskID || t.TaskID || t.id,
            title: t.purposeName || t.PurposeName || t.taskName || t.TaskName || t.title || t.Title || (t.leadName ? `Task for ${t.leadName}` : 'Task'),
            taskName: t.taskName || t.TaskName || t.purposeName || t.PurposeName || t.title || t.Title,
            purposeName: t.purposeName || t.PurposeName || t.taskName || t.TaskName || t.title || t.Title,
            description: t.remark || t.Remark || t.description || t.Description || '',
            remark: t.remark || t.Remark || t.description || t.Description || '',
            dueDate: t.dueDate || t.DueDate || t.targetDate || new Date().toISOString().split('T')[0],
            dueTime: t.dueTime || t.DueTime || '10:00',
            priority: t.priority || t.Priority || 'Medium',
            taskStatus: t.taskStatus ?? t.TaskStatus ?? 0,
            status: (t.taskStatus === 1 || t.TaskStatus === 1 || t.isCompleted || t.status === 'Completed' || t.status === '1') ? 'Completed' : 'Pending',
            assignedTo: t.assignedTo || t.AssignedTo,
            assignedToName: t.assignedToName || t.AssignedToName,
            leadID: t.leadID || t.LeadID,
            leadName: t.leadName || t.LeadName,
            leadNumber: t.leadNumber || t.LeadNumber,
            companyID: t.companyID || t.CompanyID,
            createdDate: t.createdDate || t.CreatedDate || t.createdAt,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
    return [];
  },

  // GET TASK BY ID
  getTaskById: async (taskId: number): Promise<Task | null> => {
    try {
      const response = await apiClient.get(`/Task/${taskId}`);
      const t = response.data?.data || response.data;
      if (t) {
        return {
          taskID: t.taskID || t.TaskID || t.id,
          title: t.purposeName || t.PurposeName || t.title || t.Title || 'Task',
          purposeName: t.purposeName || t.PurposeName || t.title,
          description: t.remark || t.Remark || '',
          remark: t.remark || t.Remark || '',
          dueDate: t.dueDate ? t.dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
          dueTime: t.dueTime || '10:00',
          priority: t.priority || 'Medium',
          taskStatus: t.taskStatus ?? t.TaskStatus ?? 0,
          status: (t.taskStatus === 1 || t.TaskStatus === 1 || t.status === 'Completed') ? 'Completed' : 'Pending',
          assignedTo: t.assignedTo || t.AssignedTo,
          leadName: t.leadName || t.LeadName,
          leadNumber: t.leadNumber || t.LeadNumber,
          companyID: t.companyID || t.CompanyID,
        };
      }
    } catch (err) {
      console.error('Error fetching task by ID:', err);
    }
    return null;
  },

  // CREATE TASK (matches Desktop taskService.createTask)
  createTask: async (taskData: any): Promise<any> => {
    try {
      const response = await apiClient.post('/Task', taskData);
      return response.data;
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  },

  // UPDATE TASK (matches Desktop taskService.updateTask)
  updateTask: async (taskId: number, taskData: any): Promise<any> => {
    try {
      const response = await apiClient.put(`/Task/${taskId}`, taskData);
      return response.data;
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  },

  // UPDATE TASK STATUS (matches Desktop taskService.updateTaskStatus)
  updateTaskStatus: async (taskId: number, status: number | string): Promise<boolean> => {
    try {
      const statusCode = typeof status === 'number' ? status : (status === 'Completed' || status === '1' ? 1 : 0);
      const response = await apiClient.patch(`/Task/${taskId}/status`, {
        TaskStatus: statusCode,
      });
      return response.status === 200 || response.status === 204;
    } catch (err) {
      console.error('Error updating task status:', err);
      return false;
    }
  },

  // DELETE TASK (matches Desktop taskService.deleteTask)
  deleteTask: async (taskId: number): Promise<boolean> => {
    try {
      const response = await apiClient.delete(`/Task/${taskId}`);
      return response.status === 200 || response.status === 204;
    } catch (err) {
      console.error('Error deleting task:', err);
      return false;
    }
  },

  // GET ALL NOTES (matches Desktop notesService.getAll)
  getNotes: async (companyId?: number): Promise<Note[]> => {
    try {
      const params = companyId ? { companyId } : {};
      const response = await apiClient.get('/Notes', { params });
      if (response && response.data) {
        const raw = Array.isArray(response.data) ? response.data : response.data.data;
        if (Array.isArray(raw)) {
          return raw.map((n: any) => ({
            noteID: n.noteID || n.NoteID || n.id,
            title: n.title || n.Title || 'Note',
            content: n.content || n.Content || n.noteText || '',
            leadID: n.leadID || n.LeadID,
            customerName: n.customerName || n.leadName,
            companyID: n.companyID || n.CompanyID,
            createdDate: n.createdDate || n.CreatedDate || new Date().toISOString(),
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
    return [];
  },

  // CREATE NOTE (matches Desktop notesService.create)
  createNote: async (noteData: any): Promise<any> => {
    try {
      const response = await apiClient.post('/Notes', noteData);
      return response.data;
    } catch (err) {
      console.error('Error creating note:', err);
      throw err;
    }
  },

  // DELETE NOTE (matches Desktop notesService.delete)
  deleteNote: async (noteId: number): Promise<boolean> => {
    try {
      const response = await apiClient.delete(`/Notes/${noteId}`);
      return response.status === 200 || response.status === 204;
    } catch (err) {
      console.error('Error deleting note:', err);
      return false;
    }
  },

  // GET VISITS (matches Desktop visitService.getVisits)
  getVisits: async (companyId?: number): Promise<Visit[]> => {
    try {
      const params = companyId ? { companyId } : {};
      const response = await apiClient.get('/Visit', { params });
      if (response && response.data) {
        const raw = Array.isArray(response.data) ? response.data : response.data.data;
        if (Array.isArray(raw)) {
          return raw.map((v: any) => ({
            visitID: v.visitID || v.VisitID || v.id,
            clientName: v.clientName || v.ClientName || v.leadName || 'Client',
            companyName: v.companyName || v.CompanyName,
            companyID: v.companyID || v.CompanyID,
            location: v.location || v.Location || 'Site',
            visitDate: v.visitDate || v.VisitDate || new Date().toISOString().split('T')[0],
            purpose: v.purpose || v.Purpose || 'Meeting',
            outcomeRemarks: v.outcomeRemarks || v.OutcomeRemarks || v.remarks,
            status: v.status || v.Status || 'Completed',
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching visits:', err);
    }
    return [];
  },

  // CREATE VISIT (matches Desktop visitService.createVisit)
  recordVisit: async (visitData: any): Promise<any> => {
    try {
      const response = await apiClient.post('/Visit', visitData);
      return response.data;
    } catch (err) {
      console.error('Error creating visit:', err);
      throw err;
    }
  },

  // DELETE VISIT (matches Desktop visitService.deleteVisit)
  deleteVisit: async (visitId: number): Promise<boolean> => {
    try {
      const response = await apiClient.delete(`/Visit/${visitId}`);
      return response.status === 200 || response.status === 204;
    } catch (err) {
      console.error('Error deleting visit:', err);
      return false;
    }
  },
};
