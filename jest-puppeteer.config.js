const ci = Boolean(process.env.CI || false);

const baseOptions = {
  server: {
    command: 'npm run start',
    port: 30000,
    usedPortAction: 'ignore',
  },
}

const ciPipelineOptions = {
  launch: {
    headless: true,
    args: [
      '--ignore-certificate-errors',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  },
  server: baseOptions.server
}

module.exports = ci ? ciPipelineOptions : baseOptions;
