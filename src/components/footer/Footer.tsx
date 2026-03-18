import { Facebook, Instagram, Linkedin, Mail, MapPin, Twitter, Youtube } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  explore: [
    { name: "Home", href: "/" },
    { name: "News", href: "/news" },
    { name: "Blogs", href: "/blogs" },
    { name: "Entrechat", href: "/entrechat" },
    { name: "Events", href: "/events" },
  ],
  company: [
    { name: "About Us", href: "/about" },
    { name: "Contact Us", href: "/contact" },
    { name: "Share Your Story", href: "/share-your-story" },
    // { name: "Advertise", href: "/advertise" },
    // { name: "Partner With Us", href: "/partner" },
      { name: "Getting Started", href: "/gettingstarted" },
      { name: "FAQs", href: "/contact" },
  ],
 
};

const socialLinks = [
  { name: "Facebook", icon: Facebook, href: "https://www.facebook.com/sheatwork" },
  { name: "Twitter", icon: Twitter, href: "https://x.com/sheatwork_com" },
  { name: "Instagram", icon: Instagram, href: "https://www.instagram.com/she_at_work" },
  { name: "LinkedIn", icon: Linkedin, href: "https://www.linkedin.com/company/SheatWork" },
  { name: "YouTube", icon: Youtube, href: "https://www.youtube.com/@sheatwork" },
];

export const Footer = () => {
  return (
  <footer className="bg-gradient-to-r from-[#2D1B4E] via-[#1E1428] to-[#1A1625] pt-16 pb-8 sm:px-20 px-5">

      <div className="container">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <span className="text-3xl font-display font-bold text-white">
                She<span className="text-accent">At</span>Work
              </span>
            </Link>
            <p className="text-white/70 max-w-sm">
              Shaping the future of women entrepreneurship. Inspiring stories, insights, and community for 
            </p>
            <p className="text-white/70 mb-6 max-w-sm">visionary women leaders.</p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-primary hover:text-white transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-display font-semibold text-lg mb-4 text-white">Explore</h3>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-lg mb-4 text-white">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

     
        </div>

        {/* Contact Info */}
        <div className="flex flex-wrap gap-6 py-8 border-t border-white/10">
          <a
            href="mailto:info@sheatwork.com"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <Mail className="h-4 w-4" />
            info@sheatwork.com
          </a>
          <span className="flex items-center gap-2 text-white/70">
            <MapPin className="h-4 w-4" />
            Noida, India
          </span>
        </div>

        {/* Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/10">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} She At Work. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-white/50 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-white/50 hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};