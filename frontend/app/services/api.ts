import axios from "axios";
import {
  SendMessageRequest,
  UploadImageResponse,
  UploadCSVResponse,
  CSVFromURLRequest,
} from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Streaming callback types
export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: (sessionId: string) => void;
  onError: (error: string) => void;
  onSessionId?: (sessionId: string) => void;
}

// Chat API
export const chatAPI = {
  // Send a message with streaming response
  sendMessageStream: async (
    data: SendMessageRequest,
    callbacks: StreamCallbacks,
  ): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: data.message,
        session_id: data.session_id,
        image_base64: data.image_base64,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(6);
              if (jsonStr.trim()) {
                const data = JSON.parse(jsonStr);

                switch (data.type) {
                  case "session":
                    callbacks.onSessionId?.(data.session_id);
                    break;
                  case "chunk":
                    callbacks.onChunk(data.content);
                    break;
                  case "done":
                    callbacks.onDone(data.session_id);
                    break;
                  case "error":
                    callbacks.onError(data.content);
                    break;
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  // Create new session
  createSession: async (): Promise<{
    session_id: string;
    created_at: string;
  }> => {
    const response = await api.post("/api/chat/session");
    return response.data;
  },

  // Clear/Delete session
  clearSession: async (sessionId: string) => {
    const response = await api.delete(`/api/chat/session/${sessionId}`);
    return response.data;
  },
};

// Image API
export const imageAPI = {
  // Upload image
  upload: async (
    sessionId: string,
    file: File,
  ): Promise<UploadImageResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);

    const response = await api.post("/api/image/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Clear image
  clear: async (sessionId: string) => {
    const response = await api.delete(`/api/image/clear/${sessionId}`);
    return response.data;
  },
};

// CSV API
export const csvAPI = {
  // Upload CSV file
  upload: async (sessionId: string, file: File): Promise<UploadCSVResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);

    const response = await api.post("/api/csv/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Load CSV from URL
  loadFromURL: async (data: CSVFromURLRequest): Promise<UploadCSVResponse> => {
    const response = await api.post("/api/csv/url", {
      url: data.url,
      session_id: data.session_id,
    });
    return response.data;
  },

  // Clear CSV
  clear: async (sessionId: string) => {
    const response = await api.delete(`/api/csv/clear/${sessionId}`);
    return response.data;
  },
};

export default api;
