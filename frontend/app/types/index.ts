// Types for the chat application

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string; // For image messages
}

export interface CSVData {
  filename: string;
  columns: string[];
  row_count: number;
  numeric_columns: string[];
  text_columns: string[];
  sample_rows: Record<string, any>[];
  numeric_stats?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  activeImage?: string; // Base64 image
  activeCSV?: CSVData;
}

export interface SendMessageRequest {
  session_id: string;
  message: string;
  image_base64?: string;
}

export interface UploadImageResponse {
  message: string;
  session_id: string;
  analysis: string;
  image_preview: string;
  filename: string;
}

export interface CSVSummary {
  row_count: number;
  column_count: number;
  columns: string[];
  numeric_columns: string[];
  text_columns: string[];
  missing_values: Record<string, number>;
  numeric_stats?: Record<string, any>;
  most_missing_column?: string;
  most_missing_count?: number;
  text_summary: string;
  sample_rows?: Record<string, any>[];
}

export interface UploadCSVResponse {
  session_id: string;
  message: string;
  filename: string;
  summary: CSVSummary;
}

export interface CSVFromURLRequest {
  session_id?: string;
  url: string;
}
