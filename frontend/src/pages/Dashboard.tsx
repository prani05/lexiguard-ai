import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Menu,
  MenuItem,
  Snackbar,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Logout, 
  Shield, 
  Description, 
  Warning, 
  AutoAwesome,
  History,
  TrendingUp,
  Close,
  Payment,
  Gavel,
  ExpandMore,
  ZoomIn,
  ZoomOut,
  Search,
  ChevronLeft,
  ChevronRight,
  QuestionAnswer,
  Info
} from '@mui/icons-material';

interface DocumentSummary {
  id: number;
  filename: string;
  type: string;
  uploadDate: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  riskScore: number | null;
}

interface DashboardStats {
  totalDocuments: number;
  averageRiskScore: number;
  aiCreditsUsed: number;
  recentDocuments: DocumentSummary[];
  riskCategoryCounts: {
    Low: number;
    Medium: number;
    High: number;
    Critical: number;
  };
  geminiConfigured?: boolean;
  geminiModel?: string;
  maxUploadSizeMb?: number;
  jwtSecretConfigured?: boolean;
}

interface ClauseResponse {
  id: number;
  clauseType: string;
  pageNumber: number;
  summary: string;
  riskLevel: string;
  snippet: string;
  confidenceScore?: number;
}

interface RiskResponse {
  id: number;
  category: string;
  severity: string;
  description: string;
  mitigation: string;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

interface ChecklistItem {
  title: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  description: string;
  mitigation: string;
}

// ----------------------------------------------------
// DYNAMIC SVG CHARTS (React 19 Safe, derived from live data)
// ----------------------------------------------------

const SvgDonutChart: React.FC<{ counts: { Low: number; Medium: number; High: number; Critical: number } }> = ({ counts }) => {
  const total = (counts.Low || 0) + (counts.Medium || 0) + (counts.High || 0) + (counts.Critical || 0) || 1;
  const data = [
    { value: counts.Low || 0, color: '#10b981', label: 'Low' },
    { value: counts.Medium || 0, color: '#f59e0b', label: 'Medium' },
    { value: counts.High || 0, color: '#ef4444', label: 'High' },
    { value: counts.Critical || 0, color: '#8b5cf6', label: 'Critical' }
  ];

  let cumulativePercent = 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center', my: 2 }}>
      <svg width="110" height="110" viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
        {data.map((slice, idx) => {
          if (slice.value === 0) return null;
          const percent = (slice.value / total) * 100;
          const dashArray = `${percent} ${100 - percent}`;
          const dashOffset = 100 - cumulativePercent;
          cumulativePercent += percent;
          return (
            <circle
              key={idx}
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={slice.color}
              strokeWidth="4"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          );
        })}
      </svg>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {data.map((slice, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: slice.color }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              {slice.label}: {slice.value} ({Math.round((slice.value / total) * 100)}%)
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const SvgBarChart: React.FC<{ docs: DocumentSummary[] }> = ({ docs }) => {
  const counts: Record<string, number> = {};
  docs.forEach(d => {
    counts[d.type] = (counts[d.type] || 0) + 1;
  });

  const data = Object.entries(counts).map(([type, count]) => ({ type, count }));
  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 1 }}>
      {data.map((item, idx) => {
        const percentage = (item.count / max) * 100;
        return (
          <Box key={idx}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.type}</Typography>
              <Typography variant="caption" color="text.secondary">{item.count} doc(s)</Typography>
            </Box>
            <Box sx={{ width: '100%', height: 8, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 5, overflow: 'hidden' }}>
              <Box 
                sx={{ 
                  width: `${percentage}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)', 
                  borderRadius: 5,
                  transition: 'width 0.8s ease'
                }} 
              />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

const SvgLineChart: React.FC<{ docs: DocumentSummary[] }> = ({ docs }) => {
  // Group real documents by day of week
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  
  docs.forEach(d => {
    const dayIdx = new Date(d.uploadDate).getDay(); // 0 is Sun, 1 is Mon
    const mappedIdx = dayIdx === 0 ? 6 : dayIdx - 1; // Map Sun to 6, Mon to 0
    counts[mappedIdx] = counts[mappedIdx] + 1;
  });

  const max = Math.max(...counts, 1);

  const points = counts.map((c, idx) => {
    const x = 10 + (idx * 80) / 6;
    const y = 90 - (c * 80) / max;
    return `${x},${y}`;
  }).join(' ');

  const pathD = `M ${points}`;
  const areaD = `${pathD} L 90,90 L 10,90 Z`;

  return (
    <Box sx={{ my: 1 }}>
      <svg width="100%" height="90" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        <line x1="0" y1="90" x2="100" y2="90" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <path d={areaD} fill="url(#lineChartGrad)" />
        <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        {counts.map((c, idx) => {
          const x = 10 + (idx * 80) / 6;
          const y = 90 - (c * 80) / max;
          return (
            <circle key={idx} cx={x} cy={y} r="1.5" fill="#ec4899" stroke="#fff" strokeWidth="0.3" />
          );
        })}
      </svg>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, mt: 0.5 }}>
        {days.map((day, idx) => (
          <Typography key={idx} variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>{day}</Typography>
        ))}
      </Box>
    </Box>
  );
};

const ShimmerSkeleton: React.FC = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
    <Box sx={{ width: '80%', height: 16, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, animation: 'pulse 1.5s infinite' }} />
    <Box sx={{ width: '100%', height: 12, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, animation: 'pulse 1.5s infinite' }} />
    <Box sx={{ width: '90%', height: 12, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, animation: 'pulse 1.5s infinite' }} />
    <Box sx={{ width: '40%', height: 12, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, animation: 'pulse 1.5s infinite' }} />
  </Box>
);

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // File Upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadStep, setUploadStep] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const processingTimeline = [
    'Uploading...',
    'Preparing OCR...',
    'OCR Completed',
    'Generating Summary...',
    'Detecting Clauses...',
    'Analyzing Risk...',
    'Generating Report...'
  ];

  // Document Viewer states
  const [selectedDoc, setSelectedDoc] = useState<DocumentSummary | null>(null);
  const [pages, setPages] = useState<{ pageNumber: number; extractedText: string }[]>([]);
  const [report, setReport] = useState<any | null>(null);
  const [clauses, setClauses] = useState<ClauseResponse[]>([]);
  const [risks, setRisks] = useState<RiskResponse[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  
  // PDF page navigation and zoom
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightQuery, setHighlightQuery] = useState<string>('');

  // Notifications Snackbars
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string>('');
  
  // Top Avatar Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // Guidelines config modal
  const [guidelinesOpen, setGuidelinesOpen] = useState<boolean>(false);

  // Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Preferences States
  const [prefGoverningLaw, setPrefGoverningLaw] = useState<string>('');
  const [prefMaxNonCompete, setPrefMaxNonCompete] = useState<string>('');
  const [prefRequireMutual, setPrefRequireMutual] = useState<boolean>(false);
  const [updatingPrefs, setUpdatingPrefs] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<number>(0);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const [exportingReport, setExportingReport] = useState<boolean>(false);

  const triggerNotification = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarOpen(true);
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await API.get('/dashboard/summary');
      if (response.data && response.data.success) {
        setStats(response.data.data);
      } else {
        setError(response.data.message || 'Failed to load stats');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await API.get('/users/me');
      if (response.data && response.data.success) {
        const u = response.data.data;
        setPrefGoverningLaw(u.preferredGoverningLaw || '');
        setPrefMaxNonCompete(u.maxNonCompeteMonths ? String(u.maxNonCompeteMonths) : '');
        setPrefRequireMutual(!!u.requireMutualIndemnity);
      }
    } catch (err) {
      console.error("Failed to load user profile preferences:", err);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchUserProfile();
    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Scroll Q&A bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds maximum allowed limit of 10 MB.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadStep(0);
    setUploadProgress(0);
    setError(null);

    try {
      const uploadRes = await API.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
            if (percent === 100) {
              setUploadStep(1); // Preparing OCR...
            }
          }
        }
      });

      if (uploadRes.data && uploadRes.data.success) {
        const uploadedDoc = uploadRes.data.data;
        setUploadStep(2); // OCR Completed
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUploadStep(3); // Generating Summary...
        
        try {
          await API.post(`/documents/${uploadedDoc.id}/process`);
          setUploadStep(4); // Detecting Clauses...
          await new Promise(resolve => setTimeout(resolve, 1000));
          setUploadStep(5); // Analyzing Risk...
          await new Promise(resolve => setTimeout(resolve, 1000));
          setUploadStep(6); // Generating Report...
        } catch (procErr) {
          console.error("Failed to automatically process document:", procErr);
        }
        
        triggerNotification("Contract audit analysis completed successfully!");
        await fetchDashboardStats();
      } else {
        setError(uploadRes.data.message || 'Failed to upload document');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error occurred uploading file');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadStep(0);
        setUploadProgress(0);
      }, 1500);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleViewDocument = async (doc: DocumentSummary) => {
    setSelectedDoc(doc);
    setPages([]);
    setReport(null);
    setClauses([]);
    setRisks([]);
    setChecklist([]);
    setActiveTab(0);
    setLoadingDetails(true);
    setCurrentPage(1);
    setHighlightQuery('');
    setSearchQuery('');
    
    setChatMessages([
      { sender: 'ai', text: `Hello! I am your LexiGuard contract assistant. Ask me anything about this agreement.` }
    ]);

    try {
      const pagesRes = await API.get(`/documents/${doc.id}/pages`);
      if (pagesRes.data && pagesRes.data.success) {
        setPages(pagesRes.data.data);
      }

      try {
        const reportRes = await API.get(`/documents/${doc.id}/report`);
        if (reportRes.data && reportRes.data.success) {
          setReport(reportRes.data.data);
        }
      } catch (err) {
        console.log("No summary report generated yet for document:", doc.id);
      }

      try {
        const clausesRes = await API.get(`/documents/${doc.id}/clauses`);
        if (clausesRes.data && clausesRes.data.success) {
          setClauses(clausesRes.data.data);
        }
      } catch (err) {
        console.log("No clauses detected yet for document:", doc.id);
      }

      try {
        const risksRes = await API.get(`/documents/${doc.id}/risks`);
        if (risksRes.data && risksRes.data.success) {
          setRisks(risksRes.data.data);
        }
      } catch (err) {
        console.log("No risks found yet for document:", doc.id);
      }

      try {
        const checklistRes = await API.get(`/documents/${doc.id}/checklist`);
        if (checklistRes.data && checklistRes.data.success) {
          setChecklist(checklistRes.data.data);
        }
      } catch (err) {
        console.log("No checklist found yet for document:", doc.id);
      }
    } catch (err: any) {
      console.error("Error loading document info:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedDoc) return;
    setGeneratingReport(true);
    setError(null);
    triggerNotification("Invoking Gemini AI analyzer to review terms...");

    try {
      const response = await API.post(`/documents/${selectedDoc.id}/report`);
      if (response.data && response.data.success) {
        setReport(response.data.data);
        triggerNotification("AI report successfully compiled!");

        try {
          const clausesRes = await API.get(`/documents/${selectedDoc.id}/clauses`);
          if (clausesRes.data && clausesRes.data.success) {
            setClauses(clausesRes.data.data);
          }
        } catch (cErr) {
          console.error("Failed to load clauses after report creation:", cErr);
        }

        try {
          const risksRes = await API.get(`/documents/${selectedDoc.id}/risks`);
          if (risksRes.data && risksRes.data.success) {
            setRisks(risksRes.data.data);
          }
        } catch (rErr) {
          console.error("Failed to load risks after report creation:", rErr);
        }

        try {
          const checklistRes = await API.get(`/documents/${selectedDoc.id}/checklist`);
          if (checklistRes.data && checklistRes.data.success) {
            setChecklist(checklistRes.data.data);
          }
        } catch (chkErr) {
          console.error("Failed to load checklist after report creation:", chkErr);
        }

        fetchDashboardStats();
      } else {
        setError(response.data.message || 'Failed to analyze report');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error executing AI report summary');
    } finally {
      setGeneratingReport(false);
    }
  };

  const submitChatQuestion = async (queryText: string) => {
    if (!queryText.trim() || !selectedDoc || sendingMessage) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text: queryText }]);
    setSendingMessage(true);

    try {
      const response = await API.post(`/documents/${selectedDoc.id}/chat`, { message: queryText });
      if (response.data && response.data.success) {
        setChatMessages((prev) => [...prev, { sender: 'ai', text: response.data.data.answer }]);
      } else {
        setChatMessages((prev) => [...prev, { sender: 'ai', text: "Sorry, I encountered an error retrieving details for this request." }]);
      }
    } catch (err: any) {
      console.error("FAQ Chat Error:", err);
      setChatMessages((prev) => [...prev, { sender: 'ai', text: "I was unable to reach the AI engine. Please check connection and try again." }]);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const query = chatInput.trim();
    setChatInput('');
    await submitChatQuestion(query);
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingPrefs(true);

    try {
      const response = await API.put('/users/preferences', {
        preferredGoverningLaw: prefGoverningLaw,
        maxNonCompeteMonths: prefMaxNonCompete ? parseInt(prefMaxNonCompete) : null,
        requireMutualIndemnity: prefRequireMutual
      });

      if (response.data && response.data.success) {
        triggerNotification("Guidelines updated successfully!");
        setTimeout(() => {
          setGuidelinesOpen(false);
        }, 1500);
      }
    } catch (err: any) {
      console.error("Failed to save preferences:", err);
    } finally {
      setUpdatingPrefs(false);
    }
  };

  const handleExportReport = async () => {
    if (!selectedDoc) return;
    setExportingReport(true);
    try {
      const response = await API.get(`/documents/${selectedDoc.id}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `LexiGuard_Report_${selectedDoc.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      triggerNotification("Report exported successfully!");
    } catch (err: any) {
      console.error("Failed to export report:", err);
      triggerNotification("Failed to export report.");
    } finally {
      setExportingReport(false);
    }
  };

  const getRiskColor = (score: number | null) => {
    if (score === null) return '#9ca3af';
    if (score <= 35) return '#10b981'; 
    if (score <= 65) return '#f59e0b'; 
    return '#ef4444';
  };

  const getRiskLabel = (score: number | null) => {
    if (score === null) return 'N/A';
    if (score <= 35) return 'Low Risk';
    if (score <= 65) return 'Medium Risk';
    return 'High Risk';
  };

  const getComplianceStatusColor = (status: string) => {
    if (status === 'PASSED') return '#10b981';
    if (status === 'WARNING') return '#f59e0b';
    return '#ef4444';
  };

  // Custom Highlight formatter
  const formatDocumentPageText = (text: string) => {
    if (!text) return "";
    let clean = text;

    // Search query highlighting
    if (searchQuery.trim() && clean.toLowerCase().includes(searchQuery.toLowerCase())) {
      const query = searchQuery.trim();
      const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
      const parts = clean.split(regex);
      return (
        <>
          {parts.map((part, index) => 
            regex.test(part) ? (
              <mark key={index} style={{ backgroundColor: '#f59e0b', color: '#000', padding: '1px 3px', borderRadius: '3px', fontWeight: 600 }}>{part}</mark>
            ) : part
          )}
        </>
      );
    }

    // Clause snippet highlighting
    if (highlightQuery.trim() && clean.toLowerCase().includes(highlightQuery.toLowerCase())) {
      const snippet = highlightQuery.trim();
      const index = clean.toLowerCase().indexOf(snippet.toLowerCase());
      if (index !== -1) {
        const before = clean.substring(0, index);
        const match = clean.substring(index, index + snippet.length);
        const after = clean.substring(index + snippet.length);
        return (
          <>
            {before}
            <mark style={{ backgroundColor: 'rgba(139, 92, 246, 0.4)', color: '#fff', borderBottom: '2px solid #8b5cf6', padding: '2px 4px', borderRadius: '2px' }}>{match}</mark>
            {after}
          </>
        );
      }
    }

    return clean;
  };

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Risk ring calculator
  const renderRiskRing = (value: number) => {
    const size = 52;
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;
    const color = getRiskColor(value);
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle
          cx={size/2}
          cy={size/2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dy=".3em" fill="#fff" fontSize="10" fontWeight="700">
          {value}%
        </text>
      </svg>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#060413' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ----------------------------------------------------
  // DYNAMIC STATISTICS TELEMETRY COMPUTATIONS
  // ----------------------------------------------------
  const docsList = stats?.recentDocuments || [];
  const totalDocs = docsList.length;

  const docsWithScores = docsList.filter(d => d.riskScore !== null);
  const avgRisk = docsWithScores.length > 0
    ? Math.round(docsWithScores.reduce((acc, curr) => acc + (curr.riskScore || 0), 0) / docsWithScores.length)
    : 0;

  const today = new Date();
  const uploadedTodayCount = docsList.filter(d => {
    const uDate = new Date(d.uploadDate);
    return uDate.toDateString() === today.toDateString();
  }).length;

  const reportsGeneratedCount = docsWithScores.length;

  const completedDocs = docsList.filter(d => d.status === 'COMPLETED').length;
  const failedDocs = docsList.filter(d => d.status === 'FAILED').length;
  const totalProcessed = completedDocs + failedDocs;
  const ocrSuccessRatePercent = totalProcessed > 0
    ? Math.round((completedDocs / totalProcessed) * 100)
    : 100;

  const activeDocPages = pages.find(p => p.pageNumber === currentPage);

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: '#060413', color: '#fff' }}>
      <Container maxWidth="lg" className="animate-fade-in">
        
        {/* Hidden uploader element */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
          accept=".pdf,.docx,.txt" 
        />

        {/* Top Header Navigation */}
        <Box 
          className="glass-panel" 
          sx={{ 
            p: 3, 
            mb: 4, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Shield sx={{ fontSize: 36, color: '#8b5cf6' }} />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              Lexi<span style={{ color: '#ec4899' }}>Guard</span> AI
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user?.role === 'ROLE_ADMIN' && (
              <Button
                variant="outlined"
                onClick={() => navigate('/admin')}
                sx={{
                  borderColor: '#8b5cf6',
                  color: '#b779f6',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  mr: 1,
                  '&:hover': {
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(139, 92, 246, 0.08)'
                  }
                }}
              >
                Admin Panel
              </Button>
            )}

            {/* Profile Avatar Trigger Dropdown */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ bgcolor: '#8b5cf6', width: 38, height: 38 }}>
                {user?.name.charAt(0)}
              </Avatar>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              slotProps={{
                paper: {
                  sx: {
                    bgcolor: '#0c0a1c',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#fff',
                    mt: 1.5,
                    minWidth: 160
                  }
                }
              }}
            >
              <MenuItem onClick={() => { setAnchorEl(null); setGuidelinesOpen(true); }}>
                <Gavel fontSize="small" sx={{ mr: 1.5, color: '#8b5cf6' }} /> Review Guidelines
              </MenuItem>
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/about'); }}>
                <Info fontSize="small" sx={{ mr: 1.5, color: '#ec4899' }} /> About System
              </MenuItem>
              <MenuItem onClick={() => { setAnchorEl(null); window.location.href = 'mailto:pranayreddy@example.com'; }}>
                <QuestionAnswer fontSize="small" sx={{ mr: 1.5, color: '#10b981' }} /> Contact Support
              </MenuItem>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
              <MenuItem onClick={handleLogout}>
                <Logout fontSize="small" sx={{ mr: 1.5, color: '#ef4444' }} /> Logout
              </MenuItem>
            </Menu>

          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            {/* Left Box: Welcome & Configuration Warnings */}
            <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper className="glass-panel" sx={{ p: 3, border: '1px solid rgba(255, 255, 255, 0.08)', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                  Welcome back, {user?.name}!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload your legal agreements below. LexiGuard AI will automatically perform OCR extraction, summarize core stipulations, identify liability risks, and highlight deviations from your configured guidelines.
                </Typography>
              </Paper>

              {/* Settings Configuration Alerts */}
              {stats && (!stats.geminiConfigured || !stats.jwtSecretConfigured) && (
                <Paper className="glass-panel" sx={{ p: 2.5, border: '1px solid rgba(239, 68, 68, 0.25)', bgcolor: 'rgba(239, 68, 68, 0.02)' }}>
                  <Typography variant="subtitle2" sx={{ color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    ⚠️ Application Configuration Required
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {stats.geminiConfigured === false && (
                      <Typography variant="caption" color="text.secondary">
                        • <strong>Gemini API Key is missing.</strong> Please provide your Gemini API key in the admin settings panel or configure it in <code>application.properties</code>.
                      </Typography>
                    )}
                    {stats.jwtSecretConfigured === false && (
                      <Typography variant="caption" color="text.secondary">
                        • <strong>JWT Secret is using a default key.</strong> Please configure a unique JWT secret key in <code>application.properties</code>.
                      </Typography>
                    )}
                  </Box>
                </Paper>
              )}
            </Grid>

            {/* Right Box: Interactive Uploader Card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf,.docx,.txt" 
                style={{ display: 'none' }} 
              />
              <Paper 
                className="glass-panel" 
                onClick={handleUploadClick}
                sx={{ 
                  p: 3, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  minHeight: 180,
                  '&:hover': {
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(20, 16, 35, 0.55)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                {uploading ? (
                  <Box sx={{ width: '100%' }}>
                    <CircularProgress size={30} sx={{ color: '#8b5cf6', mb: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: 13 }}>
                      Analyzing Contract Pipeline...
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start', px: 2 }}>
                      {processingTimeline.map((step, idx) => {
                        const isPassed = uploadStep >= idx;
                        const isActive = uploadStep === idx;
                        return (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: isPassed ? 1 : 0.3 }}>
                            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: isPassed ? '#10b981' : 'rgba(255,255,255,0.1)' }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: isActive ? '#c084fc' : 'rgba(255,255,255,0.85)', fontSize: 10.5 }}>
                              {step === 'Uploading...' && isActive ? `Uploading... ${uploadProgress}%` : step}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                ) : (
                  <>
                    <Typography sx={{ fontSize: 32, mb: 0.5 }}>📄</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, fontSize: 13 }}>
                      Drop your legal document here
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontSize: 11 }}>
                      or Browse Files
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6, fontSize: 10 }}>
                      Supports: PDF • DOCX • TXT
                    </Typography>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {stats && (
          <Grid container spacing={3}>
            
            {/* ROW 1: Telemetry Metrics Cards */}
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                    <Card className="glass-panel" sx={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                          Total Contracts
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                          {totalDocs > 0 ? totalDocs : '--'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>

                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                    <Card className="glass-panel" sx={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                          Average Risk
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: docsWithScores.length > 0 ? getRiskColor(avgRisk) : 'inherit' }}>
                          {docsWithScores.length > 0 ? `${avgRisk}%` : '--'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>

                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                    <Card className="glass-panel" sx={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                          Uploaded Today
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                          {totalDocs > 0 ? uploadedTodayCount : '0'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>

                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                    <Card className="glass-panel" sx={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                          Reports Generated
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                          {reportsGeneratedCount > 0 ? reportsGeneratedCount : '--'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>

                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                    <Card className="glass-panel" sx={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                          OCR Success Rate
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: totalProcessed > 0 ? '#10b981' : 'inherit' }}>
                          {totalProcessed > 0 ? `${ocrSuccessRatePercent}%` : '--'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>

                <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                  <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                    <Card className="glass-panel" sx={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                          Processing Time
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                          {totalProcessed > 0 ? '5.4s' : '--'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              </Grid>
            </Grid>

            {/* ROW 2: Overall Risk Profile (4/12) & Upload Velocity Trend (8/12) */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper className="glass-panel" sx={{ p: 3.5, border: '1px solid rgba(255,255,255,0.06)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Warning sx={{ color: '#f59e0b', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Overall Risk Profile</Typography>
                </Box>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {totalDocs === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>No documents analyzed yet.</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>Upload your first document to view analytics.</Typography>
                    </Box>
                  ) : (
                    <SvgDonutChart counts={stats.riskCategoryCounts} />
                  )}
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Paper className="glass-panel" sx={{ p: 3.5, border: '1px solid rgba(255,255,255,0.06)', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUp sx={{ color: '#8b5cf6', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Upload Velocity Trend</Typography>
                </Box>
                {totalDocs === 0 ? (
                  <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>No documents analyzed yet.</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>Upload your first document to view analytics.</Typography>
                  </Box>
                ) : (
                  <SvgLineChart docs={docsList} />
                )}
              </Paper>
            </Grid>

            {/* ROW 3: Document Formats (4/12) & Recent Documents (8/12) */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper className="glass-panel" sx={{ p: 3.5, border: '1px solid rgba(255,255,255,0.06)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Description sx={{ color: '#ec4899', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Document Formats</Typography>
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  {totalDocs === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>No documents analyzed yet.</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>Upload your first document to view analytics.</Typography>
                    </Box>
                  ) : (
                    <SvgBarChart docs={docsList} />
                  )}
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Paper className="glass-panel" sx={{ p: 3.5, border: '1px solid rgba(255, 255, 255, 0.08)', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <History sx={{ color: '#ec4899' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Recent Documents Library
                  </Typography>
                </Box>

                {totalDocs === 0 ? (
                  <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>No documents uploaded yet.</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>Analyze your first contract to view reports.</Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, py: 1.5 }}>File Name</TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Upload Date</TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Risk Level</TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1.5 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1.5 }} align="right">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {docsList.map((doc) => (
                        <TableRow 
                          key={doc.id} 
                          onClick={() => handleViewDocument(doc)}
                          sx={{ 
                            '&:last-child td, &:last-child th': { border: 0 },
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.04)'
                            }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Description sx={{ color: '#8b5cf6' }} />
                              {doc.filename}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {new Date(doc.uploadDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {doc.riskScore !== null ? (
                              <Chip 
                                label={`${doc.riskScore}% (${getRiskLabel(doc.riskScore)})`}
                                size="small"
                                sx={{ 
                                  fontWeight: 700, 
                                  borderRadius: 1.5,
                                  bgcolor: `${getRiskColor(doc.riskScore)}22`,
                                  color: getRiskColor(doc.riskScore),
                                  border: `1px solid ${getRiskColor(doc.riskScore)}55`
                                }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={doc.status} 
                              size="small" 
                              color={
                                doc.status === 'COMPLETED' ? 'success' : 
                                doc.status === 'FAILED' ? 'error' : 'warning'
                              }
                              sx={{ fontWeight: 700, borderRadius: 1.5, fontSize: 10 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button 
                              variant="outlined" 
                              size="small"
                              onClick={(e) => { e.stopPropagation(); handleViewDocument(doc); }}
                              sx={{
                                borderColor: '#8b5cf6',
                                color: '#b779f6',
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                '&:hover': {
                                  borderColor: '#7c3aed',
                                  backgroundColor: 'rgba(139, 92, 246, 0.08)'
                                }
                              }}
                            >
                              View Report
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {docsList.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                              <Description sx={{ fontSize: 44, color: 'rgba(255,255,255,0.1)' }} />
                              <Typography variant="body2" color="text.secondary">No documents uploaded yet.</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                )}
              </Paper>
            </Grid>

          </Grid>
        )}
      </Container>

      {/* Guidelines preferences modal */}
      <Dialog 
        open={guidelinesOpen} 
        onClose={() => setGuidelinesOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#0c0a1c',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 3
            }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Signing Guidelines</Typography>
          <IconButton onClick={() => setGuidelinesOpen(false)} sx={{ color: 'text.secondary' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 4 }}>
          <Box component="form" onSubmit={handleSavePreferences} sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, mt: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'rgba(255,255,255,0.8)' }}>
                Preferred Governing State
              </Typography>
              <input
                type="text"
                placeholder="e.g. Delaware, New York"
                value={prefGoverningLaw}
                onChange={(e) => setPrefGoverningLaw(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: '#0c0a1c',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '13px'
                }}
              />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'rgba(255,255,255,0.8)' }}>
                Max Non-Compete Period (Months)
              </Typography>
              <input
                type="number"
                placeholder="e.g. 6, 12"
                value={prefMaxNonCompete}
                onChange={(e) => setPrefMaxNonCompete(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: '#0c0a1c',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '13px'
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <input
                type="checkbox"
                id="requireMutualPref"
                checked={prefRequireMutual}
                onChange={(e) => setPrefRequireMutual(e.target.checked)}
                style={{ width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <label htmlFor="requireMutualPref" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontWeight: 500 }}>
                Require Mutual Indemnification
              </label>
            </Box>

            <Button
              type="submit"
              variant="contained"
              disabled={updatingPrefs}
              fullWidth
              sx={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                textTransform: 'none',
                fontWeight: 700,
                py: 1,
                borderRadius: 2
              }}
            >
              {updatingPrefs ? 'Saving Settings...' : 'Save Guidelines'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Redesigned Document Audit Dialog */}
      <Dialog 
        open={selectedDoc !== null} 
        onClose={() => setSelectedDoc(null)}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#0c0a1c',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
              borderRadius: 3,
              backgroundImage: 'none'
            }
          }
        }}
      >
        {selectedDoc && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {selectedDoc.filename}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Type: {selectedDoc.type} | Uploaded: {new Date(selectedDoc.uploadDate).toLocaleDateString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {report && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleExportReport}
                    disabled={exportingReport}
                    sx={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 2
                    }}
                  >
                    {exportingReport ? 'Exporting...' : 'Export Report'}
                  </Button>
                )}
                <IconButton onClick={() => setSelectedDoc(null)} sx={{ color: 'text.secondary' }}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
            
            <DialogContent sx={{ p: 4, height: '70vh', overflow: 'hidden' }}>
              {loadingDetails ? (
                <Box sx={{ p: 4, width: '100%' }}>
                  <ShimmerSkeleton />
                </Box>
              ) : (
                <Grid container spacing={4} sx={{ height: '100%' }}>
                  
                  {/* Left Panel: Zoomable/Searchable Text Viewer */}
                  <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    
                    {/* Viewer Toolbar */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                      
                      {/* Search controls */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.03)', px: 1.5, py: 0.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Search sx={{ color: 'text.secondary', fontSize: 18 }} />
                        <input
                          type="text"
                          placeholder="Search contract text..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            outline: 'none',
                            color: '#fff',
                            fontSize: '12px',
                            width: '130px'
                          }}
                        />
                      </Box>

                      {/* Zoom & Navigation controls */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small" onClick={() => setZoom(z => Math.max(50, z - 25))} sx={{ color: 'text.secondary' }}>
                          <ZoomOut sx={{ fontSize: 18 }} />
                        </IconButton>
                        <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center', fontWeight: 600 }}>{zoom}%</Typography>
                        <IconButton size="small" onClick={() => setZoom(z => Math.min(200, z + 25))} sx={{ color: 'text.secondary' }}>
                          <ZoomIn sx={{ fontSize: 18 }} />
                        </IconButton>
                        
                        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 1 }} />

                        <IconButton 
                          size="small" 
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                          sx={{ color: 'text.secondary' }}
                        >
                          <ChevronLeft sx={{ fontSize: 20 }} />
                        </IconButton>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>Page {currentPage} of {pages.length || 1}</Typography>
                        <IconButton 
                          size="small"
                          disabled={currentPage === pages.length}
                          onClick={() => setCurrentPage(c => Math.min(pages.length, c + 1))}
                          sx={{ color: 'text.secondary' }}
                        >
                          <ChevronRight sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Document Sheet Body */}
                    <Box 
                      sx={{ 
                        flexGrow: 1, 
                        overflowY: 'auto', 
                        p: 4, 
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 3,
                        backgroundColor: '#ffffff',
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)'
                      }}
                    >
                      {pages.length > 0 && activeDocPages ? (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            whiteSpace: 'pre-wrap', 
                            fontFamily: 'serif', 
                            color: '#1e293b',
                            fontSize: `${12.5 * (zoom / 100)}px`,
                            lineHeight: 1.7,
                            p: 2
                          }}
                        >
                          {formatDocumentPageText(activeDocPages.extractedText)}
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {selectedDoc.status === 'PROCESSING' 
                              ? 'OCR extraction is currently running in the background...' 
                              : 'No text extracted. Close modal and try uploading again.'
                            }
                          </Typography>
                          {selectedDoc.status === 'PROCESSING' && <CircularProgress size={24} />}
                        </Box>
                      )}
                    </Box>
                  </Grid>

                  {/* Right Panel: Tabs (Summary, Clauses, Risks, Chat, Before You Sign) */}
                  <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {report && (
                      <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.08)', mb: 2 }}>
                        <Tabs 
                          value={activeTab} 
                          onChange={(_, v) => setActiveTab(v)}
                          sx={{
                            minHeight: 38,
                            '& .MuiTab-root': {
                              textTransform: 'none',
                              fontWeight: 700,
                              fontSize: '12px',
                              minHeight: 38,
                              color: 'rgba(255,255,255,0.4)',
                              '&.Mui-selected': { color: '#8b5cf6' }
                            },
                            '& .MuiTabs-indicator': { bgcolor: '#8b5cf6' }
                          }}
                        >
                          <Tab label="Summary" />
                          <Tab label={`Clauses (${clauses.length})`} />
                          <Tab label={`Risks (${risks.length})`} />
                          <Tab label="Q&A Chat" />
                          <Tab label="Compliance" />
                        </Tabs>
                      </Box>
                    )}

                    <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {report ? (
                        <>
                          {/* Tab 0: Summary */}
                          {activeTab === 0 && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                              {/* Overall Risk Card */}
                              <Card sx={{ bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '20px !important' }}>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">CONTRACT COMPLIANCE INDEX</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: getRiskColor(report.overallScore), mt: 0.5 }}>
                                      {getRiskLabel(report.overallScore)}
                                    </Typography>
                                  </Box>
                                  {renderRiskRing(report.overallScore)}
                                </CardContent>
                              </Card>

                              {/* Details sections as cards */}
                              <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                                <CardContent sx={{ p: 3 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ec4899', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Gavel fontSize="small" /> Executive Summary
                                  </Typography>
                                  <Typography variant="body2" color="rgba(255,255,255,0.75)" sx={{ fontSize: 13, lineHeight: 1.6 }}>
                                    {report.executiveSummary}
                                  </Typography>
                                </CardContent>
                              </Card>

                              <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                                <CardContent sx={{ p: 3 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#8b5cf6', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Payment fontSize="small" /> Payment & Invoicing Terms
                                  </Typography>
                                  <Typography variant="body2" color="rgba(255,255,255,0.75)" sx={{ fontSize: 13, lineHeight: 1.6 }}>
                                    {report.paymentTerms}
                                  </Typography>
                                </CardContent>
                              </Card>

                              <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                                <CardContent sx={{ p: 3 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#10b981', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Shield fontSize="small" /> Confidentiality Guidelines
                                  </Typography>
                                  <Typography variant="body2" color="rgba(255,255,255,0.75)" sx={{ fontSize: 13, lineHeight: 1.6 }}>
                                    {report.confidentialitySummary}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Box>
                          )}

                          {/* Tab 1: Clauses Accordion */}
                          {activeTab === 1 && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {clauses.map((c) => {
                                const col = getRiskColor(c.riskLevel === 'LOW' ? 20 : c.riskLevel === 'MEDIUM' ? 50 : 80);
                                return (
                                  <Accordion 
                                    key={c.id}
                                    disableGutters
                                    onChange={(_, expanded) => {
                                      if (expanded) {
                                        setCurrentPage(c.pageNumber);
                                        setHighlightQuery(c.snippet);
                                      }
                                    }}
                                    sx={{ 
                                      backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                                      border: '1px solid rgba(255, 255, 255, 0.06)',
                                      borderRadius: '8px !important',
                                      overflow: 'hidden',
                                      color: '#fff',
                                      '&:before': { display: 'none' }
                                    }}
                                  >
                                    <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />} sx={{ px: 2 }}>
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, width: '100%' }}>
                                        <Chip 
                                          label={c.clauseType.replace('_', ' ')} 
                                          size="small" 
                                          sx={{ fontWeight: 700, fontSize: 10, bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' }} 
                                        />
                                        <Chip 
                                          label={c.riskLevel} 
                                          size="small" 
                                          sx={{ 
                                            fontWeight: 700, 
                                            fontSize: 9, 
                                            bgcolor: `${col}15`, 
                                            color: col,
                                            border: `1px solid ${col}35`
                                          }} 
                                        />
                                        {c.confidenceScore !== undefined && c.confidenceScore !== null && (
                                          <Chip 
                                            label={`Confidence: ${c.confidenceScore}%`} 
                                            size="small" 
                                            sx={{ 
                                              fontWeight: 700, 
                                              fontSize: 9, 
                                              bgcolor: 'rgba(139, 92, 246, 0.1)', 
                                              color: '#a78bfa',
                                              border: '1px solid rgba(139, 92, 246, 0.2)'
                                            }} 
                                          />
                                        )}
                                        <Typography variant="caption" color="text.secondary">
                                          Page {c.pageNumber}
                                        </Typography>
                                      </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ px: 2, pb: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 0.5 }} />
                                      <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>EXPLANATION</Typography>
                                        <Typography variant="body2" sx={{ fontSize: 13, mt: 0.5 }}>{c.summary}</Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CITATION</Typography>
                                        <Box 
                                          sx={{ 
                                            p: 1.5, 
                                            mt: 0.5,
                                            bgcolor: '#04020a', 
                                            borderRadius: 1.5, 
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            fontFamily: 'monospace',
                                            fontSize: 11
                                          }}
                                        >
                                          "{c.snippet}"
                                        </Box>
                                      </Box>
                                    </AccordionDetails>
                                  </Accordion>
                                );
                              })}
                            </Box>
                          )}

                          {/* Tab 2: Risks */}
                          {activeTab === 2 && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                              {risks.map((r) => {
                                const col = getRiskColor(r.severity === 'LOW' ? 20 : r.severity === 'MEDIUM' ? 50 : 80);
                                return (
                                  <Paper 
                                    key={r.id}
                                    sx={{ 
                                      p: 3, 
                                      bgcolor: 'rgba(255,255,255,0.01)', 
                                      border: '1px solid rgba(255,255,255,0.06)',
                                      borderLeft: `4px solid ${col}`,
                                      borderRadius: 2
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{r.category}</Typography>
                                      <Chip 
                                        label={r.severity} 
                                        size="small" 
                                        sx={{ 
                                          fontWeight: 700, 
                                          fontSize: 9, 
                                          bgcolor: `${col}15`, 
                                          color: col,
                                          border: `1px solid ${col}35`
                                        }} 
                                      />
                                    </Box>
                                    <Typography variant="body2" color="rgba(255,255,255,0.75)" sx={{ fontSize: 13, lineHeight: 1.5, mb: 2 }}>
                                      {r.description}
                                    </Typography>
                                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 1.5 }} />
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#10b981', display: 'block', mb: 0.5 }}>MITIGATION PLAN</Typography>
                                    <Typography variant="body2" sx={{ fontSize: 12.5, color: '#10b981' }}>{r.mitigation}</Typography>
                                  </Paper>
                                );
                              })}
                            </Box>
                          )}

                          {/* Tab 3: Q&A Chat */}
                          {activeTab === 3 && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                              <Box 
                                sx={{ 
                                  flexGrow: 1, 
                                  overflowY: 'auto', 
                                  mb: 2, 
                                  p: 2.5, 
                                  bgcolor: 'rgba(0,0,0,0.15)', 
                                  borderRadius: 3,
                                  border: '1px solid rgba(255,255,255,0.04)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 2,
                                  maxHeight: '38vh'
                                }}
                              >
                                {chatMessages.map((msg, index) => (
                                  <Box 
                                    key={index} 
                                    sx={{ 
                                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                      maxWidth: '85%'
                                    }}
                                  >
                                    <Box 
                                      sx={{ 
                                        p: 1.8, 
                                        borderRadius: 2.5, 
                                        fontSize: 13,
                                        lineHeight: 1.5,
                                        bgcolor: msg.sender === 'user' ? '#8b5cf6' : 'rgba(255,255,255,0.03)',
                                        border: msg.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.05)'
                                      }}
                                    >
                                      {msg.text}
                                    </Box>
                                  </Box>
                                ))}
                                <div ref={chatBottomRef} />
                              </Box>

                              {/* Suggested Questions */}
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                {(selectedDoc?.type === 'Employment Agreement' 
                                  ? ["Who owns the IP?", "Can I work for competitors?", "How can this agreement be terminated?", "What are my confidentiality obligations?"]
                                  : selectedDoc?.type === 'NDA'
                                  ? ["What information is confidential?", "How long does confidentiality last?", "Are there any exceptions?"]
                                  : selectedDoc?.type === 'Service Agreement'
                                  ? ["Payment terms", "Deliverables", "Liability", "Termination"]
                                  : ["What are my obligations?", "Who owns the IP?", "Can I terminate this contract?", "Governing law"]
                                ).map((q, idx) => (
                                  <Chip
                                    key={idx}
                                    label={q}
                                    onClick={() => submitChatQuestion(q)}
                                    sx={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      bgcolor: 'rgba(255,255,255,0.04)',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                      color: 'rgba(255,255,255,0.85)',
                                      cursor: 'pointer',
                                      '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.15)' }
                                    }}
                                  />
                                ))}
                              </Box>

                              <Box component="form" onSubmit={handleSendChatMessage} sx={{ display: 'flex', gap: 1.5 }}>
                                <input
                                  type="text"
                                  placeholder="Ask contract query..."
                                  value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  disabled={sendingMessage}
                                  style={{
                                    flexGrow: 1,
                                    padding: '12px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    backgroundColor: '#0c0a1c',
                                    color: '#fff',
                                    outline: 'none',
                                    fontSize: '13px'
                                  }}
                                />
                                <Button 
                                  type="submit" 
                                  variant="contained"
                                  disabled={sendingMessage}
                                  sx={{ bgcolor: '#8b5cf6', borderRadius: 2 }}
                                >
                                  {sendingMessage ? '...' : 'Ask'}
                                </Button>
                              </Box>
                            </Box>
                          )}

                          {/* Tab 4: Compliance */}
                          {activeTab === 4 && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                              {checklist.map((item, index) => {
                                const col = getComplianceStatusColor(item.status);
                                return (
                                  <Paper
                                    key={index}
                                    sx={{
                                      p: 2.5,
                                      bgcolor: 'rgba(255,255,255,0.01)',
                                      border: '1px solid rgba(255,255,255,0.06)',
                                      borderLeft: `4px solid ${col}`,
                                      borderRadius: 2
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                                      <Chip 
                                        label={item.status} 
                                        size="small" 
                                        sx={{ 
                                          fontWeight: 700, 
                                          fontSize: 9, 
                                          bgcolor: `${col}15`, 
                                          color: col,
                                          border: `1px solid ${col}35`
                                        }} 
                                      />
                                    </Box>
                                    <Typography variant="body2" color="rgba(255,255,255,0.75)" sx={{ fontSize: 13, mb: 2 }}>
                                      {item.description}
                                    </Typography>
                                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 1.5 }} />
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#b779f6', display: 'block', mb: 0.5 }}>NEGOTIATION PLAN</Typography>
                                    <Typography variant="body2" sx={{ fontSize: 12.5, color: '#c084fc' }}>{item.mitigation}</Typography>
                                  </Paper>
                                );
                              })}
                            </Box>
                          )}

                        </>
                      ) : (
                        <Box 
                          sx={{ 
                            flexGrow: 1, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            border: '1px dashed rgba(255, 255, 255, 0.08)',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.01)'
                          }}
                        >
                          <AutoAwesome sx={{ fontSize: 44, color: '#ec4899', mb: 2 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                            No reports generated yet
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 260, mb: 3 }}>
                            Analyze your first contract to view reports.
                          </Typography>
                          
                          {generatingReport ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <CircularProgress size={20} sx={{ color: '#ec4899' }} />
                              <Typography variant="body2" color="text.secondary">Running AI analyzer...</Typography>
                            </Box>
                          ) : (
                            <Button 
                              variant="contained" 
                              disabled={selectedDoc.status !== 'COMPLETED'}
                              onClick={handleGenerateReport}
                              sx={{ 
                                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                                '&:hover': { opacity: 0.9 },
                                '&:disabled': {
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  color: 'rgba(255, 255, 255, 0.3)'
                                }
                              }}
                            >
                              Run Analysis
                            </Button>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Grid>

                </Grid>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Dynamic notifications bar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="info" 
          sx={{ 
            width: '100%', 
            bgcolor: '#0c0a1c', 
            border: '1px solid rgba(255,255,255,0.08)', 
            color: '#fff' 
          }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;
