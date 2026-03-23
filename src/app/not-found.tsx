"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar/Navbar";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Navbar */}
      <Navbar />

      {/* Main */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">

        {/* Background gradient (same feel as login left panel) */}
        <div className="absolute inset-0 bg-secondary">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative bg-white rounded-3xl shadow-2xl border border-[#D5B5A9]/30 p-12 text-center max-w-xl mx-6"
        >
          {/* 404 */}
          <h1 className="text-[120px] font-extrabold bg-gradient-to-r from-[#CF2554] to-[#E64B78] bg-clip-text text-transparent leading-none">
            404
          </h1>

          <h2 className="text-3xl font-bold text-[#2C2A2D] mt-4">
            Page Not Found
          </h2>

          <p className="text-gray-500 mt-4 text-lg">
            The page you are looking for might have been removed,
            had its name changed, or is temporarily unavailable.
          </p>

          {/* Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#CF2554] to-[#E64B78] text-white font-semibold shadow-md hover:shadow-xl transition"
            >
              Go Home
            </Link>

            <Link
              href="/blogs"
              className="px-8 py-3 rounded-xl border border-[#CF2554] text-[#CF2554] font-semibold hover:bg-[#FFF0F4] transition"
            >
              Explore Blogs
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}