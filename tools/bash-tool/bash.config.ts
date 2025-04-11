export const BASH_CONFIG = {
  ALLOWED_COMMANDS: [
    // Basic file and system inspection commands
    'pwd', 'ls', 'cat', 'echo', 'grep', 'find',
    // Node and package management
    'node', 'npm', 'npx', 'tsc', 'ng',
    // Text processing
    'head', 'tail', 'wc', 'sort', 'uniq', 'awk', 'sed',
    // Development helpers
    'jq', 'python', 'pip', 'curl', 'wget', 'python3',
    // Additional useful commands
    'touch', 'mkdir', 'rm', 'cp', 'mv',
    // Version and info commands
    'node --version', 'npm --version', 'python --version', 'python3 --version',
    // Compression
    'tar', 'gzip', 'gunzip', 'unzip',
    // Git commands
    'git', 'git init', 'git add', 'git commit', 'git status', 'git log',
    'git branch', 'git checkout', 'git pull', 'git push', 'git merge',
    'git clone', 'git remote', 'git diff'
  ],
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_TIMEOUT: 300000 // 5 minutes
};
