import React, { useEffect, useState } from 'react';

const SplashScreen = ({ onDismiss, mode = 'startup' }) => { // mode: 'startup' | 'transition'
    const [visible, setVisible] = useState(true);
    const [closing, setClosing] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // [NEW] Loading State
    const [progress, setProgress] = useState(0);      // [NEW] Progress Bar

    useEffect(() => {
        // Simulate Loading Process (2.5 seconds)
        const duration = 2500;
        const interval = 50;
        const steps = duration / interval;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const newProgress = Math.min(100, (currentStep / steps) * 100);
            setProgress(newProgress);

            if (currentStep >= steps) {
                clearInterval(timer);
                setIsLoading(false); // Loading Complete

                // [NEW] Transition Mode: Auto Dismiss
                if (mode === 'transition') {
                    handleAutoDismiss();
                }
            }
        }, interval);

        return () => clearInterval(timer);
    }, [mode]);

    const handleAutoDismiss = () => {
        setClosing(true);
        setTimeout(() => {
            setVisible(false);
            onDismiss();
        }, 800);
    };

    const handleClick = () => {
        if (isLoading) return; // [Block] Interaction during loading
        if (mode === 'transition') return; // [Block] Click during transition (auto only)

        setClosing(true);
        setTimeout(() => {
            setVisible(false);
            onDismiss();
        }, 800); // Animation duration
    };

    if (!visible) return null;

    return (
        <div
            onClick={handleClick}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: '#0f172a',
                cursor: isLoading || mode === 'transition' ? 'wait' : 'pointer', // Change cursor
                overflow: 'hidden',
                opacity: closing ? 0 : 1,
                transition: 'opacity 0.8s ease-in-out'
            }}
        >
            {/* Background Spline 3D */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                left: '-10%',
                width: '120%',
                height: '120%',
                pointerEvents: 'none'
            }}>
                <iframe
                    src="https://my.spline.design/claritystream-mDXSTu56HgZ7qZtc2R9gBFBc/"
                    frameBorder="0"
                    width="100%"
                    height="100%"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                ></iframe>
            </div>

            {/* Content Overlay */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                width: '100%',
                mixBlendMode: 'screen',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                padding: '0 20px'
            }}>
                <p style={{
                    margin: 0,
                    fontSize: 'clamp(0.7rem, 2.5vw, 1.2rem)',
                    color: '#94a3b8',
                    fontWeight: '600',
                    letterSpacing: 'clamp(2px, 1vw, 4px)',
                    textTransform: 'uppercase',
                    fontFamily: "'Montserrat', sans-serif",
                    textShadow: '0 0 20px rgba(148, 163, 184, 0.3)'
                }}>
                    PREMIUM MATH INSTITUTE
                </p>

                <h1 style={{
                    fontSize: 'clamp(2.5rem, 10vw, 5rem)',
                    fontWeight: '900',
                    color: 'white',
                    margin: '0',
                    letterSpacing: '-2px',
                    textShadow: '0 0 50px rgba(255,255,255,0.3)',
                    background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.2,
                    wordBreak: 'keep-all'
                }}>
                    과사람 의대관
                </h1>

                <div style={{
                    marginTop: '2rem',
                    padding: '0.8rem 2rem',
                    width: '300px', // Fixed width for stability
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '15px'
                }}>
                    {isLoading || mode === 'transition' ? (
                        <>
                            {/* Loading Indicator */}
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${progress}%`,
                                    height: '100%',
                                    background: '#ffffff',
                                    borderRadius: '2px',
                                    transition: 'width 0.05s linear',
                                    boxShadow: '0 0 10px rgba(255,255,255,0.8)'
                                }}></div>
                            </div>
                            <p style={{
                                margin: 0,
                                fontSize: '0.8rem',
                                color: '#64748b',
                                fontWeight: '500',
                                letterSpacing: '1px'
                            }}>
                                {mode === 'transition' ? 'STUDENT DATA LOADING...' : `SYSTEM LOADING... ${Math.round(progress)}%`}
                            </p>
                        </>
                    ) : (
                        /* Ready State (Startup Mode Only) */
                        <p style={{
                            margin: 0,
                            fontSize: 'clamp(0.8rem, 2vw, 1rem)',
                            color: 'white', // Bright color for call to action
                            fontWeight: '600',
                            letterSpacing: '1px',
                            animation: 'pulse 2s infinite'
                        }}>
                            화면을 터치하여 입장하세요
                        </p>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.6; transform: scale(0.98); }
                    50% { opacity: 1; transform: scale(1.02); text-shadow: 0 0 15px white; }
                    100% { opacity: 0.6; transform: scale(0.98); }
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;
