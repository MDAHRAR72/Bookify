"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Upload, Image as ImageIcon } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn, parsePDFFile } from "@/lib/utils";
import LoadingOverlay from "./LoadingOverlay";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  checkBookExists,
  createBook,
  saveBookSegments,
} from "@/lib/actions/book.actions";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import VoiceSelector from "./VoiceSelector";
import FileUploader from "./FileUploader";
import { ACCEPTED_IMAGE_TYPES, ACCEPTED_PDF_TYPES } from "@/lib/constants";

const formSchema = z.object({
  pdfFile: z
    .any()
    .refine((file) => file instanceof File, "PDF file is required"),
  coverImage: z.any().optional(),
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author name is required"),
  voice: z.string().min(1, "Please choose a voice"),
});

const UploadForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      author: "",
      voice: "",
      pdfFile: undefined,
      coverImage: undefined,
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!userId) {
      return toast.error("You must be logged in to upload a book.");
    }
    setIsSubmitting(true);
    try {
      const existsCheck = await checkBookExists(data.title);

      if (existsCheck.exists && existsCheck.book) {
        toast.info("A book with this title already exists.");
        form.reset();
        router.push(`/books/${existsCheck.book.slug}`);
        return;
      }

      const fileTitle = data.title.replace(/\s+/g, "_").toLowerCase();
      const pdfFile = data.pdfFile;
      const parsedPDF = await parsePDFFile(pdfFile);

      if (parsedPDF.content.length === 0) {
        toast.error(
          "Failed to parse PDF file. Please ensure it's a valid PDF.",
        );
        return;
      }

      const uploadedPdfBlob = await upload(fileTitle, pdfFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: "application/pdf",
      });

      let coverURL: string;
      let coverBlobPath: string | undefined;

      if (data.coverImage) {
        const coverFile = data.coverImage;
        const uploadedCoverBlob = await upload(
          `${fileTitle}_cover.png`,
          coverFile,
          {
            access: "public",
            handleUploadUrl: "/api/upload",
            contentType: coverFile.type,
          },
        );
        coverURL = uploadedCoverBlob.url;
        coverBlobPath = uploadedCoverBlob.pathname;
      } else {
        const response = await fetch(parsedPDF.cover);
        const blob = await response.blob();
        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, blob, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: "image/png",
        });
        coverURL = uploadedCoverBlob.url;
        coverBlobPath = uploadedCoverBlob.pathname;
      }

      const cleanupBlobs = async () => {
        const paths = [uploadedPdfBlob.pathname, coverBlobPath].filter(
          Boolean,
        ) as string[];

        try {
          await fetch("/api/delete-blob", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pathnames: paths }),
          });
        } catch (cleanupError) {
          console.error("Failed to delete orphaned blobs:", cleanupError);
        }
      };

      const book = await createBook({
        clerkId: userId,
        title: data.title,
        author: data.author,
        voice: data.voice,
        fileURL: uploadedPdfBlob.url,
        fileBlobKey: uploadedPdfBlob.pathname,
        coverURL,
        fileSize: pdfFile.size,
      });

      if (!book.success) {
        await cleanupBlobs();
        toast.error((book.error as string) || "Failed to create book.");
        if (book.isBillingError) {
          router.push("/subscriptions");
        }
        return;
      }

      if (book.alreadyExists) {
        await cleanupBlobs();
        toast.info("A book with this title already exists.");
        form.reset();
        router.push(`/books/${book.data.slug}`);
        return;
      }

      const segments = await saveBookSegments(
        book.data._id,
        userId,
        parsedPDF.content,
      );

      if (!segments.success) {
        toast.error("Failed to save book segments");
        throw new Error("Failed to save book segments");
      }

      form.reset();
      router.push("/");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload book. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return (
    <>
      {isSubmitting && <LoadingOverlay />}
      <div className="new-book-wrapper">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* PDF File Upload */}
            <FileUploader
              control={form.control}
              name="pdfFile"
              label="Book PDF File"
              acceptTypes={ACCEPTED_PDF_TYPES}
              icon={Upload}
              placeholder="Click to upload PDF"
              hint="PDF file (max 50MB)"
              disabled={isSubmitting}
            />

            {/* Cover Image Upload */}
            <FileUploader
              control={form.control}
              name="coverImage"
              label="Cover Image (Optional)"
              acceptTypes={ACCEPTED_IMAGE_TYPES}
              icon={ImageIcon}
              placeholder="Click to upload cover image"
              hint="Leave empty to auto-generate from PDF"
              disabled={isSubmitting}
            />

            {/* Title Input */}
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
                <FormItem>
                  <FormLabel className="form-label">
                    Choose Assistant Voice
                  </FormLabel>
                  <FormControl>
                    <VoiceSelector
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                    />
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
