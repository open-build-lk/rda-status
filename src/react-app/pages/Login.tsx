import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Mail, ArrowLeft, Loader2 } from "lucide-react";

export function Login() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const {
    sendMagicLink,
    isLoading,
    error,
    clearError,
    magicLinkSent,
    magicLinkEmail,
    resetMagicLinkState,
  } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMagicLink(email, isNewUser ? name : undefined);
  };

  const handleTryAgain = () => {
    resetMagicLinkState();
    setEmail("");
    setName("");
    setIsNewUser(false);
  };

  // Success state - magic link sent
  if (magicLinkSent && magicLinkEmail) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription className="text-base">
              We sent a sign-in link to
            </CardDescription>
            <p className="mt-2 font-medium text-gray-900">{magicLinkEmail}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-gray-500">
              Click the link in the email to sign in. The link will expire in 5
              minutes.
            </p>
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              <p>
                <strong>Tip:</strong> Check your spam folder if you don't see
                the email.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleTryAgain}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Use a different email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <MapPin className="h-6 w-6 text-primary-600" />
          </div>
          <CardTitle className="text-2xl">
            {isNewUser ? "Create an account" : "Sign in"}
          </CardTitle>
          <CardDescription>
            {isNewUser
              ? "Enter your details to get started"
              : "Enter your email to receive a sign-in link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
                <button
                  type="button"
                  onClick={clearError}
                  className="ml-2 text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {isNewUser && (
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isNewUser}
                  autoComplete="name"
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {isNewUser ? "Create account" : "Send sign-in link"}
                </>
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500 dark:bg-gray-950">
                  or
                </span>
              </div>
            </div>

            {isNewUser ? (
              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsNewUser(false)}
                  className="font-medium text-primary-600 hover:underline"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-center text-sm text-gray-500">
                New to Sri Lanka Road Status?{" "}
                <button
                  type="button"
                  onClick={() => setIsNewUser(true)}
                  className="font-medium text-primary-600 hover:underline"
                >
                  Create an account
                </button>
              </p>
            )}

            <p className="text-center text-xs text-gray-400">
              No password needed. We'll email you a secure link.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
