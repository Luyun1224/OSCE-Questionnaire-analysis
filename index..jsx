import React, { useState, useMemo, useEffect } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import { 
  ClipboardList, Award, Star, TrendingDown, Loader2, Info, MessageSquare
} from 'lucide-react';

// --- 設定區 ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzZusUTAQU3Xq5056fPrc-Ye-6sfN8Ok-vNhKyds2Wo3Eev_rOEGJQ0VTtfCkYZioE/exec"; 

const QUESTION_MAPPING = {
  Q1: "1. 測驗內容及其難度合宜",
  Q2: "2. 評核表評分項目合宜",
  Q3: "3. 評分說明內容清楚、合宜",
  Q4: "4. 試題指引內容足夠",
  Q5: "5. 測驗時間(8 mins)長短合宜",
  Q6: "6. 試場各項標示、移動路線規劃清楚、合宜",
  Q7: "7. 試場各項鈴聲、廣播清楚、合宜",
  Q8: "8. 試務運作流程順暢、試務人員紀律良好",
};

// --- 樣式常數 (Hex Codes Only) ---
const THEME = {
  primary: '#2563eb',       // blue-600
  primaryLight: '#dbeafe',  // blue-100
  primaryBg: '#eff6ff',     // blue-50
  textMain: '#1f2937',      // gray-800
  textSub: '#6b7280',       // gray-500
  bgMain: '#f8fafc',        // slate-50
  border: '#e5e7eb',        // gray-200
  white: '#ffffff',

  // 分數顏色
  score5: '#3b82f6', score4: '#93c5fd', score3: '#9ca3af', score2: '#fdba74', score1: '#ef4444',

  // 狀態顏色
  success: '#16a34a', successBg: '#f0fdf4',
  danger: '#dc2626', dangerBg: '#fef2f2',
};

const SCORE_COLOR_MAP = {
  5: THEME.score5, 4: THEME.score4, 3: THEME.score3, 2: THEME.score2, 1: THEME.score1
};

const KEYWORDS = [
  { text: "口罩", value: 20, color: '#3b82f6' },
  { text: "手套", value: 15, color: '#ef4444' },
  { text: "X光", value: 18, color: '#f59e0b' },
  { text: "評分表", value: 12, color: '#ef4444' },
  { text: "難度", value: 14, color: '#f97316' },
  { text: "流程順暢", value: 25, color: '#3b82f6' },
  { text: "動線", value: 10, color: '#64748b' },
  { text: "鈴聲", value: 12, color: '#3b82f6' },
  { text: "SP表現", value: 16, color: '#64748b' },
  { text: "時間太短", value: 30, color: '#2563eb' },
  { text: "午餐好吃", value: 8, color: '#9ca3af' },
  { text: "感謝", value: 22, color: '#3b82f6' },
];

// --- 輔助函式 ---
const parseScore = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const parsed = parseFloat(String(val).replace(/[^0-9.]/g, '')); 
  return isNaN(parsed) ? 0 : parsed;
};

// --- UI 元件 (使用純 Inline Style) ---

const StatCard = ({ title, value, subtitle, icon: Icon, color, bg }) => (
  <div style={{
    backgroundColor: THEME.white,
    borderRadius: '0.75rem',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    border: `1px solid ${THEME.border}`,
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flex: '1 1 250px'
  }}>
    <div>
      <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: THEME.textSub, marginBottom: '0.25rem' }}>{title}</h3>
      <div style={{ fontSize: '1.875rem', fontWeight: '700', color: THEME.textMain }}>{value}</div>
      {subtitle && <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: THEME.textSub }}>{subtitle}</div>}
    </div>
    <div style={{ padding: '0.75rem', borderRadius: '9999px', backgroundColor: bg }}>
      <Icon size={24} color={color} />
    </div>
  </div>
);

const WordCloud = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    {KEYWORDS.map((word, idx) => (
      <span 
        key={idx}
        style={{ 
          fontSize: `${12 + word.value * 0.8}px`, 
          color: word.color,
          fontWeight: 'bold',
          opacity: 0.9,
          cursor: 'default'
        }}
      >
        {word.text}
      </span>
    ))}
  </div>
);

const StackedBarRow = ({ label, data, total }) => {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '500', flex: 1, marginRight: '1rem', color: THEME.textMain }}>{label}</h4>
        <span style={{ fontSize: '0.75rem', color: THEME.textSub }}>N={total}</span>
      </div>
      <div style={{ height: '1.5rem', width: '100%', display: 'flex', borderRadius: '9999px', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
        {[5, 4, 3, 2, 1].map((score) => {
          const count = data[score] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          if (percentage === 0) return null;
          return (
            <div
              key={score}
              style={{ width: `${percentage}%`, backgroundColor: SCORE_COLOR_MAP[score], height: '100%' }}
              title={`${score}分: ${count}人 (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>
    </div>
  );
};

// --- 主程式 ---

export default function ExaminerDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDate, setFilterDate] = useState('All');
  const [filterStation, setFilterStation] = useState('All');

  // 讀取資料
  useEffect(() => {
    setLoading(true);
    fetch(GOOGLE_SCRIPT_URL)
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(jsonData => {
        // 修正點：檢查是否為新格式 (包含 .examiner) 或舊格式 (直接是 Array)
        const rawList = jsonData.examiner ? jsonData.examiner : (Array.isArray(jsonData) ? jsonData : []);
        const formattedData = rawList.map(item => ({
          ...item,
          station: parseInt(item.station) || item.station,
          q1: parseScore(item.q1), q2: parseScore(item.q2), q3: parseScore(item.q3),
          q4: parseScore(item.q4), q5: parseScore(item.q5), q6: parseScore(item.q6),
          q7: parseScore(item.q7), q8: parseScore(item.q8),
        }));
        setData(formattedData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setError("無法讀取資料，請確認權限設定。");
        setLoading(false);
      });
  }, []);

  const dates = useMemo(() => ['All', ...new Set(data.map(d => d.date))], [data]);
  const stations = useMemo(() => ['All', ...new Set(data.map(d => d.station))].sort((a, b) => a - b), [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const dateMatch = filterDate === 'All' || item.date === filterDate;
      const stationMatch = filterStation === 'All' || item.station === (filterStation === 'All' ? item.station : parseInt(filterStation));
      return dateMatch && stationMatch;
    });
  }, [data, filterDate, filterStation]);

  const stats = useMemo(() => {
    const totalCount = filteredData.length;
    if (totalCount === 0) return { totalCount: 0, avgSatisfaction: 0, itemsToImprove: 0 };
    
    let totalScoreSum = 0;
    let totalItems = 0;
    filteredData.forEach(item => {
      for(let i=1; i<=8; i++) {
        totalScoreSum += (item[`q${i}`] || 0);
        totalItems++;
      }
    });
    const avgSatisfaction = totalItems ? (totalScoreSum / totalItems).toFixed(1) : 0;

    let itemsToImprove = 0;
    for(let i=1; i<=8; i++) {
      const qSum = filteredData.reduce((acc, cur) => acc + (cur[`q${i}`] || 0), 0);
      const qAvg = totalCount ? (qSum / totalCount) : 0;
      if(qAvg < 3.5) itemsToImprove++;
    }
    return { totalCount, avgSatisfaction, itemsToImprove };
  }, [filteredData]);

  const distributionData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const questions = Object.keys(QUESTION_MAPPING);
    return questions.map(key => {
      const qId = key.toLowerCase();
      const counts = { 1:0, 2:0, 3:0, 4:0, 5:0 };
      filteredData.forEach(item => {
        const score = Math.round(item[qId]);
        if(counts[score] !== undefined) counts[score]++;
      });
      return {
        name: QUESTION_MAPPING[key],
        shortName: key,
        ...counts,
        total: filteredData.length
      };
    });
  }, [filteredData]);

  const radarData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const data = [];
    for(let i=1; i<=8; i++) {
      const key = `q${i}`;
      const sum = filteredData.reduce((acc, curr) => acc + (curr[key] || 0), 0);
      const avg = filteredData.length ? (sum / filteredData.length).toFixed(2) : 0;
      data.push({ subject: `Q${i}`, A: parseFloat(avg), fullMark: 5 });
    }
    return data;
  }, [filteredData]);

  const feedbackQ9 = useMemo(() => filteredData.filter(d => d.q9).map(d => ({...d, text: d.q9})), [filteredData]);
  const feedbackQ10 = useMemo(() => filteredData.filter(d => d.q10).map(d => ({...d, text: d.q10})), [filteredData]);

  // --- 通用輸入框樣式 ---
  const inputStyle = {
    width: '100%',
    backgroundColor: '#f9fafb',
    border: `1px solid ${THEME.border}`,
    color: THEME.textMain,
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    outline: 'none',
    fontSize: '0.875rem'
  };
  const labelStyle = {
    display: 'block', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem', color: THEME.textSub
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: THEME.bgMain, color: THEME.textMain, minHeight: '100vh', paddingBottom: '3rem', boxSizing: 'border-box' }}>
       <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div style={{ backgroundColor: THEME.white, borderBottom: `1px solid ${THEME.border}`, position: 'sticky', top: 0, zIndex: 30, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: THEME.primary, display: 'flex' }}>
               <Award size={20} color="white" />
            </div>
            <div>
                <h1 style={{ fontWeight: '700', fontSize: '1.125rem', lineHeight: '1.2', color: THEME.textMain, margin: 0 }}>考官回饋分析儀表板</h1>
                <p style={{ fontSize: '0.75rem', fontWeight: '500', color: THEME.primary, margin: 0 }}>OSCE 臨床技能測驗</p>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', backgroundColor: '#f9fafb', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: `1px solid ${THEME.border}`, color: THEME.textSub }}>
             獨立部署版 v3.0 (Fix Layout)
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '2rem auto 0', padding: '0 1rem' }}>
        
        {error && (
           <div style={{ backgroundColor: THEME.dangerBg, border: `1px solid ${THEME.danger}`, color: '#b91c1c', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '16rem', color: THEME.textSub }}>
            <Loader2 size={32} style={{ color: THEME.primary, marginBottom: '0.5rem', animation: 'spin 1s linear infinite' }}/>
            <p>正在讀取資料...</p>
          </div>
        ) : data.length === 0 && !error ? (
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '16rem', color: THEME.textSub }}>
            <ClipboardList size={48} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
            <p>目前沒有資料</p>
          </div>
        ) : (
          <>
            {/* Filter Section */}
            <div style={{ backgroundColor: THEME.white, border: `1px solid ${THEME.border}`, borderRadius: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>選擇日期</label>
                  <select style={inputStyle} value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
                    <option value="All">全部日期</option>
                    {dates.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>選擇站號</label>
                  <select style={inputStyle} value={filterStation} onChange={(e) => setFilterStation(e.target.value)}>
                    <option value="All">全部站號</option>
                    {stations.filter(s => s !== 'All').map(s => <option key={s} value={s}>第 {s} 站</option>)}
                  </select>
                </div>
                <div>
                    <label style={labelStyle}>選擇梯次</label>
                    <select style={{...inputStyle, color: '#9ca3af', cursor: 'not-allowed'}} disabled>
                        <option>全部梯次</option>
                    </select>
                </div>
                <div style={{ textAlign: 'right', paddingBottom: '0.5rem' }}>
                     <span style={{ display: 'inline-block', fontSize: '0.875rem', fontWeight: '500', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: THEME.primaryBg, color: THEME.primary }}>
                        共 {stats.totalCount} 份回饋
                    </span>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
              <StatCard title="總回饋筆數" value={stats.totalCount} icon={ClipboardList} color={THEME.primary} bg={THEME.primaryBg} />
              <StatCard title="整體平均滿意度" value={`${stats.avgSatisfaction} / 5`} icon={Star} color={THEME.success} bg={THEME.successBg} />
              <StatCard title="待改進項目 (低於3.5分)" value={stats.itemsToImprove} icon={TrendingDown} color={THEME.danger} bg={THEME.dangerBg} />
            </div>

            {/* Main Charts Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
              
              {/* Left: Stacked Bar Chart */}
              <div style={{ flex: '2 1 500px', backgroundColor: THEME.white, border: `1px solid ${THEME.border}`, borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: `1px solid ${THEME.border}`, paddingBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: THEME.textMain, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ClipboardList size={20} color={THEME.primary} />
                    各項指標回饋分佈
                  </h2>
                  {/* 修復跑版：使用 Flexbox 確保圖例橫向排列 */}
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: THEME.textSub, flexWrap: 'wrap' }}>
                    <div style={{display:'flex', alignItems:'center', gap:'0.25rem'}}><div style={{width:'0.5rem', height:'0.5rem', borderRadius:'50%', backgroundColor:SCORE_COLOR_MAP[5]}}></div>非常同意</div>
                    <div style={{display:'flex', alignItems:'center', gap:'0.25rem'}}><div style={{width:'0.5rem', height:'0.5rem', borderRadius:'50%', backgroundColor:SCORE_COLOR_MAP[4]}}></div>同意</div>
                    <div style={{display:'flex', alignItems:'center', gap:'0.25rem'}}><div style={{width:'0.5rem', height:'0.5rem', borderRadius:'50%', backgroundColor:SCORE_COLOR_MAP[3]}}></div>無意見</div>
                    <div style={{display:'flex', alignItems:'center', gap:'0.25rem'}}><div style={{width:'0.5rem', height:'0.5rem', borderRadius:'50%', backgroundColor:SCORE_COLOR_MAP[2]}}></div>不同意</div>
                    <div style={{display:'flex', alignItems:'center', gap:'0.25rem'}}><div style={{width:'0.5rem', height:'0.5rem', borderRadius:'50%', backgroundColor:SCORE_COLOR_MAP[1]}}></div>非常不同意</div>
                  </div>
                </div>
                
                <div>
                  {distributionData.map((item) => (
                    <StackedBarRow key={item.shortName} label={item.name} data={item} total={item.total} />
                  ))}
                </div>
              </div>

              {/* Right Column: Radar & Word Cloud */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Radar Chart */}
                <div style={{ flex: 1, minHeight: '300px', backgroundColor: THEME.white, border: `1px solid ${THEME.border}`, borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '0.875rem', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center', marginBottom: '0.5rem', color: THEME.textSub }}>整體滿意度雷達圖</h2>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke={THEME.border} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: THEME.primary, fontSize: 11, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                        <Radar name="平均分" dataKey="A" stroke={THEME.primary} strokeWidth={3} fill={THEME.primary} fillOpacity={0.4} />
                        <RechartsTooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Word Cloud */}
                <div style={{ backgroundColor: THEME.white, border: `1px solid ${THEME.border}`, borderRadius: '0.75rem', padding: '1.5rem', minHeight: '200px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: '700', color: THEME.textMain, marginBottom: '0.5rem' }}>關鍵字詞雲 (Q9 & Q10)</h2>
                  <WordCloud />
                </div>

              </div>
            </div>

            {/* Text Feedback Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                
                {/* Q9 Feedback */}
                <div style={{ backgroundColor: THEME.white, borderRadius: '0.75rem', border: `1px solid ${THEME.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '500px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '1rem', borderBottom: `1px solid ${THEME.border}`, backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageSquare size={20} color={THEME.primary} />
                        <h3 style={{ fontWeight: '700', color: THEME.textMain, fontSize: '1.125rem' }}>Q9. 考題建議</h3>
                    </div>
                    <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                        {feedbackQ9.length > 0 ? feedbackQ9.map((item, idx) => (
                            <div key={idx} style={{ paddingBottom: '1rem', marginBottom: '1rem', borderBottom: `1px solid ${THEME.border}` }}>
                                <p style={{ color: THEME.textMain, marginBottom: '0.5rem', lineHeight: '1.5' }}>"{item.text}"</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: THEME.textSub }}>
                                    <span style={{ backgroundColor: THEME.white, border: `1px solid ${THEME.border}`, padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontWeight: '500' }}>{item.examiner}</span>
                                    <span>|</span>
                                    <span>第{item.station}站</span>
                                    <span>|</span>
                                    <span>{item.date}</span>
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: THEME.textSub }}>無文字回饋</div>
                        )}
                    </div>
                </div>

                {/* Q10 Feedback */}
                <div style={{ backgroundColor: THEME.white, borderRadius: '0.75rem', border: `1px solid ${THEME.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '500px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '1rem', borderBottom: `1px solid ${THEME.border}`, backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageSquare size={20} color={THEME.success} />
                        <h3 style={{ fontWeight: '700', color: THEME.textMain, fontSize: '1.125rem' }}>Q10. 整體建議</h3>
                    </div>
                    <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                        {feedbackQ10.length > 0 ? feedbackQ10.map((item, idx) => (
                            <div key={idx} style={{ paddingBottom: '1rem', marginBottom: '1rem', borderBottom: `1px solid ${THEME.border}` }}>
                                <p style={{ color: THEME.textMain, marginBottom: '0.5rem', lineHeight: '1.5' }}>"{item.text}"</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: THEME.textSub }}>
                                    <span style={{ backgroundColor: THEME.white, border: `1px solid ${THEME.border}`, padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontWeight: '500' }}>{item.examiner}</span>
                                    <span>|</span>
                                    <span>第{item.station}站</span>
                                    <span>|</span>
                                    <span>{item.date}</span>
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: THEME.textSub }}>無文字回饋</div>
                        )}
                    </div>
                </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}
