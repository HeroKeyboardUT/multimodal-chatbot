"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Message } from "../types";
import { chatAPI, imageAPI, csvAPI } from "../services/api";
import { ChatMessage, ChatInput } from "../components";
import {
  Terminal,
  Trash2,
  Zap,
  Moon,
  Sun,
  Plus,
  MessageSquare,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react";

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  activeImage?: string;
  activeCSV?: { filename: string; row_count: number };
}

export default function ChatPage() {
  // Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Current session state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeImage, setActiveImage] = useState<string | undefined>();
  const [activeCSV, setActiveCSV] = useState<
    { filename: string; row_count: number } | undefined
  >();
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem("chatSessions");
    const savedActiveId = localStorage.getItem("activeSessionId");
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }

    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        // Convert date strings back to Date objects
        const sessionsWithDates = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
        setSessions(sessionsWithDates);

        if (
          savedActiveId &&
          sessionsWithDates.find((s: ChatSession) => s.id === savedActiveId)
        ) {
          setActiveSessionId(savedActiveId);
          const session = sessionsWithDates.find(
            (s: ChatSession) => s.id === savedActiveId,
          );
          if (session) {
            setMessages(session.messages);
            setActiveImage(session.activeImage);
            setActiveCSV(session.activeCSV);
          }
        } else if (sessionsWithDates.length > 0) {
          setActiveSessionId(sessionsWithDates[0].id);
          setMessages(sessionsWithDates[0].messages);
          setActiveImage(sessionsWithDates[0].activeImage);
          setActiveCSV(sessionsWithDates[0].activeCSV);
        } else {
          createNewSession();
        }
      } catch {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("chatSessions", JSON.stringify(sessions));
    }
    if (activeSessionId) {
      localStorage.setItem("activeSessionId", activeSessionId);
    }
  }, [sessions, activeSessionId]);

  // Update current session when messages change
  useEffect(() => {
    if (activeSessionId && messages.length > 0) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages,
                activeImage,
                activeCSV,
                title: generateTitle(messages),
              }
            : s,
        ),
      );
    }
  }, [messages, activeImage, activeCSV, activeSessionId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateTitle = (msgs: Message[]): string => {
    const firstUserMsg = msgs.find(
      (m) => m.role === "user" && !m.content.startsWith("["),
    );
    if (firstUserMsg) {
      return (
        firstUserMsg.content.slice(0, 30) +
        (firstUserMsg.content.length > 30 ? "..." : "")
      );
    }
    return "Cuộc trò chuyện mới";
  };

  const createNewSession = async () => {
    try {
      const response = await chatAPI.createSession();
      const newSession: ChatSession = {
        id: response.session_id,
        title: "Cuộc trò chuyện mới",
        messages: [],
        createdAt: new Date(),
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMessages([]);
      setActiveImage(undefined);
      setActiveCSV(undefined);
      setError(null);
    } catch (err) {
      // Fallback to local ID
      const localId = `local-${Date.now()}`;
      const newSession: ChatSession = {
        id: localId,
        title: "Cuộc trò chuyện mới",
        messages: [],
        createdAt: new Date(),
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(localId);
      setMessages([]);
      setActiveImage(undefined);
      setActiveCSV(undefined);
    }
  };

  const switchSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setMessages(session.messages);
      setActiveImage(session.activeImage);
      setActiveCSV(session.activeCSV);
      setError(null);
    }
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    // Don't delete if it's the only session
    if (sessions.length <= 1) {
      return;
    }

    try {
      await chatAPI.clearSession(sessionId);
    } catch {
      // Ignore error, still delete locally
    }

    setSessions((prev) => prev.filter((s) => s.id !== sessionId));

    // Switch to another session if deleting active one
    if (sessionId === activeSessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      if (remaining.length > 0) {
        switchSession(remaining[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const addMessage = (
    role: "user" | "assistant",
    content: string,
    imageUrl?: string,
  ) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
      imageUrl,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const updateLastAssistantMessage = (content: string) => {
    setMessages((prev) => {
      const newMessages = [...prev];
      const lastIndex = newMessages.length - 1;
      if (lastIndex >= 0 && newMessages[lastIndex].role === "assistant") {
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          content,
        };
      }
      return newMessages;
    });
  };

  const handleSendMessage = async (content: string, pastedImage?: string) => {
    if (!activeSessionId) return;

    setError(null);

    // If there's a pasted image, add it to message
    const imageToUse = pastedImage || activeImage;

    addMessage(
      "user",
      content,
      pastedImage ? `data:image/png;base64,${pastedImage}` : undefined,
    );
    setIsLoading(true);

    // Create placeholder message for streaming
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ]);

    let streamedContent = "";

    try {
      await chatAPI.sendMessageStream(
        {
          session_id: activeSessionId,
          message: content,
          image_base64: imageToUse,
        },
        {
          onChunk: (chunk) => {
            streamedContent += chunk;
            updateLastAssistantMessage(streamedContent);
          },
          onDone: (newSessionId) => {
            if (newSessionId && newSessionId !== activeSessionId) {
              setActiveSessionId(newSessionId);
            }
            setIsLoading(false);
            // Clear pasted image after sending
            if (pastedImage) {
              setActiveImage(undefined);
            }
          },
          onError: (errorMsg) => {
            setError(errorMsg);
            updateLastAssistantMessage(` Lỗi: ${errorMsg}`);
            setIsLoading(false);
          },
          onSessionId: (newSessionId) => {
            if (newSessionId && !activeSessionId.startsWith("local-")) {
              setActiveSessionId(newSessionId);
            }
          },
        },
      );
    } catch (err: any) {
      const errorMsg = err.message || "Có lỗi xảy ra. Vui lòng thử lại.";
      setError(errorMsg);
      updateLastAssistantMessage(` Lỗi: ${errorMsg}`);
      setIsLoading(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    if (!activeSessionId) return;

    setError(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];

      try {
        const response = await imageAPI.upload(activeSessionId, file);
        setActiveImage(base64);

        addMessage(
          "user",
          `[Uploaded image: ${file.name}]`,
          reader.result as string,
        );
        addMessage("assistant", response.analysis);
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || "Không thể upload ảnh.";
        setError(errorMsg);
        addMessage("assistant", ` Lỗi upload ảnh: ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasteImage = useCallback((base64: string) => {
    setActiveImage(base64);
  }, []);

  const handleUploadCSV = async (file: File) => {
    if (!activeSessionId) return;

    setError(null);
    setIsLoading(true);
    addMessage("user", `[Đang tải lên CSV: ${file.name}]`);

    try {
      const response = await csvAPI.upload(activeSessionId, file);

      // Update session ID if server returns a different one
      if (response.session_id && response.session_id !== activeSessionId) {
        setActiveSessionId(response.session_id);
      }

      setActiveCSV({
        filename: response.filename || file.name,
        row_count: response.summary.row_count,
      });

      // Build summary message
      const summaryMsg =
        response.summary.text_summary ||
        `Đã tải **${response.filename}** (${response.summary.row_count} dòng, ${response.summary.column_count} cột)`;

      addMessage(
        "assistant",
        summaryMsg +
          '\n\nBạn có thể hỏi về dữ liệu này, ví dụ:\n- "Tóm tắt dữ liệu"\n- "Cột nào có nhiều giá trị thiếu nhất?"\n- "Thống kê cột [tên cột]"',
      );
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.detail || "Không thể xử lý file CSV.";
      setError(errorMsg);
      addMessage("assistant", ` Lỗi: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadCSVFromURL = async (url: string) => {
    if (!activeSessionId) return;

    setError(null);
    setIsLoading(true);
    addMessage("user", `[Đang tải CSV từ URL]`);

    try {
      const response = await csvAPI.loadFromURL({
        session_id: activeSessionId,
        url: url,
      });

      // Update session ID if server returns a different one
      if (response.session_id && response.session_id !== activeSessionId) {
        setActiveSessionId(response.session_id);
      }

      setActiveCSV({
        filename: response.filename || url.split("/").pop() || "data.csv",
        row_count: response.summary.row_count,
      });

      // Build summary message
      const summaryMsg =
        response.summary.text_summary ||
        `Đã tải **${response.filename}** (${response.summary.row_count} dòng, ${response.summary.column_count} cột)`;

      addMessage(
        "assistant",
        summaryMsg + "\n\nBạn có thể hỏi về dữ liệu này!",
      );
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.detail || "Không thể tải CSV từ URL.";
      setError(errorMsg);
      addMessage("assistant", ` Lỗi: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearImage = async () => {
    if (!activeSessionId) return;
    try {
      await imageAPI.clear(activeSessionId);
      setActiveImage(undefined);
    } catch {
      setActiveImage(undefined);
    }
  };

  const handleClearCSV = async () => {
    if (!activeSessionId) return;
    try {
      await csvAPI.clear(activeSessionId);
      setActiveCSV(undefined);
    } catch {
      setActiveCSV(undefined);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <div className={`fixed inset-0 flex bg-background ${isDark ? "dark" : ""}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed md:relative md:translate-x-0 z-30 md:z-auto w-64 h-full bg-background-secondary border-r border-border transition-transform duration-300 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Terminal className="w-5 h-5 text-background" />
            </div>
            <span className="font-semibold text-foreground text-sm">
              Neural Chat
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-foreground/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={createNewSession}
            className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-foreground/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Chat mới</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <p className="text-xs text-foreground-muted mb-2 px-1">
            Lịch sử chat
          </p>
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  session.id === activeSessionId
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-foreground/5"
                }`}
                onClick={() => switchSession(session.id)}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-sm truncate">{session.title}</span>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-foreground-muted hover:text-danger transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="border-b border-border bg-background px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-foreground-muted hover:text-foreground hover:bg-foreground/10 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <a
                href="/"
                className="hidden sm:flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">Trang chủ</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-foreground-muted hover:text-foreground hover:bg-foreground/10 rounded-lg transition-colors"
              >
                {isDark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="bg-danger/10 border-b border-danger/30 px-4 py-2 flex-shrink-0">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>

                <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                  Xin chào!
                </h1>

                <p className="text-foreground-muted mb-6 text-sm sm:text-base">
                  Tôi có thể giúp bạn trả lời câu hỏi, phân tích dữ liệu CSV.
                  Bạn có thể paste hình ảnh trực tiếp vào ô nhập tin nhắn.
                </p>

                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1.5 bg-background-secondary text-foreground-muted text-xs sm:text-sm rounded-full border border-border">
                    Paste ảnh (Ctrl+V)
                  </span>
                  <span className="px-3 py-1.5 bg-background-secondary text-foreground-muted text-xs sm:text-sm rounded-full border border-border">
                    Upload CSV
                  </span>
                  <span className="px-3 py-1.5 bg-background-secondary text-foreground-muted text-xs sm:text-sm rounded-full border border-border">
                    Chat streaming
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="pb-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  time_stamp={message.timestamp.toLocaleString()}
                  isStreaming={
                    isLoading &&
                    message.role === "assistant" &&
                    message === messages[messages.length - 1]
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Area */}
        <div className="border-t border-border bg-background shrink-0">
          <ChatInput
            onSendMessage={handleSendMessage}
            onUploadImage={handleUploadImage}
            onUploadCSV={handleUploadCSV}
            onLoadCSVFromURL={handleLoadCSVFromURL}
            onPasteImage={handlePasteImage}
            isLoading={isLoading}
            activeImage={activeImage}
            activeCSV={activeCSV}
            onClearImage={handleClearImage}
            onClearCSV={handleClearCSV}
          />
        </div>
      </div>
    </div>
  );
}
