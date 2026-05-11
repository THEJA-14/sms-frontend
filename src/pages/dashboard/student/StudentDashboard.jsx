import { useState, useEffect } from 'react';
import { Spin, Badge } from 'antd';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BookOutlined, FileTextOutlined, TrophyOutlined, DollarOutlined,
  ClockCircleOutlined, CalendarOutlined, CheckCircleOutlined, 
  ArrowRightOutlined
} from '@ant-design/icons';
import { getStudentAssignmentHistory, getStudentExamHistory, getStudentReportCards } from '../../../services/assessmentService';
import { getStudentFeeTerms } from '../../../services/feeService';
import { getStudentAttendanceSummary } from '../../../services/attendanceService';
import { getStudentProfile } from '../../../services/studentService';
import dayjs from 'dayjs';
import './StudentDashboard_new.css';

// ─── helpers ─────────────────────────────────────────────── 
const fmtN = (v) => new Intl.NumberFormat('en-US').format(v ?? 0);
const fmtD = (v) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v ?? 0);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/* distribute a total across 7 days with a natural-looking shape */
const weekShape = (total, key) => {
  const w = [0.11, 0.15, 0.17, 0.18, 0.14, 0.12, 0.13];
  return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => ({
    day: d, [key]: Math.round(total * w[i]),
  }));
};

// ─── KPI card ────────────────────────────────────────────── 
const KpiCard = ({ icon, label, value, chips, accent, onClick }) => (
  <button className="sdp-kpi" style={{ '--a': accent }} onClick={onClick}>
    <div className="sdp-kpi__icon">{icon}</div>
    <div className="sdp-kpi__body">
      <span className="sdp-kpi__label">{label}</span>
      <span className="sdp-kpi__value">{value}</span>
      <div className="sdp-kpi__chips">
        {chips.filter(Boolean).map((c, i) => (
          <span key={i} className={`sdp-chip sdp-chip--${c.type}`}>{c.text}</span>
        ))}
      </div>
    </div>
    <ArrowRightOutlined className="sdp-kpi__arrow" />
  </button>
);

// ─── section header ──────────────────────────────────────── 
const Head = ({ title, action, route, onClick }) => (
  <div className="sdp-head">
    <span className="sdp-head__title">{title}</span>
    {action && (
      <button className="sdp-ghost" onClick={onClick}>
        {action} <ArrowRightOutlined style={{ fontSize: 10, marginLeft: 3 }} />
      </button>
    )}
  </div>
);

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('Student');

  const [d, setD] = useState({
    stats: {
      attendance: 0,
      totalAssignments: 0,
      completedAssignments: 0,
      totalExams: 0,
      feeBalance: 0,
    },
    assignments: [],
    testChart: [],
    gradesChart: [],
  });

  const studentId = localStorage.getItem('userId');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [profileRes, assignRes, examRes, reportRes, feeRes, attRes] = await Promise.all([
        getStudentProfile().catch(() => ({ data: {} })),
        getStudentAssignmentHistory(studentId, 1, 10).catch(() => ({ data: { data: [] } })),
        getStudentExamHistory(studentId, 1, 10).catch(() => ({ data: { data: [] } })),
        getStudentReportCards(studentId).catch(() => ({ data: { data: [] } })),
        getStudentFeeTerms({ student_id: studentId }).catch(() => ({ data: { data: [] } })),
        getStudentAttendanceSummary(studentId, 1, 1).catch(() => ({ data: {} })),
      ]);

      setStudentName(profileRes.data?.first_name || 'Student');

      const assignments = assignRes.data?.data || [];
      const exams = examRes.data?.data || [];
      const reports = reportRes.data?.data || [];
      const fees = feeRes.data?.data || [];
      const attendance = attRes.data?.attendance_percentage || 0;

      const completed = assignments.filter(a => a.status === 'Submitted').length;
      const totalFees = fees.reduce((s, f) => s + (f.balance_amount || 0), 0);

      // Test scores chart
      const testChart = exams.slice(0, 6).map((exam, idx) => ({
        day: `Exam ${idx + 1}`,
        score: exam.marks_obtained || 0,
      }));

      // Grades chart
      const gradesChart = reports.length > 0 && reports[0].subjects
        ? reports[0].subjects.slice(0, 5).map(s => ({
            subject: s.subject_name || s.name,
            grade: s.grade_obtained || 0,
          }))
        : [];

      setD({
        stats: {
          attendance: Math.round(attendance),
          totalAssignments: assignRes.data?.total || 0,
          completedAssignments: completed,
          totalExams: examRes.data?.total || 0,
          feeBalance: totalFees,
        },
        assignments: assignments.slice(0, 8),
        testChart,
        gradesChart,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <Spin size="large" />
    </div>
  );

  const tp = { contentStyle: { borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,.06)', fontSize: 13 }, cursor: { stroke: '#F1F5F9' } };

  return (
    <div className="sdp-root">
      {/* ── header ─────────────────────────────────────── */}
      <div className="sdp-topbar">
        <div>
          <h1 className="sdp-title">My Learning Dashboard</h1>
          <p className="sdp-sub">Hi {studentName}! Track your progress and achievements.</p>
        </div>
        <div className="sdp-topbar__r">
          <button className="sdp-btn sdp-btn--o">
            <CalendarOutlined />
            {dayjs().format('MMM DD')} – {dayjs().add(30, 'day').format('MMM DD, YYYY')}
          </button>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────── */}
      <div className="sdp-kpi-row">
        <KpiCard 
          icon={<CalendarOutlined />} 
          label="Attendance" 
          value={`${d.stats.attendance}%`}
          chips={[{ type: d.stats.attendance >= 85 ? 'g' : 'r', text: d.stats.attendance >= 85 ? '✓ Good' : 'Needs improvement' }]}
          accent="#2563EB" 
        />
        <KpiCard 
          icon={<BookOutlined />} 
          label="Assignments" 
          value={fmtN(d.stats.totalAssignments)}
          chips={[{ type: 'g', text: `${d.stats.completedAssignments} completed` }]}
          accent="#0EA5E9" 
        />
        <KpiCard 
          icon={<TrophyOutlined />} 
          label="Total Exams" 
          value={fmtN(d.stats.totalExams)}
          chips={[{ type: 'b', text: 'View Results' }]}
          accent="#8B5CF6" 
        />
        <KpiCard 
          icon={<DollarOutlined />} 
          label="Fee Balance" 
          value={fmtD(d.stats.feeBalance)}
          chips={[{ type: d.stats.feeBalance > 0 ? 'r' : 'g', text: d.stats.feeBalance > 0 ? 'Pending' : 'Clear' }]}
          accent="#10B981" 
        />
      </div>

      {/* ── row A: Test Scores + Grades ────────────── */}
      <div className="sdp-grid sdp-grid--6-4">
        <div className="sdp-card">
          <Head title="Test Score Activity" action="View all" />
          <div className="sdp-legend">
            <span><i className="sdp-dot" style={{ background: '#3B82F6' }} />Score</span>
          </div>
          {d.testChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={d.testChart} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tp} />
                <Area type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2.5} fill="url(#gS)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="sdp-empty">No test data available yet.</p>}
        </div>

        <div className="sdp-card">
          <Head title="Performance Stats" />
          <div className="sdp-att-stats">
            <div className="sdp-att-stat" style={{ '--c': '#2563EB' }}>
              <span className="sdp-att-n">{d.stats.completedAssignments}</span>
              <span className="sdp-att-l">Assignments Done</span>
            </div>
            <div className="sdp-att-stat" style={{ '--c': '#10B981' }}>
              <span className="sdp-att-n">{d.stats.attendance}%</span>
              <span className="sdp-att-l">Attendance</span>
            </div>
            <div className="sdp-att-stat" style={{ '--c': '#F59E0B' }}>
              <span className="sdp-att-n">{d.stats.totalExams}</span>
              <span className="sdp-att-l">Exams Given</span>
            </div>
            <div className="sdp-att-stat" style={{ '--c': '#EF4444' }}>
              <span className="sdp-att-n">{fmtN(d.stats.feeBalance)}</span>
              <span className="sdp-att-l">Fee Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grade by Subject ────────────────────────────── */}
      <div className="sdp-card">
        <Head title="Grade by Subject" action="View Report" />
        <div className="sdp-legend">
          <span><i className="sdp-dot" style={{ background: '#8B5CF6' }} />Grades</span>
        </div>
        {d.gradesChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.gradesChart} margin={{ top: 4, right: 8, left: -24, bottom: 30 }} barCategoryGap="24%">
              <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tp} />
              <Bar dataKey="grade" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="sdp-empty">No grade data available yet.</p>}
      </div>

      {/* ── Assignments Table ────────────────────────────── */}
      {d.assignments.length > 0 && (
        <div className="sdp-card sdp-card--full">
          <Head title="Assignments" action="View all" />
          <div className="sdp-tbl-wrap">
            <table className="sdp-tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Assignment</th>
                  <th>Subject</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Marks</th>
                </tr>
              </thead>
              <tbody>
                {d.assignments.map((a, i) => {
                  const isDone = a.status === 'Submitted';
                  const marks = a.marks_obtained || 0;
                  const total = a.total_marks || 100;
                  return (
                    <tr key={i}>
                      <td className="sdp-td--mute">{i + 1}</td>
                      <td><strong>{a.title}</strong></td>
                      <td>{a.subject_name}</td>
                      <td>{dayjs(a.due_date).format('DD MMM YYYY')}</td>
                      <td>
                        <span className={`sdp-badge ${isDone ? 'sdp-badge--g' : 'sdp-badge--a'}`}>
                          {isDone ? 'Submitted' : 'Pending'}
                        </span>
                      </td>
                      <td className={marks > 0 ? 'sdp-td--g' : 'sdp-td--mute'}>{marks > 0 ? `${marks}/${total}` : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}