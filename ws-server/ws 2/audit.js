const fs = require('fs');
const { sendToTopic } = require('../kafka/producer');
const topics = require('../kafka/topics');

async function auditLog(event, details) {
  const log = { event, details, timestamp: new Date().toISOString() };
  fs.appendFile('ws-server/audit.log', JSON.stringify(log) + '\n', () => { });
  // Distributed: push to Kafka audit topic
  await sendToTopic(topics.AUDIT_LOG || 'audit.log', log);
  // Optionally: push to Redis or other sinks
}

module.exports = { auditLog }; 