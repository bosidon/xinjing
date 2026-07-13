module.exports = {
  apps: [{
    name: 'psych-test',
    script: './backend/start_database.js',
    cwd: '/var/www/psych-test',
    env: {
      NODE_ENV: 'production',
      PORT: 3003,
      ALLOWED_ORIGINS: 'https://ceping.xianbao.online',
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    max_restarts: 10,
    restart_delay: 3000,
  }]
};
