"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Image,
  FileSpreadsheet,
  Link,
  X,
  Loader2,
  Plus,
} from "lucide-react";

// Attachment type for pending files
interface PendingAttachment {
  id: string;
  type: "image" | "csv";
  file?: File;
  preview?: string;
  name: string;
  size?: number;
}

interface ChatInputProps {
  onSendMessage: (message: string, pastedImage?: string) => void;
  onUploadImage: (file: File) => void;
  onUploadCSV: (file: File) => void;
  onLoadCSVFromURL: (url: string) => void;
  onPasteImage?: (base64: string) => void;
  isLoading: boolean;
  activeImage?: string;
  activeCSV?: { filename: string; row_count: number };
  onClearImage: () => void;
  onClearCSV: () => void;
}

export default function ChatInput({
  onSendMessage,
  onUploadImage,
  onUploadCSV,
  onLoadCSVFromURL,
  onPasteImage,
  isLoading,
  activeImage,
  activeCSV,
  onClearImage,
  onClearCSV,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showURLInput, setShowURLInput] = useState(false);
  const [csvURL, setCSVURL] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [message]);

  // Close attach menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Add image attachment
  const addImageAttachment = useCallback(
    (file: File, dataUrl: string) => {
      const attachment: PendingAttachment = {
        id: `img-${Date.now()}`,
        type: "image",
        file,
        preview: dataUrl,
        name: file.name || "Pasted image",
        size: file.size,
      };
      setPendingAttachments((prev) => {
        const filtered = prev.filter((a) => a.type !== "image");
        return [...filtered, attachment];
      });
      const base64 = dataUrl.split(",")[1];
      onPasteImage?.(base64);
    },
    [onPasteImage],
  );

  // Add CSV attachment
  const addCSVAttachment = useCallback((file: File) => {
    const attachment: PendingAttachment = {
      id: `csv-${Date.now()}`,
      type: "csv",
      file,
      name: file.name,
      size: file.size,
    };
    setPendingAttachments((prev) => {
      const filtered = prev.filter((a) => a.type !== "csv");
      return [...filtered, attachment];
    });
  }, []);

  // Remove attachment
  const removeAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Handle paste event for images
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              addImageAttachment(file, dataUrl);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    },
    [addImageAttachment],
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            addImageAttachment(file, dataUrl);
          };
          reader.readAsDataURL(file);
        } else if (file.name.endsWith(".csv")) {
          addCSVAttachment(file);
        }
      }
    },
    [addImageAttachment, addCSVAttachment],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasContent = message.trim() || pendingAttachments.length > 0;
    if (!hasContent || isLoading) return;

    const imageAttachment = pendingAttachments.find((a) => a.type === "image");
    const csvAttachment = pendingAttachments.find((a) => a.type === "csv");

    const pastedImage = imageAttachment?.preview
      ? imageAttachment.preview.split(",")[1]
      : undefined;

    // If there's a CSV, upload it first
    if (csvAttachment?.file) {
      onUploadCSV(csvAttachment.file);
      // Send message after short delay for CSV processing
      if (message.trim() || imageAttachment) {
        setTimeout(() => {
          onSendMessage(message.trim(), pastedImage);
        }, 500);
      }
    } else {
      onSendMessage(message.trim(), pastedImage);
    }

    setMessage("");
    setPendingAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          addImageAttachment(file, dataUrl);
        };
        reader.readAsDataURL(file);
      } else {
        alert("Chỉ chấp nhận file hình ảnh");
      }
    }
    e.target.value = "";
    setShowAttachMenu(false);
  };

  const handleCSVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      addCSVAttachment(file);
    } else {
      alert("Chỉ chấp nhận file CSV");
    }
    e.target.value = "";
    setShowAttachMenu(false);
  };

  const handleLoadURL = () => {
    if (csvURL.trim()) {
      onLoadCSVFromURL(csvURL.trim());
      setCSVURL("");
      setShowURLInput(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div
      className={`px-4 py-3 transition-colors ${isDragging ? "bg-primary/5" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-background px-6 py-4 rounded-xl shadow-lg">
            <p className="text-primary font-medium">
              Thả file ở đây (Ảnh hoặc CSV)
            </p>
          </div>
        </div>
      )}

      {/* Active Context Tags - Files already on server */}
      {(activeImage || activeCSV) && pendingAttachments.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-2 max-w-3xl mx-auto">
          {activeImage && (
            <div className="flex items-center gap-1.5 bg-accent/20 text-accent px-2 py-1 rounded-full text-xs">
              <Image className="w-3 h-3" />
              <span>Ảnh đã tải lên</span>
              <button
                onClick={onClearImage}
                className="hover:bg-accent/30 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {activeCSV && (
            <div className="flex items-center gap-1.5 bg-success/20 text-success px-2 py-1 rounded-full text-xs">
              <FileSpreadsheet className="w-3 h-3" />
              <span>
                {activeCSV.filename} ({activeCSV.row_count} dòng)
              </span>
              <button
                onClick={onClearCSV}
                className="hover:bg-success/30 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* URL Input */}
      {showURLInput && (
        <div className="flex gap-2 mb-2 max-w-3xl mx-auto">
          <input
            type="url"
            value={csvURL}
            onChange={(e) => setCSVURL(e.target.value)}
            placeholder="Nhập URL file CSV..."
            className="flex-1 px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleLoadURL}
            disabled={!csvURL.trim() || isLoading}
            className="px-4 py-2 bg-success text-background rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Tải
          </button>
          <button
            onClick={() => {
              setShowURLInput(false);
              setCSVURL("");
            }}
            className="p-2 text-foreground-muted hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Input Area */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-background-secondary border border-border rounded-xl">
          {/* Pending Attachments Preview - ChatGPT/Gemini style */}
          {pendingAttachments.length > 0 && (
            <div className="px-3 pt-3 pb-2 border-b border-border/50">
              <div className="flex flex-wrap gap-2">
                {pendingAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className={`relative group flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      attachment.type === "image"
                        ? "bg-accent/10 border-accent/30"
                        : "bg-success/10 border-success/30"
                    }`}
                  >
                    {attachment.type === "image" && attachment.preview ? (
                      <>
                        <img
                          src={attachment.preview}
                          alt={attachment.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                            {attachment.name}
                          </span>
                          {attachment.size && (
                            <span className="text-xs text-foreground-muted">
                              {formatFileSize(attachment.size)}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-8 h-8 text-success" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground truncate max-w-[150px]">
                            {attachment.name}
                          </span>
                          {attachment.size && (
                            <span className="text-xs text-foreground-muted">
                              {formatFileSize(attachment.size)}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                    {/* Remove button */}
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute -top-1.5 -right-1.5 p-1 bg-background border border-border rounded-full text-foreground-muted hover:text-danger hover:border-danger transition-colors shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Row */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2 p-2">
            {/* Attachment Button with Menu */}
            <div className="relative pb-1" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                disabled={isLoading}
                className={`p-2 rounded-lg disabled:opacity-50 transition-colors ${
                  showAttachMenu
                    ? "bg-primary/20 text-primary"
                    : "text-foreground-muted hover:text-foreground hover:bg-foreground/10"
                }`}
                title="Đính kèm file"
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* Attachment Menu Dropdown */}
              {showAttachMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[180px] z-50">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-foreground/5 transition-colors"
                  >
                    <Image className="w-4 h-4 text-accent" />
                    <span>Tải ảnh lên</span>
                  </button>

                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => csvInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-foreground/5 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-success" />
                    <span>Tải file CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowURLInput(true);
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-foreground/5 transition-colors"
                  >
                    <Link className="w-4 h-4 text-primary" />
                    <span>CSV từ URL</span>
                  </button>
                </div>
              )}
            </div>

            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                pendingAttachments.length > 0
                  ? "Thêm tin nhắn về file đính kèm..."
                  : activeImage
                    ? "Hỏi về ảnh..."
                    : activeCSV
                      ? "Hỏi về dữ liệu CSV..."
                      : "Nhập tin nhắn... (Ctrl+V để paste ảnh)"
              }
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none disabled:opacity-50 resize-none max-h-[200px]"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={
                (!message.trim() && pendingAttachments.length === 0) ||
                isLoading
              }
              className="p-2 bg-primary text-background rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors mb-1"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>

        {/* Hint text */}
        <p className="text-center text-xs text-foreground-muted mt-2">
          Nhấn + để đính kèm • Paste ảnh (Ctrl+V) • Kéo thả file • Shift+Enter
          xuống dòng
        </p>
      </div>
    </div>
  );
}
