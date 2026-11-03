import React from 'react';
import { 
  HeartHandshake,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Github, 
  ExternalLink
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DCEBDD] text-[#183c2e] text-xs font-semibold shadow-subtle border border-[#E9ECE7]">
          <HeartHandshake className="w-3.5 h-3.5 text-[#245C46]" />
          <span>Product Mission & Philosophy</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#26352D]">
          Built for Real Human Consistency
        </h1>
        <p className="text-base text-[#5F6F65] leading-relaxed">
          HabitHero was designed to explore what happens when an AI assistant doesn't just chat, but acts as a genuine personal coach—adapting your schedule when life gets hectic, celebrating your wins, and helping you build lasting momentum.
        </p>
      </div>

      {/* Behavioral Philosophy */}
      <section className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-8 shadow-card space-y-6">
        <h2 className="text-xl font-bold text-[#26352D]">
          The Behavioral Science of HabitHero
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-[#5F6F65] leading-relaxed">
          <p>
            Traditional productivity trackers rely on shame and brittle streak counters. The second an emergency, illness, or 12-hour workday breaks your streak, the "what-the-hell" effect takes over, and users abandon the app entirely.
          </p>
          <p>
            HabitHero is built around the fundamental psychological principle: <strong>"Never Miss Twice"</strong>. Research shows that missing a single day has virtually zero impact on long-term habit consolidation, provided you return the following day. Our coach scales down tasks on difficult days to quick 10-15 minute steps so you never trigger the second miss.
          </p>
        </div>
      </section>

      {/* Core Principles */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-[#26352D]">
            Our Core Coaching Principles
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6F65]">
            Designed from behavioral economics and habit psychology to help you succeed in the real world.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-[#E9ECE7] bg-[#FFFFFF] p-6 space-y-3 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#26352D]">Micro-Commitments</h3>
            <p className="text-xs text-[#5F6F65] leading-relaxed">
              When energy is low or time is tight, doing a 5-minute version of your routine preserves neural pathways far better than skipping completely.
            </p>
          </div>

          <div className="rounded-xl border border-[#E9ECE7] bg-[#FFFFFF] p-6 space-y-3 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#26352D]">Dynamic Schedule Pacing</h3>
            <p className="text-xs text-[#5F6F65] leading-relaxed">
              Life isn't linear. Your coach automatically re-balances your weekly task load around deadlines, travel, and personal events without losing your streak.
            </p>
          </div>

          <div className="rounded-xl border border-[#E9ECE7] bg-[#FFFFFF] p-6 space-y-3 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#26352D]">Compassionate Accountability</h3>
            <p className="text-xs text-[#5F6F65] leading-relaxed">
              Zero guilt, zero negative reinforcement. We focus entirely on bouncing back quickly, celebrating small wins, and cultivating genuine pride.
            </p>
          </div>
        </div>
      </section>

      {/* Subtle Source Reference */}
      <div className="pt-4 text-center">
        <a
          href="https://github.com/manish23092003/habithero-agent"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#8C9A91] hover:text-[#245C46] transition-colors"
        >
          <Github className="w-3.5 h-3.5" />
          <span>Open Source on GitHub</span>
          <ExternalLink className="w-3 h-3 text-[#8C9A91]" />
        </a>
      </div>
    </div>
  );
};
