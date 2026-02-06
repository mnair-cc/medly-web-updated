import { Header } from "../_components/Header";
import { Form } from "../_components/Form";
import { TermsAgreement } from "../_components/TermsAgreement";

const SignupPage = () => {
  return (
    <>
      <Header
        title="Try Medly for free"
        subtitle={{
          text: "Sign up to get started on your all-in-one exam platform.\n\nAlready have an account?",
          linkText: "Log in",
          linkHref: "/auth/login",
        }}
      />
      <Form formType="signup" />
      <TermsAgreement />
    </>
  );
};

export default SignupPage;
