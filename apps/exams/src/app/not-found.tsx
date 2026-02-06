import Link from "next/link";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full p-8 md:p-4">
        <div>
          <h1 className="text-6xl mb-4 font-rounded-bold">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            It looks like the page you&apos;re looking for doesn&apos;t exist or
            has been moved.
          </p>
          <Link href="/" className="text-blue-500 hover:underline">
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
