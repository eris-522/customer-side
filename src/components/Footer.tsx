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
        { name: "Inquire Now", url: "/booking" },
      ];

  return (
    <footer className="bg-black border-t border-white/10 h-20 flex items-center px-10">
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-semibold">
          &copy; {new Date().getFullYear()} {footer?.brandName || "Roxan Policarpio Events & Catering"}. {footer?.copyrightText || "All Rights Reserved."}
        </p>
        <div className="flex gap-10">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target={link.url.startsWith("http") ? "_blank" : undefined}
              rel={link.url.startsWith("http") ? "noreferrer" : undefined}
              className="text-[9px] uppercase tracking-[0.2em] text-white/30 hover:text-gold-400 transition-colors font-semibold"
            >
              {link.name}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
