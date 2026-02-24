import { Suspense } from "react";
import SignInForm from "./SignInForm";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="animate-pulse bg-muted rounded-xl h-96" />}>
      <SignInForm />
    </Suspense>
  );
}
