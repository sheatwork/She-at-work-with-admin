/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, Variants } from "framer-motion";
import {
  ArrowRight,
  Award,
  FileText,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
export default function ShareYourStory() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const formContentRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Captcha state
  const [captcha, setCaptcha] = useState("");
  const [userCaptcha, setUserCaptcha] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
    story: "",
  });

  // Generate random captcha
  const generateCaptcha = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
    setUserCaptcha("");
    setCaptchaError("");
  };

  // Auto-scroll to form on page load with animation
  useEffect(() => {
    // Generate initial captcha
    generateCaptcha();

    // Auto-scroll to form after page loads
    const timer = setTimeout(() => {
      if (formContainerRef.current && !hasScrolled) {
        // Get the exact position of the form content (not just the container)
        const formElement = formContentRef.current;
        if (formElement) {
          const elementTop = formElement.offsetTop;
          const offset = 100; // Adjust this value to control how much of the form is visible

          // Scroll to the form with smooth animation
          window.scrollTo({
            top: elementTop - offset,
            behavior: "smooth",
          });

          // Add animation class to form
          formElement.classList.add("form-entrance");

          // Add animation class to specific form fields for sequential animation
          const formInputs = formElement.querySelectorAll(".form-input");
          formInputs.forEach((input, index) => {
            (input as HTMLElement).style.animationDelay = `${index * 0.1}s`;
            input.classList.add("animate-input");
          });

          setHasScrolled(true);
        }
      }
    }, 300); // Increased delay to ensure page is fully loaded

    return () => clearTimeout(timer);
  }, [hasScrolled]);

  // Focus on first input field after scroll
  useEffect(() => {
    if (hasScrolled && formContainerRef.current) {
      const firstInput = formContainerRef.current.querySelector(
        'input[name="name"]',
      ) as HTMLInputElement;
      if (firstInput) {
        // Small delay to ensure scroll is complete
        setTimeout(() => {
          firstInput.focus();
        }, 800);
      }
    }
  }, [hasScrolled]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateCaptcha = () => {
    if (userCaptcha !== captcha) {
      setCaptchaError("Captcha doesn't match. Please try again.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate captcha
    if (!validateCaptcha()) {
      return;
    }

    setLoading(true);
    setError(null);
    setCaptchaError("");

    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          captchaVerified: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setSuccess(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        title: "",
        story: "",
      });
      setUserCaptcha("");
      // Generate new captcha on successful submission
      generateCaptcha();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      // Also generate new captcha on error
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const bannerVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    },
  };
  const bannerSubtitleVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <main className="bg-background min-h-screen">
      <section className="relative h-[480px] md:h-[600px] lg:h-[470px] overflow-hidden pt-24">
        <div className="absolute inset-0" style={{ top: 96 }}>
          <div className="block lg:hidden relative w-full h-full">
            <Image
              src="/shareyourstory/Mobile Share your story.webp"
              alt="News Banner"
              fill
              className="object-cover object-center"
              priority
              sizes="(max-width: 1024px) 100vw"
            />
          </div>
          <div className="hidden lg:block relative w-full h-full">
            <Image
              src="/shareyourstory/finalshareyourstorybanner.webp"
              alt="News Banner"
              fill
              className="object-cover object-center"
              priority
              sizes="(min-width: 1024px) 100vw"
            />
          </div>
        </div>

        {/* ✅ Text Centered Inside Gradient */}
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl px-2 sm:px-6 lg:px-8 -mt-40 lg:mt-0">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={bannerVariants}
              >
                <h1 className="text-white leading-tight">
                  <span className="block text-3xl sm:text-4xl lg:text-5xl font-bold">
                    Share Your Entrepreneurial Journey Inspire Our Community
                  </span>
                </h1>
              </motion.div>

              <motion.p
                initial="hidden"
                animate="visible"
                variants={bannerSubtitleVariants}
                className="mt-2 sm:mt-6 text-sm sm:text-base md:text-xl text-white/90 leading-relaxed max-w-xl"
              >
                Your story has the power to inspire the next generation of women
                entrepreneurs. Join our community of 975+ published stories and
                make your voice heard.
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT ================= */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* ================= LEFT COLUMN - INSPIRATION ================= */}
            <div className="lg:col-span-1 space-y-8">
              {/* Why Share Section */}
              <div className="bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 border-2 border-border hover:border-primary/30">
                <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                </div>

                <div className="mt-8 sm:mt-10 lg:mt-12">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-display font-bold text-foreground mb-2 sm:mb-3">
                    Why Share Your Story?
                  </h3>

                  <div className="space-y-6 mt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">
                          Inspire Others
                        </h4>
                        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground leading-relaxed">
                          Your journey can motivate fellow entrepreneurs facing
                          similar challenges.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">
                          Build Your Legacy
                        </h4>
                        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground leading-relaxed">
                          Become part of our growing collection of success
                          stories.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">
                          Gain Visibility
                        </h4>
                        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground leading-relaxed">
                          Share your business with 50K+ members and potential
                          collaborators.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Testimonial */}
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-primary/20">
                <div className="text-primary mb-3">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm lg:text-base italic text-foreground mb-4 leading-relaxed">
                  &quot;Sharing my story on She At Work connected me with
                  amazing mentors and opened doors I never imagined. Your story
                  matters!&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-accent" />
                  <div>
                    <div className="font-semibold text-xs sm:text-sm text-foreground">
                      Sarah Chen
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Founder - BloomTech
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-border">
                <h3 className="text-lg sm:text-xl font-display font-bold text-foreground mb-3 sm:mb-4">
                  Writing Tips
                </h3>
                <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span>Be authentic and share your true journey</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span>Include challenges and how you overcame them</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span>Share specific lessons learned</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span>Aim for 500-1000 words for maximum impact</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ================= RIGHT COLUMN - FORM ================= */}
            <div ref={formContainerRef} className="lg:col-span-2">
              <div ref={formContentRef} className="sticky top-24 form-content">
                {success && (
                  <div className="mb-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-4 sm:p-6 animate-fade-in">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-green-800 mb-2">
                          Story Submitted Successfully!
                        </h3>
                        <p className="text-xs sm:text-sm text-green-700">
                          Thank you for sharing your journey with our community.
                          Our editorial team will review your submission and
                          notify you once it&apos;s published. Expect to hear
                          from us within 3-5 business days.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 p-4 sm:p-6 animate-fade-in">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.698-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                          ></path>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-red-800 mb-2">
                          Submission Failed
                        </h3>
                        <p className="text-xs sm:text-sm text-red-700">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg border-2 border-border">
                  <div className="flex items-center gap-4 mb-6 sm:mb-8">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
                      <FileText className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground mb-1">
                        Your Story Awaits
                      </h2>
                      <p className="text-sm sm:text-base text-muted-foreground">
                        Fill out the form below to share your entrepreneurial
                        journey
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    className="space-y-6 sm:space-y-8"
                  >
                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2 sm:space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-1">
                          Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="h-10 sm:h-12 rounded-lg border-2 border-border focus:border-primary transition-all form-input"
                          placeholder="Your full name"
                        />
                      </div>

                      <div className="space-y-2 sm:space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-1">
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="h-10 sm:h-12 rounded-lg border-2 border-border focus:border-primary transition-all form-input"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Phone Field */}
                        <div>
                          <Label className="text-sm font-semibold">
                            Phone (Optional)
                          </Label>
                          <Input
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="h-10 sm:h-12 mt-1 rounded-lg border-2 border-border focus:border-primary transition-all form-inputw"
                            placeholder="+91 XXXXX XXXXX"
                          />
                        </div>

                        {/* Captcha Field */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-sm font-semibold flex items-center gap-1">
                              Enter Captcha{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                          </div>
                          <div className="flex gap-3">
                            <div className="relative flex-1">
                              <Input
                                value={userCaptcha}
                                onChange={(e) => {
                                  setUserCaptcha(e.target.value);
                                  setCaptchaError("");
                                }}
                                required
                                className="h-10 sm:h-12 rounded-lg border-2 border-border focus:border-primary transition-all pr-20 form-input"
                                placeholder="Type the code"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <button
                                  type="button"
                                  onClick={generateCaptcha}
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Refresh
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-center w-32 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border-2 border-dashed border-primary/30 form-input">
                              <div className="text-lg font-mono font-bold tracking-wider text-primary select-none">
                                {captcha}
                              </div>
                            </div>
                          </div>
                          {captchaError && (
                            <p className="text-xs text-red-500 mt-1 animate-fade-in">
                              {captchaError}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 sm:col-span-2">
                        Enter the characters shown above to verify you&apos;re
                        human
                      </p>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-sm font-semibold flex items-center gap-1">
                        Story Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="h-10 sm:h-12 rounded-lg border-2 border-border focus:border-primary transition-all form-input"
                        placeholder="Give your story a compelling title"
                      />
                      <p className="text-xs text-muted-foreground">
                        Example: &quot;From Side Hustle to Six Figures: My
                        3-Year Entrepreneurial Journey&quot;
                      </p>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-sm font-semibold flex items-center gap-1">
                        Your Story <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Textarea
                          name="story"
                          value={formData.story}
                          onChange={handleChange}
                          rows={8}
                          required
                          className="rounded-lg border-2 border-border focus:border-primary transition-all resize-none form-input"
                          placeholder="Share your entrepreneurial journey... What inspired you to start? What challenges did you face? What lessons have you learned? What advice would you give to others?"
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                          {formData.story.length}/2000 characters
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• Be authentic and share your true experience</p>
                        <p>• Include specific examples and lessons learned</p>
                        <p>• Aim for 500-1000 words for best engagement</p>
                      </div>
                    </div>

                    <div className="pt-4 sm:pt-6 border-t-2 border-border">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          <p className="flex items-center gap-1">
                            <svg
                              className="w-3 h-3 sm:w-4 sm:h-4 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Your information is secure and private
                          </p>
                          <p className="flex items-center gap-1">
                            <svg
                              className="w-3 h-3 sm:w-4 sm:h-4 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Editorial review within 3-5 business days
                          </p>
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          size="lg"
                          className="h-10 sm:h-12 px-6 sm:px-8 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg group form-input"
                        >
                          {loading ? (
                            <>
                              <div className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              <span className="text-sm sm:text-base">
                                Submitting...
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm sm:text-base">
                                Share Your Journey
                              </span>
                              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </Button>
                      </div>

                      <p className="mt-3 sm:mt-4 text-xs text-center text-muted-foreground">
                        By submitting, you agree to our Terms of Service and
                        Privacy Policy. We may contact you about your story via
                        email.
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA SECTION ================= */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 overflow-hidden hero-gradient">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />

        <div className="relative max-w-screen-xl mx-auto text-center text-white px-4">
          <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-display font-bold mb-3 sm:mb-4">
            Ready to Make an Impact?
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-white/90 mb-6 sm:mb-8 max-w-3xl mx-auto">
            Your story has the power to change someone&apos;s entrepreneurial
            journey. Share your experience and inspire our community today.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button
              className="h-10 sm:h-12 bg-white text-primary hover:bg-white/90 font-semibold px-6 sm:px-8 text-sm sm:text-base"
              onClick={() => {
                if (formContentRef.current) {
                  const elementTop = formContentRef.current.offsetTop;
                  const offset = 100;
                  window.scrollTo({
                    top: elementTop - offset,
                    behavior: "smooth",
                  });
                }
              }}
            >
              Share Your Story Now
            </Button>
            <Link href="/entrechat">
              <Button
                variant="outline"
                className="h-10 sm:h-12 border-2 border-white text-primary hover:bg-white/10 font-semibold px-6 sm:px-8 text-sm sm:text-base"
              >
                Read Other Stories
                <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes inputEntrance {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .form-content.form-entrance {
          animation: slideUp 0.8s ease-out forwards;
          animation-delay: 0.1s;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .form-input.animate-input {
          animation: inputEntrance 0.6s ease-out forwards;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        /* Highlight the form section when scrolled to */
        .form-entrance::before {
          content: "";
          position: absolute;
          top: -20px;
          left: -20px;
          right: -20px;
          bottom: -20px;

          animation: pulseHighlight 2s ease-out;
          pointer-events: none;
          z-index: -1;
        }

        @keyframes pulseHighlight {
          0% {
            border-color: rgba(99, 102, 241, 0);
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.3);
          }
          50% {
            border-color: rgba(99, 102, 241, 0.5);
            box-shadow: 0 0 0 10px rgba(99, 102, 241, 0);
          }
          100% {
            border-color: rgba(99, 102, 241, 0);
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
          }
        }

        /* Smooth scrolling for the entire page */
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </main>
  );
}
