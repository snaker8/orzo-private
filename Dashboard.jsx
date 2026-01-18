import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    BarChart, Bar, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import html2canvas from 'html2canvas';
import {
    LayoutDashboard, Search, FolderOpen, ChevronLeft, Printer, Download,
    BrainCircuit, TrendingUp, Clock, Calendar, CheckCircle2, AlertCircle, FileText,
    GraduationCap, LineChart, PieChart, MonitorPlay, Maximize, X, Settings, Check, BookOpen, Timer
} from 'lucide-react';
import { MOCK_DATA } from './mockData';
import SplashScreen from './SplashScreen';

// =================================================================================
// [1] 베이스 유틸리티 & 테마
// =================================================================================
const THEME = {
    primary: '#1e293b', secondary: '#475569', accent: '#4f46e5', accentLight: '#eef2ff',
    success: '#059669', warning: '#d97706', danger: '#dc2626', bg: '#f8fafc',
    card: '#ffffff', border: '#e2e8f0', chart: { primary: '#4f46e5', secondary: '#8b5cf6', grid: '#f1f5f9' }
};

const getCourseBadgeStyle = (courseName) => {
    const base = { fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', letterSpacing: '-0.3px' };
    const c = String(courseName).toUpperCase();
    if (c.includes('공통') || c.includes('공수')) return { ...base, bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };
    if (c.includes('미적')) return { ...base, bg: '#fdf4ff', text: '#a21caf', border: '#f0abfc' };
    if (c.includes('기하')) return { ...base, bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' };
    if (c.includes('확통') || c.includes('확률')) return { ...base, bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' };
    if (c.includes('수1') || c.includes('수학1')) return { ...base, bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' };
    if (c.includes('수2') || c.includes('수학2')) return { ...base, bg: '#fdf4ff', text: '#a21caf', border: '#fbcfe8' };
    if (c.includes('대수')) return { ...base, bg: '#fff1f2', text: '#be123c', border: '#fda4af' };
    return { ...base, bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(4px)' }}>
                <p style={{ margin: 0, fontWeight: '700', color: THEME.primary, fontSize: '0.9rem', borderBottom: `1px solid ${THEME.border}`, paddingBottom: '4px', marginBottom: '8px' }}>{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: entry.color, fontWeight: '600', marginBottom: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: entry.color }}></div>
                        <span>{entry.name}:</span>
                        <span style={{ marginLeft: 'auto' }}>{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const safeNumber = (val) => {
    try {
        if (!val) return 0;
        const str = String(val).replace(/[^0-9.]/g, '');
        const num = Number(str);
        return isNaN(num) ? 0 : num;
    } catch (e) { return 0; }
};

const findValue = (row, keywords) => {
    try {
        if (!row || typeof row !== 'object') return null;
        const key = Object.keys(row).find(k => keywords.some(word => k.toUpperCase().replace(/\s/g, '').includes(word.toUpperCase())));
        return key ? row[key] : null;
    } catch (e) { return null; }
};

const formatTime = (val) => {
    if (!val) return '-';
    let str = String(val).trim();
    if (str === '0' || str === '00:00' || str === '' || str.includes('-') || str.length > 10) return '-';
    if (str.endsWith('분')) {
        const minutes = parseInt(str.replace('분', '').trim());
        if (!isNaN(minutes)) {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
        }
    }
    if (!isNaN(Number(str))) return `${str}분`;
    return str;
};

const parseDateSafe = (val) => {
    try {
        if (!val) throw new Error();
        if (!isNaN(Number(val)) && !String(val).includes('-') && !String(val).includes('.') && !String(val).includes('/')) {
            const date = new Date(Math.round((Number(val) - 25569) * 86400 * 1000));
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return { obj: date, str: `${y}-${m}-${d}`, isValid: true };
        }
        const dObj = new Date(val);
        if (!isNaN(dObj.getTime()) && dObj.getFullYear() > 2000) {
            const y = dObj.getFullYear();
            const m = String(dObj.getMonth() + 1).padStart(2, '0');
            const d = String(dObj.getDate()).padStart(2, '0');
            return { obj: dObj, str: `${y}-${m}-${d}`, isValid: true };
        }
        const match = String(val).match(/(\d{2,4})\s*[\.\-\/]\s*(\d{1,2})\s*[\.\-\/]\s*(\d{1,2})/);
        if (match) {
            let year = parseInt(match[1]);
            if (year < 100) year += 2000;
            const date = new Date(year, parseInt(match[2]) - 1, parseInt(match[3]));
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return { obj: date, str: `${y}-${m}-${d}`, isValid: true };
        }
        throw new Error();
    } catch (e) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return { obj: now, str: val ? String(val) : '', isValid: false };
    }
};

const refineTitle = (rawTitle) => {
    if (!rawTitle) return '제목 없음';
    return String(rawTitle).replace(/[\[\]]/g, ' ').replace(/\(.*\)/, '').trim();
};

const extractCourse = (title) => {
    const raw = String(title || "").toUpperCase();
    const t = raw.replace(/\s/g, '');
    if (/미적(분)?[\W_]*1/.test(raw)) return '미적분1';
    if (/미적(분)?[\W_]*2/.test(raw)) return '미적분2';
    if (t.includes('공수1') || t.includes('공통수학1')) return '공통수학1';
    if (t.includes('공수2') || t.includes('공통수학2')) return '공통수학2';
    if (t.includes('미적')) return '미적분';
    if (t.includes('확통') || t.includes('확률')) return '확률과통계';
    if (t.includes('기하')) return '기하';
    if (t.includes('수1') || t.includes('수학1')) return '수학1';
    if (t.includes('수2') || t.includes('수학2')) return '수학2';
    if (t.includes('대수')) return '대수';
    const match = t.match(/(중|고)(\d)[-\.]?(\d)/);
    if (match) return `${match[1]}${match[2]}-${match[3]}`;
    return '정규과정';
};

// [NEW] Shared Helper for Learning Competency Analysis
const calculateCompetencyStats = (records) => {
    if (!records || records.length === 0) return { avgScore: 0, count: 0, radar: [] };

    const sumScore = records.reduce((a, b) => a + b.score, 0);
    const avgScore = Math.round(sumScore / records.length);

    // Metrics Calculation
    // 1. Sincerity (Review Time existence)
    const sincerity = Math.min(100, Math.round((records.filter(r => r.reviewTime && r.reviewTime !== '-' && r.reviewTime !== '0분').length / records.length) * 100) + 10);

    // 2. Stability (Score Deviation)
    // Lower deviation = Higher stability. 
    const deviation = records.reduce((acc, r) => acc + Math.abs(r.score - avgScore), 0) / records.length;
    const stability = Math.max(0, Math.min(100, 100 - Math.round(deviation * 2)));

    // 3. Achievement (Average Score)
    const achievement = avgScore;

    // 4. Volume (Number of records, capped at 10 for 100%)
    const volume = Math.min(100, records.length * 10);

    // 5. Speed (Mock logic or based on solveTime if available)
    // If solveTime is available, we could improve this. For now, fixed or random variance for demo.
    const speed = 80;

    // 6. Accuracy (Same as avgScore for now, but could be different if we had question count)
    const accuracy = avgScore;

    return {
        avgScore,
        count: records.length,
        radar: [
            { subject: '성취도', A: achievement, fullMark: 100 },
            { subject: '성실도', A: sincerity, fullMark: 100 },
            { subject: '학습속도', A: speed, fullMark: 100 },
            { subject: '정답률', A: accuracy, fullMark: 100 },
            { subject: '안정성', A: stability, fullMark: 100 },
            { subject: '학습량', A: volume, fullMark: 100 },
        ]
    };
};

const generateTeacherComment = (name, records) => {
    if (!records || records.length === 0) return { status: "아직 분석할 데이터가 충분하지 않습니다. 학습이 진행되면 정밀한 분석이 제공됩니다.", habit: "꾸준한 학습 활동을 통해 나만의 학습 데이터를 쌓아보세요." };

    const stats = calculateCompetencyStats(records);
    const radar = stats.radar;
    const getMetric = (subj) => radar.find(r => r.subject === subj)?.A || 0;

    const achievement = getMetric('성취도');
    const stability = getMetric('안정성');
    const sincerity = getMetric('성실도');

    let status = "";
    let habit = "";

    // 1. Softer, Competency-based Analysis
    if (achievement >= 90) {
        if (stability >= 80) {
            status = `${name} 학생은 '성취도'와 '안정성' 면에서 매우 이상적인 밸런스를 보여주고 있습니다. 어려운 문제에서도 흔들리지 않는 탄탄한 실력을 갖추고 있으며, 이를 바탕으로 최상위권의 성적을 꾸준히 유지하는 모습이 돋보입니다. 탁월한 수학적 메타인지 능력이 엿보입니다.`;
        } else {
            status = `${name} 학생은 뛰어난 수학적 직관력과 높은 '성취도'를 보여주고 있습니다. 폭발적인 잠재력을 가지고 있으나, 가끔 컨디션이나 난이도에 따라 점수의 변동폭이 관찰되기도 합니다. 미세한 실수를 줄이는 '안정성'만 보완된다면 완벽한 실력자로 거듭날 것입니다.`;
        }
    } else if (achievement >= 80) {
        if (sincerity >= 80) {
            status = `${name} 학생은 높은 '성실도'를 바탕으로 꾸준히 성장하고 있는 모범적인 케이스입니다. 성취도 또한 우수한 편이며, 학습한 내용을 자신의 것으로 만드는 소화력이 뛰어납니다. 현재의 성실한 자세를 유지한다면, 심화 응용력 또한 자연스럽게 향상될 것으로 기대됩니다.`;
        } else {
            status = `${name} 학생은 수학적 센스가 좋아 개념을 빠르게 흡수하며 양호한 '성취도'를 기록하고 있습니다. 다만 학습 과정에서의 꼼꼼함을 조금만 더 챙긴다면 놓치는 문제를 줄이고 더 높은 점수로 도약할 수 있는 충분한 역량을 가지고 있습니다.`;
        }
    } else if (achievement >= 70) {
        status = `${name} 학생은 기본기가 잘 잡혀있어 대부분의 유형을 무리 없이 소화해내고 있습니다. 다만 복합적인 사고를 요하는 고난도 문항에서는 다소 어려움을 느끼는 모습입니다. 현재가 가장 중요한 도약의 시기이며, 취약한 고리를 찾아 연결한다면 빠르게 상위권으로 진입할 수 있습니다.`;
    } else {
        status = `${name} 학생은 아직 수학적 잠재력이 다 발현되지 않은 상태입니다. 현재는 개념을 다지는 과정에서 다소 시행착오를 겪고 있으나, 이는 더 단단한 실력을 만들기 위한 과정입니다. 조급함보다는 '정확성'에 초점을 맞춘다면, 머지않아 성취도가 가파르게 상승할 변곡점이 올 것입니다.`;
    }

    // 2. Encouraging Solution
    if (achievement >= 90) {
        habit = "현재의 훌륭한 리듬을 유지하되, 자칫 지루해질 수 있는 반복 학습보다는 '나만의 킬러 문항 만들기'나 '친구에게 설명하기'와 같은 능동적인 학습법을 추천합니다. 사고의 폭을 넓히는 즐거운 도전을 이어가시길 응원합니다.";
    } else if (achievement >= 70) {
        habit = "지금 가장 필요한 것은 '오답의 철저한 분석'입니다. 틀린 문제를 단순히 다시 푸는 것을 넘어, 내가 어떤 개념을 놓쳤는지 메모하는 습관이 큰 변화를 만듭니다. 선생님과 함께 약점을 하나씩 지워나가는 재미를 느껴보세요.";
    } else {
        habit = "가장 좋은 공부법은 '기본으로 돌아가는 것'입니다. 어려운 문제보다는 교과서 핵심 예제를 완벽히 설명할 수 있을 때까지 반복해보세요. 작은 성취감이 모여 자신감이 될 때, 실력은 놀랍도록 성장할 것입니다.";
    }

    return { status, habit };
};

const getScore = (item) => {
    const percent = safeNumber(findValue(item, ['환산', '백분율', 'Percent', '취득']));
    if (percent > 0) return percent;
    return safeNumber(findValue(item, ['점수', 'Score', '맞은', '정답']));
};

// [NEW] Login Component (with Registration)
const LoginOverlay = ({ onLogin, onRegister }) => {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [id, setId] = useState('');
    const [pw, setPw] = useState('');
    const [error, setError] = useState(false);

    const [name, setName] = useState('');     // For register

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'login') {
            onLogin(id, pw);
        } else {
            onRegister(id, pw, name);
            // Switch back to login or stay? logic handles success alert.
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: 'white', padding: '40px', borderRadius: '24px',
                width: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                textAlign: 'center'
            }}>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem', fontWeight: '800', color: '#1e293b' }}>
                    과사람 의대관
                </h1>
                <p style={{ margin: '0 0 30px 0', color: '#64748b', fontSize: '0.95rem' }}>
                    {mode === 'login' ? '아이디와 비밀번호를 입력하세요.' : '선생님 회원가입 신청'}
                </p>

                <form onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="이름 (실명)"
                            style={{
                                width: '100%', padding: '16px', borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc', fontSize: '1.1rem', marginBottom: '10px',
                                outline: 'none', transition: 'all 0.2s'
                            }}
                        />
                    )}
                    <input
                        type="text"
                        value={id}
                        onChange={(e) => { setId(e.target.value); setError(false); }}
                        placeholder="아이디"
                        style={{
                            width: '100%', padding: '16px', borderRadius: '12px',
                            border: error ? '2px solid #ef4444' : '1px solid #e2e8f0',
                            background: '#f8fafc', fontSize: '1.1rem', marginBottom: '10px',
                            outline: 'none', transition: 'all 0.2s'
                        }}
                        autoFocus
                    />
                    <input
                        type="password"
                        value={pw}
                        onChange={(e) => { setPw(e.target.value); setError(false); }}
                        placeholder="비밀번호"
                        style={{
                            width: '100%', padding: '16px', borderRadius: '12px',
                            border: error ? '2px solid #ef4444' : '1px solid #e2e8f0',
                            background: '#f8fafc', fontSize: '1.1rem', marginBottom: '15px',
                            outline: 'none', transition: 'all 0.2s'
                        }}
                    />
                    {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '-10px 0 15px 0' }}>입력 정보가 올바르지 않습니다.</p>}
                    <button
                        type="submit"
                        style={{
                            width: '100%', padding: '16px', borderRadius: '12px',
                            border: 'none', background: '#4f46e5', color: 'white',
                            fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                        }}
                    >
                        {mode === 'login' ? '접속하기' : '가입 신청하기'}
                    </button>

                    <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#64748b' }}>
                        {mode === 'login' ? (
                            <>
                                선생님이신가요? <span onClick={() => { setMode('register'); setError(false); }} style={{ color: '#4f46e5', fontWeight: 'bold', cursor: 'pointer' }}>회원가입 신청</span>
                            </>
                        ) : (
                            <>
                                이미 계정이 있으신가요? <span onClick={() => { setMode('login'); setError(false); }} style={{ color: '#4f46e5', fontWeight: 'bold', cursor: 'pointer' }}>로그인하기</span>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

// PLACEHOLDERS for Components (will be replaced in next steps)
const RealTimeView = ({ processedData, onClose, authPassword }) => {
    const [page, setPage] = useState(0);
    const [animKey, setAnimKey] = useState(0);
    const [slideDuration, setSlideDuration] = useState(12);
    const [themeColor, setThemeColor] = useState('#4f46e5');
    const [showProgressBar, setShowProgressBar] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isNavHover, setIsNavHover] = useState(false);
    const [isControlHover, setIsControlHover] = useState(false);
    const fileInputRef = useRef(null);

    const handleServerUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const pw = prompt("관리자 비밀번호를 입력하세요 (기본: orzoai)");
        if (pw !== "orzoai") {
            alert("비밀번호가 올바르지 않습니다.");
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        Array.from(files).forEach(file => {
            // [IMPORTANT] Encode path separators to '__ORD__' to survive proxy path stripping
            // If we send "Folder/File.csv", some proxies change it to "File.csv". 
            // We send "Folder__ORD__File.csv" instead.
            const rawPath = file.webkitRelativePath || file.name;
            const uploadName = rawPath.replace(/\//g, '__ORD__').replace(/\\/g, '__ORD__');
            formData.append('files', file, uploadName);
        });

        // [DEBUG] Confirm what we are sending
        const firstFile = Array.from(files)[0];
        const debugName = (firstFile.webkitRelativePath || firstFile.name).replace(/\//g, '__ORD__').replace(/\\/g, '__ORD__');
        // alert(`[DEBUG] Uploading... Example: ${debugName}`); 

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'x-admin-password': pw },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                alert(`업로드 성공! (${data.count}개 파일) 데이터가 곧 갱신됩니다.\n첫 번째 파일 경로: ${debugName}`);
                if (window.location.reload) setTimeout(() => window.location.reload(), 2000);
            } else {
                alert("업로드 실패: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("업로드 중 오류가 발생했습니다: " + (err.message || err));
        }
        e.target.value = '';
    };

    // Fullscreen toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.log(e));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    const itemsPerPage = 8; // [UPDATED] Changed from 12 to 8

    const slides = useMemo(() => {
        const result = [];

        // [1] Intro Slide (Spline)
        result.push({
            type: 'intro',
            items: []
        });

        if (!processedData || processedData.length === 0) return result;

        const limitDate = new Date();
        limitDate.setDate(new Date().getDate() - 14);
        limitDate.setHours(0, 0, 0, 0);

        const targets = processedData.filter(d => {
            const isRecent = d.dateObj >= limitDate;
            const isHomework = d.title.includes('과제');
            return isRecent && isHomework;
        });

        const classMap = {};
        targets.forEach(item => {
            if (!classMap[item.className]) classMap[item.className] = {};
            const itemCourse = item.course || extractCourse(item.title) || '공통수학';

            if (!classMap[item.className][item.name]) {
                classMap[item.className][item.name] = {
                    name: item.name,
                    className: item.className,
                    course: itemCourse,
                    records: []
                };
            }
            classMap[item.className][item.name].records.push(item);
        });

        Object.keys(classMap).sort().forEach(cls => {
            const students = Object.values(classMap[cls]).sort((a, b) => a.name.localeCompare(b.name));
            // Sort records desc for each student
            students.forEach(s => s.records.sort((a, b) => b.dateObj - a.dateObj));

            // Limit to latest 2 assignments (if more than 2)
            students.forEach(s => {
                s.records = s.records.slice(0, 2);
            });

            const totalPages = Math.ceil(students.length / itemsPerPage);
            for (let i = 0; i < students.length; i += itemsPerPage) {
                result.push({
                    type: 'class',
                    className: cls,
                    pageIndex: Math.floor(i / itemsPerPage) + 1,
                    totalPages,
                    items: students.slice(i, i + itemsPerPage)
                });
            }
        });
        return result;
    }, [processedData]);

    useEffect(() => {
        if (slides.length === 0) return; // Don't cycle if on Start Screen

        setAnimKey(prev => prev + 1);

        const timer = setTimeout(() => {
            setPage(p => (p + 1) % slides.length);
        }, slideDuration * 1000);

        return () => clearTimeout(timer);
    }, [page, slides.length, slideDuration]);

    const currentSlide = slides[page];

    if (!currentSlide) return (
        <div style={{ padding: '50px', textAlign: 'center' }}>
            <h2>최근 과제 데이터가 없습니다.</h2>
            <button onClick={onClose} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>돌아가기</button>
        </div>
    );

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: '#f8fafc', color: '#1e293b', overflow: 'hidden', zIndex: 9999, fontFamily: 'Pretendard, sans-serif' }}>

            {/* Header - Transparent/Modified for Intro, Standard for Classes */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', background: currentSlide.type === 'intro' ? 'rgba(255, 255, 255, 0.0)' : 'rgba(255, 255, 255, 0.95)', backdropFilter: currentSlide.type === 'intro' ? 'none' : 'blur(10px)', borderBottom: currentSlide.type === 'intro' ? 'none' : '1px solid #e2e8f0', zIndex: 10, transition: 'all 0.5s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>


                    {currentSlide.type === 'intro' ? (
                        // Enhanced Header for Intro (Left Side) - Larger & English Subtitle
                        <div style={{ marginTop: '30px', padding: '20px 40px', background: 'rgba(0,0,0,0.2)', borderRadius: '24px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
                            <div style={{ fontSize: '2.5rem', background: 'linear-gradient(to right, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900', letterSpacing: '-1px', marginBottom: '8px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                                과사람 의대관
                            </div>
                            <div style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}>
                                Premium Math Institute
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ width: '8px', height: '50px', background: themeColor, borderRadius: '4px' }}></div>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: themeColor, fontWeight: '800', marginBottom: '2px', letterSpacing: '0.5px' }}>
                                    과사람 의대관 <span style={{ color: '#64748b', fontWeight: '500' }}>|</span> 프리미엄 수학 전문 학원
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
                                    <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0, letterSpacing: '-1px', color: '#1e293b', lineHeight: 1 }}>{currentSlide.className}</h1>
                                    <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '600' }}>실시간 학습 현황 모니터 [ {currentSlide.pageIndex} / {currentSlide.totalPages} ]</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div
                    style={{ display: 'flex', gap: '15px', opacity: isControlHover ? 1 : 0, transition: 'opacity 0.3s' }}
                    onMouseEnter={() => setIsControlHover(true)}
                    onMouseLeave={() => setIsControlHover(false)}
                >

                    {currentSlide.type !== 'intro' && (
                        <>
                            <button onClick={toggleFullscreen} style={{ padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <Maximize size={24} />
                            </button>
                            <button onClick={() => fileInputRef.current.click()} style={{ padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <FolderOpen size={24} />
                            </button>
                            {/* Hidden Input for Header Button */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleServerUpload}
                                accept=".csv, .xlsx, .xls"
                                webkitdirectory="" directory="" multiple
                            />
                            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={{ padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <Settings size={24} />
                            </button>
                            <button onClick={onClose} style={{ padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <X size={24} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Config Panel */}
            {isSettingsOpen && (
                <div style={{ position: 'absolute', top: '100px', right: '40px', width: '320px', background: 'white', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', zIndex: 10000, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: '#1e293b', fontWeight: '700' }}>모니터 설정</h3>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: '#64748b', fontWeight: '600' }}>슬라이드 전환 시간 ({slideDuration}초)</label>
                        <input type="range" min="5" max="60" value={slideDuration} onChange={(e) => setSlideDuration(Number(e.target.value))} style={{ width: '100%', accentColor: themeColor }} />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: '#64748b', fontWeight: '600' }}>테마 포인트 컬러</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {['#4f46e5', '#059669', '#dc2626', '#d97706', '#db2777'].map(c => (
                                <div key={c} onClick={() => setThemeColor(c)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: c, cursor: 'pointer', border: themeColor === c ? '3px solid #e2e8f0' : 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div>
                            ))}
                        </div>
                    </div>



                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>하단 진행바 표시</label>
                        <input type="checkbox" checked={showProgressBar} onChange={(e) => setShowProgressBar(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: themeColor }} />
                    </div>
                </div>
            )}

            {/* CONTENT AREA */}
            <div style={{ width: '100%', height: '100%' }}>

                {/* 1. If Intro Slide (Spline) */}

                {/* 1. If Intro Slide (Spline) */}

                {currentSlide.type === 'intro' && (
                    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                        <iframe
                            src="https://my.spline.design/claritystream-mDXSTu56HgZ7qZtc2R9gBFBc/"
                            frameBorder="0"
                            width="100%"
                            height="100%"
                            style={{ width: '100vw', height: 'calc(100dvh + 60px)', border: 'none', position: 'absolute', top: 0, left: 0 }}
                        ></iframe>

                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            pointerEvents: 'none',
                            zIndex: 10
                        }}>
                            <h1 style={{
                                fontSize: '5rem',
                                fontWeight: '900',
                                background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                margin: 0,
                                letterSpacing: '-2px',
                                lineHeight: '1.2',
                                whiteSpace: 'nowrap',
                                filter: 'drop-shadow(0 0 30px rgba(165, 180, 252, 0.3)) drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
                            }}>오르조 과제 현황</h1>
                        </div>
                    </div>
                )}

                {/* 2. If Class Slide */}
                {currentSlide.type === 'class' && (
                    <div style={{ padding: '110px 40px 40px 40px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: `repeat(${Math.ceil(currentSlide.items.length / 4) > 2 ? 3 : 2}, 1fr)`, gap: '24px', height: '100dvh', boxSizing: 'border-box' }}>
                        {currentSlide.items.map((student, idx) => {
                            const styles = getCourseBadgeStyle(student.course);
                            return (
                                <div key={idx} style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)', minHeight: 0, overflow: 'hidden' }}>
                                    {/* Header: Name & Course */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.5px' }}>{student.name}</span>
                                        <span style={{ fontSize: '0.85rem', padding: '4px 10px', borderRadius: '16px', fontWeight: '700', background: styles.bg, color: styles.text, border: `1px solid ${styles.border}` }}>{student.course}</span>
                                    </div>

                                    {/* Divider */}
                                    <div style={{ height: '1px', background: '#f1f5f9', width: '100%' }}></div>

                                    {/* Records List (2 Weeks History) */}
                                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {student.records.length > 0 ? student.records.map((r, rIdx) => (
                                            <div key={rIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>{r.dateStr.slice(5)}</span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: r.status === '완료' ? '#059669' : '#ef4444' }}>{r.status}</span>
                                                </div>
                                                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {r.title}
                                                </div>
                                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.9rem', color: '#475569', marginTop: '4px' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>⏱️ 풀이 <strong style={{ color: '#3b82f6' }}>{r.solveTime}</strong></span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🔄 복습 <strong style={{ color: '#d97706' }}>{r.reviewTime}</strong></span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div style={{ textAlign: 'center', color: '#cbd5e1', padding: '20px' }}>데이터 없음</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Progress Bar - Smoother CSS Keyframe-like Transition */}
            {showProgressBar && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '6px', background: currentSlide.type === 'intro' ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
                    <div
                        key={animKey}
                        style={{
                            height: '100%',
                            background: themeColor,
                            width: '0%',
                            animation: `progressAnimation ${slideDuration}s linear forwards`,
                            boxShadow: `0 0 10px ${themeColor}`
                        }}
                    ></div>
                    <style>
                        {`
                           @keyframes progressAnimation {
                               from { width: 0%; }
                               to { width: 100%; }
                           }
                       `}
                    </style>
                </div>
            )}

            {/* Transparent Navigation Button (Bottom Right) */}
            <div
                onClick={() => setPage(p => (p + 1) % slides.length)}
                onMouseEnter={() => setIsNavHover(true)}
                onMouseLeave={() => setIsNavHover(false)}
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    width: '150px',
                    height: '100px',
                    zIndex: 99999,
                    cursor: 'pointer',
                    borderRadius: '20px',
                    background: isNavHover ? 'rgba(0,0,0,0.05)' : 'transparent',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {isNavHover && <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#94a3b8' }}>다음 페이지</span>}
            </div>
        </div>
    );
};

// [NEW] Report Modal Component (Premium Design)
const ReportModal = ({ selectedStudent, records, onClose, initialAction }) => {
    if (!selectedStudent) return null;

    // [FIX] Strictly use passed records. Do NOT fallback to all records automatically.
    // This ensures what you see in StudentDetailView is what you get.
    // Default to empty array if null/undefined to prevent crash, but don't show all.
    const reportData = records || [];
    console.log("[ReportModal] Records received:", records?.length, "Final Display:", reportData.length);

    // [UPDATED] Use Shared Competency Stats
    const stats = calculateCompetencyStats(reportData);
    const analysis = generateTeacherComment(selectedStudent.name, reportData);

    // Auto-trigger actions based on initialAction prop
    React.useEffect(() => {
        if (!initialAction) return;

        // Wait for render
        const timer = setTimeout(() => {
            if (initialAction === 'print') handlePrint();
            if (initialAction === 'download_png') handleDownloadImage();
            if (initialAction === 'download_html') handleDownloadHTML();
        }, 800);

        return () => clearTimeout(timer);
    }, [initialAction]);

    // ... (rest of methods)

    const handleDownloadImage = async () => {
        const element = document.getElementById('report-content');
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `${selectedStudent.name}_학습리포트.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error(err);
            alert("이미지 다운로드 실패");
        }
    };

    const handleDownloadHTML = () => {
        const element = document.getElementById('report-content');
        if (!element) return;
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <title>${selectedStudent.name} 학생 학습 리포트</title>
                <style>
                    @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard-dynamic-subset.css");
                    body { margin: 0; padding: 40px; font-family: 'Pretendard', sans-serif; background: #f1f5f9; display: flex; justify-content: center; }
                    .report-container { background: white; width: 900px; padding: 50px; border-radius: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 40px; }
                    .title-section h1 { font-size: 2.5rem; color: #0f172a; margin: 0; letter-spacing: -1px; font-weight: 900; }
                    .title-section .sub { color: #b45309; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; font-size: 0.9rem; }
                    .meta { text-align: right; color: #64748b; font-size: 0.9rem; font-weight: 500; }
                    .section-title { font-size: 1.2rem; color: #0f172a; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; border-left: 4px solid #b45309; padding-left: 12px; }
                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
                    .card { background: #fff; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
                    .analysis-box { background: #f8fafc; padding: 25px; border-radius: 8px; border-left: 4px solid #0f172a; margin-bottom: 20px; }
                    .habit-box { background: #fffbeb; padding: 25px; border-radius: 8px; border-left: 4px solid #d97706; }
                    .table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-top: 10px; }
                    .table th { border-top: 2px solid #0f172a; border-bottom: 1px solid #0f172a; padding: 12px; text-align: left; font-weight: 700; color: #0f172a; background: #f8fafc; }
                    .table td { border-bottom: 1px solid #e2e8f0; padding: 12px; color: #334155; }
                    .score-badge { padding: 4px 8px; border-radius: 4px; font-weight: 700; font-size: 0.85rem; }
                    .high { color: #059669; background: #ecfdf5; }
                    .normal { color: #1d4ed8; background: #eff6ff; }
                    @media print { body { padding: 0; background: white; } .report-container { width: 100%; box-shadow: none; padding: 20px; } }
                </style>
            </head>
            <body>
                <div class="report-container">
                    ${element.innerHTML}
                </div>
            </body>
            </html>
        `;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${selectedStudent.name}_학습리포트.html`;
        link.href = url;
        link.click();
    };

    const handlePrint = () => {
        window.print();
    };

    // Debugging timestamp to confirm update
    useEffect(() => { console.log("ReportModal Updated: " + new Date().toISOString()); }, []);

    return (
        <div className="report-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', overflowY: 'auto', zIndex: 2000, backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'start center', padding: '40px 0' }} onClick={onClose}>
            <style>{`
                @media print {
                    .report-modal-overlay { position: absolute; background: white; overflow: visible; }
                    .report-content { width: 210mm !important; margin: 0 !important; box-shadow: none !important; transform: none !important; }
                    .no-print { display: none !important; }
                }
                /* Custom Scrollbar for the modal */
                .report-modal-overlay::-webkit-scrollbar { width: 8px; }
                .report-modal-overlay::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .report-modal-overlay::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); borderRadius: 4px; }
            `}</style>
            {/* Actions (Fixed Overlay - Always Visible) */}
            <div className="no-print" style={{ position: 'fixed', top: '30px', right: '30px', display: 'flex', gap: '10px', zIndex: 2010 }}>
                <div style={{ display: 'flex', gap: '5px', background: 'white', padding: '5px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
                    <button onClick={handleDownloadImage} style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569', fontWeight: '600' }}><Download size={14} /> PNG</button>
                    <button onClick={handleDownloadHTML} style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569', fontWeight: '600' }}><FileText size={14} /> HTML</button>
                    <button onClick={handlePrint} style={{ padding: '8px 12px', background: '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'white', fontWeight: '600' }}><Printer size={14} /> Print</button>
                </div>
                <button onClick={onClose} style={{ background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', padding: '10px', borderRadius: '50%', color: '#64748b', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}><X size={24} /></button>
            </div>

            {/* Content Container */}
            <div id="report-content" className="report-content" style={{ background: 'white', width: '95%', maxWidth: '210mm', minHeight: '297mm', borderRadius: '4px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative', fontFamily: "'Pretendard', sans-serif", padding: '60px' }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #0f172a', paddingBottom: '25px', marginBottom: '40px' }}>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: '#b45309', fontWeight: '800', marginBottom: '8px', letterSpacing: '1px' }}>과사람 의대관 프리미엄 수학 전문 학원</div>
                        <h1 style={{ fontSize: '2.8rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-1.5px', lineHeight: 1 }}>{selectedStudent.name} <span style={{ fontSize: '1.5rem', fontWeight: '400', color: '#64748b' }}>학생 학습 상세 분석서</span></h1>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                        <div>분석 일자 : {new Date().toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Charts Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
                    <div style={{ border: '1px solid #e2e8f0', padding: '30px', borderRadius: '0', boxShadow: '0 4px 6px -2px rgba(0,0,0,0.03)' }}>
                        <h3 style={{ margin: '0 0 25px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', borderLeft: '4px solid #b45309', paddingLeft: '12px' }}>
                            학습 역량 분석
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <RadarChart outerRadius="75%" data={stats.radar}>
                                <PolarGrid stroke="#cbd5e1" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#334155', fontSize: 13, fontWeight: '700' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="역량" dataKey="A" stroke="#0f172a" fill="#0f172a" fillOpacity={0.6} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', padding: '30px', borderRadius: '0', boxShadow: '0 4px 6px -2px rgba(0,0,0,0.03)' }}>
                        <h3 style={{ margin: '0 0 25px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', borderLeft: '4px solid #b45309', paddingLeft: '12px' }}>
                            최근 성적 추이
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={[...reportData].reverse().slice(-10)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="colorScorePremium" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#b45309" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#b45309" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="dateStr"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: '600' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    height={50}
                                    tickFormatter={(val) => val.slice(2)}
                                />
                                <YAxis domain={[0, 100]} hide />
                                <Area type="monotone" dataKey="score" stroke="#b45309" strokeWidth={2} fill="url(#colorScorePremium)" dot={{ r: 4, fill: '#b45309', stroke: 'white', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Analysis Text */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                    <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '2px', borderTop: '4px solid #0f172a' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <BrainCircuit size={20} color="#0f172a" /> 학습 종합 분석
                        </h3>
                        <p style={{ lineHeight: '1.8', color: '#334155', fontSize: '0.95rem', margin: 0, fontWeight: '500' }}>{analysis.status}</p>
                    </div>
                    <div style={{ background: '#fffbeb', padding: '30px', borderRadius: '2px', borderTop: '4px solid #d97706' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#92400e', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <TrendingUp size={20} color="#d97706" /> 학습 솔루션 제언
                        </h3>
                        <p style={{ lineHeight: '1.8', color: '#92400e', fontSize: '0.95rem', margin: 0, fontWeight: '500' }}>{analysis.habit}</p>
                    </div>
                </div>

                {/* Table */}
                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', borderLeft: '4px solid #b45309', paddingLeft: '12px' }}>학습 기록 목록</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderTop: '2px solid #0f172a', borderBottom: '1px solid #0f172a' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#0f172a' }}>학습일시</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#0f172a' }}>학습단계</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#0f172a', width: '40%' }}>학습내용</th>
                                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>상태</th>
                                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>점수</th>
                                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>풀이시간</th>
                                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>복습시간</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.slice(0, 15).map((record, i) => {
                                const isCompleted = record.score !== null && record.score !== undefined && record.score >= 0;
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '12px', color: '#64748b' }}>{record.dateStr}</td>
                                        <td style={{ padding: '12px', color: '#334155', fontWeight: '600' }}>{record.course}</td>
                                        <td style={{ padding: '12px', color: '#0f172a', fontWeight: '500' }}>{record.title}</td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: '700', padding: '4px 8px', borderRadius: '6px',
                                                background: isCompleted ? '#ecfdf5' : '#fff7ed',
                                                color: isCompleted ? '#059669' : '#ea580c'
                                            }}>
                                                {isCompleted ? '채점완료' : '학습중'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontWeight: '700',
                                                background: record.score >= 90 ? '#0f172a' : 'white',
                                                color: record.score >= 90 ? 'white' : '#0f172a',
                                                border: '1px solid #0f172a'
                                            }}>{record.score}</span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>{record.solveTime}</td>
                                        <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>{record.reviewTime}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '50px', borderTop: '1px solid #e2e8f0', paddingTop: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    <p style={{ margin: 0 }}>본 리포트는 오르조 AI 학습 시스템에 의해 자동 생성된 분석 결과입니다.</p>
                    <p style={{ margin: '5px 0 0 0', fontWeight: '600' }}>과사람 의대관 프리미엄 수학 전문 학원</p>
                </div>
            </div>
        </div>
    );
};

// [NEW] Student Detail View Component (Teacher System View)
const StudentDetailView = ({ student, onClose, onOpenReport, isMobile, showReportButton = true }) => {
    const [selectedCourse, setSelectedCourse] = useState('전체');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState(''); // [NEW] Search State

    if (!student) return null;

    const courses = ['전체', ...new Set(student.records.map(r => r.course))];

    const filteredRecords = useMemo(() => {
        let result = student.records;
        if (selectedCourse !== '전체') {
            result = result.filter(r => r.course === selectedCourse);
        }
        if (startDate && endDate) {
            result = result.filter(r => r.dateStr >= startDate && r.dateStr <= endDate);
        } else if (startDate) {
            result = result.filter(r => r.dateStr >= startDate);
        }

        // [NEW] Search Filter
        if (searchQuery) {
            result = result.filter(r => r.title.includes(searchQuery) || r.course.includes(searchQuery));
        }

        return result;
    }, [student.records, selectedCourse, startDate, endDate, searchQuery]);

    const stats = useMemo(() => {
        return calculateCompetencyStats(filteredRecords);
    }, [filteredRecords]);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100dvh', background: '#f8fafc', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            {/* Header - Mobile Stack vs Desktop Row */}
            <div style={{
                minHeight: '70px',
                padding: isMobile ? '20px 25px' : '0 30px',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${THEME.border}`,
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                gap: isMobile ? '15px' : '0'
            }}>
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: '15px', width: '100%' }}>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', marginLeft: '-8px', '&:hover': { background: '#f1f5f9' } }}><ChevronLeft size={24} color={THEME.primary} /></button>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: THEME.accent, fontWeight: '700', marginBottom: '4px' }}>과사람 의대관 프리미엄 수학 전문 학원</div>
                        {isMobile ? (
                            // Mobile Header Stack
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.85rem', color: THEME.secondary, background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', alignSelf: 'flex-start', marginBottom: '6px' }}>{student.className}</span>
                                <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, color: THEME.primary, lineHeight: '1.2', wordBreak: 'keep-all' }}>{student.name}</h1>
                            </div>
                        ) : (
                            // Desktop Header Row
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h1 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: THEME.primary }}>{student.name}</h1>
                                <span style={{ fontSize: '0.85rem', color: THEME.secondary, background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>{student.className}</span>
                            </div>
                        )}
                    </div>
                </div>
                {/* Actions */}
                {showReportButton && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                        <button onClick={() => onOpenReport(filteredRecords)} style={{ padding: '10px 16px', background: THEME.accent, color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
                            <Printer size={18} /> {isMobile ? '리포트 보기' : '학부모 리포트 보기'}
                        </button>
                    </div>
                )}
            </div>

            {/* Course Filter Tabs (Fixed Area) */}
            <div style={{
                padding: '15px 30px',
                background: '#f8fafc',
                borderBottom: `1px solid ${THEME.border}`,
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                zIndex: 5,
                gap: isMobile ? '12px' : '0'
            }}>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', width: isMobile ? '100%' : 'auto', paddingBottom: isMobile ? '5px' : '0' }}>
                    {courses.map(course => (
                        <button
                            key={course}
                            onClick={() => setSelectedCourse(course)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: selectedCourse === course ? `1px solid ${THEME.accent}` : `1px solid ${THEME.border}`,
                                background: selectedCourse === course ? THEME.accent : 'white',
                                color: selectedCourse === course ? 'white' : THEME.secondary,
                                fontWeight: '600',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                                flexShrink: 0 // Prevent shrinking on mobile
                            }}
                        >
                            {course}
                        </button>
                    ))}
                </div>

                {/* Filters Row: Search (Desktop only) & Date */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>

                    {/* [NEW] Search Input - Hidden on Mobile */}
                    {!isMobile && (
                        <div style={{ position: 'relative', marginRight: '10px' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="학습 내용 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: '6px 10px 6px 30px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.85rem',
                                    color: '#334155',
                                    width: '180px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '5px', background: 'white', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', alignItems: 'center', flex: isMobile ? 1 : 'none', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginRight: '5px', fontWeight: '600' }}>기간</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: '#64748b', fontFamily: 'inherit' }} />
                            <span style={{ color: '#cbd5e1' }}>~</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: '#64748b', fontFamily: 'inherit' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content (Scrollable) */}
            <div style={{ flex: 1, padding: '20px 30px 30px 30px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '30px', alignItems: 'flex-start', flex: 1 }}>
                    {/* Left Panel: Stats & Charts */}
                    <div style={{ width: isMobile ? '100%' : '350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Stats Card */}
                        <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: `1px solid ${THEME.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '0.95rem', color: THEME.secondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {selectedCourse} 통계
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>평균 점수</div>
                                    <div style={{ fontSize: '2rem', fontWeight: '800', color: stats.avgScore >= 90 ? THEME.success : THEME.primary }}>
                                        {stats.avgScore}<span style={{ fontSize: '1rem', fontWeight: '600', color: '#cbd5e1' }}>점</span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>학습 횟수</div>
                                    <div style={{ fontSize: '2rem', fontWeight: '800', color: THEME.primary }}>
                                        {stats.count}<span style={{ fontSize: '1rem', fontWeight: '600', color: '#cbd5e1' }}> 회</span>
                                    </div>
                                </div>
                            </div>
                            {/* Hexagonal Radar Chart */}
                            <div style={{ height: '250px', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, fontSize: '0.85rem', fontWeight: '700', color: THEME.primary }}>학습 역량 분석</div>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart outerRadius="70%" data={stats.radar}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: '600' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="역량" dataKey="A" stroke={THEME.accent} fill={THEME.accent} fillOpacity={0.4} />
                                        <Tooltip content={<CustomTooltip />} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Mini Trend Chart */}
                        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${THEME.border}`, height: '250px' }}>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '0.95rem', color: THEME.secondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LineChart size={16} /> 최근 성적 추이
                            </h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <AreaChart data={[...filteredRecords].reverse().slice(-5)}>
                                    <defs>
                                        <linearGradient id="colorScoreMini" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={THEME.accent} stopOpacity={0.2} />
                                            <stop offset="95%" stopColor={THEME.accent} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="dateStr" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} interval={0} tickFormatter={(val) => val.slice(5)} />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="score" stroke={THEME.accent} strokeWidth={2} fill="url(#colorScoreMini)" dot={{ r: 3, fill: THEME.accent }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right Panel: Data Table */}
                    <div style={{ flex: 1, width: isMobile ? '100%' : 'auto', background: 'white', borderRadius: '16px', border: `1px solid ${THEME.border}`, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'visible' : 'hidden', boxShadow: '0 4px 6px -2px rgba(0,0,0,0.03)', height: isMobile ? 'auto' : '100%', minHeight: isMobile ? '0' : '400px' }}>
                        {isMobile ? (
                            // [MOBILE VIEW] Card List Layout (No Horizontal Scroll)
                            <div style={{ padding: '5px' }}>
                                <div style={{ padding: '0 0 20px 0', borderBottom: `2px solid ${THEME.primary}`, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                                    <div style={{ width: '4px', height: '24px', background: THEME.primary }}></div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: THEME.primary }}>최근 학습 수행 상세</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {filteredRecords.map((record, idx) => {
                                        const style = getCourseBadgeStyle(record.course);
                                        const isCompleted = record.score !== null && record.score !== undefined && record.score >= 0;
                                        return (
                                            <div key={idx} style={{
                                                background: 'white',
                                                borderRadius: '16px',
                                                padding: '20px',
                                                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                                                border: `1px solid ${THEME.border}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px'
                                            }}>
                                                {/* Card Header: Date & Badge */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>{record.dateStr}</span>
                                                    <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
                                                        {record.course}
                                                    </span>
                                                </div>

                                                {/* Card Body: Title */}
                                                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b', lineHeight: '1.5', wordBreak: 'keep-all' }}>
                                                    {record.title}
                                                </div>

                                                {/* Divider */}
                                                <div style={{ height: '1px', background: '#f1f5f9', width: '100%' }}></div>

                                                {/* Card Footer: Stats (Explicit Labels) */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            {/* Score Circle */}
                                                            <div style={{
                                                                width: '44px', height: '44px', borderRadius: '50%',
                                                                background: record.score >= 90 ? '#0f172a' : 'white',
                                                                color: record.score >= 90 ? 'white' : '#0f172a',
                                                                border: '2px solid #0f172a',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontWeight: '800', fontSize: '1.1rem'
                                                            }}>
                                                                {record.score}
                                                            </div>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: isCompleted ? '#059669' : '#ea580c' }}>
                                                                {isCompleted ? '채점완료' : '학습중'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', justifyContent: 'space-around' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Timer size={12} /> 풀이 시간
                                                            </div>
                                                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>{record.solveTime || '-'}</div>
                                                        </div>
                                                        <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <TrendingUp size={12} /> 복습 시간
                                                            </div>
                                                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>{record.reviewTime || '-'}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredRecords.length === 0 && (
                                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>데이터가 없습니다.</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // [DESKTOP VIEW] Original
                            <>
                                <div style={{ padding: '20px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: THEME.primary }}>학습 기록 목록</h2>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <span style={{ fontSize: '0.85rem', color: THEME.secondary, background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px' }}>{selectedCourse}</span>
                                    </div>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', minHeight: '400px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                                            <tr>
                                                <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', borderBottom: `1px solid ${THEME.border}` }}>학습일시</th>
                                                <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', borderBottom: `1px solid ${THEME.border}` }}>학습단계</th>
                                                <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', borderBottom: `1px solid ${THEME.border}`, width: '40%' }}>학습내용</th>
                                                <th style={{ padding: '15px 20px', textAlign: 'center', fontWeight: '600', color: '#64748b', borderBottom: `1px solid ${THEME.border}` }}>상태</th>
                                                <th style={{ padding: '15px 20px', textAlign: 'center', fontWeight: '600', color: '#64748b', borderBottom: `1px solid ${THEME.border}` }}>점수</th>
                                                <th style={{ padding: '15px 20px', textAlign: 'center', fontWeight: '600', color: '#64748b', borderBottom: `1px solid ${THEME.border}` }}>풀이시간</th>
                                                <th style={{ padding: '15px 20px', textAlign: 'center', fontWeight: '600', color: '#64748b', borderBottom: `1px solid ${THEME.border}` }}>복습시간</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredRecords.map((record, idx) => {
                                                const isCompleted = record.score !== null && record.score !== undefined && record.score >= 0;
                                                return (
                                                    <tr key={idx} style={{ borderBottom: `1px solid ${THEME.border}`, '&:last-child': { borderBottom: 'none' } }}>
                                                        <td style={{ padding: '14px 20px', color: THEME.secondary }}>{record.dateStr}</td>
                                                        <td style={{ padding: '14px 20px' }}>
                                                            <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', color: THEME.secondary, fontWeight: '600' }}>{record.course}</span>
                                                        </td>
                                                        <td style={{ padding: '14px 20px', color: THEME.primary, fontWeight: '500' }}>{record.title}</td>
                                                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                            <span style={{
                                                                fontSize: '0.75rem', fontWeight: '700', padding: '4px 8px', borderRadius: '6px',
                                                                background: isCompleted ? '#ecfdf5' : '#fff7ed',
                                                                color: isCompleted ? '#059669' : '#ea580c'
                                                            }}>
                                                                {isCompleted ? '채점완료' : '학습중'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                            <span style={{ color: record.score >= 90 ? THEME.success : THEME.primary, fontWeight: '700' }}>{record.score}</span>
                                                        </td>
                                                        <td style={{ padding: '14px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>{record.solveTime}</td>
                                                        <td style={{ padding: '14px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>{record.reviewTime}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {filteredRecords.length === 0 && (
                                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>해당 과목의 학습 기록이 없습니다.</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// [NEW] User Management Panel
const UserManagementPanel = ({ themeColor, onSimulateLogin, onClose, adminPassword, user }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newUser, setNewUser] = useState({ id: '', pw: '', name: '', role: 'student' });
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        console.log('[Debug] Fetching users...'); // [DEBUG]
        try {
            const res = await fetch('/api/users?pw=orzoai', {
                headers: {
                    'x-admin-password': 'orzoai', // Legacy support
                    // [NEW] Send User Auth
                    'x-user-id': user ? encodeURIComponent(user.id) : '',
                    'x-user-pw': user ? encodeURIComponent(user.pw) : ''
                }
            });
            console.log('[Debug] Fetch status:', res.status); // [DEBUG]
            if (res.ok) {
                const data = await res.json();
                console.log('[Debug] Fetched data:', data); // [DEBUG]

                if (Array.isArray(data)) {
                    setUsers(data);
                    // Alert if empty for immediate visibility
                    if (data.length === 0) alert('[Debug] User list is empty even after fetch!');
                } else {
                    console.error('[Debug] Data is not an array:', data);
                    alert('[Debug] Server returned invalid data format.');
                }
            } else {
                const errText = await res.text();
                console.error('[Debug] Fetch failed:', errText);
                alert(`[Debug] Failed to fetch users: ${res.status}\n${errText}`);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
            alert(`[Debug] Network Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncUsers = async () => {
        if (!confirm('업로드된 데이터를 기반으로 사용자 계정을 자동 생성하시겠습니까?\n(기존 계정은 유지되며, 없는 이름만 추가됩니다. 기본 비밀번호: 1234)')) return;

        setLoading(true);
        try {
            const res = await fetch('/api/users/sync?pw=orzoai', {
                method: 'POST',
                headers: {
                    'x-admin-password': 'orzoai',
                    'x-user-id': user ? encodeURIComponent(user.id) : '',
                    'x-user-pw': user ? encodeURIComponent(user.pw) : ''
                }
            });
            const data = await res.json();
            console.log('[Debug] Sync result:', data); // [DEBUG]

            if (data.success) {
                if (data.message) alert(data.message);
                else alert(`동기화 완료!\n총 ${data.addedCount}명의 사용자가 추가되었습니다.`);

                // Force a small delay before refetching to ensure disk write completes
                setTimeout(() => {
                    fetchUsers();
                }, 500);
            } else {
                alert('동기화 실패: ' + data.message);
            }
        } catch (e) {
            console.error(e);
            alert('오류가 발생했습니다: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = () => {
        if (!newUser.id || !newUser.pw || !newUser.name) {
            alert('모든 필드를 입력해주세요.');
            return;
        }
        if (users.some(u => u.id === newUser.id)) {
            alert('이미 존재하는 아이디입니다.');
            return;
        }
        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        setNewUser({ id: '', pw: '', name: '', role: 'student' });
        setIsDirty(true);
    };

    const handleDeleteUser = (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        setUsers(users.filter(u => u.id !== id));
        setIsDirty(true);
    };

    const handleSave = async () => {
        try {
            const res = await fetch('/api/users?pw=orzoai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': 'orzoai',
                    'x-user-id': user ? encodeURIComponent(user.id) : '',
                    'x-user-pw': user ? encodeURIComponent(user.pw) : ''
                },
                body: JSON.stringify(users)
            });
            if (res.ok) {
                alert('저장되었습니다.');
                setIsDirty(false);
            } else {
                alert('저장 실패');
            }
        } catch (error) {
            console.error('Save failed', error);
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                <input placeholder="이름 (예: 홍길동)" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <input placeholder="아이디" value={newUser.id} onChange={e => setNewUser({ ...newUser, id: e.target.value })} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <input placeholder="비밀번호" value={newUser.pw} onChange={e => setNewUser({ ...newUser, pw: e.target.value })} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                <button onClick={handleAddUser} style={{ padding: '8px 16px', background: themeColor, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>추가</button>
            </div>

            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleSyncUsers} style={{ padding: '8px 16px', background: '#f1f5f9', color: themeColor, border: `1px solid ${themeColor}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FolderOpen size={16} /> 데이터 기반 자동 생성 (동기화)
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                        <tr>
                            <th style={{ padding: '8px', textAlign: 'left' }}>이름</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>아이디</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>비밀번호</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px' }}>
                                    {u.name}
                                    {u.role === 'teacher' && <span style={{ fontSize: '0.7em', marginLeft: '5px', padding: '2px 5px', background: '#e0e7ff', color: '#4338ca', borderRadius: '4px' }}>T</span>}
                                </td>
                                <td style={{ padding: '8px' }}>{u.id}</td>
                                <td style={{ padding: '8px', color: '#94a3b8' }}>{u.pw}</td>
                                <td style={{ padding: '8px', textAlign: 'center', display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                    {/* Approval Button for Teachers */}
                                    {u.role === 'teacher' && u.approved === false && (
                                        <button onClick={() => {
                                            const updated = users.map(user => user.id === u.id ? { ...user, approved: true } : user);
                                            setUsers(updated);
                                            setIsDirty(true);
                                        }} style={{ padding: '4px 8px', background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>승인</button>
                                    )}

                                    {u.role !== 'admin' && (
                                        <>
                                            <button onClick={() => { onSimulateLogin(u); onClose(); }} style={{ padding: '4px 8px', background: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>접속</button>
                                            <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '4px 8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>삭제</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isDirty && (
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleSave} style={{ padding: '10px 20px', background: themeColor, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        변경사항 저장하기
                    </button>
                </div>
            )}
        </div>
    );
};

// [NEW] Settings Modal
const SettingsModal = ({ isOpen, onClose, onUpload, onRefresh, onSimulateLogin, adminPassword, user }) => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'users'

    // Password Change State
    const [newMp, setNewMp] = useState('');
    const [isChangingPw, setIsChangingPw] = useState(false);

    // [NEW] Admin Account Management State
    const [newAdminId, setNewAdminId] = useState('');
    const [adminAuthPw, setAdminAuthPw] = useState(''); // Pw for ID change
    const [adminPwOld, setAdminPwOld] = useState('');
    const [adminPwNew, setAdminPwNew] = useState('');

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setIsAuthenticated(false);
            setIsChangingPw(false);
            setNewMp('');
            setActiveTab('general');
        }
    }, [isOpen]);

    // [NEW] Change Password Modal Logic (For User) - This component handles settings password.
    // We need a separate UserChangePasswordModal for the actual logged-in user.
    // BUT the prompt says "Student login -> personal password change".
    // "Teacher login -> register via signup".
    // This SettingsModal is for ADMIN only (global settings).

    const getSettingsPw = () => localStorage.getItem('orzo_settings_pw') || 'orzoai';

    const handleLogin = () => {
        const currentPw = getSettingsPw();
        if (password === currentPw) {
            setIsAuthenticated(true);
        } else {
            alert('비밀번호가 일치하지 않습니다.');
        }
    };

    const handleChangePassword = () => {
        if (!newMp.trim()) {
            alert('새 비밀번호를 입력해주세요.');
            return;
        }
        localStorage.setItem('orzo_settings_pw', newMp);
        alert('비밀번호가 변경되었습니다. 다음 진입 시 변경된 비밀번호를 사용하세요.');
        setNewMp('');
        setIsChangingPw(false);
    };

    // [NEW] Admin Account Handlers
    const onChangeAdminId = async () => {
        if (!user || user.role !== 'admin') { alert('관리자만 변경 가능합니다.'); return; }
        if (!newAdminId || !adminAuthPw) { alert('값을 입력해주세요.'); return; }
        if (confirm('아이디를 변경하시겠습니까? 변경 후 재로그인이 필요합니다.')) {
            try {
                const res = await fetch('/api/change-id', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentId: user.id, newId: newAdminId, pw: adminAuthPw })
                });
                const data = await res.json();
                if (data.success) {
                    alert(data.message);
                    window.location.reload();
                } else {
                    alert(data.message);
                }
            } catch (e) { alert('오류가 발생했습니다.'); }
        }
    };

    const onChangeAdminPw = async () => {
        if (!user || user.role !== 'admin') { alert('관리자만 변경 가능합니다.'); return; }
        if (!adminPwOld || !adminPwNew) { alert('값을 입력해주세요.'); return; }
        try {
            const res = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: user.id, oldPw: adminPwOld, newPw: adminPwNew })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                setAdminPwOld('');
                setAdminPwNew('');
            } else {
                alert(data.message);
            }
        } catch (e) { alert('오류가 발생했습니다.'); }
    };

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        // We use the SYSTEM password ('orzoai') for the actual server upload
        // since the user has defined the 'settings' password to be potentially different.
        // If the server requires 'orzoai', we must send that.
        // The user is already authenticated to be in this menu.
        onUpload(e, 'orzoai');
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'white', borderRadius: '24px', width: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                <div style={{ padding: '20px 25px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: THEME.primary, margin: 0 }}>관리자 설정</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
                </div>

                {!isAuthenticated ? (
                    <div style={{ padding: '40px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px', color: THEME.secondary }}>
                            <div style={{ marginBottom: '10px' }}><Settings size={48} color={THEME.accent} /></div>
                            관리자 권한이 필요합니다.
                        </div>
                        <input
                            type="password"
                            placeholder="설정 비밀번호 입력"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${THEME.border}`, outline: 'none', fontSize: '1rem', width: '100%', boxSizing: 'border-box', marginBottom: '15px' }}
                        />
                        <button onClick={handleLogin} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: THEME.primary, color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
                            확인
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', borderBottom: `1px solid ${THEME.border}` }}>
                            <button
                                onClick={() => setActiveTab('general')}
                                style={{ flex: 1, padding: '15px', background: activeTab === 'general' ? 'white' : '#f1f5f9', border: 'none', borderBottom: activeTab === 'general' ? `2px solid ${THEME.accent}` : 'none', fontWeight: '700', color: activeTab === 'general' ? THEME.primary : '#94a3b8', cursor: 'pointer' }}
                            >
                                일반 설정
                            </button>
                            <button
                                onClick={() => setActiveTab('users')}
                                style={{ flex: 1, padding: '15px', background: activeTab === 'users' ? 'white' : '#f1f5f9', border: 'none', borderBottom: activeTab === 'users' ? `2px solid ${THEME.accent}` : 'none', fontWeight: '700', color: activeTab === 'users' ? THEME.primary : '#94a3b8', cursor: 'pointer' }}
                            >
                                사용자 및 권한 관리
                            </button>
                        </div>

                        <div style={{ padding: '25px', overflowY: 'auto' }}>
                            {activeTab === 'general' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase' }}>데이터 갱신</h3>
                                        <button onClick={handleUploadClick} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: `1px solid ${THEME.border}`, background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', gap: '12px', fontWeight: '600', color: THEME.primary, transition: 'all 0.2s' }}>
                                            <FolderOpen size={20} color={THEME.accent} />
                                            데이터 폴더 업로드
                                        </button>
                                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept=".csv, .xlsx, .xls" webkitdirectory="" directory="" multiple />
                                    </div>

                                    <div>
                                        <h3 style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase' }}>시스템 제어</h3>
                                        <button onClick={onRefresh} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: `1px solid ${THEME.border}`, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', gap: '12px', fontWeight: '600', color: THEME.danger }}>
                                            <Clock size={20} color={THEME.danger} />
                                            새로고침
                                        </button>
                                    </div>

                                    <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: '20px' }}>
                                        <div onClick={() => setIsChangingPw(!isChangingPw)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: THEME.secondary, fontWeight: '600' }}>
                                            <span>설정 비밀번호 변경</span>
                                            <Settings size={16} />
                                        </div>
                                        {isChangingPw && (
                                            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                                <input type="text" placeholder="새 비밀번호" value={newMp} onChange={e => setNewMp(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${THEME.border}`, outline: 'none' }} />
                                                <button onClick={handleChangePassword} style={{ padding: '10px 15px', borderRadius: '8px', background: THEME.primary, color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer' }}>변경</button>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: '20px' }}>
                                        <h3 style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700', marginBottom: '15px', textTransform: 'uppercase' }}>관리자 접속 계정 관리</h3>

                                        {/* Change ID */}
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ fontSize: '0.9rem', marginBottom: '8px', fontWeight: '600', color: THEME.primary }}>관리자 아이디 변경</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <input type="text" placeholder="새 아이디" value={newAdminId} onChange={e => setNewAdminId(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${THEME.border}` }} />
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input type="password" placeholder="현재 비밀번호 확인" value={adminAuthPw} onChange={e => setAdminAuthPw(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${THEME.border}` }} />
                                                    <button onClick={onChangeAdminId} style={{ padding: '10px 15px', borderRadius: '8px', background: THEME.primary, color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer' }}>변경</button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Change PW */}
                                        <div>
                                            <div style={{ fontSize: '0.9rem', marginBottom: '8px', fontWeight: '600', color: THEME.primary }}>관리자 비밀번호 변경</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <input type="password" placeholder="현재 비밀번호" value={adminPwOld} onChange={e => setAdminPwOld(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${THEME.border}` }} />
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input type="password" placeholder="새 비밀번호" value={adminPwNew} onChange={e => setAdminPwNew(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${THEME.border}` }} />
                                                    <button onClick={onChangeAdminPw} style={{ padding: '10px 15px', borderRadius: '8px', background: THEME.secondary, color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer' }}>변경</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'users' && (
                                <UserManagementPanel
                                    themeColor={THEME.accent}
                                    onSimulateLogin={onSimulateLogin}
                                    onClose={onClose}
                                    adminPassword={adminPassword}
                                    user={user}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// =================================================================================
// [NEW] Mobile & Desktop Separation
// =================================================================================

// 1. DashboardDesktop: The original PC View (Unchanged visually)
const DashboardDesktop = ({
    students, folders, classes,
    selectedFolder, setSelectedFolder,
    selectedClass, setSelectedClass,
    searchQuery, setSearchQuery,
    startDate, setStartDate,
    endDate, setEndDate,
    setRange,
    handleServerUpload,
    // fileInputRef,
    setIsSettingsOpen, // Received logic
    onSwitchMode,
    selectedStudent, setSelectedStudentName,
    showReport, setShowReport,
    reportRecords, setReportRecords,
    user // [NEW] Shared Prop
}) => {
    const isMainAdmin = user?.role === 'admin';
    return (
        <div className="dashboard-container" style={{ display: 'flex', height: '100dvh', background: '#f1f5f9', overflow: 'hidden' }}>
            <div className="sidebar" style={{ width: '280px', background: 'white', borderRight: `1px solid ${THEME.border}`, padding: '25px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '10px' }}>
                    <div style={{ width: '40px', height: '40px', background: THEME.accent, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)' }}><LayoutDashboard color="white" size={24} /></div>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: '800', color: THEME.primary, margin: 0, letterSpacing: '-0.5px' }}>과사람 의대관</h1>
                </div>

                <div style={{ marginBottom: '30px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Search Filter</div>
                    <div style={{ position: 'relative', marginBottom: '15px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
                        <input type="text" placeholder="학생, 반, 과목 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: `1px solid ${THEME.border}`, fontSize: '0.9rem', background: '#f8fafc', outline: 'none', transition: 'all 0.2s' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${THEME.border}`, fontSize: '0.8rem' }} />
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${THEME.border}`, fontSize: '0.8rem' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => setRange(1)} style={{ flex: 1, padding: '6px', fontSize: '0.75rem', background: 'white', border: `1px solid ${THEME.border}`, borderRadius: '4px', cursor: 'pointer', color: THEME.secondary }}>1개월</button>
                        <button onClick={() => setRange(3)} style={{ flex: 1, padding: '6px', fontSize: '0.75rem', background: 'white', border: `1px solid ${THEME.border}`, borderRadius: '4px', cursor: 'pointer', color: THEME.secondary }}>3개월</button>
                        <button onClick={() => setRange(6)} style={{ flex: 1, padding: '6px', fontSize: '0.75rem', background: 'white', border: `1px solid ${THEME.border}`, borderRadius: '4px', cursor: 'pointer', color: THEME.secondary }}>6개월</button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Folders</div>
                    {folders.filter(k => k !== '전체').map(folder => (
                        <button key={folder} onClick={() => { setSelectedFolder(folder); setSelectedClass('전체'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '12px 15px', marginBottom: '6px', borderRadius: '10px', border: 'none', background: selectedFolder === folder ? THEME.accent : 'transparent', color: selectedFolder === folder ? 'white' : THEME.primary, fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}><FolderOpen size={18} /> {folder}</button>
                    ))}
                </div>

                <div style={{ marginTop: 'auto', borderTop: `1px solid ${THEME.border}`, paddingTop: '20px' }}>
                    {isMainAdmin && (
                        <button onClick={() => setIsSettingsOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', borderRadius: '12px', background: 'white', color: THEME.primary, fontWeight: '700', cursor: 'pointer', marginBottom: '10px', border: `1px solid ${THEME.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <Settings size={18} /> 설정 및 관리
                        </button>
                    )}
                    <button onClick={() => { setSelectedFolder('전체'); setSelectedClass('전체'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', borderRadius: '12px', background: THEME.primary, color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}><LayoutDashboard size={18} /> 전체 보기</button>
                </div>
            </div>

            <div className="content-area" style={{ flex: 1, padding: '40px 50px', overflowY: 'auto', height: '100%' }}>

                <div style={{ marginBottom: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${THEME.border}`, paddingBottom: '20px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold', color: THEME.accent, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}><TrendingUp size={20} /> Learning Analytics</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: THEME.primary, letterSpacing: '-1px', lineHeight: 1 }}>오르조 학습 분석 모니터</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* [NEW] Change Password Button (Desktop) */}
                        <ChangePasswordButton user={user} />
                        <button onClick={onSwitchMode} style={{ padding: '10px 20px', background: THEME.secondary, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>실시간 모드 전환</button>
                        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '2rem', fontWeight: '800', color: THEME.primary }}>{students.length}</div><div style={{ fontSize: '0.9rem', color: THEME.secondary, fontWeight: '600' }}>Students</div></div>
                    </div>
                </div>

                <div style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button onClick={() => setSelectedClass('전체')} style={{ padding: '8px 16px', borderRadius: '20px', border: selectedClass === '전체' ? `1px solid ${THEME.accent}` : `1px solid ${THEME.border}`, cursor: 'pointer', fontWeight: '600', background: selectedClass === '전체' ? THEME.accent : 'white', color: selectedClass === '전체' ? 'white' : THEME.secondary, fontSize: '0.9rem', transition: 'all 0.2s' }}>전체 반</button>
                        {classes.filter(c => c !== '전체').map(cls => (
                            <button key={cls} onClick={() => setSelectedClass(cls)} style={{ padding: '8px 16px', borderRadius: '20px', border: selectedClass === cls ? `1px solid ${THEME.accent}` : `1px solid ${THEME.border}`, cursor: 'pointer', fontWeight: '600', background: selectedClass === cls ? THEME.accent : 'white', color: selectedClass === cls ? 'white' : THEME.secondary, fontSize: '0.9rem', transition: 'all 0.2s' }}>{cls}</button>
                        ))}
                    </div>
                </div>

                <div className="student-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '20px' }}>
                    {students.map(student => (
                        <div key={student.name} onClick={() => setSelectedStudentName(student.name)} style={{ background: 'white', padding: '25px', borderRadius: '20px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: `1px solid ${THEME.border}`, transition: 'all 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div><div style={{ fontSize: '0.8rem', color: THEME.secondary, marginBottom: '4px', fontWeight: '600' }}>{student.className}</div><h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: THEME.primary, margin: 0 }}>{student.name}</h2></div>
                                <div style={{ background: student.avgScore >= 90 ? '#ecfdf5' : '#f8fafc', padding: '5px 10px', borderRadius: '8px', color: student.avgScore >= 90 ? THEME.success : THEME.primary, fontWeight: '800', fontSize: '1.1rem' }}>{student.avgScore}점</div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {student.courseList.filter(c => c !== '전체').slice(0, 3).map((course, idx) => {
                                    const style = getCourseBadgeStyle(course);
                                    return <span key={idx} style={{ fontSize: style.fontSize, padding: style.padding, borderRadius: style.borderRadius, fontWeight: style.fontWeight, background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>{course}</span>;
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedStudent && (
                <StudentDetailView
                    student={selectedStudent}
                    onClose={() => { setSelectedStudentName(null); setShowReport(false); setReportRecords([]); }}
                    onOpenReport={(records) => { setReportRecords(records); setShowReport(true); }}
                    isMobile={false}
                    showReportButton={user?.role !== 'student'} // [NEW] Hide for students
                />
            )}

            {selectedStudent && showReport && (
                <ReportModal
                    selectedStudent={selectedStudent}
                    records={reportRecords || []}
                    onClose={() => setShowReport(false)}
                />
            )}
        </div>
    );
};

// 2. DashboardMobile: The PREMIUM Mobile-First View
const DashboardMobile = ({
    students, folders, classes,
    selectedFolder, setSelectedFolder,
    selectedClass, setSelectedClass,
    searchQuery, setSearchQuery,
    startDate, setStartDate,
    endDate, setEndDate,
    setRange,
    handleServerUpload,
    fileInputRef,
    selectedStudent, setSelectedStudentName,
    showReport, setShowReport,
    reportRecords, setReportRecords,
    user // [NEW] Shared Prop
}) => {
    // Mobile Tab State
    const actionTab = useState('home'); // home, search, menu
    const isMainAdmin = user?.role === 'admin';
    const [activeTab, setActiveTab] = useState('home'); // home, search, menu

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
            {/* 1. Header (Sticky) */}
            <div style={{ height: '60px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${THEME.border}`, padding: '0 20px', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: THEME.primary }}>과사람 의대관</div>
            </div>

            {/* 2. Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '90px' /* Space for Bottom Nav */ }}>

                {/* TAB: SEARCH / FILTER */}
                {activeTab === 'search' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s eased' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>검색</div>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
                                <input
                                    type="text"
                                    placeholder="학생 이름 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ width: '100%', padding: '14px 12px 14px 40px', borderRadius: '12px', border: `1px solid ${THEME.border}`, fontSize: '1rem', background: 'white', outline: 'none' }}
                                />
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>반 선택</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <button
                                    onClick={() => setSelectedClass('전체')}
                                    style={{ padding: '10px 16px', borderRadius: '12px', border: selectedClass === '전체' ? `1px solid ${THEME.accent}` : `1px solid ${THEME.border}`, background: selectedClass === '전체' ? THEME.accent : 'white', color: selectedClass === '전체' ? 'white' : THEME.secondary, fontSize: '0.9rem', fontWeight: '600' }}
                                >전체</button>
                                {classes.filter(c => c !== '전체').map(cls => (
                                    <button
                                        key={cls}
                                        onClick={() => setSelectedClass(cls)}
                                        style={{ padding: '10px 16px', borderRadius: '12px', border: selectedClass === cls ? `1px solid ${THEME.accent}` : `1px solid ${THEME.border}`, background: selectedClass === cls ? THEME.accent : 'white', color: selectedClass === cls ? 'white' : THEME.secondary, fontSize: '0.9rem', fontWeight: '600' }}
                                    >{cls}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: HOME (Student Grid) */}
                {(activeTab === 'home' || activeTab === 'search') && (
                    <div style={{ marginTop: activeTab === 'search' ? '20px' : '0' }}>
                        {activeTab === 'home' && (
                            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: THEME.primary }}>학생 목록 <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: '500' }}>({students.length})</span></h2>
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: '15px' }}>
                            {students.map(student => (
                                <div key={student.name} onClick={() => setSelectedStudentName(student.name)} style={{ background: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${THEME.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.03)', active: { transform: 'scale(0.98)' } }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: THEME.secondary, marginBottom: '2px' }}>{student.className}</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: THEME.primary }}>{student.name}</div>
                                        </div>
                                        <div style={{ background: student.avgScore >= 90 ? '#ecfdf5' : '#f8fafc', padding: '6px 12px', borderRadius: '10px', color: student.avgScore >= 90 ? THEME.success : THEME.primary, fontWeight: '800', fontSize: '1rem' }}>
                                            {student.avgScore}
                                        </div>
                                    </div>
                                    <div style={{ height: '1px', background: '#f1f5f9', width: '100%', marginBottom: '12px' }}></div>
                                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                        {student.courseList.slice(0, 4).map((c, i) => (
                                            <span key={i} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b' }}>{c}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB: MENU / SETTINGS */}
                {activeTab === 'menu' && (
                    <div style={{ animation: 'fadeIn 0.2s eased' }}>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 20px 0', color: THEME.primary }}>메뉴</h2>

                        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${THEME.border}` }}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleServerUpload}
                                accept=".csv, .xlsx, .xls"
                                webkitdirectory="" directory="" multiple
                            />
                            <div onClick={() => fileInputRef.current.click()} style={{ padding: '16px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', fontWeight: '600' }}>
                                <FolderOpen size={20} color={THEME.primary} />
                                데이터 폴더 업로드
                            </div>
                            <div onClick={() => { if (window.confirm('새로고침 하시겠습니까?')) window.location.reload(); }} style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', fontWeight: '600' }}>
                                <Clock size={20} color={THEME.primary} />
                                앱 새로고침
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', padding: '15px', background: '#f1f5f9', borderRadius: '12px', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
                            모바일 모드에서는 일부 관리자 기능이 제한될 수 있습니다. 전체 기능을 사용하려면 PC에서 접속해주세요.
                        </div>

                        {/* [NEW] Password Change for Mobile (Everyone) */}
                        <div style={{ marginTop: '20px' }}>
                            <ChangePasswordButton user={user} />
                        </div>

                        {/* [NEW] Settings Button only for Admin */}
                        {isMainAdmin && (
                            <div onClick={() => setIsSettingsOpen(true)} style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', fontWeight: '600', color: THEME.primary, cursor: 'pointer', borderTop: `1px solid ${THEME.border}` }}>
                                <Settings size={20} color={THEME.primary} />
                                관리자 설정
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 3. Bottom Navigation Bar */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, width: '100%', height: '80px', background: 'white',
                borderTop: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start',
                paddingTop: '12px', zIndex: 100, boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.02)'
            }}>
                <div onClick={() => setActiveTab('home')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '60px' }}>
                    <LayoutDashboard size={24} color={activeTab === 'home' ? THEME.accent : '#94a3b8'} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: activeTab === 'home' ? THEME.accent : '#94a3b8' }}>홈</span>
                </div>
                <div onClick={() => setActiveTab('search')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '60px' }}>
                    <Search size={24} color={activeTab === 'search' ? THEME.accent : '#94a3b8'} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: activeTab === 'search' ? THEME.accent : '#94a3b8' }}>검색</span>
                </div>
                <div onClick={() => setActiveTab('menu')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '60px' }}>
                    <Settings size={24} color={activeTab === 'menu' ? THEME.accent : '#94a3b8'} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: activeTab === 'menu' ? THEME.accent : '#94a3b8' }}>메뉴</span>
                </div>
            </div>

            {/* Mobile Student Detail Modal (Full Screen) */}
            {selectedStudent && (
                <div style={{ position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 200, display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out' }}>
                    <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
                    <StudentDetailView
                        student={selectedStudent}
                        onClose={() => { setSelectedStudentName(null); setReportRecords([]); }}
                        onOpenReport={(records) => { setReportRecords(records); setShowReport(true); }}
                        isMobile={true}
                        showReportButton={user?.role !== 'student'} // [NEW] Hide for students
                    />
                </div>
            )}
            {selectedStudent && showReport && (
                <ReportModal
                    selectedStudent={selectedStudent}
                    records={reportRecords || []}
                    onClose={() => setShowReport(false)}
                />
            )}
        </div>
    );
};


// 3. DashboardContainer (Formerly DashboardView)
const DashboardView = ({ processedData, onSwitchMode, onSimulateLogin, adminPassword, user }) => {
    // ---- STATE ----
    const [selectedStudentName, setSelectedStudentName] = useState(null);
    const [selectedFolder, setSelectedFolder] = useState('전체');
    const [selectedClass, setSelectedClass] = useState('전체');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showReport, setShowReport] = useState(false);
    const [reportRecords, setReportRecords] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); // [NEW] Settings Modal State
    const fileInputRef = useRef(null);

    // ---- MOBILE CHECK ----
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ---- LOGIC (Copied from original) ----
    const handleServerUpload = async (e, passwordOverride = null) => {
        // ... (Original Upload Logic) ...
        const files = e.target.files;
        if (!files || files.length === 0) return;

        let pw = passwordOverride;
        if (!pw) {
            pw = prompt("관리자 비밀번호를 입력하세요 (기본: orzoai)");
        }

        if (pw !== "orzoai") { alert("비밀번호가 올바르지 않습니다."); e.target.value = ''; return; }
        const formData = new FormData();
        Array.from(files).forEach(file => {
            const rawPath = file.webkitRelativePath || file.name;
            const uploadName = rawPath.replace(/\//g, '__ORD__').replace(/\\/g, '__ORD__');
            formData.append('files', file, uploadName);
        });
        const firstFile = Array.from(files)[0];
        const debugName = (firstFile.webkitRelativePath || firstFile.name).replace(/\//g, '__ORD__').replace(/\\/g, '__ORD__');
        try {
            const res = await fetch('/api/upload', { method: 'POST', headers: { 'x-admin-password': pw }, body: formData });
            const data = await res.json();
            if (data.success) {
                alert(`업로드 성공! (${data.count}개 파일)`);
                if (window.location.reload) setTimeout(() => window.location.reload(), 2000);
            } else { alert("업로드 실패: " + data.message); }
        } catch (err) { console.error(err); alert("업로드 중 오류가 발생했습니다."); }
        e.target.value = '';
    };

    const setRange = (months) => {
        const d = new Date();
        d.setMonth(d.getMonth() - months);
        setStartDate(d.toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
    };

    const dateInitialized = useRef(false);
    useEffect(() => {
        if (!dateInitialized.current && processedData && processedData.length > 0) {
            const sorted = [...processedData].sort((a, b) => a.dateObj - b.dateObj);
            const today = new Date();
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(today.getMonth() - 1);
            const earliestDateObj = sorted[0].dateObj;
            const startDateObj = earliestDateObj > oneMonthAgo ? earliestDateObj : oneMonthAgo;
            const y = startDateObj.getFullYear();
            const m = String(startDateObj.getMonth() + 1).padStart(2, '0');
            const d = String(startDateObj.getDate()).padStart(2, '0');
            setStartDate(`${y}-${m}-${d}`);
            const endY = today.getFullYear();
            const endM = String(today.getMonth() + 1).padStart(2, '0');
            const endD = String(today.getDate()).padStart(2, '0');
            setEndDate(`${endY}-${endM}-${endD}`);
            dateInitialized.current = true;
        }
    }, [processedData]);

    const filtered = useMemo(() => {
        if (!processedData) return [];
        return processedData.filter(d => {
            const matchFolder = selectedFolder === '전체' || d.folder === selectedFolder;
            const matchClass = selectedClass === '전체' || d.className === selectedClass;
            const searchLower = searchQuery.toLowerCase();
            let matchSearch = d.name.toLowerCase().includes(searchLower) || d.className.toLowerCase().includes(searchLower);
            if (!matchSearch) {
                matchSearch = (d.title && d.title.toLowerCase().includes(searchLower)) ||
                    (d.course && d.course.toLowerCase().includes(searchLower));
            }
            let matchDate = true;
            if (startDate && d.dateStr < startDate) matchDate = false;
            return matchFolder && matchClass && matchSearch && matchDate;
        });
    }, [processedData, selectedFolder, selectedClass, searchQuery, startDate, endDate]);

    const students = useMemo(() => {
        const map = {};
        filtered.forEach(item => {
            if (!map[item.name]) {
                map[item.name] = {
                    name: item.name, className: item.className, folder: item.folder,
                    records: [], courseList: [], avgScore: 0
                };
            }
            map[item.name].records.push(item);
        });
        Object.values(map).forEach(s => {
            s.records.sort((a, b) => b.dateObj - a.dateObj);
            s.courseList = [...new Set(s.records.map(r => r.course))];
            const sum = s.records.reduce((acc, r) => acc + r.score, 0);
            s.avgScore = s.records.length > 0 ? Math.round(sum / s.records.length) : 0;
        });
        return Object.values(map).sort((a, b) => b.avgScore - a.avgScore);
    }, [filtered]);

    const folders = useMemo(() => ['전체', ...new Set(processedData ? processedData.map(d => d.folder) : [])], [processedData]);
    const classes = useMemo(() => ['전체', ...new Set(processedData ? processedData.map(d => d.className) : [])], [processedData]);

    const selectedStudent = useMemo(() => {
        if (!selectedStudentName) return null;
        return students.find(s => s.name === selectedStudentName);
    }, [selectedStudentName, students]);

    // [NEW] Auto-Select Student if Role is Student
    useEffect(() => {
        if (user && user.role === 'student' && students.length > 0 && !selectedStudentName) {
            // Check if name matches (extra safety) or just take the first one since API filters for them
            // The API returns data matching the student's name.
            setSelectedStudentName(students[0].name);
        }
    }, [user, students, selectedStudentName]);

    // ---- PROPS PACKAGE ----
    const sharedProps = {
        students, folders, classes,
        selectedFolder, setSelectedFolder,
        selectedClass, setSelectedClass,
        searchQuery, setSearchQuery,
        startDate, setStartDate,
        endDate, setEndDate,
        setRange,
        handleServerUpload,
        fileInputRef,
        setIsSettingsOpen, // [NEW] Pass this down
        onSwitchMode,
        selectedStudent, setSelectedStudentName,
        showReport, setShowReport,
        selectedStudent, setSelectedStudentName,
        showReport, setShowReport,
        reportRecords, setReportRecords, // [FIX] Added setter
        user // [NEW] Shared Prop
    };

    // [NEW] Loading State for Student Auto-Select
    if (user && user.role === 'student' && !selectedStudentName) {
        // If data is fully loaded but empty for this student
        if (processedData && processedData.length > 0 && students.length === 0) {
            return (
                <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ fontSize: '1.2rem', color: THEME.secondary, fontWeight: '700' }}>표시할 학습 데이터가 없습니다.</div>
                    <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', borderRadius: '8px', background: THEME.primary, color: 'white', border: 'none', cursor: 'pointer' }}>새로고침</button>
                    <button onClick={() => { sessionStorage.clear(); window.location.reload(); }} style={{ padding: '10px 20px', borderRadius: '8px', background: '#e2e8f0', color: THEME.secondary, border: 'none', cursor: 'pointer' }}>로그아웃</button>
                </div>
            );
        }

        // Otherwise show loading (waiting for auto-select or data fetch)
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: `4px solid ${THEME.primary}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <div style={{ color: THEME.secondary, fontWeight: '600' }}>데이터 분석 중입니다...</div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <>
            {isMobile ? (
                <DashboardMobile {...sharedProps} />
            ) : (
                <DashboardDesktop {...sharedProps} />
            )}

            {/* Global Settings Modal */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onUpload={handleServerUpload}
                onRefresh={() => window.location.reload()}
                onSimulateLogin={onSimulateLogin} // [NEW] Pass through
                adminPassword={adminPassword}
                user={user} // [NEW] Pass user for ID/PW Change logic
            />
        </>
    );
};


const Dashboard = ({ data }) => {
    // [UI] Splash Screen State
    const [showSplash, setShowSplash] = useState(true); // [REVERT] Show Splash First
    // [PERF] Deferred Rendering State
    const [isAppLoaded, setIsAppLoaded] = useState(false); // [REVERT]


    // [AUTH]
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authPassword, setAuthPassword] = useState('');

    useEffect(() => {
        const stored = sessionStorage.getItem('orzo_auth_pw');
        if (stored) {
            setAuthPassword(stored);
            setIsAuthenticated(true);
        }
    }, []);

    const [mode, setMode] = useState('dashboard');
    const [internalData, setInternalData] = useState([]);
    const [debugStatus, setDebugStatus] = useState('서버 연결 시도 중...');
    const [debugCount, setDebugCount] = useState(0);
    const serverFileInputRef = useRef(null);

    // Moved handleServerUpload logic to top-level or reuse
    // To keep simple, we can just use the handleServerUpload from DashboardView if props passed,
    // OR duplicate the logic here for the empty state.
    // For simplicity and context access, reusing direct updated logic here:
    const handleEmptyStateUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const pw = prompt("관리자 비밀번호를 입력하세요 (기본: orzoai)");
        if (pw !== "orzoai") {
            alert("비밀번호가 올바르지 않습니다.");
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        Array.from(files).forEach(file => {
            // [IMPORTANT] Encode path separators to '__ORD__' to survive proxy path stripping
            const rawPath = file.webkitRelativePath || file.name;
            const uploadName = rawPath.replace(/\//g, '__ORD__').replace(/\\/g, '__ORD__');
            formData.append('files', file, uploadName);
        });

        // [DEBUG]
        const firstFile = Array.from(files)[0];
        const debugName = (firstFile.webkitRelativePath || firstFile.name).replace(/\//g, '__ORD__').replace(/\\/g, '__ORD__');

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'x-admin-password': pw },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                alert(`업로드 성공! (${data.count}개 파일) 데이터가 곧 갱신됩니다.\n첫 번째 파일 경로: ${debugName}`);
                if (window.location.reload) setTimeout(() => window.location.reload(), 2000);
            } else {
                alert("업로드 실패: " + data.message);
            }
        } catch (err) {
            console.error(err);
            alert("업로드 중 오류가 발생했습니다.");
        }
        e.target.value = '';
    };

    const effectiveData = useMemo(() => {
        if (data && data.length > 0) return data;
        return internalData;
    }, [data, internalData]);

    const processedData = useMemo(() => {
        if (!effectiveData || !Array.isArray(effectiveData)) return [];
        return effectiveData.map(item => {
            try {
                const nameKey = Object.keys(item).find(k => k.includes('이름') || k.includes('Name'));
                const name = nameKey ? item[nameKey] : (item.sourceFile?.split('_')[0] || '이름없음');

                let dateVal = findValue(item, ['날짜', 'Date', 'Time', '일시', '일자']);
                let dateInfo = parseDateSafe(dateVal);

                if (!dateInfo.isValid) {
                    const allValues = Object.values(item);
                    for (const v of allValues) {
                        const check = parseDateSafe(v);
                        if (check.isValid) {
                            dateInfo = check;
                            break;
                        }
                    }
                }

                const rawTitle = findValue(item, ['제목', 'Title', '단원']) || '과제';

                let className = '공통반';
                if (item.folderPath && item.folderPath !== '.') {
                    const normalized = item.folderPath.replace(/\\/g, '/');
                    const parts = normalized.split('/').filter(p => p && p !== '.');
                    if (parts.length > 0) {
                        className = parts[parts.length - 1]; // Use deepest folder as class Name
                    }
                } else if (item.sourceFile) {
                    const parts = (item.folderPath || '기타/공통반').replace(/\\/g, '/').split('/').filter(p => p && p !== '.');
                    if (parts.length > 0) className = parts[parts.length - 1];
                }

                const solveVal = findValue(item, ['풀이', '소요', 'Duration']);
                const reviewVal = findValue(item, ['복습', 'Review', '오답']);

                let folder = '기타';
                if (item.folderPath && item.folderPath !== '.') {
                    const normalized = item.folderPath.replace(/\\/g, '/');
                    const parts = normalized.split('/').filter(p => p && p !== '.');
                    if (parts.length > 0) folder = parts[0]; // Top level is folder
                }

                // [SAFETY CHECK] Force default if parsed value is still '.' or empty
                if (className === '.' || className.trim() === '') className = '공통반';
                if (folder === '.' || folder.trim() === '') folder = '기타';

                return {
                    name: String(name).trim(),
                    folder: folder,
                    className: className,
                    title: refineTitle(rawTitle),
                    course: extractCourse(rawTitle),
                    score: getScore(item),
                    status: findValue(item, ['상태', 'Status']) || '-',
                    solveTime: formatTime(solveVal),
                    reviewTime: formatTime(reviewVal),
                    dateObj: dateInfo.obj,
                    dateStr: dateInfo.str,
                    rawItem: item
                };
            } catch (e) {
                return { _error: e.message };
            }
        });
    }, [effectiveData]);

    const validData = useMemo(() => processedData ? processedData.filter(d => d && !d._error) : [], [processedData]);
    const errors = useMemo(() => processedData ? processedData.filter(d => d && d._error) : [], [processedData]);

    const handleFileUpload = (files) => {
        if (!files || files.length === 0) return;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                if (!text) return;
                const firstLine = text.split('\n')[0];
                const separator = firstLine.includes('\t') ? '\t' : ',';
                const rows = text.split('\n').map(row => row.trim()).filter(row => row);
                if (rows.length < 1) return;

                const firstRowCols = rows[0].split(separator).map(c => c.trim());
                const isHeader = ['날짜', 'Date', 'Time', '일시', '이름', 'Name', '제목', 'Title'].some(kw => firstRowCols.some(c => c.includes(kw)));

                let headers = [];
                let startRow = 0;
                if (isHeader) {
                    headers = firstRowCols;
                    startRow = 1;
                } else {
                    headers = ['Title', 'Date', 'Status', 'SolveTime', 'ReviewTime', 'Unk1', 'Score', 'Unk2'];
                    startRow = 0;
                }

                const parsedRows = [];
                for (let i = startRow; i < rows.length; i++) {
                    const cols = rows[i].split(separator).map(c => c.trim());
                    if (cols.length < 2) continue;
                    const obj = { sourceFile: file.name, folderPath: file.webkitRelativePath || '' };
                    headers.forEach((h, idx) => { if (idx < cols.length) obj[h] = cols[idx]; });
                    parsedRows.push(obj);
                }
                if (parsedRows.length > 0) setInternalData(prev => [...prev, ...parsedRows]);
            };
            reader.readAsText(file);
        });
    };

    const handleLoadDemo = () => {
        if (typeof MOCK_DATA !== 'undefined') setInternalData(MOCK_DATA);
        else alert("데모 데이터가 없습니다.");
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setInternalData([]);
        handleFileUpload(e.dataTransfer.files);
    };
    const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };


    // [UPDATED] Auth State
    const [user, setUser] = useState(null); // { id, name, role }
    // [NEW] Admin Simulation Mode State
    const [isAdminSimulation, setIsAdminSimulation] = useState(false);

    useEffect(() => {
        // [FIX] Check session storage for complex user object or legacy password
        const storedUser = sessionStorage.getItem('orzo_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
                setIsAuthenticated(true);
            } catch (e) { sessionStorage.removeItem('orzo_user'); }
        } else {
            // Legacy Support (remove in future?)
            const legacyPw = sessionStorage.getItem('orzo_auth_pw');
            if (legacyPw) {
                // Determine if it was likely admin? Just assume admin for legacy
                if (legacyPw === 'orzoai') {
                    setUser({ id: 'admin', name: '관리자', role: 'admin' });
                    setAuthPassword(legacyPw);
                    setIsAuthenticated(true);
                }
            }
        }
    }, [isAuthenticated]); // Rerun if authed changes (e.g. logout)

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const fetchWithStrategy = async (url, strategyName) => {
            try {
                // [UPDATED] Send different headers based on role
                const headers = {};
                // If we are simulating, we still need to fetch data.
                // However, the backend /api/data filters by header.
                // If we are simulating 'student', we should send student header so backend returns filtered data.
                // But wait, if backend sees 'student' header, it filters.
                // If we are admin simulating, we effectively ARE that student for data purposes.

                if (user.role === 'admin' && user.id === 'admin') {
                    // Legacy Global Admin
                    headers['x-admin-password'] = authPassword || 'orzoai';
                } else {
                    // [NEW] Unified logic for Student AND Multi-Admin
                    // Both send ID/PW. Server decides based on role.
                    headers['x-user-id'] = encodeURIComponent(user.id);
                    headers['x-user-pw'] = encodeURIComponent(user.pw);
                }

                // [Special Case] If Admin Simulation, we might be a student role in 'user' state,
                // BUT we don't have that student's password in 'user.pw' if we just switched state?
                // Actually we pass the whole user object in onSimulateLogin, which comes from /api/users, so it HAS the password.
                // So the above logic holds!

                const response = await fetch(url, { headers });

                if (response.status === 401) {
                    console.warn(`[Auth] 401 Unauthorized from ${strategyName}`);

                    // [IMPORTANT] Check if it's an approval error message
                    try {
                        const errClone = response.clone();
                        const errJson = await errClone.json();
                        if (errJson.message && errJson.message.includes('승인 대기')) {
                            alert(errJson.message);
                            setIsAuthenticated(false);
                            return true; // Stop trying
                        }
                    } catch (e) { }

                    alert("인증 정보가 만료되었습니다. 다시 로그인해주세요.");
                    sessionStorage.removeItem('orzo_user');
                    sessionStorage.removeItem('orzo_auth_pw');
                    setIsAuthenticated(false);
                    return true;
                }

                if (response.ok) {
                    const text = await response.text();
                    const json = JSON.parse(text);

                    setDebugCount(json ? json.length : 0);
                    if (json && json.length > 0) {
                        setInternalData(json);
                        setDebugStatus(`연결 성공! (${strategyName}, ${json.length}건)`);
                        return true;
                    } else {
                        setDebugStatus(`연결 성공 (${strategyName}, 데이터 0건)`);
                        return true;
                    }
                }
            } catch (e) { }
            return false;
        };

        const fetchData = async () => {
            if (await fetchWithStrategy('/api/data', 'Proxy')) return;
            if (await fetchWithStrategy('http://localhost:3000/api/data', 'Localhost')) return;
            setDebugStatus('모든 연결 시도 실패. (서버가 켜져 있나요?)');
        };
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, [isAuthenticated, user, authPassword]);

    const handleLogin = async (id, pw) => {
        try {
            // 1. Try Admin Legacy or explicit admin
            // 1. Try Admin Legacy or explicit admin -> REMOVED HARDCODED CHECK
            // if (id === 'admin' && pw === 'orzoai') { ... }

            // 2. Call API for real verification
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, pw })
            });
            const data = await res.json();

            if (data.success) {
                const userInfo = { ...data.user, pw }; // Store PW for data calls (simple token replacement)
                sessionStorage.setItem('orzo_user', JSON.stringify(userInfo));
                setAuthPassword(pw); // [FIX] Ensure auth password is set for data fetching
                setUser(userInfo);
                setIsAuthenticated(true);
            } else {
                alert(data.message || "로그인 실패");
            }
        } catch (e) {
            console.error(e);
            alert("로그인 서버 오류");
        }
    };

    // [NEW] Register Handler
    const onRegister = async (id, pw, name) => {
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, pw, name })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                window.location.reload();
            } else {
                alert(data.message);
            }
        } catch (e) {
            alert("가입 요청 중 오류가 발생했습니다.");
        }
    };

    // [NEW] Simulate Login Handler (Passed to Settings)
    const handleSimulateLogin = (targetUser) => {
        if (!confirm(`${targetUser.name} 학생으로 접속하여 모니터링 하시겠습니까?`)) return;
        setIsAdminSimulation(true);
        setUser(targetUser); // Switch context to student
        // We do NOT save this to sessionStorage so refresh restores admin or logs out safely.
        // Actually, if we refresh, we might want to stay put? But simpler to reset.
    };

    const handleExitSimulation = () => {
        // Restore Admin
        const adminUser = { id: 'admin', name: '관리자', role: 'admin', pw: 'orzoai' }; // Simplification
        // Better: we should have stored original admin user.
        // For now, assuming 'admin'/'orzoai' restoration is enough since we only simulated from admin.
        setUser(adminUser);
        setIsAdminSimulation(false);
        setMode('dashboard'); // Reset view mode
    };

    // [NEW] Report States for Student View
    const [showReport, setShowReport] = useState(false);
    const [reportRecords, setReportRecords] = useState([]);

    // [NEW] Splash Screen Render
    // If showSplash is true, we render it ON TOP of everything.
    // Auth or other logic can still run behind, or we can block it.
    // For visual consistency, we can block the other views or just overlay.
    // Overlay is safer to ensure data loading happens.


    // [PERF] Handle Splash Dismiss
    const handleSplashDismiss = () => {
        setShowSplash(false);
        setIsAppLoaded(true);
    };

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            {showSplash && (
                <SplashScreen onDismiss={handleSplashDismiss} />
            )}

            {/* [PERF] Deferred Rendering: Only render Main App when Splash is gone/going */}
            {(!showSplash || isAppLoaded) && (
                <div style={{
                    width: '100%', height: '100%',
                    opacity: showSplash ? 0 : 1
                }}>
                    {!isAuthenticated ? (
                        <LoginOverlay onLogin={handleLogin} onRegister={onRegister} />
                    ) : (
                        <DashboardView
                            processedData={validData} // Optimized Data
                            onSwitchMode={() => setMode(m => m === 'dashboard' ? 'report' : 'dashboard')}
                            onSimulateLogin={handleSimulateLogin} // [NEW] Use the handler we defined
                            adminPassword={authPassword} // Pass for upload check
                            user={user} // [FIX] Pass user prop
                        />
                    )}
                </div>
            )}
        </div>
    );
};

// [NEW] Independent Password Change Component
const ChangePasswordButton = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [oldPw, setOldPw] = useState('');
    const [newPw, setNewPw] = useState('');

    const handleChange = async () => {
        if (!oldPw || !newPw) { alert('모든 필드를 입력하세요.'); return; }
        try {
            const res = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: user.id, oldPw, newPw })
            });
            const data = await res.json();
            if (data.success) {
                alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
                window.location.reload();
            } else {
                alert(data.message);
            }
        } catch (e) {
            alert('오류가 발생했습니다.');
        }
    };

    return (
        <>
            <button onClick={() => setIsOpen(true)} style={{ padding: '8px 12px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#64748b' }}>
                비밀번호 변경
            </button>
            {isOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '16px', width: '300px' }}>
                        <h3 style={{ margin: '0 0 15px 0' }}>비밀번호 변경</h3>
                        <input type="password" placeholder="현재 비밀번호" value={oldPw} onChange={e => setOldPw(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        <input type="password" placeholder="새 비밀번호" value={newPw} onChange={e => setNewPw(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleChange} style={{ padding: '8px 16px', borderRadius: '8px', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer' }}>변경</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Dashboard;
