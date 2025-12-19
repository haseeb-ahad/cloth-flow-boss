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
  Sparkles,
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
    icon: Banknote,
    title: "Cash Credit",
    description: "Handle cash credit transactions with real-time balance updates.",
    bgColor: "bg-gradient-to-br from-yellow-400 to-orange-500"
  },
  {
    icon: HandCoins,
    title: "Receive Payment",
    description: "Record payments easily and track outstanding balances.",
    bgColor: "bg-gradient-to-br from-green-400 to-emerald-500"
  },
  {
    icon: Wallet,
    title: "Expenses",
    description: "Monitor and categorize expenses with real-time profit calculations.",
    bgColor: "bg-gradient-to-br from-rose-400 to-pink-500"
  },
  {
    icon: Users,
    title: "Customers",
    description: "Manage customer profiles and track their purchase history.",
    bgColor: "bg-gradient-to-br from-violet-400 to-purple-500"
  },
  {
    icon: UserCog,
    title: "Manage Workers",
    description: "Assign roles and manage workers with granular permissions.",
    bgColor: "bg-gradient-to-br from-sky-400 to-blue-500"
  },
  {
    icon: Settings,
    title: "Settings",
    description: "Customize your store settings and preferences.",
    bgColor: "bg-gradient-to-br from-slate-400 to-gray-500"
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Invoxa
            </span>
          </motion.div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors">Testimonials</a>
            <Link to="/pricing" className="text-slate-600 hover:text-slate-900 transition-colors">Pricing</Link>
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

            {/* Laptop Mockup with Dashboard */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              {/* Purple Gradient Background Behind Laptop */}
              <div className="absolute inset-0 -top-20 -right-20 -bottom-20 -left-10 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-[3rem] blur-sm opacity-90" />
              
              {/* Floating Widgets - Top Left */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                {...floatingAnimation}
                className="absolute -top-8 left-4 z-30 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl p-4 shadow-xl"
              >
                <div className="text-white/80 text-xs font-medium">Business Categories</div>
                <div className="flex items-center justify-between gap-4 mt-1">
                  <span className="text-3xl font-bold text-white">8</span>
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <LayoutDashboard className="w-5 h-5 text-white" />
                  </div>
                </div>
              </motion.div>

              {/* Floating Widget - Top Right */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                {...floatingAnimation}
                className="absolute -top-4 -right-4 z-30 bg-white rounded-2xl p-4 shadow-xl border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Product</div>
                    <div className="text-sm font-bold text-slate-900">Management</div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Widget - Left Side - Daily Traffic */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 }}
                className="absolute left-0 top-1/3 -translate-x-1/2 z-30 bg-white rounded-2xl p-4 shadow-xl border border-slate-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">Daily Traffic</span>
                  <span className="text-xs text-green-500 font-medium">+3.48%</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">2,579</div>
                <div className="text-xs text-slate-400">Visitors</div>
                <div className="flex items-end gap-1 mt-3 h-12">
                  {[30, 50, 35, 60, 45, 70, 55, 80, 65].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 1.4 + i * 0.05 }}
                      className={`w-2 rounded-sm ${i < 7 ? 'bg-blue-500' : 'bg-purple-500'}`}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Floating Widget - Right Side - Pie Chart */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4 }}
                className="absolute -right-8 top-1/2 z-30 bg-white rounded-2xl p-4 shadow-xl border border-slate-100"
              >
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="20" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#06b6d4" strokeWidth="20" strokeDasharray="140 251" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" strokeWidth="20" strokeDasharray="75 251" strokeDashoffset="-140" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f472b6" strokeWidth="20" strokeDasharray="36 251" strokeDashoffset="-215" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-900">56%</span>
                    <span className="text-[10px] text-slate-500">Mobile</span>
                  </div>
                </div>
              </motion.div>

              {/* Floating Widget - Bottom Center */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6 }}
                className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-30 bg-white rounded-2xl p-4 shadow-xl border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500" />
                    <div className="absolute inset-1 rounded-full bg-white flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-xs font-bold text-cyan-500">56%</div>
                        <div className="text-[8px] text-slate-400">Mobile App</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-xs text-slate-600">Website <span className="font-bold text-purple-600">30%</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-pink-500" />
                      <span className="text-xs text-slate-600">WhatsApp <span className="font-bold text-pink-500">14%</span></span>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Laptop Frame */}
              <motion.div
                {...floatingAnimation}
                className="relative z-10 mx-8 mt-8"
              >
                {/* Screen */}
                <div className="bg-slate-800 rounded-t-xl p-2">
                  <div className="bg-white rounded-lg overflow-hidden">
                    {/* Browser Bar */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border-b">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      <div className="flex-1 flex justify-center">
                        <div className="bg-white rounded-full px-4 py-1 text-xs text-slate-400 border">
                          invoxa.app/dashboard
                        </div>
                      </div>
                    </div>
                    
                    {/* Dashboard Content */}
                    <div className="flex">
                      {/* Sidebar */}
                      <div className="w-40 bg-white border-r p-3 hidden sm:block">
                        <div className="flex items-center gap-2 bg-blue-500 text-white rounded-lg px-3 py-2 text-xs font-medium mb-3">
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </div>
                        {['New Invoice', 'Inventory', 'Sales History', 'Credits', 'Customers'].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-slate-500 px-3 py-1.5 text-xs">
                            <div className="w-4 h-4 rounded bg-slate-100" />
                            {item}
                          </div>
                        ))}
                      </div>
                      
                      {/* Main Content */}
                      <div className="flex-1 p-4 bg-slate-50">
                        <div className="text-sm font-bold text-slate-900 mb-3">Dashboard</div>
                        
                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {[
                            { label: "Revenue", value: "PKR 125,000", color: "text-blue-600" },
                            { label: "Profit", value: "PKR 45,000", color: "text-green-600" },
                            { label: "Credits", value: "PKR 23,000", color: "text-purple-600" }
                          ].map((stat, i) => (
                            <div key={i} className="bg-white rounded-lg p-2 shadow-sm">
                              <div className={`text-[10px] font-medium ${stat.color}`}>{stat.label}</div>
                              <div className="text-xs font-bold text-slate-900">{stat.value}</div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Chart Area */}
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-[10px] text-slate-500 mb-2">Sales Overview</div>
                          <div className="flex items-end gap-1 h-20">
                            {[35, 55, 40, 70, 50, 65, 85].map((h, i) => (
                              <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                                className="flex-1 rounded-t bg-gradient-to-t from-blue-600 to-purple-500"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Laptop Base */}
                <div className="bg-gradient-to-b from-slate-700 to-slate-800 h-4 rounded-b-xl mx-auto" />
                <div className="bg-gradient-to-b from-slate-600 to-slate-700 h-2 rounded-b-lg mx-12" />
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
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -4, boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.1)" }}
                className="group bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-5 shadow-lg`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
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
