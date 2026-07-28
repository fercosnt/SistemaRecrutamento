# Guia de Configuração - Templates de Email Supabase

Este guia detalha como configurar os templates de email para recuperação de senha no Supabase.

## 📋 Informações do Projeto

- **Projeto Supabase**: https://isljnozzlvckrgjjbjwp.supabase.co
- **Localização dos Templates**: `/docs/email-templates/`

## 🎯 Objetivo

Configurar templates de email personalizados para:
1. Recuperação de senha de **candidatos**
2. Recuperação de senha de **administradores RH**

## 📝 Passo a Passo

### 1. Acessar o Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Faça login com suas credenciais
3. Selecione o projeto: `isljnozzlvckrgjjbjwp`

### 2. Navegar até Email Templates

1. No menu lateral, clique em **Authentication** (ícone de cadeado)
2. Clique na aba **Email Templates**
3. Você verá a lista de templates padrão do Supabase

### 3. Configurar Template: "Reset Password" (Padrão para Candidatos)

Este será o template usado quando `resetPasswordForEmail()` é chamado sem parâmetros especiais.

#### 3.1 Configurar Assunto (Subject)

```
Recuperação de senha - Beauty Smile Recrutamento
```

#### 3.2 Configurar Remetente (Sender)

- **Sender Name**: `Beauty Smile Recrutamento`
- **Sender Email**: `noreply@beautysmile.com.br` (ou email configurado no seu domínio)

> **Nota**: Se você ainda não configurou um domínio customizado, use o email padrão do Supabase temporariamente.

#### 3.3 Configurar Corpo do Email (Message Body)

1. Abra o arquivo: `docs/email-templates/candidato-recuperacao-senha.html`
2. Copie **TODO** o conteúdo HTML
3. Cole no campo "Message (HTML)" no Supabase
4. **IMPORTANTE**: Certifique-se de que a variável `{{ .ConfirmationURL }}` está presente no template

#### 3.4 Configurar Fallback de Texto (Plain Text)

1. Abra o arquivo: `docs/email-templates/candidato-recuperacao-senha.txt`
2. Copie todo o conteúdo
3. Cole no campo "Message (Plain Text)" no Supabase

#### 3.5 Configurar URL de Redirecionamento

No código da aplicação (já configurado em `EsqueciSenhaPage.tsx`):

```typescript
const redirectUrl = `${window.location.origin}/auth/redefinir-senha${
  isRH ? '?tipo=rh' : ''
}`;
```

Para **candidatos**, a URL será:
```
https://seu-dominio.com/auth/redefinir-senha
```

### 4. Criar Template Customizado para Admin (Opcional - Requer Custom SMTP)

> **⚠️ IMPORTANTE**: Supabase não suporta múltiplos templates nativamente. Você tem duas opções:

#### Opção A: Usar o mesmo template (Mais Simples)
- Use o template de candidatos para ambos
- Detecte o tipo de usuário no frontend via query param `?tipo=rh`
- Mostre mensagens diferentes na página de redefinição

#### Opção B: Configurar Custom SMTP (Recomendado para Produção)

Se você tem um servidor SMTP próprio (ex: SendGrid, Mailgun, AWS SES):

1. Vá em **Project Settings** > **Auth** > **SMTP Settings**
2. Configure seu provedor SMTP
3. Use a API do provedor para enviar emails customizados

**Exemplo com SendGrid:**

```typescript
// No backend (função edge ou API)
async function sendAdminPasswordReset(email: string, resetUrl: string) {
  const htmlContent = await fs.readFile('admin-recuperacao-senha.html', 'utf-8');
  const textContent = await fs.readFile('admin-recuperacao-senha.txt', 'utf-8');

  await sendgrid.send({
    to: email,
    from: 'noreply@beautysmile.com.br',
    subject: 'Recuperação de senha - Painel Administrativo Beauty Smile',
    html: htmlContent.replace('{{ .ConfirmationURL }}', resetUrl),
    text: textContent.replace('{{ .ConfirmationURL }}', resetUrl),
  });
}
```

### 5. Configurar Variáveis de Ambiente (Aplicação)

No arquivo `.env` ou `.env.local`:

```bash
# URL da aplicação (produção)
VITE_APP_URL=https://seu-dominio.com

# Supabase
VITE_SUPABASE_URL=https://isljnozzlvckrgjjbjwp.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### 6. Testar os Templates

#### 6.1 Teste Manual via Dashboard

1. No Supabase Dashboard, vá em **Authentication** > **Users**
2. Clique em um usuário de teste
3. Clique em "Send password reset email"
4. Verifique a caixa de entrada

#### 6.2 Teste via Aplicação

1. Acesse: `http://localhost:5173/auth/esqueci-senha`
2. Digite um email válido de teste
3. Clique em "Enviar Instruções"
4. Verifique:
   - Email recebido na caixa de entrada
   - Não foi para spam
   - Formatação HTML está correta
   - Link de reset funciona

#### 6.3 Teste em Diferentes Clientes de Email

Teste o email em:
- ✅ Gmail (web e mobile)
- ✅ Outlook (web e desktop)
- ✅ Apple Mail (macOS e iOS)
- ✅ Thunderbird

**Checklist de Validação:**
- [ ] Imagens carregam corretamente
- [ ] Fontes e cores estão corretas
- [ ] Layout responsivo funciona
- [ ] Botão "Redefinir Senha" é clicável
- [ ] Link alternativo (texto) funciona
- [ ] Fallback de texto simples funciona

### 7. Configuração de Domínio Customizado (Opcional)

Para usar um domínio próprio (ex: `noreply@beautysmile.com.br`):

1. Configure SPF, DKIM e DMARC no seu DNS
2. Vá em Supabase: **Project Settings** > **Auth** > **SMTP Settings**
3. Configure seu provedor de email (SendGrid, Mailgun, etc)

**Exemplo de configuração DNS (SendGrid):**

```dns
TXT @ "v=spf1 include:sendgrid.net ~all"
CNAME s1._domainkey sendgrid.net
CNAME s2._domainkey sendgrid.net
TXT _dmarc "v=DMARC1; p=none; rua=mailto:dmarc@beautysmile.com.br"
```

## 📊 Monitoramento

### Logs de Email

1. Vá em Supabase: **Logs** > **Auth Logs**
2. Filtre por: `password_recovery`
3. Monitore:
   - Taxa de entrega
   - Erros de envio
   - Bounce rate

### Métricas Importantes

- **Taxa de Entrega**: > 95%
- **Taxa de Abertura**: > 40%
- **Taxa de Cliques**: > 20%
- **Bounce Rate**: < 5%

## 🔒 Segurança

### Boas Práticas Implementadas

1. ✅ Link expira em 24 horas
2. ✅ Mensagem genérica (não revela se email existe)
3. ✅ Rate limiting client-side (3 tentativas/hora)
4. ✅ HTTPS obrigatório
5. ✅ Validação de token no backend (Supabase)

### Configurações de Segurança no Supabase

1. Vá em **Authentication** > **Settings**
2. Configure:
   - **Password Recovery Expiry**: `3600` (1 hora) ou `86400` (24 horas)
   - **Enable Email Confirmations**: `true`
   - **Secure Email Change**: `true`

## 🐛 Troubleshooting

### Email não chega

1. Verifique spam/lixeira
2. Verifique logs do Supabase
3. Verifique configuração SMTP
4. Teste com outro email

### Link não funciona

1. Verifique se o token está presente na URL
2. Verifique se o link não expirou
3. Verifique rota `/auth/redefinir-senha` no routes.tsx

### Template não aparece formatado

1. Verifique se copiou todo o HTML
2. Verifique se as variáveis `{{ .ConfirmationURL }}` estão presentes
3. Teste o fallback de texto simples

## 📚 Referências

- [Supabase Auth - Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Email Best Practices](https://sendgrid.com/blog/email-best-practices/)
- [WCAG 2.1 Email Accessibility](https://www.w3.org/WAI/standards-guidelines/wcag/)

## ✅ Checklist Final

Antes de marcar a Task 3 como concluída:

- [ ] Template de candidatos configurado no Supabase
- [ ] Assunto e remetente corretos
- [ ] HTML e texto simples configurados
- [ ] Teste de envio bem-sucedido
- [ ] Email testado em Gmail, Outlook e Apple Mail
- [ ] Link de reset funcional
- [ ] Não vai para spam
- [ ] Layout responsivo funciona em mobile
- [ ] Variáveis `{{ .ConfirmationURL }}` substituídas corretamente
- [ ] Documentação completa em `SETUP_GUIDE.md`

---

**Autor**: Sistema de Recrutamento Beauty Smile
**Data**: 2025
**Versão**: 1.0
