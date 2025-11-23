export const pdfStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
  color: #374151 !important; /* Gray-700 */
  padding: 40px !important;
  max-width: none !important;
  margin: 0 auto !important;
}

/* Accent border at the top of the content */
body::before {
  content: '';
  display: block;
  width: 100%;
  height: 6px;
  background-color: #2563eb;
  margin-bottom: 30px;
}

h1 {
  font-size: 32px !important;
  font-weight: 800 !important;
  color: #111827 !important; /* Gray-900 */
  margin-top: 0 !important;
  margin-bottom: 32px !important;
  padding-bottom: 16px !important;
  border-bottom: 2px solid #e5e7eb !important; /* Gray-200 */
  letter-spacing: -0.025em !important;
}

h2 {
  font-size: 24px !important;
  font-weight: 700 !important;
  color: #1f2937 !important; /* Gray-800 */
  margin-top: 40px !important;
  margin-bottom: 20px !important;
  padding-bottom: 10px !important;
  border-bottom: 1px solid #e5e7eb !important;
  letter-spacing: -0.015em !important;
}

h3 {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #2563eb !important; /* Blue-600 */
  margin-top: 28px !important;
  margin-bottom: 12px !important;
}

h3 a {
  color: #2563eb !important;
  text-decoration: none !important;
}

p {
  margin-bottom: 16px !important;
  text-align: left !important; /* Justify can look weird with bad hyphenation */
}

ul {
  margin-bottom: 16px !important;
  padding-left: 24px !important;
}

li {
  margin-bottom: 8px !important;
}

strong {
  font-weight: 600 !important;
  color: #111827 !important;
}

a {
  color: #2563eb !important;
  text-decoration: none !important;
}

a:hover {
  text-decoration: underline !important;
}

code {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace !important;
  font-size: 0.9em !important;
  background-color: #f3f4f6 !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  color: #dc2626 !important; /* Red-600 */
  border: 1px solid #e5e7eb !important;
}

hr {
  border: 0 !important;
  border-top: 1px solid #e5e7eb !important;
  margin: 40px 0 !important;
}

/* Custom spacing for metadata lines */
p strong {
  color: #4b5563 !important; /* Gray-600 */
}

/* Link metadata styling */
h3 + p {
    margin-top: -8px !important;
    font-size: 0.95em !important;
    color: #6b7280 !important;
}
`;
