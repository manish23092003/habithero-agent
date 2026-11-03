import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  Zap, 
  Layers, 
  Bot, 
  Lock
} from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DCEBDD] text-[#183c2e] text-xs font-semibold shadow-subtle border border-[#E9ECE7]">
          <Sparkles className="w-3.5 h-3.5 text-[#245C46]" />
          <span>Core Habit Features</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#26352D]">
          Designed for Lasting Consistency
        </h1>
        <p className="text-base text-[#5F6F65] leading-relaxed">
          HabitHero replaces stressful streak resets with intelligent, gentle habit coaching. Here is everything designed to help you stay on track.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Feature 1 */}
        <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-7 shadow-card space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-[#26352D]">
            Flexible Daily Schedules
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6F65] leading-relaxed">
            When life gets hectic or you feel low on energy, your coach automatically scales tomorrow's task into a quick 10-15 minute step. This keeps your habit loop going without overwhelming you.
          </p>
          <div className="p-3 rounded-xl bg-[#F7F7F2] border border-[#E9ECE7] text-xs text-[#245C46] font-medium">
            Adjusted pace • Protects your streak and momentum on busy days.
          </div>
        </div>

        {/* Feature 2 */}
        <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-7 shadow-card space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-[#26352D]">
            Gentle Phased Habit Steps
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6F65] leading-relaxed">
            Habits are broken into 3 manageable phases: Getting Started, Building Momentum, and Reaching Your Goal. You only focus on today's designated step, avoiding burnout.
          </p>
          <div className="p-3 rounded-xl bg-[#F7F7F2] border border-[#E9ECE7] text-xs text-[#245C46] font-medium">
            Your first day's kick-off step is ready the moment you create a habit.
          </div>
        </div>

        {/* Feature 3 */}
        <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-7 shadow-card space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#FDF6EB] text-[#E8B96B] flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#E8B96B]" />
          </div>
          <h2 className="text-lg font-bold text-[#26352D]">
            An Intelligent Coach That Takes Action
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6F65] leading-relaxed">
            Unlike ordinary chatbots that just offer generic advice, your coach can actually take action for you. Ask it to check your tasks, shorten a session, or adjust your schedule, and it updates your daily plan immediately.
          </p>
          <div className="p-3 rounded-xl bg-[#F7F7F2] border border-[#E9ECE7] text-xs text-[#5F6F65]">
            Check tasks • Adjust schedule • Add new steps • Reflect on your day
          </div>
        </div>

        {/* Feature 4 */}
        <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-7 shadow-card space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-[#26352D]">
            Private and Secure By Design
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6F65] leading-relaxed">
            Your habits, reflections, and conversations are private to you. Your data is encrypted and partitioned strictly to your account so no one else can see your progress.
          </p>
          <div className="p-3 rounded-xl bg-[#F7F7F2] border border-[#E9ECE7] text-xs text-[#245C46] font-medium">
            Private account protection with verified security standards.
          </div>
        </div>
      </div>

      {/* CTA Box */}
      <div className="rounded-2xl bg-[#FFFFFF] border border-[#E9ECE7] p-8 text-center space-y-4 shadow-card">
        <h3 className="text-xl font-bold text-[#26352D]">
          Start Building Lasting Habits Today
        </h3>
        <p className="text-xs text-[#5F6F65] max-w-md mx-auto">
          Create your first habit in less than 60 seconds with your personal coach ready to support you.
        </p>
        <div className="pt-2">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all"
          >
            <span>Create Your First Habit Free</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
