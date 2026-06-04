# Pinheiros Remo · Sistema de Performance

## Como colocar no ar (passo a passo)

---

### PASSO 1 — Criar conta no GitHub
1. Acesse **github.com**
2. Clique em **Sign up** e crie uma conta gratuita

---

### PASSO 2 — Criar o repositório
1. Após entrar no GitHub, clique no botão verde **"New"** (canto superior esquerdo)
2. Em **Repository name**, escreva: `pinheiros-remo`
3. Deixe marcado como **Public**
4. Clique em **Create repository**

---

### PASSO 3 — Subir os arquivos
Na tela do repositório criado, clique em **"uploading an existing file"** e suba:

```
pinheiros-remo/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    └── App.jsx
```

> Atenção: a pasta `src/` precisa ser criada. No GitHub, para criar uma pasta,
> escreva o nome do arquivo como `src/App.jsx` que ele cria a pasta automaticamente.

Depois de selecionar todos os arquivos, clique em **Commit changes**.

---

### PASSO 4 — Adicionar o logo oficial (opcional mas recomendado)
1. Solicite ao departamento de comunicação do ECP o arquivo do logo em PNG
2. Renomeie o arquivo para **logo.png**
3. Suba na pasta **public/** do repositório (crie a pasta se necessário)
4. No arquivo `src/App.jsx`, localize o componente `ECPLogo` e substitua o SVG por:
   ```jsx
   function ECPLogo({ sz=40 }) {
     return <img src="/logo.png" width={sz} height={sz} alt="EC Pinheiros" style={{objectFit:"contain"}} />;
   }
   ```

---

### PASSO 5 — Criar conta no Vercel
1. Acesse **vercel.com**
2. Clique em **Sign Up** → escolha **Continue with GitHub**
3. Autorize o acesso

---

### PASSO 6 — Fazer o deploy
1. No Vercel, clique em **"Add New Project"**
2. Selecione o repositório **pinheiros-remo**
3. As configurações já são detectadas automaticamente (Vite + React)
4. Clique em **Deploy**
5. Aguarde ~1 minuto

Pronto! O Vercel vai gerar uma URL pública como:
**https://pinheiros-remo.vercel.app**

---

### PASSO 7 — Compartilhar com os atletas
Envie o link pelo WhatsApp. Os atletas acessam pelo celular sem instalar nada.

Para adicionar à tela inicial do iPhone:
- Safari → compartilhar → "Adicionar à Tela de Início"

Para adicionar à tela inicial do Android:
- Chrome → menu (⋮) → "Adicionar à tela inicial"

---

## Credenciais padrão

| Perfil | Login | Senha |
|---|---|---|
| Treinador | treinador | remo2025 |
| Atletas | (seleciona o nome) | atleta2025 |

> **Importante:** Troque as senhas no arquivo `App.jsx` antes de publicar.
> Procure as linhas: `ADMIN_PASS = "remo2025"` e `ATH_PASS = "atleta2025"`

---

## Atualizar o site depois

Toda vez que editar um arquivo no GitHub, o Vercel atualiza o site automaticamente em ~1 minuto.

---

## Aviso sobre dados

Os dados (treinos, atletas) ficam salvos no **navegador de cada usuário** (localStorage).
Isso significa que cada atleta vê seus próprios dados no próprio celular.
O treinador vê os dados que ele mesmo inseriu no dispositivo dele.

Para que **todos compartilhem os mesmos dados em tempo real**, seria necessário
um banco de dados online (ex: Firebase, Supabase). Se quiser evoluir para isso,
consulte o suporte do clube ou um desenvolvedor.
