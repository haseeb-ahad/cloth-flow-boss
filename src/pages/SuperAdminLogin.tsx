import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Lock, User, Sparkles, Eye, EyeOff } from "lucide-react";

const SUPER_ADMIN_USERNAME = "superadmin";
const DEFAULT_SUPER_ADMIN_PASSWORD = "admin@super123978cv";

const getSuperAdminPassword = () => {
  return localStorage.getItem("superAdminPassword") || DEFAULT_SUPER_ADMIN_PASSWORD;
};

const SuperAdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate authentication delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (username === SUPER_ADMIN_USERNAME && password === getSuperAdminPassword()) {
      localStorage.setItem("superAdminAuth", "true");
      // Store the current password if not already stored (first login)
      if (!localStorage.getItem("superAdminPassword")) {
        localStorage.setItem("superAdminPassword", DEFAULT_SUPER_ADMIN_PASSWORD);
      }
      
      // Generate or retrieve a consistent super admin user ID for notifications
      let superAdminUserId = localStorage.getItem("superAdminUserId");
      if (!superAdminUserId) {
        superAdminUserId = crypto.randomUUID();
        localStorage.setItem("superAdminUserId", superAdminUserId);
      }
      
      toast.success("Welcome, Super Admin!");
      navigate("/super-admin");
    } else {
      toast.error("Invalid credentials");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-100/40 to-purple-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-100/40 to-yellow-100/40 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Super Admin Portal</h1>
          <p className="text-slate-500 mt-1">System Administration Access</p>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your super admin credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700 font-medium">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Access Dashboard
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-center text-slate-400">
                Protected system access. Unauthorized attempts are logged.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Store Login */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            className="text-slate-500 hover:text-slate-700"
            onClick={() => navigate("/login")}
          >
            ← Back to Store Admin Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
