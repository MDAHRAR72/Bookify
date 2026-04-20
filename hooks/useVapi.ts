"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  endVoiceSession,
  startVoiceSession,
} from "@/lib/actions/session.action";
import { ASSISTANT_ID, DEFAULT_VOICE, VOICE_SETTINGS } from "@/lib/constants";
import { getVoice } from "@/lib/utils";
import { IBook, Messages } from "@/types";
import { useAuth } from "@clerk/nextjs";
import Vapi from "@vapi-ai/web";

export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;
const TIMER_INTERVAL_MS = 1000;
const SECONDS_PER_MINUTE = 60;
const TIME_WARNING_THRESHOLD = 60;

let vapi: InstanceType<typeof Vapi> | null = null;

function isVapiAvailable(): boolean {
  return !!VAPI_API_KEY;
}

function getVapi(): InstanceType<typeof Vapi> | null {
  if (!vapi) {
    if (!VAPI_API_KEY) {
      return null;
    }
    try {
      vapi = new Vapi(VAPI_API_KEY);
    } catch (e) {
      console.error("Failed to initialize Vapi:", e);
      return null;
    }
  }
  return vapi;
}

export type CallStatus =
  | "idle"
  | "connecting"
  | "starting"
  | "listening"
  | "thinking"
  | "speaking";

export function useVapi(book: IBook) {
  const { userId } = useAuth();
  // const {limits} = useSubscription();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [messages, setMessages] = useState<Messages[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [currentUserMessage, setCurrentUserMessage] = useState("");
  const [duration, setDuration] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isStoppingRef = useRef(false);

  // const maxDurationSeconds = limits?.maxDurationPerSession
  //   ? limits.maxDurationPerSession * 60
  //   : 15 * 60;
  // const maxDurationRef = useLatestRef(maxDurationSeconds);
  // const durationRef = useLatestRef(duration);
  const voice = book.voice || DEFAULT_VOICE;

  useEffect(() => {
    if (!isVapiAvailable()) {
      setLimitError(
        "Voice assistant is not available. Please check your configuration.",
      );
      return;
    }

    const handlers = {
      "call-start": () => {
        isStoppingRef.current = false;
        setStatus("starting"); // AI speaks first, wait for it
        setCurrentMessage("");
        setCurrentUserMessage("");

        // Start duration timer
        startTimeRef.current = Date.now();
        setDuration(0);
        timerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            const newDuration = Math.floor(
              (Date.now() - startTimeRef.current) / TIMER_INTERVAL_MS,
            );
            setDuration(newDuration);

            // Check duration limit
            // if (newDuration >= maxDurationRef.current) {
            //   getVapi().stop();
            //   setLimitError(
            //     `Session time limit (${Math.floor(
            //       maxDurationRef.current / SECONDS_PER_MINUTE,
            //     )} minutes) reached. Upgrade your plan for longer sessions.`,
            //   );
            // }
          }
        }, TIMER_INTERVAL_MS);
      },

      "call-end": () => {
        // Don't reset isStoppingRef here - delayed events may still fire
        setStatus("idle");
        setCurrentMessage("");
        setCurrentUserMessage("");

        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // End session tracking
        // if (sessionIdRef.current) {
        //   endVoiceSession(sessionIdRef.current, durationRef.current).catch(
        //     (err) => console.error("Failed to end voice session:", err),
        //   );
        //   sessionIdRef.current = null;
        // }

        startTimeRef.current = null;
      },

      "speech-start": () => {
        if (!isStoppingRef.current) {
          setStatus("speaking");
        }
      },
      "speech-end": () => {
        if (!isStoppingRef.current) {
          // After AI finishes speaking, user can talk
          setStatus("listening");
        }
      },

      message: (message: {
        type: string;
        role: string;
        transcriptType: string;
        transcript: string;
      }) => {
        if (message.type !== "transcript") return;

        // User finished speaking → AI is thinking
        if (message.role === "user" && message.transcriptType === "final") {
          if (!isStoppingRef.current) {
            setStatus("thinking");
          }
          setCurrentUserMessage("");
        }

        // Partial user transcript → show real-time typing
        if (message.role === "user" && message.transcriptType === "partial") {
          setCurrentUserMessage(message.transcript);
          return;
        }

        // Partial AI transcript → show word-by-word
        if (
          message.role === "assistant" &&
          message.transcriptType === "partial"
        ) {
          setCurrentMessage(message.transcript);
          return;
        }

        // Final transcript → add to messages
        if (message.transcriptType === "final") {
          if (message.role === "assistant") setCurrentMessage("");
          if (message.role === "user") setCurrentUserMessage("");

          setMessages((prev) => {
            const isDupe = prev.some(
              (m) =>
                m.role === message.role && m.content === message.transcript,
            );
            return isDupe
              ? prev
              : [...prev, { role: message.role, content: message.transcript }];
          });
        }
      },

      error: (error: Error) => {
        console.error("Vapi error:", error);
        // Don't reset isStoppingRef here - delayed events may still fire
        setStatus("idle");
        setCurrentMessage("");
        setCurrentUserMessage("");

        // Stop timer on error
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // End session tracking on error
        // if (sessionIdRef.current) {
        //   endVoiceSession(sessionIdRef.current, durationRef.current).catch(
        //     (err) =>
        //       console.error("Failed to end voice session on error:", err),
        //   );
        //   sessionIdRef.current = null;
        // }

        // Show user-friendly error message
        const errorMessage = error.message?.toLowerCase() || "";
        if (
          errorMessage.includes("timeout") ||
          errorMessage.includes("silence")
        ) {
          setLimitError(
            "Session ended due to inactivity. Click the mic to start again.",
          );
        } else if (
          errorMessage.includes("network") ||
          errorMessage.includes("connection")
        ) {
          setLimitError(
            "Connection lost. Please check your internet and try again.",
          );
        } else {
          setLimitError(
            "Session ended unexpectedly. Click the mic to start again.",
          );
        }

        startTimeRef.current = null;
      },
    };

    // Register all handlers
    try {
      const vapiInstance = getVapi();
      if (vapiInstance) {
        Object.entries(handlers).forEach(([event, handler]) => {
          vapiInstance.on(
            event as keyof typeof handlers,
            handler as () => void,
          );
        });
      }
    } catch (e) {
      console.error("Failed to register Vapi handlers:", e);
      setLimitError("Failed to initialize voice assistant.");
    }

    return () => {
      // End active session on unmount
      // if (sessionIdRef.current) {
      //   getVapi()?.stop();
      //   endVoiceSession(sessionIdRef.current, durationRef.current).catch(
      //     (err) =>
      //       console.error("Failed to end voice session on unmount:", err),
      //   );
      //   sessionIdRef.current = null;
      // }
      // Cleanup handlers
      try {
        const vapiInstance = getVapi();
        if (vapiInstance) {
          Object.entries(handlers).forEach(([event, handler]) => {
            vapiInstance.off(
              event as keyof typeof handlers,
              handler as () => void,
            );
          });
        }
      } catch (e) {
        console.error("Failed to cleanup Vapi handlers:", e);
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = useCallback(async () => {
    if (!isVapiAvailable()) {
      setLimitError(
        "Voice assistant is not available. Please check your configuration.",
      );
      return;
    }

    setLimitError(null);
    setStatus("connecting");

    try {
      const result = await startVoiceSession(book._id);
      if (!result.success) {
        setLimitError(
          result.error || "Session limit exceeded. Please upgrade your plan.",
        );
        setStatus("idle");
        return;
      }

      sessionIdRef.current = result.sessionId || null;

      const firstMessage = `Hello there, good to meet you! I am your reading assistant. I will read the book out loud for you. You can ask me questions about the book or request me to explain certain parts as we go along. Just click the mic button whenever you want to talk to me!`;

      const vapiInstance = getVapi();
      if (!vapiInstance) {
        throw new Error("Voice assistant failed to initialize");
      }

      await vapiInstance.start(ASSISTANT_ID, {
        firstMessage,
        variableValues: {
          title: book.title,
          author: book.author,
          bookId: book._id,
        },
        voice: {
          provider: "11labs" as const,
          voiceId: getVoice(voice).id,
          model: "eleven_flash_v2_5" as const,
          stability: VOICE_SETTINGS.stability,
          similarityBoost: VOICE_SETTINGS.similarityBoost,
          style: VOICE_SETTINGS.style,
          useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
        },
      });
    } catch (e) {
      console.error("Failed to start session.", e);
      if (sessionIdRef.current) {
        endVoiceSession(sessionIdRef.current, 0).catch((endErr) =>
          console.error(
            "Failed to end voice session on start failure:",
            endErr,
          ),
        );
        sessionIdRef.current = null;
      }
      setStatus("idle");
      setLimitError("Failed to start session. Please try again.");
    }
  }, [book._id, book.title, book.author, voice, userId]);

  const stop = async () => {
    isStoppingRef.current = true;
    try {
      const vapiInstance = getVapi();
      if (vapiInstance) {
        vapiInstance.stop();
      }
    } catch (e) {
      console.error("Failed to stop voice session:", e);
      setLimitError("Failed to stop session. Please try again.");
    }
  };
  const clearErrors = useCallback(() => {
    setLimitError(null);
  }, []);

  // const maxDurationRef = useLatestRef(limits.maxSessionMinutes * 60);
  // const maxDurationSeconds
  // const remainingSeconds
  // const showTimeWarning

  const isActive =
    status === "starting" ||
    status === "listening" ||
    status === "thinking" ||
    status === "speaking";

  return {
    status,
    isActive,
    messages,
    currentMessage,
    currentUserMessage,
    duration,
    start,
    stop,
    clearErrors,
    limitError,
  };
}

export default useVapi;
