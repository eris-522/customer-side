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
    <footer className="bg-[#D6C9B3] dark:bg-black border-t border-[#C4B59B] dark:border-white/10 py-6 px-10 transition-colors">
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#3D3227] dark:text-white/40 font-semibold">
          &copy; {new Date().getFullYear()} {footer?.brandName || "Roxan Policarpio Events & Catering"}. {footer?.copyrightText || "All Rights Reserved."}
        </p>
        <div className="flex items-center gap-6 md:gap-10 flex-wrap justify-center">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target={link.url.startsWith("http") ? "_blank" : undefined}
              rel={link.url.startsWith("http") ? "noreferrer" : undefined}
              className="text-[10px] uppercase tracking-[0.2em] text-[#3D3227] dark:text-white/40 hover:text-gold-500 dark:hover:text-gold-400 transition-colors font-semibold"
            >
              {link.name}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
