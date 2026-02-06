"use client";

interface InfoPageProps {
  title: string;
  description?: string;
  showImagePlaceholder?: boolean;
  imagePath?: string;
  universityLogo?: string | null;
}

export default function InfoPage({
  title,
  description,
  showImagePlaceholder = false,
  imagePath,
  universityLogo,
}: InfoPageProps) {
  return (
    <div className="flex flex-col items-center gap-6 ">
      {universityLogo && (
        <div className="overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={universityLogo}
            alt="University logo"
            className="w-full h-full object-fill p-2"
          />
        </div>
      )}
      <div className="text-center">
        {/* <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2> */}
        {description && <p className="text-gray-600">{description}</p>}
      </div>

      {imagePath && (
        <div className="w-full max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePath}
            alt={title || "Onboarding illustration"}
            className="w-full h-auto rounded-2xl"
          />
        </div>
      )}

      {showImagePlaceholder && !imagePath && (
        <div className="w-full max-w-md aspect-video bg-[#F9F9FB] border-2 border-dashed border-[#E6E6E6] rounded-2xl flex items-center justify-center">
          <span className="text-gray-400 text-sm">Image placeholder</span>
        </div>
      )}
    </div>
  );
}
