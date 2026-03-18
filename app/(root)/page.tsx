import BookCard from "@/components/BookCard";
import HeroSectionSection from "@/components/HeroSection";
import { sampleBooks } from "@/lib/constants";
import React from "react";

const page = async () => {
  return (
    <main className="wrapper container">
      <HeroSectionSection />
      <div className="library-books-grid">
        {sampleBooks.map((book) => (
          <BookCard
            key={book._id}
            title={book.title}
            author={book.author}
            coverURL={book.coverURL}
            slug={book.slug}
          />
        ))}
      </div>
    </main>
  );
};

export default page;
