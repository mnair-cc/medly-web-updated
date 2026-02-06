import Link from "next/link";

export const TermsAgreement = () => (
  <p className="md:w-8/12 mx-auto text-center text-[14px] mt-4 opacity-80">
    By signing up, you agree to the{" "}
    <Link
      href={`https://medlyai.com/uk/terms`}
      className="underline"
    >
      Terms of Use
    </Link>{" "}
    and the{" "}
    <Link
      href={`https://medlyai.com/uk/privacy`}
      className="underline"
    >
      Privacy Notice
    </Link>
  </p>
);
