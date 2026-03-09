import { useAuth } from "../context/AuthContext";
import { LogoutButton } from "./auth/LogoutButton";
import { Card, CardContent } from "./ui/card";

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="w-screen h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <span className="font-semibold">TrueCost</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Welcome to TrueCost — your dashboard is coming soon.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
