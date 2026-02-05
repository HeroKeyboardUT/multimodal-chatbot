"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Terminal,
  MessageSquare,
  Image,
  FileSpreadsheet,
  Zap,
  ArrowRight,
  Moon,
  Sun,
  Play,
  Bot,
  User,
  Upload,
  BarChart3,
  Code2,
  Cpu,
  Database,
  Globe,
  Layers,
  GitBranch,
  Check,
} from "lucide-react";

// Demo chat message component
function DemoMessage({
  role,
  content,
  delay,
}: {
  role: "user" | "assistant";
  content: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  return (
    <div
      className={`flex gap-3 ${role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
    >
      {role === "assistant" && (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
          role === "user"
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        }`}
      >
        {content}
      </div>
      {role === "user" && (
        <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [activeDemo, setActiveDemo] = useState<"chat" | "image" | "csv">(
    "chat",
  );
  const [activeSection, setActiveSection] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const sectionNames = [
    "Home",
    "Features",
    "Demo",
    "Tech Stack",
    "Get Started",
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Intersection observer for active section tracking
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionRefs.current.forEach((section, index) => {
      if (!section) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
              setActiveSection(index);
            }
          });
        },
        { threshold: 0.5 },
      );

      observer.observe(section);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  const scrollToSection = (index: number) => {
    sectionRefs.current[index]?.scrollIntoView({ behavior: "smooth" });
  };

  const techStack = {
    frontend: [
      { name: "Next.js 15", icon: Globe, desc: "React Framework" },
      { name: "TypeScript", icon: Code2, desc: "Type Safety" },
      { name: "Tailwind CSS", icon: Layers, desc: "Styling" },
      { name: "Recharts", icon: BarChart3, desc: "Data Visualization" },
    ],
    backend: [
      { name: "FastAPI", icon: Zap, desc: "Python API" },
      { name: "Groq API", icon: Cpu, desc: "LLM Provider" },
      { name: "SQLite", icon: Database, desc: "Database" },
      { name: "Llama 4 Scout", icon: Bot, desc: "Vision Model" },
    ],
  };

  const features = [
    {
      id: "chat",
      icon: MessageSquare,
      title: "Multi-turn Conversation",
      description:
        "Chat with AI while maintaining context and history. Real-time streaming support.",
      highlights: [
        "Streaming response",
        "Markdown rendering",
        "Code highlighting",
        "LaTeX & Mermaid",
      ],
    },
    {
      id: "image",
      icon: Image,
      title: "Image Analysis",
      description:
        "Upload or paste images directly. AI will analyze content and answer questions.",
      highlights: [
        "Drag & Drop upload",
        "Clipboard paste (Ctrl+V)",
        "Vision AI analysis",
        "Multi-format support",
      ],
    },
    {
      id: "csv",
      icon: FileSpreadsheet,
      title: "CSV Data Chat",
      description:
        "Load CSV files or URLs. Ask questions about data, AI will analyze and create charts.",
      highlights: [
        "File upload & URL load",
        "Auto statistics",
        "Dynamic charts",
        "Data insights",
      ],
    },
  ];

  const demoChats = {
    chat: [
      {
        role: "user" as const,
        content: "Explain machine learning",
        delay: 500,
      },
      {
        role: "assistant" as const,
        content:
          "Machine Learning is a branch of AI that enables computers to learn from data without explicit programming. There are 3 main types: Supervised, Unsupervised, and Reinforcement Learning.",
        delay: 1500,
      },
      {
        role: "user" as const,
        content: "Give an example of Supervised Learning",
        delay: 3000,
      },
      {
        role: "assistant" as const,
        content:
          "Example: Predicting house prices based on area, rooms, location. The model is trained with existing data (features + labels), then predicts for new data.",
        delay: 4000,
      },
    ],
    image: [
      {
        role: "user" as const,
        content: "[Uploaded: screenshot.png]",
        delay: 500,
      },
      {
        role: "user" as const,
        content: "Describe the content of this image",
        delay: 1000,
      },
      {
        role: "assistant" as const,
        content:
          "The image shows a chat application interface with minimalist design. It has a sidebar showing conversation list, main chat area in the center, and input box at the bottom.",
        delay: 2000,
      },
    ],
    csv: [
      {
        role: "user" as const,
        content: "[Loaded CSV: sales_data.csv - 1500 rows]",
        delay: 500,
      },
      {
        role: "user" as const,
        content: "Summarize the data and plot revenue chart",
        delay: 1200,
      },
      {
        role: "assistant" as const,
        content:
          "Dataset contains 1500 rows with 8 columns. Average revenue: $45,230. Highest month: December ($89,450). Here's the monthly revenue distribution chart...",
        delay: 2500,
      },
    ],
  };

  return (
    <div ref={containerRef} className="scroll-smooth">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Terminal className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Neural Chat</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://digital-duality.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              To my Portfolio
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => router.push("/chat")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              Launch App
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Section 1: Hero */}
      <section className="min-h-screen flex items-center pt-16 px-6">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="pt-8">
              <div className="inline-flex border items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
                <Zap className="w-4 h-4" />
                <span>Powered by Llama 4 Scout</span>
              </div>

              <h1 className="text-4xl border-b border-border pb-2 md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                AI Assistant
                <br />
                <span className="text-primary">Multi-functional</span>
              </h1>

              <p className="text-lg pl-4 text-muted-foreground mb-8 max-w-lg">
                Smart chat, image analysis, CSV data processing. All in one
                minimalist and modern interface.
              </p>

              <div className="flex pl-4 flex-wrap gap-4 mb-8">
                <button
                  onClick={() => router.push("/chat")}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 flex items-center gap-2"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-8 pt-4 border-t border-border">
                <div>
                  <div className="text-2xl font-bold">3+</div>
                  <div className="text-sm text-muted-foreground">
                    Input Types
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">Realtime</div>
                  <div className="text-sm text-muted-foreground">Streaming</div>
                </div>
              </div>
            </div>

            {/* Right: Chat Preview */}
            <div className="relative pt-8">
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    Neural Chat
                  </span>
                </div>

                <div className="p-4 h-80 flex flex-col gap-3 overflow-hidden">
                  <DemoMessage
                    role="user"
                    content="Hello, what can you help me with?"
                    delay={800}
                  />
                  <DemoMessage
                    role="assistant"
                    content="Hi! I'm Neural Chat - a multi-functional AI assistant. I can help you chat, analyze images, or process CSV data. What do you need today?"
                    delay={2000}
                  />
                  <DemoMessage
                    role="user"
                    content="Analyze my CSV file"
                    delay={4000}
                  />
                  <DemoMessage
                    role="assistant"
                    content="Sure! Upload a CSV file by dragging and dropping it here or click the Upload button. I'll analyze and provide insights for you."
                    delay={5500}
                  />
                </div>

                <div className="p-4 border-t border-border">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted rounded-xl">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent outline-none text-sm"
                      disabled
                    />
                    <button className="p-1.5 bg-primary rounded-lg">
                      <ArrowRight className="w-4 h-4 text-primary-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Section 5: Demo and my words on it
       */}

      <section className=" flex flex-col items-center justify-center py-20 px-6">
        {/* My Words */}
        <div className="flex flex-row">
          <div className="max-w-4xl mx-auto pb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              My Thoughts on Building Neural Chat
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Building Neural Chat has been an exciting journey of integrating
              advanced AI capabilities into a user-friendly interface.
              Leveraging the power of Llama 4 Scout through Groq API allowed me
              to create a versatile assistant capable of handling diverse inputs
              like text, images, and CSV data for free.
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The challenge was not only in implementing these features but also
              in ensuring a seamless user experience with real-time streaming
              and context-aware responses. This project has deepened my
              understanding of AI technologies and web development, although the
              code may not be perfect, still hard to scale it up because of my
              limited experience but I can say that i have learned a lot through
              this process and I'm excited to continue.
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
              P/S: I spent more than 10 hours on this (including learning new
              techniques)
            </p>
          </div>

          {/* Demo Video */}
          <div className="max-w-2xl mx-auto pb-12 pl-12">
            <video
              src="/demo/clip.mp4"
              controls
              className="w-full h-auto rounded-lg shadow-lg"
              poster="/demo/1.png"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* Demo Pic */}
        <div className="max-w mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 pb-4">
            Demo Picture
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="overflow-hidden shadow">
                <img
                  src={`/demo/${i}.png`}
                  alt={`Demo screenshot ${i}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Section 2: Features */}
      <section className="min-h-screen flex items-center py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center mb-16 border-b border-border pb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Key Features
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Combining AI power with intuitive interface, delivering the
              smartest chat experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="group p-6 border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer"
                onClick={() => {
                  setActiveDemo(feature.id as "chat" | "image" | "csv");
                  scrollToSection(2);
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>

                <h3 className="text-xl font-semibold mb-2 border-t border-border pt-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground border-b border-border pb-2 text-sm mb-4">
                  {feature.description}
                </p>

                <ul className="space-y-2 border-l border-border ml-4 p-2">
                  {feature.highlights.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="w-4 h-4 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Demo */}
      <section className="min-h-screen flex items-center py-20 px-6">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              See How It Works
            </h2>
            <p className="text-muted-foreground">
              Experience features through interactive demo
            </p>
          </div>

          {/* Demo Tabs */}
          <div className="flex justify-center gap-2 mb-8 ">
            {(["chat", "image", "csv"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveDemo(tab)}
                className={`px-4 border py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeDemo === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {tab === "chat" && "Chat AI"}
                {tab === "image" && "Image Analysis"}
                {tab === "csv" && "CSV Data"}
              </button>
            ))}
          </div>

          {/* Demo Window */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    {activeDemo === "chat" && "Conversation Demo"}
                    {activeDemo === "image" && "Image Analysis Demo"}
                    {activeDemo === "csv" && "CSV Analysis Demo"}
                  </span>
                </div>
                {activeDemo === "csv" && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileSpreadsheet className="w-3 h-3" />
                    sales_data.csv
                  </div>
                )}
                {activeDemo === "image" && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Image className="w-3 h-3" />
                    screenshot.png
                  </div>
                )}
              </div>

              <div
                className="p-4 h-72 flex flex-col gap-3 overflow-y-auto"
                key={activeDemo}
              >
                {demoChats[activeDemo].map((msg, i) => (
                  <DemoMessage
                    key={`${activeDemo}-${i}`}
                    role={msg.role}
                    content={msg.content}
                    delay={msg.delay}
                  />
                ))}
              </div>

              <div className="p-4 border-t border-border flex items-center gap-2">
                {activeDemo === "image" && (
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
                {activeDemo === "csv" && (
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <BarChart3 className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
                <div className="flex-1 px-4 py-2.5 bg-muted rounded-xl text-sm text-muted-foreground">
                  Type a message...
                </div>
                <button className="p-2.5 bg-primary rounded-xl">
                  <ArrowRight className="w-5 h-5 text-primary-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Tech Stack */}
      <section className="min-h-screen flex items-center py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Technology Stack
            </h2>
            <p className="text-muted-foreground">
              Built on modern and powerful technology foundation
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Frontend */}
            <div className="p-6 bg-card border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Frontend</h3>
                  <p className="text-sm text-muted-foreground">
                    User Interface
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {techStack.frontend.map((tech, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-muted/50"
                  >
                    <tech.icon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{tech.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {tech.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Backend */}
            <div className="p-6 bg-card border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Backend</h3>
                  <p className="text-sm text-muted-foreground">
                    API & AI Services
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {techStack.backend.map((tech, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-muted/50"
                  >
                    <tech.icon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{tech.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {tech.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Architecture Diagram */}
          <div className="mt-12 p-6 bg-card border border-border">
            <h3 className="font-semibold mb-6 text-center">
              System Architecture
            </h3>
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 rounded-lg">
                <Globe className="w-4 h-4" />
                Next.js
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-lg">
                <Zap className="w-4 h-4" />
                FastAPI
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-500 rounded-lg">
                <Cpu className="w-4 h-4" />
                Groq API
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-500 rounded-lg">
                <Bot className="w-4 h-4" />
                Llama 4 Scout
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: CTA */}
      <section className=" flex flex-col items-center justify-center py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Experience?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start using Neural Chat today. Free, no registration, no limits.
          </p>

          <button
            onClick={() => router.push("/chat")}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/25 flex items-center gap-3 mx-auto mb-16"
          >
            <Terminal className="w-6 h-6" />
            Open Neural Chat
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Footer */}
        <footer className="w-full max-w-6xl mx-auto border-t border-border pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Terminal className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Neural Chat</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="https://github.com/HeroKeyboardUT/multimodal-chatbot"
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                <GitBranch className="w-4 h-4" />
                GitHub
              </a>
              <span>Built with Next.js + FastAPI</span>
            </div>

            <div className="text-sm text-muted-foreground">
              2025 Neural Chat
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
