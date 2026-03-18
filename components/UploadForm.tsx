"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import LoadingOverlay from "./LoadingOverlay";

const formSchema = z.object({
  pdfFile: z
    .any()
    .refine((file) => file instanceof File, "PDF file is required"),
  coverImage: z.any().optional(),
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author name is required"),
  voice: z.string().min(1, "Please choose a voice"),
});

const voices = [
  {
    group: "Male Voices",
    options: [
      {
        id: "dave",
        name: "Dave",
        description: "Young male, British-Essex, casual & conversational",
      },
      {
        id: "daniel",
        name: "Daniel",
        description: "Middle-aged male, British, authoritative but warm",
      },
      { id: "chris", name: "Chris", description: "Male, casual & easy-going" },
    ],
  },
  {
    group: "Female Voices",
    options: [
      {
        id: "rachel",
        name: "Rachel",
        description: "Young female, American, calm & clear",
      },
      {
        id: "sarah",
        name: "Sarah",
        description: "Young female, American, soft & approachable",
      },
    ],
  },
];

const UploadForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [coverName, setCoverName] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      author: "",
      voice: "rachel",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    console.log(values);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsSubmitting(false);
  };

  const handlePdfChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (file: File | null) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfName(file.name);
      onChange(file);
    }
  };

  const handleCoverChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (file: File | null) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverName(file.name);
      onChange(file);
    }
  };

  return (
    <>
      {isSubmitting && <LoadingOverlay />}
      <div className="new-book-wrapper">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* PDF File Upload */}
            <FormField
              control={form.control}
              name="pdfFile"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel className="form-label">Book PDF File</FormLabel>
                  <FormControl>
                    <div className="relative">
                      {pdfName ? (
                        <div className="upload-dropzone upload-dropzone-uploaded">
                          <div className="flex items-center justify-between w-full px-4">
                            <span className="truncate font-medium">
                              {pdfName}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPdfName(null);
                                onChange(null);
                              }}
                              className="upload-dropzone-remove"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          className={cn(
                            "upload-dropzone cursor-pointer transition-all",
                            // APPLY ERROR CLASS HERE
                            form.formState.errors.pdfFile && "dropzone-error",
                          )}
                        >
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => handlePdfChange(e, onChange)}
                            {...rest}
                          />
                          <Upload className="upload-dropzone-icon" />
                          <span className="upload-dropzone-text">
                            Click to upload PDF
                          </span>
                          <span className="upload-dropzone-hint">
                            PDF file (max 50MB)
                          </span>
                        </label>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover Image Upload */}
            <FormField
              control={form.control}
              name="coverImage"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel className="form-label">
                    Cover Image (Optional)
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      {coverName ? (
                        <div className="upload-dropzone upload-dropzone-uploaded">
                          <div className="flex items-center justify-between w-full px-4">
                            <span className="truncate font-medium">
                              {coverName}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCoverName(null);
                                onChange(null);
                              }}
                              className="upload-dropzone-remove"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="upload-dropzone cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleCoverChange(e, onChange)}
                            {...rest}
                          />
                          <ImageIcon className="upload-dropzone-icon" />
                          <span className="upload-dropzone-text">
                            Click to upload cover image
                          </span>
                          <span className="upload-dropzone-hint">
                            Leave empty to auto-generate from PDF
                          </span>
                        </label>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="form-label">Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ex: Rich Dad Poor Dad"
                      className={cn(
                        "form-input",
                        form.formState.errors.title && "input-error",
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Author Input */}
            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="form-label">Author Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ex: Robert Kiyosaki"
                      className={cn(
                        "form-input",
                        form.formState.errors.author && "input-error",
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Voice Selector */}
            <FormField
              control={form.control}
              name="voice"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="form-label">
                    Choose Assistant Voice
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="space-y-6"
                    >
                      {voices.map((group) => (
                        <div key={group.group} className="space-y-3">
                          <h4 className="text-sm font-medium text-[var(--text-secondary)]">
                            {group.group}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {group.options.map((option) => (
                              <FormItem key={option.id} className="space-y-0">
                                <FormControl>
                                  <RadioGroupItem
                                    value={option.id}
                                    className="hidden"
                                    id={option.id}
                                  />
                                </FormControl>
                                <label
                                  htmlFor={option.id}
                                  className={cn(
                                    "voice-selector-option block cursor-pointer h-full",
                                    field.value === option.id
                                      ? "voice-selector-option-selected"
                                      : "voice-selector-option-default",
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    {/* Custom Radio Circle */}
                                    <div
                                      className={cn(
                                        "mt-1 w-[20px] h-[20px] shrink-0 rounded-full border flex items-center justify-center cursor-pointer",
                                        field.value === option.id
                                          ? "border-[#212a3b] bg-[#212a3b]"
                                          : "border-gray-300",
                                      )}
                                    >
                                      {field.value === option.id && (
                                        <div className="w-[10px] h-[10px] rounded-full bg-white" />
                                      )}
                                    </div>
                                    {/* Text Content */}
                                    <div className="flex flex-col text-left">
                                      <p className="font-bold text-[#212a3b] leading-tight">
                                        {option.name}
                                      </p>
                                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-snug">
                                        {option.description}
                                      </p>
                                    </div>
                                  </div>
                                </label>
                              </FormItem>
                            ))}
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <button type="submit" className="form-btn">
              Begin Synthesis
            </button>
          </form>
        </Form>
      </div>
    </>
  );
};

export default UploadForm;
