import React from 'react'
import ReactDOM from 'react-dom/client'
import Dashboard from './Dashboard'
import './index.css' // Optional if you have global styles, otherwise ignoring is fine

// Auto-update SW - DISABLED manually to prevent build error
// const updateSW = registerSW({...})

// Simple global style reset if index.css is missing
const GlobalStyle = () => (
    <style>{`
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Pretendard', sans-serif; -webkit-font-smoothing: antialiased; }
    /* Mobile Touch optimization */
    button, a { touch-action: manipulation; }
  `}</style>
)

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        alert("오류 발생: " + error.toString());
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, background: 'white', color: 'red', fontFamily: 'monospace' }}>
                    <h2>Something went wrong.</h2>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}

// [DEBUG] Global Error Handler for Mobile
window.onerror = function (msg, url, line, col, error) {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed; top:0; left:0; width:100%; padding:20px; background:red; color:white; z-index:99999; font-size:14px;';
    div.innerText = 'JS Error: ' + msg + '\\nAt: ' + line + ':' + col;
    document.body.appendChild(div);
    return false;
};

// Debug Alert
alert("대시보드 시작중... (Main.jsx)");

// [SECURITY] 보안 스크립트: 우클릭, 복사, 개발자도구 차단
const SecurityGuard = ({ children }) => {
    React.useEffect(() => {
        // 1. 우클릭 방지
        const handleContextMenu = (e) => {
            e.preventDefault();
            return false;
        };

        // 2. 키보드 단축키 방지 (F12, Ctrl+Shift+I, Ctrl+S, Ctrl+U 등)
        const handleKeyDown = (e) => {
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
                (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
                (e.ctrlKey && (e.key === 'S' || e.key === 's')) ||
                (e.ctrlKey && (e.key === 'P' || e.key === 'p'))
            ) {
                e.preventDefault();
                return false;
            }
        };

        // 3. 드래그 및 선택 방지
        const preventDefault = (e) => e.preventDefault();

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('dragstart', preventDefault);
        document.addEventListener('selectstart', preventDefault);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('dragstart', preventDefault);
            document.removeEventListener('selectstart', preventDefault);
        };
    }, []);

    return (
        <div style={{ userSelect: 'none', WebkitUserSelect: 'none', width: '100%', height: '100%' }}>
            {children}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GlobalStyle />
        <SecurityGuard>
            <ErrorBoundary>
                <Dashboard />
            </ErrorBoundary>
        </SecurityGuard>
    </React.StrictMode>,
)
