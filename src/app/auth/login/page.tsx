import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-normal text-neutral-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm sm:text-base font-light text-neutral-700">
            Access your cooperative tracking dashboard
          </p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
