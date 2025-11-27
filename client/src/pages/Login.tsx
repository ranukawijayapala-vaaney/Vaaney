import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { LogIn, ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    // Check for Google auth errors in URL
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error === "google_auth_failed") {
      toast({
        title: "Sign-in failed",
        description: "Please try again or sign in with your email and password",
        variant: "destructive",
      });
    }
  }, [location]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setShowResendVerification(false);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Check if the error is due to unverified email
        const errorMessage = (error.message ?? "").toLowerCase();
        if (errorMessage.includes("verify") || errorMessage.includes("email not verified")) {
          setUnverifiedEmail(data.email);
          setShowResendVerification(true);
        }
        
        throw new Error(error.message || "Login failed");
      }

      toast({ title: "Welcome back!" });
      
      // Check for redirect parameter - if present, redirect there after login
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get("redirect");
      
      // Redirect to specified URL or root - router will handle role-based pages
      window.location.href = redirectUrl || "/";
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resend verification email");
      }

      toast({
        title: "Email sent!",
        description: "Please check your inbox for the verification link.",
      });
      setShowResendVerification(false);
    } catch (error: any) {
      toast({
        title: "Failed to resend email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              data-testid="button-back-login"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          </div>
          <CardDescription>
            Enter your email and password to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showResendVerification && (
            <Alert className="mb-4" data-testid="alert-resend-verification">
              <Mail className="h-4 w-4" />
              <AlertTitle>Email Verification Required</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-sm">
                  Your email address hasn't been verified yet. Please check your inbox for the verification link.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  data-testid="button-resend-verification"
                  className="w-full"
                >
                  {isResending ? "Sending..." : "Resend Verification Email"}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-primary hover:underline"
                        data-testid="link-forgot-password"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          data-testid="input-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          {/* Replit Auth for buyers only */}
          <div className="relative my-4">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = "/api/auth/google"}
            data-testid="button-google-signin"
          >
            <SiGoogle className="h-4 w-4 mr-2" />
            Sign in with Google
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Google sign-in is available for buyers only
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-muted-foreground text-center">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline" data-testid="link-signup">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
