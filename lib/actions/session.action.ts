"use server";

import { connectToDatabase } from "@/database/mongoose";
import { EndSessionResult, StartSessionResult } from "@/types";
import { auth } from "@clerk/nextjs/server";
import { Types } from "mongoose";
import VoiceSession from "@/database/models/voice-session.model";

export const startVoiceSession = async (
  bookId: string,
): Promise<StartSessionResult> => {
  try {
    // Validate bookId is a valid ObjectId
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return { success: false, error: "Unauthorized" };
    }
    await connectToDatabase();

    const { getUserPlan } = await import("@/lib/subscription.server");
    const { PLAN_LIMITS } = await import("@/lib/subscription-constants");

    const plan = await getUserPlan();
    const limits = PLAN_LIMITS[plan];

    const sessionCount = await VoiceSession.countDocuments({
      clerkId,
    });

    if (sessionCount >= limits.maxSessionsPerMonth) {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/");

      return {
        success: false,
        error: `You have reached the monthly session limit for your ${plan} plan (${limits.maxSessionsPerMonth}). Please upgrade for more sessions.`,
        isBillingError: true,
      };
    }

    if (!Types.ObjectId.isValid(bookId)) {
      return {
        success: false,
        error: "Invalid book ID",
      };
    }

    const session = await VoiceSession.create({
      clerkId,
      bookId,
      startedAt: new Date(),
      durationSeconds: 0,
    });
    return {
      success: true,
      sessionId: session._id.toString(),
      maxDurationMinutes: limits.maxDurationPerSession,
    };
  } catch (e) {
    console.error("Error starting voice session", e);
    return {
      success: false,
      error: "Failed to start session. Please try again.",
    };
  }
};

export const endVoiceSession = async (
  sessionId: string,
  durationSeconds: number,
): Promise<EndSessionResult> => {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return {
        success: false,
        error: "Unauthorized: User not authenticated",
      };
    }

    // Validate sessionId is a valid ObjectId
    if (!Types.ObjectId.isValid(sessionId)) {
      return {
        success: false,
        error: "Invalid session ID",
      };
    }

    // Sanitize durationSeconds: ensure >= 0 and cap to reasonable max (24 hours)
    const MAX_DURATION_SECONDS = 24 * 60 * 60;
    const sanitizedDuration = Math.max(
      0,
      Math.min(durationSeconds, MAX_DURATION_SECONDS),
    );

    await connectToDatabase();

    // Ownership-aware query: only allow user to end their own session
    const result = await VoiceSession.findOneAndUpdate(
      { _id: sessionId, clerkId },
      { endedAt: new Date(), durationSeconds: sanitizedDuration },
    );

    if (!result) return { success: false, error: "Voice session not found." };
    return { success: true };
  } catch (e) {
    console.error("Error ending voice session", e);
    return {
      success: false,
      error: "Failed to end session. Please try again.",
    };
  }
};
