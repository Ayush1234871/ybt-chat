import { useEffect, useState } from 'react';

const SplashScreen = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Small delay to trigger entry animation
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-1000 ease-in-out">
            <div
                className={`flex flex-col items-center transition-all duration-1000 transform ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                    }`}
            >
                {/* Logo Container */}
                <div className="relative mb-8 w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl animate-pulse"></div>
                    <div className="relative bg-primary rounded-3xl p-5 shadow-2xl shadow-primary/30 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <svg
                            viewBox="0 0 24 24"
                            className="w-12 h-12 text-white fill-current"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M12 2C6.47 2 2 6.47 2 12c0 1.91.53 3.69 1.45 5.23L2 22l4.98-1.55C8.42 21.41 10.15 22 12 22c5.53 0 10-4.47 10-10S17.53 2 12 2zm0 18c-1.63 0-3.14-.5-4.4-1.35l-.32-.21-3.26 1.01.99-3.41-.23-.37C3.99 14.54 3.5 13.3 3.5 12c0-4.69 3.81-8.5 8.5-8.5s8.5 3.81 8.5 8.5-3.81 8.5-8.5 8.5z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
                    YBT <span className="text-primary">Chat</span>
                </h1>
                <p className="text-muted-foreground text-sm font-medium">Fast • Secure • Private</p>
            </div>

            {/* Footer / Branding */}
            <div className={`absolute bottom-12 flex flex-col items-center transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">from</span>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center">
                        <span className="text-lg font-black text-foreground">Y</span>
                    </div>
                    <span className="text-lg font-bold text-foreground tracking-tight">YBT Team</span>
                </div>
            </div>

            {/* Subtle background glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]"></div>
            </div>
        </div>
    );
};

export default SplashScreen;
