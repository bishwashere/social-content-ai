import GoogleLoginButton from "../common/auth/google-login-button";

export default function UnauthorizedError() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 p-2">
        <GoogleLoginButton triggerClassName="min-w-32" />
      </div>
    </div>
  );
}
