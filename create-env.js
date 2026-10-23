const fs = require('fs');
const path = require('path');

const envContent = `GO_API_URL="http://127.0.0.1:8080"
`;

const envPath = path.join(__dirname, '.env.local');

fs.writeFileSync(envPath, envContent);

console.log('.env.local created with the Go API URL.');
