import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bot,
  Database,
  FileCheck2,
  FileText,
  MessageSquareText,
  Mic,
  ScanText,
  Sparkles,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  Section,
  StatusBadge,
} from "../components/ui";
import { fadeUp } from "../components/animations";

const features = [
  {
    icon: ScanText,
    title: "Passport OCR Extraction",
    description: "Upload passport images and extract key applicant details with a conservative OCR flow.",
  },
  {
    icon: MessageSquareText,
    title: "AI Chat Guidance",
    description: "A guided assistant collects destination, visa type, purpose, duration, and travel details.",
  },
  {
    icon: Mic,
    title: "Voice Input Support",
    description: "Use browser speech recognition to speak answers directly into the assistant.",
  },
  {
    icon: WandSparkles,
    title: "Smart Form Autofill",
    description: "Extracted details flow into an editable confirmation form before submission.",
  },
  {
    icon: FileText,
    title: "PDF Visa Generation",
    description: "Generate a clean visa application summary PDF for the completed workflow.",
  },
  {
    icon: Database,
    title: "MongoDB Storage",
    description: "Completed applications are saved with passport and visa details for demo persistence.",
  },
];

const workflow = ["Upload", "Extract", "Confirm", "Chat", "Generate PDF"];

function Home() {
  return (
    <AppShell>
      <main>
        <section className="overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
            <motion.div {...fadeUp}>
              <StatusBadge>AI onboarding assistant</StatusBadge>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
                AI-Powered Visa Application Assistant
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Upload your passport, interact naturally with AI, and generate visa applications in minutes.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button as={Link} to="/chat">
                  <Sparkles className="h-4 w-4" />
                  Start Application
                </Button>
                <Button as={Link} to="/upload" variant="secondary">
                  <UploadCloud className="h-4 w-4" />
                  Upload Passport
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="relative"
            >
              

              <Card className="relative mx-auto max-w-xl p-5">
                <div className="rounded-3xl bg-slate-950 p-5 text-white">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Visa AI Co-Pilot</p>
                        <p className="text-xs text-slate-300">Guided application</p>
                      </div>
                    </div>
                    <StatusBadge tone="emerald">Live</StatusBadge>
                  </div>

                  <div className="space-y-3">
                    <div className="max-w-[82%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-sm">
                      Great, I can help with your visa application. Upload your passport to begin.
                    </div>
                    <div className="ml-auto max-w-[74%] rounded-2xl rounded-br-md bg-indigo-500 px-4 py-3 text-sm">
                      I want to apply for a work visa to Canada.
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <UploadCloud className="h-4 w-4 text-indigo-300" />
                        Passport Upload
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
                        <div className="rounded-xl bg-white/10 p-3">Name</div>
                        <div className="rounded-xl bg-white/10 p-3">Passport No.</div>
                        <div className="rounded-xl bg-white/10 p-3">DOB</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>

        <Section
          id="features"
          eyebrow="Features"
          title="Everything needed for a polished visa workflow demo"
          description="A focused prototype experience that combines OCR, AI guidance, voice input, PDF generation, and storage."
          className="bg-white/55"
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  key={feature.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: index * 0.04 }}
                >
                  <Card className="h-full transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-100">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-950">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </Section>

        <Section
          eyebrow="Workflow"
          title="From passport upload to completed PDF"
        >
          <Card>
            <div className="grid gap-5 md:grid-cols-5">
              {workflow.map((step, index) => (
                <div key={step} className="relative text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20">
                    {index + 1}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{step}</p>
                  {index < workflow.length - 1 && (
                    <div className="absolute left-[calc(50%+32px)] top-6 hidden h-px w-[calc(100%-64px)] bg-slate-200 md:block" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <Section className="pt-4">
          <div className="grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <Card>
              <StatusBadge>
                <Bot className="h-3.5 w-3.5" />
                AI Co-Pilot
              </StatusBadge>
              <h2 className="mt-5 text-3xl font-bold text-slate-950">
                Conversational help through every step
              </h2>
              <p className="mt-4 text-slate-600">
                The assistant guides users through passport upload, extracted detail confirmation, visa questions, saving, and PDF generation.
              </p>
              <Button as={Link} to="/chat" className="mt-6">
                Open Assistant
              </Button>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-600 to-sky-600 text-white">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Conversational guidance",
                  "Step-by-step assistance",
                  "Intelligent autofill",
                  "Upload help",
                ].map((item) => (
                  <div key={item} className="rounded-2xl bg-white/12 p-4">
                    <Sparkles className="mb-3 h-5 w-5 text-indigo-100" />
                    <p className="font-semibold">{item}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>
      </main>
    </AppShell>
  );
}

export default Home;
