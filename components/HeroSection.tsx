import Image from "next/image";
import Link from "next/link";

const HeroSection = () => {
  return (
    <section className="wrapper mt-10 md:mb-16">
      <div className="library-hero-card">
        <div className="library-hero-content">
          {/* Left Section */}
          <div className="library-hero-text">
            <h1 className="library-hero-title text-4xl font-serif font-bold">
              Your Library
            </h1>
            <p className="library-hero-description">
              Convert your books into interactive AI conversations.
              <br className="hidden md:block" /> Listen, learn, and discuss your
              favorite reads.
            </p>
            <Link
              href="/books/new"
              className="library-cta-primary mt-4 flex items-center justify-center"
            >
              <span className="text-3xl font-light mb-1 mr-2">+</span>
              <span className="text-[#212a3b]">Add new book</span>
            </Link>
          </div>

          {/* Center Section - Illustration */}
          <div className="library-hero-illustration-desktop">
            <Image
              src="/assets/hero-illustration.png"
              alt="Vintage books and globe"
              width={400}
              height={400}
              className="object-contain"
              loading="eager"
            />
          </div>

          {/* Center Section - Mobile */}
          <div className="library-hero-illustration">
            <Image
              src="/assets/hero-illustration.png"
              alt="Vintage books and globe"
              width={400}
              height={300}
              className="object-contain"
              loading="eager"
            />
          </div>

          {/* Right Section - Steps Card */}
          <div className="library-steps-card min-w-65 max-w-70 z-10 shadow-soft-md">
            <ul className="space-y-6">
              <li className="library-step-item">
                <div className="library-step-number">1</div>
                <div className="flex flex-col">
                  <h3 className="library-step-title">Upload PDF</h3>
                  <p className="library-step-description">Add your book file</p>
                </div>
              </li>
              <li className="library-step-item">
                <div className="library-step-number">2</div>
                <div className="flex flex-col">
                  <h3 className="library-step-title">AI Processing</h3>
                  <p className="library-step-description">
                    We analyze the content
                  </p>
                </div>
              </li>
              <li className="library-step-item">
                <div className="library-step-number">3</div>
                <div className="flex flex-col">
                  <h3 className="library-step-title">Voice Chat</h3>
                  <p className="library-step-description">Discuss with AI</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
