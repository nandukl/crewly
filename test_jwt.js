const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1b3NmYnFndnV5emV6aWRnZmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTYzNTMsImV4cCI6MjA5ODU3MjM1M30.VcJT7aGti_cVw0b1ew1FfcdI_nLt8GcwiUCp7oTOMQY';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1b3NmYnFndnV5emV6aWRnZmJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk5NjM1MywiZXhwIjoyMDk4NTcyMzUzfQ.dLoi6uZBU3airSjV3OAXNfYaR7X7WFikBAtXQ2Yskr8';

console.log('Anon:', Buffer.from(anonKey.split('.')[1], 'base64').toString());
console.log('Service:', Buffer.from(serviceKey.split('.')[1], 'base64').toString());
