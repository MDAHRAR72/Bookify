"use client";

import Image from "next/image";
import React from "react";

const LoadingOverlay = () => {
  return (
    <div className="loading-wrapper">
      <div className="bg-white loading-shadow-wrapper">
        <div className="loading-shadow">
          <Image
            src="/assets/loader.png"
            alt="Loading..."
            width={80}
            height={80}
            className="loading-animation"
          />
          <div className="text-center space-y-2">
            <h2 className="loading-title">Synthesizing Your Book</h2>
            <p className="text-(--text-secondary)">
              This will take a few moments. Please don&apos;t close this page.
            </p>
          </div>
          <div className="loading-progress">
            <div className="loading-progress-item">
              <div className="loading-progress-status" />
              <span className="text-(--text-secondary)">
                Analyzing PDF content...
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
