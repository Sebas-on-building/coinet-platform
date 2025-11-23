import React from "react";
import { Github, Twitter, Globe, Linkedin } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full py-8 px-4 md:px-12 bg-gradient-to-r from-[#23234d]/90 to-[#1a1a2e]/90 border-t border-[#23234d] text-blue-200 flex flex-col md:flex-row items-center justify-between gap-4 mt-12">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-bold text-white">
          © {new Date().getFullYear()} Coinet
        </span>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-[#00ffa3] transition">
          Privacy
        </Link>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:text-[#00ffa3] transition">
          Terms
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <a
          href="https://github.com/yourusername/coinet"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#00ffa3] transition"
          aria-label="GitHub"
        >
          <Github size={22} />
        </a>
        <a
          href="https://twitter.com/yourprofile"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#00ffa3] transition"
          aria-label="Twitter"
        >
          <Twitter size={22} />
        </a>
        <a
          href="https://linkedin.com/in/yourprofile"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#00ffa3] transition"
          aria-label="LinkedIn"
        >
          <Linkedin size={22} />
        </a>
        <a
          href="https://coinet.co"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#00ffa3] transition"
          aria-label="Website"
        >
          <Globe size={22} />
        </a>
      </div>
    </footer>
  );
}
