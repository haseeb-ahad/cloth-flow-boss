import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Package, 
  BarChart3, 
  CreditCard, 
  Wallet, 
  Users, 
  ChevronRight,
  Star,
  ArrowRight,
  Zap,
  Shield,
  Clock,
  LayoutDashboard,
  Receipt,
  History,
  Banknote,
  HandCoins,
  UserCog,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import testimonialSalman from "@/assets/testimonial-salman.png";
import testimonialHaseeb from "@/assets/testimonial-haseeb.jpeg";
import testimonialAmeer from "@/assets/testimonial-ameer.jpeg";
import testimonial4th from "@/assets/testimonial-4th.jpeg";
import dashboardPreview from "@/assets/dashboard-preview.jpeg";
import invoxaLogo from "@/assets/invoxa-logo.png";

const heroAvatars = [
  testimonialSalman,
  testimonialHaseeb,
  testimonialAmeer,
  testimonial4th
];

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const floatingAnimation = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }
};

const pulseAnimation = {
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }
};

const features = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Get a complete overview of your business with real-time analytics and insights.",
    bgColor: "bg-gradient-to-br from-blue-500 to-indigo-600"
  },
  {
    icon: FileText,
    title: "New Invoice",
    description: "Generate professional invoices instantly with customizable templates.",
    bgColor: "bg-gradient-to-br from-cyan-400 to-teal-500"
  },
  {
    icon: Package,
    title: "Inventory",
    description: "Track stock levels dynamically with real-time updates and low-stock alerts.",
    bgColor: "bg-gradient-to-br from-pink-400 to-purple-500"
  },
  {
    icon: History,
    title: "Sales History",
    description: "View complete sales records with detailed transaction history.",
    bgColor: "bg-gradient-to-br from-orange-400 to-amber-500"
  },
  {
    icon: CreditCard,
    title: "Credits",
    description: "Manage customer credits with automatic FIFO allocation tracking.",
    bgColor: "bg-gradient-to-br from-emerald-400 to-teal-500"
  },
  {
    icon: Users,
    title: "Customers",
    description: "Manage customer profiles and track their purchase history.",
    bgColor: "bg-gradient-to-br from-violet-400 to-purple-500"
  }
];

const testimonials = [
  {
    name: "Muhammad Salman Mehmood",
    role: "Retail Store Owner",
    content: "Invoxa transformed how we manage our inventory. The real-time tracking and automated invoicing save us hours every week.",
    rating: 5,
    image: testimonialSalman
  },
  {
    name: "Abdul Haseeb",
    role: "Wholesale Business",
    content: "The credit management feature is a game-changer. We can now track customer balances effortlessly.",
    rating: 5,
    image: testimonialHaseeb
  },
  {
    name: "Ameer Hamza Sadiq",
    role: "Textile Shop Owner",
    content: "Best investment for our business. The analytics help us make better decisions every day.",
    rating: 5,
    image: testimonialAmeer
  }
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            x: [0, 100, 0], 
            y: [0, -50, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, -80, 0], 
            y: [0, 80, 0],
            rotate: [360, 180, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-pink-200/30 to-orange-200/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, 60, 0], 
            y: [0, -60, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 right-1/4 w-64 h-64 bg-gradient-to-br from-cyan-200/30 to-blue-200/30 rounded-full blur-3xl"
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-50 px-6 py-4 lg:px-12"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2"
          >
            <img src={invoxaLogo} alt="Invoxa" className="w-10 h-10 rounded-xl" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Invoxa
            </span>
          </motion.div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors font-semibold">Features</a>
            <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors font-semibold">Testimonials</a>
            <Link to="/pricing" className="text-slate-600 hover:text-slate-900 transition-colors font-semibold">Pricing</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" className="text-slate-700 hover:text-slate-900">
                  Login
                </Button>
              </motion.div>
            </Link>
            <Link to="/signup">
              <motion.div 
                whileHover={{ scale: 1.05, boxShadow: "0 10px 40px -10px rgba(99, 102, 241, 0.4)" }} 
                whileTap={{ scale: 0.95 }}
              >
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25">
                  Get Started
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section with Purple Gradient */}
      <section className="relative z-10 px-6 pt-8 pb-32 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-sm font-medium"
              >
                <Zap className="w-4 h-4" />
                Trusted by 1000+ businesses
              </motion.div>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-slate-900">Simplify Your</span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Business Finances
                </span>
                <br />
                <span className="text-slate-900">with Invoxa</span>
              </h1>
              
              <p className="text-xl text-slate-600 max-w-lg leading-relaxed">
                Manage invoices, inventory, payments, customers, and more—all in one powerful platform designed for modern businesses.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <motion.div
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 60px -15px rgba(99, 102, 241, 0.5)" }}
                    whileTap={{ scale: 0.95 }}
                    {...pulseAnimation}
                  >
                    <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg px-8 py-6 shadow-xl shadow-blue-500/30">
                      Start Free Trial
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                </Link>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50">
                    Watch Demo
                  </Button>
                </motion.div>
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {heroAvatars.map((img, i) => (
                    <img 
                      key={i} 
                      src={img} 
                      alt={`User ${i + 1}`}
                      className={`w-10 h-10 rounded-full border-2 border-white object-cover ${i === 3 ? 'object-[center_30%]' : 'object-[center_15%]'}`}
                    />
                  ))}
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">500+</span> businesses trust Invoxa
                </div>
              </div>
            </motion.div>

            {/* Dashboard Preview Image */}
            <motion.div
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
              >
                <img 
                  src={dashboardPreview} 
                  alt="Invoxa Dashboard Preview" 
                  className="w-full rounded-2xl shadow-2xl border border-slate-200"
                />
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-24 lg:px-12 bg-gradient-to-b from-transparent to-slate-50/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-sm font-medium mb-4">
              <Shield className="w-4 h-4" />
              Powerful Features
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Everything You Need to
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Run Your Business
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              A complete suite of tools designed to streamline your operations and boost productivity.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                whileHover={{ 
                  y: -8, 
                  scale: 1.02,
                  boxShadow: "0 20px 50px -15px rgba(0, 0, 0, 0.15)" 
                }}
                className="group bg-white rounded-2xl p-8 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <motion.div
                  initial={{ rotate: 0 }}
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.4 }}
                  className={`w-16 h-16 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-shadow`}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
                <motion.div 
                  initial={{ width: 0 }}
                  whileHover={{ width: "100%" }}
                  className="h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 mt-4 rounded-full"
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 px-6 py-24 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-12 lg:p-16"
          >
            <div className="grid md:grid-cols-4 gap-8 text-center text-white">
              {[
                { value: "10K+", label: "Invoices Generated" },
                { value: "500+", label: "Active Businesses" },
                { value: "99.9%", label: "Uptime" },
                { value: "24/7", label: "Support" }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="text-4xl lg:text-5xl font-bold mb-2">{stat.value}</div>
                  <div className="text-white/80">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative z-10 px-6 py-24 lg:px-12 bg-gradient-to-b from-slate-50/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-sm font-medium mb-4">
              <Star className="w-4 h-4 fill-current" />
              Customer Stories
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Loved by Businesses
              <br />
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                Just Like Yours
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl p-8 border border-slate-100 shadow-lg"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-600 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full object-cover object-[center_15%]"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-500">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-24 lg:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900">
              Ready to Transform
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Your Business?
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Join thousands of businesses already using Invoxa to streamline their operations.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/signup">
                <motion.div
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 60px -15px rgba(99, 102, 241, 0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(99, 102, 241, 0)",
                      "0 0 0 10px rgba(99, 102, 241, 0.1)",
                      "0 0 0 0 rgba(99, 102, 241, 0)"
                    ]
                  }}
                  transition={{
                    boxShadow: { duration: 2, repeat: Infinity }
                  }}
                >
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg px-10 py-6 shadow-xl">
                    Get Started Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              </Link>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-slate-500 flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              No credit card required • Start in 2 minutes
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-16 lg:px-12 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src={invoxaLogo} alt="Invoxa" className="w-10 h-10 rounded-xl" />
                <span className="text-2xl font-bold">Invoxa</span>
              </div>
              <p className="text-slate-400">
                The all-in-one platform for modern business management.
              </p>
            </div>
            
            {[
              { title: "Product", links: ["Features", "Pricing", "Updates", "Beta"] },
              { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
              { title: "Support", links: ["Help Center", "Documentation", "API", "Status"] }
            ].map((section, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link, j) => (
                    <li key={j}>
                      <motion.a
                        href="#"
                        whileHover={{ x: 5 }}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        {link}
                      </motion.a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              © 2024 Invoxa. All rights reserved.
            </p>
            <div className="flex gap-4">
              {["Twitter", "LinkedIn", "GitHub"].map((social, i) => (
                <motion.a
                  key={i}
                  href="#"
                  whileHover={{ scale: 1.2, color: "#fff" }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {social}
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
