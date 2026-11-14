/*eslint-disable @typescript-eslint/no-unused-vars */
"use client";
// components/about/AboutPage.tsx
// "use client" stays — needs useState (activeIndex), useEffect (interval),
// framer-motion animations, and router navigation.
//
// Changes vs original:
//   REMOVED  useRouter import + handleMemberClick + router.push()
//   REPLACED team member onClick → wrapped card in <Link> (simpler, faster, SEO-friendly)
//   KEPT     all JSX, all framer-motion variants, all animations

import { motion, Variants } from "framer-motion";
import {
  Lightbulb,
  Linkedin,
  Sparkles,
  Target,
  Twitter,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Cta from "../common/Cta";
import { AnimatedText, ScrollFade, StaggerChildren } from "../common/ScrollFade";

// ─── Data ─────────────────────────────────────────────────────────────────────

const stats = [
  { value: "1988+", label: "Blogs" },
  { value: "121+", label: "Events & Webinars" },
  { value: "50k+", label: "Community Reach" },
  { value: "85+",  label: "Countries Reached" },
];

const coreValues = [
  {
    icon: Sparkles,
    title: "Empowerment",
    description: `We believe in uplifting women by providing a "storehouse of information"—from government schemes to funding avenues—that unlocks their potential to succeed.`,
  },
  {
    icon: Users,
    title: "Community",
    description:
      "We cultivate an ecosystem where women entrepreneurs connect to exchange best practices, share experiences, and widen their opportunities together.",
  },
  {
    icon: Target,
    title: "Impact",
    description:
      "We are committed to driving positive change, offering mentorship programs to support rural enterprises and amplify women's voices in the business landscape.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "We embrace forward-thinking approaches, keeping our community updated with the latest industry trends, digital skills, and creative business solutions.",
  },
];

const journey = [
  {
    year: "2017",
    title: "The Beginning",
    description:
      "Launched in Jan 2017 as a comprehensive hub to educate and motivate women entrepreneurs globally.",
  },
  {
    year: "2020",
    title: "Digital Acceleration",
    description: `Expanded digital outreach with webinars and "She@Work TV" to support entrepreneurs during the pandemic.`,
  },
  {
    year: "2023",
    title: "Global Leadership",
    description:
      "Founder Ruby Sinha appointed as President of the BRICS CCI Women's Vertical, strengthening international ties.",
  },
  {
    year: "2025",
    title: "Future Forward",
    description: `Launching "Ready, Set, Lead" initiatives to nurture the next generation of Gen Z and Millennial founders.`,
  },
];

const teamMembers = [
  {
    id: "ruby-sinha",
    name: "Ruby Sinha",
    role: "Founder & President (BRICS CCI WE)",
    image: "/core-team/RubySinha.webp",
    linkedin: "#",
    twitter: "#",
  },
  {
    id: "shree-lahiri",
    name: "Shree Lahiri",
    role: "Content Head",
    image: "/core-team/ShreeLahiri.png",
    linkedin: "#",
    twitter: "#",
  },
  {
    id: "poonam-sinha",
    name: "Poonam Sinha",
    role: "Content Manager",
    image: "/core-team/PoonamSinha.png",
    linkedin: "#",
    twitter: "#",
  },
  {
    id: "himanshu-gupta",
    name: "Himanshu Gupta",
    role: "Digital Marketing Manager",
    image: "/core-team/HimanshuGupta.webp",
    linkedin: "#",
    twitter: "#",
  },
];

// ─── Animation variants ───────────────────────────────────────────────────────

const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1, scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
};

const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const bannerVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

const bannerSubtitleVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % stats.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="bg-background min-h-screen">

      {/* ── BANNER ─────────────────────────────────────────────────────────── */}
      <section className="relative h-[480px] md:h-[600px] lg:h-[470px] overflow-hidden pt-24">
        <div className="absolute inset-0" style={{ top: 96 }}>
          <div className="block lg:hidden relative w-full h-full">
            <Image
              src="/aboutus/Mobile about us.webp"
              alt="About Us Banner"
              fill className="object-cover object-center" priority
              sizes="(max-width: 1024px) 100vw"
            />
          </div>
          <div className="hidden lg:block relative w-full h-full">
            <Image
              src="/aboutus/finalAboutusbanner.webp"
              alt="About Us Banner"
              fill className="object-cover object-center" priority
              sizes="(min-width: 1024px) 100vw"
            />
          </div>
        </div>

        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl px-2 sm:px-6 lg:px-8 -mt-40 lg:mt-0">
              <motion.div initial="hidden" animate="visible" variants={bannerVariants}>
                <h1 className="text-white leading-tight">
                  <span className="block text-3xl sm:text-4xl lg:text-6xl font-bold">
                    Empowering Women Entrepreneurs Since 2017
                  </span>
                </h1>
              </motion.div>
              <motion.p
                initial="hidden" animate="visible" variants={bannerSubtitleVariants}
                className="mt-4 sm:mt-6 text-sm sm:text-base md:text-xl text-white/90 leading-relaxed max-w-xl"
              >
                A dynamic one-stop knowledge hub dedicated to amplifying the voices,
                achievements, and insights of women entrepreneurs globally.
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ── OUR STORY ──────────────────────────────────────────────────────── */}
      <ScrollFade once={false}>
        <section className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-screen-xl mx-auto text-center px-4">
            <AnimatedText as="h2" once={false}
              className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-display font-bold text-foreground mb-4 sm:mb-6">
              Our Story
            </AnimatedText>
            <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-4xl mx-auto">
              <AnimatedText delay={0.1} once={false}>
                SheAtWork.com germinated with a singular objective: to support women who are
                looking to start an entrepreneurial venture that aligns with their abilities
                and skills. Launched in January 2017, our aim is to educate, train, support,
                and motivate women entrepreneurs globally.
              </AnimatedText>
              <AnimatedText delay={0.2} once={false}>
                We provide a storehouse of information to increase awareness on all relevant
                areas of entrepreneurship—from innovative business ideas and startup funding
                avenues to legal support and mentor connections.
              </AnimatedText>
            </div>
          </div>
        </section>
      </ScrollFade>

      {/* ── OUR JOURNEY ────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-screen-xl mx-auto px-4">
          <ScrollFade once={false}>
            <div className="text-center mb-8 sm:mb-12 lg:mb-16">
              <AnimatedText as="h2" once={false}
                className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-display font-bold text-foreground mb-2 sm:mb-3">
                Our Journey
              </AnimatedText>
              <AnimatedText delay={0.1} once={false} className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mx-auto">
                Milestones that shaped who we are today
              </AnimatedText>
            </div>
          </ScrollFade>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gradient-to-b from-primary via-accent to-primary hidden md:block" />
            <div className="space-y-8 sm:space-y-12">
              {journey.map((item, i) => (
                <ScrollFade key={i} delay={i * 0.1} once={false}>
                  <div className={`relative flex items-start md:items-center ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} flex-col gap-4 sm:gap-6 md:gap-8`}>
                    <motion.div
                      variants={i % 2 === 0 ? fadeInLeft : fadeInRight}
                      initial="hidden" whileInView="visible"
                      viewport={{ once: false, margin: "-50px" }}
                      className="flex-1 w-full md:w-1/2"
                    >
                      <div className={`bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-border hover:border-primary/50 ${i % 2 === 0 ? "md:mr-8" : "md:ml-8"}`}>
                        <AnimatedText as="h3" delay={0.1} once={false} className="text-lg sm:text-xl font-display font-bold text-foreground mb-2">
                          {item.title}
                        </AnimatedText>
                        <AnimatedText delay={0.2} once={false} className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {item.description}
                        </AnimatedText>
                      </div>
                    </motion.div>

                    <motion.div
                      variants={scaleInVariants}
                      initial="hidden" whileInView="visible"
                      viewport={{ once: false, margin: "-50px" }}
                      transition={{ delay: i * 0.1 + 0.3 }}
                      className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg z-10"
                    >
                      {item.year}
                    </motion.div>

                    <div className="flex-1 hidden md:block" />
                  </div>
                </ScrollFade>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE VALUES ────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 bg-secondary/30">
        <div className="max-w-screen-xl mx-auto px-4">
          <ScrollFade once={false}>
            <div className="text-center mb-8 sm:mb-12">
              <AnimatedText as="h2" once={false}
                className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-display font-bold text-foreground mb-2 sm:mb-3">
                Our Core Values
              </AnimatedText>
              <AnimatedText delay={0.1} once={false} className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mx-auto">
                The principles that guide everything we do
              </AnimatedText>
            </div>
          </ScrollFade>

          <StaggerChildren once={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              {coreValues.map((value, i) => (
                <motion.div key={i}
                  variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
                  whileHover={{ y: -5 }}
                  className="group relative bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-border hover:border-primary/30"
                >
                  <motion.div
                    variants={scaleInVariants} initial="hidden" whileInView="visible"
                    viewport={{ once: false, margin: "-50px" }}
                    transition={{ delay: i * 0.1 }}
                    className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"
                  >
                    <value.icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                  </motion.div>
                  <div className="mt-8 sm:mt-10 lg:mt-12">
                    <AnimatedText as="h3" delay={0.2} once={false} className="text-lg sm:text-xl lg:text-2xl font-display font-bold text-foreground mb-2 sm:mb-3">
                      {value.title}
                    </AnimatedText>
                    <AnimatedText delay={0.3} once={false} className="text-xs sm:text-sm lg:text-base text-muted-foreground leading-relaxed">
                      {value.description}
                    </AnimatedText>
                  </div>
                </motion.div>
              ))}
            </div>
          </StaggerChildren>
        </div>
      </section>

      {/* ── OUR MISSION ────────────────────────────────────────────────────── */}
      <ScrollFade once={false}>
        <section className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-screen-xl mx-auto grid lg:grid-cols-2 gap-8 sm:gap-12 items-center px-4">
            <motion.div variants={fadeInLeft} initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-50px" }}>
              <AnimatedText as="h2" once={false} className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-display font-bold text-foreground mb-4 sm:mb-6">
                Our Mission
              </AnimatedText>
              <div className="space-y-3 sm:space-y-4">
                <AnimatedText delay={0.1} once={false} className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  To create a one-stop knowledge hub for any woman aspiring to be an entrepreneur
                  or aiming to move to the next level. We hope to help all women entrepreneurs
                  expand their frontiers and enhance their skills to achieve their true potential.
                </AnimatedText>
                <AnimatedText delay={0.2} once={false} className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  We strive to provide a friendly forum for growth through the right knowledge
                  and professional networking. By giving visibility to women entrepreneurs and
                  running mentoring programs, we generate peer support across both urban and rural sectors.
                </AnimatedText>
              </div>
            </motion.div>

            <motion.div
              variants={fadeInRight} initial="hidden" whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg sm:shadow-2xl group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
              <div className="relative w-full h-48 sm:h-64 lg:h-80">
                <Image
                  src="/mission.webp"
                  alt="Our Mission - Empowering women entrepreneurs through knowledge sharing and networking"
                  fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </motion.div>
          </div>
        </section>
      </ScrollFade>

      {/* ── MEET OUR TEAM ──────────────────────────────────────────────────── */}
      <ScrollFade once={false}>
        <section className="px-4 sm:px-6 lg:px-8 py-12 bg-gradient-to-b from-background to-secondary/20">
          <div className="max-w-screen-xl mx-auto">
            <div className="text-center mb-12">
              <AnimatedText as="h2" once={false} className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-4">
                Meet Our Leaders
              </AnimatedText>
              <AnimatedText delay={0.1} once={false} className="text-muted-foreground max-w-2xl mx-auto mb-8">
                The visionary minds driving our mission forward
              </AnimatedText>
              <motion.div
                variants={scaleInVariants} initial="hidden" whileInView="visible"
                viewport={{ once: false, margin: "-50px" }}
                transition={{ delay: 0.2 }}
              >
                <Link
                  href="/about/core-team"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  View Full Team
                  <Users className="h-4 w-4" />
                </Link>
              </motion.div>
            </div>

            <StaggerChildren once={false}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {teamMembers.map((member, i) => (
                  // ✅ FIX: replaced onClick + useRouter with plain <Link>
                  // Simpler, faster, right-click/open-in-tab works, no JS needed
                  <Link
                    key={i}
                    href={`/about/core-team?member=${member.id}`}
                    className="block"
                  >
                    <motion.div
                      variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
                      whileHover={{ y: -8, scale: 1.02, transition: { type: "spring", stiffness: 300 } }}
                      className="group bg-card rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-border cursor-pointer relative h-full"
                    >
                      {/* Avatar */}
                      <motion.div
                        variants={scaleInVariants} initial="hidden" whileInView="visible"
                        viewport={{ once: false, margin: "-50px" }}
                        transition={{ delay: i * 0.1 }}
                        className="relative h-48 sm:h-56 flex items-center justify-center overflow-hidden bg-secondary/30"
                      >
                        <div className="absolute inset-0">
                          <Image
                            src={member.image} alt={`${member.name} background`}
                            fill className="object-cover blur-md scale-105 opacity-30"
                            sizes="(max-width: 768px) 100vw, 40vw"
                          />
                        </div>
                        <div className="absolute inset-0 bg-white/20" />
                        <div className="relative z-10 w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl" />
                          <Image
                            src={member.image} alt={member.name} fill
                            className="object-cover rounded-2xl shadow-xl border-4 border-background group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 128px, (max-width: 1024px) 160px, 192px"
                          />
                        </div>
                      </motion.div>

                      {/* Info */}
                      <div className="p-4 sm:p-6 text-center">
                        <AnimatedText as="h3" delay={0.1} once={false} className="text-base sm:text-lg lg:text-xl font-display font-bold text-foreground mb-1">
                          {member.name}
                        </AnimatedText>
                        <AnimatedText delay={0.15} once={false} className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                          {member.role}
                        </AnimatedText>
                        <motion.div
                          variants={fadeInUp} initial="hidden" whileInView="visible"
                          viewport={{ once: false, margin: "-50px" }}
                          transition={{ delay: 0.2 }}
                          className="flex justify-center gap-2"
                        >
                          <a
                            href={member.linkedin}
                            onClick={(e) => e.preventDefault()}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-primary flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                          >
                            <Linkedin className="h-3 w-3 sm:h-4 sm:w-4" />
                          </a>
                          <a
                            href={member.twitter}
                            onClick={(e) => e.preventDefault()}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-primary flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                          >
                            <Twitter className="h-3 w-3 sm:h-4 sm:w-4" />
                          </a>
                        </motion.div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </StaggerChildren>
          </div>
        </section>
      </ScrollFade>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <ScrollFade delay={0.2} once={false}>
        <Cta />
      </ScrollFade>
    </main>
  );
}