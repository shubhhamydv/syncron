import app from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Smart Roster Management API server running on port ${PORT}`);
  console.log(`   Health endpoint: http://localhost:${PORT}/api/health`);
});
