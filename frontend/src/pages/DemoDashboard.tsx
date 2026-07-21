import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import { 
  Shield, 
  Description, 
  History, 
  Close, 
  Payment,
  Gavel,
  ExpandMore,
  ZoomIn,
  ZoomOut,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowBack
} from '@mui/icons-material';

interface DocumentSummary {
  id: number;
  filename: string;
  type: string;
  uploadDate: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  riskScore: number | null;
}

interface ClauseResponse {
  id: number;
  clauseType: string;
  pageNumber: number;
  summary: string;
  riskLevel: string;
  snippet: string;
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

const sampleNDAPages = [
  {
    pageNumber: 1,
    extractedText: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of January 15, 2026 ("Effective Date"), by and between:
Alpha Corporation, with its principal place of business at 100 Tech Way, Wilmington, DE 19801 ("Alpha"), and
Beta Services LLC, with its principal place of business at 500 Innovate Rd, Austin, TX 78701 ("Beta").

1. Purpose. The parties wish to explore a potential business relationship of mutual interest. In connection with this opportunity, each party may disclose to the other party certain proprietary and confidential information.

2. Definition of Confidential Information. "Confidential Information" means any information disclosed by one party ("Disclosing Party") to the other party ("Receiving Party") that is marked as confidential or proprietary, or if disclosed orally, is identified as confidential at the time of disclosure and confirmed in writing within thirty (30) days.`
  },
  {
    pageNumber: 2,
    extractedText: `3. Obligations of Receiving Party. The Receiving Party agrees:
(a) To hold the Disclosing Party's Confidential Information in strict confidence and take reasonable precautions to protect such information (no less than the precautions it uses for its own proprietary information).
(b) Not to use the Confidential Information for any purpose outside the scope of the potential business relationship.
(c) To limit access to the Confidential Information to employees and contractors who need to know and who are bound by confidentiality obligations at least as restrictive as this Agreement.

4. Exclusions. Confidential Information does not include information that:
(a) is or becomes publicly known through no breach by the Receiving Party;
(b) was already in the Receiving Party's possession prior to disclosure;
(c) is received from a third party without restriction; or
(d) is independently developed without reference to the Disclosing Party's information.

5. Term and Termination. This Agreement shall govern all disclosures made within one (1) year of the Effective Date. The obligations of confidentiality shall survive for a period of three (3) years from the date of disclosure.`
  },
  {
    pageNumber: 3,
    extractedText: `6. Intellectual Property. All Confidential Information remains the sole property of the Disclosing Party. Nothing in this Agreement grants the Receiving Party any license, ownership, or patent rights in the disclosed information.

7. Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles. Any dispute arising out of this Agreement shall be resolved through binding arbitration in Wilmington, DE under the rules of the American Arbitration Association (AAA).

IN WITNESS WHEREOF, the parties have executed this Mutual Non-Disclosure Agreement as of the Effective Date.

ALPHA CORPORATION
By: /s/ Sarah Jenkins
Title: VP of Product

BETA SERVICES LLC
By: /s/ Michael Chang
Title: Chief Operating Officer`
  }
];

const sampleClauses: ClauseResponse[] = [
  {
    id: 1,
    clauseType: "CONFIDENTIALITY",
    pageNumber: 2,
    summary: "Confidentiality obligations survive for a period of three (3) years from the date of disclosure (Section 5).",
    riskLevel: "LOW",
    snippet: "obligations of confidentiality shall survive for a period of three (3) years"
  },
  {
    id: 2,
    clauseType: "GOVERNING_LAW",
    pageNumber: 3,
    summary: "Governing law is set to the State of Delaware (Section 7). This aligns with standard commercial guidelines.",
    riskLevel: "LOW",
    snippet: "governed by and construed in accordance with the laws of the State of Delaware"
  },
  {
    id: 3,
    clauseType: "ARBITRATION",
    pageNumber: 3,
    summary: "Disputes resolved via binding arbitration in Wilmington, DE under AAA rules (Section 7). Avoids court litigation costs.",
    riskLevel: "LOW",
    snippet: "resolved through binding arbitration in Wilmington, DE under the rules of the American Arbitration Association"
  },
  {
    id: 4,
    clauseType: "IP_OWNERSHIP",
    pageNumber: 3,
    summary: "All disclosed Confidential Information remains the sole property of the disclosing party (Section 6). Protects IP.",
    riskLevel: "LOW",
    snippet: "All Confidential Information remains the sole property of the Disclosing Party"
  }
];

const sampleRisks: RiskResponse[] = [
  {
    id: 1,
    category: "Term Duration",
    severity: "LOW",
    description: "The confidentiality survival obligation is set to 3 years. For most corporate evaluations, 3 to 5 years is standard.",
    mitigation: "No action required. Terms are well-balanced."
  },
  {
    id: 2,
    category: "Remedies & Liabilities",
    severity: "MEDIUM",
    description: "The agreement does not explicitly limit consequential damages or contain liability caps for breaches of confidentiality.",
    mitigation: "Propose adding a standard mutual cap on liability except for willful misconduct or gross negligence."
  }
];

const sampleChecklist: ChecklistItem[] = [
  {
    title: "Governing State Alignment",
    status: "PASSED",
    description: "Governing law is Delaware, which matches preferred state guidelines.",
    mitigation: "No changes needed."
  },
  {
    title: "Non-Compete Check",
    status: "PASSED",
    description: "No non-compete covenants or hiring restrictions were detected.",
    mitigation: "Ideal for mutual NDAs."
  },
  {
    title: "Mutual Indemnity",
    status: "WARNING",
    description: "No indemnification provisions found. Breach remedies rely on standard contract damages.",
    mitigation: "Standard for NDAs. Ensure liability exclusions are clear."
  }
];

const sampleReport = {
  overallScore: 22,
  executiveSummary: "A well-balanced Mutual Non-Disclosure Agreement between Alpha Corp and Beta Services LLC. The agreement establishes mutual obligations, standard exclusions, and governing law in Delaware. The risk score is low (22%) due to standard 3-year survival terms and absence of one-sided liability caps.",
  paymentTerms: "No commercial exchanges or payments are specified under this evaluation agreement ($0).",
  confidentialitySummary: "Obligations of confidentiality last for 3 years from disclosure. Standard exclusions (public info, prior possession, independent development) are present."
};

const DemoDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState<DocumentSummary | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightQuery, setHighlightQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // Chat console states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: "Hello! I am your LexiGuard contract assistant. Ask me anything about this sample Mutual NDA." }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Scroll Chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const docsList: DocumentSummary[] = [
    {
      id: 9999,
      filename: "NDA_Alpha_Beta_Sample.pdf",
      type: "NDA",
      uploadDate: new Date().toISOString(),
      status: "COMPLETED",
      riskScore: 22
    }
  ];

  const handleOpenDoc = (doc: DocumentSummary) => {
    setSelectedDoc(doc);
    setCurrentPage(1);
    setHighlightQuery('');
    setSearchQuery('');
    setActiveTab(0);
  };

  const submitDemoQuestion = (queryText: string) => {
    if (!queryText.trim() || sendingMessage) return;
    setChatMessages(prev => [...prev, { sender: 'user', text: queryText }]);
    setSendingMessage(true);

    setTimeout(() => {
      let reply = "I parsed the sample agreement text but could not find a specific match for your query. Let me know if you want to inspect a particular section.";
      const lower = queryText.toLowerCase();

      if (lower.includes("terminate") || lower.includes("duration") || lower.includes("how long")) {
        reply = "According to Section 5 on Page 2, the agreement governs disclosures made within one (1) year. The confidentiality obligations survive for three (3) years from disclosure.";
      } else if (lower.includes("ip") || lower.includes("intellectual property") || lower.includes("own")) {
        reply = "Section 6 on Page 3 states that all Confidential Information remains the sole property of the Disclosing Party. No licenses or ownership rights are granted under this NDA.";
      } else if (lower.includes("obligation") || lower.includes("what must i do")) {
        reply = "Under Section 3 (Page 2), the Receiving Party must hold the information in strict confidence, limit its access to authorized employees/contractors, and use it solely for the evaluation purpose.";
      } else if (lower.includes("compete") || lower.includes("non compete")) {
        reply = "I audited the entire sample contract text and did not find any non-compete or non-solicitation covenants.";
      } else if (lower.includes("governing law") || lower.includes("state") || lower.includes("arbitration")) {
        reply = "Section 7 on Page 3 sets the governing law to Delaware. Any disputes must be resolved through binding arbitration in Wilmington, DE under American Arbitration Association (AAA) rules.";
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      setSendingMessage(false);
    }, 800);
  };

  const handleSendDemoMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const q = chatInput.trim();
    setChatInput('');
    submitDemoQuestion(q);
  };


  const formatDocumentPageText = (text: string) => {
    if (!text) return "";
    let clean = text;

    // Search query highlighting
    if (searchQuery.trim() && clean.toLowerCase().includes(searchQuery.toLowerCase())) {
      const query = searchQuery.trim();
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
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

  const activeDocPages = sampleNDAPages.find(p => p.pageNumber === currentPage);

  return (
    <Box sx={{ minHeight: '100vh', py: 4, bgcolor: '#060413', color: '#fff' }}>
      <Container maxWidth="lg">
        
        {/* Header navigation bar */}
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
              onClick={() => navigate('/')}
              startIcon={<ArrowBack />}
              sx={{ borderColor: 'rgba(255,255,255,0.15)', color: '#fff', '&:hover': { borderColor: '#fff' } }}
            >
              Back to Home
            </Button>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              Lexi<span style={{ color: '#ec4899' }}>Guard</span> <span style={{ color: '#8b5cf6' }}>Demo</span>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Shield sx={{ fontSize: 24, color: '#8b5cf6' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Sample Mode</Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 4, bgcolor: 'rgba(139, 92, 246, 0.1)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 2 }}>
          You are viewing a preprocessed sample contract sandbox. No login or token required. Explore features like clause tagging and conversational vector searches.
        </Alert>

        {/* Dashboard Analytics Mockups */}
        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card className="glass-panel" sx={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Contracts
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, mb: 0.5 }}>1</Typography>
                <Typography variant="caption" color="text.secondary">Active demo file</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card className="glass-panel" sx={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Average Risk
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, mb: 0.5, color: '#10b981' }}>22%</Typography>
                <Typography variant="caption" color="text.secondary">Low Risk Rating</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Card className="glass-panel" sx={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  OCR Success Rate
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, mb: 0.5 }}>100%</Typography>
                <Typography variant="caption" color="text.secondary">1 successful run</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Demo Documents Registry */}
        <Paper className="glass-panel" sx={{ p: 4, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <History sx={{ color: '#ec4899' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Sample Document Library
            </Typography>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Filename</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Risk Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {docsList.map((doc) => (
                  <TableRow 
                    key={doc.id}
                    onClick={() => handleOpenDoc(doc)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)' }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Description sx={{ color: '#8b5cf6' }} />
                        {doc.filename}
                      </Box>
                    </TableCell>
                    <TableCell>{doc.type}</TableCell>
                    <TableCell>
                      <Chip label="COMPLETED" size="small" color="success" sx={{ fontWeight: 700, borderRadius: 1.5, fontSize: 10 }} />
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label="22 - Low"
                        size="small"
                        sx={{ 
                          fontWeight: 700, 
                          borderRadius: 1.5,
                          bgcolor: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

      </Container>

      {/* Demo Modal audit Screen */}
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
              borderRadius: 3
            }
          }
        }}
      >
        {selectedDoc && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedDoc.filename}</Typography>
                <Typography variant="caption" color="text.secondary">Demo Mode Sandbox Review</Typography>
              </Box>
              <IconButton onClick={() => setSelectedDoc(null)} sx={{ color: 'text.secondary' }}>
                <Close />
              </IconButton>
            </DialogTitle>
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
            
            <DialogContent sx={{ p: 4, height: '70vh', overflow: 'hidden' }}>
              <Grid container spacing={4} sx={{ height: '100%' }}>
                
                {/* Left Panel: Zoomable Sheet Viewer */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
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
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>Page {currentPage} of 3</Typography>
                      <IconButton 
                        size="small"
                        disabled={currentPage === 3}
                        onClick={() => setCurrentPage(c => Math.min(3, c + 1))}
                        sx={{ color: 'text.secondary' }}
                      >
                        <ChevronRight sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Box>
                  </Box>

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
                    {activeDocPages && (
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
                    )}
                  </Box>
                </Grid>

                {/* Right Panel: Tabs */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                      <Tab label="Clauses (4)" />
                      <Tab label="Risks (2)" />
                      <Tab label="Q&A Chat" />
                      <Tab label="Compliance" />
                    </Tabs>
                  </Box>

                  <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    
                    {/* Tab 0: Summary */}
                    {activeTab === 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                        <Card sx={{ bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '20px !important' }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">CONTRACT COMPLIANCE INDEX</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 800, color: '#10b981', mt: 0.5 }}>Low Risk (22%)</Typography>
                            </Box>
                            <Box sx={{ width: 45, height: 45, borderRadius: '50%', border: '4px solid #10b981', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 800, fontSize: 11 }}>
                              22%
                            </Box>
                          </CardContent>
                        </Card>

                        <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ec4899', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Gavel fontSize="small" /> Executive Summary
                            </Typography>
                            <Typography variant="body2" color="rgba(255,255,255,0.75)" sx={{ fontSize: 13, lineHeight: 1.6 }}>
                              {sampleReport.executiveSummary}
                            </Typography>
                          </CardContent>
                        </Card>

                        <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#8b5cf6', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Payment fontSize="small" /> Financial Obligations
                            </Typography>
                            <Typography variant="body2" color="rgba(255,255,255,0.75)" sx={{ fontSize: 13, lineHeight: 1.6 }}>
                              {sampleReport.paymentTerms}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>
                    )}

                    {/* Tab 1: Clauses Accordion */}
                    {activeTab === 1 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {sampleClauses.map((c) => (
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
                                <Chip label={c.clauseType} size="small" sx={{ fontWeight: 700, fontSize: 10 }} />
                                <Chip label={c.riskLevel} size="small" color="success" sx={{ fontWeight: 700, fontSize: 9 }} />
                                <Typography variant="caption" color="text.secondary">Page {c.pageNumber}</Typography>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ px: 2, pb: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>EXPLANATION</Typography>
                                <Typography variant="body2" sx={{ fontSize: 13, mt: 0.5 }}>{c.summary}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CITATION</Typography>
                                <Box sx={{ p: 1.5, mt: 0.5, bgcolor: '#04020a', borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.04)', fontFamily: 'monospace', fontSize: 11 }}>
                                  "{c.snippet}"
                                </Box>
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                        ))}
                      </Box>
                    )}

                    {/* Tab 2: Risks */}
                    {activeTab === 2 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {sampleRisks.map((r) => (
                          <Paper key={r.id} sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `4px solid ${r.severity === 'LOW' ? '#10b981' : '#f59e0b'}`, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{r.category}</Typography>
                              <Chip label={r.severity} size="small" color={r.severity === 'LOW' ? 'success' : 'warning'} sx={{ fontWeight: 700, fontSize: 9 }} />
                            </Box>
                            <Typography variant="body2" color="rgba(255,255,255,0.75)" sx={{ fontSize: 13, mb: 2 }}>{r.description}</Typography>
                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 1.5 }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#10b981', display: 'block', mb: 0.5 }}>MITIGATION PLAN</Typography>
                            <Typography variant="body2" sx={{ fontSize: 12.5, color: '#10b981' }}>{r.mitigation}</Typography>
                          </Paper>
                        ))}
                      </Box>
                    )}

                    {/* Tab 3: Q&A Chat */}
                    {activeTab === 3 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, p: 2.5, bgcolor: 'rgba(0,0,0,0.15)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '38vh' }}>
                          {chatMessages.map((msg, index) => (
                            <Box key={index} sx={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                              <Box sx={{ p: 1.8, borderRadius: 2.5, fontSize: 13, bgcolor: msg.sender === 'user' ? '#8b5cf6' : 'rgba(255,255,255,0.03)', border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                                {msg.text}
                              </Box>
                            </Box>
                          ))}
                          <div ref={chatBottomRef} />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                          {[
                            "Who owns the IP?",
                            "How long is confidentiality?",
                            "What is the governing law?"
                          ].map((q, idx) => (
                            <Chip
                              key={idx}
                              label={q}
                              onClick={() => submitDemoQuestion(q)}
                              sx={{ fontSize: 10, fontWeight: 600, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(139,92,246,0.15)' } }}
                            />
                          ))}
                        </Box>

                        <Box component="form" onSubmit={handleSendDemoMessage} sx={{ display: 'flex', gap: 1.5 }}>
                          <input
                            type="text"
                            placeholder="Ask questions about this sample Mutual NDA..."
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
                          <Button type="submit" variant="contained" sx={{ bgcolor: '#8b5cf6', borderRadius: 2 }}>Ask</Button>
                        </Box>
                      </Box>
                    )}

                    {/* Tab 4: Compliance */}
                    {activeTab === 4 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {sampleChecklist.map((item, index) => (
                          <Paper key={index} sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `4px solid ${item.status === 'PASSED' ? '#10b981' : '#f59e0b'}`, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                              <Chip label={item.status} size="small" color={item.status === 'PASSED' ? 'success' : 'warning'} sx={{ fontWeight: 700, fontSize: 9 }} />
                            </Box>
                            <Typography variant="body2" color="rgba(255,255,255,0.75)" sx={{ fontSize: 13, mb: 2 }}>{item.description}</Typography>
                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 1.5 }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#b779f6', display: 'block', mb: 0.5 }}>NEGOTIATION PLAN</Typography>
                            <Typography variant="body2" sx={{ fontSize: 12.5, color: '#c084fc' }}>{item.mitigation}</Typography>
                          </Paper>
                        ))}
                      </Box>
                    )}

                  </Box>
                </Grid>

              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>

    </Box>
  );
};

export default DemoDashboard;
