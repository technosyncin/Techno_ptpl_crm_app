import { apiClient } from './client';

export interface Note {
  noteID: number;
  noteTitle: string;
  priority?: 'High' | 'Medium' | 'Low' | string;
  specification?: string;
  companyID?: number;
  createdBy?: number;
  createdDate?: string;
  updatedBy?: number;
  updatedDate?: string;
}

export const notesService = {
  // GET ALL NOTES
  getNotes: async (params?: {
    companyId?: number;
    search?: string;
    priority?: string;
  }): Promise<Note[]> => {
    try {
      const response = await apiClient.get('/Notes', { params });
      if (response && response.data) {
        const raw = Array.isArray(response.data) ? response.data : response.data.data;
        if (Array.isArray(raw)) {
          return raw.map((n: any) => ({
            noteID: n.noteID || n.NoteID || n.id,
            noteTitle: n.noteTitle || n.NoteTitle || n.title || 'Untitled Note',
            priority: n.priority || n.Priority || 'Medium',
            specification: n.specification || n.Specification || n.content || '',
            companyID: n.companyID || n.CompanyID,
            createdBy: n.createdBy || n.CreatedBy,
            createdDate: n.createdDate || n.CreatedDate || new Date().toISOString(),
            updatedBy: n.updatedBy || n.UpdatedBy,
            updatedDate: n.updatedDate || n.UpdatedDate,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
    return [];
  },

  // GET NOTE BY ID
  getNoteById: async (noteId: number): Promise<Note | null> => {
    try {
      const response = await apiClient.get(`/Notes/${noteId}`);
      const n = response.data?.data || response.data;
      if (n) {
        return {
          noteID: n.noteID || n.NoteID || n.id,
          noteTitle: n.noteTitle || n.NoteTitle || n.title || 'Untitled Note',
          priority: n.priority || n.Priority || 'Medium',
          specification: n.specification || n.Specification || n.content || '',
          companyID: n.companyID || n.CompanyID,
          createdBy: n.createdBy || n.CreatedBy,
          createdDate: n.createdDate || n.CreatedDate,
          updatedBy: n.updatedBy || n.UpdatedBy,
          updatedDate: n.updatedDate || n.UpdatedDate,
        };
      }
    } catch (err) {
      console.error('Error fetching note by ID:', err);
    }
    return null;
  },

  // CREATE NOTE
  createNote: async (noteData: Partial<Note>): Promise<Note> => {
    try {
      const response = await apiClient.post('/Notes', noteData);
      return response.data;
    } catch (err) {
      console.error('Error creating note:', err);
      throw err;
    }
  },

  // UPDATE NOTE
  updateNote: async (noteId: number, noteData: Partial<Note>): Promise<Note> => {
    try {
      const response = await apiClient.put(`/Notes/${noteId}`, noteData);
      return response.data;
    } catch (err) {
      console.error('Error updating note:', err);
      throw err;
    }
  },

  // DELETE NOTE
  deleteNote: async (noteId: number): Promise<boolean> => {
    try {
      const response = await apiClient.delete(`/Notes/${noteId}`);
      return response.status === 200 || response.status === 204;
    } catch (err) {
      console.error('Error deleting note:', err);
      return false;
    }
  },
};
