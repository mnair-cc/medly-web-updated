interface LoadingStepProps {
  title: string;
}

export const LoadingStep = ({ title }: LoadingStepProps) => {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <h1 className="text-2xl font-semibold text-center">{title}</h1>
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05B0FF]"></div>
      </div>
      <p className="text-gray-500 text-center">
        Extracting information from your document...
      </p>
    </div>
  );
};
