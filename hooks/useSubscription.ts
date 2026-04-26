"use client";

import { useAuth } from "@clerk/nextjs";
import { PLANS, PLAN_LIMITS, PlanType } from "@/lib/subscription-constants";

export const useSubscription = () => {
  const { has, isLoaded } = useAuth();

  if (!isLoaded) {
    return {
      plan: PLANS.FREE,
      limits: PLAN_LIMITS[PLANS.FREE],
      isLoaded: false,
    };
  }

  let plan: PlanType = PLANS.FREE;

  // Use Clerk's has() helper - matches server-side logic
  if (has?.({ plan: "premium" })) {
    plan = PLANS.PREMIUM;
  } else if (has?.({ plan: "standard" })) {
    plan = PLANS.STANDARD;
  }

  return {
    plan,
    limits: PLAN_LIMITS[plan],
    isLoaded: true,
  };
};
