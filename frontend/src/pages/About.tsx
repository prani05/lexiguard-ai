import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent,
  Avatar
} from '@mui/material';
import { 
  ArrowBack,
  Shield, 
  AutoAwesome,
  Memory,
  Layers,
  Storage,
  Warning
} from '@mui/icons-material';

const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#060413', color: '#fff', py: 4 }}>
      <Container maxWidth="lg" className="animate-fade-in">
        
        {/* Header navigation bar */}
        <Box 
          className="glass-panel" 
          sx={{ 
            p: 3, 
            mb: 6, 
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
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              About <span style={{ color: '#8b5cf6' }}>LexiGuard</span>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Shield sx={{ fontSize: 24, color: '#8b5cf6' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>LexiGuard AI</Typography>
          </Box>
        </Box>

        {/* Mission & Vision Section */}
        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card className="glass-panel" sx={{ border: '1px solid rgba(255, 255, 255, 0.06)', height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(139, 92, 246, 0.1)' }}>
                    <Shield sx={{ color: '#8b5cf6' }} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Our Mission</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 14, lineHeight: 1.7 }}>
                  To democratize contract intelligence by providing individuals, startup founders, and commercial teams with instantaneous, plain English insights into legal exposure. We believe legal clarity should be accessible to everyone, helping users read and understand agreements before signing.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card className="glass-panel" sx={{ border: '1px solid rgba(255, 255, 255, 0.06)', height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(236, 72, 153, 0.1)' }}>
                    <AutoAwesome sx={{ color: '#ec4899' }} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Our Vision</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 14, lineHeight: 1.7 }}>
                  To establish the industry standard for smart, interactive document auditing. By coupling high-speed Optical Character Recognition (OCR) with large language model semantic intelligence and rule-based compliance engines, we automate pre-signature analysis and eliminate contract ambiguity.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Architecture & Tech Stack */}
        <Card className="glass-panel" sx={{ border: '1px solid rgba(255, 255, 255, 0.06)', mb: 6 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)' }}>
                <Layers sx={{ color: '#10b981' }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>System Architecture & Technologies</Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
              LexiGuard AI is engineered using a robust microservices-aligned architecture. The React user interface communicates with a spring-configured Java REST API backed by a secure PostgreSQL relational database.
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Memory sx={{ color: '#8b5cf6', mt: 0.2 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>AI Q&A RAG Pipeline</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}>
                      Leverages LangChain4j and pgvector to embed, query, and cite precise page citations for all conversational FAQ interactions.
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Storage sx={{ color: '#ec4899', mt: 0.2 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>PostgreSQL Datastore</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}>
                      Provides safe storage for registered user profiles, uploaded documents metadata, extracted pages, and calculated contract reports.
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <AutoAwesome sx={{ color: '#10b981', mt: 0.2 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Gemini 1.5 Integration</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}>
                      Performs semantic text processing to calculate risk indexes, extract payment targets, and recognize critical timeline dates.
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Legal Disclaimer Section */}
        <Card sx={{ bgcolor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', mb: 6 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <Avatar sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)' }}>
                <Warning sx={{ color: '#ef4444' }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#f87171' }}>Legal Disclaimer</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#fca5a5', lineHeight: 1.7, fontSize: 13.5 }}>
              LexiGuard AI provides automated legal document intelligence and contract summaries based on text patterns and large language models. The information, statistics, checklists, and reports generated by this application do not constitute formal legal counsel, document certification, or representation. Always consult a qualified legal professional or attorney before signing binding commercial contracts, employment letters, or NDAs.
            </Typography>
          </CardContent>
        </Card>

        {/* Footer info */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Built with ❤️ by Belum Pranay Kumar Reddy | Java Full Stack & AI Engineer
          </Typography>
        </Box>

      </Container>
    </Box>
  );
};

export default About;
