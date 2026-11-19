import { useCMS } from "../context/CMSContext";

export default function Footer() {
  const { cms } = useCMS();
  const { footer, contact } = cms;

  const links = footer?.quickLinks && footer.quickLinks.length > 0
    ? footer.quickLinks
    : [
        { name: "Facebook", url: contact.facebookUrl || "https://facebook.com" },
        { name: "Instagram", url: contact.instagramUrl || "https://instagram.com" },
        { name: "Terms & Conditions", url: "/terms" },
        { name: "FAQs", url: "/faqs" },
        { name: "Inquire Now", url: "/booking" },
      ];

  return (
    <footer className="bg-[#D6C9B3] dark:bg-black border-t border-[#C4B59B] dark:border-white/10 pt-8 pb-safe sm:pb-8 px-4 sm:px-6 md:px-10 text-center transition-colors">
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="order-last md:order-none text-[11px] sm:text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.2em] text-[#3D3227] dark:text-white/40 font-semibold">
          &copy; {new Date().getFullYear()} {footer?.brandName || "Roxan Policarpio Events & Catering"}. {footer?.copyrightText || "All Rights Reserved."}
        </p>
        <div className="flex items-center gap-x-1 sm:gap-x-5 gap-y-1 md:gap-10 flex-wrap justify-center">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target={link.url.startsWith("http") ? "_blank" : undefined}
              rel={link.url.startsWith("http") ? "noreferrer" : undefined}
              className="text-xs sm:text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-[#3D3227] dark:text-white/55 sm:dark:text-white/40 hover:text-gold-500 dark:hover:text-gold-400 transition-colors font-semibold inline-flex items-center min-h-11 sm:min-h-0 px-2.5 sm:px-0 py-1"
            >
              {link.name}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
