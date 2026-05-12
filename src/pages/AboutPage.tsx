import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Sparkles, Heart, Award } from "lucide-react";

const values = [
  {
    title: "Quality First",
    description: "We use only the freshest, premium ingredients, turning every dish into a gastronomic masterpiece.",
    icon: Sparkles
  },
  {
    title: "Personalized Service",
    description: "Every event is unique. Our team works closely with you to tailor every detail to your specific vision.",
    icon: Heart
  },
  {
    title: "Affordable Premium",
    description: "Experience luxury without the compromise. We deliver high-end service at competitive, transparent price points.",
    icon: Award
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-rich-black pt-24 font-sans text-white">
      {/* Header */}
      <header className="px-10 py-20 text-center border-b border-white/10">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-gold-400 text-[12px] tracking-[0.5em] font-bold uppercase mb-6 block"
        >
          Behind the Craft
        </motion.span>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-serif text-white mb-8"
        >
          Our <span className="italic gold-text-gradient">Story</span>
        </motion.h1>
      </header>

      {/* Our Story Section */}
      <section className="py-24 px-10 border-b border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute -inset-4 border border-gold-400/20 z-0"></div>
            <img 
              src="https://scontent.fmnl17-3.fna.fbcdn.net/v/t1.15752-9/696223294_1463671008399082_3075120905317355661_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeF8Y1R0NyhMvp8gl9ixD8IuMmuqx43po3Uya6rHjemjdUfxja92Q5vtTvTw-_J2pPpUL1cCao3gCtVjfkVj659e&_nc_ohc=ODlXDTe3ta8Q7kNvwFsx7uN&_nc_oc=AdqPZ2cRRNZKL2quPxdm2IiL8WaaseY9oPAZYYlr0TT5LuL8pGLPt2T5ztAckwqv180&_nc_zt=23&_nc_ht=scontent.fmnl17-3.fna&_nc_ss=7b2a8&oh=03_Q7cD5QFjPgKrvwkRZPYDKGi3NdV5QH2732T_Ab67mk1COEjLMg&oe=6A2A1AF5" 
              alt="Chef at work" 
              className="relative z-10 w-full aspect-[4/5] object-cover grayscale hover:grayscale-0 transition-all duration-700"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-8 block italic font-serif">A Culinary Legacy</span>
            <p className="text-2xl md:text-3xl font-serif italic text-white/90 mb-8 leading-relaxed">
              Founded on the belief that fine dining should be an accessible experience for all of life's most meaningful milestones.
            </p>
            <div className="space-y-6 text-white/50 text-[11px] uppercase tracking-[0.4em] font-bold leading-loose">
              <p>
                Roxan Policarpio Events & Catering began as a small passion project, fueled by a deep love for Filipino hospitality and global culinary techniques. Over the years, we have evolved into a full-service catering brand known for our meticulous attention to detail and artistic presentation.
              </p>
              <p>
                Our journey has been defined by the smiles of thousands of guests and the success of countless events—from intimate garden weddings and milestone birthdays to grand corporate galas for hundreds of attendees.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-24 px-10 bg-[#070707]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-4 block italic">Our Foundations</span>
            <h2 className="text-4xl md:text-6xl font-serif tracking-tight text-white uppercase">The Pillars of <span className="italic">Excellence</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="p-10 glass-card border border-white/10 text-center group hover:border-gold-400/50 transition-all duration-500"
              >
                <div className="mb-8 flex justify-center">
                  <div className="w-16 h-16 border border-gold-400/30 flex items-center justify-center text-gold-400 group-hover:scale-110 transition-transform duration-500">
                    <value.icon size={28} strokeWidth={1} />
                  </div>
                </div>
                <h3 className="text-xl font-serif text-white mb-4 uppercase tracking-widest">{value.title}</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] leading-relaxed font-bold">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-8 block italic">Let's Create Magic</span>
            <h2 className="text-4xl md:text-7xl font-serif text-white mb-12 leading-tight uppercase">Ready to <span className="italic">Elevate</span> <br /> Your Celebration?</h2>
            <Link 
              to="/booking" 
              className="gold-gradient text-black px-16 py-5 font-bold tracking-widest uppercase text-xs hover:brightness-110 transition-all inline-block"
            >
               Book Your Event Now
            </Link>
            <div className="mt-12 flex items-center gap-4">
               <div className="w-12 h-[1px] bg-white/10"></div>
               <Link to="/" className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-gold-400 transition-colors font-bold">Return to Home</Link>
               <div className="w-12 h-[1px] bg-white/10"></div>
            </div>
        </div>
      </section>
    </div>
  );
}
