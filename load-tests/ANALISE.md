# Análise de Robustez - Unik Logística

## Cenário alvo
- 5.000 empresas
- ~4.000 entregadores (upload simultâneo)
- Milhares de clientes lendo em tempo real

## 🔴 Problemas Críticos (vai cair)

### 1. Pool de conexões PostgreSQL = 10 (default)
```ts
// ATUAL: usa default de 10 conexões
const pool = new Pool({ host, port, user, password, database });

// NECESSÁRIO para 4k+ simultâneos:
const pool = new Pool({
  host, port, user, password, database,
  max: 100,              // Máximo de conexões simultâneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```
Com 10 conexões e 4k requests, 3.990 vão enfileirar e dar timeout.

### 2. Processo único Node.js
Express roda em 1 thread. Upload de foto (multipart parse + R2 upload) bloqueia tudo.

**Solução**: usar `cluster` ou PM2 com múltiplos workers.
```ts
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const cpus = os.cpus().length;
  for (let i = 0; i < cpus; i++) cluster.fork();
} else {
  // ... app express
}
```

### 3. Upload sem queue
4k uploads simultâneos = 4GB de RAM (1MB cada) ao mesmo tempo.

**Solução**: Limitar concorrência de uploads com semáforo ou usar upload direto do client para R2 (presigned URL).

### 4. bcrypt é CPU-bound
`bcrypt.compare` leva ~100ms e bloqueia o event loop.

**Solução**: Mover para worker_threads ou usar argon2 (async nativo).

---

## 🟡 Recomendações de Infra

| Item | Atual | Recomendado p/ 4k |
|------|-------|-------------------|
| Node processes | 1 | 4-8 (cluster) |
| PG pool max | 10 | 50-100 |
| PG instance | ? | min 2 vCPU, 4GB RAM |
| Rate limiting | Nenhum | 100 req/min por IP |
| Upload strategy | Server-side | Presigned URL (direto R2) |
| Cache | Nenhum | Redis para lojas/pedidos |
| Auth | Nenhum | JWT (evita re-query a cada request) |

---

## 🟢 Correções Mínimas (implementar JÁ)

1. **Aumentar pool**: `max: 50` no mínimo
2. **Cluster mode**: PM2 ou Node cluster
3. **Presigned URLs**: Client faz upload direto pro R2, server só salva a referência
4. **Índices no DB**: Garantir índices em `pedidos(empresa_id)`, `pedidos(cliente_id)`, `pedidos(entregador_id)`
5. **Connection timeout**: Adicionar timeout nas queries

---

## Como rodar o teste

```bash
cd load-tests
npm install
# Teste leve (100 usuários, 30s)
npx tsx stress-test.ts --users 100 --duration 30

# Teste médio (1000 usuários, 60s)
npx tsx stress-test.ts --users 1000 --duration 60

# Teste pesado (4000 usuários, 2min, uploads reais 1MB)
npx tsx stress-test.ts --users 4000 --duration 120 --with-uploads
```

O script vai te dar um relatório com latências p50/p95/p99 e veredicto.
