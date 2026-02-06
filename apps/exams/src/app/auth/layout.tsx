import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { headers } from "next/headers";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const headersList = headers();
  const host = headersList.get("host");
  const isOpenPlatform = host?.includes("open.medlyai.com") || false;

  return (
    <div className={`min-h-screen flex flex-col ${isOpenPlatform ? "open-platform" : "regular-platform"}`}>
      <header className="p-6">
        <Link href={isOpenPlatform ? "/open" : `${process.env.NEXT_PUBLIC_LANDING_URL}`} target="_self">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fopen%2FMedly_Logotype_Black.png?alt=media&token=cbe41bcb-ac19-4c3b-a765-a4fc4c3b298b"
            alt="Medly Logo"
            height={20}
            width={140}
            priority
          />
        </Link>
      </header>
      <div className="flex-1 flex items-stretch justify-center gap-8 px-8 md:pl-16">
        <div className="md:w-1/2 flex flex-col items-center justify-center">
          <div className="max-w-md w-full flex flex-col gap-4">{children}</div>
        </div>

        {/* Auth page illustration */}
        <div className="hidden lg:block w-1/2 flex items-center justify-center relative overflow-hidden bg-[#E6F7FF]/50 rounded-[24px]">
          <div className="w-[100%] h-[80%] absolute top-1/2 left-1/2 transform -translate-x-[40%] -translate-y-1/2 flex items-center justify-center rounded-[8px]">
            <Image
              src={isOpenPlatform
                ? "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fopen%2Fmedly_open_platform.png?alt=media&token=27068e9e-688e-4dd9-ae80-7845c4e35699"
                : "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fmedly_illustration.png?alt=media&token=4f89d069-36b6-485d-9be8-e82105999c10"}
              alt="A preview of the Medly web app"
              fill
              // width={1000}
              // height={1000}
              className="object-cover object-left-top rounded-[8px]"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
