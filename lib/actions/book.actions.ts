"use server";

import { connectToDatabase } from "@/database/mongoose";
import { auth } from "@clerk/nextjs/server";
import { CreateBook, TextSegment } from "@/types";
import { generateSlug, serializeData } from "../utils";
import Book from "@/database/models/book.model";
import BookSegment from "@/database/models/book-segment.model";

export const getAllBooks = async () => {
  try {
    await connectToDatabase();
    const books = await Book.find().sort({ createdAt: -1 }).lean();
    return {
      success: true,
      data: serializeData(books),
    };
  } catch (e) {
    console.error("Error connecting to database:", e);
    return {
      success: false,
      error: e,
    };
  }
};
export const checkBookExists = async (title: string) => {
  try {
    await connectToDatabase();
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return {
        exists: false,
        error: "Unauthorized",
      };
    }

    const slug = generateSlug(title);

    const existingBook = await Book.findOne({ slug, clerkId }).lean();

    if (existingBook) {
      return {
        exists: true,
        book: serializeData(existingBook),
      };
    }

    return {
      exists: false,
    };
  } catch (e) {
    console.error("Error checking book exists", e);
    return {
      exists: false,
      error: e,
    };
  }
};

export const createBook = async (data: Omit<CreateBook, "clerkId">) => {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return {
        success: false,
        error: "Unauthorized: User not authenticated",
      };
    }

    await connectToDatabase();

    const slug = generateSlug(data.title);

    const existingBook = await Book.findOne({ slug, clerkId }).lean();

    if (existingBook) {
      return {
        success: true,
        data: serializeData(existingBook),
        alreadyExists: true,
      };
    }

    const book = await Book.create({
      ...data,
      slug,
      clerkId,
      totalSegments: 0,
    });

    return {
      success: true,
      data: serializeData(book),
    };
  } catch (e) {
    console.error("Error creating book:", e);
    return {
      success: false,
      error: e,
    };
  }
};

export const saveBookSegments = async (
  bookId: string,
  segments: TextSegment[],
) => {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return {
        success: false,
        error: "Unauthorized: User not authenticated",
      };
    }

    await connectToDatabase();

    console.log(`Saving book segments...`);

    const segmentsToInsert = segments.map(
      ({ text, segmentIndex, pageNumber, wordCount }) => ({
        clerkId,
        bookId,
        content: text,
        segmentIndex,
        pageNumber,
        wordCount,
      }),
    );

    await BookSegment.insertMany(segmentsToInsert);

    await Book.findOneAndUpdate(
      { _id: bookId, clerkId },
      { totalSegments: segments.length },
    );

    console.log(`Successfully saved book segments`);

    return {
      success: true,
      data: { segmentsCreated: segments.length },
    };
  } catch (e) {
    console.error("Error saving book segments:", e);

    await BookSegment.deleteMany({ bookId, clerkId: (await auth()).userId });
    await Book.findOneAndDelete({
      _id: bookId,
      clerkId: (await auth()).userId,
    });
    console.log(`Deleted book segments and book due to error saving segments`);

    return {
      success: false,
      error: e,
    };
  }
};
