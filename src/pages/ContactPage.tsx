import { motion } from "motion/react";
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const contactInfo = [
  {
    title: "Call Us",
    detail: "+63 921 469 7142",
    icon: Phone,
    action: "tel:+639214697142"
  },
  {
    title: "Email Us",
    detail: "rpcatering@gmail.com",
    icon: Mail,
    action: "mailto:rpcatering@gmail.com"
  },
  {
    title: "Our Location",
    detail: "Javier Compound, L. Wood St., Dolores, Taytay, Rizal",
    icon: MapPin,
    action: "https://maps.google.com"
  },
  {
    title: "Office Hours",
    detail: "Mon - Sat: 9:00 AM - 6:00 PM",
    icon: Clock,
    action: null
  }
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-rich-black pt-24 font-sans text-white">
      {/* Header */}
      <header className="px-10 py-20 text-center border-b border-white/10">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-gold-400 text-[12px] tracking-[0.5em] font-bold uppercase mb-6 block"
        >
          Connect With Us
        </motion.span>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-serif text-white mb-8"
        >
          Get In <span className="italic gold-text-gradient">Touch</span>
        </motion.h1>
      </header>

      {/* Info Cards Section */}
      <section className="py-20 px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {contactInfo.map((info, i) => (
            <motion.div
              key={info.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 glass-card border border-white/10 flex flex-col items-center text-center group hover:border-gold-400/50 transition-all duration-500"
            >
              <div className="w-12 h-12 border border-gold-400/30 flex items-center justify-center text-gold-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                <info.icon size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 mb-2">{info.title}</h3>
              {info.action ? (
                <a href={info.action} className="text-sm font-serif text-white hover:text-gold-400 transition-colors">
                  {info.detail}
                </a>
              ) : (
                <p className="text-sm font-serif text-white">{info.detail}</p>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Map Section */}
      <section className="px-10 pb-20">
        <div className="max-w-7xl mx-auto h-[450px] border border-white/10 relative overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4163.146547807375!2d121.13233027542846!3d14.57230958591067!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c74983e4457f%3A0xa8fd45edcc38ed17!2sRoxan%20Policarpio%20Events%20and%20Catering!5e1!3m2!1sen!2sph!4v1776733590376!5m2!1sen!2sph"
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen={true} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            className="filter invert-[0.9] hue-rotate-[180deg]"
          />
          <div className="absolute top-8 left-8 glass-card border border-white/10 p-4 max-w-[200px]">
            <p className="text-[10px] uppercase tracking-widest text-gold-400 font-bold mb-2 italic">Our Location</p>
            <p className="text-[9px] uppercase tracking-widest text-white/60 font-semibold leading-relaxed">
              Serving premium events across Rizal and Metro Manila.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 px-10 bg-[#070707] border-y border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-4 block italic">Why Us</span>
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-8 leading-tight">Crafting Memories <br /><span className="italic">Beyond the Plate</span></h2>
            <div className="space-y-8">
              {[
                { title: "Artistic Presentation", desc: "We believe food should please the eye as much as the palate." },
                { title: "Meticulous Planning", desc: "Every logistical detail is handled with surgical precision." },
                { title: "Seamless Execution", desc: "Our waitstaff is trained in the fine art of subtle, attentive service." }
              ].map((item, i) => (
                <div key={item.title} className="flex gap-6">
                  <span className="text-gold-400/20 text-3xl font-serif italic">0{i+1}</span>
                  <div>
                    <h4 className="text-[11px] uppercase tracking-widest font-bold text-white mb-2">{item.title}</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed font-semibold">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img 
              src="https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?auto=format&fit=crop&q=80&w=600" 
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 aspect-[4/5] border border-white/10" 
              alt="Catering Setup"
            />
            <img 
              src="https://images.unsplash.com/photo-1533143048019-301bd1fcc077?auto=format&fit=crop&q=80&w=600" 
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 aspect-[4/5] mt-8 border border-white/10" 
              alt="Gourmet Food"
            />
          </div>
        </div>
      </section>

      {/* Social Links Section */}
      <section className="py-20 px-10 text-center">
        <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-8 block italic">Follow Our Journey</span>
        <div className="flex justify-center gap-12">
          {[
            { name: "Facebook", icon: Facebook, href: "https://facebook.com" },
            { name: "Instagram", icon: Instagram, href: "https://instagram.com" },
            { name: "Messenger", icon: MessageCircle, href: "https://messenger.com" }
          ].map((social) => (
            <motion.a
              key={social.name}
              href={social.href}
              whileHover={{ y: -5 }}
              className="group flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-gold-400 group-hover:border-gold-400/50 transition-all">
                <social.icon size={18} strokeWidth={1} />
              </div>
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/20 group-hover:text-gold-400 transition-colors">
                {social.name}
              </span>
            </motion.a>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-8 block italic">Reserve Your Date</span>
            <h2 className="text-4xl md:text-7xl font-serif text-white mb-12 leading-tight uppercase">Ready to <span className="italic">Collaborate?</span></h2>
            <Link 
              to="/booking" 
              className="gold-gradient text-black px-16 py-5 font-bold tracking-widest uppercase text-xs hover:brightness-110 transition-all inline-block"
            >
               Request Quote
            </Link>
        </div>
      </section>
    </div>
  );
}
