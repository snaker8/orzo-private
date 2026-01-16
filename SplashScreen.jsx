import React, { useEffect, useState } from 'react';

const SplashScreen = ({ onDismiss }) => {
    const [visible, setVisible] = useState(true);
    const [closing, setClosing] = useState(false);

    const handleClick = () => {
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
                cursor: 'pointer',
                overflow: 'hidden',
                opacity: closing ? 0 : 1,
                transition: 'opacity 0.8s ease-in-out'
            }}
        >
            {/* Background Spline 3D */}
            <iframe
                src="https://my.spline.design/claritystream-mDXSTu56HgZ7qZtc2R9gBFBc/"
                frameBorder="0"
                width="100%"
                height="100%"
                style={{ width: '100vw', height: '100dvh', border: 'none', pointerEvents: 'none' }}
            ></iframe>

            {/* Mask to hide Spline Logo (Bottom Right) */}
            <div style={{ position: 'absolute', bottom: '0', right: '0', width: '120px', height: '50px', background: '#0f172a', zIndex: 100000, pointerEvents: 'none' }}></div>

            {/* Content Overlay */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                width: '100%',
                mixBlendMode: 'screen'
            }}>
                <h1 style={{
                    fontSize: '4.5rem',
                    fontWeight: '900',
                    color: 'white',
                    margin: '0 0 1.5rem 0',
                    letterSpacing: '-2px',
                    textShadow: '0 0 50px rgba(255,255,255,0.3)',
                    background: 'linear-gradient(to right, #ffffff, #94a3b8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    과사람 의대관
                </h1>
                <div style={{
                    display: 'inline-block',
                    padding: '0.8rem 2rem',
                    borderRadius: '50px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}>
                    <p style={{
                        margin: 0,
                        fontSize: '1rem',
                        color: '#cbd5e1',
                        fontWeight: '500',
                        letterSpacing: '3px',
                        textTransform: 'uppercase'
                    }}>
                        Touch to Start
                    </p>
                </div>
            </div>

            {/* Hint Animation */}
            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.5; transform: scale(0.98); }
                    50% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0.5; transform: scale(0.98); }
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;
