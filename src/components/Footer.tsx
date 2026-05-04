export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 h-20 flex items-center px-10">
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-semibold">
          &copy; {new Date().getFullYear()} Roxan Policarpio Events & Catering. All Rights Reserved.
        </p>
        <div className="flex gap-10">
          {["Facebook", "Instagram", "Inquire Now"].map(link => (
            <a key={link} href="#" className="text-[9px] uppercase tracking-[0.2em] text-white/30 hover:text-gold-400 transition-colors font-semibold">{link}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}
