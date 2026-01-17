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
                style={{ width: '100vw', height: '100vh', border: 'none', pointerEvents: 'none', position: 'absolute', top: 0, left: 0 }}
            ></iframe>

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
                gap: '10px'
            }}>
                <p style={{
                    margin: 0,
                    fontSize: '1.2rem',
                    color: '#94a3b8',
                    fontWeight: '600',
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                    fontFamily: "'Montserrat', sans-serif",
                    textShadow: '0 0 20px rgba(148, 163, 184, 0.3)'
                }}>
                    PREMIUM MATH INSTITUTE
                </p>

                <h1 style={{
                    fontSize: '4.5rem',
                    fontWeight: '900',
                    color: 'white',
                    margin: '0',
                    letterSpacing: '-2px',
                    textShadow: '0 0 50px rgba(255,255,255,0.3)',
                    background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.2
                }}>
                    과사람 의대관
                </h1>

                <div style={{
                    marginTop: '2rem',
                    padding: '0.8rem 2rem',
                    // borderRadius: '50px',
                    // border: '1px solid rgba(255,255,255,0.1)',
                    // background: 'rgba(255,255,255,0.02)',
                    // backdropFilter: 'blur(5px)',
                }}>
                    <p style={{
                        margin: 0,
                        fontSize: '1rem',
                        color: '#64748b',
                        fontWeight: '500',
                        letterSpacing: '1px'
                    }}>
                        로딩 완료. 화면을 터치하세요.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
