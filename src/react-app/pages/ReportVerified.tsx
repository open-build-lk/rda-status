import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export function ReportVerified() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportNumber = searchParams.get("report");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md mx-auto pt-8">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Report Verified!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Your report has been verified successfully.
            </p>

            {reportNumber && (
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Report Number: {reportNumber}
              </p>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your report is now confirmed and will be reviewed by our team.
            </p>

            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => navigate("/")}>
                View Map
              </Button>
              <Button onClick={() => navigate("/report")}>
                Report Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
