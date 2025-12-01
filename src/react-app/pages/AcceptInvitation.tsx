import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface InvitationDetails {
  email: string;
  role: string;
  expiresAt: string;
}

const roleLabels: Record<string, string> = {
  citizen: "Citizen",
  field_officer: "Field Officer",
  planner: "Planner",
  admin: "Admin",
  super_admin: "Super Admin",
  stakeholder: "Stakeholder",
};

export function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [name, setName] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link - no token provided");
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/v1/invitations/${token}`);
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || "Invalid invitation");
      }
      const data = await response.json() as InvitationDetails;
      setInvitation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!name.trim() || !token) return;
    setAccepting(true);
    try {
      const response = await fetch("/api/v1/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim() }),
      });
      const data = await response.json() as {
        error?: string;
        session?: { token: string; expiresAt: string };
        user?: { id: string; name: string; email: string; role: string };
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      // Store the session using better-auth's expected format
      // The session token needs to be set as a cookie for better-auth to recognize it
      if (data.session) {
        // Set session cookie - better-auth uses 'better-auth.session_token'
        document.cookie = `better-auth.session_token=${data.session.token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
      }

      setSuccess(true);

      // Redirect to home after a brief delay
      setTimeout(() => {
        // Force a full page reload to ensure auth state is refreshed
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">Welcome!</h2>
              <p className="mt-2 text-gray-500">
                Your account has been created successfully. Redirecting you to the dashboard...
              </p>
              <Loader2 className="w-5 h-5 animate-spin mx-auto mt-4 text-primary-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                {error.includes("expired") ? (
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <h2 className="mt-4 text-xl font-semibold text-red-600 dark:text-red-400">
                {error.includes("expired") ? "Invitation Expired" : "Invalid Invitation"}
              </h2>
              <p className="mt-2 text-gray-500">{error}</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => navigate("/")}
              >
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited to join Sri Lanka Road Status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitation && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Email</span>
                  <span className="font-medium">{invitation.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Role</span>
                  <span className="font-medium">
                    {roleLabels[invitation.role] || invitation.role}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={accepting}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={accepting || !name.trim()}
              >
                {accepting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Accept & Create Account
              </Button>

              <p className="text-xs text-center text-gray-500">
                By accepting, you agree to join the platform with the role shown above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
