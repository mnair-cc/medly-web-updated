interface InfoStepProps {
  title: string;
  description?: string;
  imagePlaceholder?: string;
}

export const InfoStep = ({
  title,
  description,
  imagePlaceholder,
}: InfoStepProps) => {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <h1 className="text-2xl font-semibold text-center">{title}</h1>
      {description && (
        <p className="text-gray-600 text-center max-w-md">{description}</p>
      )}
      {imagePlaceholder && (
        <div className="w-full max-w-lg h-64 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
          <span className="text-gray-400 text-sm">[{imagePlaceholder}]</span>
        </div>
      )}
    </div>
  );
};
