import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  FileText,
  Package,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import testimonialSalman from "@/assets/testimonial-salman.png";
import testimonialHaseeb from "@/assets/testimonial-haseeb.jpeg";
import testimonialAmeer from "@/assets/testimonial-ameer.jpeg";
import testimonial4th from "@/assets/testimonial-4th.jpeg";
import dashboardPreview from "@/assets/dashboard-preview.jpeg";
import invoxaLogo from "@/assets/invoxa-logo.png";

const heroAvatars = [testimonialSalman, testimonialHaseeb, testimonialAmeer, testimonial4th];

const features = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Real-time analytics and a complete overview of your business at a glance.",
    span: "md:col-span-2 md:row-span-2",
    featured: true,
  },
  {
    icon: FileText,
    title: "New Invoice",
    description: "Generate professional invoices instantly with customizable templates.",
    span: "md:col-span-2",
  },
  {
    icon: Package,
    title: "Inventory",
    description: "Track stock dynamically with low-stock alerts.",
    span: "",
  },
  {
    icon: History,
    title: "Sales History",
    description: "Complete transaction records, always searchable.",
    span: "",
  },
  {
    icon: CreditCard,
    title: "Credits",
    description: "Customer credits with automatic FIFO allocation.",
    span: "",
  },
  {
    icon: Wallet,
    title: "Credit Management",
    description: "Udhar payments with customer-wise history.",
    span: "",
  },
  {
    icon: Banknote,
    title: "Receive Payment",
    description: "Record incoming payments with image proof.",
    span: "md:col-span-2",
  },
  {
    icon: Receipt,
    title: "Expenses",
    description: "Categorised expense monitoring and reporting.",
    span: "",
  },
  {
    icon: Users,
    title: "Customers",
    description: "Profiles and purchase history in one place.",
    span: "",
  },
];

const testimonials = [
  {
    name: "Muhammad Salman Mehmood",
    role: "Retail Store Owner",
    content:
      "Invoxa transformed how we manage our inventory. The real-time tracking and automated invoicing save us hours every week.",
    rating: 5,
    image: testimonialSalman,
  },
  {
    name: "Abdul Haseeb",
    role: "Wholesale Business",
    content: "The credit management feature is a game-changer. We can now track customer balances effortlessly.",
    rating: 5,
    image: testimonialHaseeb,
  },
  {
    name: "Ameer Hamza Sadiq",
    role: "Textile Shop Owner",
    content: "Best investment for our business. The analytics help us make better decisions every day.",
    rating: 5,
    image: testimonialAmeer,
  },
];

const stats = [
  { value: "10K+", label: "Invoices Generated" },
  { value: "500+", label: "Active Businesses" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
];

const Landing = () => {
  const { setTheme, theme } = useTheme();

  // Landing page renders its own scoped midnight theme
  useEffect(() => {
    const previousTheme = theme;
    setTheme("light");
    return () => {
      if (previousTheme && previousTheme !== "light") setTheme(previousTheme);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="landing-midnight min-h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="grid-lines absolute inset-0 opacity-60" />
        <motion.div
          animate={{ x: [0, 80, 0], y: [0, -40, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-[140px]"
        />
        <motion.div
          animate={{ x: [0, -60, 0], y: [0, 60, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-secondary/60 blur-[140px]"
        />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-50 px-6 py-5 lg:px-12"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-border/70 bg-card/50 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <img src={invoxaLogo} alt="Invoxa logo" className="h-16 w-auto" />
          </div>


          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Testimonials
            </a>
            <Link to="/pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <Link to="/login">
              <Button variant="ghost" className="px-2 text-foreground hover:bg-secondary/60 sm:px-4">
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-primary px-3 text-primary-foreground shadow-glow hover:bg-primary/90 sm:px-4">
                Get Started
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative z-10 px-6 pb-24 pt-14 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium text-muted-foreground">
                <Zap className="h-4 w-4 text-primary" />
                Trusted by 1000+ businesses
              </div>

              <h1 className="text-5xl font-extrabold leading-[1.05] text-foreground lg:text-7xl">
                Simplify your
                <br />
                <span className="gradient-text">business finances</span>
                <br />
                with Invoxa
              </h1>

              <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                Invoices, inventory, payments, credits and customers — one dark, focused control room for your entire operation.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/signup">
                  <Button size="lg" className="w-full bg-primary px-8 py-6 text-lg text-primary-foreground shadow-glow hover:bg-primary/90 sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-border bg-transparent px-8 py-6 text-lg text-foreground hover:bg-secondary/60 sm:w-auto"
                >
                  Watch Demo
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex -space-x-3">
                  {heroAvatars.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Invoxa customer ${i + 1}`}
                      className={`h-10 w-10 rounded-full border-2 border-card object-cover ${
                        i === 3 ? "object-[center_30%]" : "object-[center_15%]"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">500+</span> businesses trust Invoxa
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative"
            >
              <div className="bento-card overflow-hidden p-3">
                <img src={dashboardPreview} alt="Invoxa dashboard preview" className="w-full rounded-xl" loading="lazy" />
              </div>
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-primary/20 blur-3xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bento Features */}
      <section id="features" className="relative z-10 px-6 py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 max-w-2xl"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              Powerful Features
            </div>
            <h2 className="text-4xl font-bold text-foreground lg:text-5xl">
              Everything you need to <span className="gradient-text">run your business</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A complete suite of tools, arranged the way you actually work.
            </p>
          </motion.div>

          <div className="grid auto-rows-[minmax(11rem,auto)] grid-cols-1 gap-4 md:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: (index % 4) * 0.06 }}
                className={`bento-card group relative flex flex-col justify-between overflow-hidden p-6 ${feature.span}`}
              >
                <div
                  className={`flex items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground ${
                    feature.featured ? "h-16 w-16" : "h-12 w-12"
                  }`}
                >
                  <feature.icon className={feature.featured ? "h-8 w-8" : "h-6 w-6"} />
                </div>
                <div className="mt-6">
                  <h3 className={`font-bold text-foreground ${feature.featured ? "text-3xl" : "text-lg"}`}>
                    {feature.title}
                  </h3>
                  <p className={`mt-2 leading-relaxed text-muted-foreground ${feature.featured ? "text-base" : "text-sm"}`}>
                    {feature.description}
                  </p>
                </div>
                {feature.featured && (
                  <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 px-6 py-12 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bento-card p-8 text-center"
              >
                <div className="font-display text-4xl font-bold text-foreground lg:text-5xl">{stat.value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative z-10 px-6 py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 max-w-2xl"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium text-muted-foreground">
              <Star className="h-4 w-4 fill-current text-primary" />
              Customer Stories
            </div>
            <h2 className="text-4xl font-bold text-foreground lg:text-5xl">
              Loved by businesses <span className="gradient-text">just like yours</span>
            </h2>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bento-card p-8"
              >
                <div className="mb-4 flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current text-primary" />
                  ))}
                </div>
                <p className="mb-6 leading-relaxed text-muted-foreground">"{testimonial.content}"</p>
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="h-12 w-12 rounded-full object-cover object-[center_15%]"
                    loading="lazy"
                  />
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-24 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bento-card mx-auto max-w-5xl overflow-hidden p-12 text-center lg:p-16"
        >
          <h2 className="text-4xl font-bold text-foreground lg:text-5xl">
            Ready to transform <span className="gradient-text">your business?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Join thousands of businesses already using Invoxa to streamline their operations.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-primary px-10 py-6 text-lg text-primary-foreground shadow-glow hover:bg-primary/90">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            No credit card required • Start in 2 minutes
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid gap-12 md:grid-cols-4">
            <div className="space-y-4">
              <img src={invoxaLogo} alt="Invoxa logo" className="h-24 w-auto" />
              <p className="text-muted-foreground">The all-in-one platform for modern business management.</p>
            </div>


            {[
              { title: "Product", links: ["Features", "Pricing", "Updates", "Beta"] },
              { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
              { title: "Support", links: ["Help Center", "Documentation", "API", "Status"] },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="mb-4 font-semibold text-foreground">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
            <p className="text-sm text-muted-foreground">© 2026 Invoxa. All rights reserved.</p>
            <div className="flex gap-4">
              {["Twitter", "LinkedIn", "GitHub"].map((social) => (
                <a key={social} href="#" className="text-muted-foreground transition-colors hover:text-foreground">
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
