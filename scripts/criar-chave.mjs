import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const key = randomBytes(32).toString('hex');
try {
  await writeFile('.env.local', 'ADMIN_KEY=' + key + '\n', { flag: 'wx', mode: 0o600 });
  console.log('Chave criada em .env.local. Guarde o valor de ADMIN_KEY no seu gerenciador de senhas e cadastre o mesmo valor na Vercel.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Sua chave já está em .env.local. O arquivo foi preservado.');
}
