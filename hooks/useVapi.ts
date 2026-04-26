"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  endVoiceSession,
  startVoiceSession,
} from "@/lib/actions/session.action";
import { ASSISTANT_ID, DEFAULT_VOICE, VOICE_SETTINGS } from "@/lib/constants";
import { useSubscription } from "@/hooks/useSubscription";
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

// No more module-level singleton — each hook creates its own instance via ref

export type CallStatus =
  | "idle"
  | "connecting"
  | "starting"
  | "listening"
  | "thinking"
  | "speaking";

export function useVapi(book: IBook) {
  const { userId } = useAuth();
  const { limits } = useSubscription();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [messages, setMessages] = useState<Messages[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [currentUserMessage, setCurrentUserMessage] = useState("");
  const [duration, setDuration] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(() =>
    !VAPI_API_KEY
      ? "Voice service is not configured. Please contact support."
      : null,
  );
  const [isBillingError, setIsBillingError] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isStoppingRef = useRef(false);
  const limitReachedRef = useRef(false); // fix: prevent repeated timer firings after cap

  // Fix: per-hook Vapi instance instead of module-level singleton
  const vapiRef = useRef<InstanceType<typeof Vapi> | null>(null);

  function getVapiInstance(): InstanceType<typeof Vapi> {
    if (!vapiRef.current) {
      if (!VAPI_API_KEY) {
        throw new Error(
          "NEXT_PUBLIC_VAPI_API_KEY environment variable is not set",
        );
      }
      vapiRef.current = new Vapi(VAPI_API_KEY);
    }
    return vapiRef.current;
  }

  const maxDurationSeconds = limits?.maxDurationPerSession
    ? limits.maxDurationPerSession * 60
    : 20 * 60;
  const maxDurationRef = useLatestRef(maxDurationSeconds);
  const durationRef = useLatestRef(duration);
  const voice = book.voice || DEFAULT_VOICE;

  useEffect(() => {
    // Fix: initialize instance eagerly so we can surface a config error
    // directly into state — no ref-flush race condition
    if (!VAPI_API_KEY) return;

    let vapiInstance: InstanceType<typeof Vapi>;
    try {
      vapiInstance = getVapiInstance();
    } catch {
      return;
    }

    const handlers = {
      "call-start": () => {
        isStoppingRef.current = false;
        limitReachedRef.current = false; // reset cap flag for new call
        setStatus("starting");
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

            // Fix: clear the timer immediately when cap is hit so this
            // block only fires once, not every second until call-end lands
            if (
              newDuration >= maxDurationRef.current &&
              !limitReachedRef.current
            ) {
              limitReachedRef.current = true;
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              try {
                vapiInstance.stop();
              } catch {
                // nothing to stop
              }
              setLimitError(
                `Session time limit (${Math.floor(
                  maxDurationRef.current / SECONDS_PER_MINUTE,
                )} minutes) reached. Upgrade your plan for longer sessions.`,
              );
            }
          }
        }, TIMER_INTERVAL_MS);
      },

      "call-end": () => {
        setStatus("idle");
        setCurrentMessage("");
        setCurrentUserMessage("");

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (sessionIdRef.current) {
          endVoiceSession(sessionIdRef.current, durationRef.current).catch(
            (err) => console.error("Failed to end voice session:", err),
          );
          sessionIdRef.current = null;
        }

        startTimeRef.current = null;
      },

      "speech-start": () => {
        if (!isStoppingRef.current) {
          setStatus("speaking");
        }
      },
      "speech-end": () => {
        if (!isStoppingRef.current) {
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

        if (message.role === "user" && message.transcriptType === "final") {
          if (!isStoppingRef.current) {
            setStatus("thinking");
          }
          setCurrentUserMessage("");
        }

        if (message.role === "user" && message.transcriptType === "partial") {
          setCurrentUserMessage(message.transcript);
          return;
        }

        if (
          message.role === "assistant" &&
          message.transcriptType === "partial"
        ) {
          setCurrentMessage(message.transcript);
          return;
        }

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
        setStatus("idle");
        setCurrentMessage("");
        setCurrentUserMessage("");

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (sessionIdRef.current) {
          endVoiceSession(sessionIdRef.current, durationRef.current).catch(
            (err) =>
              console.error("Failed to end voice session on error:", err),
          );
          sessionIdRef.current = null;
        }

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
    Object.entries(handlers).forEach(([event, handler]) => {
      vapiInstance.on(event as keyof typeof handlers, handler as () => void);
    });

    return () => {
      if (sessionIdRef.current) {
        vapiInstance.stop();
        endVoiceSession(sessionIdRef.current, durationRef.current).catch(
          (err) =>
            console.error("Failed to end voice session on unmount:", err),
        );
        sessionIdRef.current = null;
      }
      Object.entries(handlers).forEach(([event, handler]) => {
        vapiInstance.off(event as keyof typeof handlers, handler as () => void);
      });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [durationRef, maxDurationRef]);

  const start = useCallback(async () => {
    if (!userId) {
      setLimitError("Please sign in to start a voice session.");
      return;
    }
    if (!VAPI_API_KEY) {
      setLimitError("Voice service is not configured. Please contact support.");
      return;
    }

    setLimitError(null);
    setIsBillingError(false);
    setStatus("connecting");

    try {
      const result = await startVoiceSession(book._id);
      if (!result.success) {
        setLimitError(
          result.error || "Session limit exceeded. Please upgrade your plan.",
        );
        setIsBillingError(!!result.isBillingError);
        setStatus("idle");
        return;
      }

      sessionIdRef.current = result.sessionId || null;

      const firstMessage = `Hello there, good to meet you! I am your reading assistant. I will read the book out loud for you. You can ask me questions about the book or request me to explain certain parts as we go along. Just click the mic button whenever you want to talk to me!`;

      await getVapiInstance().start(ASSISTANT_ID, {
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
      setStatus("idle");
      setLimitError("Failed to start session. Please try again.");
    }
  }, [book._id, book.title, book.author, voice, userId]);

  const stop = useCallback(() => {
    isStoppingRef.current = true;
    try {
      getVapiInstance().stop();
    } catch {
      // Instance wasn't created — nothing to stop
    }
  }, []);

  const clearError = useCallback(() => {
    setLimitError(null);
    setIsBillingError(false);
  }, []);

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
    limitError,
    isBillingError,
    maxDurationSeconds,
    clearError,
  };
}

export default useVapi;
