import { Link } from "react-router-dom";
import { Facebook, Instagram, MessageCircle, Phone, Mail, CalendarPlus, type LucideIcon } from "lucide-react";
import { useCMS } from "../context/CMSContext";
import { sanitizeSafeHref } from "../utils/urlSafety";

type FooterLinkItem = { name: string; url: string };

const isExternal = (url: string) => /^https?:\/\//i.test(url);

const socialIconFor = (link: FooterLinkItem): LucideIcon | null => {
  const key = `${link.name} ${link.url}`.toLowerCase();
  if (key.includes("facebook") || key.includes("fb.com")) return Facebook;
  if (key.includes("instagram")) return Instagram;
  if (key.includes("messenger") || key.includes("m.me")) return MessageCircle;
  return null;
};

const isBookingLink = (link: FooterLinkItem) =>
  link.url === "/booking" || /inquire|book/i.test(link.name);

function FooterTextLink({ link, className }: { link: FooterLinkItem; className: string }) {
  const safeUrl = sanitizeSafeHref(link.url, "/");
  if (isExternal(safeUrl)) {
    return (
      <a href={safeUrl} target="_blank" rel="noopener noreferrer" className={className}>
        {link.name}
      </a>
    );
  }
  return (
    <Link to={safeUrl} className={className}>
      {link.name}
    </Link>
  );
}

const DEFAULT_FACEBOOK_URL = "https://www.facebook.com/roxanpolicarpiocateringservices";
const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/rp.cateringservices/";
const DEFAULT_CONTACT_EMAIL = "roxanpolicarpio.events@gmail.com";

const normalizeSocialUrl = (link: FooterLinkItem, contact?: { facebookUrl?: string; instagramUrl?: string }): string => {
  const key = `${link.name} ${link.url}`.toLowerCase();
  const trimmedUrl = (link.url || "").trim().replace(/\/+$/, "");
  if (key.includes("facebook") || key.includes("fb.com")) {
    if (!trimmedUrl || /^https?:\/\/(www\.)?facebook\.com$/i.test(trimmedUrl)) {
      const contactFb = (contact?.facebookUrl || "").trim().replace(/\/+$/, "");
      return contactFb && !/^https?:\/\/(www\.)?facebook\.com$/i.test(contactFb)
        ? contact!.facebookUrl!
        : DEFAULT_FACEBOOK_URL;
    }
  }
  if (key.includes("instagram")) {
    if (!trimmedUrl || /^https?:\/\/(www\.)?instagram\.com$/i.test(trimmedUrl)) {
      const contactIg = (contact?.instagramUrl || "").trim().replace(/\/+$/, "");
      return contactIg && !/^https?:\/\/(www\.)?instagram\.com$/i.test(contactIg)
        ? contact!.instagramUrl!
        : DEFAULT_INSTAGRAM_URL;
    }
  }
  return link.url;
};

export default function Footer() {
  const { cms } = useCMS();
  const { footer, contact } = cms;

  const rawLinks: FooterLinkItem[] =
    footer?.quickLinks && footer.quickLinks.length > 0
      ? footer.quickLinks
      : [
          { name: "Facebook", url: contact.facebookUrl || DEFAULT_FACEBOOK_URL },
          { name: "Instagram", url: contact.instagramUrl || DEFAULT_INSTAGRAM_URL },
          { name: "Terms & Conditions", url: "/terms" },
          { name: "FAQs", url: "/faqs" },
          { name: "Inquire Now", url: "/booking" },
        ];

  const links: FooterLinkItem[] = rawLinks.map((l) => ({
    ...l,
    url: normalizeSocialUrl(l, contact),
  }));

  const socialLinks = links.filter((l) => socialIconFor(l));
  const bookingLink = links.find((l) => !socialIconFor(l) && isBookingLink(l));
  const textLinks = links.filter((l) => !socialIconFor(l) && l !== bookingLink);

  const brandName = footer?.brandName || "Roxan Policarpio Events & Catering";
  const phoneHref = contact?.phone ? `tel:${contact.phone.replace(/[^\d+]/g, "")}` : "";
  const footerEmail =
    !contact?.email || contact.email.trim().toLowerCase() === "rpcatering@gmail.com"
      ? DEFAULT_CONTACT_EMAIL
      : contact.email.trim();

  return (
    <footer className="bg-[#D6C9B3] dark:bg-black border-t border-[#C4B59B] dark:border-white/10 px-4 sm:px-6 md:px-10 pt-10 sm:pt-12 pb-safe sm:pb-8 transition-colors">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 text-center md:text-left">
          {/* Brand + contact */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link to="/" className="flex flex-col items-center md:items-start">
              <span className="text-lg font-serif tracking-[0.16em] text-gold-500 dark:text-gold-400 font-bold uppercase">
                Roxan Policarpio
              </span>
              <span className="text-sm text-[#3D3227] dark:text-white/60 font-semibold -mt-0.5">
                Events &amp; Catering
              </span>
            </Link>

            {(contact?.phone || footerEmail) && (
              <div className="flex flex-col items-center md:items-start gap-1">
                {contact?.phone && (
                  <a
                    href={sanitizeSafeHref(phoneHref, "#")}
                    className="inline-flex items-center gap-2 min-h-10 text-sm font-medium text-[#3D3227] dark:text-white/70 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
                  >
                    <Phone size={15} className="text-gold-500 dark:text-gold-400" aria-hidden="true" />
                    {contact.phone}
                  </a>
                )}
                {footerEmail && (
                  <a
                    href={sanitizeSafeHref(`mailto:${footerEmail}`, "#")}
                    className="inline-flex items-center gap-2 min-h-10 text-sm font-medium text-[#3D3227] dark:text-white/70 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
                  >
                    <Mail size={15} className="text-gold-500 dark:text-gold-400" aria-hidden="true" />
                    {footerEmail}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Actions: CTA, socials, links */}
          <div className="flex flex-col items-center md:items-end gap-5">
            {bookingLink && (
              <Link
                to={sanitizeSafeHref(bookingLink.url, "/booking")}
                className="gold-gradient text-white dark:text-black w-full max-w-xs md:w-auto min-h-12 px-8 rounded-lg inline-flex items-center justify-center gap-2 text-sm font-bold tracking-wide shadow-md hover:brightness-105 transition-all"
              >
                <CalendarPlus size={17} aria-hidden="true" />
                {bookingLink.name}
              </Link>
            )}

            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((link) => {
                  const Icon = socialIconFor(link)!;
                  return (
                    <a
                      key={link.name}
                      href={sanitizeSafeHref(link.url, "https://facebook.com")}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.name}
                      title={link.name}
                      className="w-11 h-11 rounded-full border border-[#B9A88B] dark:border-white/15 flex items-center justify-center text-[#3D3227] dark:text-white/70 hover:text-gold-500 dark:hover:text-gold-400 hover:border-gold-500 dark:hover:border-gold-400 transition-colors"
                    >
                      <Icon size={18} aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            )}

            {textLinks.length > 0 && (
              <nav aria-label="Footer" className="flex flex-wrap items-center justify-center md:justify-end gap-x-1">
                {textLinks.map((link, i) => (
                  <span key={link.name} className="inline-flex items-center">
                    {i > 0 && <span aria-hidden="true" className="text-[#3D3227]/40 dark:text-white/20 px-1">·</span>}
                    <FooterTextLink
                      link={link}
                      className="inline-flex items-center min-h-10 px-2 text-sm font-semibold text-[#3D3227] dark:text-white/60 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
                    />
                  </span>
                ))}
              </nav>
            )}
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-[#C4B59B] dark:border-white/10 text-center md:text-left">
          <p className="text-xs text-[#3D3227]/80 dark:text-white/40 font-medium leading-relaxed">
            &copy; 2019 {brandName}. {footer?.copyrightText || "All Rights Reserved."}
          </p>
        </div>
      </div>
    </footer>
  );
}
