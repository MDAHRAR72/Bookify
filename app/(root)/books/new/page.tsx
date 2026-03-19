import UploadForm from "@/components/UploadForm";
import React from "react";

const page = () => {
  return (
    <main className="min-h-screen pt-32">
      <div className="wrapper">
        <div className="text-center space-y-4 mb-10">
          <h1 className="page-title-xl">Add New Book</h1>
          <p className="subtitle max-w-2xl mx-auto">
            Upload your book in PDF format and choose an AI voice assistant to help you learn and discuss the content.
          </p>
        </div>
        <UploadForm />
      </div>
    </main>
  );
};

export default page;
