"use client";

import { User, Bot } from "lucide-react";
import { Message } from "../../types";
import { MessageContent } from "./MessageContent";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  time_stamp?: string;
}

/**
 * Avatar component for user/bot
 */
function Avatar({ isUser }: { isUser: boolean }) {
  return (
    <div
      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
        isUser
          ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900"
          : "bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
      }`}
    >
      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
    </div>
  );
}

/**
 * Streaming cursor animation
 */
function StreamingCursor() {
  return (
    <span className="inline-block w-2 h-4 bg-neutral-800 dark:bg-neutral-200 animate-pulse ml-0.5 align-middle" />
  );
}

/**
 * Image preview component
 */
function ImagePreview({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="mt-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Uploaded"
        className="max-w-50 rounded-lg border border-border ml-auto"
      />
    </div>
  );
}

/**
 * Main chat message component
 */
export default function ChatMessage({
  message,
  isStreaming = false,
  time_stamp,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`py-3 ${isUser ? "text-right" : "bg-background-secondary/50"}`}
    >
      <div className={`max-w-3xl mx-auto px-4 ${isUser ? "ml-auto" : ""}`}>
        <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
          <Avatar isUser={isUser} />

          <div className="flex-1 min-w-0 pt-0.5">
            {/* Role name */}
            <span className="text-sm font-semibold text-foreground">
              {isUser ? "Bạn" : "AI"}{" "}
              {time_stamp && <span>· {time_stamp}</span>}
            </span>

            {/* Image preview */}
            {message.imageUrl && <ImagePreview imageUrl={message.imageUrl} />}

            {/* Message content */}
            <div className="prose prose-sm max-w-none text-foreground mt-1">
              {message.content && <MessageContent content={message.content} />}
              {isStreaming && <StreamingCursor />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
