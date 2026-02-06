import { Header } from "../_components/Header";
import { Form } from "../_components/Form";
import { TermsAgreement } from "../_components/TermsAgreement";
import { headers } from "next/headers";

const LoginPage = () => {
  const headersList = headers();
  const host = headersList.get("host");
  const isOpenPlatform = host?.includes("open.medlyai.com") || false;

  return (
    <>
      <Header
        title={isOpenPlatform ? "Log in" : "Log in"}
        subtitle={{
          text: "Don't have an account?",
          linkText: "Sign up",
          linkHref: "/auth/signup",
        }}
      />
      <Form formType="login" />
      <TermsAgreement />
    </>
  );
};

export default LoginPage;
