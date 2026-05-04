import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Calendar, 
  Users, 
  MapPin, 
  Clock, 
  Info,
  Package,
  Utensils,
  PlusCircle,
  ClipboardCheck
} from "lucide-react";

interface FormData {
  packageId: string;
  eventType: string;
  date: string;
  time: string;
  guestCount: string;
  venueName: string;
  venueAddress: string;
  menuSelections: {
    appetizers: string[];
    mainCourses: string[];
    soups: string[];
    starters: string[];
    restrictions: string[];
  };
  additionalServices: string[];
  contactInfo: {
    name: string;
    email: string;
    phone: string;
    message: string;
  };
}

const steps = [
  { id: 1, title: "Package", icon: Package },
  { id: 2, title: "Details", icon: Calendar },
  { id: 3, title: "Menu", icon: Utensils },
  { id: 4, title: "Services", icon: PlusCircle },
  { id: 5, title: "Review", icon: ClipboardCheck },
];

const availablePackages = [
  { id: "bronze", name: "Bronze", price: "₱350/px" },
  { id: "silver", name: "Silver", price: "₱450/px" },
  { id: "gold", name: "Gold", price: "₱650/px" },
  { id: "wedding", name: "Wedding", price: "Custom" },
  { id: "birthday", name: "Birthday", price: "₱500/px" },
  { id: "christening", name: "Christening", price: "₱400/px" },
];

const menuOptions = {
  appetizers: ["Wagyu Carpaccio", "Baked Camembert", "Scallop Ceviche", "Arancini Balls", "Bruschetta Trio"],
  mainCourses: ["Herb-Crusted Salmon", "Angus Ribeye", "Truffle Pasta", "Roasted Duck", "Braised Short Ribs"],
  soups: ["French Onion", "Pumpkin Ginger", "Seafood Bisque", "Wild Mushroom"],
  starters: ["Caprese Salad", "Caesar Deluxe", "Arugula Pear", "Burrata Salad"],
};

const servicesOptions = [
  "Beverage Service",
  "Table Setup & Decor",
  "Professional Waitstaff",
  "Equipment Rental",
  "On-site Chef Service",
  "Floral Arrangements"
];

export default function BookingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    packageId: "",
    eventType: "",
    date: "",
    time: "",
    guestCount: "",
    venueName: "",
    venueAddress: "",
    menuSelections: {
      appetizers: [],
      mainCourses: [],
      soups: [],
      starters: [],
      restrictions: [],
    },
    additionalServices: [],
    contactInfo: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handlePackageSelect = (id: string) => {
    setFormData({ ...formData, packageId: id });
    nextStep();
  };

  const handleMenuToggle = (category: keyof typeof formData.menuSelections, item: string) => {
    const current = formData.menuSelections[category] as string[];
    const updated = current.includes(item) 
      ? current.filter(i => i !== item)
      : [...current, item];
    
    setFormData({
      ...formData,
      menuSelections: {
        ...formData.menuSelections,
        [category]: updated
      }
    });
  };

  const handleServiceToggle = (service: string) => {
    const current = formData.additionalServices;
    const updated = current.includes(service)
      ? current.filter(s => s !== service)
      : [...current, service];
    setFormData({ ...formData, additionalServices: updated });
  };

  return (
    <div className="min-h-screen bg-rich-black pt-24 font-sans text-white">
      {/* Header */}
      <header className="px-10 pt-16 pb-12 text-center border-b border-white/10">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-4 block italic"
        >
          Event Reservation
        </motion.span>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-serif text-white uppercase italic"
        >
          Booking <span className="gold-text-gradient not-italic font-bold">Flow</span>
        </motion.h1>
      </header>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-10 py-12">
        <div className="flex justify-between relative">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2 z-0" />
          {steps.map((step) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border ${
                  currentStep >= step.id 
                    ? "bg-gold-400 border-gold-400 text-black" 
                    : "bg-rich-black border-white/10 text-white/40"
                }`}
              >
                <step.icon size={16} strokeWidth={2.5} />
              </div>
              <span className={`text-[8px] uppercase tracking-widest mt-3 font-bold ${
                currentStep >= step.id ? "text-gold-400" : "text-white/20"
              }`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-10 pb-32">
        <AnimatePresence mode="wait">
          {/* Step 1: Package Selection */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <div className="col-span-full mb-8">
                <h2 className="text-2xl font-serif mb-2">Select Your Collection</h2>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Choose the base package that fits your event scale.</p>
              </div>
              {availablePackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg.id)}
                  className={`p-8 glass-card border transition-all text-left group flex flex-col justify-between h-48 ${
                    formData.packageId === pkg.id ? "border-gold-400 bg-gold-400/5" : "border-white/10 hover:border-gold-400/50"
                  }`}
                >
                  <div>
                    <h3 className="text-xl font-serif text-white mb-2 uppercase tracking-wider">{pkg.name}</h3>
                    <span className="text-gold-400 font-serif text-lg">{pkg.price}</span>
                  </div>
                  <div className="flex justify-end">
                    <div className={`p-2 border transition-all ${
                      formData.packageId === pkg.id ? "bg-gold-400 text-black border-gold-400" : "text-gold-400 border-gold-400/20 group-hover:bg-gold-400 group-hover:text-black"
                    }`}>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {/* Step 2: Event Details */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card border border-white/10 p-10 md:p-16"
            >
              <div className="mb-12">
                <h2 className="text-3xl font-serif mb-2 uppercase tracking-wide">Event <span className="italic gold-text-gradient">Specifications</span></h2>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">When, where, and for how many?</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">Event Type</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Wedding, Gala, Birthday"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium"
                    value={formData.eventType}
                    onChange={(e) => setFormData({...formData, eventType: e.target.value})}
                  />
                </div>
                <div className="space-y-2 text-white">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">Event Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium [color-scheme:dark]"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">Guest Count</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium"
                    value={formData.guestCount}
                    onChange={(e) => setFormData({...formData, guestCount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">Preferred Time</label>
                  <input 
                    type="time" 
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium [color-scheme:dark]"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                  />
                </div>
                <div className="col-span-full space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">Venue Name</label>
                  <input 
                    type="text" 
                    placeholder="Grand Ballroom, Private Residence..."
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium"
                    value={formData.venueName}
                    onChange={(e) => setFormData({...formData, venueName: e.target.value})}
                  />
                </div>
                <div className="col-span-full space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">Venue Address</label>
                  <textarea 
                    placeholder="Full street address..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium resize-none"
                    value={formData.venueAddress}
                    onChange={(e) => setFormData({...formData, venueAddress: e.target.value})}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Menu Customization */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="mb-12">
                <h2 className="text-3xl font-serif mb-2 uppercase tracking-wide">Menu <span className="italic gold-text-gradient">Curation</span></h2>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Select your preferred dishes for each course.</p>
              </div>

              {Object.entries(menuOptions).map(([category, items]) => (
                <div key={category} className="space-y-6">
                  <h3 className="text-[12px] uppercase tracking-[0.4em] text-gold-400 font-bold border-b border-gold-400/20 pb-4 italic">
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(item => (
                      <button
                        key={item}
                        onClick={() => handleMenuToggle(category as any, item)}
                        className={`p-5 glass-card border flex items-center justify-between transition-all group ${
                          formData.menuSelections[category as keyof typeof formData.menuSelections].includes(item)
                            ? "border-gold-400 bg-gold-400/5"
                            : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-widest font-bold">{item}</span>
                        <div className={`w-5 h-5 border flex items-center justify-center transition-all ${
                          formData.menuSelections[category as keyof typeof formData.menuSelections].includes(item)
                            ? "bg-gold-400 border-gold-400 text-black"
                            : "border-white/20 group-hover:border-gold-400"
                        }`}>
                          {formData.menuSelections[category as keyof typeof formData.menuSelections].includes(item) && <Check size={12} strokeWidth={4} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-10">
                <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold block mb-4">Dietary Restrictions & Special Notes</label>
                <textarea 
                  placeholder="Tell us about any allergies or specific dietary requirements..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium resize-none"
                  value={formData.menuSelections.restrictions.join('\n')}
                  onChange={(e) => setFormData({...formData, menuSelections: {...formData.menuSelections, restrictions: [e.target.value]}})}
                />
              </div>
            </motion.div>
          )}

          {/* Step 4: Additional Services & Contact */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-16"
            >
              <div className="space-y-12">
                <div>
                  <h2 className="text-3xl font-serif mb-2 uppercase tracking-wide italic gold-text-gradient">Additional Services</h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Enhance your event experience.</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {servicesOptions.map(service => (
                    <button
                      key={service}
                      onClick={() => handleServiceToggle(service)}
                      className={`p-6 glass-card border flex items-center justify-between transition-all group ${
                        formData.additionalServices.includes(service)
                          ? "border-gold-400 bg-gold-400/5"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <span className="text-[11px] uppercase tracking-[0.2em] font-bold">{service}</span>
                      <div className={`w-6 h-6 border flex items-center justify-center transition-all ${
                        formData.additionalServices.includes(service)
                          ? "bg-gold-400 border-gold-400 text-black"
                          : "border-white/20 group-hover:border-gold-400"
                      }`}>
                        {formData.additionalServices.includes(service) && <Check size={14} strokeWidth={4} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-10">
                <div>
                  <h2 className="text-3xl font-serif mb-2 uppercase tracking-wide">Contact <span className="italic gold-text-gradient">Information</span></h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">How can we reach you?</p>
                </div>
                <div className="space-y-8 p-10 bg-white/5 border border-white/10 relative">
                  <div className="absolute top-0 right-0 w-12 h-1 bg-gold-400" />
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">Full Name</label>
                    <input 
                      type="text" 
                      placeholder="Your Name"
                      className="w-full bg-transparent border-b border-white/10 py-3 text-sm focus:outline-none focus:border-gold-400 transition-all font-medium"
                      value={formData.contactInfo.name}
                      onChange={(e) => setFormData({...formData, contactInfo: {...formData.contactInfo, name: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="Email@example.com"
                      className="w-full bg-transparent border-b border-white/10 py-3 text-sm focus:outline-none focus:border-gold-400 transition-all font-medium"
                      value={formData.contactInfo.email}
                      onChange={(e) => setFormData({...formData, contactInfo: {...formData.contactInfo, email: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="+63 9XX XXX XXXX"
                      className="w-full bg-transparent border-b border-white/10 py-3 text-sm focus:outline-none focus:border-gold-400 transition-all font-medium"
                      value={formData.contactInfo.phone}
                      onChange={(e) => setFormData({...formData, contactInfo: {...formData.contactInfo, phone: e.target.value}})}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-serif mb-4 uppercase tracking-wide">Review Your <span className="italic gold-text-gradient">Request</span></h2>
                <p className="text-[11px] text-white/40 uppercase tracking-[0.3em] font-bold">Double check everything before submitting.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Event Summary Card */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="p-10 glass-card border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/5 rotate-45 translate-x-16 -translate-y-16" />
                    <h3 className="text-[12px] uppercase tracking-[0.4em] text-gold-400 font-bold mb-10 italic">1. Event Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                      <div className="flex gap-4">
                        <Package className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1">Catering Package</p>
                          <p className="text-sm font-serif uppercase tracking-wider">{availablePackages.find(p => p.id === formData.packageId)?.name || "Not Selected"}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Info className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1">Event Type</p>
                          <p className="text-sm font-serif uppercase tracking-wider">{formData.eventType || "Not Specified"}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Calendar className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1">Date & Time</p>
                          <p className="text-sm font-serif uppercase tracking-wider">{formData.date || "Not Set"} at {formData.time || "No Time"}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Users className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1">Guest Count</p>
                          <p className="text-sm font-serif uppercase tracking-wider">{formData.guestCount || "0"} People</p>
                        </div>
                      </div>
                      <div className="col-span-full flex gap-4 border-t border-white/5 pt-8">
                        <MapPin className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1">Venue Details</p>
                          <p className="text-sm font-serif uppercase tracking-wider mb-1">{formData.venueName || "Private Venue"}</p>
                          <p className="text-[9px] text-white/40 uppercase tracking-widest leading-relaxed">{formData.venueAddress || "Address not provided"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu & Services */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 glass-card border border-white/10">
                      <h3 className="text-[10px] uppercase tracking-[0.3em] text-gold-400 font-bold mb-8 italic">Menu Selection</h3>
                      <div className="space-y-6">
                        {Object.entries(formData.menuSelections).map(([category, items]) => {
                          if (category === 'restrictions') return null;
                          const list = items as string[];
                          if (list.length === 0) return null;
                          return (
                            <div key={category}>
                              <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-2">{category}</p>
                              <div className="flex flex-wrap gap-2">
                                {list.map(item => (
                                  <span key={item} className="text-[9px] px-3 py-1 bg-white/5 border border-white/10 uppercase tracking-widest text-white/60 font-semibold">{item}</span>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="p-8 glass-card border border-white/10">
                      <h3 className="text-[10px] uppercase tracking-[0.3em] text-gold-400 font-bold mb-8 italic">Add-on Services</h3>
                      <div className="space-y-4">
                        {formData.additionalServices.length > 0 ? (
                          formData.additionalServices.map(service => (
                            <div key={service} className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 bg-gold-400 rotate-45" />
                              <span className="text-[10px] uppercase tracking-widest text-white/80 font-bold">{service}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">No extra services selected.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Info Card */}
                <div className="space-y-8">
                  <div className="p-10 bg-gold-400 text-black border border-gold-400 shadow-[0_0_50px_rgba(197,160,89,0.15)] relative h-full">
                    <h3 className="text-[11px] uppercase tracking-[0.4em] font-bold mb-10 border-b border-black/10 pb-4 italic">Client Details</h3>
                    <div className="space-y-10">
                      <div>
                        <p className="text-[8px] uppercase tracking-widest font-bold mb-1 opacity-60">Full Name</p>
                        <p className="text-xl font-serif uppercase tracking-wider">{formData.contactInfo.name || "Anonymous Guest"}</p>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase tracking-widest font-bold mb-1 opacity-60">Email Address</p>
                        <p className="text-sm font-serif uppercase tracking-wider break-all">{formData.contactInfo.email || "No Email Provided"}</p>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase tracking-widest font-bold mb-1 opacity-60">Contact Number</p>
                        <p className="text-lg font-serif tracking-widest">{formData.contactInfo.phone || "No Phone Provided"}</p>
                      </div>
                    </div>
                    <div className="mt-16 space-y-4 pt-10 border-t border-black/10">
                       <p className="text-[9px] uppercase tracking-[0.2em] leading-relaxed font-bold opacity-70">
                         By submitting this request, you agree to our terms of service and refined catering standards.
                       </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center pt-20">
                <button className="gold-gradient text-black px-12 md:px-20 py-6 font-bold tracking-[0.4em] uppercase text-xs hover:brightness-110 transition-all shadow-[0_0_40px_rgba(197,160,89,0.2)]">
                  Confirm & Submit Inquiry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        {currentStep > 1 && (
          <div className="mt-20 flex flex-col md:flex-row justify-between items-center gap-6">
            <button 
              onClick={prevStep}
              className="flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] font-bold text-white/40 hover:text-gold-400 transition-colors"
            >
              <ChevronLeft size={16} /> Back to Previous
            </button>
            {currentStep < 5 && (
              <button 
                onClick={nextStep}
                className="gold-gradient text-black px-12 py-4 font-bold tracking-[0.3em] uppercase text-[10px] hover:brightness-110 transition-all flex items-center gap-3"
              >
                Continue to Next <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
