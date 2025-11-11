---

## Limpeza e otimização aplicadas neste branch
As seguintes ações de limpeza/organização foram aplicadas ao repositório para reduzir duplicação e facilitar desenvolvimento local:

- Criei `.gitignore` para ignorar `node_modules/`, `.env`, `/data` e logs temporários.
- Adicionei suporte a um backend de autenticação de exemplo (arquivo `server.js` foi estendido) que persiste usuários em `data/users.json` e códigos em `data/pending.json`.
- Adicionei UI server-based em `/auth/login.html` (registro / verificação / login) que consome as rotas `/api/register`, `/api/verify`, `/api/login`.
- Arquivei versões duplicadas/antigas de login em `archive/`:
  - `archive/login_root.firebase.html` — cópia arquivada da versão `login.html` que usava Firebase.
  - `archive/src_auth_login.html` — cópia arquivada da versão que estava em `src/auth/login.html`.
  As versões ativas são `index.html` (Kanban) e `auth/login.html` (server-based).

## Como rodar (resumo rápido)
1. Copie `.env.example` para `.env` (ou use o `.env` já criado) e preencha `GMAIL_USER` e `GMAIL_PASS` (App Password do Gmail) quando quiser envio real de e‑mail.
2. Instale dependências:
```bash
npm install
```
3. Inicie o servidor (exemplo usa PORT=3000 por padrão):
```bash
# matar processo que usa 3000 (se existir)
PID=$(lsof -ti :3000) && [ -n "$PID" ] && kill $PID || true
nohup npm start > /tmp/pj-kanban.log 2>&1 & disown
sed -n '1,200p' /tmp/pj-kanban.log
```
4. Acesse:
  - Kanban: `http://localhost:3000/index.html`
  - Login/Registro (server): `http://localhost:3000/auth/login.html`

Se quiser que eu faça mais limpeza (por exemplo remover permanentemente arquivos arquivados, migrar persistência para SQLite, ou harmonizar totalmente com Firebase), diga qual opção prefere.
# Kanban Peças — instruções e utilitários

Este repositório contém um quadro Kanban feito com HTML, Tailwind CSS e Firebase Realtime Database (versão 9 - compat). O código principal de cliente está em `index.html` e a autenticação em `login.html`.

Resumo das melhorias recentes
- Uso de Realtime Database compat (`firebase-database-compat.js`).
- Criação de tarefas usando `push()` (chave gerada automaticamente) e armazenamento do ID da OS dentro do objeto como `idOS`.
- Filtro por prioridade com opção `Todas` (value="all").
- Normalização do `idOS` no cliente: `trim()` + `toUpperCase()`.
- Botão "Mostrar/Ocultar" senha no `login.html`.

O que está neste README
- Regras recomendadas para o Realtime Database
- Como rodar o projeto localmente
- Script de migração para dados existentes (opcional)
- Testes rápidos

---

## 1) Regras recomendadas do Realtime Database
Cole no Console do Firebase → Realtime Database → Regras. Essas regras garantem que apenas o usuário autenticado (`auth.uid`) possa ler e escrever no seu próprio nó `/users/$uid/tasks`, e adicionam validação básica e indexOn para `idOS`.

```json
{
  "rules": {
    "users": {
      "$uid": {
        "tasks": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": "auth != null && auth.uid === $uid",
          ".indexOn": ["idOS"],
          "$taskId": {
            ".validate": "newData.hasChildren(['idOS','text','priority','column']) &&\n                         newData.child('idOS').isString() && newData.child('idOS').val().length > 0 && newData.child('idOS').val().length <= 64 &&\n                         newData.child('text').isString() && newData.child('text').val().length <= 2000 &&\n                         newData.child('priority').isString() && (newData.child('priority').val() === 'low' || newData.child('priority').val() === 'medium' || newData.child('priority').val() === 'high') &&\n                         newData.child('column').isString()"
          }
        },
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

Notas:
- Ajuste limites (por ex. tamanho de `text`) conforme a sua necessidade.
- `indexOn: ["idOS"]` é importante porque usamos `orderByChild('idOS').equalTo(...)` no cliente para checar duplicadas por `idOS`.

---

## 2) Rodando localmente
1. Inicie um servidor HTTP simples na raiz do projeto (para evitar problemas de CORS/arquivos locais):

```bash
python3 -m http.server 8000
```

2. Abra no navegador:
- `http://localhost:8000/login.html` — página de login/registro
- `http://localhost:8000/index.html` — quadro Kanban (após autenticar)

3. No Console do Firebase, verifique:
- Authentication → Sign-in method → Email/Password (ativado)
- Realtime Database → ativado e com as regras acima

---

## 3) Script de migração (opcional)
Se você já tem dados no Realtime Database criados anteriormente com a chave sendo o ID da OS, ou se algumas tarefas não têm o campo `idOS`, use o script abaixo para migrar.
O script faz:
- percorre `/users/$uid/tasks`
- para cada task que não tem `idOS`, define `idOS = (valor existente)` ou `ID-TASKKEY` se não houver
- normaliza `idOS` (trim + uppercase + substitui espaços por '-')
- evita duplicatas de `idOS` dentro do mesmo usuário (acrescenta sufixo `-1`/`-2` se necessário)

AVISO: executar esse script requer credenciais administrativas (service account). Faça backup antes.

### Arquivo: `scripts/migrate_tasks.js`
(veja também este arquivo no repositório `scripts/migrate_tasks.js`)

### Como executar
1. Gere uma service account JSON no Console do Firebase (Project Settings → Service accounts → Generate new private key). Salve em `serviceAccountKey.json` (ou outro caminho seguro).
2. No diretório do projeto:

```bash
npm init -y
npm install firebase-admin
node scripts/migrate_tasks.js --serviceAccount=./serviceAccountKey.json --databaseURL=https://<SEU_PROJETO>.firebaseio.com
```

O script fará log das alterações aplicadas.

---

## 4) Testes rápidos
- Registrar usuário via `login.html` e entrar.
- Criar tarefa via `index.html` com Nº/Código (ex: `OS-123`) e ver no Console do Realtime Database o nó:
  `/users/{uid}/tasks/{PUSH_KEY}` com campos `{ idOS: "OS-123", text: "...", priority: "medium", column: "col-restaurar" }`.
- Tentar criar outra tarefa com o mesmo `idOS` — o cliente deve bloquear e mostrar "Este número já existe.".
- Alterar select de prioridade para 'Todas', 'Baixa', 'Média', 'Alta' e verificar filtragem.

---

## 5) Próximos passos recomendados
- Adicionar migração automática no servidor (Admin SDK) caso você queira migrar sempre em background.
- Implementar normalização mais agressiva (remover acentos, caracteres especiais) para `idOS` se necessário.
- Criar testes E2E e/ou unitários para a lógica de CRUD local.

Se quiser, eu posso:
- Implementar a normalização agressiva do `idOS` no cliente antes de salvar;
- Criar um script que rode no Admin SDK para migrar os dados automaticamente (faço um PR);
- Adicionar validação adicional no frontend (ex.: regex para `idOS`).

---

Obrigado — diga qual próximo passo você prefere que eu execute (migração, normalização extra, README adicional, etc.).
