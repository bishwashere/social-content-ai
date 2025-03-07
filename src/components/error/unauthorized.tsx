import GoogleLoginButton from "../common/google-login-button";

export default function UnauthorizedError() {
  return (
    <div className="h-dvh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] font-bold leading-tight">
          Login
        </h1>
        <p className="text-center text-muted-foreground">
          Please log in to access this
          resource.
        </p>
        <div className="mt-6 flex gap-4">
          <GoogleLoginButton triggerClassName="min-w-32" />
        </div>
      </div>
    </div>
  );
}