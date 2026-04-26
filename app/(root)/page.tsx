import BookCard from "@/components/BookCard";
import HeroSection from "@/components/HeroSection";
import Search from "@/components/Search";
import { getAllBooks } from "@/lib/actions/book.actions";

export const dynamic = "force-dynamic";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) => {
  const { query } = await searchParams;
  const bookResults = await getAllBooks(query);
  const books = bookResults.success ? (bookResults.data ?? []) : [];
  return (
    <main className="wrapper container">
      <HeroSection />
      <Search />
      <div className="library-books-grid mt-3">
        {books.map((book) => (
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

export default Page;
