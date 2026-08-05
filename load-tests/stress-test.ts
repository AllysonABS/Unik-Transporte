/**
 * Teste de Carga - Unik Transporte
 * Simula: despachantes upload foto + clientes lendo + empresas operando
 * Usa IDs REAIS do banco para resultados válidos.
 *
 * Uso:
 *   npx tsx stress-test.ts --users 100 --duration 30
 *   npx tsx stress-test.ts --users 1000 --duration 60
 *   npx tsx stress-test.ts --users 4000 --duration 120
 */

const BASE_URL = process.env.API_URL || 'https://transporte.unikcrm.com';
console.log(`\n🎯 Testando contra: ${BASE_URL}\n`);

// Parse args
const args = process.argv.slice(2);
const getArg = (name: string, def: string) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : def;
};
const TOTAL_USERS = parseInt(getArg('users', '100'));
const DURATION_SEC = parseInt(getArg('duration', '30'));

// IDs reais do banco
const REAL_DATA = {
  empresas: ['291fa316-cfd2-4abd-a2cb-579bd3770349', '9bdbb5c3-92c6-4872-989d-a07b60dc2b62'],
  pedidos: ['2b5c6d07-e603-4c02-9401-c20c1e01bec3'],
  clientes: ['7b3c13b5-cd5b-4bd8-8347-d78f82422b56'],
  despachantes: ['84d25f85-22b3-47d7-8a7e-5dfdf8d9d6fc'],
};

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// Distribution: 40% despachantes, 40% clientes, 20% empresas
const DESPACHANTES = Math.floor(TOTAL_USERS * 0.4);
const CLIENTES = Math.floor(TOTAL_USERS * 0.4);
const EMPRESAS = TOTAL_USERS - DESPACHANTES - CLIENTES;

interface Stats {
  total: number;
  success: number;
  errors: number;
  latencies: number[];
  errorsByType: Record<string, number>;
}

const stats: Record<string, Stats> = {
  upload_url: { total: 0, success: 0, errors: 0, latencies: [], errorsByType: {} },
  listar_pedidos_cliente: { total: 0, success: 0, errors: 0, latencies: [], errorsByType: {} },
  listar_pedidos_desp: { total: 0, success: 0, errors: 0, latencies: [], errorsByType: {} },
  listar_lojas: { total: 0, success: 0, errors: 0, latencies: [], errorsByType: {} },
  criar_pedido: { total: 0, success: 0, errors: 0, latencies: [], errorsByType: {} },
  listar_clientes: { total: 0, success: 0, errors: 0, latencies: [], errorsByType: {} },
  get_empresa: { total: 0, success: 0, errors: 0, latencies: [], errorsByType: {} },
  listar_pedidos_empresa: { total: 0, success: 0, errors: 0, latencies: [], errorsByType: {} },
};

function trackError(stat: Stats, err: string) {
  const key = err.substring(0, 80);
  stat.errorsByType[key] = (stat.errorsByType[key] || 0) + 1;
}

async function timedFetch(url: string, opts?: RequestInit): Promise<{ ok: boolean; status: number; ms: number; body: any }> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    const ms = performance.now() - start;
    let body = null;
    try { body = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, ms, body };
  } catch (e: any) {
    return { ok: false, status: 0, ms: performance.now() - start, body: e.message };
  }
}

function record(stat: Stats, r: { ok: boolean; status: number; ms: number; body: any }) {
  stat.total++;
  stat.latencies.push(r.ms);
  if (r.ok) stat.success++;
  else { stat.errors++; trackError(stat, `${r.status}:${typeof r.body === 'string' ? r.body : JSON.stringify(r.body)}`); }
}

async function simulaDespachante(_id: number, endTime: number) {
  while (Date.now() < endTime) {
    // Pede presigned URL (endpoint novo) — se não existir ainda, cai no 404/500
    const pedidoId = pick(REAL_DATA.pedidos);
    const r = await timedFetch(`${BASE_URL}/api/pedidos/${pedidoId}/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa: 'coleta', contentType: 'image/jpeg', ext: 'jpg' }),
    });
    record(stats.upload_url, r);

    // Consulta pedidos do despachante
    const despId = pick(REAL_DATA.despachantes);
    const r2 = await timedFetch(`${BASE_URL}/api/despachante/${despId}/pedidos`);
    record(stats.listar_pedidos_desp, r2);

    await sleep(2000 + Math.random() * 3000);
  }
}

async function simulaCliente(_id: number, endTime: number) {
  while (Date.now() < endTime) {
    // Consulta pedidos do cliente
    const cliId = pick(REAL_DATA.clientes);
    const r = await timedFetch(`${BASE_URL}/api/cliente/${cliId}/pedidos`);
    record(stats.listar_pedidos_cliente, r);

    // Consulta lojas
    const r2 = await timedFetch(`${BASE_URL}/api/lojas`);
    record(stats.listar_lojas, r2);

    await sleep(3000 + Math.random() * 5000);
  }
}

async function simulaEmpresa(_id: number, endTime: number) {
  while (Date.now() < endTime) {
    const empId = pick(REAL_DATA.empresas);

    // Lista clientes da empresa
    const r = await timedFetch(`${BASE_URL}/api/empresa/${empId}/clientes`);
    record(stats.listar_clientes, r);

    // Busca dados da empresa
    const r2 = await timedFetch(`${BASE_URL}/api/empresa/${empId}`);
    record(stats.get_empresa, r2);

    // Lista pedidos da empresa
    const r3 = await timedFetch(`${BASE_URL}/api/empresa/${empId}/pedidos`);
    record(stats.listar_pedidos_empresa, r3);

    await sleep(3000 + Math.random() * 7000);
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p / 100);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function printReport() {
  console.log('\n' + '='.repeat(70));
  console.log('  RELATÓRIO DE TESTE DE CARGA - UNIK TRANSPORTE');
  console.log('='.repeat(70));
  console.log(`  Usuários simulados: ${TOTAL_USERS} (${DESPACHANTES} desp | ${CLIENTES} cli | ${EMPRESAS} emp)`);
  console.log(`  Duração: ${DURATION_SEC}s`);
  console.log('='.repeat(70));

  let totalReqs = 0, totalErr = 0;

  for (const [name, s] of Object.entries(stats)) {
    if (s.total === 0) continue;
    totalReqs += s.total;
    totalErr += s.errors;
    const avg = s.latencies.reduce((a, b) => a + b, 0) / s.latencies.length;
    console.log(`\n  📊 ${name.toUpperCase()}`);
    console.log(`     Requests: ${s.total} | ✅ ${s.success} | ❌ ${s.errors} (${((s.errors/s.total)*100).toFixed(1)}%)`);
    console.log(`     Latência: avg=${avg.toFixed(0)}ms | p50=${percentile(s.latencies, 50).toFixed(0)}ms | p95=${percentile(s.latencies, 95).toFixed(0)}ms | p99=${percentile(s.latencies, 99).toFixed(0)}ms`);
    if (Object.keys(s.errorsByType).length > 0) {
      console.log(`     Erros:`);
      for (const [err, count] of Object.entries(s.errorsByType).slice(0, 3)) {
        console.log(`       - ${err}: ${count}x`);
      }
    }
  }

  const rps = totalReqs / DURATION_SEC;
  console.log('\n' + '-'.repeat(70));
  console.log(`  TOTAL: ${totalReqs} requests | ${totalErr} erros (${((totalErr/Math.max(totalReqs,1))*100).toFixed(1)}%) | ${rps.toFixed(1)} req/s`);
  console.log('-'.repeat(70));

  // Veredicto
  const errorRate = totalErr / Math.max(totalReqs, 1);
  const allLatencies = Object.values(stats).flatMap(s => s.latencies);
  const p95 = percentile(allLatencies, 95);
  console.log('\n  🏁 VEREDICTO:');
  if (errorRate > 0.1) {
    console.log(`  ❌ REPROVADO - Taxa de erro ${(errorRate*100).toFixed(1)}% (acima de 10%). Servidor não aguenta.`);
  } else if (p95 > 5000) {
    console.log(`  ⚠️  INSTÁVEL - Latência p95=${p95.toFixed(0)}ms (acima de 5s). UX comprometida.`);
  } else if (p95 > 2000) {
    console.log(`  ⚠️  ACEITÁVEL - p95=${p95.toFixed(0)}ms. Funciona mas recomendo otimizar.`);
  } else {
    console.log(`  ✅ APROVADO - p95=${p95.toFixed(0)}ms, erro ${(errorRate*100).toFixed(1)}%. Servidor aguenta!`);
  }
  console.log('');
}

async function main() {
  console.log(`🚀 Iniciando teste de carga...`);
  console.log(`   ${DESPACHANTES} despachantes | ${CLIENTES} clientes | ${EMPRESAS} empresas`);
  console.log(`   Duração: ${DURATION_SEC}s\n`);

  // Verifica se servidor está online
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    await fetch(`${BASE_URL}/api/lojas`, { signal: ctrl.signal });
    clearTimeout(t);
  } catch {
    console.error(`❌ Servidor não acessível em ${BASE_URL}`);
    process.exit(1);
  }

  const endTime = Date.now() + DURATION_SEC * 1000;
  const promises: Promise<void>[] = [];

  // Ramp-up gradual
  const rampMs = Math.min(10000, DURATION_SEC * 1000 * 0.2);
  const delayPerUser = rampMs / TOTAL_USERS;

  let spawned = 0;
  for (let i = 0; i < DESPACHANTES; i++) {
    promises.push(sleep(delayPerUser * spawned++).then(() => simulaDespachante(i, endTime)));
  }
  for (let i = 0; i < CLIENTES; i++) {
    promises.push(sleep(delayPerUser * spawned++).then(() => simulaCliente(i, endTime)));
  }
  for (let i = 0; i < EMPRESAS; i++) {
    promises.push(sleep(delayPerUser * spawned++).then(() => simulaEmpresa(i, endTime)));
  }

  // Progress
  const startTime = Date.now();
  const progressInterval = setInterval(() => {
    const total = Object.values(stats).reduce((a, s) => a + s.total, 0);
    const errs = Object.values(stats).reduce((a, s) => a + s.errors, 0);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    process.stdout.write(`\r  ⏳ ${total} requests | ${errs} erros | ${elapsed}s/${DURATION_SEC}s`);
  }, 1000);

  await Promise.all(promises);
  clearInterval(progressInterval);
  printReport();
}

main().catch(console.error);
