"use client";

import { useState } from "react";

interface Props {
  images: string[];
  propertyName: string;
}

export default function PhotoGallery({ images, propertyName }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const validImages = images.filter((_, i) => !failedImages.has(i));
  if (validImages.length === 0) return null;

  // Map selected index to the actual image in the original array
  const visibleIndices = images
    .map((_, i) => i)
    .filter((i) => !failedImages.has(i));
  const currentOriginalIndex = visibleIndices[selectedIndex] ?? visibleIndices[0];

  const handleError = (originalIndex: number) => {
    setFailedImages((prev) => {
      const next = new Set(prev);
      next.add(originalIndex);
      return next;
    });
    // Adjust selected index if needed
    if (originalIndex === currentOriginalIndex && selectedIndex > 0) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const goNext = () => {
    setSelectedIndex((prev) => (prev + 1) % validImages.length);
  };

  const goPrev = () => {
    setSelectedIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">物件写真</h3>

      {/* メイン画像 */}
      <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[currentOriginalIndex]}
          alt={`${propertyName} - 写真${selectedIndex + 1}`}
          className="w-full h-full object-contain"
          onError={() => handleError(currentOriginalIndex)}
        />
        {validImages.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="前の写真"
            >
              &#8249;
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="次の写真"
            >
              &#8250;
            </button>
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              {selectedIndex + 1} / {validImages.length}
            </div>
          </>
        )}
      </div>

      {/* サムネイル一覧 */}
      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {visibleIndices.map((origIdx, visIdx) => (
            <button
              key={origIdx}
              onClick={() => setSelectedIndex(visIdx)}
              className={`shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                visIdx === selectedIndex
                  ? "border-blue-500"
                  : "border-transparent hover:border-gray-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[origIdx]}
                alt={`サムネイル${visIdx + 1}`}
                className="w-full h-full object-cover"
                onError={() => handleError(origIdx)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
