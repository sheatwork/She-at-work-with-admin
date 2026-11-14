"use client";

import Cta from "@/components/common/Cta";
import { AnimatedText, ScrollFade } from "@/components/common/ScrollFade";
import { motion, Variants } from "framer-motion";
import { Award, Briefcase, ChevronDown, ChevronUp, Globe, Linkedin, Mail, Twitter } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const coreTeam = [
  {
    id: "ruby-sinha",
    name: "Ruby Sinha",
    role: "Founder & President",
    summary: "Founder of sheatwork.com and President of BRICS CCI Women's Vertical. An entrepreneur and journalist dedicated to empowering women in business.",
    bullets: [
      "President of BRICS CCI Women's Vertical",
      "Jury member for Enactus World Cup",
      "Panel expert for National Institute of Electronics and Information Technology",
      "Founder of award-winning brand communications firm, Kommune",
      "Former journalist with Indian Express Group"
    ],
    image: "/core-team/RubySinha.png",
    linkedin: "#",
    twitter: "#",
    email: "#",
    featured: true
  },
  {
    id: "shree-lahiri",
    name: "Shree Lahiri",
    role: "Content Head",
    summary: "Seasoned professional with 20+ years in corporate communications and journalism. Believes in the transformative power of storytelling.",
    bullets: [
      "Group Manager: Advertising at NIIT",
      "Features Editor at Mid-Day",
      "Deputy Editor at exchange4media",
      "Senior Editor with Reputation Today",
      "Consulting Editor with The New Global Indian"
    ],
    image: "/core-team/ShreeLahiri.png",
    linkedin: "#",
    twitter: "#",
    email: "#"
  },
  {
    id: "poonam-sinha",
    name: "Poonam Sinha",
    role: "Content Manager",
    summary: "Former educator turned content specialist with expertise in simplifying complex concepts into engaging, accessible language.",
    bullets: [
      "Former educator and facilitator in Kolkata",
      "English language specialist",
      "Content writing and editing",
      "Freelance content writer and editor",
      "Expert in distilling complex thoughts into simple language"
    ],
    image: "/core-team/PoonamSinha.png",
    linkedin: "#",
    twitter: "#",
    email: "#"
  },
  {
    id: "himanshu-gupta",
    name: "Himanshu Gupta",
    role: "Digital Marketing Manager",
    summary: "Digital marketing expert with 8+ years experience in campaign development, branding strategies, and performance analytics.",
    bullets: [
      "Digital Marketing Strategy & Campaign Development",
      "Brand Communications & Ad Management",
      "Performance Analytics & Multi-channel Marketing",
      "App promotion & customer acquisition",
      "Tracking key internet marketing metrics"
    ],
    image: "/core-team/HimanshuGupta.png",
    linkedin: "#",
    twitter: "#",
    email: "#"
  },
  {
    id: "shweta-sharma",
    name: "Shweta Sharma",
    role: "Manager - Outreach",
    summary: "Seasoned Communications professional with expertise in strategic PR, marketing, and stakeholder engagement.",
    bullets: [
      "Strategic Communications & Public Relations",
      "Marketing Strategy & Corporate Outreach",
      "Stakeholder Engagement",
      "Masters Degree in Marketing & Public Relations",
      "Experience across various sectors"
    ],
    image: "/core-team/ShwetaSharma.png",
    linkedin: "#",
    twitter: "#",
    email: "#"
  }
];

const advisoryBoard = [
  {
    id: "bela-rajan",
    name: "Bela Rajan",
    role: "Advisory Board Member",
    summary: "Leading woman entrepreneur and Co-Founder of Ketchum Sampark, with extensive experience in communications and women's empowerment.",
    bullets: [
      "Co-Founder & Director, Ketchum Sampark",
      "Director, August One Partners LLP",
      "Independent Director, Lloyds Steel",
      "Former Chairperson, FICCI FLO Mumbai",
      "Active in philanthropic work for women and girl child"
    ],
    image: "/core-team/bela-rajan.png",
    linkedin: "#",
    twitter: "#"
  },
  {
    id: "sanjeeva-shivesh",
    name: "Sanjeeva Shivesh",
    role: "Advisory Board Member",
    summary: "Serial entrepreneur, angel investor, and former civil service officer passionate about entrepreneurship and innovation.",
    bullets: [
      "Co-Founder of ThinkStartup, The Entrepreneurship School",
      "Former civil service officer and strategy consultant",
      "Angel investor and mentor",
      "Faculty at IIT Delhi, IIM, and other universities",
      "B.Tech from IIT Delhi, MBA from Cranfield School of Management"
    ],
    image: "/core-team/sanjeeva-shivesh.png",
    linkedin: "#",
    twitter: "#"
  }
];

// Animation variants
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  }
};

const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

export default function CoreTeamPage() {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const memberId = searchParams.get("member");
  const memberRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Function to handle scrolling to member
  const scrollToMember = (id: string) => {
    const element = memberRefs.current[id];
    if (element) {
      // Add a highlight animation
      element.style.transition = "all 0.3s ease";
      element.style.backgroundColor = "rgba(var(--primary), 0.05)";
      element.style.borderColor = "rgba(var(--primary), 0.5)";
      
      // Scroll to element
      element.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      
      // Remove highlight after animation
      setTimeout(() => {
        if (element) {
          element.style.backgroundColor = "";
          element.style.borderColor = "";
        }
      }, 2000);

      // Auto-expand the member
      setExpandedMember(id);
    }
  };

  // Handle URL parameter on component mount
  useEffect(() => {
    if (memberId) {
      // Wait a bit for the page to load
      const timer = setTimeout(() => {
        scrollToMember(memberId);
        
        // Update URL to remove the parameter after scrolling
        const url = new URL(window.location.href);
        url.searchParams.delete("member");
        window.history.replaceState({}, document.title, url.toString());
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [memberId]);

  const toggleExpand = (name: string) => {
    setExpandedMember(expandedMember === name ? null : name);
  };

  return (
    <main className="bg-background min-h-screen">
      {/* HERO BANNER */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-28 pb-2 overflow-hidden hero-gradient">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
        <div className="relative w-full mx-auto text-center text-white px-4">
          <ScrollFade>
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false }}
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4 px-2 sm:px-0">
                Our Core Team
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-white/90 mb-6 sm:mb-8 max-w-4xl mx-auto px-4 sm:px-8 lg:px-0">
                Meet the passionate individuals and advisors who drive our mission to empower women entrepreneurs through knowledge, community, and innovation.
              </p>
            </motion.div>
          </ScrollFade>
        </div>
      </section>

      {/* CORE TEAM */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 bg-secondary/10">
        <div className="max-w-screen-xl mx-auto">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            className="space-y-8"
          >
            {coreTeam.map((member, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                ref={(el) => { memberRefs.current[member.id] = el; }}
                className={`group bg-card rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-border ${
                  member.featured ? 'border-primary/30' : ''
                }`}
              >
                <div className="lg:flex">
                  {/* Image section - Fixed height */}
                  <motion.div 
                    variants={scaleIn}
                    className="lg:w-1/4 relative h-64 lg:h-auto min-h-[256px] overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-full"
                    >
                      <Image
                        src={member.image}
                        alt={member.name}
                        fill
                        className="object-contain p-4"
                        sizes="(max-width: 1024px) 100vw, 25vw"
                        priority={member.featured}
                      />
                    </motion.div>
                    {member.featured && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                        className="absolute top-4 left-4"
                      >
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          <Award className="h-3 w-3" />
                          Founder
                        </div>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Content section */}
                  <div className="lg:w-3/4 p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                      <div className="flex-1">
                        <motion.h3 
                          variants={fadeInLeft}
                          className="text-2xl font-display font-bold text-foreground mb-1"
                        >
                          {member.name}
                        </motion.h3>
                        <motion.div 
                          variants={fadeInRight}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium mb-4"
                        >
                          <Briefcase className="h-3 w-3" />
                          {member.role}
                        </motion.div>
                        <motion.p 
                          variants={fadeInUp}
                          className="text-foreground mb-4 leading-relaxed"
                        >
                          {member.summary}
                        </motion.p>
                      </div>
                      
                      {/* Social links */}
                      <motion.div 
                        variants={staggerContainer}
                        className="flex gap-2 mt-4 sm:mt-0"
                      >
                        {[
                          { href: member.linkedin, icon: Linkedin, label: "LinkedIn" },
                          { href: member.twitter, icon: Twitter, label: "Twitter" },
                          { href: `mailto:${member.email}`, icon: Mail, label: "Email" }
                        ].map((social, idx) => (
                          <motion.a
                            key={idx}
                            variants={scaleIn}
                            whileHover={{ y: -3, scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            href={social.href}
                            className="w-10 h-10 rounded-lg bg-secondary hover:bg-primary flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                            title={social.label}
                          >
                            <social.icon className="h-5 w-5" />
                          </motion.a>
                        ))}
                      </motion.div>
                    </div>

                    {/* Expandable bullet points */}
                    <motion.div 
                      variants={fadeInUp}
                      className="border-t border-border pt-6"
                    >
                      <motion.button
                        whileHover={{ x: 5 }}
                        onClick={() => toggleExpand(member.id)}
                        className="flex items-center gap-2 text-primary font-medium hover:text-primary/80 transition-colors mb-4"
                      >
                        {expandedMember === member.id ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Show Less Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            View Key Achievements & Expertise
                          </>
                        )}
                      </motion.button>
                      
                      {expandedMember === member.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className="grid sm:grid-cols-1 md:grid-cols-2 gap-3"
                        >
                          {member.bullets.map((bullet, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex items-start gap-2"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                              <span className="text-muted-foreground">{bullet}</span>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ADVISORY BOARD */}
      <section className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-screen-xl mx-auto">
          <ScrollFade>
            <div className="text-center mb-12">
              <motion.div 
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent font-medium mb-4"
              >
                <Globe className="h-4 w-4" />
                Advisory Board
              </motion.div>
              <AnimatedText 
                as="h2" 
                className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-4"
              >
                Guiding Voices
              </AnimatedText>
              <AnimatedText delay={0.1} className="text-muted-foreground max-w-2xl mx-auto">
                Industry leaders and experts who provide strategic guidance and mentorship
              </AnimatedText>
            </div>
          </ScrollFade>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            className="grid md:grid-cols-2 gap-8"
          >
            {advisoryBoard.map((advisor, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                ref={(el) => { memberRefs.current[advisor.id] = el; }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group bg-card rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-border"
              >
                <div className="flex flex-col h-full">
                  <div className="p-6 sm:p-8 flex-1">
                    <div className="flex items-start gap-6 mb-6">
                      {/* Fixed height image */}
                      <motion.div 
                        variants={scaleIn}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0"
                      >
                        <Image
                          src={advisor.image}
                          alt={advisor.name}
                          fill
                          sizes="96px"
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </motion.div>
                      <div className="flex-1">
                        <motion.h3 
                          variants={fadeInLeft}
                          className="text-xl font-display font-bold text-foreground mb-1"
                        >
                          {advisor.name}
                        </motion.h3>
                        <motion.div 
                          variants={fadeInRight}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-3"
                        >
                          {advisor.role}
                        </motion.div>
                        <motion.p 
                          variants={fadeInUp}
                          className="text-foreground"
                        >
                          {advisor.summary}
                        </motion.p>
                      </div>
                    </div>

                    {/* Bullet points - always visible for advisors */}
                    <motion.div 
                      variants={staggerContainer}
                      className="space-y-2 mt-4"
                    >
                      {advisor.bullets.slice(0, 4).map((bullet, idx) => (
                        <motion.div 
                          key={idx}
                          variants={fadeInLeft}
                          className="flex items-start gap-2"
                        >
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}
                            className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0"
                          />
                          <span className="text-muted-foreground text-sm">{bullet}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>

                  <div className="p-6 pt-0">
                    <motion.div 
                      variants={staggerContainer}
                      className="flex gap-2"
                    >
                      {[
                        { href: advisor.linkedin, icon: Linkedin, label: "LinkedIn" },
                        { href: advisor.twitter, icon: Twitter, label: "Twitter" }
                      ].map((social, idx) => (
                        <motion.a
                          key={idx}
                          variants={scaleIn}
                          whileHover={{ y: -3, scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          href={social.href}
                          className="w-10 h-10 rounded-lg bg-secondary hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                        >
                          <social.icon className="h-5 w-5" />
                        </motion.a>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Add custom animation */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes highlightPulse {
          0%, 100% {
            background-color: transparent;
            border-color: var(--border);
          }
          50% {
            background-color: rgba(var(--primary), 0.05);
            border-color: rgba(var(--primary), 0.5);
          }
        }
        
        .highlight-member {
          animation: highlightPulse 2s ease-in-out;
        }
      `}</style>

      <ScrollFade>
        <Cta />
      </ScrollFade>
    </main>
  );
}