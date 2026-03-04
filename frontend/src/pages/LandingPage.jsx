import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Radio, Clock, Waves, CloudRain, MapPin, Activity, ArrowRight, History, Globe } from 'lucide-react';
import earthHero from '../assets/earth_hero.png';

export default function LandingPage() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-space-deep">
            {/* Satellite Hero Background */}
            <div className="absolute inset-0 z-0">
                <img
                    src={earthHero}
                    alt="Earth from Space"
                    className="w-full h-full object-cover opacity-60 scale-110 animate-float"
                    style={{ filter: 'brightness(0.8) contrast(1.2)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-space-deep/80 via-transparent to-space-deep"></div>
            </div>

            {/* Animated Star Particles */}
            <div className="absolute inset-0 z-1 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute bg-white rounded-full animate-twinkle"
                        style={{
                            width: Math.random() * 3 + 'px',
                            height: Math.random() * 3 + 'px',
                            top: Math.random() * 100 + '%',
                            left: Math.random() * 100 + '%',
                            animationDelay: Math.random() * 5 + 's',
                            opacity: Math.random()
                        }}
                    ></div>
                ))}
            </div>

            {/* Hero Content */}
            <div className="relative z-10 text-center mb-12 md:mb-16 px-6 animate-fade-in-up">
                <div className="inline-flex items-center gap-2 md:gap-3 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-brand-amber/10 border border-brand-amber/20 mb-6 md:mb-8 backdrop-blur-md">
                    <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-brand-green animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                    <span className="text-[9px] md:text-[10px] text-brand-amber font-bold uppercase tracking-[0.2em]">Next-Gen Disaster Intelligence</span>
                </div>

                <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4 gradient-text">
                    FLOODWATCH
                </h1>

                <p className="max-w-xl mx-auto text-slate-400 text-base md:text-lg leading-relaxed font-light">
                    Real-time satellite monitoring and AI-driven flood predictive modeling
                    for safer, more resilient urban infrastructure.
                </p>
            </div>

            {/* Navigation Cards */}
            <div className="relative z-10 flex flex-col lg:flex-row gap-6 md:gap-8 max-w-5xl w-full px-6 md:px-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                {/* Live Monitor Card */}
                <Link to="/live" className="flex-1 group pt-2 md:pt-4">
                    <div className="glass-panel p-6 md:p-8 h-full transition-all duration-500 group-hover:border-brand-green/40 group-hover:shadow-[0_0_40px_rgba(34,197,94,0.15)] group-hover:-translate-y-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Radio className="w-16 h-16 md:w-24 md:h-24 text-brand-green" />
                        </div>

                        <div className="flex items-center gap-4 mb-4 md:mb-6">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-brand-green/10 border border-brand-green/30 flex items-center justify-center group-hover:bg-brand-green/20 transition-all duration-500 shadow-inner">
                                <Radio className="w-5 h-5 md:w-6 md:h-6 text-brand-green" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">Live Monitor</h2>
                                <p className="text-[9px] md:text-[10px] text-brand-green font-bold uppercase tracking-widest">Active Scan Mode</p>
                            </div>
                        </div>

                        <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-6 md:mb-8">
                            Execute real-time recursive analysis across India. Our neural engine maps precipitation,
                            terrain vulnerability, and hospital proximity in sub-second latency.
                        </p>

                        <div className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                            {[
                                { icon: CloudRain, text: 'Live Open-Meteo Integration', color: 'text-brand-green' },
                                { icon: MapPin, text: 'Recursive Infrastructure Mapping', color: 'text-brand-green' },
                                { icon: Activity, text: 'AI-Driven Risk Scoring', color: 'text-brand-green' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 md:gap-3 text-[10px] md:text-[11px] text-slate-500 font-medium">
                                    <item.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${item.color}`} />
                                    <span>{item.text}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 text-brand-green text-[10px] md:text-xs font-bold uppercase tracking-widest group-hover:gap-4 transition-all">
                            Initialize Dashboard <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </Link>

                {/* Historical Replay Card */}
                <Link to="/replay" className="flex-1 group pt-2 md:pt-4">
                    <div className="glass-panel p-6 md:p-8 h-full transition-all duration-500 group-hover:border-brand-amber/40 group-hover:shadow-[0_0_40px_rgba(245,158,11,0.15)] group-hover:-translate-y-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <History className="w-16 h-16 md:w-24 md:h-24 text-brand-amber" />
                        </div>

                        <div className="flex items-center gap-4 mb-4 md:mb-6">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-brand-amber/10 border border-brand-amber/30 flex items-center justify-center group-hover:bg-brand-amber/20 transition-all duration-500 shadow-inner">
                                <History className="w-5 h-5 md:w-6 md:h-6 text-brand-amber" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">Historical Replay</h2>
                                <p className="text-[9px] md:text-[10px] text-brand-amber font-bold uppercase tracking-widest">Archive Retrieval</p>
                            </div>
                        </div>

                        <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-6 md:mb-8">
                            Reconstruct catastrophic events from the last decade. Dive into 10+ years of
                            Open-Meteo weather archives to visualize past floods pixel-by-pixel.
                        </p>

                        <div className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                            {[
                                { icon: Clock, text: '10-Year Depth Archive', color: 'text-brand-amber' },
                                { icon: Globe, text: 'Historical Weather Replay', color: 'text-brand-amber' },
                                { icon: Waves, text: 'Vulnerability Reconstruction', color: 'text-brand-amber' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 md:gap-3 text-[10px] md:text-[11px] text-slate-500 font-medium">
                                    <item.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${item.color}`} />
                                    <span>{item.text}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 text-brand-amber text-[10px] md:text-xs font-bold uppercase tracking-widest group-hover:gap-4 transition-all">
                            Access Archives <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </Link>
            </div>

            {/* Premium Dock Stats */}
            <div className="relative z-10 mt-10 md:mt-16 mb-8 px-8 md:px-12 py-4 md:py-6 rounded-2xl glass-panel flex flex-col sm:flex-row items-center gap-6 md:gap-12 animate-fade-in-up backdrop-blur-xl border-slate-700/30 mx-6" style={{ animationDelay: '0.4s' }}>
                {[
                    { val: '3', label: 'Primary APIs' },
                    { val: '10yr+', label: 'Weather Archive' },
                    { val: 'Global', label: 'Satellite Coverage' }
                ].map((stat, i) => (
                    <React.Fragment key={i}>
                        <div className="text-center min-w-[100px]">
                            <p className="text-2xl md:text-3xl font-black text-white tracking-tighter shimmer">{stat.val}</p>
                            <p className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5 md:mt-1">{stat.label}</p>
                        </div>
                        {i < 2 && <div className="hidden sm:block h-8 w-px bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
