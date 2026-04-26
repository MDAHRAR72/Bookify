"use client";

import React from "react";
import { voiceCategories, voiceOptions } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { VoiceSelectorProps } from "@/types";

const VoiceSelector = ({
  value,
  onChange,
  disabled,
  className,
}: VoiceSelectorProps) => {
  const groups = [
    { label: "Male Voices", ids: voiceCategories.male },
    { label: "Female Voices", ids: voiceCategories.female },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="space-y-6"
      >
        {groups.map((group) => (
          <div key={group.label} className="space-y-3">
            <h4 className="text-sm font-medium text-(--text-secondary)">
              {group.label}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {group.ids.map((voiceId) => {
                const voice =
                  voiceOptions[voiceId as keyof typeof voiceOptions];
                const isSelected = value === voiceId;
                return (
                  <div key={voiceId}>
                    <RadioGroupItem
                      value={voiceId}
                      id={voiceId}
                      className="sr-only peer"
                    />
                    <label
                      htmlFor={voiceId}
                      className={cn(
                        "voice-selector-option block cursor-pointer h-full",
                        "peer-focus-visible:ring-2 peer-focus-visible:ring-(--accent-warm)",
                        isSelected
                          ? "voice-selector-option-selected"
                          : "voice-selector-option-default",
                        disabled && "voice-selector-option-disabled",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-1 w-5 h-5 shrink-0 rounded-full border flex items-center justify-center cursor-pointer",
                            isSelected
                              ? "border-[#212a3b] bg-[#212a3b]"
                              : "border-gray-300",
                          )}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="flex flex-col text-left">
                          <p className="font-bold text-[#212a3b] leading-tight">
                            {voice.name}
                          </p>
                          <p className="text-xs text-(--text-secondary) mt-1 leading-snug">
                            {voice.description}
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export default VoiceSelector;
