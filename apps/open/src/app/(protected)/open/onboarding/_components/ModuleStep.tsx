"use client";

interface ModuleStepProps {
  title: string;
  description?: string;
  moduleName: string;
  onModuleNameChange: (name: string) => void;
  extractedData?: {
    moduleName?: string;
    moduleCode?: string;
    topics?: string[];
  } | null;
}

export const ModuleStep = ({
  title,
  description,
  moduleName,
  onModuleNameChange,
  extractedData,
}: ModuleStepProps) => {
  const hasExtractedData = extractedData && extractedData.moduleName;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <h1 className="text-2xl font-semibold text-center">{title}</h1>
      {description && (
        <p className="text-gray-600 text-center max-w-md">{description}</p>
      )}

      {hasExtractedData ? (
        <div className="w-full max-w-lg bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 block mb-1">
                Module Name
              </label>
              <input
                type="text"
                className="w-full py-3 px-4 border rounded-xl bg-white focus:outline-[#05B0FF] font-medium border-[#E6E6E6]"
                value={moduleName || extractedData.moduleName || ""}
                onChange={(e) => onModuleNameChange(e.target.value)}
              />
            </div>
            {extractedData.moduleCode && (
              <div>
                <label className="text-sm text-gray-500 block mb-1">
                  Module Code
                </label>
                <p className="font-medium">{extractedData.moduleCode}</p>
              </div>
            )}
            {extractedData.topics && extractedData.topics.length > 0 && (
              <div>
                <label className="text-sm text-gray-500 block mb-1">
                  Topics
                </label>
                <div className="flex flex-wrap gap-2">
                  {extractedData.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white rounded-full text-sm border border-gray-200"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-lg">
          <label className="text-sm text-gray-500 block mb-2">
            Enter your module name
          </label>
          <input
            type="text"
            className="w-full py-5 px-4 border rounded-2xl bg-[#F9F9FB] focus:outline-[#05B0FF] font-medium border-[#E6E6E6]"
            placeholder="e.g. Introduction to Psychology"
            value={moduleName}
            onChange={(e) => onModuleNameChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
};
