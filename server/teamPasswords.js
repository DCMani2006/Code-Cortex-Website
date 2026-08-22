import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PASSWORDS_FILE = path.join(__dirname, 'teamPasswords.json');

export function getTeamPasswords() {
  if (!fs.existsSync(PASSWORDS_FILE)) {
    fs.writeFileSync(PASSWORDS_FILE, JSON.stringify({}));
  }
  return JSON.parse(fs.readFileSync(PASSWORDS_FILE, 'utf-8'));
}

export function saveTeamPassword(teamId, password) {
  const passwords = getTeamPasswords();
  passwords[teamId] = password;
  fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 2));
}

export function verifyTeamPassword(teamId, password) {
  const passwords = getTeamPasswords();
  return passwords[teamId] === password;
}
