import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Slider,
  Tabs,
  Tab,
  TextField,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputAdornment
} from '@mui/material';
import { 
  ArrowBack,
  Description, 
  Group,
  Settings,
  Storage,
  Save,
  Delete,
  CloudDownload,
  History,
  Dns,
  CheckCircle,
  Error as ErrorIcon,
  Speed,
  Info,
  Search,
  SettingsSuggest,
  Shield
} from '@mui/icons-material';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalDocuments: number;
  reportsGenerated: number;
  aiRequestsToday: number;
  ocrSuccessRate: number;
  averageProcessingTime: string;
  averageRiskScore: number;
  riskCategoryCounts: {
    Low: number;
    Medium: number;
    High: number;
    Critical: number;
  };
  systemHealth: {
    databaseStatus: string;
    geminiStatus: string;
    ocrStatus: string;
    storageUsage: string;
    uptime: string;
    version: string;
  };
  auditLogs: {
    timestamp: string;
    user: string;
    action: string;
    status: string;
  }[];
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastLogin: string;
  documentsUploaded: number;
  status: string;
}

interface AdminDocument {
  id: number;
  filename: string;
  type: string;
  uploadDate: string;
  status: string;
  riskScore: number | null;
  owner: {
    id: number;
    name: string;
    email: string;
  };
}

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<number>(0);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [modelName, setModelName] = useState<string>('gemini-1.5-flash');
  const [temperature, setTemperature] = useState<number>(0.2);
  const [maxPages, setMaxPages] = useState<number>(10);
  const [promptOverride, setPromptOverride] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [jwtExpirationMs, setJwtExpirationMs] = useState<number>(86400000);
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState<number>(10);
  const [supportedFileTypes, setSupportedFileTypes] = useState<string>('PDF,DOCX,TXT');
  const [ocrLanguages, setOcrLanguages] = useState<string>('eng');
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(2048);

  // Search & Filter states
  const [userSearch, setUserSearch] = useState<string>('');
  const [docSearch, setDocSearch] = useState<string>('');
  const [docRiskFilter, setDocRiskFilter] = useState<string>('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('ALL');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch stats
      const statsRes = await API.get('/admin/stats');
      if (statsRes.data && statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      // 2. Fetch all documents
      const docsRes = await API.get('/admin/documents');
      if (docsRes.data && docsRes.data.success) {
        setDocuments(docsRes.data.data);
      }

      // 3. Fetch all users
      const usersRes = await API.get('/admin/users');
      if (usersRes.data && usersRes.data.success) {
        setUsers(usersRes.data.data);
      }

      // 4. Fetch system config
      const configRes = await API.get('/admin/config');
      if (configRes.data && configRes.data.success) {
        const c = configRes.data.data;
        setModelName(c.geminiModelName || 'gemini-1.5-flash');
        setTemperature(c.geminiTemperature !== undefined ? c.geminiTemperature : 0.2);
        setMaxPages(c.maxDocumentPages || 10);
        setPromptOverride(c.systemPromptOverride || '');
        setGeminiApiKey(c.geminiApiKey || '');
        setJwtExpirationMs(c.jwtExpirationMs || 86400000);
        setMaxUploadSizeMb(c.maxUploadSizeMb || 10);
        setSupportedFileTypes(c.supportedFileTypes || 'PDF,DOCX,TXT');
        setOcrLanguages(c.ocrLanguages || 'eng');
        setMaxOutputTokens(c.maxOutputTokens || 2048);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Access Denied: Admin authorization failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await API.put('/admin/config', {
        geminiModelName: modelName,
        geminiTemperature: temperature,
        maxDocumentPages: maxPages,
        systemPromptOverride: promptOverride,
        geminiApiKey: geminiApiKey,
        jwtExpirationMs: jwtExpirationMs,
        maxUploadSizeMb: maxUploadSizeMb,
        supportedFileTypes: supportedFileTypes,
        ocrLanguages: ocrLanguages,
        maxOutputTokens: maxOutputTokens
      });

      if (response.data && response.data.success) {
        setSuccess('System configuration parameters updated successfully.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update system config.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user? All their documents and reports will be permanently removed.')) {
      return;
    }
    try {
      const res = await API.delete(`/admin/users/${userId}`);
      if (res.data && res.data.success) {
        setSuccess('User deleted successfully.');
        setUsers(prev => prev.filter(u => u.id !== userId));
        const statsRes = await API.get('/admin/stats');
        if (statsRes.data && statsRes.data.success) {
          setStats(statsRes.data.data);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!window.confirm('Are you sure you want to delete this document and its generated report?')) {
      return;
    }
    try {
      const res = await API.delete(`/admin/documents/${docId}`);
      if (res.data && res.data.success) {
        setSuccess('Document deleted successfully.');
        setDocuments(prev => prev.filter(d => d.id !== docId));
        const statsRes = await API.get('/admin/stats');
        if (statsRes.data && statsRes.data.success) {
          setStats(statsRes.data.data);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete document.');
    }
  };

  const handleDownloadDocument = async (docId: number, filename: string) => {
    try {
      const response = await API.get(`/documents/${docId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError('Failed to download document file.');
    }
  };

  const getRiskColor = (score: number | null) => {
    if (score === null) return '#9ca3af'; // gray
    if (score <= 35) return '#10b981'; // green (Low)
    if (score <= 65) return '#f59e0b'; // yellow/orange (Medium)
    if (score <= 85) return '#ef4444'; // red (High)
    return '#8b5cf6'; // purple (Critical)
  };

  const getRiskLabel = (score: number | null) => {
    if (score === null) return 'N/A';
    if (score <= 35) return 'Low';
    if (score <= 65) return 'Medium';
    if (score <= 85) return 'High';
    return 'Critical';
  };

  // Local filtering logic
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredDocs = documents.filter(d => {
    const matchesSearch = d.filename.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.owner.name.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.owner.email.toLowerCase().includes(docSearch.toLowerCase());
    
    const matchesType = docTypeFilter === 'ALL' || d.type.toUpperCase() === docTypeFilter;
    
    let matchesRisk = true;
    if (docRiskFilter !== 'ALL') {
      const label = getRiskLabel(d.riskScore).toUpperCase();
      matchesRisk = label === docRiskFilter;
    }

    return matchesSearch && matchesType && matchesRisk;
  });

  const renderSvgDonutChart = (counts: { Low: number; Medium: number; High: number; Critical: number }) => {
    const total = counts.Low + counts.Medium + counts.High + counts.Critical;
    if (total === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No document risks categorized yet.
        </Typography>
      );
    }

    const segments = [
      { label: 'Low', val: counts.Low, color: '#10b981' },
      { label: 'Medium', val: counts.Medium, color: '#f59e0b' },
      { label: 'High', val: counts.High, color: '#ef4444' },
      { label: 'Critical', val: counts.Critical, color: '#8b5cf6' }
    ].filter(s => s.val > 0);

    let accumulatedAngle = 0;
    const radius = 50;
    const strokeWidth = 14;
    const circ = 2 * Math.PI * radius;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, py: 2 }}>
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
          {segments.map((seg, idx) => {
            const pct = seg.val / total;
            const strokeDash = circ * pct;
            const offset = circ - strokeDash;
            const rotate = accumulatedAngle;
            accumulatedAngle += pct * 360;

            return (
              <circle
                key={idx}
                cx="75"
                cy="75"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeDash} ${circ}`}
                strokeDashoffset={offset}
                transform={`rotate(${rotate - 90} 75 75)`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            );
          })}
        </svg>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {segments.map((seg, idx) => (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: seg.color }} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {seg.label}: {seg.val} ({Math.round((seg.val / total) * 100)}%)
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#060413' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: '#060413', color: '#fff' }}>
      <Container maxWidth="lg" className="animate-fade-in">
        
        {/* Top Header */}
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
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/dashboard')}
              startIcon={<ArrowBack />}
              sx={{ borderColor: 'rgba(255,255,255,0.15)', color: '#fff', '&:hover': { borderColor: '#fff' } }}
            >
              Dashboard
            </Button>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              System <span style={{ color: '#8b5cf6' }}>Administration</span> Panel
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{user?.name}</Typography>
              <Chip label="System Admin" size="small" sx={{ bgcolor: 'rgba(139, 92, 246, 0.15)', color: '#b779f6', fontWeight: 700 }} />
            </Box>
            <Avatar sx={{ bgcolor: '#8b5cf6', width: 40, height: 40 }}>
              {user?.name.charAt(0)}
            </Avatar>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 4, borderRadius: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

        {/* Tab Selection */}
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.08)', mb: 4 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, v) => { setActiveTab(v); setError(null); setSuccess(null); }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.4)',
                '&.Mui-selected': { color: '#8b5cf6' }
              },
              '& .MuiTabs-indicator': { bgcolor: '#8b5cf6' }
            }}
          >
            <Tab label="Overview & Analytics" icon={<Dns />} iconPosition="start" />
            <Tab label={`Users Directory (${users.length})`} icon={<Group />} iconPosition="start" />
            <Tab label={`Documents Library (${documents.length})`} icon={<Storage />} iconPosition="start" />
            <Tab label="AI System Settings" icon={<Settings />} iconPosition="start" />
            <Tab label="System Logs & Health" icon={<History />} iconPosition="start" />
          </Tabs>
        </Box>

        {stats && (
          <Box sx={{ minHeight: '50vh' }}>
            
            {/* TAB 0: OVERVIEW & ANALYTICS */}
            {activeTab === 0 && (
              <Grid container spacing={3}>
                {/* Row of Metrics */}
                <Grid size={{ xs: 12 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Total Accounts
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                            {stats.totalUsers > 0 ? stats.totalUsers : '--'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Active Profiles
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                            {stats.activeUsers > 0 ? stats.activeUsers : '--'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Total Documents
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                            {stats.totalDocuments > 0 ? stats.totalDocuments : '--'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Reports Compiled
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                            {stats.reportsGenerated > 0 ? stats.reportsGenerated : '--'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            AI Requests Today
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                            {stats.aiRequestsToday >= 0 ? stats.aiRequestsToday : '--'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            OCR Success Rate
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: '#10b981' }}>
                            {stats.ocrSuccessRate > 0 ? `${stats.ocrSuccessRate}%` : '--'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Avg Processing Time
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                            {stats.totalDocuments > 0 ? stats.averageProcessingTime : '--'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Avg Risk Score
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: stats.totalDocuments > 0 ? getRiskColor(stats.averageRiskScore) : 'inherit' }}>
                            {stats.totalDocuments > 0 ? `${stats.averageRiskScore}%` : '--'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Risk Profiler Donut */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper className="glass-panel" sx={{ p: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 3 }}>
                      System-wide Liability Profile
                    </Typography>
                    {renderSvgDonutChart(stats.riskCategoryCounts)}
                  </Paper>
                </Grid>

                {/* System Settings Status Check */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper className="glass-panel" sx={{ p: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 3 }}>
                      Quick Security & LLM Flags
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.04)' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Active Gemini Model</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{modelName}</Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.04)' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Temperature Profile</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{temperature}</Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.04)' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Max Allowed Size</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{maxUploadSizeMb} MB</Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.04)' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>File Restrictions</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{supportedFileTypes}</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* TAB 1: USERS DIRECTORY */}
            {activeTab === 1 && (
              <Paper className="glass-panel" sx={{ p: 4, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Registered System Users
                  </Typography>
                  <TextField
                    placeholder="Search name or email..."
                    size="small"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        sx: {
                          bgcolor: '#0c0a1c',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)',
                          '& fieldset': { border: 'none' }
                        }
                      }
                    }}
                  />
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Role</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Registered Date</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Contracts Uploaded</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Chip 
                              label={u.role.replace('ROLE_', '')} 
                              size="small"
                              sx={{ 
                                bgcolor: u.role === 'ROLE_ADMIN' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                                color: u.role === 'ROLE_ADMIN' ? '#c084fc' : 'rgba(255,255,255,0.7)',
                                fontWeight: 700,
                                fontSize: 9.5
                              }} 
                            />
                          </TableCell>
                          <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{u.documentsUploaded}</TableCell>
                          <TableCell>
                            <Chip label={u.status} size="small" color="success" sx={{ fontSize: 9.5, fontWeight: 700 }} />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={u.id === user?.id} // Cannot delete self
                              sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' } }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">No matching user accounts found.</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* TAB 2: DOCUMENTS LIBRARY */}
            {activeTab === 2 && (
              <Paper className="glass-panel" sx={{ p: 4, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                {/* Search & Filter Header Row */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Global Documents Register
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <TextField
                      placeholder="Search document name or owner..."
                      size="small"
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }} />
                            </InputAdornment>
                          ),
                          sx: {
                            bgcolor: '#0c0a1c',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.1)',
                            '& fieldset': { border: 'none' }
                          }
                        }
                      }}
                    />

                    {/* Filter Type */}
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={docTypeFilter}
                        onChange={(e) => setDocTypeFilter(e.target.value)}
                        displayEmpty
                        sx={{
                          bgcolor: '#0c0a1c',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)',
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                        }}
                      >
                        <MenuItem value="ALL">All Types</MenuItem>
                        <MenuItem value="NDA">NDA</MenuItem>
                        <MenuItem value="EMPLOYMENT">Employment</MenuItem>
                        <MenuItem value="SERVICE_AGREEMENT">Service Agreement</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Filter Risk */}
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={docRiskFilter}
                        onChange={(e) => setDocRiskFilter(e.target.value)}
                        displayEmpty
                        sx={{
                          bgcolor: '#0c0a1c',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)',
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                        }}
                      >
                        <MenuItem value="ALL">All Risks</MenuItem>
                        <MenuItem value="LOW">Low Risk</MenuItem>
                        <MenuItem value="MEDIUM">Medium Risk</MenuItem>
                        <MenuItem value="HIGH">High Risk</MenuItem>
                        <MenuItem value="CRITICAL">Critical Risk</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Filename</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Document Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Owner Account</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Upload Date</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Risk Score</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredDocs.map((doc) => (
                        <TableRow key={doc.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ fontWeight: 600 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Description sx={{ color: '#8b5cf6' }} />
                              {doc.filename}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={doc.type} size="small" sx={{ fontWeight: 700, fontSize: 9.5 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{doc.owner.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{doc.owner.email}</Typography>
                          </TableCell>
                          <TableCell>
                            {new Date(doc.uploadDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={doc.status} 
                              size="small" 
                              color={
                                doc.status === 'COMPLETED' ? 'success' : 
                                doc.status === 'FAILED' ? 'error' : 'warning'
                              }
                              sx={{ fontWeight: 700, borderRadius: 1.5, fontSize: 9.5 }}
                            />
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
                                  border: `1px solid ${getRiskColor(doc.riskScore)}55`,
                                  fontSize: 9.5
                                }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                              <IconButton 
                                size="small" 
                                onClick={() => handleDownloadDocument(doc.id, doc.filename)}
                                sx={{ color: '#8b5cf6', '&:hover': { bgcolor: 'rgba(139,92,246,0.08)' } }}
                              >
                                <CloudDownload fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => handleDeleteDocument(doc.id)}
                                sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' } }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredDocs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">No matching documents found in registry.</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* TAB 3: SYSTEM SETTINGS */}
            {activeTab === 3 && (
              <Paper className="glass-panel" sx={{ p: 4, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <SettingsSuggest sx={{ color: '#8b5cf6', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Global Server Configuration Panel
                  </Typography>
                </Box>
                
                <Box component="form" onSubmit={handleSaveConfig} sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                  <Grid container spacing={3}>
                    {/* Gemini API Key */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                        Gemini API Key
                      </Typography>
                      <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder={geminiApiKey ? "••••••••••••••••••••••••••••••••" : "Missing API Key. Configure to activate RAG summaries."}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: '#0c0a1c',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '13px'
                        }}
                      />
                    </Grid>

                    {/* Gemini Model */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                        LLM Engine Model
                      </Typography>
                      <select
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: '#0c0a1c',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '13px'
                        }}
                      >
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Default)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Precision Clause Match)</option>
                        <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
                      </select>
                    </Grid>

                    {/* Max Upload Size */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                        Maximum Document Upload Limit (MB)
                      </Typography>
                      <input
                        type="number"
                        value={maxUploadSizeMb}
                        onChange={(e) => setMaxUploadSizeMb(parseInt(e.target.value) || 10)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: '#0c0a1c',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '13px'
                        }}
                      />
                    </Grid>

                    {/* JWT Expiration */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                        JWT Token Lifespan Expiration (Ms)
                      </Typography>
                      <input
                        type="number"
                        value={jwtExpirationMs}
                        onChange={(e) => setJwtExpirationMs(parseInt(e.target.value) || 86400000)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: '#0c0a1c',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '13px'
                        }}
                      />
                    </Grid>

                    {/* Supported Types */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                        Allowed Document Extensions (CSV format)
                      </Typography>
                      <input
                        type="text"
                        value={supportedFileTypes}
                        onChange={(e) => setSupportedFileTypes(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: '#0c0a1c',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '13px'
                        }}
                      />
                    </Grid>

                    {/* OCR Languages */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                        OCR Parser Code Languages
                      </Typography>
                      <input
                        type="text"
                        value={ocrLanguages}
                        onChange={(e) => setOcrLanguages(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: '#0c0a1c',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '13px'
                        }}
                      />
                    </Grid>

                    {/* Max Output Tokens */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                        Max Output Answer Tokens Limit
                      </Typography>
                      <input
                        type="number"
                        value={maxOutputTokens}
                        onChange={(e) => setMaxOutputTokens(parseInt(e.target.value) || 2048)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: '#0c0a1c',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '13px'
                        }}
                      />
                    </Grid>

                    {/* AI Temp */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                        LLM Temperature ({temperature})
                      </Typography>
                      <Slider
                        value={temperature}
                        onChange={(_, v) => setTemperature(v as number)}
                        min={0}
                        max={1.5}
                        step={0.1}
                        valueLabelDisplay="auto"
                        sx={{ color: '#8b5cf6', py: 1 }}
                      />
                    </Grid>

                    {/* Max Pages per scan */}
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                        Max Scan Limit (Pages per Upload)
                      </Typography>
                      <input
                        type="number"
                        value={maxPages}
                        onChange={(e) => setMaxPages(parseInt(e.target.value) || 10)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: '#0c0a1c',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '13px'
                        }}
                      />
                    </Grid>

                    {/* Prompt Override */}
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'rgba(255, 255, 255, 0.8)' }}>
                        System Summary Instructions Override Prompt
                      </Typography>
                      <textarea
                        value={promptOverride}
                        onChange={(e) => setPromptOverride(e.target.value)}
                        placeholder="Leave blank to use default LexiGuard contract analysis prompt."
                        style={{
                          width: '100%',
                          height: '110px',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: '#0c0a1c',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '12.5px',
                          fontFamily: 'monospace',
                          resize: 'none'
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={savingConfig}
                    startIcon={<Save />}
                    sx={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      textTransform: 'none',
                      fontWeight: 700,
                      py: 1.5,
                      borderRadius: 2,
                      alignSelf: 'flex-start',
                      px: 4,
                      '&:hover': { opacity: 0.9 }
                    }}
                  >
                    {savingConfig ? 'Saving Settings...' : 'Save Configuration'}
                  </Button>
                </Box>
              </Paper>
            )}

            {/* TAB 4: SYSTEM LOGS & HEALTH */}
            {activeTab === 4 && (
              <Grid container spacing={3}>
                
                {/* System Health Indicators */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Paper className="glass-panel" sx={{ p: 4, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                      <Shield sx={{ color: '#8b5cf6' }} />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        System Health Status
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                      
                      {/* DB */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Database Connection</Typography>
                        </Box>
                        <Chip label={stats.systemHealth.databaseStatus} size="small" color="success" sx={{ fontSize: 9.5, fontWeight: 700 }} />
                      </Box>

                      {/* Gemini */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {stats.systemHealth.geminiStatus === 'UP' ? (
                            <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
                          ) : (
                            <ErrorIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Gemini API Key</Typography>
                        </Box>
                        <Chip 
                          label={stats.systemHealth.geminiStatus === 'UP' ? 'ACTIVE' : 'MISSING'} 
                          size="small" 
                          color={stats.systemHealth.geminiStatus === 'UP' ? 'success' : 'error'} 
                          sx={{ fontSize: 9.5, fontWeight: 700 }} 
                        />
                      </Box>

                      {/* OCR */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>OCR Service Node</Typography>
                        </Box>
                        <Chip label={stats.systemHealth.ocrStatus} size="small" color="success" sx={{ fontSize: 9.5, fontWeight: 700 }} />
                      </Box>

                      {/* Storage */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Info sx={{ color: '#8b5cf6', fontSize: 20 }} />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Storage Utilization</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{stats.systemHealth.storageUsage}</Typography>
                      </Box>

                      {/* Uptime */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Speed sx={{ color: '#b779f6', fontSize: 20 }} />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Backend Node Uptime</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{stats.systemHealth.uptime}</Typography>
                      </Box>

                      {/* Version */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800 }}>V</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>App Release Version</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{stats.systemHealth.version}</Typography>
                      </Box>

                    </Box>
                  </Paper>
                </Grid>

                {/* Audit Trail Logs */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Paper className="glass-panel" sx={{ p: 4, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                      <History sx={{ color: '#ec4899' }} />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        System Administration Audit Logs
                      </Typography>
                    </Box>

                    <TableContainer sx={{ maxHeight: 380 }}>
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Timestamp</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>User</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Action Type</TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: '#0c0a1c', color: 'rgba(255,255,255,0.75)' }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {stats.auditLogs.map((log, index) => (
                            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                              <TableCell sx={{ fontSize: 11.5 }}>
                                {new Date(log.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{log.user}</TableCell>
                              <TableCell>{log.action}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={log.status} 
                                  size="small"
                                  color={log.status === 'COMPLETED' || log.status === 'SUCCESS' ? 'success' : 'warning'}
                                  sx={{ fontSize: 9, fontWeight: 700 }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>

              </Grid>
            )}

          </Box>
        )}

      </Container>
    </Box>
  );
};

export default AdminPanel;
