import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Chip,
  Paper,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { 
  Shield, 
  Description, 
  Warning, 
  AutoAwesome, 
  Gavel, 
  ExpandMore,
  ArrowForward,
  Help,
  Email,
  GitHub,
  LinkedIn
} from '@mui/icons-material';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  
  // Hero Right Simulation cycles
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const heroSteps = [
    { label: 'Uploading Document...', progress: 30, badge: null },
    { label: 'OCR Extracting Text...', progress: 55, badge: null },
    { label: 'Generating English Summary...', progress: 75, badge: null },
    { label: 'Detecting Liability Clauses...', progress: 85, badge: null },
    { label: 'Calculating Risk Scoring...', progress: 95, badge: null },
    { label: 'Completed Analysis!', progress: 100, badge: '22 - Low Risk' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStepIdx(prev => (prev + 1) % heroSteps.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const faqItems = [
    {
      q: "How does LexiGuard calculate the risk index?",
      a: "Our rule-based compliance engine aggregates detected clauses (such as territorial non-competes, governing states, and indemnification caps) against configured user review parameters, computing a risk rating between 0 and 100."
    },
    {
      q: "What file formats does LexiGuard audit?",
      a: "We support PDF, DOCX, and TXT files. For scanned pages or image attachments, our OCR service parses layout text before launching the AI summarize sequence."
    },
    {
      q: "Can I explore LexiGuard without an account?",
      a: "Absolutely! Click 'Try Sample Contract' in the hero section to instantly open our interactive sandboxed dashboard pre-populated with a mutual non-disclosure agreement."
    },
    {
      q: "Is my personal data encrypted?",
      a: "Yes. All communications use secure HTTPS TLS, and document storage is strictly isolated to your authenticated account."
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#060413', color: '#fff' }}>
      
      {/* Sticky Top Header Navigation */}
      <Box 
        sx={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 1100, 
          backdropFilter: 'blur(20px)', 
          bgcolor: 'rgba(6, 4, 19, 0.75)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          py: 2
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => navigate('/')}>
              <Shield sx={{ fontSize: 32, color: '#8b5cf6' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
                Lexi<span style={{ color: '#ec4899' }}>Guard</span> AI
              </Typography>
            </Box>

            {/* Nav links */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 4, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#94a3b8', cursor: 'pointer', '&:hover': { color: '#fff' } }} onClick={() => {
                document.getElementById('why-lexiguard')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Why LexiGuard
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#94a3b8', cursor: 'pointer', '&:hover': { color: '#fff' } }} onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Features
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#94a3b8', cursor: 'pointer', '&:hover': { color: '#fff' } }} onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                How it Works
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#94a3b8', cursor: 'pointer', '&:hover': { color: '#fff' } }} onClick={() => {
                document.getElementById('connect')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Connect
              </Typography>
            </Box>

            {/* Auth CTAs */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button 
                variant="text" 
                size="small" 
                onClick={() => navigate('/login')}
                sx={{ color: '#fff', fontWeight: 600, textTransform: 'none' }}
              >
                Login
              </Button>
              <Button 
                variant="contained" 
                size="small"
                onClick={() => navigate('/register')}
                sx={{ 
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  textTransform: 'none', 
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2.5
                }}
              >
                Get Started
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 10, md: 15 } }}>
        <Grid container spacing={6} sx={{ alignItems: 'center' }}>
          
          {/* Left Column */}
          <Grid size={{ xs: 12, md: 6 }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', px: 2, py: 0.8, borderRadius: 5, mb: 3 }}>
                <AutoAwesome sx={{ color: '#a78bfa', fontSize: 16 }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Legal Document Intelligence
                </Typography>
              </Box>
              
              <Typography variant="h2" sx={{ fontWeight: 850, lineHeight: 1.1, mb: 3, letterSpacing: -1.5 }}>
                AI Powered <br />
                <span style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Legal Document Intel
                </span>
              </Typography>
              
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.6, mb: 4, maxWidth: 500 }}>
                Review NDAs, Employment Contracts, Vendor Agreements and Service Contracts with AI-powered document intelligence. Flag hidden risks, calculate compliance scores, and ask RAG-based legal questions instantly.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={() => navigate('/register')}
                  endIcon={<ArrowForward />}
                  sx={{ 
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    textTransform: 'none', 
                    fontWeight: 700,
                    borderRadius: 2.5,
                    px: 3.5,
                    py: 1.5,
                    boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.4)'
                  }}
                >
                  Start Reviewing
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  onClick={() => navigate('/demo')}
                  sx={{ 
                    borderColor: '#8b5cf6',
                    color: '#b779f6',
                    textTransform: 'none', 
                    fontWeight: 700,
                    borderRadius: 2.5,
                    px: 3.5,
                    py: 1.5,
                    '&:hover': {
                      borderColor: '#a78bfa',
                      backgroundColor: 'rgba(139, 92, 246, 0.08)'
                    }
                  }}
                >
                  Try Sample Contract
                </Button>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>
                Supported contract file formats: <span style={{ color: '#fff' }}>PDF</span> &bull; <span style={{ color: '#fff' }}>DOCX</span> &bull; <span style={{ color: '#fff' }}>TXT</span>
              </Typography>
            </motion.div>
          </Grid>

          {/* Right Column: Live Mockup Simulator */}
          <Grid size={{ xs: 12, md: 6 }}>
            <motion.div
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            >
              <Box sx={{ position: 'relative' }}>
                <Box 
                  sx={{ 
                    borderRadius: 4, 
                    overflow: 'hidden', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    backgroundColor: '#0c0a1c',
                    p: 3.5
                  }}
                >
                  {/* Simulated UI Window Bar */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2, fontFamily: 'monospace', fontSize: 10 }}>
                      lexiguard-sandbox-analyzer
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>NDA_Mutual_Agreement.pdf</Typography>
                      <Typography variant="caption" color="text.secondary">Telemetry Simulation Process</Typography>
                    </Box>
                    {heroSteps[activeStepIdx].badge ? (
                      <Chip 
                        label={heroSteps[activeStepIdx].badge} 
                        color="success" 
                        size="small" 
                        sx={{ fontWeight: 800, transition: 'all 0.5s ease' }} 
                      />
                    ) : (
                      <Chip 
                        label="PROCESSING" 
                        color="warning" 
                        size="small" 
                        sx={{ fontWeight: 700 }} 
                      />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {heroSteps.map((step, idx) => {
                      const isPassed = activeStepIdx >= idx;
                      const isActive = activeStepIdx === idx;
                      return (
                        <Box 
                          key={idx} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            p: 1.8, 
                            borderRadius: 2,
                            bgcolor: isActive ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.01)',
                            border: isActive ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(255,255,255,0.03)',
                            transition: 'all 0.4s ease',
                            opacity: isPassed ? 1 : 0.25
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700, color: isActive ? '#c084fc' : '#fff' }}>
                            {step.label}
                          </Typography>
                          {isPassed && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
                {/* Blur backdrop glow */}
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: '-10%', 
                    left: '10%', 
                    width: '80%', 
                    height: '80%', 
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)',
                    filter: 'blur(85px)',
                    zIndex: -1
                  }} 
                />
              </Box>
            </motion.div>
          </Grid>
        </Grid>
      </Container>

      {/* Why LexiGuard / Comparison Section */}
      <Box id="why-lexiguard" sx={{ bgcolor: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)', py: 12 }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 1.5, mb: 1.5 }}>
              Speed Comparison
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
              Why Choose LexiGuard AI?
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Contracts hold key operational parameters. Discover how LexiGuard optimizes traditional legal review metrics:
            </Typography>
          </Box>

          <TableContainer component={Paper} className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Evaluation Metric</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Traditional Review</TableCell>
                  <TableCell sx={{ color: '#8b5cf6', fontWeight: 800 }}>LexiGuard AI Review</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { metric: "Review Time", trad: "30–90 Minutes", lex: "Under 2 Minutes (Instant)" },
                  { metric: "Cost Per Scan", trad: "$150 - $400 / Contract", lex: "$0 (Free Portfolio Sandbox)" },
                  { metric: "OCR Extraction", trad: "Manual Retyping / None", lex: "Automated OCR text indexing" },
                  { metric: "Governing Law Review", trad: "Manual clause checking", lex: "Instant state guidelines match" },
                  { metric: "RAG Q&A Queries", trad: "Flipping through paper pages", lex: "Dynamic chat with citations" }
                ].map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontWeight: 700, color: '#fff' }}>{row.metric}</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>{row.trad}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#b779f6' }}>{row.lex}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>

      {/* Core Features Grid */}
      <Box id="features" sx={{ py: 12, borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', letterSpacing: 1.5, mb: 1.5 }}>
              Core Features
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
              Everything you need to audit risk
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {[
              { title: "Smart OCR", icon: <Description sx={{ color: '#8b5cf6' }} />, desc: "Extract structured text from scanned paper contracts and low-res PDF files." },
              { title: "AI English Summary", icon: <AutoAwesome sx={{ color: '#ec4899' }} />, desc: "Understand complex agreements in plain English summaries including payment schedules." },
              { title: "Clause Detection", icon: <Gavel sx={{ color: '#10b981' }} />, desc: "Automatically identify and tag governing laws, non-competes, and liabilities." },
              { title: "Exposure Scoring", icon: <Warning sx={{ color: '#ef4444' }} />, desc: "Scrutinize liability caps. Score agreements from 0 to 100 based on guidelines." }
            ].map((f, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                <motion.div
                  whileHover={{ scale: 1.04, y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={{ height: '100%' }}
                >
                  <Card className="glass-panel" sx={{ border: '1px solid rgba(255,255,255,0.05)', height: '100%' }}>
                    <CardContent sx={{ p: 3.5 }}>
                      <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.03)', mb: 2 }}>{f.icon}</Avatar>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{f.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{f.desc}</Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How it Works Section */}
      <Box id="how-it-works" sx={{ py: 12 }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 1.5, mb: 1.5 }}>
              Pipeline Process
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
              How it Works
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { num: '1', title: 'Upload Agreement', desc: 'Securely drop PDF, DOCX, or TXT contracts into the uploader.' },
              { num: '2', title: 'Tesseract OCR Scan', desc: 'Converts scanned image frames into indexed text.' },
              { num: '3', title: 'Gemini NLP Extraction', desc: 'Tags liabilities, payment terms, and confidentiality periods.' },
              { num: '4', title: 'RAG Conversational Chat', desc: 'Queries vectors to return questions with citations.' },
              { num: '5', title: 'PDF Report Export', desc: 'Download compiled report files for signature preparation.' }
            ].map((step, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                <Avatar sx={{ bgcolor: '#8b5cf6', fontWeight: 800, width: 38, height: 38 }}>{step.num}</Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>{step.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>{step.desc}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Technologies Section */}
      <Box sx={{ py: 8, bgcolor: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 1.5, color: '#8b5cf6', textTransform: 'uppercase', display: 'block', mb: 4 }}>
            POWERED BY ENTERPRISE TECHNOLOGIES
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3.5, flexWrap: 'wrap' }}>
            {["Java", "Spring Boot", "React", "PostgreSQL", "Gemini", "LangChain4j", "PDFBox", "Material UI"].map((tech, idx) => (
              <Chip 
                key={idx}
                label={tech}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.85)',
                  fontWeight: 700,
                  fontSize: 12
                }}
              />
            ))}
          </Box>
        </Container>
      </Box>

      {/* FAQs Section */}
      <Container maxWidth="md" sx={{ py: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
            Frequently Asked Questions
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {faqItems.map((item, idx) => (
            <Accordion 
              key={idx}
              disableGutters
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.01)', 
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px !important',
                overflow: 'hidden',
                color: '#fff',
                '&:before': { display: 'none' }
              }}
            >
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />} sx={{ px: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Help sx={{ color: '#8b5cf6', fontSize: 18 }} /> {item.q}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3, pt: 1, color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
                {item.a}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Container>

      {/* Let's Connect Social Section */}
      <Box id="connect" sx={{ bgcolor: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)', py: 10 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>Let's Connect</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 6, maxWidth: 500, mx: 'auto' }}>
            Have questions about system designs or opportunities? Reach out via any of my channels.
          </Typography>

          <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
            {[
              { label: 'GitHub', icon: <GitHub />, url: 'https://github.com/prani05' },
              { label: 'LinkedIn', icon: <LinkedIn />, url: 'https://www.linkedin.com/in/belum-pranay/' },
              { label: 'Email', icon: <Email />, url: 'mailto:pranaykumarreddybelum@gmail.com' }
            ].map((social, idx) => (
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={idx}>
                <a href={social.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ scale: 1.05, y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Paper 
                    className="glass-panel" 
                    sx={{ 
                      p: 3, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: 1.5,
                      border: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.05)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Avatar sx={{ bgcolor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>{social.icon}</Avatar>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#fff' }}>{social.label}</Typography>
                  </Paper>
                </motion.div>
                </a>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 'auto', bgcolor: '#04020b', borderTop: '1px solid rgba(255, 255, 255, 0.05)', py: 4 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              &copy; 2026 LexiGuard AI.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Built with ❤️ by <span style={{ color: '#fff', fontWeight: 600 }}>Belum Pranay Kumar Reddy</span>
            </Typography>
          </Box>
        </Container>
      </Box>

    </Box>
  );
};

export default Landing;
