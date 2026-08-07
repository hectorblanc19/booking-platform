"use client";

export default function HomeWrapper({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {children}
      </div>
    </div>
  );
}
