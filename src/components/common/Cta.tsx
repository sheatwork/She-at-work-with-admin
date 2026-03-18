// components/common/Cta.tsx
"use client";

import React from "react";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Cta = () => {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 overflow-hidden hero-gradient">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />

      {/* Animated soft glow */}
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent_60%)] animate-pulse" />

      <div className="relative max-w-screen-xl mx-auto text-center text-white px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-display font-bold mb-3 sm:mb-4">
            Connect with us
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-sm sm:text-base lg:text-lg text-white/90 mb-6 sm:mb-8 max-w-3xl mx-auto"
          >
            Be part of a community that&apos;s shaping the future of women entrepreneurs
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center"
        >
          {/* Primary Button */}
          <Button
            className="
              h-10 sm:h-12
              bg-white text-primary
              font-semibold
              px-6 sm:px-8
              text-sm sm:text-base
              transition-all duration-300
              hover:-translate-y-1
              hover:shadow-[0_12px_30px_rgba(255,255,255,0.35)]
              active:scale-95
            "
          >
            Become a Member
          </Button>

          {/* Secondary Button */}
          <Button
            variant="outline"
            className="
              group
              h-10 sm:h-12
              border-2 border-white
              text-black
              hover:bg-white/10
              font-semibold
              px-6 sm:px-8
              text-sm sm:text-base
              transition-all duration-300
              hover:-translate-y-1
              active:scale-95
            "
          >
            Partner With Us
            <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Cta;