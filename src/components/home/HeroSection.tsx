"use client";

import { useEffect, useState, createContext } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const DESKTOP_IMAGES = [
  "/home/Homebanner1.png",
  "/home/revisedHomebanner2.png",
];

const MOBILE_IMAGES = ["/home/Mobile Home A.png", "/home/Mobile Home B (1).png"];

const HEADLINES = [
  {
    line1: "Turn Your Ambition",
    line2: "Into Action",
  },
  {
    line1: "Build Ideas",
    line2: "Create Impact",
  },
  {
    line1: "Empower Voices",
    line2: "Shape Futures",
  },
];

export const ImageVisibilityContext = createContext({
  isImageVisible: false,
});

export const HeroSection = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [headlineIndex, setHeadlineIndex] = useState(0);

  // Image Carousel (6 seconds)
  useEffect(() => {
    const imageInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % DESKTOP_IMAGES.length);
    }, 6000);

    return () => clearInterval(imageInterval);
  }, []);

  // Headline Animation (4 seconds)
  useEffect(() => {
    const textInterval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % HEADLINES.length);
    }, 4000);

    return () => clearInterval(textInterval);
  }, []);

  return (
    <ImageVisibilityContext.Provider value={{ isImageVisible: true }}>
      <section className="relative min-h-[100dvh] overflow-hidden pt-24">
        {/* DESKTOP BACKGROUND */}
        <div
          className="absolute inset-0 hidden lg:block"
          style={{ top: "96px", height: "calc(100dvh - 96px)" }}
        >
          {DESKTOP_IMAGES.map((image, index) => (
            <div
              key={image}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                currentImageIndex === index ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={image}
                alt="Desktop Hero background"
                fill
                priority={index === 0}
                className="object-cover object-center"
                sizes="100vw"
              />
            </div>
          ))}
        </div>
        {/* MOBILE BACKGROUND */}
        <div
          className="absolute inset-0 block lg:hidden"
          style={{ top: "96px", height: "calc(100dvh - 96px)" }}
        >
          {MOBILE_IMAGES.map((image, index) => (
            <div
              key={image}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                currentImageIndex === index ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={image}
                alt="Mobile Hero background"
                fill
                priority={index === 0}
                className="object-cover object-center "
                sizes="100vw"
              />
            </div>
          ))}
        </div>
        {/* CONTENT */}
        {/* CONTENT */}{" "}
        <div
          className="relative z-10 flex items-start lg:items-center pt-4 sm:pt-0"
          style={{ minHeight: "calc(100vh - 96px)" }}
        >
          {" "}
          <div className="container mx-auto px-6 sm:px-10 lg:px-20 w-full">
            {" "}
            <div className="max-w-3xl text-white pt-4 sm:pt-8 lg:pt-0">
              {" "}
              {/* Badge */}{" "}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden sm:inline-flex items-center px-3 py-1 mb-4 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-sm"
              >
                {" "}
                Since 2017 • Trusted Global Community
              </motion.div>{" "}
              {/* Animated Heading */}{" "}
              <div className="relative mt-2 min-h-[100px] sm:min-h-[150px] overflow-hidden">
                {" "}
                <AnimatePresence mode="wait">
                  {" "}
                  <motion.h1
                    key={headlineIndex}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 leading-tight"
                  >
                    {" "}
                    <span className="block text-4xl sm:text-7xl font-light drop-shadow-lg">
                      {" "}
                      {HEADLINES[headlineIndex].line1}{" "}
                    </span>{" "}
                    <span className="block text-4xl sm:text-7xl font-semibold mt-1 sm:mt-2 drop-shadow-lg">
                      {" "}
                      {HEADLINES[headlineIndex].line2}{" "}
                    </span>{" "}
                  </motion.h1>{" "}
                </AnimatePresence>{" "}
              </div>{" "}
              {/* Paragraph */}{" "}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mt-4 sm:mt-6 text-white/90 max-w-2xl text-sm sm:text-base drop-shadow-md"
              >
                {" "}
                A dynamic one-stop knowledge hub dedicated to amplifying the
                voices, achievements, and insights of women entrepreneurs
                globally — helping ideas grow into impactful journeys.{" "}
              </motion.p>{" "}
              {/* Buttons (Side by Side on Mobile) */}{" "}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mt-5 sm:mt-10 flex flex-row gap-3 sm:gap-4"
              >
                {" "}
                <Link href="/entrechat" className="w-1/2 sm:w-auto">
                  {" "}
                  <Button className="w-full relative overflow-hidden bg-[#3B2E7E] text-white h-11 sm:h-12 text-sm sm:text-base transition-all duration-300 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full">
                    {" "}
                    Start your Journey →{" "}
                  </Button>{" "}
                </Link>{" "}
                <Link href="/about" className="w-1/2 sm:w-auto">
                  {" "}
                  <Button
                    variant="outline"
                    className="w-full relative overflow-hidden text-black h-11 sm:h-12 text-sm sm:text-base transition-all duration-300 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
                  >
                    {" "}
                    Know more →{" "}
                  </Button>{" "}
                </Link>{" "}
              </motion.div>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      </section>
    </ImageVisibilityContext.Provider>
  );
};
