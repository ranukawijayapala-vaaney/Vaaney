import { useState } from "react";
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
import { UserPlus, ArrowLeft, ShoppingCart, Store } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Separator } from "@/components/ui/separator";

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["buyer", "seller"], {
    required_error: "Please select a role",
  }),
  // Seller profile fields (conditionally required)
  contactNumber: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountHolderName: z.string().optional(),
  bankSwiftCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // Validate seller fields are provided if role is seller
  if (data.role === "seller") {
    return Boolean(
      data.contactNumber && 
      data.streetAddress && 
      data.city && 
      data.postalCode && 
      data.country && 
      data.bankName && 
      data.bankAccountNumber && 
      data.bankAccountHolderName
    );
  }
  return true;
}, {
  message: "All seller profile fields are required",
  path: ["contactNumber"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function Signup() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [step, setStep] = useState<"role" | "form">("role");
  const [selectedRole, setSelectedRole] = useState<"buyer" | "seller" | null>(null);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      role: "buyer",
      contactNumber: "",
      streetAddress: "",
      city: "",
      postalCode: "",
      country: "",
      bankName: "",
      bankAccountNumber: "",
      bankAccountHolderName: "",
      bankSwiftCode: "",
    },
  });

  const handleRoleSelect = (role: "buyer" | "seller") => {
    setSelectedRole(role);
    form.setValue("role", role);
    setStep("form");
  };

  const onSubmit = async (data: SignupFormData) => {
    // Validate document upload for sellers only
    if (data.role === "seller" && selectedFiles.length === 0) {
      toast({
        title: "Documents required",
        description: "Sellers must upload verification documents to complete registration",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("firstName", data.firstName);
      formData.append("lastName", data.lastName);
      formData.append("role", data.role);
      
      // Add seller profile fields if role is seller
      if (data.role === "seller") {
        formData.append("contactNumber", data.contactNumber || "");
        formData.append("streetAddress", data.streetAddress || "");
        formData.append("city", data.city || "");
        formData.append("postalCode", data.postalCode || "");
        formData.append("country", data.country || "");
        formData.append("bankName", data.bankName || "");
        formData.append("bankAccountNumber", data.bankAccountNumber || "");
        formData.append("bankAccountHolderName", data.bankAccountHolderName || "");
        formData.append("bankSwiftCode", data.bankSwiftCode || "");
      }
      
      // Add document files for all users
      selectedFiles.forEach((file) => {
        formData.append("documents", file);
      });

      const response = await fetch("/api/signup", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Signup failed");
      }

      const result = await response.json();
      
      toast({ 
        title: "Account created successfully!",
        description: result.message || "Please check your email to verify your account before logging in."
      });
      
      // Redirect to login
      window.location.href = "/login";
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleBackToRoleSelection = () => {
    setStep("role");
    setSelectedRole(null);
  };

  if (step === "role") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="text-2xl font-bold">Join Vaaney</CardTitle>
                <CardDescription className="mt-1">
                  First, tell us what you want to do
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card
                className="cursor-pointer transition-all hover-elevate active-elevate-2 border-2"
                onClick={() => handleRoleSelect("buyer")}
                data-testid="card-role-buyer"
              >
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">I want to buy</h3>
                    <p className="text-sm text-muted-foreground">
                      Browse and purchase products and services from verified sellers
                    </p>
                  </div>
                  <Button className="w-full" data-testid="button-select-buyer">
                    Continue as Buyer
                  </Button>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover-elevate active-elevate-2 border-2"
                onClick={() => handleRoleSelect("seller")}
                data-testid="card-role-seller"
              >
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">I want to sell</h3>
                    <p className="text-sm text-muted-foreground">
                      List and sell your products and services to buyers in the Maldives
                    </p>
                  </div>
                  <Button className="w-full" data-testid="button-select-seller">
                    Continue as Seller
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToRoleSelection}
              data-testid="button-back-to-role"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <CardTitle className="text-2xl font-bold">
                Create {selectedRole === "buyer" ? "Buyer" : "Seller"} Account
              </CardTitle>
              <CardDescription>
                Enter your information to get started
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          {...field}
                          data-testid="input-firstname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          {...field}
                          data-testid="input-lastname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedRole === "seller" && (
                <>
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold">Contact Information</h3>
                    
                    <FormField
                      control={form.control}
                      name="contactNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number *</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+94 11 234 5678"
                              {...field}
                              data-testid="input-contact-number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="streetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123 Galle Road"
                              {...field}
                              data-testid="input-street-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Colombo"
                                {...field}
                                data-testid="input-city"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="00100"
                                {...field}
                                data-testid="input-postal-code"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Sri Lanka"
                              {...field}
                              data-testid="input-country"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold">Bank Details (For Payments)</h3>
                    
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Bank of Ceylon"
                              {...field}
                              data-testid="input-bank-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankAccountHolderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Holder Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nimal Perera"
                              {...field}
                              data-testid="input-bank-account-holder"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankAccountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="1234567890"
                              {...field}
                              data-testid="input-bank-account-number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankSwiftCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SWIFT/BIC Code (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="BCEYLKLX"
                              {...field}
                              data-testid="input-bank-swift-code"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {selectedRole === "seller" && (
                <div className="space-y-2 pt-4 border-t">
                  <FormLabel>Verification Documents *</FormLabel>
                  <div className="border-2 border-dashed rounded-lg p-4">
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      data-testid="input-documents"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Upload ID, passport, or other verification documents (PDF, JPG, PNG)
                    </p>
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-medium">Selected files:</p>
                        {selectedFiles.map((file, index) => (
                          <p key={index} className="text-xs text-muted-foreground">
                            • {file.name} ({(file.size / 1024).toFixed(1)} KB)
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-signup"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>

          {selectedRole === "buyer" && (
            <>
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
                data-testid="button-google-signup"
              >
                <SiGoogle className="h-4 w-4 mr-2" />
                Sign up with Google
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Google sign-up is available for buyers only
              </p>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
