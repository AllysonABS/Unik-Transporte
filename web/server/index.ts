import express from 'express';
import compression from 'compression';
import { runMigrations } from './migrate.js';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import cluster from 'cluster';
import os from 'os';
import nodemailer from 'nodemailer';

// === CLUSTER MODE ===
const NUM_WORKERS = parseInt(process.env.WORKERS || '') || Math.min(os.cpus().length, 4);

if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
  const primaryPool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true',
  });
  runMigrations(primaryPool)
    .then(() => {
      console.log('[MIGRATION] Todas as migrations aplicadas.');
      primaryPool.end();
    })
    .catch(err => {
      console.error('[MIGRATION] Erro:', err.message);
      primaryPool.end();
    });
  console.log(`[CLUSTER] Primary ${process.pid} starting ${NUM_WORKERS} workers`);
  for (let i = 0; i < NUM_WORKERS; i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`[CLUSTER] Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
} else {
  startServer();
}

function startServer() {

// R2 (Cloudflare) config
if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  console.warn('R2 env vars não configuradas. Upload de fotos desabilitado.');
}
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});
const R2_BUCKET = process.env.R2_BUCKET || '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// === WHATSAPP (uazapi) ===
const UAZAPI_URL = process.env.UAZAPI_URL || '';
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN || '';

async function uazapiAdminRequest(path: string, method: string, body?: any) {
  const res = await fetch(`${UAZAPI_URL}${path}`, {
    method,
    headers: {'Content-Type': 'application/json', admintoken: UAZAPI_ADMIN_TOKEN},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na API do WhatsApp.');
  return data;
}

async function uazapiInstanceRequest(path: string, method: string, instanceToken: string, body?: any) {
  const res = await fetch(`${UAZAPI_URL}${path}`, {
    method,
    headers: {'Content-Type': 'application/json', token: instanceToken},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na API do WhatsApp.');
  return data;
}

// Envia a notificação de entrega (texto + fotos) pro cliente via WhatsApp.
// Silencioso em qualquer falha — não deve travar a confirmação de entrega do entregador.
async function enviarWhatsappEntrega(pedidoId: string) {
  try {
    const cfgRes = await pool.query("SELECT * FROM whatsapp_config WHERE status='connected' ORDER BY criado_em DESC LIMIT 1");
    if (cfgRes.rows.length === 0) return;
    const cfg = cfgRes.rows[0];

    const pedidoRes = await pool.query(
      `SELECT p.numero, p.cliente_nome, p.cliente_telefone, p.excursao_nome, e.nome_empresa
       FROM pedidos p JOIN empresas e ON e.id = p.empresa_id WHERE p.id=$1`,
      [pedidoId]
    );
    if (pedidoRes.rows.length === 0) return;
    const pedido = pedidoRes.rows[0];
    if (!pedido.cliente_telefone) return;

    const fotosRes = await pool.query('SELECT url FROM pedido_fotos WHERE pedido_id=$1 ORDER BY criado_em', [pedidoId]);
    const fotos = fotosRes.rows.map((r: any) => r.url as string);

    let numero = String(pedido.cliente_telefone).replace(/\D/g, '');
    if (!numero.startsWith('55')) numero = '55' + numero;

    const texto = `Olá, ${pedido.cliente_nome}!\n\nPassando para avisar que o seu pedido feito na ${pedido.nome_empresa} acabou de ser entregue com segurança na excursão ${pedido.excursao_nome}. 🚚✅\n\nAgradecemos a confiança em nossos serviços!`;

    await uazapiInstanceRequest('/send/text', 'POST', cfg.instance_token, {number: numero, text: texto});

    for (const url of fotos) {
      await uazapiInstanceRequest('/send/media', 'POST', cfg.instance_token, {number: numero, type: 'image', file: url});
    }
  } catch (err: any) {
    console.error('[WHATSAPP] Erro ao enviar notificação de entrega:', err.message);
  }
}
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: 10 * 1024 * 1024},
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Envie apenas imagens (JPEG, PNG, WebP).'));
    }
  },
});

// Inicializa Firebase Admin (via variável de ambiente)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.warn('FIREBASE_SERVICE_ACCOUNT não definida, push notifications desabilitadas.');
}

// === RATE LIMITING (in-memory, simples) ===
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT || '200'); // req/min por IP

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return next();
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Muitas requisições. Tente novamente em breve.' });
  }
  next();
}

// Limpa map a cada 5min pra não vazar memória
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300000);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET não definido. Defina no .env');
  process.exit(1);
}
const JWT_EXPIRES_IN = '7d';

type TokenPayload = { id: string; tipo: 'empresa' | 'entregador' | 'admin' };

function gerarToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN });
}

// Middleware de autenticação
function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET!) as TokenPayload;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

// Middleware — exige tipo 'admin' (usar depois de `auth`)
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as TokenPayload;
  if (user.tipo !== 'admin') return res.status(403).json({ error: 'Sem permissão.' });
  next();
}

// === SANITIZAÇÃO DE INPUT ===
// Só trim — NÃO fazer escape de HTML aqui. Isso é responsabilidade de quem
// RENDERIZA o dado, não de quem grava. O React já escapa texto automaticamente
// (a menos que se use dangerouslySetInnerHTML, o que este projeto não faz), e
// o Postgres é sempre acessado via query parametrizada. Fazer escape na
// gravação só corrompia o dado de verdade: cada edição reaplicava o escape
// em cima do que já tinha sido escapado antes, empilhando entidades
// ("Holanda & Melo" virava "Holanda &amp;amp; Melo" depois de 2 edições).
function sanitize(value: any): any {
  if (typeof value !== 'string') return value;
  return value.trim();
}

function sanitizeObj(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    sanitized[key] = sanitize(val);
  }
  return sanitized;
}

function sanitizeBody(req: express.Request, _res: express.Response, next: express.NextFunction) {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && typeof req.body === 'object') {
    req.body = sanitizeObj(req.body);
  }
  next();
}

// === VALIDAÇÕES ===
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(digits[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digits[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(digits[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(digits[10]);
}

function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const pesos1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const pesos2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += parseInt(digits[i]) * pesos1[i];
  let resto = soma % 11;
  if (parseInt(digits[12]) !== (resto < 2 ? 0 : 11 - resto)) return false;
  soma = 0;
  for (let i = 0; i < 13; i++) soma += parseInt(digits[i]) * pesos2[i];
  resto = soma % 11;
  return parseInt(digits[13]) === (resto < 2 ? 0 : 11 - resto);
}

function isStrongPassword(senha: string): {valid: boolean; message?: string} {
  if (senha.length < 8) return {valid: false, message: 'A senha deve ter no mínimo 8 caracteres.'};
  if (!/[A-Z]/.test(senha)) return {valid: false, message: 'A senha deve conter ao menos uma letra maiúscula.'};
  if (!/[0-9]/.test(senha)) return {valid: false, message: 'A senha deve conter ao menos um número.'};
  return {valid: true};
}

// === RATE LIMIT POR DOCUMENTO (anti brute-force login) ===
const loginAttemptMap = new Map<string, { count: number; blockedUntil: number }>();
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_DURATION = 300000; // 5 minutos

function loginRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const doc = req.body?.doc || req.body?.cnpj || req.body?.cpf || req.body?.email || '';
  if (!doc) return next();
  const now = Date.now();
  const entry = loginAttemptMap.get(doc);
  if (entry && now < entry.blockedUntil) {
    const minutos = Math.ceil((entry.blockedUntil - now) / 60000);
    return res.status(429).json({error: `Conta temporariamente bloqueada. Tente novamente em ${minutos} min.`});
  }
  if (entry && now >= entry.blockedUntil) {
    loginAttemptMap.delete(doc);
  }
  next();
}

function registrarLoginFalho(doc: string) {
  const entry = loginAttemptMap.get(doc) || { count: 0, blockedUntil: 0 };
  entry.count++;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + LOGIN_BLOCK_DURATION;
  }
  loginAttemptMap.set(doc, entry);
}

function limparLoginAttempt(doc: string) {
  loginAttemptMap.delete(doc);
}

// Limpa entries velhas a cada 10min
setInterval(() => {
  const now = Date.now();
  for (const [doc, entry] of loginAttemptMap) {
    if (now >= entry.blockedUntil && entry.blockedUntil > 0) loginAttemptMap.delete(doc);
  }
}, 600000);

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'https://transporte.unikcrm.com').split(',');

const app = express();
const r2Origin = (() => {
  try { return R2_PUBLIC_URL ? new URL(R2_PUBLIC_URL).origin : null; } catch { return null; }
})();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // Permite carregar as fotos dos pedidos, hospedadas no Cloudflare R2
      'img-src': ["'self'", 'data:', ...(r2Origin ? [r2Origin] : [])],
      // Autocompletar endereço por CEP (tela de cadastro) chama essas APIs
      // públicas direto do navegador — viacep é tentado primeiro, brasilapi
      // é o fallback (ver web/src/lib/cep.ts).
      'connect-src': ["'self'", 'https://viacep.com.br', 'https://brasilapi.com.br'],
    },
  },
}));
app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    // Apps mobile não enviam Origin — sempre permitir
    if (!origin) return callback(null, true);
    // Permitir origens configuradas
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Bloquear outras origens mas sem crashear
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeBody);
app.use(rateLimiter);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true',
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

// Cadastro de empresa
app.post('/api/cadastro', async (req, res) => {
  try {
    const { nome_empresa, nome_responsavel, email, telefone, senha, endereco, numero, bairro, cidade, estado, cep } = req.body;
    const cnpj = (req.body.cnpj || '').replace(/\D/g, '');
    const cpf = (req.body.cpf || '').replace(/\D/g, '');

    if (!nome_empresa || (!cnpj && !cpf) || !nome_responsavel || !email || !telefone || !senha) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
    }
    if (cnpj && !isValidCnpj(cnpj)) {
      return res.status(400).json({ error: 'CNPJ inválido.' });
    }
    if (cpf && !isValidCpf(cpf)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }
    const senhaCheck = isStrongPassword(senha);
    if (!senhaCheck.valid) {
      return res.status(400).json({ error: senhaCheck.message });
    }

    // Verificar duplicidade
    const existe = await pool.query(
      `SELECT id FROM empresas WHERE email = $1
       OR ($2::text IS NOT NULL AND cnpj = $2) OR ($3::text IS NOT NULL AND cpf = $3)`,
      [email, cnpj || null, cpf || null]
    );
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'E-mail, CNPJ ou CPF já cadastrado.' });
    }

    // Hash da senha
    const senha_hash = await bcrypt.hash(senha, 10);

    // Calcular vencimento (30 dias)
    const data_vencimento = new Date();
    data_vencimento.setDate(data_vencimento.getDate() + 30);

    // Inserir empresa
    const result = await pool.query(
      `INSERT INTO empresas (nome_empresa, cnpj, cpf, nome_responsavel, email, telefone, senha_hash, endereco, numero, bairro, cidade, estado, cep, data_vencimento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id, email`,
      [nome_empresa, cnpj || null, cpf || null, nome_responsavel, email, telefone, senha_hash, endereco || null, numero || null, bairro || null, cidade, estado, cep, data_vencimento]
    );

    const empresaId = result.rows[0].id;

    // Criar assinatura
    await pool.query(
      `INSERT INTO assinaturas (empresa_id, data_vencimento) VALUES ($1, $2)`,
      [empresaId, data_vencimento]
    );

    res.status(201).json({ success: true, empresa_id: empresaId });
  } catch (err: any) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Login da empresa (web) — CNPJ ou CPF, dependendo do que a empresa usou pra cadastrar
app.post('/api/login', async (req, res) => {
  try {
    const { senha } = req.body;
    const doc = (req.body.doc || req.body.cnpj || '').replace(/\D/g, '');
    if (!doc || !senha) {
      return res.status(400).json({ error: 'CPF/CNPJ e senha são obrigatórios.' });
    }

    const result = await pool.query('SELECT * FROM empresas WHERE (cnpj = $1 OR cpf = $1) AND ativa = true', [doc]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const empresa = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, empresa.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Verificar assinatura
    if (empresa.status_assinatura !== 'ativa') {
      return res.status(403).json({ error: 'Assinatura inativa.' });
    }

    const token = gerarToken({ id: empresa.id, tipo: 'empresa' });
    res.json({
      success: true, token,
      empresa: {
        id: empresa.id,
        nome_empresa: empresa.nome_empresa,
        cnpj: empresa.cnpj || '',
        cpf: empresa.cpf || '',
        nome_responsavel: empresa.nome_responsavel,
        email: empresa.email,
        telefone: empresa.telefone,
        endereco: empresa.endereco || '',
        numero: empresa.numero || '',
        bairro: empresa.bairro || '',
        cidade: empresa.cidade || '',
        estado: empresa.estado || '',
        cep: empresa.cep || '',
        status_assinatura: empresa.status_assinatura,
      },
    });
  } catch (err: any) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

const PORT = parseInt(process.env.PORT || '3001');

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'dist')));
}

// Buscar dados da empresa
app.get('/api/empresa/:id', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) return res.status(403).json({error: 'Sem permissão.'});
    const result = await pool.query(
      'SELECT id, nome_empresa, cnpj, cpf, nome_responsavel, email, telefone, endereco, numero, bairro, cidade, estado, cep, horario_funcionamento, status_assinatura FROM empresas WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({error: 'Empresa n\u00e3o encontrada.'});
    }
    res.json({success: true, empresa: result.rows[0]});
  } catch (err: any) {
    console.error('Erro ao buscar empresa:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Atualizar dados da empresa
app.put('/api/empresa/:id', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    const {nome_empresa, telefone, email, endereco, numero, bairro, cidade, estado, cep, horario_funcionamento} = req.body;
    await pool.query(
      `UPDATE empresas SET nome_empresa=$1, telefone=$2, email=$3, endereco=$4, numero=$5, bairro=$6, cidade=$7, estado=$8, cep=$9, horario_funcionamento=$10 WHERE id=$11`,
      [nome_empresa, telefone, email, endereco, numero || null, bairro || null, cidade, estado, cep, horario_funcionamento, id]
    );
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao atualizar empresa:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Empresa cadastra cliente manualmente (vinculo sem conta no app)
app.post('/api/empresa/:empresaId/cadastrar-cliente', auth, async (req, res) => {
  try {
    const {empresaId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== empresaId) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    const {nome, cpf, cnpj, rg, telefone, email, data_nascimento, cep, endereco, numero, bairro, cidade, estado, observacoes} = req.body;
    if (!nome || !telefone) {
      return res.status(400).json({error: 'Preencha o nome e o telefone.'});
    }
    if (cpf) {
      const existe = await pool.query('SELECT id FROM cliente_empresa WHERE empresa_id=$1 AND cpf=$2', [empresaId, cpf]);
      if (existe.rows.length > 0) return res.status(409).json({error: 'Já existe um cliente com este CPF vinculado.'});
    }
    if (cnpj) {
      const existe = await pool.query('SELECT id FROM cliente_empresa WHERE empresa_id=$1 AND cnpj=$2', [empresaId, cnpj]);
      if (existe.rows.length > 0) return res.status(409).json({error: 'Já existe um cliente com este CNPJ vinculado.'});
    }
    await pool.query(
      `INSERT INTO cliente_empresa (empresa_id, nome, cpf, cnpj, rg, telefone, email, data_nascimento, cep, endereco, numero, bairro, cidade, estado, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [empresaId, nome, cpf || null, cnpj || null, rg || null, telefone || null, email || null, data_nascimento || null, cep || null, endereco || null, numero || null, bairro || null, cidade || null, estado || null, observacoes || null]
    );
    res.status(201).json({success: true});
  } catch (err: any) {
    console.error('Erro ao cadastrar cliente manual:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Salvar FCM token da empresa
app.put('/api/empresa/:id/fcm-token', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) return res.status(403).json({error: 'Sem permissão.'});
    const {token} = req.body;
    if (!token) return res.status(400).json({error: 'Token obrigatório.'});
    await pool.query(
      `INSERT INTO empresa_fcm_tokens (empresa_id, token) VALUES ($1, $2)
       ON CONFLICT (empresa_id, token) DO UPDATE SET atualizado_em = NOW()`,
      [id, token]
    );
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao salvar FCM token:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Listar notificacoes da empresa
app.get('/api/empresa/:id/notificacoes', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) return res.status(403).json({error: 'Sem permissão.'});
    const result = await pool.query(
      'SELECT id, tipo, titulo, mensagem, dados, lida, criado_em FROM notificacoes WHERE empresa_id=$1 ORDER BY criado_em DESC LIMIT 50',
      [id]
    );
    res.json({success: true, notificacoes: result.rows});
  } catch (err: any) {
    console.error('Erro ao listar notificacoes:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Contar notificacoes nao lidas
app.get('/api/empresa/:id/notificacoes/nao-lidas', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) return res.status(403).json({error: 'Sem permissão.'});
    const result = await pool.query(
      'SELECT COUNT(*)::int as total FROM notificacoes WHERE empresa_id=$1 AND lida=false',
      [id]
    );
    res.json({success: true, total: result.rows[0].total});
  } catch (err: any) {
    console.error('Erro ao contar notificacoes:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Marcar notificacoes como lidas
app.put('/api/empresa/:id/notificacoes/marcar-lidas', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) return res.status(403).json({error: 'Sem permissão.'});
    await pool.query('UPDATE notificacoes SET lida=true WHERE empresa_id=$1 AND lida=false', [id]);
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao marcar lidas:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Listar clientes vinculados a uma empresa
app.get('/api/empresa/:id/clientes', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) return res.status(403).json({error: 'Sem permissão.'});
    const result = await pool.query(
      `SELECT ce.id as vinculo_id, ce.status, ce.nome, ce.cpf, ce.cnpj, ce.rg, ce.telefone, ce.email,
              ce.data_nascimento, ce.cep, ce.endereco, ce.numero, ce.bairro, ce.cidade, ce.estado, ce.observacoes, ce.data_vinculo
       FROM cliente_empresa ce
       WHERE ce.empresa_id = $1 ORDER BY ce.data_vinculo DESC`, [id]
    );
    const clientes = result.rows.map(r => ({
      vinculo_id: r.vinculo_id, status: r.status,
      nome: r.nome,
      cpf: r.cpf,
      cnpj: r.cnpj || '',
      rg: r.rg || '',
      telefone: r.telefone,
      email: r.email,
      data_nascimento: r.data_nascimento || '',
      cep: r.cep || '', endereco: r.endereco || '', numero: r.numero || '', bairro: r.bairro || '',
      cidade: r.cidade || '', estado: r.estado || '',
      observacoes: r.observacoes || '', data_vinculo: r.data_vinculo,
    }));
    res.json({success: true, clientes});
  } catch (err: any) {
    console.error('Erro ao listar clientes da empresa:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Atualizar dados do cliente (visão lojista - salva no vínculo)
app.put('/api/empresa/vinculo/:vinculoId', auth, async (req, res) => {
  try {
    const {vinculoId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa') return res.status(403).json({error: 'Sem permissão.'});
    const owner = await pool.query('SELECT empresa_id FROM cliente_empresa WHERE id=$1', [vinculoId]);
    if (owner.rows.length === 0) return res.status(404).json({error: 'Vínculo não encontrado.'});
    if (owner.rows[0].empresa_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    const {nome, cpf, cnpj, rg, telefone, email, data_nascimento, cep, endereco, numero, bairro, cidade, estado, observacoes} = req.body;
    if (!nome || !telefone) {
      return res.status(400).json({error: 'Preencha o nome e o telefone.'});
    }
    await pool.query(
      `UPDATE cliente_empresa SET nome=$1, cpf=$2, cnpj=$3, rg=$4, telefone=$5, email=$6,
       data_nascimento=$7, cep=$8, endereco=$9, numero=$10, bairro=$11, cidade=$12, estado=$13, observacoes=$14 WHERE id=$15`,
      [nome, cpf, cnpj, rg, telefone, email, data_nascimento, cep, endereco, numero || null, bairro || null, cidade, estado, observacoes, vinculoId]
    );
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao atualizar vinculo:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Bloquear cliente (não pode se vincular novamente)
app.put('/api/empresa/vinculo/:vinculoId/bloquear', auth, async (req, res) => {
  try {
    const {vinculoId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa') return res.status(403).json({error: 'Sem permissão.'});
    const owner = await pool.query('SELECT empresa_id FROM cliente_empresa WHERE id=$1', [vinculoId]);
    if (owner.rows.length === 0) return res.status(404).json({error: 'Vínculo não encontrado.'});
    if (owner.rows[0].empresa_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    await pool.query('UPDATE cliente_empresa SET status=$1 WHERE id=$2', ['bloqueado', vinculoId]);
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao bloquear:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Excluir vinculo (cliente pode se vincular novamente)
app.delete('/api/empresa/vinculo/:vinculoId', auth, async (req, res) => {
  try {
    const {vinculoId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa') return res.status(403).json({error: 'Sem permissão.'});
    const owner = await pool.query('SELECT empresa_id FROM cliente_empresa WHERE id=$1', [vinculoId]);
    if (owner.rows.length === 0) return res.status(404).json({error: 'Vínculo não encontrado.'});
    if (owner.rows[0].empresa_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    await pool.query('DELETE FROM cliente_empresa WHERE id=$1', [vinculoId]);
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao excluir vinculo:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// === ENTREGADORES ===

// Listar entregadores da empresa
app.get('/api/empresa/:id/entregadores', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) return res.status(403).json({error: 'Sem permissão.'});
    const result = await pool.query(
      `SELECT d.id, d.nome, d.cpf, d.telefone, de.ativo
       FROM entregador_empresa de JOIN entregadores d ON d.id = de.entregador_id
       WHERE de.empresa_id=$1 ORDER BY de.data_vinculo DESC`, [id]
    );
    res.json({success: true, entregadores: result.rows});
  } catch (err: any) {
    console.error('Erro ao listar entregadores:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Buscar entregador já auto-cadastrado no app, pelo CPF que ele passou pra
// empresa (fora do sistema — telefone, WhatsApp etc.). Não cria conta nenhuma.
app.get('/api/empresa/:id/entregadores/buscar', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    const cpfLimpo = String(req.query.cpf || '').replace(/\D/g, '');
    if (!cpfLimpo) return res.status(400).json({error: 'Informe o CPF.'});
    const result = await pool.query('SELECT id, nome, cpf, telefone FROM entregadores WHERE cpf=$1', [cpfLimpo]);
    if (result.rows.length === 0) {
      return res.status(404).json({error: 'Nenhum entregador com esse CPF. Peça pra ele criar a conta no app primeiro.'});
    }
    const entregadorId = result.rows[0].id;
    const vinculo = await pool.query('SELECT id FROM entregador_empresa WHERE entregador_id=$1 AND empresa_id=$2', [entregadorId, id]);
    if (vinculo.rows.length > 0) return res.status(409).json({error: 'Este entregador já está vinculado a sua empresa.'});
    res.json({success: true, entregador: result.rows[0]});
  } catch (err: any) {
    console.error('Erro ao buscar entregador:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Vincula um entregador que já se auto-cadastrou no app (nunca cria conta)
app.post('/api/empresa/:id/entregadores', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    const cpfLimpo = (req.body.cpf || '').replace(/\D/g, '');
    if (!cpfLimpo) return res.status(400).json({error: 'Informe o CPF.'});
    const existe = await pool.query('SELECT id FROM entregadores WHERE cpf=$1', [cpfLimpo]);
    if (existe.rows.length === 0) {
      return res.status(404).json({error: 'Nenhum entregador com esse CPF. Peça pra ele criar a conta no app primeiro.'});
    }
    const entregadorId = existe.rows[0].id;
    const vinculo = await pool.query('SELECT id FROM entregador_empresa WHERE entregador_id=$1 AND empresa_id=$2', [entregadorId, id]);
    if (vinculo.rows.length > 0) return res.status(409).json({error: 'Este entregador já está vinculado a sua empresa.'});
    await pool.query('INSERT INTO entregador_empresa (entregador_id, empresa_id) VALUES ($1,$2)', [entregadorId, id]);
    res.status(201).json({success: true, id: entregadorId});
  } catch (err: any) {
    console.error('Erro ao vincular entregador:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Ativar/Desativar entregador (no vínculo com a empresa)
app.put('/api/empresa/:empresaId/entregadores/:entregadorId/toggle', auth, async (req, res) => {
  try {
    const {empresaId, entregadorId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== empresaId) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    await pool.query('UPDATE entregador_empresa SET ativo = NOT ativo WHERE entregador_id=$1 AND empresa_id=$2', [entregadorId, empresaId]);
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao toggle entregador:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Excluir vínculo do entregador com a empresa
app.delete('/api/empresa/:empresaId/entregadores/:entregadorId', auth, async (req, res) => {
  try {
    const {empresaId, entregadorId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== empresaId) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    await pool.query('DELETE FROM entregador_empresa WHERE entregador_id=$1 AND empresa_id=$2', [entregadorId, empresaId]);
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao excluir entregador:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Entregador vê as empresas que atende (ativas e inativas — a empresa pode
// desativar o vínculo sem avisar, então mostramos os dois estados aqui).
app.get('/api/entregador/:entregadorId/empresas', auth, async (req, res) => {
  try {
    const {entregadorId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'entregador' || user.id !== entregadorId) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    const result = await pool.query(
      `SELECT e.id, e.nome_empresa, e.cidade, e.estado, de.ativo, de.data_vinculo
       FROM entregador_empresa de JOIN empresas e ON e.id = de.empresa_id
       WHERE de.entregador_id=$1 ORDER BY e.nome_empresa`, [entregadorId]
    );
    res.json({success: true, empresas: result.rows});
  } catch (err: any) {
    console.error('Erro ao listar empresas do entregador:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Entregador se desvincula de uma empresa por conta própria — não depende
// da empresa aprovar. Bloqueado se ele tiver pedido pendente dela, pra não
// deixar uma coleta/entrega orfã no meio do caminho.
app.delete('/api/entregador/:entregadorId/empresas/:empresaId', auth, async (req, res) => {
  try {
    const {entregadorId, empresaId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'entregador' || user.id !== entregadorId) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    const pendente = await pool.query(
      `SELECT id FROM pedidos WHERE entregador_id=$1 AND empresa_id=$2 AND status IN ('aguardando','em_transito') LIMIT 1`,
      [entregadorId, empresaId]
    );
    if (pendente.rows.length > 0) {
      return res.status(409).json({error: 'Você tem pedido pendente dessa empresa. Finalize a coleta/entrega antes de se desvincular.'});
    }
    const result = await pool.query('DELETE FROM entregador_empresa WHERE entregador_id=$1 AND empresa_id=$2', [entregadorId, empresaId]);
    if (result.rowCount === 0) return res.status(404).json({error: 'Vínculo não encontrado.'});
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao desvincular empresa:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Auto-cadastro do entregador (ele cria a pr\u00f3pria conta no app; o v\u00ednculo
// com uma empresa \u00e9 feito depois, pela empresa, buscando pelo CPF)
app.post('/api/cadastro-entregador', async (req, res) => {
  try {
    const {nome, cpf, telefone, senha} = req.body;
    if (!nome || !cpf || !senha) {
      return res.status(400).json({error: 'Preencha nome, CPF e senha.'});
    }
    if (!isValidCpf(cpf)) {
      return res.status(400).json({error: 'CPF inv\u00e1lido.'});
    }
    const senhaCheck = isStrongPassword(senha);
    if (!senhaCheck.valid) {
      return res.status(400).json({error: senhaCheck.message});
    }
    const cpfLimpo = cpf.replace(/\D/g, '');
    const existe = await pool.query('SELECT id FROM entregadores WHERE cpf=$1', [cpfLimpo]);
    if (existe.rows.length > 0) {
      return res.status(409).json({error: 'J\u00e1 existe uma conta com este CPF.'});
    }
    const senha_hash = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      'INSERT INTO entregadores (nome, cpf, telefone, senha_hash) VALUES ($1,$2,$3,$4) RETURNING id',
      [nome, cpfLimpo, telefone || null, senha_hash]
    );
    res.status(201).json({success: true, entregador_id: result.rows[0].id});
  } catch (err: any) {
    console.error('Erro no cadastro entregador:', err.message);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Entregador edita os próprios dados (tela de configurações do app)
app.put('/api/entregador/:entregadorId', auth, async (req, res) => {
  try {
    const {entregadorId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'entregador' || user.id !== entregadorId) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    const {nome, telefone} = req.body;
    if (!nome) return res.status(400).json({error: 'Informe o nome.'});
    await pool.query('UPDATE entregadores SET nome=$1, telefone=$2 WHERE id=$3', [nome, telefone || null, entregadorId]);
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao atualizar entregador:', err.message);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Login entregador \u2014 funciona mesmo sem nenhuma empresa vinculada ainda
// (o entregador cria a conta primeiro, a empresa vincula depois)
app.post('/api/login-entregador', async (req, res) => {
  try {
    const {cpf, senha} = req.body;
    if (!cpf || !senha) return res.status(400).json({error: 'CPF e senha s\u00e3o obrigat\u00f3rios.'});
    const result = await pool.query('SELECT * FROM entregadores WHERE cpf=$1 AND ativo=true', [cpf]);
    if (result.rows.length === 0) return res.status(401).json({error: 'Credenciais inv\u00e1lidas.'});
    const ent = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, ent.senha_hash);
    if (!senhaValida) return res.status(401).json({error: 'Credenciais inv\u00e1lidas.'});
    const empresas = await pool.query(
      `SELECT e.id, e.nome_empresa FROM entregador_empresa de JOIN empresas e ON e.id = de.empresa_id
       WHERE de.entregador_id=$1 AND de.ativo=true`, [ent.id]
    );
    const token = gerarToken({ id: ent.id, tipo: 'entregador' });
    res.json({
      success: true, token,
      entregador: {
        id: ent.id, nome: ent.nome, cpf: ent.cpf, telefone: ent.telefone || '',
        empresas: empresas.rows,
      },
    });
  } catch (err: any) {
    console.error('Erro no login entregador:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// === PEDIDOS ===

// Criar pedido
app.post('/api/empresa/:empresaId/pedidos', auth, async (req, res) => {
  try {
    const {empresaId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== empresaId) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    const {entregador_id, excursao_id, cliente_nome, entregador_nome, excursao_nome, cliente_telefone, volumes, descricao} = req.body;
    if (!cliente_nome || !entregador_nome || !excursao_nome) {
      return res.status(400).json({error: 'Preencha cliente, entregador e excurs\u00e3o.'});
    }
    const result = await pool.query(
      `INSERT INTO pedidos (empresa_id, entregador_id, excursao_id, cliente_nome, entregador_nome, excursao_nome, cliente_telefone, volumes, descricao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [empresaId, entregador_id || null, excursao_id || null, cliente_nome, entregador_nome, excursao_nome, cliente_telefone || null, volumes || 1, descricao || null]
    );
    const pedidoId = result.rows[0].id;
    // Busca o numero sequencial
    const numRes = await pool.query('SELECT numero FROM pedidos WHERE id=$1', [pedidoId]);
    const numeroPedido = numRes.rows[0].numero;
    // Cria etapas padr\u00e3o
    const etapas = ['Pedido recebido', 'Pedido Conferido', 'Entregue na excurs\u00e3o'];
    for (let i = 0; i < etapas.length; i++) {
      const concluida = i === 0;
      const hora = i === 0 ? new Date() : null;
      await pool.query(
        'INSERT INTO pedido_etapas (pedido_id, nome, concluida, hora, ordem) VALUES ($1,$2,$3,$4,$5)',
        [pedidoId, etapas[i], concluida, hora, i]
      );
    }
    res.status(201).json({success: true, pedido_id: pedidoId, numero: numeroPedido});
  } catch (err: any) {
    console.error('Erro ao criar pedido:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Listar pedidos da empresa
app.get('/api/empresa/:empresaId/pedidos', auth, async (req, res) => {
  try {
    const {empresaId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== empresaId) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await pool.query(
      `SELECT p.*, 
        (SELECT json_agg(e ORDER BY e.ordem) FROM pedido_etapas e WHERE e.pedido_id = p.id) as etapas,
        (SELECT json_agg(f ORDER BY f.criado_em) FROM pedido_fotos f WHERE f.pedido_id = p.id) as fotos
       FROM pedidos p WHERE p.empresa_id=$1 ORDER BY p.criado_em DESC LIMIT $2 OFFSET $3`,
      [empresaId, limit, offset]
    );
    res.json({success: true, pedidos: result.rows});
  } catch (err: any) {
    console.error('Erro ao listar pedidos:', err.message);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Dashboard da empresa — pedidos + counts em uma única chamada
app.get('/api/empresa/:id/dashboard', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) return res.status(403).json({error: 'Sem permissão.'});

    const [pedidosRes, statsRes] = await Promise.all([
      pool.query(
        `SELECT p.*,
          (SELECT json_agg(e ORDER BY e.ordem) FROM pedido_etapas e WHERE e.pedido_id = p.id) as etapas,
          (SELECT json_agg(f ORDER BY f.criado_em) FROM pedido_fotos f WHERE f.pedido_id = p.id) as fotos
         FROM pedidos p WHERE p.empresa_id=$1 ORDER BY p.criado_em DESC LIMIT 50`,
        [id]
      ),
      pool.query(
        `SELECT
          (SELECT COUNT(*)::int FROM notificacoes WHERE empresa_id=$1 AND lida=false) as notificacoes_nao_lidas,
          (SELECT COUNT(*)::int FROM cliente_empresa WHERE empresa_id=$1 AND status!='bloqueado') as total_clientes,
          (SELECT COUNT(*)::int FROM entregador_empresa WHERE empresa_id=$1 AND ativo=true) as total_entregadores,
          (SELECT COUNT(*)::int FROM excursoes WHERE empresa_id=$1) as total_excursoes`,
        [id]
      ),
    ]);

    res.json({success: true, pedidos: pedidosRes.rows, stats: statsRes.rows[0]});
  } catch (err: any) {
    console.error('Erro ao buscar dashboard:', err.message);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Listar pedidos do entregador
app.get('/api/entregador/:entregadorId/pedidos', auth, async (req, res) => {
  try {
    const {entregadorId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'entregador' || user.id !== entregadorId) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await pool.query(
      `SELECT p.*,
        (SELECT json_agg(e ORDER BY e.ordem) FROM pedido_etapas e WHERE e.pedido_id = p.id) as etapas,
        (SELECT json_agg(f ORDER BY f.criado_em) FROM pedido_fotos f WHERE f.pedido_id = p.id) as fotos,
        emp.nome_empresa
       FROM pedidos p JOIN empresas emp ON emp.id = p.empresa_id
       WHERE p.entregador_id=$1 ORDER BY p.criado_em DESC LIMIT $2 OFFSET $3`,
      [entregadorId, limit, offset]
    );
    res.json({success: true, pedidos: result.rows});
  } catch (err: any) {
    console.error('Erro ao listar pedidos do entregador:', err.message);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Atualizar status do pedido
app.put('/api/pedidos/:pedidoId/status', auth, async (req, res) => {
  try {
    const {pedidoId} = req.params;
    const user = (req as any).user as TokenPayload;
    const {status} = req.body;
    const allowedStatuses = ['aguardando', 'em_transito', 'entregue'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({error: 'Status inválido.'});
    }
    // Verifica ownership
    const pedido = await pool.query('SELECT empresa_id, entregador_id FROM pedidos WHERE id=$1', [pedidoId]);
    if (pedido.rows.length === 0) return res.status(404).json({error: 'Pedido não encontrado.'});
    const p = pedido.rows[0];
    if (user.tipo === 'empresa' && p.empresa_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    if (user.tipo === 'entregador' && p.entregador_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    await pool.query('UPDATE pedidos SET status=$1, atualizado_em=NOW() WHERE id=$2', [status, pedidoId]);
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao atualizar status:', err.message);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Concluir etapa do pedido por ID
app.put('/api/pedidos/:pedidoId/etapas/:etapaId/concluir', auth, async (req, res) => {
  try {
    const {pedidoId, etapaId} = req.params;
    const user = (req as any).user as TokenPayload;
    const pedido = await pool.query('SELECT empresa_id, entregador_id FROM pedidos WHERE id=$1', [pedidoId]);
    if (pedido.rows.length === 0) return res.status(404).json({error: 'Pedido não encontrado.'});
    const p = pedido.rows[0];
    if (user.tipo === 'empresa' && p.empresa_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    if (user.tipo === 'entregador' && p.entregador_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    await pool.query('UPDATE pedido_etapas SET concluida=true, hora=NOW() WHERE id=$1 AND pedido_id=$2', [etapaId, pedidoId]);
    const total = await pool.query('SELECT COUNT(*)::int as total FROM pedido_etapas WHERE pedido_id=$1', [pedidoId]);
    const concluidas = await pool.query('SELECT COUNT(*)::int as total FROM pedido_etapas WHERE pedido_id=$1 AND concluida=true', [pedidoId]);
    if (concluidas.rows[0].total >= total.rows[0].total) {
      await pool.query('UPDATE pedidos SET status=$1, atualizado_em=NOW() WHERE id=$2', ['entregue', pedidoId]);
    } else if (concluidas.rows[0].total > 1) {
      await pool.query('UPDATE pedidos SET status=$1, atualizado_em=NOW() WHERE id=$2', ['em_transito', pedidoId]);
    }
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao concluir etapa:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Concluir etapas por tipo (coleta ou entrega)
app.put('/api/pedidos/:pedidoId/concluir-etapas', auth, async (req, res) => {
  try {
    const {pedidoId} = req.params;
    const user = (req as any).user as TokenPayload;
    const pedido = await pool.query('SELECT empresa_id, entregador_id FROM pedidos WHERE id=$1', [pedidoId]);
    if (pedido.rows.length === 0) return res.status(404).json({error: 'Pedido não encontrado.'});
    const p = pedido.rows[0];
    if (user.tipo === 'empresa' && p.empresa_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    if (user.tipo === 'entregador' && p.entregador_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    const {tipo} = req.body; // 'coleta' ou 'entrega'
    if (tipo === 'coleta') {
      // Marca "Pedido Conferido"
      await pool.query(
        `UPDATE pedido_etapas SET concluida=true, hora=NOW() WHERE pedido_id=$1 AND nome = 'Pedido Conferido' AND concluida=false`,
        [pedidoId]
      );
      await pool.query('UPDATE pedidos SET status=$1, atualizado_em=NOW() WHERE id=$2', ['em_transito', pedidoId]);
    } else if (tipo === 'entrega') {
      // Marca todas as etapas restantes
      await pool.query(
        'UPDATE pedido_etapas SET concluida=true, hora=NOW() WHERE pedido_id=$1 AND concluida=false',
        [pedidoId]
      );
      await pool.query('UPDATE pedidos SET status=$1, atualizado_em=NOW() WHERE id=$2', ['entregue', pedidoId]);
      // Não aguarda — o envio ao WhatsApp roda em segundo plano, sem travar a resposta pro entregador.
      // A função já trata os próprios erros internamente (nunca rejeita).
      enviarWhatsappEntrega(pedidoId);
    }
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao concluir etapas:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// === PRESIGNED URL - Client faz upload DIRETO pro R2 (não passa pelo server) ===
app.post('/api/pedidos/:pedidoId/upload-url', auth, async (req, res) => {
  try {
    const {pedidoId} = req.params;
    const user = (req as any).user as TokenPayload;
    const {etapa, contentType, ext} = req.body;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (contentType && !allowedTypes.includes(contentType)) {
      return res.status(400).json({error: 'Tipo de arquivo não permitido.'});
    }
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
    if (ext && !allowedExts.includes(ext.toLowerCase())) {
      return res.status(400).json({error: 'Extensão de arquivo não permitida.'});
    }

    const pedidoRes = await pool.query('SELECT empresa_id, entregador_id, cliente_nome FROM pedidos WHERE id=$1', [pedidoId]);
    if (pedidoRes.rows.length === 0) return res.status(404).json({error: 'Pedido não encontrado.'});
    const {empresa_id, entregador_id, cliente_nome} = pedidoRes.rows[0];
    if (user.tipo === 'empresa' && empresa_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    if (user.tipo === 'entregador' && entregador_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    const clienteSlug = (cliente_nome || 'sem-cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    const key = `${empresa_id}/${clienteSlug}/${pedidoId}/${crypto.randomUUID()}.${ext || 'jpg'}`;
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType || 'image/jpeg',
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    // NÃO inserir aqui — o cliente confirma após upload bem-sucedido via /confirmar-foto
    res.json({ success: true, uploadUrl, publicUrl });
  } catch (err: any) {
    console.error('Erro ao gerar URL de upload:', err);
    res.status(500).json({error: 'Erro ao gerar URL.'});
  }
});

// Confirmar foto após upload direto pro R2 (chamado pelo app após upload bem-sucedido)
app.post('/api/pedidos/:pedidoId/confirmar-foto', auth, async (req, res) => {
  try {
    const {pedidoId} = req.params;
    const user = (req as any).user as TokenPayload;
    const {url, etapa} = req.body;
    if (!url) return res.status(400).json({error: 'URL da foto obrigatória.'});

    const pedidoRes = await pool.query('SELECT empresa_id, entregador_id FROM pedidos WHERE id=$1', [pedidoId]);
    if (pedidoRes.rows.length === 0) return res.status(404).json({error: 'Pedido não encontrado.'});
    const {empresa_id, entregador_id} = pedidoRes.rows[0];
    if (user.tipo === 'empresa' && empresa_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    if (user.tipo === 'entregador' && entregador_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});

    await pool.query(
      'INSERT INTO pedido_fotos (pedido_id, url, etapa) VALUES ($1, $2, $3)',
      [pedidoId, url, etapa || 'geral']
    );
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao confirmar foto:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Upload de foto do pedido (fallback - mantém compatibilidade)
app.post('/api/pedidos/:pedidoId/fotos', auth, upload.single('foto'), async (req, res) => {
  try {
    const {pedidoId} = req.params;
    const user = (req as any).user as TokenPayload;
    const etapa = req.body.etapa || 'geral';
    const file = req.file;
    if (!file) return res.status(400).json({error: 'Nenhuma foto enviada.'});

    const pedidoRes = await pool.query('SELECT empresa_id, entregador_id, cliente_nome FROM pedidos WHERE id=$1', [pedidoId]);
    if (pedidoRes.rows.length === 0) return res.status(404).json({error: 'Pedido não encontrado.'});
    const {empresa_id, entregador_id, cliente_nome} = pedidoRes.rows[0];
    if (user.tipo === 'empresa' && empresa_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    if (user.tipo === 'entregador' && entregador_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    const clienteSlug = (cliente_nome || 'sem-cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    const ext = file.originalname.split('.').pop() || 'jpg';
    const key = `${empresa_id}/${clienteSlug}/${pedidoId}/${crypto.randomUUID()}.${ext}`;

    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const url = `${R2_PUBLIC_URL}/${key}`;
    await pool.query(
      'INSERT INTO pedido_fotos (pedido_id, url, etapa) VALUES ($1, $2, $3)',
      [pedidoId, url, etapa]
    );
    res.status(201).json({success: true, url});
  } catch (err: any) {
    console.error('Erro ao fazer upload:', err);
    res.status(500).json({error: 'Erro ao enviar foto.'});
  }
});

// Salvar observação do pedido (entregador)
app.put('/api/pedidos/:pedidoId/observacao', auth, async (req, res) => {
  try {
    const {pedidoId} = req.params;
    const user = (req as any).user as TokenPayload;
    const pedido = await pool.query('SELECT empresa_id, entregador_id FROM pedidos WHERE id=$1', [pedidoId]);
    if (pedido.rows.length === 0) return res.status(404).json({error: 'Pedido não encontrado.'});
    const p = pedido.rows[0];
    if (user.tipo === 'entregador' && p.entregador_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    if (user.tipo === 'empresa' && p.empresa_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    const {observacao} = req.body;
    await pool.query('UPDATE pedidos SET observacao=$1, atualizado_em=NOW() WHERE id=$2', [observacao || null, pedidoId]);
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao salvar observa\u00e7\u00e3o:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// === EXCURSÕES ===

// Listar excursões da empresa
app.get('/api/empresa/:id/excursoes', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) return res.status(403).json({error: 'Sem permissão.'});
    const result = await pool.query(
      'SELECT id, nome, setor, vaga, responsavel, telefone, observacoes FROM excursoes WHERE empresa_id=$1 ORDER BY data_cadastro DESC', [id]
    );
    res.json({success: true, excursoes: result.rows});
  } catch (err: any) {
    console.error('Erro ao listar excursões:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Cadastrar excursão
app.post('/api/empresa/:id/excursoes', auth, async (req, res) => {
  try {
    const {id} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa' || user.id !== id) {
      return res.status(403).json({error: 'Sem permissão.'});
    }
    const {nome, setor, vaga, responsavel, telefone, observacoes} = req.body;
    if (!nome || !setor || !vaga || !responsavel) {
      return res.status(400).json({error: 'Preencha todos os campos obrigatórios.'});
    }
    if (setor.length > 200 || vaga.length > 200) {
      return res.status(400).json({error: 'Setor e vaga devem ter no máximo 200 caracteres.'});
    }
    const result = await pool.query(
      'INSERT INTO excursoes (empresa_id, nome, setor, vaga, responsavel, telefone, observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [id, nome, setor, vaga, responsavel, telefone || null, observacoes || null]
    );
    res.status(201).json({success: true, id: result.rows[0].id});
  } catch (err: any) {
    console.error('Erro ao cadastrar excursão:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Atualizar excursão
app.put('/api/excursoes/:excursaoId', auth, async (req, res) => {
  try {
    const {excursaoId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa') return res.status(403).json({error: 'Sem permissão.'});
    // Verifica ownership
    const owner = await pool.query('SELECT empresa_id FROM excursoes WHERE id=$1', [excursaoId]);
    if (owner.rows.length === 0) return res.status(404).json({error: 'Excursão não encontrada.'});
    if (owner.rows[0].empresa_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    const {nome, setor, vaga, responsavel, telefone, observacoes} = req.body;
    if (setor && setor.length > 200) {
      return res.status(400).json({error: 'Setor deve ter no máximo 200 caracteres.'});
    }
    if (vaga && vaga.length > 200) {
      return res.status(400).json({error: 'Vaga deve ter no máximo 200 caracteres.'});
    }
    await pool.query(
      'UPDATE excursoes SET nome=$1, setor=$2, vaga=$3, responsavel=$4, telefone=$5, observacoes=$6 WHERE id=$7',
      [nome, setor, vaga, responsavel, telefone || null, observacoes || null, excursaoId]
    );
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao atualizar excursão:', err.message);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Excluir excursão
app.delete('/api/excursoes/:excursaoId', auth, async (req, res) => {
  try {
    const {excursaoId} = req.params;
    const user = (req as any).user as TokenPayload;
    if (user.tipo !== 'empresa') return res.status(403).json({error: 'Sem permissão.'});
    const owner = await pool.query('SELECT empresa_id FROM excursoes WHERE id=$1', [excursaoId]);
    if (owner.rows.length === 0) return res.status(404).json({error: 'Excursão não encontrada.'});
    if (owner.rows[0].empresa_id !== user.id) return res.status(403).json({error: 'Sem permissão.'});
    await pool.query('DELETE FROM excursoes WHERE id=$1', [excursaoId]);
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao excluir excursão:', err.message);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// === RECUPERAÇÃO DE SENHA ===

const smtpTransporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
}) : null;

const RESET_CODE_EXPIRY_MIN = 10;

const resetRateMap = new Map<string, { count: number; resetAt: number }>();
function resetRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = resetRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    resetRateMap.set(ip, { count: 1, resetAt: now + 60000 });
    return next();
  }
  entry.count++;
  if (entry.count > 3) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde 1 minuto.' });
  }
  next();
}

app.post('/api/recuperar-senha/solicitar', resetRateLimit, async (req, res) => {
  try {
    const {doc} = req.body;
    if (!doc) return res.status(400).json({error: 'Informe o CPF ou CNPJ.'});

    let email: string | null = null;
    let tipo: string | null = null;
    let userId: string | null = null;

    const emp = await pool.query('SELECT id, email FROM empresas WHERE (cnpj=$1 OR cpf=$1) AND ativa=true', [doc]);
    if (emp.rows.length > 0) { email = emp.rows[0].email; tipo = 'empresa'; userId = emp.rows[0].id; }

    if (!userId) {
      const ent = await pool.query('SELECT id FROM entregadores WHERE cpf=$1', [doc]);
      if (ent.rows.length > 0) { tipo = 'entregador'; userId = ent.rows[0].id; }
    }

    if (!userId || !tipo) {
      return res.json({success: true, message: 'Se o documento estiver cadastrado, você receberá um e-mail com o código.'});
    }

    const codigo = crypto.randomInt(100000, 999999).toString();
    const expiraEm = new Date(Date.now() + RESET_CODE_EXPIRY_MIN * 60000);

    await pool.query(
      `INSERT INTO recuperacao_senha (user_id, tipo, codigo, expira_em, tentativas)
       VALUES ($1, $2, $3, $4, 0)
       ON CONFLICT (user_id, tipo) DO UPDATE SET codigo=$3, expira_em=$4, tentativas=0, usado=false`,
      [userId, tipo, codigo, expiraEm]
    );

    if (email && smtpTransporter) {
      const emailMasked = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
      await smtpTransporter.sendMail({
        from: process.env.SMTP_FROM || '"Unik Transporte" <noreply@norum.app>',
        to: email,
        subject: 'Código de recuperação de senha - Unik Transporte',
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px">
            <h2 style="color:#0F2A3F">Recuperação de Senha</h2>
            <p>Seu código de verificação é:</p>
            <div style="background:#F3F4F6;padding:16px;border-radius:8px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#0F2A3F">
              ${codigo}
            </div>
            <p style="color:#6B7280;font-size:14px;margin-top:16px">Este código expira em ${RESET_CODE_EXPIRY_MIN} minutos.</p>
            <p style="color:#6B7280;font-size:14px">Se você não solicitou, ignore este e-mail.</p>
          </div>
        `,
      });
      console.log(`[RESET] Código enviado para ${emailMasked}`);
    } else {
      console.log(`[RESET] SMTP não configurado. Código: ${codigo} (user: ${userId})`);
    }

    const emailHint = email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : undefined;
    res.json({success: true, message: 'Se o documento estiver cadastrado, você receberá um e-mail com o código.', email_hint: emailHint});
  } catch (err: any) {
    console.error('Erro ao solicitar recuperação:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

app.post('/api/recuperar-senha/verificar', resetRateLimit, async (req, res) => {
  try {
    const {doc, codigo} = req.body;
    if (!doc || !codigo) return res.status(400).json({error: 'Informe o documento e o código.'});

    let tipo: string | null = null;
    let userId: string | null = null;

    const emp = await pool.query('SELECT id FROM empresas WHERE cnpj=$1 OR cpf=$1', [doc]);
    if (emp.rows.length > 0) { tipo = 'empresa'; userId = emp.rows[0].id; }
    if (!userId) {
      const ent = await pool.query('SELECT id FROM entregadores WHERE cpf=$1', [doc]);
      if (ent.rows.length > 0) { tipo = 'entregador'; userId = ent.rows[0].id; }
    }

    if (!userId || !tipo) return res.status(400).json({error: 'Código inválido.'});

    const result = await pool.query(
      'SELECT * FROM recuperacao_senha WHERE user_id=$1 AND tipo=$2 AND usado=false',
      [userId, tipo]
    );
    if (result.rows.length === 0) return res.status(400).json({error: 'Código inválido ou expirado.'});

    const registro = result.rows[0];

    if (registro.tentativas >= 5) {
      return res.status(429).json({error: 'Muitas tentativas incorretas. Solicite um novo código.'});
    }
    if (new Date() > new Date(registro.expira_em)) {
      return res.status(400).json({error: 'Código expirado. Solicite um novo.'});
    }
    if (registro.codigo !== codigo) {
      await pool.query('UPDATE recuperacao_senha SET tentativas=tentativas+1 WHERE id=$1', [registro.id]);
      return res.status(400).json({error: 'Código incorreto.'});
    }

    const resetToken = jwt.sign({userId, tipo, purpose: 'reset'}, JWT_SECRET!, {expiresIn: '5m'});
    res.json({success: true, reset_token: resetToken});
  } catch (err: any) {
    console.error('Erro ao verificar código:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

app.post('/api/recuperar-senha/redefinir', async (req, res) => {
  try {
    const {reset_token, nova_senha} = req.body;
    if (!reset_token || !nova_senha) return res.status(400).json({error: 'Token e nova senha obrigatórios.'});
    if (nova_senha.length < 6) return res.status(400).json({error: 'A senha deve ter no mínimo 6 caracteres.'});

    let decoded: any;
    try {
      decoded = jwt.verify(reset_token, JWT_SECRET!);
    } catch {
      return res.status(400).json({error: 'Token inválido ou expirado. Solicite um novo código.'});
    }
    if (decoded.purpose !== 'reset') return res.status(400).json({error: 'Token inválido.'});

    const {userId, tipo} = decoded;
    const nova_hash = await bcrypt.hash(nova_senha, 10);

    if (tipo === 'empresa') {
      await pool.query('UPDATE empresas SET senha_hash=$1 WHERE id=$2', [nova_hash, userId]);
    } else if (tipo === 'entregador') {
      await pool.query('UPDATE entregadores SET senha_hash=$1 WHERE id=$2', [nova_hash, userId]);
    }

    await pool.query('UPDATE recuperacao_senha SET usado=true WHERE user_id=$1 AND tipo=$2', [userId, tipo]);
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao redefinir senha:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// === EXCLUSÃO DE DADOS (LGPD) ===
app.post('/api/exclusao-dados', async (req, res) => {
  try {
    const {nome, documento, email, motivo} = req.body;
    if (!nome || !documento || !email) {
      return res.status(400).json({error: 'Preencha todos os campos obrigatórios.'});
    }

    // Salva a solicitação no banco
    await pool.query(
      `INSERT INTO solicitacoes_exclusao (nome, documento, email, motivo)
       VALUES ($1, $2, $3, $4)`,
      [nome, documento, email, motivo || 'Não informado']
    );

    // Envia e-mail de confirmação para o usuário
    if (smtpTransporter) {
      await smtpTransporter.sendMail({
        from: process.env.SMTP_FROM || '"Unik Transporte" <noreply@norum.app>',
        to: email,
        subject: 'Solicitação de exclusão de dados recebida - Unik Transporte',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
            <h2 style="color:#0F2A3F">Solicitação Recebida</h2>
            <p>Olá ${nome},</p>
            <p>Recebemos sua solicitação de exclusão de dados da plataforma Unik Transporte.</p>
            <div style="background:#F3F4F6;padding:16px;border-radius:8px;margin:16px 0">
              <p style="margin:0"><strong>Documento:</strong> ${documento}</p>
              <p style="margin:8px 0 0"><strong>Prazo:</strong> Até 30 dias úteis</p>
            </div>
            <p>Você receberá um e-mail de confirmação quando a exclusão for concluída.</p>
            <p style="color:#6B7280;font-size:13px;margin-top:20px">
              Se você não solicitou esta exclusão, entre em contato imediatamente: norumtecnologia@gmail.com
            </p>
          </div>
        `,
      });
    }

    // Notifica o admin
    if (smtpTransporter) {
      await smtpTransporter.sendMail({
        from: process.env.SMTP_FROM || '"Unik Transporte" <noreply@norum.app>',
        to: process.env.SMTP_USER || 'norumtecnologia@gmail.com',
        subject: `[LGPD] Solicitação de exclusão - ${nome}`,
        html: `<p><strong>Nome:</strong> ${nome}</p><p><strong>Doc:</strong> ${documento}</p><p><strong>Email:</strong> ${email}</p><p><strong>Motivo:</strong> ${motivo || 'Não informado'}</p>`,
      });
    }

    res.json({success: true});
  } catch (err: any) {
    console.error('Erro na solicitação de exclusão:', err.message);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// === ADMIN (gestão completa da plataforma) ===

app.post('/api/login-admin', loginRateLimit, async (req, res) => {
  try {
    const {email, senha} = req.body;
    if (!email || !senha) return res.status(400).json({error: 'E-mail e senha são obrigatórios.'});
    const result = await pool.query('SELECT * FROM admins WHERE email=$1 AND ativo=true', [email]);
    if (result.rows.length === 0) {
      registrarLoginFalho(email);
      return res.status(401).json({error: 'Credenciais inválidas.'});
    }
    const admin = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, admin.senha_hash);
    if (!senhaValida) {
      registrarLoginFalho(email);
      return res.status(401).json({error: 'Credenciais inválidas.'});
    }
    limparLoginAttempt(email);
    const token = gerarToken({id: admin.id, tipo: 'admin'});
    res.json({success: true, token, admin: {id: admin.id, nome: admin.nome, email: admin.email}});
  } catch (err: any) {
    console.error('Erro no login admin:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// Estatísticas gerais da plataforma
app.get('/api/admin/stats', auth, requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM empresas) as total_empresas,
        (SELECT COUNT(*)::int FROM empresas WHERE ativa=true) as empresas_ativas,
        (SELECT COUNT(*)::int FROM cliente_empresa) as total_clientes,
        (SELECT COUNT(*)::int FROM entregadores) as total_entregadores,
        (SELECT COUNT(*)::int FROM pedidos) as total_pedidos,
        (SELECT COUNT(*)::int FROM assinaturas WHERE status='ativa') as assinaturas_ativas
    `);
    res.json({success: true, stats: result.rows[0]});
  } catch (err: any) {
    console.error('Erro ao buscar stats admin:', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// --- Empresas ---
app.get('/api/admin/empresas', auth, requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nome_empresa, cnpj, cpf, nome_responsavel, email, telefone, endereco, numero, bairro,
              cidade, estado, cep, plano, valor_plano, status_assinatura, ativa, data_cadastro, data_vencimento
       FROM empresas ORDER BY data_cadastro DESC`
    );
    res.json({success: true, empresas: result.rows});
  } catch (err: any) {
    console.error('Erro ao listar empresas (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

app.put('/api/admin/empresas/:id', auth, requireAdmin, async (req, res) => {
  try {
    const {id} = req.params;
    const {nome_empresa, nome_responsavel, email, endereco, numero, bairro,
      cidade, estado, cep, plano, valor_plano, status_assinatura, ativa, data_vencimento} = req.body;
    const cnpj = (req.body.cnpj || '').replace(/\D/g, '') || null;
    const cpf = (req.body.cpf || '').replace(/\D/g, '') || null;
    const telefone = (req.body.telefone || '').replace(/\D/g, '');
    if (!cnpj && !cpf) return res.status(400).json({error: 'Informe CNPJ ou CPF.'});
    const result = await pool.query(
      `UPDATE empresas SET nome_empresa=$1, cnpj=$2, cpf=$3, nome_responsavel=$4, email=$5, telefone=$6,
        endereco=$7, numero=$8, bairro=$9, cidade=$10, estado=$11, cep=$12, plano=$13, valor_plano=$14,
        status_assinatura=$15, ativa=$16, data_vencimento=$17 WHERE id=$18 RETURNING id`,
      [nome_empresa, cnpj, cpf, nome_responsavel, email, telefone, endereco || null, numero || null, bairro || null,
        cidade, estado, cep, plano, valor_plano, status_assinatura, ativa, data_vencimento || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({error: 'Empresa não encontrada.'});
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao atualizar empresa (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

app.delete('/api/admin/empresas/:id', auth, requireAdmin, async (req, res) => {
  try {
    const {id} = req.params;
    const result = await pool.query('DELETE FROM empresas WHERE id=$1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({error: 'Empresa não encontrada.'});
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao excluir empresa (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// --- Clientes (cadastro manual da empresa — não têm conta/login) ---
app.get('/api/admin/clientes', auth, requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nome, cpf, cnpj, email, telefone, cidade, estado,
             (status IS DISTINCT FROM 'bloqueado') as ativo, data_vinculo as data_cadastro
      FROM cliente_empresa
      ORDER BY data_vinculo DESC
    `);
    res.json({success: true, clientes: result.rows});
  } catch (err: any) {
    console.error('Erro ao listar clientes (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

app.put('/api/admin/clientes/:id', auth, requireAdmin, async (req, res) => {
  try {
    const {id} = req.params;
    const {nome, email, cidade, estado, ativo} = req.body;
    const cpf = (req.body.cpf || '').replace(/\D/g, '');
    const cnpj = req.body.cnpj ? String(req.body.cnpj).replace(/\D/g, '') : null;
    const telefone = (req.body.telefone || '').replace(/\D/g, '');
    const result = await pool.query(
      `UPDATE cliente_empresa SET nome=$1, cpf=$2, cnpj=$3, email=$4, telefone=$5, cidade=$6, estado=$7,
        status=$8 WHERE id=$9 RETURNING id`,
      [nome, cpf, cnpj, email, telefone, cidade || null, estado || null, ativo ? 'ativo' : 'bloqueado', id]
    );
    if (result.rows.length === 0) return res.status(404).json({error: 'Cliente não encontrado.'});
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao atualizar cliente (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

app.delete('/api/admin/clientes/:id', auth, requireAdmin, async (req, res) => {
  try {
    const {id} = req.params;
    const result = await pool.query('DELETE FROM cliente_empresa WHERE id=$1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({error: 'Cliente não encontrado.'});
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao excluir cliente (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// --- Entregadores ---
app.get('/api/admin/entregadores', auth, requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.nome, d.cpf, d.telefone, d.ativo, d.data_cadastro,
        (SELECT json_agg(json_build_object('id', e.id, 'nome_empresa', e.nome_empresa))
         FROM entregador_empresa de JOIN empresas e ON e.id = de.empresa_id
         WHERE de.entregador_id = d.id) as empresas
      FROM entregadores d ORDER BY d.data_cadastro DESC
    `);
    res.json({success: true, entregadores: result.rows});
  } catch (err: any) {
    console.error('Erro ao listar entregadores (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

app.put('/api/admin/entregadores/:id', auth, requireAdmin, async (req, res) => {
  try {
    const {id} = req.params;
    const {nome, ativo} = req.body;
    const cpf = (req.body.cpf || '').replace(/\D/g, '');
    const telefone = req.body.telefone ? String(req.body.telefone).replace(/\D/g, '') : null;
    const result = await pool.query(
      'UPDATE entregadores SET nome=$1, cpf=$2, telefone=$3, ativo=$4 WHERE id=$5 RETURNING id',
      [nome, cpf, telefone, ativo, id]
    );
    if (result.rows.length === 0) return res.status(404).json({error: 'Entregador não encontrado.'});
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao atualizar entregador (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

app.delete('/api/admin/entregadores/:id', auth, requireAdmin, async (req, res) => {
  try {
    const {id} = req.params;
    const result = await pool.query('DELETE FROM entregadores WHERE id=$1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({error: 'Entregador não encontrado.'});
    res.json({success: true});
  } catch (err: any) {
    if (err.code === '23503') {
      return res.status(409).json({error: 'Não é possível excluir: existem pedidos vinculados a este entregador.'});
    }
    console.error('Erro ao excluir entregador (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// --- Pedidos ---
app.get('/api/admin/pedidos', auth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await pool.query(
      `SELECT p.*, e.nome_empresa
       FROM pedidos p JOIN empresas e ON e.id = p.empresa_id
       ORDER BY p.criado_em DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({success: true, pedidos: result.rows});
  } catch (err: any) {
    console.error('Erro ao listar pedidos (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

app.delete('/api/admin/pedidos/:id', auth, requireAdmin, async (req, res) => {
  try {
    const {id} = req.params;
    const result = await pool.query('DELETE FROM pedidos WHERE id=$1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({error: 'Pedido não encontrado.'});
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao excluir pedido (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// --- Assinaturas ---
app.get('/api/admin/assinaturas', auth, requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, e.nome_empresa
       FROM assinaturas a JOIN empresas e ON e.id = a.empresa_id
       ORDER BY a.data_vencimento ASC`
    );
    res.json({success: true, assinaturas: result.rows});
  } catch (err: any) {
    console.error('Erro ao listar assinaturas (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

app.put('/api/admin/assinaturas/:id', auth, requireAdmin, async (req, res) => {
  try {
    const {id} = req.params;
    const {status, valor, data_vencimento} = req.body;
    const result = await pool.query(
      'UPDATE assinaturas SET status=$1, valor=$2, data_vencimento=$3 WHERE id=$4 RETURNING id',
      [status, valor, data_vencimento || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({error: 'Assinatura não encontrada.'});
    // Mantém status_assinatura da empresa em sincronia
    await pool.query('UPDATE empresas SET status_assinatura=$1 WHERE id=(SELECT empresa_id FROM assinaturas WHERE id=$2)', [status, id]);
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao atualizar assinatura (admin):', err);
    res.status(500).json({error: 'Erro interno do servidor.'});
  }
});

// --- WhatsApp (uazapi) ---
app.get('/api/admin/whatsapp/status', auth, requireAdmin, async (_req, res) => {
  try {
    const cfgRes = await pool.query('SELECT * FROM whatsapp_config ORDER BY criado_em DESC LIMIT 1');
    if (cfgRes.rows.length === 0) {
      return res.json({success: true, config: null});
    }
    const cfg = cfgRes.rows[0];
    const data = await uazapiInstanceRequest('/instance/status', 'GET', cfg.instance_token);
    const conectado = !!data.status?.connected;
    const status = conectado ? 'connected' : (data.instance?.status || 'disconnected');
    const profileName = data.instance?.profileName || null;
    const numero = data.status?.jid?.user || null;
    await pool.query(
      'UPDATE whatsapp_config SET status=$1, profile_name=$2, numero_conectado=$3, atualizado_em=NOW() WHERE id=$4',
      [status, profileName, numero, cfg.id]
    );
    res.json({
      success: true,
      config: {
        id: cfg.id,
        instance_name: cfg.instance_name,
        status,
        profile_name: profileName,
        numero_conectado: numero,
        qrcode: data.instance?.qrcode || null,
        paircode: data.instance?.paircode || null,
      },
    });
  } catch (err: any) {
    console.error('Erro ao buscar status whatsapp (admin):', err.message);
    res.status(500).json({error: 'Erro ao consultar status do WhatsApp.'});
  }
});

app.post('/api/admin/whatsapp/instance', auth, requireAdmin, async (req, res) => {
  try {
    const existe = await pool.query('SELECT id FROM whatsapp_config LIMIT 1');
    if (existe.rows.length > 0) {
      return res.status(409).json({error: 'Já existe uma instância configurada.'});
    }
    const {name} = req.body;
    const instanceName = name || 'na-rota';
    const data = await uazapiAdminRequest('/instance/init', 'POST', {name: instanceName});
    await pool.query(
      'INSERT INTO whatsapp_config (instance_id, instance_token, instance_name, status) VALUES ($1,$2,$3,$4)',
      [data.instance?.id || null, data.token, instanceName, 'disconnected']
    );
    res.status(201).json({success: true});
  } catch (err: any) {
    console.error('Erro ao criar instância whatsapp (admin):', err.message);
    res.status(500).json({error: 'Erro ao criar instância do WhatsApp.'});
  }
});

app.post('/api/admin/whatsapp/connect', auth, requireAdmin, async (_req, res) => {
  try {
    const cfgRes = await pool.query('SELECT * FROM whatsapp_config ORDER BY criado_em DESC LIMIT 1');
    if (cfgRes.rows.length === 0) return res.status(404).json({error: 'Nenhuma instância configurada.'});
    const cfg = cfgRes.rows[0];
    const data = await uazapiInstanceRequest('/instance/connect', 'POST', cfg.instance_token, {});
    await pool.query('UPDATE whatsapp_config SET status=$1, atualizado_em=NOW() WHERE id=$2', ['connecting', cfg.id]);
    res.json({success: true, qrcode: data.instance?.qrcode || null, connected: !!data.connected});
  } catch (err: any) {
    console.error('Erro ao conectar whatsapp (admin):', err.message);
    res.status(500).json({error: 'Erro ao conectar WhatsApp.'});
  }
});

app.post('/api/admin/whatsapp/disconnect', auth, requireAdmin, async (_req, res) => {
  try {
    const cfgRes = await pool.query('SELECT * FROM whatsapp_config ORDER BY criado_em DESC LIMIT 1');
    if (cfgRes.rows.length === 0) return res.status(404).json({error: 'Nenhuma instância configurada.'});
    const cfg = cfgRes.rows[0];
    await uazapiInstanceRequest('/instance/disconnect', 'POST', cfg.instance_token);
    await pool.query('UPDATE whatsapp_config SET status=$1, atualizado_em=NOW() WHERE id=$2', ['disconnected', cfg.id]);
    res.json({success: true});
  } catch (err: any) {
    console.error('Erro ao desconectar whatsapp (admin):', err.message);
    res.status(500).json({error: 'Erro ao desconectar WhatsApp.'});
  }
});

// SPA fallback - serve index.html for non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Worker ${process.pid}] API rodando em http://0.0.0.0:${PORT}`);
});

} // end startServer()
