"use client";

import { loginUser } from "@/actions/loginUser";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoginSchema } from "@/validaton-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { FormError } from "../form-error";
import { FormSuccess } from "../form-success";

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const [error, setError] = useState<string | undefined>(undefined);
  const [isRedirecting, setIsRedirecting] = useState<boolean | undefined>(
    undefined
  );
  const [success, setSuccess] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: z.infer<typeof LoginSchema>) {
    if (isPending || isRedirecting) return;

    setError(undefined);
    setSuccess(undefined);

    try {
      startTransition(async () => {
        const result = await loginUser(data);

        if (result?.error) {
          setError(result.error);
          return;
        }

        if (result?.success) {
          setSuccess(result.success);

          if (result.redirectTo) {
            setIsRedirecting(true);
            await new Promise((resolve) => setTimeout(resolve, 500));
            window.location.href = result.redirectTo;
          }
        }
      });
    } catch (e) {
      console.error("Login error:", e);
      setError("Authentication failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Decorative with Pink Gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-secondary">
          {/* Decorative circles */}
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-16 text-black">
          <div className="max-w-md space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">
                Welcome to She At Work
              </span>
            </div>

            <h2 className="text-5xl font-bold leading-tight">
              Empowering Women in the Workplace
            </h2>

            <p className="text-lg text-black">
              Join thousands of professionals building their careers and
              connecting with opportunities that matter.
            </p>

            <div className="space-y-4 pt-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-black"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Career Growth</h3>
                  <p className="text-black text-sm">
                    Access exclusive opportunities and resources
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-black"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Community</h3>
                  <p className="text-black text-sm">
                    Connect with like-minded professionals
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-black"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Support</h3>
                  <p className="text-black text-sm">
                    Get guidance from experienced mentors
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 py-2">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="text-center ">
            <Link href="/" className="inline-block">
              <div
                className="inline-flex items-center justify-center 
                    w-36 h-28 sm:w-44 sm:h-36 md:w-52 md:h-44
                    transition-shadow"
              >
                <Image
                  alt="She At Work"
                  src="/logo.png"
                  width={180}
                  height={180}
                  className="rounded-lg object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-[#D5B5A9]/30">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="text-md font-semibold text-[#2C2A2D] mb-2">
                        Email Address
                      </div>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="john.snow@gmail.com"
                          className="h-11 px-4  border-[#D5B5A9] rounded-xl focus:ring-2 focus:ring-[#CF2554] focus:border-transparent transition-all"
                          type="email"
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage className="text-sm text-[#CF2554]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="text-md font-semibold text-[#2C2A2D] mb-2">
                        Password
                      </div>
                      <div className="relative">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="••••••••"
                            className="h-11 px-4 pr-12  border-[#D5B5A9] rounded-xl focus:ring-2 focus:ring-[#CF2554] focus:border-transparent transition-all"
                            type={showPassword ? "text" : "password"}
                            disabled={isPending}
                          />
                        </FormControl>
                        <button
                          type="button"
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2C2A2D]/50 hover:text-[#2C2A2D] transition-colors"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                      <FormMessage className="text-sm text-[#CF2554]" />
                    </FormItem>
                  )}
                />

                {/* <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      className="rounded border-[#D5B5A9] text-[#CF2554] focus:ring-[#CF2554] cursor-pointer w-4 h-4"
                      disabled={isPending}
                    />
                    <span className="ml-2 text-sm text-[#2C2A2D] group-hover:text-[#CF2554] transition-colors">
                      Remember me
                    </span>
                  </label>
                  <Button
                    asChild
                    variant="link"
                    size="sm"
                    className="px-0 text-sm text-[#CF2554] hover:text-[#E64B78] font-medium"
                  >
                    <Link href="/auth/forgot-password">Forgot password?</Link>
                  </Button>
                </div> */}

                <FormError message={error} />
                <FormSuccess message={success} />

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 bg-gradient-to-r from-[#CF2554] to-[#E64B78] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm shadow-md"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </button>

               
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
